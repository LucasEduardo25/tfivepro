import { 
  Student, 
  Exercise, 
  WorkoutRoutine, 
  WorkoutSession, 
  PhysicalAssessment, 
  ScheduleAppointment, 
  ScheduleRecurrence,
  StudentPhoto, 
  ActiveWorkoutState,
  TrainerProfile,
  FunctionalTest,
  FunctionalAssessment,
  FunctionalGoal,
  FunctionalMilestone,
  FunctionalBattery,
  EvolutionReport,
  WorkoutTemplate,
  Proposal,
  ProposalTemplate,
  TrainingCycle,
  StudentOnboarding,
  ActivePlan,
  PlanTransfer,
  PlanSuspension,
  PlanAuditLog,
  TrainingMemory
} from '../types';
import { StudentAccess, AppUser } from '../types/auth';
import { 
  getAllFromStore, 
  putInStore, 
  clearStore, 
  getAllActiveWorkoutStates,
  getDB,
  DB_NAME,
  DB_VERSION,
  normalizeProposal,
  normalizeProposalTemplate,
  normalizeTrainingCycle,
  normalizeStudentOnboarding,
  normalizeActivePlan
} from '../db/indexedDB';

export const CURRENT_BACKUP_VERSION = 3;
export const CURRENT_DATABASE_VERSION = DB_VERSION;
export const BACKUP_SIGNATURE_APP = 'TFIVE PRO';
export const BACKUP_FORMAT = 'TFIVE_BACKUP';

export interface BackupMetadata {
  studentsCount: number;
  sessionsCount: number;
  setsCount: number;
  assessmentsCount: number;
  photosCount: number;
  routinesCount: number;
  scheduleCount: number;
  scheduleRecurrencesCount?: number;
  activeWorkoutsCount: number;
  customExercisesCount: number;
  functionalAssessmentsCount?: number;
  functionalGoalsCount?: number;
  evolutionReportsCount?: number;
  proposalsCount?: number;
  proposalTemplatesCount?: number;
  trainingCyclesCount?: number;
  studentOnboardingsCount?: number;
  activePlansCount?: number;
  planTransfersCount?: number;
  planSuspensionsCount?: number;
  planAuditLogsCount?: number;
  studentAccessCount?: number;
  appUsersCount?: number;
  trainingMemoriesCount?: number;
  appVersion: string;
  checksumSha256: string;
  estimatedSizeBytes: number;
}

export interface BackupDataPayload {
  students: Student[];
  exercises: Exercise[];
  routines: WorkoutRoutine[];
  sessions: WorkoutSession[];
  assessments: PhysicalAssessment[];
  schedule: ScheduleAppointment[];
  scheduleRecurrences?: ScheduleRecurrence[];
  photos: StudentPhoto[];
  activeWorkouts: ActiveWorkoutState[];
  settings: { key: string; value: unknown }[];
  functionalTests?: FunctionalTest[];
  functionalAssessments?: FunctionalAssessment[];
  functionalGoals?: FunctionalGoal[];
  functionalMilestones?: FunctionalMilestone[];
  functionalBatteries?: FunctionalBattery[];
  evolutionReports?: EvolutionReport[];
  workoutTemplates?: WorkoutTemplate[];
  proposals?: Proposal[];
  proposalTemplates?: ProposalTemplate[];
  trainingCycles?: TrainingCycle[];
  studentOnboardings?: StudentOnboarding[];
  activePlans?: ActivePlan[];
  planTransfers?: PlanTransfer[];
  planSuspensions?: PlanSuspension[];
  planAuditLogs?: PlanAuditLog[];
  studentAccess?: StudentAccess[];
  appUsers?: AppUser[];
  trainingMemories?: TrainingMemory[];
}

export interface TFIVEBackupFile {
  app: string;
  format: string;
  backupVersion: number;
  databaseVersion: number;
  createdAt: string;
  metadata: BackupMetadata;
  data: BackupDataPayload;
}

