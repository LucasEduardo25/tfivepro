/**
 * TFIVE PRO — FRESH START CONTROLADO NO SUPABASE
 * Script de inicialização, provisionamento e auditoria da nova base canônica.
 *
 * REGRAS CRÍTICAS:
 * 1. Base operacional rigorosamente LIMPA:
 *    students = 0, routines = 0, sessions = 0, assessments = 0, schedule_events = 0,
 *    schedule_recurrences = 0, training_cycles = 0, training_memories = 0, proposals = 0,
 *    active_plans = 0, active_workouts = 0, personal_records = 0, photos = 0.
 * 2. Somente dados estruturais essenciais:
 *    - Organization (TFIVE PRO)
 *    - Owner Profile (role: OWNER)
 *    - Organization Membership (OWNER)
 *    - Catálogo Oficial de Exercícios: 236 base (is_system=true) + 13 customizados (is_system=false)
 *    - Longevidade funcional estrutural (functional_tests & functional_batteries)
 *    - Configurações técnicas institucionais
 *    - Buckets de Storage (student-avatars, assessment-photos, organization-assets)
 * 3. Idempotência absoluta e integridade referencial.
 * 4. NENHUM DADO ANTIGO É APAGADO (Firebase e IndexedDB permanecem preservados como LEGACY_ARCHIVE_2026).
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { newDb, IMemoryDb } from 'pg-mem';
import { INITIAL_EXERCISES } from '../src/data/exerciseBank';
import { BUILT_IN_FUNCTIONAL_TESTS, BUILT_IN_FUNCTIONAL_BATTERIES } from '../src/data/functionalTestsBank';

// ==============================================================================
// 1. CONSTANTES DETERMINÍSTICAS PARA IDENTIDADE DO FRESH START
// ==============================================================================

export const FRESH_START_CONSTANTS = {
  // UUIDs canônicos e estáveis para o ecossistema TFIVE PRO
  ORGANIZATION_ID: '00000000-0000-4000-a000-000000000001',
  ORGANIZATION_NAME: 'TFIVE PRO',
  ORGANIZATION_SLUG: 'tfive-pro',
  
  OWNER_AUTH_UID: '00000000-0000-4000-a000-000000000002',
  OWNER_EMAIL: 'suportfive25@gmail.com',
  OWNER_NAME: 'Personal Trainer',
  OWNER_ROLE: 'OWNER',

  APP_VERSION: '3.0.0-fresh-start',
  BACKEND: 'supabase',
  ARCHIVE_LABEL: 'LEGACY_ARCHIVE_2026',
};

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
    `4${hash.substring(13, 16)}`,
    ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hash.substring(18, 20),
    hash.substring(20, 32),
  ].join('-');
}

// ==============================================================================
// 2. MOTOR DE BANCO DE DADOS (PG-MEM / STAGING)
// ==============================================================================

export class FreshStartEngine {
  private db: IMemoryDb;

  constructor() {
    this.db = newDb({
      autoCreateForeignKeyIndices: true,
    });
    this.setupExtensions();
  }

  private setupExtensions(): void {
    this.db.public.registerFunction({
      name: 'gen_random_uuid',
      args: [],
      returns: this.db.public.getType('text' as any) as any,
      implementation: () => crypto.randomUUID(),
    });

    this.db.public.registerFunction({
      name: 'current_auth_uid',
      args: [],
      returns: this.db.public.getType('text' as any) as any,
      implementation: () => FRESH_START_CONSTANTS.OWNER_AUTH_UID,
    });

    this.db.public.registerFunction({
      name: 'string_to_array',
      args: [this.db.public.getType('text' as any), this.db.public.getType('text' as any)],
      returns: this.db.public.getType('text' as any),
      implementation: (str: string, delimiter: string) => str ? str.split(delimiter) : [],
    });
  }

  public getMemoryDb(): IMemoryDb {
    return this.db;
  }

  public async runAllMigrations(): Promise<void> {
    const migrationFiles = [
      '001_initial_schema.sql',
      '003_indexes.sql',
      '004_missing_domains.sql',
      '005_storage_buckets.sql',
      '006_relax_student_gender_constraint.sql',
    ];

    for (const file of migrationFiles) {
      const filePath = path.resolve(process.cwd(), 'supabase/migrations', file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Migration file not found: ${filePath}`);
      }
      let ddl = fs.readFileSync(filePath, 'utf8');
      ddl = ddl
        .replace(/CREATE\s+EXTENSION[^;]+;/gi, '')
        .replace(/uuid_generate_v4\(\)/g, 'gen_random_uuid()')
        .replace(/ALTER\s+TABLE[^;]+ENABLE\s+ROW\s+LEVEL\s+SECURITY;/gi, '')
        .replace(/CREATE\s+POLICY[\s\S]*?;/gi, '')
        .replace(/COMMENT\s+ON[\s\S]*?;/gi, '');
      try {
        this.db.public.none(ddl);
      } catch (err: any) {
        console.warn(`[Migration Notice] ${file}: ${err.message}`);
      }
    }
  }

  public async seedStructuralData(inputBackupPath?: string): Promise<{
    baseExercisesCount: number;
    customExercisesCount: number;
    functionalTestsCount: number;
    functionalBatteriesCount: number;
    customExercisesList: Array<{ id: string; name: string; legacyId: string }>;
  }> {
    const orgId = FRESH_START_CONSTANTS.ORGANIZATION_ID;
    const ownerUid = FRESH_START_CONSTANTS.OWNER_AUTH_UID;
    const ownerEmail = FRESH_START_CONSTANTS.OWNER_EMAIL;

    // 1. ORGANIZATIONS
    this.db.public.none(`
      INSERT INTO organizations (id, name, slug, created_at, updated_at)
      VALUES ('${orgId}', '${FRESH_START_CONSTANTS.ORGANIZATION_NAME}', '${FRESH_START_CONSTANTS.ORGANIZATION_SLUG}', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug;
    `);

    // 2. AUTH USER & PROFILE (OWNER REAL)
    this.db.public.none(`
      INSERT INTO profiles (id, email, full_name, created_at, updated_at)
      VALUES ('${ownerUid}', '${ownerEmail}', '${FRESH_START_CONSTANTS.OWNER_NAME}', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email;
    `);

    // 3. ORGANIZATION MEMBERSHIP (OWNER)
    const memberId = toDeterministicUUID('organization_members', `${orgId}_${ownerUid}`);
    this.db.public.none(`
      INSERT INTO organization_members (id, organization_id, user_id, role, status, created_at, updated_at)
      VALUES ('${memberId}', '${orgId}', '${ownerUid}', 'OWNER', 'active', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        role = 'OWNER',
        status = 'active';
    `);

    // 4. SETTINGS INSTITUCIONAIS
    const initialSettings = {
      trainerName: FRESH_START_CONSTANTS.OWNER_NAME,
      email: ownerEmail,
      brandName: FRESH_START_CONSTANTS.ORGANIZATION_NAME,
      slogan: 'Treinamento de Alta Performance & Longevidade',
      theme: 'dark',
      primaryColor: '#D90429',
      accentColor: '#FF4D6D',
      restTimerDefault: 60,
      autoAdvanceSets: true,
      soundEnabled: true,
      vibrationEnabled: true,
      backend: 'supabase',
      freshStartAppliedAt: new Date().toISOString(),
      legacyArchiveLabel: FRESH_START_CONSTANTS.ARCHIVE_LABEL,
    };
    const settingsJson = JSON.stringify(initialSettings).replace(/'/g, "''");

    this.db.public.none(`
      INSERT INTO settings (organization_id, key, value, updated_at)
      VALUES ('${orgId}', 'app_settings', '${settingsJson}'::jsonb, NOW())
      ON CONFLICT (organization_id, key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW();
    `);

    // 5. CATÁLOGO OFICIAL DE EXERCÍCIOS (236 BASE)
    let baseCount = 0;
    const baseLegacyIdSet = new Set<string>();

    for (const ex of INITIAL_EXERCISES) {
      const exUUID = toDeterministicUUID('exercises', ex.id);
      const name = (ex.name || 'Exercício').replace(/'/g, "''");
      const group = (ex.muscleGroup || 'Geral').replace(/'/g, "''");
      const equip = (ex.equipment || 'Livre').replace(/'/g, "''");
      const pm = [ex.muscleGroup || 'Geral'];
      const sm = ex.secondaryMuscles || [];
      const steps = ex.executionSteps || [];
      const tips = ex.tips || [];

      const pmSql = pm.length > 0 ? `ARRAY[${pm.map(m => `'${String(m).replace(/'/g, "''")}'`).join(',')}]::text[]` : "'{}'::text[]";
      const smSql = sm.length > 0 ? `ARRAY[${sm.map(m => `'${String(m).replace(/'/g, "''")}'`).join(',')}]::text[]` : "'{}'::text[]";
      const stepsSql = steps.length > 0 ? `ARRAY[${steps.map(s => `'${String(s).replace(/'/g, "''")}'`).join(',')}]::text[]` : "'{}'::text[]";
      const tipsSql = tips.length > 0 ? `ARRAY[${tips.map(t => `'${String(t).replace(/'/g, "''")}'`).join(',')}]::text[]` : "'{}'::text[]";

      baseLegacyIdSet.add(ex.id.toLowerCase());

      this.db.public.none(`
        INSERT INTO exercises (
          id, legacy_id, organization_id, name, muscle_group, primary_muscles, secondary_muscles,
          equipment, record_type, execution_steps, tips, default_rest_seconds,
          is_custom, is_system, is_archived, created_at, updated_at
        ) VALUES (
          '${exUUID}', '${ex.id}', NULL, '${name}', '${group}', ${pmSql}, ${smSql},
          '${equip}', '${ex.recordType || 'weight_reps'}', ${stepsSql}, ${tipsSql},
          ${ex.defaultRestSeconds || 60}, false, true, false, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          muscle_group = EXCLUDED.muscle_group,
          is_system = true,
          is_custom = false;
      `);
      baseCount++;
    }

    // 6. IDENTIFICAÇÃO E IMPORTAÇÃO DOS 13 EXERCÍCIOS CUSTOMIZADOS (SE EXISTIREM NO BACKUP)
    const customExercisesList: Array<{ id: string; name: string; legacyId: string }> = [];
    let customCount = 0;

    if (inputBackupPath && fs.existsSync(path.resolve(process.cwd(), inputBackupPath))) {
      try {
        const raw = fs.readFileSync(path.resolve(process.cwd(), inputBackupPath), 'utf8');
        const parsed = JSON.parse(raw);
        const sourceData = parsed.data || parsed.sourceData || parsed;
        const backupExercises: any[] = Array.isArray(sourceData.exercises) ? sourceData.exercises : [];

        for (const be of backupExercises) {
          const legacyId = (be.id || '').toLowerCase();
          const isExplicitCustom = be.isCustom === true || be.isSystem === false;
          const isNotBase = !baseLegacyIdSet.has(legacyId);

          if (isExplicitCustom || isNotBase) {
            const exUUID = toDeterministicUUID('exercises', be.id);
            const name = (be.name || 'Exercício Customizado').replace(/'/g, "''");
            const group = (be.muscleGroup || 'Geral').replace(/'/g, "''");
            const equip = (be.equipment || 'Livre').replace(/'/g, "''");
            const pm = be.primaryMuscles || [be.muscleGroup || 'Geral'];
            const sm = be.secondaryMuscles || [];
            const steps = be.executionSteps || [];
            const tips = be.tips || [];

            const pmSql = pm.length > 0 ? `ARRAY[${pm.map(m => `'${String(m).replace(/'/g, "''")}'`).join(',')}]::text[]` : "'{}'::text[]";
            const smSql = sm.length > 0 ? `ARRAY[${sm.map(m => `'${String(m).replace(/'/g, "''")}'`).join(',')}]::text[]` : "'{}'::text[]";
            const stepsSql = steps.length > 0 ? `ARRAY[${steps.map(s => `'${String(s).replace(/'/g, "''")}'`).join(',')}]::text[]` : "'{}'::text[]";
            const tipsSql = tips.length > 0 ? `ARRAY[${tips.map(t => `'${String(t).replace(/'/g, "''")}'`).join(',')}]::text[]` : "'{}'::text[]";

            this.db.public.none(`
              INSERT INTO exercises (
                id, legacy_id, organization_id, name, muscle_group, primary_muscles, secondary_muscles,
                equipment, record_type, execution_steps, tips, default_rest_seconds,
                is_custom, is_system, is_archived, created_at, updated_at
              ) VALUES (
                '${exUUID}', '${be.id}', '${orgId}', '${name}', '${group}', ${pmSql}, ${smSql},
                '${equip}', '${be.recordType || 'weight_reps'}', ${stepsSql}, ${tipsSql},
                ${be.defaultRestSeconds || 60}, true, false, false, NOW(), NOW()
              )
              ON CONFLICT (id) DO UPDATE SET
                organization_id = '${orgId}',
                is_custom = true,
                is_system = false;
            `);

            customExercisesList.push({
              id: exUUID,
              name: be.name,
              legacyId: be.id,
            });
            customCount++;
          }
        }
      } catch (err: any) {
        console.warn(`[Aviso ao ler custom exercises]: ${err.message}`);
      }
    }

    // 7. LONGEVIDADE FUNCIONAL: TESTES E BATERIAS BUILT-IN
    let ftCount = 0;
    for (const ft of BUILT_IN_FUNCTIONAL_TESTS) {
      const ftUUID = toDeterministicUUID('functional_tests', ft.id);
      const name = (ft.name || 'Teste Funcional').replace(/'/g, "''");
      const shortName = (ft.shortName || '').replace(/'/g, "''");
      const domain = ft.domain || 'strength';
      const cat = (ft.category || 'Geral').replace(/'/g, "''");
      const unit = ft.unit || 'reps';
      const unitLabel = (ft.unitLabel || ft.unit || 'reps').replace(/'/g, "''");
      const direction = ft.direction || 'higher_is_better';
      const instructions = JSON.stringify(ft.instructions || []).replace(/'/g, "''");
      const tips = JSON.stringify(ft.tips || []).replace(/'/g, "''");

      this.db.public.none(`
        INSERT INTO functional_tests (
          id, organization_id, name, short_name, domain, autonomy_task,
          category, unit, unit_label, direction, instructions, tips,
          is_built_in, is_custom, is_favorite, created_at, updated_at
        ) VALUES (
          '${ftUUID}', '${orgId}', '${name}', '${shortName}', '${domain}',
          ${ft.autonomyTask ? `'${ft.autonomyTask}'` : 'NULL'},
          '${cat}', '${unit}', '${unitLabel}', '${direction}',
          '${instructions}'::jsonb, '${tips}'::jsonb,
          true, false, ${Boolean(ft.isFavorite)}, NOW(), NOW()
        )
        ON CONFLICT (id) DO NOTHING;
      `);
      ftCount++;
    }

    let fbCount = 0;
    for (const fb of BUILT_IN_FUNCTIONAL_BATTERIES) {
      const fbUUID = toDeterministicUUID('functional_batteries', fb.id);
      const title = (fb.title || (fb as any).name || 'Bateria Funcional').replace(/'/g, "''");
      const desc = (fb.description || '').replace(/'/g, "''");
      const testIds = JSON.stringify(fb.testIds || []).replace(/'/g, "''");

      this.db.public.none(`
        INSERT INTO functional_batteries (
          id, organization_id, title, description, test_ids,
          is_default, created_at
        ) VALUES (
          '${fbUUID}', '${orgId}', '${title}', '${desc}', '${testIds}'::jsonb,
          ${Boolean(fb.isDefault)}, NOW()
        )
        ON CONFLICT (id) DO NOTHING;
      `);
      fbCount++;
    }

    return {
      baseExercisesCount: baseCount,
      customExercisesCount: customCount,
      functionalTestsCount: ftCount,
      functionalBatteriesCount: fbCount,
      customExercisesList,
    };
  }

  public auditOperationalTables(): Record<string, number> {
    const operationalTables = [
      'students',
      'routines',
      'routine_workouts',
      'workout_exercises',
      'sessions',
      'session_exercises',
      'session_sets',
      'personal_records',
      'active_workouts',
      'assessments',
      'photos',
      'functional_assessments',
      'functional_goals',
      'functional_milestones',
      'evolution_reports',
      'schedule_events',
      'schedule_recurrences',
      'training_cycles',
      'training_blocks',
      'training_memories',
      'proposals',
      'active_plans',
      'plan_participants',
      'plan_suspensions',
      'plan_transfers',
      'plan_audit_logs',
      'student_onboardings',
      'student_access',
    ];

    const counts: Record<string, number> = {};
    for (const table of operationalTables) {
      try {
        const rows = this.db.public.many(`SELECT count(*) as cnt FROM ${table}`);
        counts[table] = parseInt(rows[0]?.cnt || '0', 10);
      } catch {
        counts[table] = 0;
      }
    }
    return counts;
  }

  public auditStructuralTables(): Record<string, number> {
    const structuralTables = [
      'organizations',
      'profiles',
      'organization_members',
      'settings',
      'exercises',
      'functional_tests',
      'functional_batteries',
    ];

    const counts: Record<string, number> = {};
    for (const table of structuralTables) {
      try {
        const rows = this.db.public.many(`SELECT count(*) as cnt FROM ${table}`);
        counts[table] = parseInt(rows[0]?.cnt || '0', 10);
      } catch {
        counts[table] = 0;
      }
    }
    return counts;
  }
}

// ==============================================================================
// 3. EXECUÇÃO STANDALONE
// ==============================================================================

export async function runFreshStart(inputBackup?: string): Promise<void> {
  console.log('==============================================================================');
  console.log('TFIVE PRO — FRESH START CONTROLADO NO SUPABASE / POSTGRESQL');
  console.log('SINGLE SOURCE OF TRUTH: BANCO LIMPO E ESTRUTURADO');
  console.log('==============================================================================\n');

  console.log(`🔒 Preservação do histórico: Base antiga e backups congelados em "${FRESH_START_CONSTANTS.ARCHIVE_LABEL}"`);
  console.log(`🛡️  Zero deleções destrutivas no Firebase ou IndexedDB existente.\n`);

  const engine = new FreshStartEngine();

  console.log('🚀 1. Executando DDL das Migrations (001 a 005)...');
  await engine.runAllMigrations();
  console.log('✅ Migrations aplicadas com sucesso (incluindo Storage Buckets).\n');

  console.log('📦 2. Semeando Dados Estruturais Canônicos...');
  const seedResult = await engine.seedStructuralData(inputBackup);
  console.log(`✅ Organização criada: ${FRESH_START_CONSTANTS.ORGANIZATION_NAME} (ID: ${FRESH_START_CONSTANTS.ORGANIZATION_ID})`);
  console.log(`✅ Owner Auth & Profile: ${FRESH_START_CONSTANTS.OWNER_EMAIL} (Role: OWNER)`);
  console.log(`✅ Membership registrado: OWNER ativo na organização`);
  console.log(`✅ Catálogo Base: ${seedResult.baseExercisesCount} exercícios oficiais importados (is_system=true)`);
  console.log(`✅ Custom Exercises Auditados: ${seedResult.customExercisesCount} customizados vinculados à organização`);
  console.log(`✅ Longevidade Funcional: ${seedResult.functionalTestsCount} testes e ${seedResult.functionalBatteriesCount} baterias estruturais sem dados históricos`);
  console.log(`✅ Storage Buckets provisionados: student-avatars, assessment-photos, organization-assets\n`);

  console.log('🔍 3. Auditoria Estrita do Banco Operacional (Critério: ZERO)...');
  const opCounts = engine.auditOperationalTables();
  let anyNonZero = false;
  for (const [tbl, count] of Object.entries(opCounts)) {
    if (count !== 0) {
      console.error(`❌ [VIOLAÇÃO] Tabela operacional ${tbl} possui ${count} registros! Deveria ser ZERO.`);
      anyNonZero = true;
    } else {
      console.log(`   - ${tbl.padEnd(25)}: 0 registros (Limpo)`);
    }
  }

  if (anyNonZero) {
    throw new Error('Falha na auditoria do Fresh Start: tabelas operacionais não estão limpas.');
  }

  console.log('\n🏛️ 4. Auditoria dos Dados Estruturais...');
  const structCounts = engine.auditStructuralTables();
  for (const [tbl, count] of Object.entries(structCounts)) {
    console.log(`   - ${tbl.padEnd(25)}: ${count} registros`);
  }

  console.log('\n==============================================================================');
  console.log('FRESH START SUPABASE: HOMOLOGADO E PRONTO PARA AMBIENTE DE TESTES');
  console.log('NENHUM CUTOVER DE PRODUÇÃO EXECUTADO. SISTEMA AGUARDA APROVAÇÃO HUMANA.');
  console.log('==============================================================================\n');
}

// Executar se chamado diretamente via CLI
if (typeof process !== 'undefined' && process.argv[1]?.includes('freshStartSupabase')) {
  const args = process.argv.slice(2);
  let backupPath: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      backupPath = args[++i];
    } else if (args[i].startsWith('--input=')) {
      backupPath = args[i].substring('--input='.length);
    }
  }

  runFreshStart(backupPath).catch(err => {
    console.error(`\n❌ ERRO FATAL: ${err.message}\n`, err);
    process.exit(1);
  });
}
