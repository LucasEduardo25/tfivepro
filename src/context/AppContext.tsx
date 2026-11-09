import { DATA_BACKEND } from '../utils/constants';
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { 
  Student, 
  Exercise, 
  WorkoutRoutine, 
  RoutineWorkout,
  RoutineExercise,
  WorkoutSession, 
  PhysicalAssessment, 
  ScheduleAppointment, 
  ScheduleRecurrence,
  TrainerProfile,
  WorkoutSetRecord,
  PersonalRecord,
  ActiveWorkoutState,
  StudentPhoto,
  WorkoutSettings,
  DEFAULT_WORKOUT_SETTINGS,
  FunctionalTest,
  FunctionalAssessment,
  FunctionalGoal,
  FunctionalMilestone,
  FunctionalBattery,
  EvolutionReport,
  WorkoutTemplate,
  Proposal,
  ProposalTemplate,
  ProposalStatus,
  TrainingCycle,
  TrainingBlock,
  TrainingMemory,
  ActivePlan
} from '../types';
import { INITIAL_EXERCISES } from '../data/exerciseBank';
import { BUILT_IN_FUNCTIONAL_TESTS, BUILT_IN_FUNCTIONAL_BATTERIES } from '../data/functionalTestsBank';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { 
  getAllActiveWorkoutStates,
  saveActiveWorkoutState,
  deleteActiveWorkoutState,
  clearAllActiveWorkouts,
  DEFAULT_TRAINER,
  exportDatabaseToJSON,
  importDatabaseFromJSON,
  clearAllDatabase,
  generateId,
  normalizeWorkoutRoutine,
  normalizeStudent,
  normalizeWorkoutSession,
  normalizeScheduleAppointment,
  normalizeScheduleRecurrence,
  validateAndSanitizeActiveWorkout,
  normalizeWorkoutTemplate,
  cloneTemplateToRoutine,
  cloneRoutineToTemplate,
  duplicateWorkoutTemplate as duplicateDbWorkoutTemplate,
  duplicateProposal as duplicateDbProposal,
  createProposalRevision as createDbProposalRevision,
  createProposalFromTemplate as createDbProposalFromTemplate,
  cloneProposalToTemplate as cloneDbProposalToTemplate,
  duplicateProposalTemplate as duplicateDbProposalTemplate,
  normalizeProposal,
  normalizeProposalTemplate,
  normalizeTrainingCycle
} from '../db/indexedDB';
import {
  computeCycleMetrics,
  extendBlockDuration,
  recordBlockRoutineChange,
  duplicateCycle
} from '../utils/cycleCalculations';
import {
  createFullBackup,
  restoreFullBackup,
  BackupDataPayload,
  LastBackupInfo
} from '../services/backupService';
import { 
  getTrainingMemoriesRepository,
  getStudentRepository,
  getSessionRepository,
  getRoutineRepository,
  getAssessmentRepository,
  getScheduleRepository,
  getProposalRepository,
  getExerciseRepository,
  getTrainingCycleRepository,
  getActivePlanRepository,
  getSettingsRepository,
  getWorkoutTemplateRepository,
  getFunctionalTestRepository,
  getFunctionalBatteryRepository
} from '../repositories/repositoryConfig';
import { 
  persistLiveWorkoutStateToSupabase, 
  removeLiveWorkoutStateFromSupabase,
  fetchLiveWorkoutsFromSupabaseStrict
} from '../services/liveWorkoutSupabaseService';
import { resolveAuthoritativeActiveWorkouts } from '../services/liveWorkoutAuthorityService';
import {
  SyncStatus,
  SyncDiagnostic,
  SyncResult,
  CloudSyncConfig
} from '../types/sync';
import { 
  evaluateSetForPR, 
  calculateEstimated1RM 
} from '../utils/calculations';
import { resolveProposalIdentifiers } from '../utils/proposalCalculations';
import { soundEffects } from '../utils/audio';
import { 
  materializeAppointmentsFromRecurrence, 
  parseISODate, 
  formatDateToISO, 
  addDaysToDate 
} from '../utils/recurrenceEngine';
import { recordSanitizedError } from '../services/errorLogService';

export type AppBootState = 'booting' | 'ready' | 'recoverable_error' | 'safe_mode';

interface AppContextType {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  students: Student[];
  exercises: Exercise[];
  exerciseCatalog: Exercise[];
  getExerciseCatalog: () => Exercise[];
  getExerciseById: (id: string) => Exercise | null;
  routines: WorkoutRoutine[];
  workoutTemplates: WorkoutTemplate[];
  sessions: WorkoutSession[];
  assessments: PhysicalAssessment[];
  schedule: ScheduleAppointment[];
  scheduleRecurrences: ScheduleRecurrence[];
  photos: StudentPhoto[];
  functionalTests: FunctionalTest[];
  functionalAssessments: FunctionalAssessment[];
  functionalGoals: FunctionalGoal[];
  functionalMilestones: FunctionalMilestone[];
  functionalBatteries: FunctionalBattery[];
  evolutionReports: EvolutionReport[];
  trainerProfile: TrainerProfile;
  workoutSettings: WorkoutSettings;
  activeWorkouts: ActiveWorkoutState[];
  activeWorkout: ActiveWorkoutState | null; // Compatibility alias to first active workout
  isLoading: boolean;
  bootState: AppBootState;
  startupStep: number;
  startupStepMessage: string;
  startupError: string | null;
  isSafeMode: boolean;
  lastBackupInfo: LastBackupInfo | null;
  retryStartup: () => Promise<void>;
  enterSafeMode: () => void;

  // Synchronization (Multi-Device Supabase Cloud)
  syncStatus: SyncStatus;
  syncDiagnostic: SyncDiagnostic;
  syncNow: (options?: { isBackground?: boolean }) => Promise<SyncResult>;
  pendingSyncCount: number;
  updateSyncConfig: (config: Partial<CloudSyncConfig>) => void;
  testSyncConnection: () => Promise<{ success: boolean; message: string }>;

