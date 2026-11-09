import { FunctionalExerciseTag } from './functionalLongevity';

export * from './functionalLongevity';
export * from './evolutionReport';
export * from './proposal';
export * from './trainingCycle';
export * from './onboarding';

export type MuscleGroup = 
  | 'Peitoral'
  | 'Costas'
  | 'Quadríceps'
  | 'Isquiotibiais'
  | 'Glúteos'
  | 'Ombros'
  | 'Bíceps'
  | 'Tríceps'
  | 'Abdômen / Core'
  | 'Panturrilha'
  | 'Antebraço'
  | 'Funcional & Cardio'
  | 'Mobilidade';

export type PrescriptionType = 
  | 'weight_reps'
  | 'reps'
  | 'duration'
  | 'weight_duration'
  | 'distance'
  | 'duration_distance'
  | 'isometric'
  | 'cardio';

export type ExerciseRecordType = 
  | 'weight_reps'
  | 'bodyweight_reps'
  | 'duration_time'
  | 'distance_cardio'
  | 'isometry_time'
  | PrescriptionType;

export type ExerciseGroupType = 'normal' | 'bi_set' | 'tri_set' | 'circuit';

export interface ExerciseGroup {
  id: string;
  type: ExerciseGroupType;
  name?: string;
  order: number;
  rounds: number;
  restBetweenExercises?: number;
  restAfterRound?: number;
  exercises: RoutineExercise[];
}

export interface Student {
  id: string;
  name: string;
  photo: string;
  phone: string;
  email: string;
  goal: string;
  notes: string; // Nota privada do treinador por padrão (PRIVATE_TRAINER_NOTE)
  studentVisibleNotes?: string; // Nota opcional visível para o aluno
  organizationId?: string; // Vínculo com a organização / Personal
  modality?: 'IN_PERSON' | 'ONLINE_COACHING';
  status: 'active' | 'inactive';
  birthDate?: string;
  gender: 'male' | 'female';
  planName: string;
  priceMonthly: number;
  startDate: string;
  emergencyContact?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  uuid?: string;
  legacyId?: string;
}

export type ExerciseAnimationType = '3d_avatar_loop' | 'vector_biomechanical' | 'video_asset';

export interface ExerciseAnimationMeta {
  animationId: string;
  animationName: string;
  version?: string;
  type?: ExerciseAnimationType;
  assetUrl?: string;
  thumbnailUrl?: string;
  aspectRatio?: string;
  durationSeconds?: number;
  tags?: string[];
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  equipment: string;
  executionSteps: string[];
  tips?: string[];
  recordType?: ExerciseRecordType;
  isCustom?: boolean;
  isArchived?: boolean;
  videoUrl?: string;
  imageUrl?: string;
  defaultRestSeconds: number;
  functionalTags?: FunctionalExerciseTag[];
  // 3D Avatar Biomechanical Animation Metadata (Optional)
  animationId?: string;
  animationUrl?: string;
  animationAsset?: string;
  animationVersion?: string;
  animationType?: ExerciseAnimationType;
}

export interface RoutineExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  order?: number;
  prescriptionType?: PrescriptionType;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetDurationSeconds?: number;
  durationUnit?: 'seconds' | 'minutes';
  targetDistance?: number;
  distanceUnit?: 'meters' | 'km';
  cardioSpeedKmh?: number;
  cardioInclinePct?: number;
  targetRPE?: number | null;
  restSeconds: number;
  notes?: string;
  lastSuggestedLoad?: number;
  recordType?: ExerciseRecordType;
  functionalTags?: FunctionalExerciseTag[];
  // Grouping fields (Bi-set, Tri-set, Circuit)
  groupId?: string;
  groupType?: ExerciseGroupType;
  groupName?: string;
  groupOrder?: number;
  groupRounds?: number;
  restBetweenExercises?: number;
  restAfterRound?: number;
  // Animation link
  animationId?: string;
  // Session-specific execution metadata (Never affects original routine)
  isAddedDuringSession?: boolean;
  replacedFromExerciseId?: string;
  replacedFromExerciseName?: string;
  originalPrescriptionSets?: number;
}

export interface RoutineWorkout {
  id: string;
  routineId: string;
  letter: string; // 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | ...
  name: string;   // e.g. "Peito + Tríceps", "Costas + Bíceps", "Pernas", "Superior"
  description?: string;
  order: number;
  exercises: RoutineExercise[];
  groups?: ExerciseGroup[];
}

