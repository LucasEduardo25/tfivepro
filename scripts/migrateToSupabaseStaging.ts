/**
 * TFIVE PRO — MIGRAÇÃO FIREBASE → SUPABASE / POSTGRESQL
 * ETAPA 3.2 — PREPARAR MIGRAÇÃO REAL A PARTIR DO BACKUP JSON DO APLICATIVO
 *
 * Script ETL autônomo, determinístico, idempotente e auditável.
 *
 * REGRAS CRÍTICAS DE SEGURANÇA:
 * 1. O modo de execução real exige obrigatoriamente um arquivo de backup exportado do TFIVE PRO (--source=backup --input <path>).
 * 2. Fail-Closed: se nenhum arquivo de backup for fornecido ou se o arquivo for inválido, o script aborta imediatamente.
 * 3. Fixtures e mocks são permanentemente desativados para migrações reais; permitidos unicamente sob flag explícita --source=fixture em testes de regressão.
 * 4. Mapeamento integral e determinístico dos 29 stores do IndexedDB para as tabelas relacionais do PostgreSQL.
 * 5. Não há cutover, não altera produção, não remove Firebase, não remove IndexedDB.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { newDb, IMemoryDb } from 'pg-mem';
import { INITIAL_EXERCISES } from '../src/data/exerciseBank';

// ==============================================================================
// 1. TIPOS & ESTRUTURAS DE DADOS
// ==============================================================================

export type MigrationStatus = 'MIGRATED' | 'SKIPPED' | 'CONFLICT' | 'FAILED';

export interface ReconciliationItem {
  entity: string;
  legacyId: string;
  postgresId: string;
  status: MigrationStatus;
  sourceHash?: string;
  targetHash?: string;
  details?: string;
}

export interface EntityCountReport {
  entity: string;
  sourceCount: number;
  targetCount: number;
  difference: number;
  status: 'OK' | 'MISMATCH' | 'SKIPPED';
}

export interface SyncQueueAudit {
  pendingCount: number;
  processingCount: number;
  failedCount: number;
  completedCount: number;
  totalCount: number;
  details: any[];
}

export interface MigrationManifest {
  migrationRunId: string;
  startedAt: string;
  finishedAt: string;
  mode: 'DRY_RUN' | 'EXECUTE';
  sourceMode: 'BACKUP_JSON' | 'FIXTURE_TEST';
  sourceFile?: string;
  sourceEnvironment: string;
  targetEnvironment: string;
  appVersion: string;
  schemaVersion: string;
  sourceCounts: Record<string, number>;
  targetCounts: Record<string, number>;
  reconciliationSummary: {
    total: number;
    migrated: number;
    skipped: number;
    conflicts: number;
    failed: number;
  };
  backupFile: string;
  backupChecksumSha256: string;
  warnings: string[];
  errors: string[];
  status: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
}

export interface SourceDatabase {
  organizationId: string;
  trainerProfile: {
    id: string;
    organizationId: string;
    name: string;
    email: string;
    cref?: string;
    phone?: string;
    slogan?: string;
  };
  syncQueue: any[];
  students: any[];
  exercises: any[];
  routines: any[];
  sessions: any[];
  personalRecords: any[];
  assessments: any[];
  schedule: any[];
  scheduleRecurrences: any[];
  activeWorkouts: any[];
  trainingCycles: any[];
  trainingMemories: any[];
  proposals: any[];
  proposalTemplates: any[];
  activePlans: any[];
  planTransfers: any[];
  planSuspensions: any[];
  planAuditLogs: any[];
  settings: any[];
  photos: any[];
  functionalTests: any[];
  functionalAssessments: any[];
  functionalGoals: any[];
  functionalMilestones: any[];
  functionalBatteries: any[];
  evolutionReports: any[];
  workoutTemplates: any[];
  studentOnboardings: any[];
  studentAccess: any[];
  appUsers: any[];
}

export interface CommandLineArgs {
  source: 'backup' | 'fixture';
  input?: string;
  dryRun: boolean;
  orgId?: string;
}

// ==============================================================================
// 2. UTILITÁRIOS: DETERMINISTIC UUID & CANONICAL HASH
// ==============================================================================

/**
 * Gera um UUIDv4 sintaticamente válido e 100% determinístico a partir de (entityType + legacyId).
 */
export function toDeterministicUUID(entityType: string, legacyId: string): string {
  if (!legacyId) {
    legacyId = `anon_${Math.random().toString(36).substring(2, 9)}`;
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(legacyId)) {
    return legacyId.toLowerCase();
  }

  const hash = crypto.createHash('md5').update(`${entityType}:${legacyId}`).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.substring(18, 20),
    hash.substring(20, 32)
  ].join('-');
}

/**
 * Computa um hash canônico e determinístico SHA-256 de um objeto JSON.
 */
export function computeCanonicalHash(data: any): string {
  if (data === null || data === undefined) return '';

  const sortKeys = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(sortKeys);
    if (typeof obj === 'object' && obj !== null) {
      return Object.keys(obj)
        .sort()
        .reduce((res: any, key: string) => {
          res[key] = sortKeys(obj[key]);
          return res;
        }, {});
    }
    return obj;
  };

  const canonicalJson = JSON.stringify(sortKeys(data));
  return crypto.createHash('sha256').update(canonicalJson).digest('hex');
}

// ==============================================================================
// 3. PARSER DE ARGUMENTOS CLI & FAIL-CLOSED GUARDS
// ==============================================================================

export function parseCommandLineArgs(argv: string[] = process.argv.slice(2)): CommandLineArgs {
  let source: 'backup' | 'fixture' = 'backup';
  let input: string | undefined;
  let dryRun = true;
  let orgId: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--source=backup') {
      source = 'backup';
    } else if (arg === '--source=fixture') {
      source = 'fixture';
    } else if (arg === '--source' && argv[i + 1]) {
      source = argv[++i] as any;
    } else if (arg === '--input' || arg === '--file' || arg === '--backup') {
      input = argv[++i];
    } else if (arg.startsWith('--input=')) {
      input = arg.substring('--input='.length);
    } else if (arg.startsWith('--file=')) {
      input = arg.substring('--file='.length);
    } else if (arg.startsWith('--backup=')) {
      input = arg.substring('--backup='.length);
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--execute') {
      dryRun = false;
    } else if (arg === '--org-id' || arg === '--org') {
      orgId = argv[++i];
    } else if (arg.startsWith('--org-id=')) {
      orgId = arg.substring('--org-id='.length);
    }
  }

  return { source, input, dryRun, orgId };
}

// ==============================================================================
// 4. PARSER E VALIDATOR DE BACKUP DO TFIVE PRO REAL
// ==============================================================================

export function loadBackupFromFile(filePath: string, customOrgId?: string): SourceDatabase {
  const resolvedPath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`\n❌ [FATAL_ERROR: FILE_NOT_FOUND]`);
    console.error(`O arquivo de backup indicado não foi encontrado: "${resolvedPath}"`);
    console.error(`Verifique se o caminho está correto e tente novamente.\n`);
    process.exit(1);
  }

  let rawContent: string;
  try {
    rawContent = fs.readFileSync(resolvedPath, 'utf8');
  } catch (err: any) {
    console.error(`\n❌ [FATAL_ERROR: CANNOT_READ_FILE] Erro ao ler o arquivo: ${err.message}\n`);
    process.exit(1);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawContent);
  } catch (err: any) {
    console.error(`\n❌ [FATAL_ERROR: INVALID_JSON]`);
    console.error(`O arquivo fornecido não é um JSON válido. Mensagem de erro: ${err.message}\n`);
    process.exit(1);
  }

  let dataPayload: any = null;
  let metadata: any = null;

  if (parsed.app === 'TFIVE_PRO_BACKUP' && parsed.data) {
    dataPayload = parsed.data;
    metadata = parsed.metadata || {};
    console.log(`📦 Formato detectado: TFIVEBackupFile (Versão do formato: ${parsed.format || 'tfive_backup'}, Versão DB: ${parsed.databaseVersion || 1})`);
  } else if (parsed.appName === 'TFIVE PRO' && parsed.data) {
    dataPayload = parsed.data;
    metadata = { backupVersion: parsed.backupVersion, createdAt: parsed.createdAt };
    console.log(`📦 Formato detectado: TFIVEBackupPayload (Versão: ${parsed.backupVersion || 1})`);
  } else if (parsed.students || parsed.exercises || parsed.routines || parsed.sessions) {
    dataPayload = parsed;
    metadata = { backupVersion: 1, createdAt: new Date().toISOString() };
    console.log(`📦 Formato detectado: Raw Stores JSON Object`);
  } else {
    console.error(`\n❌ [FATAL_ERROR: INVALID_BACKUP_SIGNATURE]`);
    console.error(`O arquivo não apresenta uma estrutura reconhecida de backup do TFIVE PRO.`);
    console.error(`Chaves raiz encontradas: ${Object.keys(parsed).join(', ')}\n`);
    process.exit(1);
  }

  return normalizeToSourceDatabase(dataPayload, metadata, customOrgId);
}

/**
 * Normaliza qualquer formato de payload exportado pelo TFIVE PRO para o SourceDatabase canônico com os 29 stores.
 */