export interface BackupValidationResult {
  valid: boolean;
  backupVersion?: number;
  databaseVersion?: number;
  createdAt?: string;
  metadata?: BackupMetadata;
  data?: BackupDataPayload;
  errorMessage?: string;
  warningMessage?: string;
  isLegacyFormat?: boolean;
}

export interface LastBackupInfo {
  date: string;
  filename?: string;
  studentsCount: number;
  sessionsCount: number;
  sizeFormatted: string;
}

/**
 * Calculates SHA-256 Checksum of arbitrary string using Web Crypto API
 */
export async function calculateSha256(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    try {
      const msgUint8 = new TextEncoder().encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback simple hash for non-crypto environments
    }
  }
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `fb_${Math.abs(hash).toString(16)}`;
}

/**
 * Formats byte size into human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Creates a complete full backup of all persistent IndexedDB stores
 */
export async function createFullBackup(): Promise<{
  backupFile: TFIVEBackupFile;
  jsonString: string;
  filename: string;
  blob: Blob;
  sizeFormatted: string;
}> {
  // Read all stores in parallel
  const [
    students,
    exercises,
    routines,
    sessions,
    assessments,
    schedule,
    scheduleRecurrences,
    photos,
    settings,
    activeWorkouts,
    functionalTests,
    functionalAssessments,
    functionalGoals,
    functionalMilestones,
    functionalBatteries,
    evolutionReports,
    workoutTemplates,
    proposals,
    proposalTemplates,
    trainingCycles,
    studentOnboardings,
    activePlans,
    planTransfers,
    planSuspensions,
    planAuditLogs,
    studentAccess,
    appUsers,
    trainingMemories
  ] = await Promise.all([
    getAllFromStore<Student>('students'),
    getAllFromStore<Exercise>('exercises'),
    getAllFromStore<WorkoutRoutine>('routines'),
    getAllFromStore<WorkoutSession>('sessions'),
    getAllFromStore<PhysicalAssessment>('assessments'),
    getAllFromStore<ScheduleAppointment>('schedule'),
    getAllFromStore<ScheduleRecurrence>('schedule_recurrences'),
    getAllFromStore<StudentPhoto>('photos'),
    getAllFromStore<{ key: string; value: unknown }>('settings'),
    getAllActiveWorkoutStates(),
    getAllFromStore<FunctionalTest>('functional_tests'),
    getAllFromStore<FunctionalAssessment>('functional_assessments'),
    getAllFromStore<FunctionalGoal>('functional_goals'),
    getAllFromStore<FunctionalMilestone>('functional_milestones'),
    getAllFromStore<FunctionalBattery>('functional_batteries'),
    getAllFromStore<EvolutionReport>('evolution_reports'),
    getAllFromStore<WorkoutTemplate>('workout_templates'),
    getAllFromStore<Proposal>('proposals'),
    getAllFromStore<ProposalTemplate>('proposal_templates'),
    getAllFromStore<TrainingCycle>('training_cycles'),
    getAllFromStore<StudentOnboarding>('student_onboardings'),
    getAllFromStore<ActivePlan>('active_plans'),
    getAllFromStore<PlanTransfer>('plan_transfers'),
    getAllFromStore<PlanSuspension>('plan_suspensions'),
    getAllFromStore<PlanAuditLog>('plan_audit_logs'),
    getAllFromStore<StudentAccess>('student_access'),
    getAllFromStore<AppUser>('app_users'),
    getAllFromStore<TrainingMemory>('training_memories')
  ]);

  // Compute sub-item counts
  let totalSets = 0;
  for (const session of sessions) {
    if (session.sets && Array.isArray(session.sets)) {
      totalSets += session.sets.length;
    }
  }

  // Count total photos across student records, assessments, and gallery
  let totalPhotos = photos.length;
  for (const student of students) {
    if (student.photo && student.photo.startsWith('data:')) {
      totalPhotos++;
    }
  }
  for (const assessment of assessments) {
    if (assessment.photos) {
      if (assessment.photos.front) totalPhotos++;
      if (assessment.photos.back) totalPhotos++;
      if (assessment.photos.rightSide) totalPhotos++;
      if (assessment.photos.leftSide) totalPhotos++;
    }
  }

  const customExercisesCount = exercises.filter(e => e.isCustom).length;

  const dataPayload: BackupDataPayload = {
    students,
    exercises,
    routines,
    sessions,
    assessments,
    schedule,
    scheduleRecurrences,
    photos,
    activeWorkouts,
    settings,
    functionalTests,
    functionalAssessments,
    functionalGoals,
    functionalMilestones,
    functionalBatteries,
    evolutionReports,
    workoutTemplates,
    proposals,
    proposalTemplates,
    trainingCycles,
    studentOnboardings,
    activePlans,
    planTransfers,
    planSuspensions,
    planAuditLogs,
    studentAccess,
    appUsers,
    trainingMemories
  };

  const serializedData = JSON.stringify(dataPayload);
  const checksum = await calculateSha256(serializedData);
  const now = new Date();
  const createdAtStr = now.toISOString();

  const metadata: BackupMetadata = {
    studentsCount: students.length,
    sessionsCount: sessions.length,
    setsCount: totalSets,
    assessmentsCount: assessments.length,
    photosCount: totalPhotos,
    routinesCount: routines.length,
    scheduleCount: schedule.length,
    scheduleRecurrencesCount: scheduleRecurrences.length,
    activeWorkoutsCount: activeWorkouts.length,
    customExercisesCount,
    functionalAssessmentsCount: functionalAssessments.length,
    functionalGoalsCount: functionalGoals.length,
    evolutionReportsCount: (evolutionReports || []).length,
    proposalsCount: (proposals || []).length,
    proposalTemplatesCount: (proposalTemplates || []).length,
    trainingCyclesCount: (trainingCycles || []).length,
    studentOnboardingsCount: (studentOnboardings || []).length,
    activePlansCount: (activePlans || []).length,
    planTransfersCount: (planTransfers || []).length,
    planSuspensionsCount: (planSuspensions || []).length,
    planAuditLogsCount: (planAuditLogs || []).length,
    studentAccessCount: (studentAccess || []).length,
    appUsersCount: (appUsers || []).length,
    trainingMemoriesCount: (trainingMemories || []).length,
    appVersion: '5.3',
    checksumSha256: checksum,
    estimatedSizeBytes: serializedData.length
  };

  const backupFile: TFIVEBackupFile = {
    app: BACKUP_SIGNATURE_APP,
    format: BACKUP_FORMAT,
    backupVersion: CURRENT_BACKUP_VERSION,
    databaseVersion: CURRENT_DATABASE_VERSION,
    createdAt: createdAtStr,
    metadata,
    data: dataPayload
  };

  const jsonString = JSON.stringify(backupFile, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const sizeFormatted = formatBytes(blob.size);

  // Generate date stamp: YYYY-MM-DD_HHmm
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const filename = `TFIVE_PRO_Backup_${yyyy}-${mm}-${dd}_${hh}${min}.tfivebackup`;

  // Save last backup metadata locally in settings
  const lastBackupInfo: LastBackupInfo = {
    date: createdAtStr,
    filename,
    studentsCount: students.length,
    sessionsCount: sessions.length,
    sizeFormatted
  };
  await putInStore('settings', { key: 'last_backup_info', value: lastBackupInfo });

  return {
    backupFile,
    jsonString,
    filename,
    blob,
    sizeFormatted
  };
}

/**
 * Validates a backup file string or parsed object before any restore operation.
 * NEVER alters existing database records during validation.
 */
export async function validateBackup(fileContent: string): Promise<BackupValidationResult> {
  if (!fileContent || typeof fileContent !== 'string') {
    return { valid: false, errorMessage: 'Arquivo vazio ou formato inválido.' };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(fileContent);
  } catch {
    return { valid: false, errorMessage: 'Arquivo corrompido: formato JSON inválido.' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, errorMessage: 'Este arquivo não é um backup válido do TFIVE PRO.' };
  }

  // Check version compatibility: if backup is from a future unknown version
  if (parsed.backupVersion && typeof parsed.backupVersion === 'number' && parsed.backupVersion > CURRENT_BACKUP_VERSION) {
    return {
      valid: false,
      errorMessage: `Este backup foi criado por uma versão mais recente do TFIVE PRO (v${parsed.backupVersion}). Atualize o aplicativo antes de restaurá-lo.`
    };
  }

  let dataPayload: BackupDataPayload;
  let metadata: BackupMetadata;
  let isLegacy = false;

  // Modern versioned structure (v2+)
  if (parsed.app === BACKUP_SIGNATURE_APP && parsed.data && typeof parsed.data === 'object') {
    dataPayload = parsed.data;

    // Validate Checksum if provided
    if (parsed.metadata && parsed.metadata.checksumSha256) {
      const computedChecksum = await calculateSha256(JSON.stringify(dataPayload));
      if (computedChecksum !== parsed.metadata.checksumSha256) {
        // Warning about potential truncation/modification
        console.warn('Backup checksum mismatch. Proceeding with caution.');
      }
    }

    metadata = parsed.metadata || buildMetadataFromData(dataPayload);
  } else if (parsed.appName === 'TFIVE PRO' && parsed.data) {
    // Version 1 / legacy structured
    isLegacy = true;
    dataPayload = parsed.data;
    metadata = buildMetadataFromData(dataPayload);
  } else if (Array.isArray(parsed.students) || Array.isArray(parsed.sessions)) {
    // Raw legacy export format
    isLegacy = true;
    dataPayload = {
      students: parsed.students || [],
      exercises: parsed.exercises || [],
      routines: parsed.routines || [],
      sessions: parsed.sessions || [],
      assessments: parsed.assessments || [],
      schedule: parsed.schedule || [],
      photos: parsed.photos || [],
      activeWorkouts: parsed.activeWorkouts || [],
      settings: parsed.settings || []
    };
    metadata = buildMetadataFromData(dataPayload);
  } else {
    return {
      valid: false,
      errorMessage: 'Este arquivo não é um backup válido do TFIVE PRO.'
    };
  }

  // Type array validations
  if (dataPayload.students && !Array.isArray(dataPayload.students)) {
    return { valid: false, errorMessage: 'Lista de alunos inválida no backup.' };
  }
  if (dataPayload.sessions && !Array.isArray(dataPayload.sessions)) {
    return { valid: false, errorMessage: 'Histórico de treinos inválido no backup.' };
  }
  if (dataPayload.routines && !Array.isArray(dataPayload.routines)) {
    return { valid: false, errorMessage: 'Rotinas de treino inválidas no backup.' };
  }
  if (dataPayload.assessments && !Array.isArray(dataPayload.assessments)) {
    return { valid: false, errorMessage: 'Avaliações físicas inválidas no backup.' };
  }

  return {
    valid: true,
    backupVersion: parsed.backupVersion || 1,
    databaseVersion: parsed.databaseVersion || 1,
    createdAt: parsed.createdAt || new Date().toISOString(),
    metadata,
    data: dataPayload,
    isLegacyFormat: isLegacy
  };
}

function buildMetadataFromData(data: BackupDataPayload): BackupMetadata {
  let setsCount = 0;
  if (Array.isArray(data.sessions)) {
    for (const session of data.sessions) {
      if (session && Array.isArray(session.sets)) setsCount += session.sets.length;
    }
  }

  let photosCount = Array.isArray(data.photos) ? data.photos.length : 0;
  if (Array.isArray(data.students)) {
    for (const s of data.students) {
      if (s.photo && s.photo.startsWith('data:')) photosCount++;
    }
  }

  return {
    studentsCount: Array.isArray(data.students) ? data.students.length : 0,
    sessionsCount: Array.isArray(data.sessions) ? data.sessions.length : 0,
    setsCount,
    assessmentsCount: Array.isArray(data.assessments) ? data.assessments.length : 0,
    photosCount,
    routinesCount: Array.isArray(data.routines) ? data.routines.length : 0,
    scheduleCount: Array.isArray(data.schedule) ? data.schedule.length : 0,
    scheduleRecurrencesCount: Array.isArray(data.scheduleRecurrences) ? data.scheduleRecurrences.length : 0,
    activeWorkoutsCount: Array.isArray(data.activeWorkouts) ? data.activeWorkouts.length : 0,
    customExercisesCount: Array.isArray(data.exercises) ? data.exercises.filter(e => e.isCustom).length : 0,
    activePlansCount: Array.isArray(data.activePlans) ? data.activePlans.length : 0,
    planTransfersCount: Array.isArray(data.planTransfers) ? data.planTransfers.length : 0,
    planSuspensionsCount: Array.isArray(data.planSuspensions) ? data.planSuspensions.length : 0,
    planAuditLogsCount: Array.isArray(data.planAuditLogs) ? data.planAuditLogs.length : 0,
    studentAccessCount: Array.isArray(data.studentAccess) ? data.studentAccess.length : 0,
    appUsersCount: Array.isArray(data.appUsers) ? data.appUsers.length : 0,
    trainingMemoriesCount: Array.isArray(data.trainingMemories) ? data.trainingMemories.length : 0,
    appVersion: '5.3',
    checksumSha256: '',
    estimatedSizeBytes: 0
  };
}

/**
 * Restores backup with safe pre-restoration rollback snapshot
 */
export async function restoreFullBackup(dataPayload: BackupDataPayload): Promise<{
  success: boolean;
  message: string;
  restoredCounts: {
    students: number;
    sessions: number;
    assessments: number;
    routines: number;
    proposals?: number;
    proposalTemplates?: number;
    trainingCycles?: number;
    activePlans?: number;
  };
}> {
  // Step 1: Create memory snapshot of current state for rollback protection
  const rollbackSnapshot = {
    students: await getAllFromStore<Student>('students'),
    exercises: await getAllFromStore<Exercise>('exercises'),
    routines: await getAllFromStore<WorkoutRoutine>('routines'),
    sessions: await getAllFromStore<WorkoutSession>('sessions'),
    assessments: await getAllFromStore<PhysicalAssessment>('assessments'),
    schedule: await getAllFromStore<ScheduleAppointment>('schedule'),
    scheduleRecurrences: await getAllFromStore<ScheduleRecurrence>('schedule_recurrences'),
    photos: await getAllFromStore<StudentPhoto>('photos'),
    activeWorkouts: await getAllActiveWorkoutStates(),
    settings: await getAllFromStore<{ key: string; value: unknown }>('settings'),
    functionalTests: await getAllFromStore<FunctionalTest>('functional_tests'),
    functionalAssessments: await getAllFromStore<FunctionalAssessment>('functional_assessments'),
    functionalGoals: await getAllFromStore<FunctionalGoal>('functional_goals'),
    functionalMilestones: await getAllFromStore<FunctionalMilestone>('functional_milestones'),
    functionalBatteries: await getAllFromStore<FunctionalBattery>('functional_batteries'),
    evolutionReports: await getAllFromStore<EvolutionReport>('evolution_reports'),
    workoutTemplates: await getAllFromStore<WorkoutTemplate>('workout_templates'),
    proposals: await getAllFromStore<Proposal>('proposals'),
    proposalTemplates: await getAllFromStore<ProposalTemplate>('proposal_templates'),
    trainingCycles: await getAllFromStore<TrainingCycle>('training_cycles'),
    studentOnboardings: await getAllFromStore<StudentOnboarding>('student_onboardings'),
    activePlans: await getAllFromStore<ActivePlan>('active_plans'),
    planTransfers: await getAllFromStore<PlanTransfer>('plan_transfers'),
    planSuspensions: await getAllFromStore<PlanSuspension>('plan_suspensions'),
    planAuditLogs: await getAllFromStore<PlanAuditLog>('plan_audit_logs'),
    studentAccess: await getAllFromStore<StudentAccess>('student_access'),
    appUsers: await getAllFromStore<AppUser>('app_users'),
    trainingMemories: await getAllFromStore<TrainingMemory>('training_memories')
  };

  try {
    // Step 2: Atomic-like store replacement preserving original IDs
    const {
      students = [],
      exercises = [],
      routines = [],
      sessions = [],
      assessments = [],
      schedule = [],
      scheduleRecurrences = [],
      photos = [],
      activeWorkouts = [],
      settings = [],
      functionalTests = [],
      functionalAssessments = [],
      functionalGoals = [],
      functionalMilestones = [],
      functionalBatteries = [],
      evolutionReports = [],
      workoutTemplates = [],
      proposals = [],
      proposalTemplates = [],
      trainingCycles = [],
      studentOnboardings = [],
      activePlans = [],
      planTransfers = [],
      planSuspensions = [],
      planAuditLogs = [],
      studentAccess = [],
      appUsers = [],
      trainingMemories = []
    } = dataPayload;

    // Clear and restore students
    await clearStore('students');
    for (const item of students) {
      if (item && item.id) await putInStore('students', item);
    }

    // Clear and restore routines
    await clearStore('routines');
    for (const item of routines) {
      if (item && item.id) await putInStore('routines', item);
    }

    // Clear and restore workout templates
    await clearStore('workout_templates');
    for (const item of workoutTemplates) {
      if (item && item.id) await putInStore('workout_templates', item);
    }

    // Clear and restore sessions
    await clearStore('sessions');
    for (const item of sessions) {
      if (item && item.id) await putInStore('sessions', item);
    }

    // Clear and restore assessments
    await clearStore('assessments');
    for (const item of assessments) {
      if (item && item.id) await putInStore('assessments', item);
    }

    // Clear and restore schedule
    await clearStore('schedule');
    for (const item of schedule) {
      if (item && item.id) await putInStore('schedule', item);
    }

    // Clear and restore schedule recurrences
    await clearStore('schedule_recurrences');
    for (const item of scheduleRecurrences) {
      if (item && item.id) await putInStore('schedule_recurrences', item);
    }

    // Clear and restore photos gallery
    await clearStore('photos');
    for (const item of photos) {
      if (item && item.id) await putInStore('photos', item);
    }

    // Clear and restore active workouts
    await clearStore('active_workouts');
    for (const item of activeWorkouts) {
      if (item && (item.sessionId || item.key)) {
        await putInStore('active_workouts', item);
      }
    }

    // Clear and restore settings
    await clearStore('settings');
    for (const item of settings) {
      if (item && item.key) await putInStore('settings', item);
    }

    // Clear and restore functional longevity
    if (functionalTests.length > 0) {
      await clearStore('functional_tests');
      for (const item of functionalTests) {
        if (item && item.id) await putInStore('functional_tests', item);
      }
    }

    await clearStore('functional_assessments');
    for (const item of functionalAssessments) {
      if (item && item.id) await putInStore('functional_assessments', item);
    }

    await clearStore('functional_goals');
    for (const item of functionalGoals) {
      if (item && item.id) await putInStore('functional_goals', item);
    }

    await clearStore('functional_milestones');
    for (const item of functionalMilestones) {
      if (item && item.id) await putInStore('functional_milestones', item);
    }

    if (functionalBatteries.length > 0) {
      await clearStore('functional_batteries');
      for (const item of functionalBatteries) {
        if (item && item.id) await putInStore('functional_batteries', item);
      }
    }

    // Clear and restore evolution reports
    await clearStore('evolution_reports');
    for (const item of evolutionReports) {
      if (item && item.id) await putInStore('evolution_reports', item);
    }

    // Clear and restore proposals
    await clearStore('proposals');
    for (const item of proposals) {
      if (item && item.id) await putInStore('proposals', normalizeProposal(item));
    }

    // Clear and restore proposal templates
    await clearStore('proposal_templates');
    for (const item of proposalTemplates) {
      if (item && item.id) await putInStore('proposal_templates', normalizeProposalTemplate(item));
    }

    // Clear and restore training cycles
    await clearStore('training_cycles');
    for (const item of trainingCycles) {
      if (item && item.id) await putInStore('training_cycles', normalizeTrainingCycle(item));
    }

    // Clear and restore student onboardings
    await clearStore('student_onboardings');
    for (const item of studentOnboardings) {
      if (item && item.id) await putInStore('student_onboardings', normalizeStudentOnboarding(item));
    }

    // Clear and restore active plans
    await clearStore('active_plans');
    for (const item of activePlans) {
      if (item && item.id) await putInStore('active_plans', normalizeActivePlan(item));
    }

    // Clear and restore plan transfers
    await clearStore('plan_transfers');
    for (const item of planTransfers) {
      if (item && item.id) await putInStore('plan_transfers', item);
    }

    // Clear and restore plan suspensions
    await clearStore('plan_suspensions');
    for (const item of planSuspensions) {
      if (item && item.id) await putInStore('plan_suspensions', item);
    }

    // Clear and restore plan audit logs
    await clearStore('plan_audit_logs');
    for (const item of planAuditLogs) {
      if (item && item.id) await putInStore('plan_audit_logs', item);
    }

    // Clear and restore student access
    if (studentAccess.length > 0) {
      await clearStore('student_access');
      for (const item of studentAccess) {
        if (item && item.id) await putInStore('student_access', item);
      }
    }

    // Clear and restore app users
    if (appUsers.length > 0) {
      await clearStore('app_users');
      for (const item of appUsers) {
        if (item && item.id) await putInStore('app_users', item);
      }
    }

    // Clear and restore training memories
    if (trainingMemories.length > 0) {
      await clearStore('training_memories');
      for (const item of trainingMemories) {
        if (item && item.id) await putInStore('training_memories', item);
      }
    }

    // Handle exercises: if backup has exercises, restore them; otherwise seed defaults
    if (exercises.length > 0) {
      await clearStore('exercises');
      for (const item of exercises) {
        if (item && item.id) await putInStore('exercises', item);
      }
    }

    return {
      success: true,
      message: 'Backup restaurado com sucesso!',
      restoredCounts: {
        students: students.length,
        sessions: sessions.length,
        assessments: assessments.length,
        routines: routines.length,
        proposals: proposals.length,
        proposalTemplates: proposalTemplates.length,
        trainingCycles: trainingCycles.length,
        activePlans: activePlans.length
      }
    };
  } catch (err: unknown) {
    console.error('Critical restore error. Initiating atomic rollback...', err);

    // Rollback from snapshot
    try {
      await clearStore('students');
      for (const item of rollbackSnapshot.students) await putInStore('students', item);

      await clearStore('exercises');
      for (const item of rollbackSnapshot.exercises) await putInStore('exercises', item);

      await clearStore('routines');
      for (const item of rollbackSnapshot.routines) await putInStore('routines', item);

      await clearStore('workout_templates');
      for (const item of rollbackSnapshot.workoutTemplates) await putInStore('workout_templates', item);

      await clearStore('proposals');
      for (const item of rollbackSnapshot.proposals) await putInStore('proposals', item);

      await clearStore('proposal_templates');
      for (const item of rollbackSnapshot.proposalTemplates) await putInStore('proposal_templates', item);

      await clearStore('training_cycles');
      for (const item of rollbackSnapshot.trainingCycles) await putInStore('training_cycles', item);

      await clearStore('active_plans');
      for (const item of rollbackSnapshot.activePlans) await putInStore('active_plans', item);

      await clearStore('plan_transfers');
      for (const item of rollbackSnapshot.planTransfers) await putInStore('plan_transfers', item);

      await clearStore('plan_suspensions');
      for (const item of rollbackSnapshot.planSuspensions) await putInStore('plan_suspensions', item);

      await clearStore('plan_audit_logs');
      for (const item of rollbackSnapshot.planAuditLogs) await putInStore('plan_audit_logs', item);

      await clearStore('sessions');
      for (const item of rollbackSnapshot.sessions) await putInStore('sessions', item);

      await clearStore('assessments');
      for (const item of rollbackSnapshot.assessments) await putInStore('assessments', item);

      await clearStore('schedule');
      for (const item of rollbackSnapshot.schedule) await putInStore('schedule', item);

      await clearStore('schedule_recurrences');
      for (const item of rollbackSnapshot.scheduleRecurrences) await putInStore('schedule_recurrences', item);

      await clearStore('photos');
      for (const item of rollbackSnapshot.photos) await putInStore('photos', item);

      await clearStore('active_workouts');
      for (const item of rollbackSnapshot.activeWorkouts) await putInStore('active_workouts', item);

      await clearStore('settings');
      for (const item of rollbackSnapshot.settings) await putInStore('settings', item);

      await clearStore('functional_tests');
      for (const item of rollbackSnapshot.functionalTests) await putInStore('functional_tests', item);

      await clearStore('functional_assessments');
      for (const item of rollbackSnapshot.functionalAssessments) await putInStore('functional_assessments', item);

      await clearStore('functional_goals');
      for (const item of rollbackSnapshot.functionalGoals) await putInStore('functional_goals', item);

      await clearStore('functional_milestones');
      for (const item of rollbackSnapshot.functionalMilestones) await putInStore('functional_milestones', item);

      await clearStore('functional_batteries');
      for (const item of rollbackSnapshot.functionalBatteries) await putInStore('functional_batteries', item);

      await clearStore('evolution_reports');
      for (const item of rollbackSnapshot.evolutionReports) await putInStore('evolution_reports', item);

      await clearStore('student_access');
      for (const item of rollbackSnapshot.studentAccess) await putInStore('student_access', item);

      await clearStore('app_users');
      for (const item of rollbackSnapshot.appUsers) await putInStore('app_users', item);

      await clearStore('training_memories');
      for (const item of rollbackSnapshot.trainingMemories) await putInStore('training_memories', item);
    } catch (rollbackErr) {
      console.error('Rollback failure:', rollbackErr);
    }

    const errorMsg = err instanceof Error ? err.message : 'Falha desconhecida';
    return {
      success: false,
      message: `Não foi possível concluir a restauração. Seus dados anteriores foram preservados. (${errorMsg})`,
      restoredCounts: { students: 0, sessions: 0, assessments: 0, routines: 0 }
    };
  }
}

/**
 * Downloads a Blob as a local file with fallback
 */
export function downloadBackupFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Shares a backup file via Web Share API if supported
 */
export async function shareBackupFile(blob: Blob, filename: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type: 'application/octet-stream' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'TFIVE PRO — Backup Completo',
          text: `Backup completo do TFIVE PRO (${filename})`
        });
        return true;
      }
    } catch (err) {
      // User cancelled share or share failed
      if ((err as Error)?.name !== 'AbortError') {
        console.warn('Web Share API error:', err);
      }
    }
  }
  return false;
}
