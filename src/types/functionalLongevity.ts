export type FunctionalDomain = 
  | 'strength'      // Força Funcional
  | 'mobility'      // Mobilidade
  | 'balance'       // Equilíbrio
  | 'power'         // Potência
  | 'locomotion'    // Capacidade Locomotora
  | 'endurance'     // Resistência
  | 'autonomy';     // Autonomia & Atividades de Vida Diária

export type AutonomyTaskKey = 
  | 'stand_up'      // LEVANTAR
  | 'walk'          // CAMINHAR
  | 'balance'       // EQUILIBRAR
  | 'carry'         // CARREGAR
  | 'climb'         // SUBIR
  | 'squat'         // AGACHAR
  | 'floor_rise';   // LEVANTAR DO CHÃO

export type ImprovementDirection = 
  | 'higher_is_better'      // Ex: repetições em 30s, distância, carga
  | 'lower_is_better'       // Ex: tempo TUG, tempo 5x sentar/levantar
  | 'categorical_levels';   // Ex: Níveis de levantar do chão

export type FunctionalUnit = 
  | 'reps'
  | 'seconds'
  | 'minutes'
  | 'meters'
  | 'm/s'
  | 'kg'
  | 'levels'
  | 'custom';

export type EvolutionStatus = 
  | 'baseline'      // LINHA DE BASE REGISTRADA (1º registro)
  | 'improving'     // EVOLUINDO / MELHORA DE DESEMPENHO
  | 'stable'        // ESTÁVEL
  | 'declining'     // REDUÇÃO DE DESEMPENHO
  | 'not_assessed'; // AINDA NÃO AVALIADO

export interface CategoricalLevel {
  level: number;
  label: string;
  description?: string;
}

export interface FunctionalTest {
  id: string;
  name: string;
  shortName?: string;
  domain: FunctionalDomain;
  autonomyTask?: AutonomyTaskKey;
  category: string;
  description?: string;
  equipmentNeeded?: string[];
  unit: FunctionalUnit;
  unitLabel: string;
  direction: ImprovementDirection;
  instructions: string[];
  tips?: string[];
  hasMultipleTrials?: boolean;
  hasBilateral?: boolean;
  hasEyesCondition?: boolean;
  hasArmSupportOption?: boolean;
  hasAssistiveDeviceOption?: boolean;
  hasStepHeightOption?: boolean;
  defaultDurationSeconds?: number;
  categoricalLevels?: CategoricalLevel[];
  isBuiltIn: boolean;
  isCustom?: boolean;
  isFavorite?: boolean;
  createdAt?: string;
}

export interface FunctionalTestTrial {
  trialNumber: number;
  valueNumeric?: number;
  valueCategorical?: string;
  side?: 'right' | 'left' | 'bilateral';
  eyes?: 'open' | 'closed';
}

export interface FunctionalTestResult {
  id: string;
  testId: string;
  testName: string;
  domain: FunctionalDomain;
  autonomyTask?: AutonomyTaskKey;
  direction: ImprovementDirection;
  unit: FunctionalUnit;
  unitLabel: string;
  primaryValueNumeric?: number;
  primaryValueCategorical?: string;
  calculatedSpeedMs?: number; // Para velocidade de marcha: distancia / tempo
  trials?: FunctionalTestTrial[];
  rightSideValue?: number;
  leftSideValue?: number;
  eyesCondition?: 'open' | 'closed';
  usedHands?: boolean;
  usedAssistiveDevice?: boolean;
  assistiveDeviceDetails?: string;
  chairHeightCm?: number;
  stepHeightCm?: number;
  distanceMeters?: number;
  loadKg?: number;
  stepsCount?: number;
  isInterrupted?: boolean;
  strategy?: string;
  notes?: string;
  createdAt: string;
}

export interface FunctionalAssessment {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  title?: string;
  batteryId?: string;
  batteryName?: string;
  results: FunctionalTestResult[];
  trainerNotes?: string;
  createdAt: string;
}

export type FunctionalGoalStatus = 'active' | 'achieved' | 'paused' | 'cancelled';

export interface FunctionalGoal {
  id: string;
  studentId: string;
  title: string;
  domain: FunctionalDomain;
  autonomyTask?: AutonomyTaskKey;
  testId?: string;
  testName?: string;
  targetValueNumeric?: number;
  targetValueCategorical?: string;
  initialValueNumeric?: number;
  initialValueCategorical?: string;
  currentValueNumeric?: number;
  currentValueCategorical?: string;
  unitLabel?: string;
  direction?: ImprovementDirection;
  deadlineDate?: string;
  status: FunctionalGoalStatus;
  achievedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FunctionalMilestone {
  id: string;
  studentId: string;
  date: string;
  title: string;
  description: string;
  domain: FunctionalDomain;
  testId?: string;
  goalId?: string;
  createdAt: string;
}

export interface FunctionalBattery {
  id: string;
  title: string;
  description?: string;
  testIds: string[];
  estimatedDurationMinutes?: number;
  isDefault?: boolean;
  createdAt: string;
}

export type FunctionalExerciseTag = 
  | 'Levantar'
  | 'Caminhar'
  | 'Equilíbrio'
  | 'Carregar'
  | 'Subir'
  | 'Agachar'
  | 'Potência'
  | 'Mobilidade'
  | 'Core'
  | 'Força de membros inferiores'
  | 'Levantar do chão';