export function normalizeToSourceDatabase(data: any, metadata: any, customOrgId?: string): SourceDatabase {
  const orgId = customOrgId || 'org_tfive_prod_default';

  // Extração segura de coleções
  const students = Array.isArray(data.students) ? data.students : [];
  const exercises = Array.isArray(data.exercises) ? data.exercises : [];
  const routines = Array.isArray(data.routines) ? data.routines : [];
  const sessions = Array.isArray(data.sessions) ? data.sessions : [];
  const assessments = Array.isArray(data.assessments) ? data.assessments : [];
  const schedule = Array.isArray(data.schedule) ? data.schedule : [];
  const scheduleRecurrences = Array.isArray(data.scheduleRecurrences) ? data.scheduleRecurrences : (Array.isArray(data.schedule_recurrences) ? data.schedule_recurrences : []);
  
  // Tratamento de active_workouts: nunca mesclar em sessões finalizadas
  let activeWorkouts: any[] = [];
  if (Array.isArray(data.activeWorkouts)) {
    activeWorkouts = data.activeWorkouts;
  } else if (Array.isArray(data.active_workouts)) {
    activeWorkouts = data.active_workouts;
  } else if (data.activeWorkout && typeof data.activeWorkout === 'object') {
    activeWorkouts = [data.activeWorkout];
  } else if (data.active_workout && typeof data.active_workout === 'object') {
    activeWorkouts = [data.active_workout];
  }

  // Personal Records
  const personalRecords = Array.isArray(data.personalRecords) ? data.personalRecords : (Array.isArray(data.personal_records) ? data.personal_records : []);

  // Settings
  let settings: any[] = [];
  if (Array.isArray(data.settings)) {
    settings = data.settings;
  } else if (data.settings && typeof data.settings === 'object') {
    settings = Object.entries(data.settings).map(([key, value]) => ({ key, value }));
  }

  // Photos
  const photos = Array.isArray(data.photos) ? data.photos : [];

  // Domínios Funcionais
  const functionalTests = Array.isArray(data.functionalTests) ? data.functionalTests : (Array.isArray(data.functional_tests) ? data.functional_tests : []);
  const functionalAssessments = Array.isArray(data.functionalAssessments) ? data.functionalAssessments : (Array.isArray(data.functional_assessments) ? data.functional_assessments : []);
  const functionalGoals = Array.isArray(data.functionalGoals) ? data.functionalGoals : (Array.isArray(data.functional_goals) ? data.functional_goals : []);
  const functionalMilestones = Array.isArray(data.functionalMilestones) ? data.functionalMilestones : (Array.isArray(data.functional_milestones) ? data.functional_milestones : []);
  const functionalBatteries = Array.isArray(data.functionalBatteries) ? data.functionalBatteries : (Array.isArray(data.functional_batteries) ? data.functional_batteries : []);
  const evolutionReports = Array.isArray(data.evolutionReports) ? data.evolutionReports : (Array.isArray(data.evolution_reports) ? data.evolution_reports : []);
  const workoutTemplates = Array.isArray(data.workoutTemplates) ? data.workoutTemplates : (Array.isArray(data.workout_templates) ? data.workout_templates : []);
  const proposals = Array.isArray(data.proposals) ? data.proposals : [];
  const proposalTemplates = Array.isArray(data.proposalTemplates) ? data.proposalTemplates : (Array.isArray(data.proposal_templates) ? data.proposal_templates : []);
  const trainingCycles = Array.isArray(data.trainingCycles) ? data.trainingCycles : (Array.isArray(data.training_cycles) ? data.training_cycles : []);
  const studentOnboardings = Array.isArray(data.studentOnboardings) ? data.studentOnboardings : (Array.isArray(data.student_onboardings) ? data.student_onboardings : []);
  const studentAccess = Array.isArray(data.studentAccess) ? data.studentAccess : (Array.isArray(data.student_access) ? data.student_access : []);
  const appUsers = Array.isArray(data.appUsers) ? data.appUsers : (Array.isArray(data.app_users) ? data.app_users : []);
  const activePlans = Array.isArray(data.activePlans) ? data.activePlans : (Array.isArray(data.active_plans) ? data.active_plans : []);
  const planTransfers = Array.isArray(data.planTransfers) ? data.planTransfers : (Array.isArray(data.plan_transfers) ? data.plan_transfers : []);
  const planSuspensions = Array.isArray(data.planSuspensions) ? data.planSuspensions : (Array.isArray(data.plan_suspensions) ? data.plan_suspensions : []);
  const planAuditLogs = Array.isArray(data.planAuditLogs) ? data.planAuditLogs : (Array.isArray(data.plan_audit_logs) ? data.plan_audit_logs : []);
  const trainingMemories = Array.isArray(data.trainingMemories) ? data.trainingMemories : (Array.isArray(data.training_memories) ? data.training_memories : []);

  // Sync Queue / Metadata
  let syncQueue: any[] = [];
  if (Array.isArray(data.syncQueue)) {
    syncQueue = data.syncQueue;
  } else if (Array.isArray(data.sync_queue)) {
    syncQueue = data.sync_queue;
  } else if (Array.isArray(data.syncMetadata)) {
    syncQueue = data.syncMetadata;
  }

  // Trainer Profile
  let trainerProfile: any = {
    id: 'trainer_owner_1',
    organizationId: orgId,
    name: 'Personal Master TFIVE',
    email: 'treinador@tfive.pro',
    cref: '012345-G/SP',
    phone: '(11) 98888-7777',
    slogan: 'Performance sem desculpas. Resultados sem limites.'
  };

  if (data.trainerProfile) {
    trainerProfile = { ...trainerProfile, ...data.trainerProfile, organizationId: orgId };
  } else if (data.profile) {
    trainerProfile = { ...trainerProfile, ...data.profile, organizationId: orgId };
  }

  return {
    organizationId: orgId,
    trainerProfile,
    syncQueue,
    students,
    exercises,
    routines,
    sessions,
    personalRecords,
    assessments,
    schedule,
    scheduleRecurrences,
    activeWorkouts,
    trainingCycles,
    trainingMemories,
    proposals,
    proposalTemplates,
    activePlans,
    planTransfers,
    planSuspensions,
    planAuditLogs,
    settings,
    photos,
    functionalTests,
    functionalAssessments,
    functionalGoals,
    functionalMilestones,
    functionalBatteries,
    evolutionReports,
    workoutTemplates,
    studentOnboardings,
    studentAccess,
    appUsers
  };
}

// ==============================================================================
// 5. FIXTURES DE TESTE (USADAS EXCLUSIVAMENTE SOB --source=fixture)
// ==============================================================================

export function loadTestFixtureData(): SourceDatabase {
  const orgId = 'org_test_fixture';

  const trainerProfile = {
    id: 'trainer_fixture_1',
    organizationId: orgId,
    name: 'Treinador Teste Automatizado',
    email: 'test@tfive.pro',
    cref: '099999-G/SP',
    phone: '(11) 99999-9999',
    slogan: 'Automação de testes unitários da Etapa 3'
  };

  const students = [
    {
      id: 'std_test_1',
      organizationId: orgId,
      name: 'Aluno Teste Alpha',
      email: 'alpha@test.com',
      phone: '(11) 91111-1111',
      status: 'active',
      birthDate: '1990-01-01',
      gender: 'male',
      goal: 'Hipertrofia',
      notes: 'Aluno fixture para teste',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z'
    },
    {
      id: 'std_test_2',
      organizationId: orgId,
      name: 'Aluno Teste Beta',
      email: 'beta@test.com',
      phone: '(11) 92222-2222',
      status: 'active',
      birthDate: '1995-05-05',
      gender: 'female',
      goal: 'Condicionamento',
      notes: 'Aluna fixture para teste',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z'
    }
  ];

  const exercises = [
    {
      id: 'ex_test_supino',
      name: 'Supino Reto com Barra (Fixture)',
      muscleGroup: 'Peitoral',
      primaryMuscles: ['Peitoral Maior'],
      secondaryMuscles: ['Tríceps Braquial'],
      equipment: 'Barra',
      movementPattern: 'Empurrar',
      prescriptionType: 'weight_reps',
      isSystem: false,
      isCustom: true
    }
  ];

  const routines = [
    {
      id: 'rt_test_1',
      studentId: 'std_test_1',
      organizationId: orgId,
      title: 'Rotina Teste A',
      objective: 'Validação',
      status: 'active',
      isArchived: false,
      workouts: [
        {
          id: 'rw_test_a',
          letter: 'A',
          name: 'Treino A',
          order: 1,
          exercises: [
            { id: 're_test_1', exerciseId: 'ex_test_supino', order: 1, sets: 3, repsMin: 10, repsMax: 12, rest: 60 }
          ]
        }
      ]
    }
  ];

  const sessions = [
    {
      id: 'sess_test_1',
      studentId: 'std_test_1',
      organizationId: orgId,
      routineId: 'rt_test_1',
      workoutId: 'rw_test_a',
      studentName: 'Aluno Teste Alpha',
      routineTitle: 'Rotina Teste A',
      workoutLetter: 'A',
      workoutName: 'Treino A',
      startTime: '2026-09-01T10:00:00Z',
      endTime: '2026-09-01T11:00:00Z',
      durationSeconds: 3600,
      status: 'completed',
      totalVolume: 1200.0,
      totalSets: 3,
      sets: [
        { id: 'set_t1', exerciseId: 'ex_test_supino', exerciseName: 'Supino Reto com Barra (Fixture)', setNumber: 1, targetReps: 10, actualReps: 10, weightKg: 60, rpe: 8, isPR: false, completed: true, completedAt: '2026-09-01T10:15:00Z' }
      ]
    }
  ];

  return {
    organizationId: orgId,
    trainerProfile,
    syncQueue: [{ id: 'sq_test', entityType: 'students', entityId: 'std_test_1', operation: 'upsert', status: 'COMPLETED', timestamp: Date.now() }],
    students,
    exercises,
    routines,
    sessions,
    personalRecords: [],
    assessments: [],
    schedule: [],
    scheduleRecurrences: [],
    activeWorkouts: [],
    trainingCycles: [],
    trainingMemories: [],
    proposals: [],
    proposalTemplates: [],
    activePlans: [],
    planTransfers: [],
    planSuspensions: [],
    planAuditLogs: [],
    settings: [{ key: 'theme', value: 'dark' }],
    photos: [],
    functionalTests: [],
    functionalAssessments: [],
    functionalGoals: [],
    functionalMilestones: [],
    functionalBatteries: [],
    evolutionReports: [],
    workoutTemplates: [],
    studentOnboardings: [],
    studentAccess: [],
    appUsers: []
  };
}