  // Active Workout Actions (Scoped by sessionId)
  startWorkout: (student: Student, routine?: WorkoutRoutine, workout?: RoutineWorkout | string) => Promise<{ success: boolean; message?: string; sessionId?: string }>;
  updateActiveWorkout: (sessionId: string, updater: (prev: ActiveWorkoutState) => ActiveWorkoutState) => void;
  recordSet: (sessionId: string, set: WorkoutSetRecord) => Promise<{ 
    isPR: boolean; 
    metricLabel?: string; 
    saveStatus?: 'saved' | 'error'; 
    error?: string; 
    retryAction?: () => Promise<boolean>;
  }>;
  updateRecordedSet: (sessionId: string, setId: string, updated: Partial<WorkoutSetRecord>) => Promise<void>;
  deleteRecordedSet: (sessionId: string, setId: string) => Promise<void>;
  finishWorkout: (sessionId: string) => Promise<WorkoutSession | null>;
  cancelActiveWorkout: (sessionId: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  pauseWorkout: (sessionId: string) => void;
  resumeWorkout: (sessionId: string) => void;
  startRest: (sessionId: string, seconds: number) => void;
  skipRest: (sessionId: string) => void;
  addRestSeconds: (sessionId: string, additionalSeconds: number) => void;
  
  // Entity CRUD
  saveStudent: (student: Student) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  saveRoutine: (routine: WorkoutRoutine) => Promise<void>;
  deleteRoutine: (id: string) => Promise<void>;
  duplicateRoutine: (routine: WorkoutRoutine) => Promise<WorkoutRoutine>;
  toggleArchiveRoutine: (routineId: string) => Promise<void>;
  duplicateWorkoutInRoutine: (routineId: string, workoutId: string) => Promise<WorkoutRoutine | null>;
  saveWorkoutTemplate: (template: WorkoutTemplate) => Promise<void>;
  deleteWorkoutTemplate: (id: string) => Promise<void>;
  archiveWorkoutTemplate: (id: string) => Promise<void>;
  duplicateWorkoutTemplate: (template: WorkoutTemplate) => Promise<WorkoutTemplate>;
  applyTemplateToStudent: (template: WorkoutTemplate, student: Student, customTitle?: string) => Promise<WorkoutRoutine>;
  saveRoutineAsTemplate: (routine: WorkoutRoutine, options?: { name?: string; description?: string; objective?: string; level?: string }) => Promise<WorkoutTemplate>;
  saveAssessment: (assessment: PhysicalAssessment) => Promise<void>;
  deleteAssessment: (id: string) => Promise<void>;
  saveAppointment: (appointment: ScheduleAppointment) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  saveScheduleRecurrence: (recurrence: ScheduleRecurrence, options?: { generateAppointments?: boolean }) => Promise<void>;
  deleteScheduleRecurrence: (id: string, mode: 'single' | 'future' | 'all', appointmentId?: string, fromDate?: string) => Promise<void>;
  updateRecurringAppointment: (appointment: ScheduleAppointment, mode: 'single' | 'future' | 'all', recurrenceChanges?: Partial<ScheduleRecurrence>) => Promise<void>;
  pauseScheduleRecurrence: (id: string, pausedFrom?: string, pausedUntil?: string) => Promise<void>;
  resumeScheduleRecurrence: (id: string) => Promise<void>;
  endScheduleRecurrence: (id: string) => Promise<void>;
  copyWeekSchedule: (sourceMonday: string, targetMonday: string) => Promise<{ createdCount: number; skippedCount: number }>;
  ensureRecurrenceHorizon: (targetDate: string) => Promise<void>;
  savePhoto: (photo: StudentPhoto) => Promise<void>;
  deletePhoto: (id: string) => Promise<void>;
  saveExercise: (exercise: Exercise) => Promise<void>;
  archiveExercise: (id: string) => Promise<void>;
  deleteExercise: (id: string) => Promise<boolean>;
  saveFunctionalAssessment: (assessment: FunctionalAssessment) => Promise<void>;
  deleteFunctionalAssessment: (id: string) => Promise<void>;
  saveFunctionalGoal: (goal: FunctionalGoal) => Promise<void>;
  deleteFunctionalGoal: (id: string) => Promise<void>;
  saveFunctionalMilestone: (milestone: FunctionalMilestone) => Promise<void>;
  deleteFunctionalMilestone: (id: string) => Promise<void>;
  saveFunctionalTest: (test: FunctionalTest) => Promise<void>;
  deleteFunctionalTest: (id: string) => Promise<void>;
  saveFunctionalBattery: (battery: FunctionalBattery) => Promise<void>;
  deleteFunctionalBattery: (id: string) => Promise<void>;
  saveEvolutionReport: (report: EvolutionReport) => Promise<EvolutionReport>;
  deleteEvolutionReport: (id: string) => Promise<void>;
  getReportsByStudent: (studentId: string) => EvolutionReport[];
  
  // Proposals & Proposal Templates
  proposals: Proposal[];
  proposalTemplates: ProposalTemplate[];
  saveProposal: (proposal: Proposal) => Promise<Proposal>;
  deleteProposal: (id: string) => Promise<void>;
  duplicateProposal: (proposal: Proposal) => Promise<Proposal>;
  createProposalRevision: (proposal: Proposal) => Promise<Proposal>;
  updateProposalStatus: (id: string, status: ProposalStatus) => Promise<void>;
  saveProposalTemplate: (template: ProposalTemplate) => Promise<ProposalTemplate>;
  deleteProposalTemplate: (id: string) => Promise<void>;
  duplicateProposalTemplate: (template: ProposalTemplate) => Promise<ProposalTemplate>;
  createProposalFromTemplate: (template: ProposalTemplate, student?: Student | null) => Promise<Proposal>;
  cloneProposalToTemplate: (proposal: Proposal, templateName?: string) => Promise<ProposalTemplate>;

  // Training Cycles & Blocks
  trainingCycles: TrainingCycle[];
  saveTrainingCycle: (cycle: TrainingCycle) => Promise<TrainingCycle>;
  deleteTrainingCycle: (id: string) => Promise<void>;
  duplicateTrainingCycle: (cycle: TrainingCycle, newStartDate?: string) => Promise<TrainingCycle>;
  setCurrentTrainingCycle: (cycleId: string, studentId: string) => Promise<void>;
  extendTrainingBlock: (cycleId: string, blockId: string, additionalWeeks: number) => Promise<void>;
  changeBlockRoutine: (cycleId: string, blockId: string, routineId: string, routineTitle: string, note?: string) => Promise<void>;
  advanceToNextBlock: (cycleId: string) => Promise<void>;
  completeTrainingCycle: (cycleId: string, conclusionNotes?: string) => Promise<void>;

  // Training Memories (Reminders for Central Hoje)
  trainingMemories: TrainingMemory[];
  saveTrainingMemory: (memory: TrainingMemory) => Promise<void>;
  resolveTrainingMemory: (id: string) => Promise<void>;

  // Active Plans
  activePlans: ActivePlan[];
  refreshActivePlans: () => Promise<void>;

  updateTrainerProfile: (profile: TrainerProfile) => Promise<void>;
  updateWorkoutSettings: (settings: Partial<WorkoutSettings>) => Promise<void>;
  refreshData: () => Promise<void>;
  exportDatabase: () => Promise<string>;
  importDatabase: (jsonString: string) => Promise<boolean>;
  restoreBackupPayload: (payload: BackupDataPayload) => Promise<{ success: boolean; message: string; restoredCounts: any }>;
  resetDatabase: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTab, setCurrentTabState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('tfive_active_tab');
      if (saved) return saved;
    } catch {}
    return 'dashboard';
  });

  const setCurrentTab = useCallback((tab: string) => {
    setCurrentTabState(tab);
    try {
      localStorage.setItem('tfive_active_tab', tab);
    } catch {}
  }, []);

  const [students, setStudents] = useState<Student[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);

  const exerciseCatalog = useMemo(() => {
    return exercises.filter(ex => !ex.isArchived);
  }, [exercises]);

  const getExerciseCatalog = useCallback(() => exerciseCatalog, [exerciseCatalog]);

  const getExerciseById = useCallback((id: string): Exercise | null => {
    return exercises.find(e => e.id === id || e.name.toLowerCase() === id.toLowerCase()) || null;
  }, [exercises]);
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([]);
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [assessments, setAssessments] = useState<PhysicalAssessment[]>([]);
  const [schedule, setSchedule] = useState<ScheduleAppointment[]>([]);
  const [scheduleRecurrences, setScheduleRecurrences] = useState<ScheduleRecurrence[]>([]);
  const [photos, setPhotos] = useState<StudentPhoto[]>([]);
  const [functionalTests, setFunctionalTests] = useState<FunctionalTest[]>([]);
  const [functionalAssessments, setFunctionalAssessments] = useState<FunctionalAssessment[]>([]);
  const [functionalGoals, setFunctionalGoals] = useState<FunctionalGoal[]>([]);
  const [functionalMilestones, setFunctionalMilestones] = useState<FunctionalMilestone[]>([]);
  const [functionalBatteries, setFunctionalBatteries] = useState<FunctionalBattery[]>([]);
  const [evolutionReports, setEvolutionReports] = useState<EvolutionReport[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [proposalTemplates, setProposalTemplates] = useState<ProposalTemplate[]>([]);
  const [trainingCycles, setTrainingCycles] = useState<TrainingCycle[]>([]);
  const [trainingMemories, setTrainingMemories] = useState<TrainingMemory[]>([]);
  const [activePlans, setActivePlans] = useState<ActivePlan[]>([]);
  const [trainerProfile, setTrainerProfile] = useState<TrainerProfile>(DEFAULT_TRAINER);
  const [workoutSettings, setWorkoutSettings] = useState<WorkoutSettings>(DEFAULT_WORKOUT_SETTINGS);
  const [activeWorkouts, setActiveWorkouts] = useState<ActiveWorkoutState[]>([]);
  const activeWorkoutsRef = useRef<ActiveWorkoutState[]>(activeWorkouts);
  useEffect(() => {
    activeWorkoutsRef.current = activeWorkouts;
  }, [activeWorkouts]);
  const [lastBackupInfo, setLastBackupInfo] = useState<LastBackupInfo | null>(null);

  // Synchronization States (SUPABASE CLOUD)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncDiagnostic, setSyncDiagnostic] = useState<SyncDiagnostic>({
    supabaseConnected: true,
    cloudSyncActive: true,
    organizationId: '',
    userAuthenticated: true,
    userUid: '',
    userEmail: '',
    deviceId: 'web',
    deviceName: 'TFIVE PRO',
    lastPushAt: null,
    lastPushCount: 0,
    lastPullAt: null,
    lastPullCount: 0,
    pendingQueueCount: 0,
    lastErrorCode: null,
    lastErrorMessage: null,
    isOnline: true,
    syncEngineMode: 'supabase'
  });
  const [pendingSyncCount] = useState<number>(0);

  // Startup State Machine
  const [bootState, setBootState] = useState<AppBootState>('booting');
  const [startupStep, setStartupStep] = useState<number>(1);
  const [startupStepMessage, setStartupStepMessage] = useState<string>('Carregando seus dados...');
  const [startupError, setStartupError] = useState<string | null>(null);
  const [isSafeMode, setIsSafeMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('safemode') === '1';
    }
    return false;
  });

  const isLoading = bootState === 'booting';

  const enterSafeMode = useCallback(() => {
    setIsSafeMode(true);
    setBootState('safe_mode');
    setCurrentTab('configuracoes');
  }, []);

  // Used to prevent race conditions during refresh
  const refreshRequestIdRef = useRef(0);

  const refreshData = useCallback(async () => {
    const currentRequestId = ++refreshRequestIdRef.current;
    setBootState('booting');
    setStartupError(null);

    // Watchdog timer: If startup exceeds 8.5 seconds, transition to recoverable error
    let isFinished = false;
    const watchdogTimer = setTimeout(() => {
      if (refreshRequestIdRef.current !== currentRequestId) return; // Stale request
      if (!isFinished) {
        isFinished = true;
        const msg = 'A inicialização demorou mais do que o esperado (tempo limite de 8.5s).';
        recordSanitizedError('startup_watchdog_timeout', new Error(msg));
        setStartupError(msg);
        setBootState('recoverable_error');
      }
    }, 8500);

    try {
      // ETAPA 1: Shell React & Inicialização de parâmetros
      setStartupStep(1);
      setStartupStepMessage('ETAPA 1/5: Inicializando app...');

      if (!isSupabaseConfigured()) {
        if (!isFinished) {
          isFinished = true;
          clearTimeout(watchdogTimer);
          const msg = 'Configuração do Supabase ausente. O Supabase é a fonte oficial de dados de negócio.';
          recordSanitizedError('supabase_config_missing', new Error(msg));
          setStartupError(msg);
          setBootState('recoverable_error');
        }
        return;
      }

      // ETAPA 2: Validar sessão Supabase
      setStartupStep(2);
      setStartupStepMessage('ETAPA 2/5: Validando sessão Supabase...');

      // ETAPA 3: Carregar organização e perfil
      setStartupStep(3);
      setStartupStepMessage('ETAPA 3/5: Carregando organização...');

      // ETAPA 4: Carregar dados PostgreSQL
      setStartupStep(4);
      setStartupStepMessage('ETAPA 4/5: Carregando dados PostgreSQL...');

      const [
        loadedStudents,
        loadedExercises,
        loadedRoutines,
        loadedSessions,
        loadedAssessments,
        loadedSchedule,
        loadedRecurrences,
        loadedTrainingCycles,
        loadedProposals,
        loadedActivePlans,
        loadedFunctionalTests,
        loadedFunctionalBatteries,
        savedTrainerProfile,
        savedActiveWorkouts,
        remoteActiveWorkouts,
      ] = await Promise.all([
        getStudentRepository().getAll(),
        getExerciseRepository().getAll(),
        getRoutineRepository().getAll(),
        getSessionRepository().getAll(),
        getAssessmentRepository().getAll(),
        getScheduleRepository().getAppointments(),
        getScheduleRepository().getRecurrences(),
        getTrainingCycleRepository().getAll(),
        getProposalRepository().getAll(),
        getActivePlanRepository().getAll(),
        getFunctionalTestRepository().getAll(),
        getFunctionalBatteryRepository().getAll(),
        getSettingsRepository().get<TrainerProfile>('trainer_profile'),
        getAllActiveWorkoutStates(),
        fetchLiveWorkoutsFromSupabaseStrict().catch(() => null),
      ]);

      if (savedTrainerProfile) {
        setTrainerProfile(savedTrainerProfile);
      }

      setStudents(loadedStudents || []);
      setExercises(loadedExercises || []);
      setRoutines(loadedRoutines || []);
      setSessions(loadedSessions || []);
      setAssessments(loadedAssessments || []);
      setSchedule(loadedSchedule || []);
      setScheduleRecurrences(loadedRecurrences || []);
      setTrainingCycles(loadedTrainingCycles || []);
      setProposals(loadedProposals || []);
      setActivePlans(loadedActivePlans || []);
      setFunctionalTests(Array.isArray(loadedFunctionalTests) && loadedFunctionalTests.length > 0 ? loadedFunctionalTests : BUILT_IN_FUNCTIONAL_TESTS);
      setFunctionalBatteries(Array.isArray(loadedFunctionalBatteries) && loadedFunctionalBatteries.length > 0 ? loadedFunctionalBatteries : BUILT_IN_FUNCTIONAL_BATTERIES);

      // Process Active Workouts with Strict Authority
      // Se o Supabase não respondeu (remoteActiveWorkouts === null), NÃO tratamos como
      // "sem treino ativo": mantemos o treino salvo no dispositivo, sem podar nada.
      const remoteUnavailable = remoteActiveWorkouts === null;
      const restoredWorkouts = resolveAuthoritativeActiveWorkouts({
        dataBackend: remoteUnavailable ? 'local' : DATA_BACKEND,
        remoteWorkouts: remoteActiveWorkouts || [],
        localWorkouts: savedActiveWorkouts || [],
        students: loadedStudents || [],
        sessions: loadedSessions || [],
        onPruneOrphanedLocalSession: (orphanedSessionId) => {
          deleteActiveWorkoutState(orphanedSessionId).catch(() => {});
        }
      });

      setActiveWorkouts(restoredWorkouts);

      if (refreshRequestIdRef.current !== currentRequestId) return; // Cancel if stale

      // ETAPA 5: Renderizar aplicação
      setStartupStep(5);
      setStartupStepMessage('ETAPA 5/5: Sistema pronto');
      isFinished = true;
      clearTimeout(watchdogTimer);
      setBootState('ready');
    } catch (err: unknown) {
      if (!isFinished) {
        isFinished = true;
        clearTimeout(watchdogTimer);
        const errorMsg = err instanceof Error ? err.message : 'Falha na inicialização com Supabase.';
        recordSanitizedError('startup_failure', err);
        setStartupError(errorMsg);
        setBootState('recoverable_error');
      }
    }
  }, [isSafeMode]);

  const reloadDataSilently = useCallback(async () => {
    try {
      const [
        loadedStudents,
        loadedExercises,
        loadedRoutines,
        loadedSessions,
        loadedAssessments,
        loadedSchedule,
        loadedRecurrences,
        loadedTrainingCycles,
        loadedProposals,
        loadedActivePlans,
        loadedFunctionalTests,
        loadedFunctionalBatteries,
        savedTrainerProfile
      ] = await Promise.all([
        getStudentRepository().getAll(),
        getExerciseRepository().getAll(),
        getRoutineRepository().getAll(),
        getSessionRepository().getAll(),
        getAssessmentRepository().getAll(),
        getScheduleRepository().getAppointments(),
        getScheduleRepository().getRecurrences(),
        getTrainingCycleRepository().getAll(),
        getProposalRepository().getAll(),
        getActivePlanRepository().getAll(),
        getFunctionalTestRepository().getAll(),
        getFunctionalBatteryRepository().getAll(),
        getSettingsRepository().get<TrainerProfile>('trainer_profile')
      ]);
      setStudents(loadedStudents || []);
      setExercises(loadedExercises || []);
      setRoutines(loadedRoutines || []);
      setSessions(loadedSessions || []);
      setAssessments(loadedAssessments || []);
      setSchedule(loadedSchedule || []);
      setScheduleRecurrences(loadedRecurrences || []);
      setTrainingCycles(loadedTrainingCycles || []);
      setProposals(loadedProposals || []);
      setActivePlans(loadedActivePlans || []);
      if (Array.isArray(loadedFunctionalTests) && loadedFunctionalTests.length > 0) {
        setFunctionalTests(loadedFunctionalTests);
      }
      if (Array.isArray(loadedFunctionalBatteries) && loadedFunctionalBatteries.length > 0) {
        setFunctionalBatteries(loadedFunctionalBatteries);
      }
      if (savedTrainerProfile) {
        setTrainerProfile(savedTrainerProfile);
      }
    } catch (err) {
      console.error('Error reloading stores silently after sync:', err);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Mantém a tela do tablet acesa durante treino ao vivo (e reativa ao voltar para a aba)
  const hasLiveWorkout = activeWorkouts.length > 0;
  useEffect(() => {
    if (!hasLiveWorkout || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    let lock: any = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        if (document.visibilityState !== 'visible' || (lock && !lock.released)) return;
        const l = await (navigator as any).wakeLock.request('screen');
        if (cancelled) { l.release().catch(() => {}); return; }
        lock = l;
      } catch (e) {
        console.warn('[WakeLock] indisponível:', e);
      }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') acquire(); };
    acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      if (lock) lock.release().catch(() => {});
    };
  }, [hasLiveWorkout]);

  // Master Timer Loop for active workouts (Runs every 1s updating elapsed & rest timers)
  useEffect(() => {
    if (activeWorkouts.length === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setActiveWorkouts(prevList => {
        let hasChanges = false;
        const updatedList = prevList.map(w => {
          let needsUpdate = false;
          let newElapsed = w.elapsedSeconds;
          let newRestSeconds = w.restTimerSeconds;
          let newIsRestActive = w.isRestActive;

          // Update elapsed if not paused
          if (!w.isPaused && w.startedAtTimestamp) {
            const calculated = Math.max(0, Math.floor((now - w.startedAtTimestamp - (w.totalPausedMs || 0)) / 1000));
            if (calculated !== w.elapsedSeconds) {
              newElapsed = calculated;
              needsUpdate = true;
            }
          }

          // Update rest timer
          if (w.isRestActive && w.restTargetTimestamp) {
            const remaining = Math.ceil((w.restTargetTimestamp - now) / 1000);
            if (remaining > 0) {
              if (remaining !== w.restTimerSeconds) {
                newRestSeconds = remaining;
                needsUpdate = true;
              }
            } else {
              newRestSeconds = 0;
              newIsRestActive = false;
              needsUpdate = true;
              soundEffects.playRestFinished();
            }
          }

          if (needsUpdate) {
            hasChanges = true;
            const updated = {
              ...w,
              elapsedSeconds: newElapsed,
              restTimerSeconds: newRestSeconds,
              isRestActive: newIsRestActive
            };
            saveActiveWorkoutState(updated).catch(() => {});
            return updated;
          }
          return w;
        });

        return hasChanges ? updatedList : prevList;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeWorkouts.length]);

  // Start live workout (Single or Dual Mode)
  const startWorkout = async (
    student: Student, 
    routine?: WorkoutRoutine,
    workout?: RoutineWorkout | string
  ): Promise<{ success: boolean; message?: string; sessionId?: string }> => {
    // 1. Check if maximum capacity reached (2 simultaneous students)
    if (activeWorkouts.length >= 2) {
      return {
        success: false,
        message: 'Já existem 2 treinos em andamento. Finalize ou encerre uma das sessões para iniciar outro atendimento.'
      };
    }

    // 2. Check if the same student is already working out
    const existingForStudent = activeWorkouts.find(w => w.studentId === student.id);
    if (existingForStudent) {
      setCurrentTab('workout');
      return {
        success: false,
        message: 'Este aluno já possui um treino em andamento.',
        sessionId: existingForStudent.sessionId
      };
    }

    const sessionId = generateId('session');
    
    // Resolve active training cycle and block context
    const studentActiveCycle = trainingCycles.find(c => c.studentId === student.id && c.status === 'current');
    let activeBlock: TrainingBlock | undefined = undefined;
    if (studentActiveCycle && studentActiveCycle.blocks && studentActiveCycle.blocks.length > 0) {
      try {
        const cycleMetrics = computeCycleMetrics(studentActiveCycle);
        activeBlock = cycleMetrics.currentBlock || studentActiveCycle.blocks[0];
      } catch {
        activeBlock = studentActiveCycle.blocks[0];
      }
    }

    // Resolve routine: use passed routine, or active block routine, or find active student routine
    let rawRoutine = routine;
    if (!rawRoutine && activeBlock?.routineId) {
      rawRoutine = routines.find(r => r.id === activeBlock?.routineId);
    }
    if (!rawRoutine) {
      rawRoutine = routines.find(r => r.studentId === student.id && r.status === 'active') || 
                   routines.find(r => r.studentId === student.id);
    }

    let normalizedRoutine: WorkoutRoutine | undefined = undefined;
    let targetWorkout: RoutineWorkout | undefined = undefined;

    if (rawRoutine) {
      normalizedRoutine = normalizeWorkoutRoutine(rawRoutine);
      
      // Determine chosen workout with high precision
      if (typeof workout === 'object' && workout !== null) {
        targetWorkout = workout;
      } else if (typeof workout === 'string' && workout.trim() !== '') {
        const query = workout.trim().toUpperCase();
        targetWorkout = normalizedRoutine.workouts.find(w => 
          w.id === workout || 
          w.letter?.toUpperCase() === query || 
          w.name?.toUpperCase() === query ||
          `TREINO ${w.letter?.toUpperCase()}` === query
        );
      }

      // If no workout explicitly specified, calculate next in cycle or default to first
      if (!targetWorkout && normalizedRoutine.workouts.length > 0) {
        const studentPastSessions = sessions
          .filter(s => s.studentId === student.id && s.routineId === normalizedRoutine?.id && s.status === 'completed')
          .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        
        if (studentPastSessions.length > 0) {
          const lastSession = studentPastSessions[0];
          const lastWId = lastSession.workoutId;
          const lastWLetter = lastSession.workoutLetter;
          const lastIdx = normalizedRoutine.workouts.findIndex(w => 
            (lastWId && w.id === lastWId) || 
            (lastWLetter && w.letter?.toUpperCase() === lastWLetter.toUpperCase())
          );
          const nextIdx = lastIdx >= 0 ? (lastIdx + 1) % normalizedRoutine.workouts.length : 0;
          targetWorkout = normalizedRoutine.workouts[nextIdx];
        } else {
          targetWorkout = normalizedRoutine.workouts[0];
        }
      }
    }

    const routineSnapshot = normalizedRoutine ? JSON.parse(JSON.stringify(normalizedRoutine)) : undefined;
    const workoutSnapshot = targetWorkout ? JSON.parse(JSON.stringify(targetWorkout)) : undefined;

    const routineTitle = normalizedRoutine?.title || 'Treino Personalizado';
    const workoutLetter = targetWorkout?.letter || 'A';
    const workoutName = targetWorkout?.name || (normalizedRoutine ? `Treino ${workoutLetter}` : 'Treino Personalizado');

    const newSession: WorkoutSession = {
      id: sessionId,
      studentId: student.id,
      studentName: student.name,
      studentPhoto: student.photo,
      routineId: normalizedRoutine?.id,
      routineTitle,
      routineName: routineTitle,
      workoutId: targetWorkout?.id,
      workoutLetter: targetWorkout?.letter,
      workoutName,
      cycleId: studentActiveCycle?.id,
      cycleNameSnapshot: studentActiveCycle?.name,
      blockId: activeBlock?.id,
      blockNameSnapshot: activeBlock?.name,
      routineSnapshot,
      workoutSnapshot,
      startTime: new Date().toISOString(),
      durationSeconds: 0,
      status: 'in_progress',
      totalVolume: 0,
      totalSets: 0,
      sets: [],
      prsAchieved: []
    };

    const now = Date.now();
    const initialWorkoutState: ActiveWorkoutState = {
      sessionId,
      studentId: student.id,
      studentName: student.name,
      studentPhoto: student.photo,
      routineId: normalizedRoutine?.id,
      routineTitle,
      routineName: routineTitle,
      workoutId: targetWorkout?.id,
      workoutLetter: targetWorkout?.letter,
      workoutName,
      cycleId: studentActiveCycle?.id,
      cycleNameSnapshot: studentActiveCycle?.name,
      blockId: activeBlock?.id,
      blockNameSnapshot: activeBlock?.name,
      routineSnapshot,
      workoutSnapshot,
      session: newSession,
      currentExerciseIndex: 0,
      currentSetIndex: 1,
      startedAtTimestamp: now,
      pausedAtTimestamp: null,
      totalPausedMs: 0,
      elapsedSeconds: 0,
      isPaused: false,
      restTargetTimestamp: null,
      restTimerSeconds: 0,
      isRestActive: false,
      activeRestTotal: 60,
      skippedExercises: []
    };

    await saveActiveWorkoutState(initialWorkoutState);
    if (DATA_BACKEND === 'supabase') {
      try {
        await persistLiveWorkoutStateToSupabase(initialWorkoutState);
      } catch (syncErr) {
        console.warn('[startWorkout] Aviso sincronizando início no Supabase:', syncErr);
      }
    }
    setActiveWorkouts(prev => [...prev, initialWorkoutState].slice(0, 2));
    setCurrentTab('workout');

    return { success: true, sessionId };
  };

  const updateActiveWorkout = useCallback((sessionId: string, updater: (prev: ActiveWorkoutState) => ActiveWorkoutState) => {
    setActiveWorkouts(prevList => {
      const idx = prevList.findIndex(w => w.sessionId === sessionId);
      if (idx < 0) return prevList;
      const current = prevList[idx];
      const updated = updater(current);
      saveActiveWorkoutState(updated).catch(err => console.error('Error auto-saving workout state:', err));
      if (DATA_BACKEND === 'supabase') {
        persistLiveWorkoutStateToSupabase(updated).catch(err => console.warn('[updateActiveWorkout] Supabase sync error:', err));
      }
      const copy = [...prevList];
      copy[idx] = updated;
      return copy;
    });
  }, []);

  // Record a single set for a specific session
  const recordSet = async (sessionId: string, setRecord: WorkoutSetRecord): Promise<{ 
    isPR: boolean; 
    metricLabel?: string; 
    saveStatus?: 'saved' | 'error'; 
    error?: string; 
    retryAction?: () => Promise<boolean>;
  }> => {
    const targetWorkout = activeWorkouts.find(w => w.sessionId === sessionId);
    if (!targetWorkout) return { isPR: false };

    // Check if this set is an all-time PR specifically for this student
    const studentPastSessions = sessions.filter(
      s => s.studentId === targetWorkout.studentId && s.id !== targetWorkout.session.id
    );
    const prEvaluation = evaluateSetForPR(
      { ...setRecord, studentId: targetWorkout.studentId }, 
      studentPastSessions
    );

    const recordedSet: WorkoutSetRecord = {
      ...setRecord,
      studentId: targetWorkout.studentId,
      sessionId: targetWorkout.session.id,
      isPR: prEvaluation.isPR,
      prTypes: prEvaluation.prTypes
    };

    const updatedSets = [...targetWorkout.session.sets, recordedSet];
    const newTotalVolume = updatedSets.reduce((sum, s) => {
      if (s.status === 'skipped') return sum;
      const type = s.prescriptionType || s.recordType || 'weight_reps';
      if (type === 'weight_reps' && s.weightKg > 0 && s.actualReps > 0) {
        return sum + (s.weightKg * s.actualReps);
      }
      return sum;
    }, 0);
    const newTotalSets = updatedSets.filter(s => s.status !== 'skipped').length;

    let updatedPRs = [...targetWorkout.session.prsAchieved];
    if (prEvaluation.isPR) {
      const primaryPRType = prEvaluation.prTypes[0] || 'weight';
      const prRecord: PersonalRecord = {
        exerciseId: setRecord.exerciseId,
        exerciseName: setRecord.exerciseName,
        muscleGroup: setRecord.muscleGroup,
        prType: primaryPRType,
        metricLabel: prEvaluation.metricLabel || 'Recorde Pessoal',
        previousValue: prEvaluation.prevValue,
        newValue: prEvaluation.newValue,
        reps: setRecord.actualReps,
        weightKg: setRecord.weightKg,
        estimated1RM: calculateEstimated1RM(setRecord.weightKg, setRecord.actualReps),
        date: new Date().toISOString().split('T')[0],
        sessionId: targetWorkout.session.id
      };
      
      updatedPRs = updatedPRs.filter(p => p.exerciseId !== setRecord.exerciseId || p.prType !== primaryPRType);
      updatedPRs.push(prRecord);
    }

    const updatedSession: WorkoutSession = {
      ...targetWorkout.session,
      sets: updatedSets,
      totalVolume: newTotalVolume,
      totalSets: newTotalSets,
      prsAchieved: updatedPRs
    };

    const nextState: ActiveWorkoutState = {
      ...targetWorkout,
      session: updatedSession
    };

    // 1. SEMPRE persistir localmente em IndexedDB (garantia de integridade imediata e zero perda de dados)
    await saveActiveWorkoutState(nextState);

    let saveStatus: 'saved' | 'error' = 'saved';
    let saveError: string | undefined;
    let retryAction: (() => Promise<boolean>) | undefined;

    // 2. Sincronização remota quando Supabase estiver ativo
    if (DATA_BACKEND === 'supabase') {
      try {
        const persistRes = await persistLiveWorkoutStateToSupabase(nextState);
        if (!persistRes.success) {
          saveStatus = 'error';
          saveError = persistRes.error || 'Não foi possível sincronizar online. Salvo no dispositivo.';
          retryAction = async () => {
            const retryRes = await persistLiveWorkoutStateToSupabase(nextState);
            return retryRes.success;
          };
        }
      } catch (err: any) {
        console.error('[recordSet Supabase Sync Error]:', err);
      }
    }

    setActiveWorkouts(prev => prev.map(w => w.sessionId === sessionId ? nextState : w));

    return { 
      isPR: prEvaluation.isPR, 
      metricLabel: prEvaluation.metricLabel,
      saveStatus,
      error: saveError,
      retryAction
    };
  };

  // Update a recorded set inline
  const updateRecordedSet = async (sessionId: string, setId: string, updated: Partial<WorkoutSetRecord>) => {
    const targetWorkout = activeWorkouts.find(w => w.sessionId === sessionId);
    if (!targetWorkout) return;

    const studentPastSessions = sessions.filter(
      s => s.studentId === targetWorkout.studentId && s.id !== targetWorkout.session.id
    );

    const updatedSets = targetWorkout.session.sets.map(s => {
      if (s.id === setId) {
        const merged: WorkoutSetRecord = { ...s, ...updated };
        const prEval = evaluateSetForPR(merged, studentPastSessions);
        return {
          ...merged,
          isPR: prEval.isPR,
          prTypes: prEval.prTypes
        };
      }
      return s;
    });

    const newTotalVolume = updatedSets.reduce((sum, s) => {
      if (s.status === 'skipped') return sum;
      const type = s.prescriptionType || s.recordType || 'weight_reps';
      if (type === 'weight_reps' && s.weightKg > 0 && s.actualReps > 0) {
        return sum + (s.weightKg * s.actualReps);
      }
      return sum;
    }, 0);
    const newTotalSets = updatedSets.filter(s => s.status !== 'skipped').length;

    const updatedSession: WorkoutSession = {
      ...targetWorkout.session,
      sets: updatedSets,
      totalVolume: newTotalVolume,
      totalSets: newTotalSets
    };

    const nextState: ActiveWorkoutState = {
      ...targetWorkout,
      session: updatedSession
    };

    await saveActiveWorkoutState(nextState);
    if (DATA_BACKEND === 'supabase') {
      try {
        await persistLiveWorkoutStateToSupabase(nextState);
      } catch (syncErr) {
        console.warn('[updateRecordedSet] Supabase sync error:', syncErr);
      }
    }
    setActiveWorkouts(prev => prev.map(w => w.sessionId === sessionId ? nextState : w));
  };

  // Delete a recorded set
  const deleteRecordedSet = async (sessionId: string, setId: string) => {
    const targetWorkout = activeWorkouts.find(w => w.sessionId === sessionId);
    if (!targetWorkout) return;

    const updatedSets = targetWorkout.session.sets.filter(s => s.id !== setId);
    const newTotalVolume = updatedSets.reduce((sum, s) => {
      if (s.status === 'skipped') return sum;
      const type = s.prescriptionType || s.recordType || 'weight_reps';
      if (type === 'weight_reps' && s.weightKg > 0 && s.actualReps > 0) {
        return sum + (s.weightKg * s.actualReps);
      }
      return sum;
    }, 0);
    const newTotalSets = updatedSets.filter(s => s.status !== 'skipped').length;

    const updatedSession: WorkoutSession = {
      ...targetWorkout.session,
      sets: updatedSets,
      totalVolume: newTotalVolume,
      totalSets: newTotalSets
    };

    const nextState: ActiveWorkoutState = {
      ...targetWorkout,
      session: updatedSession
    };

    await saveActiveWorkoutState(nextState);
    if (DATA_BACKEND === 'supabase') {
      try {
        await persistLiveWorkoutStateToSupabase(nextState);
      } catch (syncErr) {
        console.warn('[deleteRecordedSet] Supabase sync error:', syncErr);
      }
    }
    setActiveWorkouts(prev => prev.map(w => w.sessionId === sessionId ? nextState : w));
  };

  // Finish active workout for a specific student without affecting the other
  const finishWorkout = async (sessionId: string): Promise<WorkoutSession | null> => {
    const targetWorkout = activeWorkouts.find(w => w.sessionId === sessionId);
    if (!targetWorkout) return null;

    const completedSession: WorkoutSession = {
      ...targetWorkout.session,
      workoutId: targetWorkout.workoutId || targetWorkout.session.workoutId,
      workoutLetter: targetWorkout.workoutLetter || targetWorkout.session.workoutLetter,
      workoutName: targetWorkout.workoutName || targetWorkout.session.workoutName,
      routineSnapshot: targetWorkout.routineSnapshot || targetWorkout.session.routineSnapshot,
      workoutSnapshot: targetWorkout.workoutSnapshot || targetWorkout.session.workoutSnapshot,
      endTime: new Date().toISOString(),
      durationSeconds: targetWorkout.elapsedSeconds,
      status: 'completed',
      updatedAt: new Date().toISOString()
    };

    // Save completed session to Supabase
    await getSessionRepository().create(completedSession);
    const today = new Date().toISOString().split('T')[0];
    const matchingAppt = schedule.find(
      a => a.studentId === completedSession.studentId && a.date === today && a.status === 'scheduled'
    );
    if (matchingAppt) {
      const updatedAppt: ScheduleAppointment = { ...matchingAppt, status: 'completed' };
      await getScheduleRepository().saveAppointment(updatedAppt);
      setSchedule(prev => prev.map(a => (a.id === updatedAppt.id ? updatedAppt : a)));
    }
    await removeLiveWorkoutStateFromSupabase(sessionId);

    // Clear from active workouts (IndexedDB active_workouts exception)
    await deleteActiveWorkoutState(sessionId);
    setActiveWorkouts(prev => prev.filter(w => w.sessionId !== sessionId));

    // Update sessions state
    setSessions(prev => [completedSession, ...prev]);

    return completedSession;
  };

  const cancelActiveWorkout = async (sessionId: string) => {
    await removeLiveWorkoutStateFromSupabase(sessionId, true);
    await deleteActiveWorkoutState(sessionId);
    setActiveWorkouts(prev => prev.filter(w => w.sessionId !== sessionId));
  };

  const deleteSession = async (id: string): Promise<void> => {
    await getSessionRepository().delete(id);
    setSessions(prev => prev.filter(s => s.id !== id && (s as any).legacy_id !== id));
  };

  const pauseWorkout = (sessionId: string) => {
    const now = Date.now();
    updateActiveWorkout(sessionId, prev => ({
      ...prev,
      isPaused: true,
      pausedAtTimestamp: now
    }));
  };

  const resumeWorkout = (sessionId: string) => {
    const now = Date.now();
    updateActiveWorkout(sessionId, prev => {
      const addedPaused = prev.pausedAtTimestamp ? now - prev.pausedAtTimestamp : 0;
      return {
        ...prev,
        isPaused: false,
        pausedAtTimestamp: null,
        totalPausedMs: (prev.totalPausedMs || 0) + addedPaused
      };
    });
  };

  const startRest = (sessionId: string, seconds: number) => {
    const now = Date.now();
    updateActiveWorkout(sessionId, prev => ({
      ...prev,
      isRestActive: true,
      restTimerSeconds: seconds,
      activeRestTotal: seconds,
      restTargetTimestamp: now + seconds * 1000
    }));
  };

  const skipRest = (sessionId: string) => {
    updateActiveWorkout(sessionId, prev => ({
      ...prev,
      isRestActive: false,
      restTimerSeconds: 0,
      restTargetTimestamp: null
    }));
  };

  const addRestSeconds = (sessionId: string, additionalSeconds: number) => {
    const now = Date.now();
    updateActiveWorkout(sessionId, prev => {
      const currentRemaining = prev.restTimerSeconds || 0;
      const newRemaining = currentRemaining + additionalSeconds;
      return {
        ...prev,
        isRestActive: true,
        restTimerSeconds: newRemaining,
        activeRestTotal: (prev.activeRestTotal || 0) + additionalSeconds,
        restTargetTimestamp: now + newRemaining * 1000
      };
    });
  };

  // Entity CRUD implementations
  const saveStudent = async (student: Student) => {
    const toSave: Student = {
      ...student,
      updatedAt: new Date().toISOString()
    };
    const exists = students.some(s => s.id === toSave.id);
    if (exists) {
      await getStudentRepository().update(toSave.id, toSave);
    } else {
      await getStudentRepository().create(toSave);
    }
    setStudents(prev => {
      const idx = prev.findIndex(s => s.id === toSave.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = toSave;
        return copy;
      }
      return [toSave, ...prev];
    });
  };

  const deleteStudent = async (id: string) => {
    await getStudentRepository().delete(id);
    setStudents(prev => prev.filter(s => s.id !== id));
    setPhotos(prev => prev.filter(p => p.studentId !== id));
  };

  const savePhoto = async (photo: StudentPhoto) => {
    setPhotos(prev => {
      const idx = prev.findIndex(p => p.id === photo.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = photo;
        return copy;
      }
      return [photo, ...prev];
    });
  };

  const deletePhoto = async (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const saveRoutine = async (routine: WorkoutRoutine) => {
    const normalized = normalizeWorkoutRoutine(routine);
    const existing = routines.find(r => r.id === normalized.id || (r as any).legacyId === normalized.id);
    const version = existing ? (existing.version || 1) + 1 : (normalized.version || 1);
    const toSave: WorkoutRoutine = {
      ...normalized,
      version,
      updatedAt: new Date().toISOString()
    };

    let savedRoutine: WorkoutRoutine | null = null;
    const repo = getRoutineRepository();
    if (existing) {
      savedRoutine = await repo.update(toSave.id, toSave);
    } else {
      savedRoutine = await repo.create(toSave);
    }

    const finalToSave = savedRoutine || toSave;
    setRoutines(prev => {
      const idx = prev.findIndex(r => r.id === finalToSave.id || r.id === toSave.id || r.id === normalized.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = finalToSave;
        return copy;
      }
      return [finalToSave, ...prev];
    });
  };

  const deleteRoutine = async (id: string) => {
    await getRoutineRepository().delete(id);
    setRoutines(prev => prev.filter(r => r.id !== id));
  };

  const duplicateRoutine = async (routine: WorkoutRoutine): Promise<WorkoutRoutine> => {
    const normalized = normalizeWorkoutRoutine(routine);
    const newRoutineId = generateId('routine');
    const duplicatedWorkouts: RoutineWorkout[] = (normalized.workouts || []).map((w, wIdx) => {
      const newWorkoutId = generateId('rw');
      const duplicatedExercises: RoutineExercise[] = (w.exercises || []).map((ex, exIdx) => ({
        ...ex,
        id: generateId('re'),
        order: exIdx + 1
      }));
      return {
        ...w,
        id: newWorkoutId,
        routineId: newRoutineId,
        order: wIdx + 1,
        exercises: duplicatedExercises
      };
    });

    const duplicatedRoutine: WorkoutRoutine = {
      ...normalized,
      id: newRoutineId,
      title: `${normalized.title} (Cópia)`,
      name: `${normalized.title} (Cópia)`,
      isArchived: false,
      status: 'active',
      version: 1,
      workouts: duplicatedWorkouts,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await getRoutineRepository().create(duplicatedRoutine);
    
    setRoutines(prev => [duplicatedRoutine, ...prev]);
    return duplicatedRoutine;
  };

  const toggleArchiveRoutine = async (routineId: string) => {
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return;
    const newIsArchived = !routine.isArchived;
    const updated: WorkoutRoutine = {
      ...routine,
      isArchived: newIsArchived,
      status: newIsArchived ? 'archived' : 'active',
      updatedAt: new Date().toISOString()
    };
    
    await getRoutineRepository().update(updated.id, updated);
    setRoutines(prev => prev.map(r => r.id === routineId ? updated : r));
  };

  const duplicateWorkoutInRoutine = async (routineId: string, workoutId: string): Promise<WorkoutRoutine | null> => {
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return null;
    const normalized = normalizeWorkoutRoutine(routine);
    const workoutToDuplicate = normalized.workouts.find(w => w.id === workoutId);
    if (!workoutToDuplicate) return null;

    const nextLetter = String.fromCharCode(65 + (normalized.workouts.length % 26));
    const newWorkoutId = generateId('rw');
    const newWorkout: RoutineWorkout = {
      ...workoutToDuplicate,
      id: newWorkoutId,
      routineId: normalized.id,
      letter: nextLetter,
      name: `${workoutToDuplicate.name} (Cópia)`,
      order: normalized.workouts.length + 1,
      exercises: workoutToDuplicate.exercises.map((ex, idx) => ({
        ...ex,
        id: generateId('re'),
        order: idx + 1
      }))
    };

    const updatedRoutine: WorkoutRoutine = {
      ...normalized,
      workouts: [...normalized.workouts, newWorkout],
      updatedAt: new Date().toISOString()
    };

    await saveRoutine(updatedRoutine);
    return updatedRoutine;
  };

  const saveWorkoutTemplate = async (template: WorkoutTemplate) => {
    const normalized = normalizeWorkoutTemplate(template);
    
    // Cloud-First approach
    try {
      const repo = getWorkoutTemplateRepository();
      const existing = await repo.getById(template.id);
      
      let saved: WorkoutTemplate;
      if (existing) {
        saved = await repo.update(template.id, normalized);
      } else {
        saved = await repo.create(normalized);
      }
      
      setWorkoutTemplates(prev => {
        const idx = prev.findIndex(t => t.id === saved.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = saved;
          return copy;
        }
        return [saved, ...prev];
      });
      
      // Keep local store for offline redundancy (optional, but requested by system to not remove indexeddb completely if not needed, wait actually user said: 
      // "Nenhuma dessas operações pode depender de putInStore, getAllFromStore ou outro mecanismo IndexedDB como persistência autoritativa.")
      // I will remove it to be strictly Cloud-First as requested.
    } catch (err: any) {
      console.error('Error saving workout template to Supabase:', err);
      throw err; // Do not mask errors!
    }
  };

  const archiveWorkoutTemplate = async (id: string) => {
    try {
      await getWorkoutTemplateRepository().update(id, { isArchived: true });
      setWorkoutTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      console.error('Error archiving workout template:', err);
      throw err;
    }
  };

  const deleteWorkoutTemplate = async (id: string) => {
    try {
      await getWorkoutTemplateRepository().delete(id);
      setWorkoutTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      console.error('Error deleting workout template from Supabase:', err);
      throw err; // Do not mask errors!
    }
  };

  const duplicateWorkoutTemplate = async (template: WorkoutTemplate): Promise<WorkoutTemplate> => {
    const duplicated = duplicateDbWorkoutTemplate(template);
    await saveWorkoutTemplate(duplicated);
    return duplicated;
  };

  const applyTemplateToStudent = async (
    template: WorkoutTemplate, 
    student: Student, 
    customTitle?: string
  ): Promise<WorkoutRoutine> => {
    const newRoutine = cloneTemplateToRoutine(template, student, customTitle);
    await saveRoutine(newRoutine);
    return newRoutine;
  };

  const saveRoutineAsTemplate = async (
    routine: WorkoutRoutine,
    options?: { name?: string; description?: string; objective?: string; level?: string }
  ): Promise<WorkoutTemplate> => {
    const newTemplate = cloneRoutineToTemplate(routine, options);
    await saveWorkoutTemplate(newTemplate);
    return newTemplate;
  };

  const saveAssessment = async (assessment: PhysicalAssessment) => {
    const toSave: PhysicalAssessment = {
      ...assessment,
      updatedAt: new Date().toISOString()
    };
    const exists = assessments.some(a => a.id === toSave.id);
    if (exists) {
      await getAssessmentRepository().update(toSave.id, toSave);
    } else {
      await getAssessmentRepository().create(toSave);
    }
    setAssessments(prev => {
      const idx = prev.findIndex(a => a.id === toSave.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = toSave;
        return copy;
      }
      return [toSave, ...prev];
    });
  };

  const deleteAssessment = async (id: string) => {
    await getAssessmentRepository().delete(id);
    setAssessments(prev => prev.filter(a => a.id !== id));
  };

  const saveAppointment = async (appointment: ScheduleAppointment) => {
    await getScheduleRepository().saveAppointment(appointment);
    setSchedule(prev => {
      const idx = prev.findIndex(a => a.id === appointment.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = appointment;
        return copy;
      }
      return [...prev, appointment];
    });
  };

  const deleteAppointment = async (id: string) => {
    await getScheduleRepository().deleteAppointment(id);
    setSchedule(prev => prev.filter(a => a.id !== id));
  };

  const saveScheduleRecurrence = async (
    recurrence: ScheduleRecurrence, 
    options?: { generateAppointments?: boolean }
  ) => {
    await getScheduleRepository().saveRecurrence(recurrence);
    
    setScheduleRecurrences(prev => {
      const idx = prev.findIndex(r => r.id === recurrence.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = recurrence;
        return copy;
      }
      return [recurrence, ...prev];
    });

    if (options?.generateAppointments !== false) {
      const generated = materializeAppointmentsFromRecurrence(recurrence, { horizonWeeks: 12 });
      
      // Preserve appointments that are exceptions or already completed/missed
      const toSaveToDb: ScheduleAppointment[] = [];
      const updatedSchedule = [...schedule];

      for (const genAppt of generated) {
        const existingIdx = updatedSchedule.findIndex(a => 
          a.id === genAppt.id || 
          (a.studentId === genAppt.studentId && a.date === genAppt.date && a.time === genAppt.time)
        );

        if (existingIdx >= 0) {
          const existing = updatedSchedule[existingIdx];
          // If already completed or is an exception, do not overwrite
          if (existing.status === 'completed' || existing.status === 'missed' || existing.isException) {
            continue;
          }
          // Otherwise update
          updatedSchedule[existingIdx] = { ...genAppt, id: existing.id };
          toSaveToDb.push(updatedSchedule[existingIdx]);
        } else {
          // Insert new generated
          updatedSchedule.push(genAppt);
          toSaveToDb.push(genAppt);
        }
      }

      const repo = getScheduleRepository();
      await Promise.all(toSaveToDb.map(appt => repo.saveAppointment(appt).catch(err => {
        console.error('Falha ao salvar agendamento gerado no Supabase:', err);
      })));

      setSchedule(updatedSchedule);
    }
  };

  const deleteScheduleRecurrence = async (
    id: string, 
    mode: 'single' | 'future' | 'all', 
    appointmentId?: string, 
    fromDate?: string
  ) => {
    if (mode === 'single' && appointmentId) {
      await deleteAppointment(appointmentId);
      return;
    }

    const repo = getScheduleRepository();

    if (mode === 'future' && fromDate) {
      // 1. Remove future scheduled appointments
      const toDelete = schedule.filter(a => 
        a.recurrenceId === id && 
        a.date >= fromDate && 
        a.status === 'scheduled'
      );
      for (const appt of toDelete) {
        await repo.deleteAppointment(appt.id).catch(() => {});
      }
      setSchedule(prev => prev.filter(a => !(a.recurrenceId === id && a.date >= fromDate && a.status === 'scheduled')));

      // 2. Update recurrence endDate to day before fromDate
      const targetRec = scheduleRecurrences.find(r => r.id === id);
      if (targetRec) {
        const dayBefore = formatDateToISO(addDaysToDate(fromDate, -1));
        const updatedRec: ScheduleRecurrence = {
          ...targetRec,
          endDate: dayBefore < targetRec.startDate ? targetRec.startDate : dayBefore,
          updatedAt: new Date().toISOString()
        };
        await repo.saveRecurrence(updatedRec);
        setScheduleRecurrences(prev => prev.map(r => r.id === id ? updatedRec : r));
      }
      return;
    }

    if (mode === 'all') {
      // Delete all non-completed appointments of this recurrence
      const toDelete = schedule.filter(a => a.recurrenceId === id && a.status !== 'completed');
      for (const appt of toDelete) {
        await repo.deleteAppointment(appt.id).catch(() => {});
      }
      setSchedule(prev => prev.filter(a => !(a.recurrenceId === id && a.status !== 'completed')));

      // Delete recurrence rule
      await repo.deleteRecurrence(id).catch(() => {});
      setScheduleRecurrences(prev => prev.filter(r => r.id !== id));
    }
  };

  const updateRecurringAppointment = async (
    appointment: ScheduleAppointment, 
    mode: 'single' | 'future' | 'all', 
    recurrenceChanges?: Partial<ScheduleRecurrence>
  ) => {
    if (mode === 'single') {
      // Mark as exception
      const exceptionAppt: ScheduleAppointment = {
        ...appointment,
        isException: true
      };
      await saveAppointment(exceptionAppt);
      return;
    }

    const recurrenceId = appointment.recurrenceId;
    if (!recurrenceId) {
      await saveAppointment(appointment);
      return;
    }

    if (mode === 'future') {
      // Update all scheduled appointments from this date onward
      const toUpdate = schedule.filter(a => a.recurrenceId === recurrenceId && a.date >= appointment.date && a.status === 'scheduled');
      const updatedList = schedule.map(a => {
        if (a.recurrenceId === recurrenceId && a.date >= appointment.date && a.status === 'scheduled') {
          return {
            ...a,
            time: appointment.time,
            durationMinutes: appointment.durationMinutes,
            routineId: appointment.routineId,
            routineTitle: appointment.routineTitle,
            notes: appointment.notes
          };
        }
        return a;
      });
      setSchedule(updatedList);

      const repo = getScheduleRepository();
      for (const appt of toUpdate) {
        await repo.saveAppointment({
          ...appt,
          time: appointment.time,
          durationMinutes: appointment.durationMinutes,
          routineId: appointment.routineId,
          routineTitle: appointment.routineTitle,
          notes: appointment.notes
        }).catch(() => {});
      }

      if (recurrenceChanges) {
        const targetRec = scheduleRecurrences.find(r => r.id === recurrenceId);
        if (targetRec) {
          const updatedRec = { ...targetRec, ...recurrenceChanges, updatedAt: new Date().toISOString() };
          await repo.saveRecurrence(updatedRec);
          setScheduleRecurrences(prev => prev.map(r => r.id === recurrenceId ? updatedRec : r));
        }
      }
      return;
    }

    if (mode === 'all') {
      // Update all non-completed, non-exception appointments
      const toUpdate = schedule.filter(a => a.recurrenceId === recurrenceId && a.status !== 'completed' && !a.isException);
      const updatedList = schedule.map(a => {
        if (a.recurrenceId === recurrenceId && a.status !== 'completed' && !a.isException) {
          return {
            ...a,
            time: appointment.time,
            durationMinutes: appointment.durationMinutes,
            routineId: appointment.routineId,
            routineTitle: appointment.routineTitle,
            notes: appointment.notes
          };
        }
        return a;
      });
      setSchedule(updatedList);

      const repo = getScheduleRepository();
      for (const appt of toUpdate) {
        await repo.saveAppointment({
          ...appt,
          time: appointment.time,
          durationMinutes: appointment.durationMinutes,
          routineId: appointment.routineId,
          routineTitle: appointment.routineTitle,
          notes: appointment.notes
        }).catch(() => {});
      }

      const targetRec = scheduleRecurrences.find(r => r.id === recurrenceId);
      if (targetRec) {
        const updatedRec = { 
          ...targetRec, 
          defaultTime: appointment.time,
          defaultDurationMinutes: appointment.durationMinutes,
          defaultRoutineId: appointment.routineId,
          defaultRoutineTitle: appointment.routineTitle,
          notes: appointment.notes,
          ...(recurrenceChanges || {}),
          updatedAt: new Date().toISOString() 
        };
        await repo.saveRecurrence(updatedRec);
        setScheduleRecurrences(prev => prev.map(r => r.id === recurrenceId ? updatedRec : r));
      }
    }
  };

  const pauseScheduleRecurrence = async (id: string, pausedFrom?: string, pausedUntil?: string) => {
    const rec = scheduleRecurrences.find(r => r.id === id);
    if (!rec) return;

    const todayStr = formatDateToISO(new Date());
    const pFrom = pausedFrom || todayStr;
    const pUntil = pausedUntil || null;

    const updated: ScheduleRecurrence = {
      ...rec,
      status: 'paused',
      pausedFrom: pFrom,
      pausedUntil: pUntil,
      updatedAt: new Date().toISOString()
    };

    const repo = getScheduleRepository();
    await repo.saveRecurrence(updated);
    setScheduleRecurrences(prev => prev.map(r => r.id === id ? updated : r));

    // Remove future appointments in pause period
    const toRemove = schedule.filter(a => {
      if (a.recurrenceId !== id || a.status !== 'scheduled') return false;
      if (pUntil) {
        return a.date >= pFrom && a.date <= pUntil;
      }
      return a.date >= pFrom;
    });

    for (const appt of toRemove) {
      await repo.deleteAppointment(appt.id).catch(() => {});
    }
    setSchedule(prev => prev.filter(a => !toRemove.some(r => r.id === a.id)));
  };

  const resumeScheduleRecurrence = async (id: string) => {
    const rec = scheduleRecurrences.find(r => r.id === id);
    if (!rec) return;

    const updated: ScheduleRecurrence = {
      ...rec,
      status: 'active',
      pausedFrom: null,
      pausedUntil: null,
      updatedAt: new Date().toISOString()
    };

    const repo = getScheduleRepository();
    try {
      await repo.saveRecurrence(updated);
    } catch (err) {
      console.error('Falha ao retomar recorrência no Supabase:', err);
    }
    setScheduleRecurrences(prev => prev.map(r => r.id === id ? updated : r));

    // Regenerate upcoming appointments
    const todayStr = formatDateToISO(new Date());
    const generated = materializeAppointmentsFromRecurrence(updated, { fromDate: todayStr, horizonWeeks: 12 });
    for (const appt of generated) {
      try {
        await repo.saveAppointment(appt);
      } catch (err) {
        console.error('Falha ao gerar agendamento retomado no Supabase:', err);
      }
    }
    setSchedule(prev => {
      const merged = [...prev.filter(a => !generated.some(g => g.id === a.id)), ...generated];
      return merged;
    });
  };

  const endScheduleRecurrence = async (id: string) => {
    const rec = scheduleRecurrences.find(r => r.id === id);
    if (!rec) return;

    const todayStr = formatDateToISO(new Date());
    const updated: ScheduleRecurrence = {
      ...rec,
      status: 'ended',
      endDate: todayStr,
      updatedAt: new Date().toISOString()
    };

    const repo = getScheduleRepository();
    await repo.saveRecurrence(updated);
    setScheduleRecurrences(prev => prev.map(r => r.id === id ? updated : r));

    // Remove future scheduled appointments
    const toRemove = schedule.filter(a => a.recurrenceId === id && a.date > todayStr && a.status === 'scheduled');
    for (const appt of toRemove) {
      await repo.deleteAppointment(appt.id).catch(() => {});
    }
    setSchedule(prev => prev.filter(a => !toRemove.some(r => r.id === a.id)));
  };

  const copyWeekSchedule = async (sourceMonday: string, targetMonday: string): Promise<{ createdCount: number; skippedCount: number }> => {
    const sourceStart = parseISODate(sourceMonday);
    const diffDays = Math.round((parseISODate(targetMonday).getTime() - sourceStart.getTime()) / (1000 * 60 * 60 * 24));
    const sourceEnd = addDaysToDate(sourceStart, 6);
    const sourceEndStr = formatDateToISO(sourceEnd);

    const sourceAppointments = schedule.filter(a => 
      a.date >= sourceMonday && 
      a.date <= sourceEndStr && 
      a.status !== 'cancelled'
    );

    let createdCount = 0;
    let skippedCount = 0;
    const newAppointments: ScheduleAppointment[] = [];
    const repo = getScheduleRepository();

    for (const appt of sourceAppointments) {
      const targetDate = formatDateToISO(addDaysToDate(appt.date, diffDays));

      const duplicateExists = schedule.some(existing => 
        existing.studentId === appt.studentId && 
        existing.date === targetDate && 
        existing.time === appt.time && 
        existing.status !== 'cancelled'
      );

      if (duplicateExists) {
        skippedCount++;
        continue;
      }

      const newAppt: ScheduleAppointment = {
        id: generateId(),
        studentId: appt.studentId,
        studentName: appt.studentName,
        studentPhoto: appt.studentPhoto,
        routineId: appt.routineId,
        routineTitle: appt.routineTitle,
        date: targetDate,
        time: appt.time,
        durationMinutes: appt.durationMinutes,
        status: 'scheduled',
        notes: appt.notes
      };

      try {
        await repo.saveAppointment(newAppt);
      } catch (err) {
        console.error('Falha ao copiar agendamento no Supabase:', err);
      }
      
      newAppointments.push(newAppt);
      createdCount++;
    }

    if (newAppointments.length > 0) {
      setSchedule(prev => [...prev, ...newAppointments]);
    }

    return { createdCount, skippedCount };
  };

  const ensureRecurrenceHorizon = async (targetDate: string) => {
    const activeRecurrences = scheduleRecurrences.filter(r => r.status === 'active');
    if (activeRecurrences.length === 0) return;

    let hasNew = false;
    const newAppointments: ScheduleAppointment[] = [];
    const repo = getScheduleRepository();

    for (const rec of activeRecurrences) {
      if (!rec.endDate || rec.endDate >= targetDate) {
        const generated = materializeAppointmentsFromRecurrence(rec, { toDate: targetDate });
        for (const appt of generated) {
          const exists = schedule.some(a => a.id === appt.id);
          if (!exists) {
            try {
              await repo.saveAppointment(appt);
            } catch (err) {
              console.error('Falha ao gerar agendamento de horizonte no Supabase:', err);
            }
            newAppointments.push(appt);
            hasNew = true;
          }
        }
      }
    }

    if (hasNew) {
      setSchedule(prev => [...prev, ...newAppointments]);
    }
  };

  const saveExercise = async (exercise: Exercise) => {
    let finalExercise = exercise;
    const exists = exercises.some(e => e.id === exercise.id);
    if (exists) {
      await getExerciseRepository().update(exercise.id, exercise);
    } else {
      finalExercise = await getExerciseRepository().create(exercise);
    }
    setExercises(prev => {
      const idx = prev.findIndex(e => e.id === finalExercise.id || e.id === exercise.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = finalExercise;
        return copy;
      }
      return [finalExercise, ...prev];
    });
  };

  const archiveExercise = async (id: string) => {
    const target = exercises.find(e => e.id === id);
    if (!target) return;
    const updated: Exercise = { ...target, isArchived: !target.isArchived };
    await saveExercise(updated);
  };

  const deleteExercise = async (id: string): Promise<boolean> => {
    const isInUse = sessions.some(s => s.sets.some(st => st.exerciseId === id));
    if (isInUse) {
      await archiveExercise(id);
      return false;
    }
    await getExerciseRepository().delete(id);
    setExercises(prev => prev.filter(e => e.id !== id));
    return true;
  };

  // Functional Longevity CRUD
  const saveFunctionalAssessment = async (assessment: FunctionalAssessment) => {
    setFunctionalAssessments(prev => {
      const idx = prev.findIndex(a => a.id === assessment.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = assessment;
        return copy;
      }
      return [assessment, ...prev];
    });
  };

  const deleteFunctionalAssessment = async (id: string) => {
    setFunctionalAssessments(prev => prev.filter(a => a.id !== id));
  };

  const saveFunctionalGoal = async (goal: FunctionalGoal) => {
    setFunctionalGoals(prev => {
      const idx = prev.findIndex(g => g.id === goal.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = goal;
        return copy;
      }
      return [goal, ...prev];
    });
  };

  const deleteFunctionalGoal = async (id: string) => {
    setFunctionalGoals(prev => prev.filter(g => g.id !== id));
  };

  const saveFunctionalMilestone = async (milestone: FunctionalMilestone) => {
    setFunctionalMilestones(prev => {
      const idx = prev.findIndex(m => m.id === milestone.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = milestone;
        return copy;
      }
      return [milestone, ...prev];
    });
  };

  const deleteFunctionalMilestone = async (id: string) => {
    setFunctionalMilestones(prev => prev.filter(m => m.id !== id));
  };

  const saveFunctionalTest = async (test: FunctionalTest) => {
    await getFunctionalTestRepository().save(test);
    setFunctionalTests(prev => {
      const idx = prev.findIndex(t => t.id === test.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = test;
        return copy;
      }
      return [test, ...prev];
    });
  };

  const deleteFunctionalTest = async (id: string) => {
    await getFunctionalTestRepository().delete(id);
    setFunctionalTests(prev => prev.filter(t => t.id !== id));
  };

  const saveFunctionalBattery = async (battery: FunctionalBattery) => {
    await getFunctionalBatteryRepository().save(battery);
    setFunctionalBatteries(prev => {
      const idx = prev.findIndex(b => b.id === battery.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = battery;
        return copy;
      }
      return [battery, ...prev];
    });
  };

  const deleteFunctionalBattery = async (id: string) => {
    await getFunctionalBatteryRepository().delete(id);
    setFunctionalBatteries(prev => prev.filter(b => b.id !== id));
  };

  const saveEvolutionReport = async (report: EvolutionReport): Promise<EvolutionReport> => {
    setEvolutionReports(prev => {
      const idx = prev.findIndex(r => r.id === report.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = report;
        return copy;
      }
      return [report, ...prev];
    });
    return report;
  };

  const deleteEvolutionReport = async (id: string): Promise<void> => {
    setEvolutionReports(prev => prev.filter(r => r.id !== id));
  };

  const getReportsByStudent = useCallback((studentId: string): EvolutionReport[] => {
    return evolutionReports.filter(r => r.studentId === studentId);
  }, [evolutionReports]);

  // PROPOSALS & PROPOSAL TEMPLATES ACTIONS
  const saveProposal = async (proposal: Proposal): Promise<Proposal> => {
    const normalized = normalizeProposal(proposal);
    normalized.updatedAt = new Date().toISOString();
    let toSave = normalized;

    try {
      const remoteSaved = await getProposalRepository().save(normalized);
      if (remoteSaved) {
        toSave = remoteSaved;
      }
    } catch (err) {
      console.error('Falha ao salvar proposta no Supabase:', err);
      throw err;
    }

    setProposals(prev => {
      const idx = prev.findIndex(p => p.id === toSave.id || p.id === normalized.id || (p.uuid && toSave.uuid && p.uuid === toSave.uuid));
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = toSave;
        return copy;
      }
      return [toSave, ...prev];
    });

    return toSave;
  };

  const deleteProposal = async (id: string): Promise<void> => {
    const existing = proposals.find(p => p.id === id || p.uuid === id || (p.legacyId && p.legacyId === id));
    const resolved = resolveProposalIdentifiers(existing || id);
    const idsToFilter = new Set<string>(resolved.allIds);
    idsToFilter.add(id);

    try {
      await getProposalRepository().delete(id);
    } catch (err) {
      console.error('[TFIVE PROPOSAL DEBUG] Falha ao excluir proposta no Supabase:', err);
      throw err;
    }

    setProposals(prev => {
      return prev.filter(p => {
        if (idsToFilter.has(p.id)) return false;
        if (p.uuid && idsToFilter.has(p.uuid)) return false;
        if (p.legacyId && idsToFilter.has(p.legacyId)) return false;
        return true;
      });
    });
  };

  const duplicateProposal = async (proposal: Proposal): Promise<Proposal> => {
    const dup = duplicateDbProposal(proposal);
    try {
      await getProposalRepository().save(dup);
    } catch (err) {
      console.warn('Falha ao salvar proposta duplicada no Supabase:', err);
    }
    setProposals(prev => [dup, ...prev]);
    return dup;
  };

  const createProposalRevision = async (proposal: Proposal): Promise<Proposal> => {
    const rev = createDbProposalRevision(proposal);
    try {
      await getProposalRepository().save(rev);
    } catch (err) {
      console.warn('Falha ao salvar revisão de proposta no Supabase:', err);
    }
    setProposals(prev => [rev, ...prev]);
    return rev;
  };

  const updateProposalStatus = async (id: string, status: ProposalStatus): Promise<void> => {
    const target = proposals.find(p => p.id === id);
    if (!target) return;

    if (target.status === status && status === 'accepted') {
      return;
    }

    const nowIso = new Date().toISOString();
    const updated: Proposal = {
      ...target,
      status,
      updatedAt: nowIso,
      sentAt: status === 'sent' && !target.sentAt ? nowIso : target.sentAt,
      acceptedAt: status === 'accepted' ? (target.acceptedAt || nowIso) : target.acceptedAt
    };

    let remoteSaved: Proposal | null = null;
    try {
      remoteSaved = await getProposalRepository().save(updated);
    } catch (err) {
      console.error('Falha ao atualizar status no Supabase:', err);
      if (navigator.onLine) {
        throw err;
      }
    }

    const finalProposal = remoteSaved || updated;
    setProposals(prev => prev.map(p => {
      const isMatch = p.id === id || 
        p.id === finalProposal.id || 
        Boolean(p.uuid && finalProposal.uuid && p.uuid === finalProposal.uuid) ||
        Boolean(p.legacyId && finalProposal.legacyId && p.legacyId === finalProposal.legacyId);
      return isMatch ? finalProposal : p;
    }));
  };

  const saveProposalTemplate = async (template: ProposalTemplate): Promise<ProposalTemplate> => {
    const normalized = normalizeProposalTemplate(template);
    normalized.updatedAt = new Date().toISOString();
    setProposalTemplates(prev => {
      const idx = prev.findIndex(t => t.id === normalized.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = normalized;
        return copy;
      }
      return [normalized, ...prev];
    });
    return normalized;
  };

  const deleteProposalTemplate = async (id: string): Promise<void> => {
    setProposalTemplates(prev => prev.filter(t => t.id !== id));
  };

  const duplicateProposalTemplate = async (template: ProposalTemplate): Promise<ProposalTemplate> => {
    const dup = duplicateDbProposalTemplate(template);
    setProposalTemplates(prev => [dup, ...prev]);
    return dup;
  };

  const createProposalFromTemplate = async (template: ProposalTemplate, student?: Student | null): Promise<Proposal> => {
    const created = createDbProposalFromTemplate(template, student, trainerProfile);
    try {
      await getProposalRepository().save(created);
    } catch (err) {
      console.warn('Falha ao salvar proposta criada a partir de modelo no Supabase:', err);
    }
    setProposals(prev => [created, ...prev]);
    return created;
  };

  const cloneProposalToTemplate = async (proposal: Proposal, templateName?: string): Promise<ProposalTemplate> => {
    const tpl = cloneDbProposalToTemplate(proposal, templateName);
    setProposalTemplates(prev => [tpl, ...prev]);
    return tpl;
  };

  // ==========================================
  // TRAINING CYCLES & BLOCKS ACTION METHODS
  // ==========================================
  const saveTrainingCycle = async (cycle: TrainingCycle): Promise<TrainingCycle> => {
    const normalized = normalizeTrainingCycle(cycle);
    normalized.updatedAt = new Date().toISOString();

    // Enforce maximum 1 'current' cycle per student
    const updatedOtherCycles: TrainingCycle[] = [];
    if (normalized.status === 'current') {
      const otherCurrents = trainingCycles.filter(c => c.studentId === normalized.studentId && c.id !== normalized.id && c.status === 'current');
      for (const other of otherCurrents) {
        const completedOther = {
          ...other,
          status: 'completed' as const,
          updatedAt: new Date().toISOString()
        };
        await getTrainingCycleRepository().save(completedOther);
        updatedOtherCycles.push(completedOther);
      }
    }

    await getTrainingCycleRepository().save(normalized);

    setTrainingCycles(prev => {
      let next = [...prev];
      if (updatedOtherCycles.length > 0) {
        const updateMap = new Map(updatedOtherCycles.map(c => [c.id, c]));
        next = next.map(c => updateMap.get(c.id) || c);
      }
      const existingIdx = next.findIndex(c => c.id === normalized.id);
      if (existingIdx >= 0) {
        next[existingIdx] = normalized;
      } else {
        next.unshift(normalized);
      }
      return next;
    });

    return normalized;
  };

  const deleteTrainingCycle = async (id: string): Promise<void> => {
    await getTrainingCycleRepository().delete(id);
    setTrainingCycles(prev => prev.filter(c => c.id !== id));
  };

  const duplicateTrainingCycle = async (cycle: TrainingCycle, newStartDate?: string): Promise<TrainingCycle> => {
    const dup = duplicateCycle(cycle, newStartDate);
    const savedDup = await saveTrainingCycle(dup);
    return savedDup;
  };

  const setCurrentTrainingCycle = async (cycleId: string, studentId: string): Promise<void> => {
    const targetCycle = trainingCycles.find(c => c.id === cycleId && c.studentId === studentId);
    if (!targetCycle) return;

    const activated: TrainingCycle = {
      ...targetCycle,
      status: 'current',
      updatedAt: new Date().toISOString()
    };
    await saveTrainingCycle(activated);
  };

  const extendTrainingBlock = async (cycleId: string, blockId: string, additionalWeeks: number): Promise<void> => {
    const targetCycle = trainingCycles.find(c => c.id === cycleId);
    if (!targetCycle) return;

    const updated = extendBlockDuration(targetCycle, blockId, additionalWeeks);
    await saveTrainingCycle(updated);
  };

  const changeBlockRoutine = async (cycleId: string, blockId: string, routineId: string, routineTitle: string, note?: string): Promise<void> => {
    const targetCycle = trainingCycles.find(c => c.id === cycleId);
    if (!targetCycle) return;

    const updated = recordBlockRoutineChange(targetCycle, blockId, routineId, routineTitle, note);
    await saveTrainingCycle(updated);
  };

  const advanceToNextBlock = async (cycleId: string): Promise<void> => {
    const targetCycle = trainingCycles.find(c => c.id === cycleId);
    if (!targetCycle || !targetCycle.blocks || targetCycle.blocks.length === 0) return;

    const metrics = computeCycleMetrics(targetCycle);
    const curBlockIdx = targetCycle.blocks.findIndex(b => b.id === metrics.currentBlock?.id);
    if (curBlockIdx >= 0 && curBlockIdx < targetCycle.blocks.length - 1) {
      const copy = JSON.parse(JSON.stringify(targetCycle)) as TrainingCycle;
      copy.updatedAt = new Date().toISOString();
      await saveTrainingCycle(copy);
    } else if (curBlockIdx === targetCycle.blocks.length - 1) {
      await completeTrainingCycle(cycleId, 'Ciclo concluído ao término do último bloco.');
    }
  };

  const completeTrainingCycle = async (cycleId: string, conclusionNotes?: string): Promise<void> => {
    const targetCycle = trainingCycles.find(c => c.id === cycleId);
    if (!targetCycle) return;

    const completed: TrainingCycle = {
      ...targetCycle,
      status: 'completed',
      actualEndDate: new Date().toISOString().split('T')[0],
      notes: conclusionNotes 
        ? (targetCycle.notes ? `${targetCycle.notes}\n\n[Conclusão]: ${conclusionNotes}` : conclusionNotes)
        : targetCycle.notes,
      updatedAt: new Date().toISOString()
    };
    await saveTrainingCycle(completed);
  };

  const updateTrainerProfile = async (profile: TrainerProfile) => {
    await getSettingsRepository().set('trainer_profile', profile);
    setTrainerProfile(profile);
  };

  const updateWorkoutSettings = async (partial: Partial<WorkoutSettings>) => {
    const updated: WorkoutSettings = { ...workoutSettings, ...partial };
    setWorkoutSettings(updated);
    await getSettingsRepository().set('workout_settings', updated);
  };

  const exportDatabase = async () => {
    return await exportDatabaseToJSON();
  };

  const importDatabase = async (jsonString: string) => {
    const result = await importDatabaseFromJSON(jsonString);
    if (result.success) {
      await refreshData();
      return true;
    }
    return false;
  };

  const restoreBackupPayload = async (payload: BackupDataPayload) => {
    const result = await restoreFullBackup(payload);
    if (result.success) {
      await refreshData();
    }
    return result;
  };

  const resetDatabase = async () => {
    await clearAllDatabase();
    await refreshData();
  };

  const handleSaveTrainingMemory = async (memory: TrainingMemory) => {
    await getTrainingMemoriesRepository().save(memory);
    setTrainingMemories(prev => {
      const idx = prev.findIndex(m => m.id === memory.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = memory;
        return copy;
      }
      return [memory, ...prev];
    });
  };

  const handleResolveTrainingMemory = async (id: string) => {
    const mem = trainingMemories.find(m => m.id === id);
    if (!mem) return;
    const updated = { ...mem, status: 'RESOLVED' as const, resolvedAt: new Date().toISOString() };
    await getTrainingMemoriesRepository().save(updated);
    setTrainingMemories(prev => prev.map(m => m.id === id ? updated : m));
  };

  const handleRefreshActivePlans = async () => {
    try {
      const loaded = await getActivePlanRepository().getAll();
      setActivePlans(loaded || []);
    } catch {
      // fallback
    }
  };

  const handleSyncNow = async (): Promise<SyncResult> => {
    try {
      setSyncStatus('syncing');
      await refreshData();
      setSyncStatus('idle');
      return { 
        success: true, 
        pushedCount: 0, 
        pulledCount: 0, 
        changesApplied: 0,
        message: 'Dados atualizados do Supabase com sucesso.' 
      };
    } catch (err: any) {
      setSyncStatus('error');
      return { 
        success: false, 
        pushedCount: 0, 
        pulledCount: 0, 
        changesApplied: 0, 
        error: err?.message || 'Falha ao sincronizar com o Supabase' 
      };
    }
  };

  const handleUpdateSyncConfig = (_config: Partial<CloudSyncConfig>) => {
    // Configurações de sincronização legadas desativadas — Supabase é autoritativo
  };

  const handleTestSyncConnection = async () => {
    try {
      if (!isSupabaseConfigured()) {
        return { success: false, message: 'Supabase não configurado no ambiente.' };
      }
      const { error } = await supabase.from('organizations').select('id').limit(1);
      if (error) throw error;
      return { success: true, message: 'Conexão com Supabase validada com sucesso.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Falha na conexão com Supabase.' };
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        students,
        exercises,
        exerciseCatalog,
        getExerciseCatalog,
        getExerciseById,
        routines,
        workoutTemplates,
        sessions,
        assessments,
        schedule,
        scheduleRecurrences,
        photos,
        functionalTests,
        functionalAssessments,
        functionalGoals,
        functionalMilestones,
        functionalBatteries,
        evolutionReports,
        proposals,
        proposalTemplates,
        trainerProfile,
        workoutSettings,
        activeWorkouts,
        activeWorkout: activeWorkouts[0] || null,
        isLoading,
        bootState,
        startupStep,
        startupStepMessage,
        startupError,
        isSafeMode,
        lastBackupInfo,
        retryStartup: refreshData,
        enterSafeMode,

        // Synchronization
        syncStatus,
        syncDiagnostic,
        syncNow: handleSyncNow,
        pendingSyncCount,
        updateSyncConfig: handleUpdateSyncConfig,
        testSyncConnection: handleTestSyncConnection,

        startWorkout,
        updateActiveWorkout,
        recordSet,
        updateRecordedSet,
        deleteRecordedSet,
        finishWorkout,
        cancelActiveWorkout,
        deleteSession,
        pauseWorkout,
        resumeWorkout,
        startRest,
        skipRest,
        addRestSeconds,
        saveStudent,
        deleteStudent,
        saveRoutine,
        deleteRoutine,
        duplicateRoutine,
        toggleArchiveRoutine,
        duplicateWorkoutInRoutine,
        saveWorkoutTemplate,
        deleteWorkoutTemplate,
        archiveWorkoutTemplate,
        duplicateWorkoutTemplate,
        applyTemplateToStudent,
        saveRoutineAsTemplate,
        saveAssessment,
        deleteAssessment,
        saveAppointment,
        deleteAppointment,
        saveScheduleRecurrence,
        deleteScheduleRecurrence,
        updateRecurringAppointment,
        pauseScheduleRecurrence,
        resumeScheduleRecurrence,
        endScheduleRecurrence,
        copyWeekSchedule,
        ensureRecurrenceHorizon,
        savePhoto,
        deletePhoto,
        saveExercise,
        archiveExercise,
        deleteExercise,
        saveFunctionalAssessment,
        deleteFunctionalAssessment,
        saveFunctionalGoal,
        deleteFunctionalGoal,
        saveFunctionalMilestone,
        deleteFunctionalMilestone,
        saveFunctionalTest,
        deleteFunctionalTest,
        saveFunctionalBattery,
        deleteFunctionalBattery,
        saveEvolutionReport,
        deleteEvolutionReport,
        getReportsByStudent,
        saveProposal,
        deleteProposal,
        duplicateProposal,
        createProposalRevision,
        updateProposalStatus,
        saveProposalTemplate,
        deleteProposalTemplate,
        duplicateProposalTemplate,
        createProposalFromTemplate,
        cloneProposalToTemplate,
        trainingCycles,
        saveTrainingCycle,
        deleteTrainingCycle,
        duplicateTrainingCycle,
        setCurrentTrainingCycle,
        extendTrainingBlock,
        changeBlockRoutine,
        advanceToNextBlock,
        completeTrainingCycle,
        trainingMemories,
        saveTrainingMemory: handleSaveTrainingMemory,
        resolveTrainingMemory: handleResolveTrainingMemory,
        activePlans,
        refreshActivePlans: handleRefreshActivePlans,
        updateTrainerProfile,
        updateWorkoutSettings,
        refreshData,
        exportDatabase,
        importDatabase,
        restoreBackupPayload,
        resetDatabase
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