export interface WorkoutRoutine {
  id: string;
  studentId: string;
  title: string;
  name?: string; // Alias for title
  objective?: string;
  description?: string;
  notes?: string;
  status?: 'active' | 'archived';
  isArchived?: boolean;
  version?: number;
  workouts: RoutineWorkout[];
  createdAt: string;
  updatedAt: string;
  // Legacy backward compatibility fields
  letter?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'Full Body' | 'Cardio' | string;
  exercises?: RoutineExercise[];
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  title?: string; // Alias for name
  description?: string;
  objective?: string;
  level?: 'iniciante' | 'intermediario' | 'avancado' | 'todos' | string;
  tags?: string[];
  isFavorite?: boolean;
  category?: string;
  workouts: RoutineWorkout[];
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PRType = 'weight' | 'reps' | 'duration' | 'distance' | 'weight_duration' | 'set_volume' | 'exercise_volume' | 'estimated_1rm';

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  prType: PRType;
  metricLabel: string;
  previousValue: number;
  newValue: number;
  reps: number;
  weightKg: number;
  durationSeconds?: number;
  distanceMeters?: number;
  estimated1RM?: number;
  date: string;
  sessionId: string;
}

export interface WorkoutSetRecord {
  id: string;
  sessionId?: string;
  studentId?: string;
  routineId?: string;
  workoutId?: string;
  exerciseId: string;
  exerciseName: string;
  exerciseIndex?: number;
  muscleGroup: MuscleGroup;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  prescriptionType?: PrescriptionType;
  recordType?: ExerciseRecordType;
  setNumber: number;
  targetReps: number;
  actualReps: number;
  weightKg: number;
  targetDurationSeconds?: number;
  actualDurationSeconds?: number;
  durationSeconds?: number; // legacy & alias for actualDurationSeconds
  targetDistance?: number;
  actualDistance?: number;
  distanceMeters?: number; // legacy & alias for actualDistance
  distanceUnit?: 'meters' | 'km';
  cardioSpeedKmh?: number;
  cardioInclinePct?: number;
  speedKmh?: number;
  inclinePct?: number;
  // Grouping execution state
  groupId?: string;
  groupType?: ExerciseGroupType;
  roundNumber?: number;
  groupExerciseOrder?: number;
  rpe?: number | null;
  completedAt: string;
  isPR?: boolean;
  prTypes?: PRType[];
  isWarmup?: boolean;
  isDropSet?: boolean;
  restSecondsUsed?: number;
  notes?: string;
  status?: 'completed' | 'skipped' | 'pending';
}

export interface WorkoutSession {
  id: string;
  studentId: string;
  studentName: string;
  studentPhoto?: string;
  routineId?: string;
  routineTitle: string;
  routineName?: string;
  workoutId?: string;
  workoutLetter?: string;
  workoutName?: string;
  cycleId?: string;
  cycleNameSnapshot?: string;
  blockId?: string;
  blockNameSnapshot?: string;
  routineSnapshot?: WorkoutRoutine;
  workoutSnapshot?: RoutineWorkout;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  status: 'in_progress' | 'completed' | 'cancelled';
  totalVolume: number;
  totalSets: number;
  sets: WorkoutSetRecord[];
  prsAchieved: PersonalRecord[];
  notes?: string;
  coachNotes?: string;
  studentRating?: number;
  updatedAt?: string;
}

export interface ActiveWorkoutState {
  sessionId: string;
  studentId: string;
  organizationId?: string;
  studentName: string;
  studentPhoto?: string;
  routineId?: string;
  routineTitle: string;
  routineName?: string;
  workoutId?: string;
  workoutLetter?: string;
  workoutName?: string;
  cycleId?: string;
  cycleNameSnapshot?: string;
  blockId?: string;
  blockNameSnapshot?: string;
  routineSnapshot?: WorkoutRoutine;
  workoutSnapshot?: RoutineWorkout;
  session: WorkoutSession;
  currentExerciseIndex: number;
  currentSetIndex: number;
  startedAtTimestamp: number;
  pausedAtTimestamp: number | null;
  totalPausedMs: number;
  elapsedSeconds: number;
  isPaused: boolean;
  restTargetTimestamp: number | null;
  restTimerSeconds: number;
  isRestActive: boolean;
  activeRestTotal: number;
  draftLoad?: number;
  draftReps?: number;
  draftRPE?: number | null;
  draftNote?: string;
  skippedExercises?: string[];
  key?: string;
}

export type AssessmentProtocol = 'jackson_pollock_7' | 'jackson_pollock_3' | 'bioimpedance' | 'external_app' | 'other';
export type AssessmentSource = 'manual_tfive' | 'photo_import' | 'manual' | 'external_app';
export type FieldProvenance = 'imported' | 'calculated' | 'manual';