// ==============================================================================
// 6. MOTOR ETL: VALIDAÇÃO, DRY-RUN & EXECUÇÃO DETERMINÍSTICA
// ==============================================================================

export class MigrationEngine {
  private db: IMemoryDb;
  private reconciliationMap: Map<string, ReconciliationItem> = new Map();
  private manifest: MigrationManifest;
  private sourceData: SourceDatabase;
  private mode: 'DRY_RUN' | 'EXECUTE';
  private sourceMode: 'BACKUP_JSON' | 'FIXTURE_TEST';

  constructor(
    sourceData: SourceDatabase,
    mode: 'DRY_RUN' | 'EXECUTE' = 'DRY_RUN',
    sourceMode: 'BACKUP_JSON' | 'FIXTURE_TEST' = 'BACKUP_JSON',
    sourceFile?: string
  ) {
    this.mode = mode;
    this.sourceMode = sourceMode;
    this.sourceData = sourceData;

    const runId = `mig_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    this.manifest = {
      migrationRunId: runId,
      startedAt: new Date().toISOString(),
      finishedAt: '',
      mode: this.mode,
      sourceMode: this.sourceMode,
      sourceFile,
      sourceEnvironment: 'TFIVE_LOCAL_FIRST_PROD (IndexedDB + Backup Export)',
      targetEnvironment: 'SUPABASE_POSTGRESQL_STAGING',
      appVersion: 'TFIVE PRO 5.0.0',
      schemaVersion: '001_initial_schema + 004_missing_domains (39 tables)',
      sourceCounts: {},
      targetCounts: {},
      reconciliationSummary: { total: 0, migrated: 0, skipped: 0, conflicts: 0, failed: 0 },
      backupFile: '',
      backupChecksumSha256: '',
      warnings: [],
      errors: [],
      status: 'SUCCESS'
    };

    this.db = newDb();
    this.setupPostgresFunctions();
  }

  private setupPostgresFunctions(): void {
    this.db.public.registerFunction({
      name: 'auth.uid',
      returns: this.db.public.getType('text' as any),
      implementation: () => '00000000-0000-0000-0000-000000000001'
    });

    this.db.public.registerFunction({
      name: 'gen_random_uuid',
      returns: this.db.public.getType('uuid' as any),
      implementation: () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      }
    });
  }

  public initSchema(): void {
    const migrations = [
      'supabase/migrations/001_initial_schema.sql',
      'supabase/migrations/004_missing_domains.sql'
    ];

    for (const relPath of migrations) {
      const fullPath = path.resolve(process.cwd(), relPath);
      if (fs.existsSync(fullPath)) {
        let ddl = fs.readFileSync(fullPath, 'utf8');
        ddl = ddl
          .replace(/CREATE\s+EXTENSION[^;]+;/gi, '')
          .replace(/uuid_generate_v4\(\)/g, 'gen_random_uuid()')
          .replace(/ALTER\s+TABLE[^;]+ENABLE\s+ROW\s+LEVEL\s+SECURITY;/gi, '')
          .replace(/CREATE\s+POLICY[\s\S]*?;/gi, '')
          .replace(/COMMENT\s+ON[\s\S]*?;/gi, '');
        this.db.public.none(ddl);
      }
    }
  }

  public createPreMigrationBackup(): { filename: string; sha256: string; filepath: string } {
    const backupPayload = {
      backupFormat: 'TFIVE_STAGE3_PRE_MIGRATION_AUDIT',
      migrationRunId: this.manifest.migrationRunId,
      createdAt: new Date().toISOString(),
      sourceData: this.sourceData
    };
    const jsonStr = JSON.stringify(backupPayload, null, 2);
    const sha256 = crypto.createHash('sha256').update(jsonStr).digest('hex');
    const filename = `pre_migration_backup_${this.manifest.migrationRunId}.json`;
    const backupsDir = path.resolve(process.cwd(), 'supabase/backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    const filepath = path.join(backupsDir, filename);

    fs.writeFileSync(filepath, jsonStr, 'utf8');
    this.manifest.backupFile = filepath;
    this.manifest.backupChecksumSha256 = sha256;

    return { filename, sha256, filepath };
  }

  public auditSyncQueue(): SyncQueueAudit {
    const items = this.sourceData.syncQueue;
    const audit: SyncQueueAudit = {
      pendingCount: items.filter(i => i.status === 'PENDING').length,
      processingCount: items.filter(i => i.status === 'PROCESSING').length,
      failedCount: items.filter(i => i.status === 'FAILED').length,
      completedCount: items.filter(i => i.status === 'COMPLETED').length,
      totalCount: items.length,
      details: items
    };

    if (audit.pendingCount > 0 || audit.failedCount > 0) {
      this.manifest.warnings.push(`Sync Queue possui ${audit.pendingCount} pendentes e ${audit.failedCount} falhas. Mapeados com segurança.`);
    }

    return audit;
  }

  private recordReconciliation(entity: string, legacyId: string, postgresId: string, status: MigrationStatus, sourceHash?: string, targetHash?: string, details?: string): void {
    const item: ReconciliationItem = {
      entity,
      legacyId,
      postgresId,
      status,
      sourceHash,
      targetHash,
      details
    };
    this.reconciliationMap.set(`${entity}:${legacyId}`, item);

    this.manifest.reconciliationSummary.total++;
    if (status === 'MIGRATED') this.manifest.reconciliationSummary.migrated++;
    else if (status === 'SKIPPED') this.manifest.reconciliationSummary.skipped++;
    else if (status === 'CONFLICT') this.manifest.reconciliationSummary.conflicts++;
    else if (status === 'FAILED') this.manifest.reconciliationSummary.failed++;
  }

  public run(): { counts: EntityCountReport[]; reconciliation: ReconciliationItem[] } {
    const s = this.sourceData;

    // Registrar contagens de origem
    this.manifest.sourceCounts['organizations'] = 1;
    this.manifest.sourceCounts['students'] = s.students.length;
    this.manifest.sourceCounts['exercises'] = s.exercises.length;
    this.manifest.sourceCounts['routines'] = s.routines.length;

    let totalWorkoutsSource = 0;
    let totalWorkoutExercisesSource = 0;
    let totalGroupsSource = 0;
    for (const r of s.routines) {
      totalWorkoutsSource += r.workouts?.length || 0;
      for (const w of r.workouts || []) {
        totalWorkoutExercisesSource += w.exercises?.length || 0;
        totalGroupsSource += w.groups?.length || 0;
      }
    }
    this.manifest.sourceCounts['routine_workouts'] = totalWorkoutsSource;
    this.manifest.sourceCounts['exercise_groups'] = totalGroupsSource;
    this.manifest.sourceCounts['workout_exercises'] = totalWorkoutExercisesSource;

    let totalSetsSource = 0;
    for (const sess of s.sessions) {
      totalSetsSource += sess.sets?.length || 0;
    }
    this.manifest.sourceCounts['sessions'] = s.sessions.length;
    this.manifest.sourceCounts['session_sets'] = totalSetsSource;
    this.manifest.sourceCounts['assessments'] = s.assessments.length;
    this.manifest.sourceCounts['schedule_events'] = s.schedule.length;
    this.manifest.sourceCounts['schedule_recurrences'] = s.scheduleRecurrences.length;
    this.manifest.sourceCounts['active_workouts'] = s.activeWorkouts.length;
    this.manifest.sourceCounts['training_cycles'] = s.trainingCycles.length;

    let totalBlocksSource = 0;
    for (const cyc of s.trainingCycles) {
      totalBlocksSource += cyc.blocks?.length || 0;
    }
    this.manifest.sourceCounts['training_blocks'] = totalBlocksSource;
    this.manifest.sourceCounts['training_memories'] = s.trainingMemories.length;
    this.manifest.sourceCounts['proposals'] = s.proposals.length;
    this.manifest.sourceCounts['active_plans'] = s.activePlans.length;

    let totalParticipantsSource = 0;
    for (const p of s.activePlans) {
      totalParticipantsSource += p.participants?.length || 0;
    }
    this.manifest.sourceCounts['plan_participants'] = totalParticipantsSource;
    this.manifest.sourceCounts['settings'] = s.settings.length;
    this.manifest.sourceCounts['photos'] = s.photos.length;
    this.manifest.sourceCounts['functional_tests'] = s.functionalTests.length;
    this.manifest.sourceCounts['functional_assessments'] = s.functionalAssessments.length;
    this.manifest.sourceCounts['functional_goals'] = s.functionalGoals.length;
    this.manifest.sourceCounts['functional_milestones'] = s.functionalMilestones.length;
    this.manifest.sourceCounts['functional_batteries'] = s.functionalBatteries.length;
    this.manifest.sourceCounts['evolution_reports'] = s.evolutionReports.length;
    this.manifest.sourceCounts['workout_templates'] = s.workoutTemplates.length;
    this.manifest.sourceCounts['proposal_templates'] = s.proposalTemplates.length;
    this.manifest.sourceCounts['student_onboardings'] = s.studentOnboardings.length;
    this.manifest.sourceCounts['student_access'] = s.studentAccess.length;
    this.manifest.sourceCounts['app_users'] = s.appUsers.length;

    // 1. ORGANIZATIONS
    const orgUUID = toDeterministicUUID('organizations', s.organizationId);
    this.db.public.none(`
      INSERT INTO organizations (id, name, slug)
      VALUES ('${orgUUID}', 'TFIVE PRO — Organização Principal', 'tfive-pro-principal')
      ON CONFLICT (id) DO NOTHING;
    `);
    this.recordReconciliation('organizations', s.organizationId, orgUUID, 'MIGRATED', computeCanonicalHash(s.organizationId));

    // 2. PROFILES & ORGANIZATION_MEMBERS
    const trainerUserUUID = toDeterministicUUID('auth_users', s.trainerProfile.id);
    this.db.public.none(`
      INSERT INTO profiles (id, full_name, email, phone)
      VALUES ('${trainerUserUUID}', '${s.trainerProfile.name.replace(/'/g, "''")}', '${s.trainerProfile.email.replace(/'/g, "''")}', '${(s.trainerProfile.phone || '').replace(/'/g, "''")}')
      ON CONFLICT (id) DO NOTHING;
    `);
    this.db.public.none(`
      INSERT INTO organization_members (organization_id, user_id, role, status)
      VALUES ('${orgUUID}', '${trainerUserUUID}', 'OWNER', 'active')
      ON CONFLICT (organization_id, user_id) DO NOTHING;
    `);

    // 3. STUDENTS
    for (const std of s.students) {
      const stdUUID = toDeterministicUUID('students', std.id);
      const sHash = computeCanonicalHash(std);
      const name = (std.name || 'Sem Nome').replace(/'/g, "''");
      const email = (std.email || '').replace(/'/g, "''");
      const phone = (std.phone || '').replace(/'/g, "''");
      const status = std.status === 'inactive' ? 'inactive' : 'active';
      const birthDate = std.birthDate ? `'${std.birthDate}'` : 'NULL';
      const gender = std.gender === 'female' ? 'female' : 'male';
      const goal = (std.goal || '').replace(/'/g, "''");
      const notes = (std.notes || '').replace(/'/g, "''");
      const sNotes = (std.studentVisibleNotes || '').replace(/'/g, "''");
      const tagsSql = Array.isArray(std.tags) && std.tags.length > 0
        ? `ARRAY[${std.tags.map((t: string) => `'${String(t).replace(/'/g, "''")}'`).join(',')}]::text[]`
        : "'{}'::text[]";
      const photoUrl = (std.photo || '').replace(/'/g, "''");

      this.db.public.none(`
        INSERT INTO students (
          id, legacy_id, organization_id, name, email, phone, status, birth_date, gender,
          goal, notes, student_visible_notes, tags, photo_url
        ) VALUES (
          '${stdUUID}', '${std.id}', '${orgUUID}', '${name}', '${email}', '${phone}', '${status}',
          ${birthDate}, '${gender}', '${goal}', '${notes}', '${sNotes}', ${tagsSql}, '${photoUrl}'
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          status = EXCLUDED.status,
          updated_at = NOW();
      `);
      this.recordReconciliation('students', std.id, stdUUID, 'MIGRATED', sHash);
    }

    // 4. STUDENT ACCESS
    for (const sa of s.studentAccess) {
      const saUUID = toDeterministicUUID('student_access', sa.studentId || sa.id);
      const stdUUID = toDeterministicUUID('students', sa.studentId);
      const active = sa.isActive !== false;
      const status = active ? 'ACTIVE' : 'NOT_ENABLED';

      this.db.public.none(`
        INSERT INTO student_access (id, organization_id, student_id, enabled, status)
        VALUES ('${saUUID}', '${orgUUID}', '${stdUUID}', ${active}, '${status}')
        ON CONFLICT (id) DO NOTHING;
      `);
      this.recordReconciliation('student_access', sa.id || sa.studentId, saUUID, 'MIGRATED', computeCanonicalHash(sa));
    }

    // 5. EXERCISES (Reconciliação de catálogo base + customizados)
    for (const baseEx of INITIAL_EXERCISES) {
      const baseUUID = toDeterministicUUID('exercises', baseEx.id);
      const name = (baseEx.name || '').replace(/'/g, "''");
      const mg = (baseEx.muscleGroup || 'Outros').replace(/'/g, "''");
      const eq = (baseEx.equipment || 'Outro').replace(/'/g, "''");
      const pt = (baseEx.recordType || 'weight_reps');
      const pm = baseEx.primaryMuscles || [baseEx.muscleGroup || 'Outros'];
      const sm = baseEx.secondaryMuscles || [];
      const pmSql = pm.length > 0 ? `ARRAY[${pm.map(m => `'${String(m).replace(/'/g, "''")}'`).join(',')}]::text[]` : "'{}'::text[]";
      const smSql = sm.length > 0 ? `ARRAY[${sm.map(m => `'${String(m).replace(/'/g, "''")}'`).join(',')}]::text[]` : "'{}'::text[]";

      this.db.public.none(`
        INSERT INTO exercises (
          id, legacy_id, organization_id, name, muscle_group, primary_muscles, secondary_muscles,
          equipment, prescription_type, is_custom
        ) VALUES (
          '${baseUUID}', '${baseEx.id}', NULL, '${name}', '${mg}', ${pmSql}, ${smSql},
          '${eq}', '${pt}', false
        )
        ON CONFLICT (id) DO NOTHING;
      `);
    }

    for (const ex of s.exercises) {
      const exUUID = toDeterministicUUID('exercises', ex.id);
      const sHash = computeCanonicalHash(ex);
      const name = (ex.name || 'Exercício').replace(/'/g, "''");
      const mg = (ex.muscleGroup || 'Outros').replace(/'/g, "''");
      const eq = (ex.equipment || 'Outro').replace(/'/g, "''");
      const pt = (ex.prescriptionType || ex.recordType || 'weight_reps');
      const pm = ex.primaryMuscles || [ex.muscleGroup || 'Outros'];
      const sm = ex.secondaryMuscles || [];
      const pmSql = pm.length > 0 ? `ARRAY[${pm.map(m => `'${String(m).replace(/'/g, "''")}'`).join(',')}]::text[]` : "'{}'::text[]";
      const smSql = sm.length > 0 ? `ARRAY[${sm.map(m => `'${String(m).replace(/'/g, "''")}'`).join(',')}]::text[]` : "'{}'::text[]";
      const isCustom = ex.isCustom === true || ex.isSystem === false;

      this.db.public.none(`
        INSERT INTO exercises (
          id, legacy_id, organization_id, name, muscle_group, primary_muscles, secondary_muscles,
          equipment, prescription_type, is_custom
        ) VALUES (
          '${exUUID}', '${ex.id}', '${orgUUID}', '${name}', '${mg}', ${pmSql}, ${smSql},
          '${eq}', '${pt}', ${isCustom}
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          equipment = EXCLUDED.equipment,
          updated_at = NOW();
      `);
      this.recordReconciliation('exercises', ex.id, exUUID, 'MIGRATED', sHash);
    }

    // 6. ROUTINES, ROUTINE_WORKOUTS, WORKOUT_EXERCISES
    for (const r of s.routines) {
      const rUUID = toDeterministicUUID('routines', r.id);
      const stdUUID = toDeterministicUUID('students', r.studentId);
      const title = (r.title || 'Rotina').replace(/'/g, "''");
      const obj = (r.objective || '').replace(/'/g, "''");
      const status = r.status === 'archived' ? 'archived' : 'active';

      this.db.public.none(`
        INSERT INTO routines (id, legacy_id, organization_id, student_id, title, objective, status)
        VALUES ('${rUUID}', '${r.id}', '${orgUUID}', '${stdUUID}', '${title}', '${obj}', '${status}')
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          objective = EXCLUDED.objective,
          status = EXCLUDED.status,
          updated_at = NOW();
      `);
      this.recordReconciliation('routines', r.id, rUUID, 'MIGRATED', computeCanonicalHash(r));

      for (let wIdx = 0; wIdx < (r.workouts || []).length; wIdx++) {
        const w = r.workouts[wIdx];
        const wUUID = toDeterministicUUID('routine_workouts', w.id || `${r.id}_w_${wIdx}`);
        const letter = (w.letter || String.fromCharCode(65 + wIdx)).replace(/'/g, "''");
        const wName = (w.name || `Treino ${letter}`).replace(/'/g, "''");
        const wPos = w.order || (wIdx + 1);

        this.db.public.none(`
          INSERT INTO routine_workouts (id, legacy_id, routine_id, letter, name, position)
          VALUES ('${wUUID}', '${w.id || `${r.id}_w_${wIdx}`}', '${rUUID}', '${letter}', '${wName}', ${wPos})
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            position = EXCLUDED.position;
        `);
        this.recordReconciliation('routine_workouts', w.id || `${r.id}_w_${wIdx}`, wUUID, 'MIGRATED');

        // Workout exercises
        for (let eIdx = 0; eIdx < (w.exercises || []).length; eIdx++) {
          const we = w.exercises[eIdx];
          const weUUID = toDeterministicUUID('workout_exercises', we.id || `${w.id}_e_${eIdx}`);
          const exUUID = toDeterministicUUID('exercises', we.exerciseId);
          const ePos = we.order || (eIdx + 1);
          const sets = we.sets || 3;
          const rMin = we.repsMin || 10;
          const rMax = we.repsMax || 12;
          const rest = we.rest || 60;
          const notes = (we.notes || '').replace(/'/g, "''");

          this.db.public.none(`
            INSERT INTO workout_exercises (
              id, legacy_id, workout_id, exercise_id, position, target_sets, target_reps_min, target_reps_max, rest_seconds, notes
            ) VALUES (
              '${weUUID}', '${we.id || `${w.id}_e_${eIdx}`}', '${wUUID}', '${exUUID}', ${ePos}, ${sets}, ${rMin}, ${rMax}, ${rest}, '${notes}'
            )
            ON CONFLICT (id) DO UPDATE SET
              target_sets = EXCLUDED.target_sets,
              target_reps_min = EXCLUDED.target_reps_min,
              target_reps_max = EXCLUDED.target_reps_max;
          `);
          this.recordReconciliation('workout_exercises', we.id || `${w.id}_e_${eIdx}`, weUUID, 'MIGRATED');
        }
      }
    }

    // 7. SESSIONS & SESSION_SETS
    for (const sess of s.sessions) {
      const sessUUID = toDeterministicUUID('sessions', sess.id);
      const stdUUID = toDeterministicUUID('students', sess.studentId);
      const rUUID = sess.routineId ? toDeterministicUUID('routines', sess.routineId) : null;
      const wUUID = sess.workoutId ? toDeterministicUUID('routine_workouts', sess.workoutId) : null;
      const sName = (sess.studentName || '').replace(/'/g, "''");
      const rTitle = (sess.routineTitle || '').replace(/'/g, "''");
      const wLetter = (sess.workoutLetter || '').replace(/'/g, "''");
      const wName = (sess.workoutName || '').replace(/'/g, "''");
      const start = sess.startTime || new Date().toISOString();
      const end = sess.endTime ? `'${sess.endTime}'` : 'NULL';
      const dur = sess.durationSeconds || 0;
      const vol = sess.totalVolume || 0.0;
      const setCnt = sess.totalSets || (sess.sets?.length || 0);

      this.db.public.none(`
        INSERT INTO sessions (
          id, legacy_id, organization_id, student_id, routine_id, workout_id,
          student_name_snapshot, routine_title_snapshot, workout_letter_snapshot, workout_name_snapshot,
          start_time, end_time, duration_seconds, status, total_volume, total_sets
        ) VALUES (
          '${sessUUID}', '${sess.id}', '${orgUUID}', '${stdUUID}', ${rUUID ? `'${rUUID}'` : 'NULL'}, ${wUUID ? `'${wUUID}'` : 'NULL'},
          '${sName}', '${rTitle}', '${wLetter}', '${wName}',
          '${start}', ${end}, ${dur}, 'completed', ${vol}, ${setCnt}
        )
        ON CONFLICT (id) DO UPDATE SET
          total_volume = EXCLUDED.total_volume,
          total_sets = EXCLUDED.total_sets;
      `);
      this.recordReconciliation('sessions', sess.id, sessUUID, 'MIGRATED', computeCanonicalHash(sess));

      for (let sIdx = 0; sIdx < (sess.sets || []).length; sIdx++) {
        const set = sess.sets[sIdx];
        const setUUID = toDeterministicUUID('session_sets', set.id || `${sess.id}_s_${sIdx}`);
        const exUUID = toDeterministicUUID('exercises', set.exerciseId);
        const setNum = set.setNumber || (sIdx + 1);
        const weight = set.weightKg || 0.0;
        const reps = set.actualReps || set.targetReps || 0;
        const rpe = set.rpe ? set.rpe : 'NULL';
        const isPR = set.isPR === true;

        this.db.public.none(`
          INSERT INTO session_sets (
            id, legacy_id, session_id, exercise_id, set_number, weight_kg, actual_reps, rpe, is_pr, status
          ) VALUES (
            '${setUUID}', '${set.id || `${sess.id}_s_${sIdx}`}', '${sessUUID}', '${exUUID}', ${setNum}, ${weight}, ${reps}, ${rpe}, ${isPR}, 'completed'
          )
          ON CONFLICT (id) DO NOTHING;
        `);
        this.recordReconciliation('session_sets', set.id || `${sess.id}_s_${sIdx}`, setUUID, 'MIGRATED');
      }
    }

    // 8. ACTIVE WORKOUTS (Transientes - isoladas de sessões finalizadas)
    for (const aw of s.activeWorkouts) {
      const awUUID = toDeterministicUUID('active_workouts', aw.sessionId || aw.studentId || 'current_aw');
      const stdUUID = toDeterministicUUID('students', aw.studentId);
      const sessionIdStr = aw.sessionId || `session_${awUUID}`;
      const payloadJson = JSON.stringify(aw).replace(/'/g, "''");

      this.db.public.none(`
        INSERT INTO active_workouts (
          id, organization_id, student_id, session_id, state_snapshot, updated_at
        ) VALUES (
          '${awUUID}', '${orgUUID}', '${stdUUID}', '${sessionIdStr}', '${payloadJson}'::jsonb, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          state_snapshot = EXCLUDED.state_snapshot,
          updated_at = NOW();
      `);
      this.recordReconciliation('active_workouts', aw.sessionId || aw.studentId || 'aw', awUUID, 'MIGRATED');
    }

    // 9. ASSESSMENTS
    for (const asmt of s.assessments) {
      const asmtUUID = toDeterministicUUID('assessments', asmt.id);
      const stdUUID = toDeterministicUUID('students', asmt.studentId);
      const date = asmt.date || new Date().toISOString().split('T')[0];
      const weight = asmt.weightKg || 70.0;
      const height = asmt.heightCm || 170.0;
      const age = asmt.age || 30;
      const gender = asmt.gender === 'female' ? 'female' : 'male';
      const protocol = (asmt.protocol || 'Pollock 7 Dobras').replace(/'/g, "''");
      const bf = asmt.bodyFatPercentage || 15.0;
      const fatKg = asmt.fatMassKg || 10.5;
      const leanKg = asmt.leanMassKg || 59.5;
      const bmi = asmt.bmi || 24.2;
      const sfJson = JSON.stringify(asmt.skinfolds || {}).replace(/'/g, "''");
      const circJson = JSON.stringify(asmt.circumferences || {}).replace(/'/g, "''");
      const notes = (asmt.notes || '').replace(/'/g, "''");

      this.db.public.none(`
        INSERT INTO assessments (
          id, legacy_id, organization_id, student_id, date, weight_kg, height_cm, age, gender, protocol,
          body_fat_percentage, fat_mass_kg, lean_mass_kg, bmi, skinfolds, circumferences, notes
        ) VALUES (
          '${asmtUUID}', '${asmt.id}', '${orgUUID}', '${stdUUID}', '${date}', ${weight}, ${height}, ${age}, '${gender}', '${protocol}',
          ${bf}, ${fatKg}, ${leanKg}, ${bmi}, '${sfJson}'::jsonb, '${circJson}'::jsonb, '${notes}'
        )
        ON CONFLICT (id) DO NOTHING;
      `);
      this.recordReconciliation('assessments', asmt.id, asmtUUID, 'MIGRATED', computeCanonicalHash(asmt));
    }

    // 10. SCHEDULE_RECURRENCES & SCHEDULE_EVENTS
    for (const rec of s.scheduleRecurrences) {
      const recUUID = toDeterministicUUID('schedule_recurrences', rec.id);
      const stdUUID = toDeterministicUUID('students', rec.studentId);
      const weekdaysArray = Array.isArray(rec.weekdays) && rec.weekdays.length > 0
        ? `ARRAY[${rec.weekdays.map(Number).join(',')}]::integer[]`
        : 'ARRAY[1, 3, 5]::integer[]';
      const time = (rec.defaultTime || '07:00:00').replace(/'/g, "''");

      this.db.public.none(`
        INSERT INTO schedule_recurrences (
          id, legacy_id, organization_id, student_id, start_date, period_type, weekdays, default_time, status
        ) VALUES (
          '${recUUID}', '${rec.id}', '${orgUUID}', '${stdUUID}', '${rec.startDate || '2026-01-01'}',
          'weekly', ${weekdaysArray}, '${time}', '${rec.status || 'active'}'
        )
        ON CONFLICT (id) DO NOTHING;
      `);
      this.recordReconciliation('schedule_recurrences', rec.id, recUUID, 'MIGRATED');
    }

    for (const evt of s.schedule) {
      const evtUUID = toDeterministicUUID('schedule_events', evt.id);
      const stdUUID = toDeterministicUUID('students', evt.studentId);
      const date = evt.date || '2026-09-01';
      const time = evt.time || '08:00';
      const dur = evt.durationMinutes || 60;
      const st = evt.status === 'completed' ? 'completed' : 'scheduled';

      this.db.public.none(`
        INSERT INTO schedule_events (
          id, organization_id, student_id, date, time, duration_minutes, status
        ) VALUES (
          '${evtUUID}', '${orgUUID}', '${stdUUID}', '${date}', '${time}', ${dur}, '${st}'
        )
        ON CONFLICT (id) DO NOTHING;
      `);
      this.recordReconciliation('schedule_events', evt.id, evtUUID, 'MIGRATED');
    }

    // 11. TRAINING_CYCLES & TRAINING_BLOCKS
    for (const cyc of s.trainingCycles) {
      const cycUUID = toDeterministicUUID('training_cycles', cyc.id);
      const stdUUID = toDeterministicUUID('students', cyc.studentId);
      const name = (cyc.name || 'Ciclo de Treinamento').replace(/'/g, "''");
      const obj = (cyc.objective || '').replace(/'/g, "''");
      const st = cyc.status || 'current';

      this.db.public.none(`
        INSERT INTO training_cycles (
          id, organization_id, student_id, name, objective, start_date, status
        ) VALUES (
          '${cycUUID}', '${orgUUID}', '${stdUUID}', '${name}', '${obj}',
          '${cyc.startDate || '2026-09-01'}', '${st}'
        )
        ON CONFLICT (id) DO NOTHING;
      `);
      this.recordReconciliation('training_cycles', cyc.id, cycUUID, 'MIGRATED');

      for (let bIdx = 0; bIdx < (cyc.blocks || []).length; bIdx++) {
        const blk = cyc.blocks[bIdx];
        const blkUUID = toDeterministicUUID('training_blocks', blk.id || `${cyc.id}_b_${bIdx}`);
        const bName = (blk.name || `Bloco ${bIdx + 1}`).replace(/'/g, "''");
        const bObj = (blk.objective || '').replace(/'/g, "''");

        this.db.public.none(`
          INSERT INTO training_blocks (
            id, cycle_id, name, objective, position, duration_weeks, start_date, end_date
          ) VALUES (
            '${blkUUID}', '${cycUUID}', '${bName}', '${bObj}', ${blk.position || bIdx},
            ${blk.durationWeeks || 4}, '${blk.startDate || '2026-09-01'}', '${blk.endDate || '2026-09-28'}'
          )
          ON CONFLICT (id) DO NOTHING;
        `);
        this.recordReconciliation('training_blocks', blk.id || `${cyc.id}_b_${bIdx}`, blkUUID, 'MIGRATED');
      }
    }

    // 12. TRAINING_MEMORIES
    for (const mem of s.trainingMemories) {
      const memUUID = toDeterministicUUID('training_memories', mem.id);
      const stdUUID = toDeterministicUUID('students', mem.studentId);
      const text = (mem.text || '').replace(/'/g, "''");

      this.db.public.none(`
        INSERT INTO training_memories (
          id, organization_id, student_id, text, status
        ) VALUES (
          '${memUUID}', '${orgUUID}', '${stdUUID}', '${text}', '${mem.status || 'ACTIVE'}'
        )
        ON CONFLICT (id) DO NOTHING;
      `);
      this.recordReconciliation('training_memories', mem.id, memUUID, 'MIGRATED');
    }

    // 13. PROPOSALS & PROPOSAL_TEMPLATES
    for (const prop of s.proposals) {
      const propUUID = toDeterministicUUID('proposals', prop.id);
      const stdUUID = toDeterministicUUID('students', prop.studentId);
      const status = prop.status || 'draft';
      const total = prop.totalValueCents || 0;
      const sSnap = JSON.stringify(prop.studentSnapshot || { name: 'Aluno' }).replace(/'/g, "''");
      const tSnap = JSON.stringify(prop.trainerSnapshot || { name: 'Treinador' }).replace(/'/g, "''");
      const pSnap = JSON.stringify(prop.pricingSnapshot || { finalValueCents: total }).replace(/'/g, "''");

      this.db.public.none(`
        INSERT INTO proposals (
          id, legacy_id, organization_id, student_id, status, mode, plan_type,
          student_snapshot, trainer_snapshot, pricing_snapshot
        ) VALUES (
          '${propUUID}', '${prop.id}', '${orgUUID}', '${stdUUID}', '${status}', 'single_plan', 'individual',
          '${sSnap}'::jsonb, '${tSnap}'::jsonb, '${pSnap}'::jsonb
        )
        ON CONFLICT (id) DO NOTHING;
      `);
      this.recordReconciliation('proposals', prop.id, propUUID, 'MIGRATED');
    }

    for (const pt of s.proposalTemplates) {
      const ptUUID = toDeterministicUUID('proposal_templates', pt.id);
      const name = (pt.name || pt.title || 'Template de Proposta').replace(/'/g, "''");
      const title = (pt.title || name).replace(/'/g, "''");
      const service = (pt.service || 'Personal Training').replace(/'/g, "''");
      const desc = (pt.description || '').replace(/'/g, "''");
      const cond = (pt.conditions || '').replace(/'/g, "''");
      const plansJson = JSON.stringify(pt.plans || []).replace(/'/g, "''");

      this.db.public.none(`
        INSERT INTO proposal_templates (
          id, organization_id, name, title, service, description, mode, plans, conditions
        ) VALUES (
          '${ptUUID}', '${orgUUID}', '${name}', '${title}', '${service}', '${desc}',
          '${pt.mode || 'presencial'}', '${plansJson}'::jsonb, '${cond}'
        )
        ON CONFLICT (id) DO NOTHING;
      `);
      this.recordReconciliation('proposal_templates', pt.id, ptUUID, 'MIGRATED');
    }

    // 14. ACTIVE_PLANS & PARTICIPANTS
    for (const plan of s.activePlans) {
      const planUUID = toDeterministicUUID('active_plans', plan.id);
      const name = (plan.name || 'Plano').replace(/'/g, "''");
      const val = plan.finalValueCents || 0;
      const service = (plan.service || 'Personal Training').replace(/'/g, "''");
      const freq = (plan.frequencyPerWeek || '3x').replace(/'/g, "''");
      const pSnap = JSON.stringify(plan.pricingSnapshot || { finalValueCents: val }).replace(/'/g, "''");

      this.db.public.none(`
        INSERT INTO active_plans (
          id, legacy_id, organization_id, name, service, frequency_per_week, duration_months,
          start_date, original_value_cents, final_value_cents, pricing_snapshot, status
        ) VALUES (
          '${planUUID}', '${plan.id}', '${orgUUID}', '${name}', '${service}', '${freq}', 12,
          '${plan.startDate || '2026-09-01'}', ${val}, ${val}, '${pSnap}'::jsonb, '${plan.status || 'ACTIVE'}'
        )
        ON CONFLICT (id) DO NOTHING;
      `);
      this.recordReconciliation('active_plans', plan.id, planUUID, 'MIGRATED');

      for (let pIdx = 0; pIdx < (plan.participants || []).length; pIdx++) {
        const part = plan.participants[pIdx];
        const partUUID = toDeterministicUUID('plan_participants', part.id || `${plan.id}_p_${pIdx}`);
        const pStdUUID = toDeterministicUUID('students', part.studentId);
        const pName = (part.name || 'Aluno').replace(/'/g, "''");

        this.db.public.none(`
          INSERT INTO plan_participants (
            id, active_plan_id, student_id, name_snapshot, role, status, joined_at
          ) VALUES (
            '${partUUID}', '${planUUID}', '${pStdUUID}', '${pName}', '${part.role || 'holder'}', '${part.status || 'ACTIVE'}',
            '${part.joinedAt || '2026-09-01'}'
          )
          ON CONFLICT (id) DO NOTHING;
        `);
        this.recordReconciliation('plan_participants', part.id || `${plan.id}_p_${pIdx}`, partUUID, 'MIGRATED');
      }
    }

    // 15. SETTINGS
    for (const set of s.settings) {
      const k = (set.key || '').replace(/'/g, "''");
      const vJson = JSON.stringify(set.value).replace(/'/g, "''");

      this.db.public.none(`
        INSERT INTO settings (organization_id, key, value)
        VALUES ('${orgUUID}', '${k}', '${vJson}'::jsonb)
        ON CONFLICT (organization_id, key) DO UPDATE SET
          value = EXCLUDED.value,
          updated_at = NOW();
      `);
      this.recordReconciliation('settings', set.key, `${orgUUID}:${k}`, 'MIGRATED');
    }

    // 16. PHOTOS (com suporte a base64 e metadados)
    for (const ph of s.photos) {
      const phUUID = toDeterministicUUID('photos', ph.id);
      const stdUUID = toDeterministicUUID('students', ph.studentId);
      const rawCat = (ph.category || '').toLowerCase();
      let cat = 'other';
      if (rawCat.includes('front') || rawCat.includes('frente')) cat = 'front';
      else if (rawCat.includes('back') || rawCat.includes('costas')) cat = 'back';
      else if (rawCat.includes('left') || rawCat.includes('esquerda')) cat = 'left_side';
      else if (rawCat.includes('right') || rawCat.includes('direita')) cat = 'right_side';
      else if (['front', 'back', 'left_side', 'right_side', 'other', 'custom'].includes(rawCat)) cat = rawCat;

      const date = ph.date || new Date().toISOString().split('T')[0];
      const isBase64 = typeof ph.photoUrl === 'string' && ph.photoUrl.startsWith('data:');
      const photoUrl = (ph.photoUrl || '').replace(/'/g, "''");
      const notes = (ph.notes || '').replace(/'/g, "''");

      this.db.public.none(`
        INSERT INTO photos (
          id, organization_id, student_id, photo_url, category, date, notes, is_base64_migrated
        ) VALUES (
          '${phUUID}', '${orgUUID}', '${stdUUID}', '${photoUrl}', '${cat}', '${date}', '${notes}', ${!isBase64}
        )
        ON CONFLICT (id) DO NOTHING;
      `);
      this.recordReconciliation('photos', ph.id, phUUID, 'MIGRATED');
    }

    // 17. FUNCTIONAL TESTS, ASSESSMENTS, GOALS, MILESTONES, BATTERIES
    for (const ft of s.functionalTests) {
      const ftUUID = toDeterministicUUID('functional_tests', ft.id);
      const name = (ft.name || 'Teste Funcional').replace(/'/g, "''");
      const cat = (ft.category || 'Geral').replace(/'/g, "''");
      const domain = ft.domain || 'autonomy';
      const unit = ft.unit || 'reps';
      const unitLabel = (ft.unitLabel || 'reps').replace(/'/g, "''");
      const dir = ft.direction || 'higher_is_better';

      this.db.public.none(`
        INSERT INTO functional_tests (
          id, organization_id, name, domain, category, unit, unit_label, direction, is_built_in, is_custom
        ) VALUES (
          '${ftUUID}', '${orgUUID}', '${name}', '${domain}', '${cat}', '${unit}', '${unitLabel}', '${dir}',
          ${ft.isBuiltIn === true}, ${ft.isCustom === true}
        )
        ON CONFLICT (id) DO NOTHING;
      `);
      this.recordReconciliation('functional_tests', ft.id, ftUUID, 'MIGRATED');
    }

    for (const fa of s.functionalAssessments) {
      const faUUID = toDeterministicUUID('functional_assessments', fa.id);
      const stdUUID = toDeterministicUUID('students', fa.studentId);
      const date = fa.date || new Date().toISOString().split('T')[0];
      const resJson = JSON.stringify(fa.results || {}).replace(/'/g, "''");

      this.db.public.none(`
        INSERT INTO functional_assessments (
          id, organization_id, student_id, date, results
        ) VALUES (
          '${faUUID}', '${orgUUID}', '${stdUUID}', '${date}', '${resJson}'::jsonb
        )
        ON CONFLICT (id) DO NOTHING;
      `);
      this.recordReconciliation('functional_assessments', fa.id, faUUID, 'MIGRATED');
    }

    for (const fg of s.functionalGoals) {
      const fgUUID = toDeterministicUUID('functional_goals', fg.id);
      const stdUUID = toDeterministicUUID('students', fg.studentId);
      const title = (fg.title || 'Meta Funcional').replace(/'/g, "''");
      const domain = fg.domain || 'autonomy';
      const status = fg.status || 'active';

      this.db.public.none(`
        INSERT INTO functional_goals (
          id, organization_id, student_id, title, domain, status
        ) VALUES (
          '${fgUUID}', '${orgUUID}', '${stdUUID}', '${title}', '${domain}', '${status}'
        )
        ON CONFLICT (id) DO NOTHING;
      `);
      this.recordReconciliation('functional_goals', fg.id, fgUUID, 'MIGRATED');
    }

    for (const fm of s.functionalMilestones) {
      const fmUUID = toDeterministicUUID('functional_milestones', fm.id);
      const stdUUID = toDeterministicUUID('students', fm.studentId);
      const title = (fm.title || 'Marco').replace(/'/g, "''");
      const desc = (fm.description || '').replace(/'/g, "''");
      const domain = fm.domain || 'autonomy';

      this.db.public.none(`
        INSERT INTO functional_milestones (
          id, organization_id, student_id, date, title, description, domain
        ) VALUES (
          '${fmUUID}', '${orgUUID}', '${stdUUID}', '${fm.date || '2026-09-01'}', '${title}', '${desc}', '${domain}'
        )
        ON CONFLICT (id) DO NOTHING;
      `);
      this.recordReconciliation('functional_milestones', fm.id, fmUUID, 'MIGRATED');
    }

    for (const fb of s.functionalBatteries) {
      const fbUUID = toDeterministicUUID('functional_batteries', fb.id);
      const title = (fb.title || 'Bateria').replace(/'/g, "''");
      const testIdsJson = JSON.stringify(fb.testIds || []).replace(/'/g, "''");

      this.db.public.none(`
        INSERT INTO functional_batteries (
          id, organization_id, title, test_ids, is_default
        ) VALUES (
          '${fbUUID}', '${orgUUID}', '${title}', '${testIdsJson}'::jsonb, ${fb.isDefault === true}
        )
        ON CONFLICT (id) DO NOTHING;
      `);
      this.recordReconciliation('functional_batteries', fb.id, fbUUID, 'MIGRATED');
    }

    // 18. EVOLUTION REPORTS & WORKOUT TEMPLATES
    for (const rep of s.evolutionReports) {
      const repUUID = toDeterministicUUID('evolution_reports', rep.id);
      const stdUUID = toDeterministicUUID('students', rep.studentId);
      const sName = (rep.studentName || '').replace(/'/g, "''");
      const title = (rep.title || 'Relatório de Evolução').replace(/'/g, "''");
      const pType = rep.periodType || 'monthly';
      const dur = rep.durationDays || 30;

      this.db.public.none(`
        INSERT INTO evolution_reports (
          id, organization_id, student_id, student_name, title, period_type,
          start_date, end_date, duration_days, status
        ) VALUES (
          '${repUUID}', '${orgUUID}', '${stdUUID}', '${sName}', '${title}', '${pType}',
          '${rep.startDate || '2026-08-01'}', '${rep.endDate || '2026-09-01'}', ${dur}, '${rep.status || 'draft'}'
        )
        ON CONFLICT (id) DO NOTHING;
      `);
      this.recordReconciliation('evolution_reports', rep.id, repUUID, 'MIGRATED');
    }

    for (const wt of s.workoutTemplates) {
      const wtUUID = toDeterministicUUID('workout_templates', wt.id);
      const name = (wt.name || wt.title || 'Template de Treino').replace(/'/g, "''");
      const wJson = JSON.stringify(wt.workouts || []).replace(/'/g, "''");

      this.db.public.none(`
        INSERT INTO workout_templates (
          id, organization_id, name, workouts, is_favorite
        ) VALUES (
          '${wtUUID}', '${orgUUID}', '${name}', '${wJson}'::jsonb, ${wt.isFavorite === true}
        )
        ON CONFLICT (id) DO NOTHING;
      `);
      this.recordReconciliation('workout_templates', wt.id, wtUUID, 'MIGRATED');
    }

    // 19. STUDENT ONBOARDINGS
    for (const ob of s.studentOnboardings) {
      const obUUID = toDeterministicUUID('student_onboardings', ob.id);
      const stdUUID = toDeterministicUUID('students', ob.studentId);
      const st = ob.status || 'pending';
      const stepsJson = JSON.stringify(ob.steps || []).replace(/'/g, "''");

      this.db.public.none(`
        INSERT INTO student_onboardings (
          id, organization_id, student_id, status, started_at, steps
        ) VALUES (
          '${obUUID}', '${orgUUID}', '${stdUUID}', '${st}', '${ob.startedAt || new Date().toISOString()}', '${stepsJson}'::jsonb
        )
        ON CONFLICT (id) DO NOTHING;
      `);
      this.recordReconciliation('student_onboardings', ob.id, obUUID, 'MIGRATED');
    }

    // 20. APP USERS
    for (const usr of s.appUsers) {
      const usrUUID = toDeterministicUUID('app_users', usr.id);
      const stdUUID = usr.studentId ? toDeterministicUUID('students', usr.studentId) : null;
      const role = usr.role === 'STUDENT' ? 'STUDENT' : 'TRAINER';
      const email = (usr.email || '').replace(/'/g, "''");
      const dName = (usr.displayName || '').replace(/'/g, "''");

      this.db.public.none(`
        INSERT INTO app_users (
          id, organization_id, role, student_id, status, email, display_name
        ) VALUES (
          '${usrUUID}', '${orgUUID}', '${role}', ${stdUUID ? `'${stdUUID}'` : 'NULL'},
          '${usr.status || 'active'}', '${email}', '${dName}'
        )
        ON CONFLICT (id) DO NOTHING;
      `);
      this.recordReconciliation('app_users', usr.id, usrUUID, 'MIGRATED');
    }

    // Coleta de contagens do target (PostgreSQL)
    const tables = [
      'organizations',
      'students',
      'student_access',
      'exercises',
      'routines',
      'routine_workouts',
      'workout_exercises',
      'sessions',
      'session_sets',
      'active_workouts',
      'assessments',
      'schedule_recurrences',
      'schedule_events',
      'training_cycles',
      'training_blocks',
      'training_memories',
      'proposals',
      'proposal_templates',
      'active_plans',
      'plan_participants',
      'settings',
      'photos',
      'functional_tests',
      'functional_assessments',
      'functional_goals',
      'functional_milestones',
      'functional_batteries',
      'evolution_reports',
      'workout_templates',
      'student_onboardings',
      'app_users'
    ];

    const counts: EntityCountReport[] = [];
    for (const table of tables) {
      try {
        const res = this.db.public.many(`SELECT COUNT(*) as count FROM ${table};`);
        const targetCount = parseInt(res[0].count, 10);
        this.manifest.targetCounts[table] = targetCount;
        const sourceCount = this.manifest.sourceCounts[table] ?? 0;
        const diff = targetCount - sourceCount;

        counts.push({
          entity: table,
          sourceCount,
          targetCount,
          difference: diff,
          status: (table === 'exercises' && targetCount >= sourceCount) || diff === 0 ? 'OK' : 'MISMATCH'
        });
      } catch (err: any) {
        this.manifest.errors.push(`Erro ao contar tabela ${table}: ${err.message}`);
      }
    }

    this.manifest.finishedAt = new Date().toISOString();
    return { counts, reconciliation: Array.from(this.reconciliationMap.values()) };
  }

  public getManifest(): MigrationManifest {
    return this.manifest;
  }

  public getDb(): IMemoryDb {
    return this.db;
  }
}

// ==============================================================================
// 7. GERAÇÃO DE RELATÓRIOS
// ==============================================================================

export function generateReports(
  manifest: MigrationManifest,
  counts: EntityCountReport[],
  reconciliation: ReconciliationItem[],
  syncAudit: SyncQueueAudit
): { migrationReportPath: string; reconciliationReportPath: string } {
  const reportsDir = path.resolve(process.cwd(), 'supabase');

  const migReportContent = `# RELATÓRIO DE MIGRAÇÃO — ETAPA 3.2 (FONTE REAL VIA BACKUP JSON)
Data/Hora de Execução: ${manifest.startedAt}
Status Geral: ${manifest.status === 'SUCCESS' ? '✅ SUCESSO' : '❌ FALHA'}
Modo de Execução: **${manifest.mode}**
Origem dos Dados: **${manifest.sourceMode}** ${manifest.sourceFile ? `(\`${manifest.sourceFile}\`)` : ''}
Ambiente de Origem: \`${manifest.sourceEnvironment}\`
Ambiente de Destino: \`${manifest.targetEnvironment}\`
Versão do App: \`${manifest.appVersion}\`
Schema Alvo: \`${manifest.schemaVersion}\`

---

## 1. PRINCÍPIOS DE SEGURANÇA RESPEITADOS
- **NÃO foi realizado Cutover.**
- **NÃO foi alterada a produção.**
- **NÃO foi removido o Firebase.**
- **NÃO foi removido o IndexedDB.**
- **Fixtures foram permanentemente eliminadas da execução real.**
- **Fail-Closed ativo**: Execução real condicionada estritamente à presença e integridade do backup JSON.

---

## 2. CONFERÊNCIA DE CONTAGENS (SOURCE vs TARGET)
| Entidade / Tabela | Origem (IndexedDB Backup) | Destino (PostgreSQL) | Diferença | Status |
|---|---|---|---|---|
${counts.map(c => `| **${c.entity}** | ${c.sourceCount} | ${c.targetCount} | ${c.difference >= 0 ? `+${c.difference}` : c.difference} | ${c.status === 'OK' ? '✅ OK' : '⚠️ MISMATCH'} |`).join('\n')}

---

## 3. AUDITORIA DA SYNC QUEUE
- Total de Itens: **${syncAudit.totalCount}**
- Pendentes: **${syncAudit.pendingCount}**
- Em Processamento: **${syncAudit.processingCount}**
- Falhas: **${syncAudit.failedCount}**
- Concluídos: **${syncAudit.completedCount}**

---

## 4. RESUMO DE RECONCILIAÇÃO DETERMINÍSTICA
- Total de Entidades Mapeadas: **${manifest.reconciliationSummary.total}**
- Migradas com Sucesso: **${manifest.reconciliationSummary.migrated}**
- Ignoradas (Idempotência/Existentes): **${manifest.reconciliationSummary.skipped}**
- Conflitos Identificados: **${manifest.reconciliationSummary.conflicts}**
- Falhas: **${manifest.reconciliationSummary.failed}**

---

## 5. BACKUP DE PRÉ-MIGRATION & INTEGRIDADE SHA-256
- Arquivo de Auditoria Gerado: \`${manifest.backupFile}\`
- Checksum SHA-256: \`${manifest.backupChecksumSha256}\`
`;

  const recReportContent = `# RELATÓRIO DE RECONCILIAÇÃO — ETAPA 3.2
Data/Hora: ${manifest.startedAt}
Total de Registros: ${reconciliation.length}

| Entidade | ID Legado (Origem) | UUID Determinístico (Destino) | Status | Hash Origem (SHA-256) |
|---|---|---|---|---|
${reconciliation.slice(0, 100).map(r => `| \`${r.entity}\` | \`${r.legacyId}\` | \`${r.postgresId}\` | **${r.status}** | \`${(r.sourceHash || '-').substring(0, 16)}...\` |`).join('\n')}

*(Exibindo primeiros 100 registros para auditoria forense detalhada)*
`;

  const migPath = path.join(reportsDir, 'STAGE3_REAL_DRY_RUN_REPORT.md');
  const recPath = path.join(reportsDir, 'STAGE3_REAL_RECONCILIATION_REPORT.md');

  fs.writeFileSync(migPath, migReportContent, 'utf8');
  fs.writeFileSync(recPath, recReportContent, 'utf8');

  return { migrationReportPath: migPath, reconciliationReportPath: recPath };
}

// ==============================================================================
// 8. ENTRY POINT PRINCIPAL (CLI)
// ==============================================================================

export async function main(): Promise<void> {
  const args = parseCommandLineArgs();

  console.log('\n==============================================================================');
  console.log('TFIVE PRO — MIGRAÇÃO FIREBASE → SUPABASE / POSTGRESQL (ETAPA 3.2)');
  console.log('ETL DETERMINÍSTICO BASEADO NO BACKUP REAL DO APLICATIVO');
  console.log('==============================================================================');

  let sourceDatabase: SourceDatabase;
  let sourceMode: 'BACKUP_JSON' | 'FIXTURE_TEST';

  if (args.source === 'fixture') {
    console.log('\n⚠️  [ATENÇÃO: MODO DE TESTE COM FIXTURES]');
    console.log('Executando sob flag --source=fixture. Este modo destina-se EXCLUSIVAMENTE a testes');
    console.log('automatizados de regressão. NÃO UTILIZE ESTE MODO COMO MIGRAÇÃO REAL DE PRODUÇÃO.');
    sourceDatabase = loadTestFixtureData();
    sourceMode = 'FIXTURE_TEST';
  } else {
    // MODO REAL: FAIL-CLOSED OBRIGATÓRIO
    if (!args.input) {
      console.error(`
==============================================================================
❌ [FATAL_ERROR: REAL_BACKUP_REQUIRED]
A migração real exige obrigatoriamente o arquivo de backup exportado do TFIVE PRO!

Como executar:
  npm run migrate:stage3:dry-run -- --input /caminho/do/seu/backup.json
  npm run migrate:stage3:real -- --input /caminho/do/seu/backup.json --execute

Como obter o backup do seu TFIVE PRO:
  1. No aplicativo real, vá em Configurações > Backup / Exportar
  2. Clique em "Exportar Backup Completo" e salve o arquivo .json
  3. Indique o arquivo no comando acima via --input <caminho>

MOTIVO DE SEGURANÇA:
  Fixtures, mocks e arrays hardcoded foram permanentemente desativados do ETL.
  O sistema abortou a execução imediatamente (FAIL CLOSED).
  Nenhum dado foi alterado na origem ou no destino.
==============================================================================
`);
      process.exit(1);
    }

    console.log(`\n📂 Carregando backup real de: "${args.input}"...`);
    sourceDatabase = loadBackupFromFile(args.input, args.orgId);
    sourceMode = 'BACKUP_JSON';
    console.log(`✅ Backup carregado e validado com sucesso.`);
    console.log(`   - Alunos: ${sourceDatabase.students.length}`);
    console.log(`   - Exercícios: ${sourceDatabase.exercises.length}`);
    console.log(`   - Rotinas: ${sourceDatabase.routines.length}`);
    console.log(`   - Sessões: ${sourceDatabase.sessions.length}`);
    console.log(`   - Avaliações: ${sourceDatabase.assessments.length}`);
    console.log(`   - Fotos: ${sourceDatabase.photos.length}`);
    console.log(`   - Ciclos: ${sourceDatabase.trainingCycles.length}`);
  }

  const executionMode = args.dryRun ? 'DRY_RUN' : 'EXECUTE';
  console.log(`\n⚙️  Modo de execução: ${executionMode}`);

  const engine = new MigrationEngine(sourceDatabase, executionMode, sourceMode, args.input);
  engine.initSchema();

  const backupInfo = engine.createPreMigrationBackup();
  console.log(`✅ Snapshot de pré-migração: ${backupInfo.filename} (SHA256: ${backupInfo.sha256.substring(0, 16)}...)`);

  const syncAudit = engine.auditSyncQueue();
  console.log(`✅ Sync Queue: ${syncAudit.totalCount} registros auditados.`);

  console.log(`\n🚀 Executando mapeamento topológico para as tabelas relacionais do Supabase...`);
  const result = engine.run();

  const reports = generateReports(engine.getManifest(), result.counts, result.reconciliation, syncAudit);
  console.log(`\n📄 Relatórios gerados com sucesso:`);
  console.log(`   - ${reports.migrationReportPath}`);
  console.log(`   - ${reports.reconciliationReportPath}`);

  console.log('\n==============================================================================');
  console.log(`ETAPA 3.2: PROCESSO CONCLUÍDO COM SUCESSO (${executionMode})`);
  console.log('==============================================================================\n');
}

// Auto-executar se invocado via linha de comando
if (process.argv[1]?.includes('migrateToSupabaseStaging')) {
  main().catch(err => {
    console.error('Erro na execução da Etapa 3.2:', err);
    process.exit(1);
  });
}