export interface PhysicalAssessment {
  id: string;
  studentId: string;
  date: string;
  weightKg: number;
  heightCm: number;
  age: number;
  gender: 'male' | 'female';
  protocol: AssessmentProtocol;
  source?: AssessmentSource;
  importedAt?: string;
  originalImageUrl?: string;
  originalClassifications?: Record<string, string>;
  provenance?: Record<string, FieldProvenance>;
  formulaUsed?: string;
  bodyDensity?: number;
  sumOfSkinfolds?: number;
  skinfoldMeasurements?: Record<string, number[]>;
  skinfolds?: {
    chest?: number;
    abdominal?: number;
    thigh?: number;
    triceps?: number;
    subscapular?: number;
    suprailiac?: number;
    midaxillary?: number;
  };
  circumferences?: {
    chest?: number;
    waist?: number;
    abdomen?: number;
    hips?: number;
    rightArmRelaxed?: number;
    rightArmContracted?: number;
    leftArmRelaxed?: number;
    leftArmContracted?: number;
    rightForearm?: number;
    leftForearm?: number;
    rightThigh?: number;
    leftThigh?: number;
    rightCalf?: number;
    leftCalf?: number;
    shoulders?: number;
    neck?: number;
  };
  bodyFatPercentage: number;
  fatMassKg: number;
  leanMassKg: number;
  leanMassPercentage?: number;
  waistHipRatio?: number;
  bmi: number;
  photos?: {
    front?: string;
    back?: string;
    rightSide?: string;
    leftSide?: string;
  };
  notes?: string;
  conclusions?: string;
  updatedAt?: string;
}

export type WeekdayNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=DOM, 1=SEG, 2=TER, 3=QUA, 4=QUI, 5=SEX, 6=SÁB

export interface WeekdayScheduleConfig {
  weekday: WeekdayNumber;
  time: string; // "07:00"
  durationMinutes?: number;
  routineId?: string;
  routineTitle?: string;
  workoutId?: string;
  workoutLetter?: string;
  workoutTitle?: string;
}

export type RecurrencePeriodType = 'current_week' | '4_weeks' | '8_weeks' | 'custom_date' | 'indefinite';

export interface ScheduleRecurrence {
  id: string;
  studentId: string;
  studentName: string;
  studentPhoto?: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD or null for indefinite
  periodType: RecurrencePeriodType;
  weekdays: WeekdayNumber[]; // e.g. [1, 3, 5] for SEG, QUA, SEX
  defaultTime: string; // "07:00"
  useDifferentTimes: boolean;
  useDifferentRoutines: boolean;
  weekdayConfigs: WeekdayScheduleConfig[];
  defaultDurationMinutes: number;
  defaultRoutineId?: string;
  defaultRoutineTitle?: string;
  defaultWorkoutId?: string;
  defaultWorkoutLetter?: string;
  defaultWorkoutTitle?: string;
  notes?: string;
  status: 'active' | 'paused' | 'ended';
  pausedFrom?: string | null;
  pausedUntil?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleAppointment {
  id: string;
  studentId: string;
  studentName: string;
  studentPhoto?: string;
  routineId?: string;
  routineTitle?: string;
  workoutId?: string;
  workoutLetter?: string;
  workoutTitle?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMinutes: number;
  type?: 'workout' | 'physical_assessment' | 'functional_assessment';
  status: 'scheduled' | 'completed' | 'missed' | 'cancelled';
  notes?: string;
  recurrenceId?: string;
  isException?: boolean;
}

export interface TrainerProfile {
  name: string;
  title: string;
  cref: string;
  phone: string;
  email: string;
  slogan: string;
}

export type PhotoCategory = 'Frente' | 'Lateral direita' | 'Lateral esquerda' | 'Costas' | 'Outro';

export interface StudentPhoto {
  id: string;
  studentId: string;
  photoUrl: string;
  category: PhotoCategory;
  date: string;
  notes?: string;
  createdAt: string;
}

export type PRNotificationMode = 'discreet' | 'disabled';
export type WorkoutViewLayoutMode = 'fast' | 'detailed';

export interface WorkoutSettings {
  prNotificationMode: PRNotificationMode;
  displayMode?: WorkoutViewLayoutMode;
  focusMode?: boolean;
}

export const DEFAULT_WORKOUT_SETTINGS: WorkoutSettings = {
  prNotificationMode: 'discreet',
  displayMode: 'fast',
  focusMode: false
};

export interface ConsolidatedPR {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  bestWeight: number;
  bestReps: number;
  estimated1RM: number;
  totalVolume: number;
  bestSetVolume: number;
  prTypes: PRType[];
  badges: {
    type: PRType;
    label: string;
    detail?: string;
  }[];
  metricHeadline: string; // e.g. "75 kg × 8"
  previousSummary?: string; // e.g. "Anterior: 70 kg × 10"
}

export interface ExternalStoryData {
  source: 'external' | 'tfive';
  studentName?: string;
  workoutName?: string;
  date?: string;
  duration?: string;
  exerciseCount?: number | string;
  setCount?: number | string;
  volume?: number | string;
  calories?: number | string;
  highlight?: string;
  originApp?: string;
  showOrigin?: boolean;
  notes?: string;
  printImageUri?: string;
  printImage?: string;
}

export type StoryData = ExternalStoryData;

export interface TrainingMemory {
  id: string;
  organizationId: string;
  studentId: string;
  exerciseId?: string;
  exerciseNameSnapshot?: string;
  sourceSessionId?: string;
  text: string;
  status: 'ACTIVE' | 'RESOLVED';
  createdAt: string;
  resolvedAt?: string;
}

export * from './auth';
export * from './proposal';
export * from './activePlan';
