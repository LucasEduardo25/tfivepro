import { 
  Student, 
  Exercise, 
  WorkoutRoutine, 
  RoutineWorkout,
  RoutineExercise,
  PrescriptionType,
  WorkoutSession,
  WorkoutSetRecord,
  PersonalRecord,
  PhysicalAssessment, 
  ScheduleAppointment, 
  ScheduleRecurrence,
  TrainerProfile,
  ActiveWorkoutState,
  StudentPhoto,
  FunctionalTest,
  FunctionalAssessment,
  FunctionalGoal,
  FunctionalMilestone,
  FunctionalBattery,
  EvolutionReport,
  WorkoutTemplate,
  Proposal,
  ProposalTemplate,
  ProposalPlanItem,
  PlanPricing,
  ProposalParticipant,
  ProposalPlanType,
  TrainingCycle,
  TrainingBlock,
  StudentOnboarding,
  OnboardingGlobalConfig,
  AppUser,
  StudentAccess,
  DEFAULT_STUDENT_PERMISSIONS,
  ActivePlan,
  FamilyPlanParticipant,
  PlanTransfer,
  PlanSuspension,
  PlanAuditLog,
  TrainingMemory
} from '../types';
import { INITIAL_EXERCISES } from '../data/exerciseBank';
import { BUILT_IN_FUNCTIONAL_TESTS, BUILT_IN_FUNCTIONAL_BATTERIES } from '../data/functionalTestsBank';
import { recordSanitizedError } from '../services/errorLogService';
import { DATA_BACKEND } from '../utils/constants';
import { getStudentRepository, getExerciseRepository, getRoutineRepository, getSessionRepository, getAssessmentRepository, getScheduleRepository, getTrainingCycleRepository, getProposalRepository, getActivePlanRepository, getFunctionalTestRepository, getFunctionalBatteryRepository } from '../repositories/repositoryConfig';
import { recalculatePlanPricing, createDefaultPlanItem } from '../utils/proposalCalculations';
import { normalizeTrainingCycle } from '../utils/cycleCalculations';
import { createDefaultGlobalConfig, createInitialOnboardingSteps } from '../utils/onboardingDefaults';

export const DB_NAME = 'tfive_pro_v5_db';
export const DB_VERSION = 14;

let dbInstance: IDBDatabase | null = null;
let dbOpenPromise: Promise<IDBDatabase> | null = null;

export const DEFAULT_TRAINER: TrainerProfile = {
  name: '',
  title: '',
  cref: '',
  phone: '',
  email: '',
  slogan: 'Performance sem desculpas. Resultados sem limites.'
};

/**
 * Generates collision-resistant unique IDs using crypto.randomUUID with fallback
 */
export function generateId(prefix: string = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function normalizeWorkoutRoutine(raw: any): WorkoutRoutine {
  if (!raw || typeof raw !== 'object') {
    const routineId = generateId('routine');
    return {
      id: routineId,
      studentId: '',
      title: 'Nova Rotina',
      name: 'Nova Rotina',
      objective: 'Hipertrofia',
      status: 'active',
      isArchived: false,
      version: 1,
      workouts: [
        {
          id: generateId('rw'),
          routineId,
          letter: 'A',
          name: 'Treino A',
          order: 1,
          exercises: []
        }
      ],
      exercises: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  const routineId = raw.id || generateId('routine');
  const title = raw.title || raw.name || 'Rotina de Treino';
  const objective = raw.objective || 'Hipertrofia';
  const description = raw.description || '';
  const notes = raw.notes || '';
  const isArchived = Boolean(raw.isArchived || raw.status === 'archived');
  const status: 'active' | 'archived' = isArchived ? 'archived' : 'active';
  const version = typeof raw.version === 'number' ? raw.version : 1;
  const createdAt = raw.createdAt || new Date().toISOString();
  const updatedAt = raw.updatedAt || new Date().toISOString();

  let workouts: RoutineWorkout[] = [];

  if (Array.isArray(raw.workouts) && raw.workouts.length > 0) {
    workouts = raw.workouts.map((w: any, idx: number) => {
      const wId = w.id || generateId('rw');
      const letter = w.letter || String.fromCharCode(65 + (idx % 26));
      const name = w.name || `Treino ${letter}`;
      const order = typeof w.order === 'number' ? w.order : idx + 1;
      const exercises: RoutineExercise[] = Array.isArray(w?.exercises)
        ? w.exercises.map((ex: any, exIdx: number) => {
            const rawRecType = ex.prescriptionType || ex.recordType || 'weight_reps';
            let prescriptionType: PrescriptionType = 'weight_reps';
            if (rawRecType === 'isometry_time' || rawRecType === 'isometric') prescriptionType = 'isometric';
            else if (rawRecType === 'duration_time' || rawRecType === 'duration') prescriptionType = 'duration';
            else if (rawRecType === 'distance_cardio' || rawRecType === 'distance') prescriptionType = 'distance';
            else if (rawRecType === 'duration_distance') prescriptionType = 'duration_distance';
            else if (rawRecType === 'weight_duration') prescriptionType = 'weight_duration';
            else if (rawRecType === 'bodyweight_reps' || rawRecType === 'reps') prescriptionType = 'reps';
            else if (rawRecType === 'cardio') prescriptionType = 'cardio';
            else prescriptionType = 'weight_reps';

            return {
              id: ex.id || generateId('re'),
              exerciseId: ex.exerciseId || '',
              exerciseName: ex.exerciseName || 'Exercício',
              muscleGroup: ex.muscleGroup || 'Peito',
              order: typeof ex.order === 'number' ? ex.order : exIdx + 1,
              prescriptionType,
              targetSets: typeof ex.targetSets === 'number' ? ex.targetSets : 3,
              targetRepsMin: typeof ex.targetRepsMin === 'number' ? ex.targetRepsMin : (typeof ex.targetReps === 'number' ? ex.targetReps : 10),
              targetRepsMax: typeof ex.targetRepsMax === 'number' ? ex.targetRepsMax : (typeof ex.targetReps === 'number' ? ex.targetReps : 12),
              targetDurationSeconds: typeof ex.targetDurationSeconds === 'number' ? ex.targetDurationSeconds : (typeof ex.durationSeconds === 'number' ? ex.durationSeconds : undefined),
              durationUnit: ex.durationUnit || (ex.targetDurationSeconds && ex.targetDurationSeconds >= 60 && ex.targetDurationSeconds % 60 === 0 ? 'minutes' : 'seconds'),
              targetDistance: typeof ex.targetDistance === 'number' ? ex.targetDistance : (typeof ex.distanceMeters === 'number' ? ex.distanceMeters : undefined),
              distanceUnit: ex.distanceUnit || 'meters',
              cardioSpeedKmh: ex.cardioSpeedKmh,
              cardioInclinePct: ex.cardioInclinePct,
              targetRPE: ex.targetRPE ?? null,
              restSeconds: typeof ex.restSeconds === 'number' ? ex.restSeconds : 60,
              notes: ex.notes || '',
              lastSuggestedLoad: ex.lastSuggestedLoad,
              recordType: prescriptionType,
              functionalTags: ex.functionalTags,
              groupId: ex.groupId,
              groupType: ex.groupType,
              groupName: ex.groupName,
              groupOrder: ex.groupOrder,
              groupRounds: ex.groupRounds,
              restBetweenExercises: ex.restBetweenExercises,
              restAfterRound: ex.restAfterRound
            };
          })
        : [];
      return {
        id: wId,
        routineId,
        letter,
        name,
        description: w.description || '',
        order,
        exercises,
        groups: Array.isArray(w.groups) ? w.groups : undefined
      };
    });
  } else if (Array.isArray(raw.exercises) && raw.exercises.length > 0) {
    const letter = raw.letter || 'A';
    const exercises: RoutineExercise[] = raw.exercises.map((ex: any, exIdx: number) => {
      const rawRecType = ex.prescriptionType || ex.recordType || 'weight_reps';
      let prescriptionType: PrescriptionType = 'weight_reps';
      if (rawRecType === 'isometry_time' || rawRecType === 'isometric') prescriptionType = 'isometric';
      else if (rawRecType === 'duration_time' || rawRecType === 'duration') prescriptionType = 'duration';
      else if (rawRecType === 'distance_cardio' || rawRecType === 'distance') prescriptionType = 'distance';
      else if (rawRecType === 'duration_distance') prescriptionType = 'duration_distance';
      else if (rawRecType === 'weight_duration') prescriptionType = 'weight_duration';
      else if (rawRecType === 'bodyweight_reps' || rawRecType === 'reps') prescriptionType = 'reps';
      else if (rawRecType === 'cardio') prescriptionType = 'cardio';
      else prescriptionType = 'weight_reps';

      return {
        id: ex.id || generateId('re'),
        exerciseId: ex.exerciseId || '',
        exerciseName: ex.exerciseName || 'Exercício',
        muscleGroup: ex.muscleGroup || 'Peito',
        order: typeof ex.order === 'number' ? ex.order : exIdx + 1,
        prescriptionType,
        targetSets: typeof ex.targetSets === 'number' ? ex.targetSets : 3,
        targetRepsMin: typeof ex.targetRepsMin === 'number' ? ex.targetRepsMin : 10,
        targetRepsMax: typeof ex.targetRepsMax === 'number' ? ex.targetRepsMax : 12,
        targetDurationSeconds: typeof ex.targetDurationSeconds === 'number' ? ex.targetDurationSeconds : (typeof ex.durationSeconds === 'number' ? ex.durationSeconds : undefined),
        durationUnit: ex.durationUnit || 'seconds',
        targetDistance: typeof ex.targetDistance === 'number' ? ex.targetDistance : (typeof ex.distanceMeters === 'number' ? ex.distanceMeters : undefined),
        distanceUnit: ex.distanceUnit || 'meters',
        cardioSpeedKmh: ex.cardioSpeedKmh,
        cardioInclinePct: ex.cardioInclinePct,
        targetRPE: ex.targetRPE ?? null,
        restSeconds: typeof ex.restSeconds === 'number' ? ex.restSeconds : 60,
        notes: ex.notes || '',
        lastSuggestedLoad: ex.lastSuggestedLoad,
        recordType: prescriptionType,
        functionalTags: ex.functionalTags,
        groupId: ex.groupId,
        groupType: ex.groupType,
        groupName: ex.groupName,
        groupOrder: ex.groupOrder,
        groupRounds: ex.groupRounds,
        restBetweenExercises: ex.restBetweenExercises,
        restAfterRound: ex.restAfterRound
      };
    });

    workouts = [
      {
        id: generateId('rw'),
        routineId,
        letter,
        name: raw.title ? `${raw.title}` : `Treino ${letter}`,
        description: '',
        order: 1,
        exercises
      }
    ];
  } else {
    workouts = [
      {
        id: generateId('rw'),
        routineId,
        letter: 'A',
        name: 'Treino A',
        description: '',
        order: 1,
        exercises: []
      }
    ];
  }

  // Ensure legacy raw.exercises is populated for backwards compatibility with any component accessing routine.exercises
  const legacyExercises = workouts[0]?.exercises || [];

  return {
    id: routineId,
    studentId: raw.studentId || '',
    title,
    name: title,
    objective,
    description,
    notes,
    status,
    isArchived,
    version,
    workouts,
    createdAt,
    updatedAt,
    letter: raw.letter || workouts[0]?.letter || 'A',
    exercises: legacyExercises
  };
}

export function normalizeWorkoutTemplate(raw: any): WorkoutTemplate {
  if (!raw || typeof raw !== 'object') {
    const templateId = generateId('tmpl');
    return {
      id: templateId,
      name: 'Novo Modelo',
      title: 'Novo Modelo',
      objective: 'Hipertrofia Muscular',
      description: '',
      level: 'todos',
      tags: [],
      isFavorite: false,
      category: '',
      workouts: [
        {
          id: generateId('rw'),
          routineId: templateId,
          letter: 'A',
          name: 'Treino A',
          description: '',
          order: 1,
          exercises: []
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  const templateId = raw.id || generateId('tmpl');
  const name = raw.name || raw.title || 'Modelo de Treino';
  const objective = raw.objective || '';
  const description = raw.description || '';
  const level = raw.level || 'todos';
  const tags = Array.isArray(raw.tags) ? raw.tags : [];
  const isFavorite = Boolean(raw.isFavorite);
  const category = raw.category || '';
  const createdAt = raw.createdAt || new Date().toISOString();
  const updatedAt = raw.updatedAt || new Date().toISOString();

  let workouts: RoutineWorkout[] = [];

  if (Array.isArray(raw.workouts) && raw.workouts.length > 0) {
    workouts = raw.workouts.map((w: any, idx: number) => {
      const wId = w.id || generateId('rw');
      const letter = w.letter || String.fromCharCode(65 + (idx % 26));
      const wName = w.name || `Treino ${letter}`;
      const order = typeof w.order === 'number' ? w.order : idx + 1;
      const exercises: RoutineExercise[] = Array.isArray(w?.exercises)
        ? w.exercises.map((ex: any, exIdx: number) => {
            const rawRecType = ex.prescriptionType || ex.recordType || 'weight_reps';
            let prescriptionType: PrescriptionType = 'weight_reps';
            if (rawRecType === 'isometry_time' || rawRecType === 'isometric') prescriptionType = 'isometric';
            else if (rawRecType === 'duration_time' || rawRecType === 'duration') prescriptionType = 'duration';
            else if (rawRecType === 'distance_cardio' || rawRecType === 'distance') prescriptionType = 'distance';
            else if (rawRecType === 'duration_distance') prescriptionType = 'duration_distance';
            else if (rawRecType === 'weight_duration') prescriptionType = 'weight_duration';
            else if (rawRecType === 'bodyweight_reps' || rawRecType === 'reps') prescriptionType = 'reps';
            else if (rawRecType === 'cardio') prescriptionType = 'cardio';
            else prescriptionType = 'weight_reps';

            return {
              id: ex.id || generateId('re'),
              exerciseId: ex.exerciseId || '',
              exerciseName: ex.exerciseName || 'Exercício',
              muscleGroup: ex.muscleGroup || 'Peito',
              order: typeof ex.order === 'number' ? ex.order : exIdx + 1,
              prescriptionType,
              targetSets: typeof ex.targetSets === 'number' ? ex.targetSets : 3,
              targetRepsMin: typeof ex.targetRepsMin === 'number' ? ex.targetRepsMin : (typeof ex.targetReps === 'number' ? ex.targetReps : 10),
              targetRepsMax: typeof ex.targetRepsMax === 'number' ? ex.targetRepsMax : (typeof ex.targetReps === 'number' ? ex.targetReps : 12),
              targetDurationSeconds: typeof ex.targetDurationSeconds === 'number' ? ex.targetDurationSeconds : (typeof ex.durationSeconds === 'number' ? ex.durationSeconds : undefined),
              durationUnit: ex.durationUnit || 'seconds',
              targetDistance: typeof ex.targetDistance === 'number' ? ex.targetDistance : (typeof ex.distanceMeters === 'number' ? ex.distanceMeters : undefined),
              distanceUnit: ex.distanceUnit || 'meters',
              cardioSpeedKmh: ex.cardioSpeedKmh,
              cardioInclinePct: ex.cardioInclinePct,
              targetRPE: ex.targetRPE ?? null,
              restSeconds: typeof ex.restSeconds === 'number' ? ex.restSeconds : 60,
              notes: ex.notes || '',
              lastSuggestedLoad: ex.lastSuggestedLoad,
              recordType: prescriptionType,
              functionalTags: ex.functionalTags,
              groupId: ex.groupId,
              groupType: ex.groupType,
              groupName: ex.groupName,
              groupOrder: ex.groupOrder,
              groupRounds: ex.groupRounds,
              restBetweenExercises: ex.restBetweenExercises,
              restAfterRound: ex.restAfterRound
            };
          })
        : [];
      return {
        id: wId,
        routineId: templateId,
        letter,
        name: wName,
        description: w.description || '',
        order,
        exercises,
        groups: Array.isArray(w.groups) ? w.groups : undefined
      };
    });
  } else {
    workouts = [
      {
        id: generateId('rw'),
        routineId: templateId,
        letter: 'A',
        name: 'Treino A',
        description: '',
        order: 1,
        exercises: []
      }
    ];
  }

  return {
    id: templateId,
    name,
    title: name,
    description,
    objective,
    level,
    tags,
    isFavorite,
    category,
    workouts,
    createdAt,
    updatedAt
  };
}

/**
 * Creates a completely independent deep copy of a WorkoutTemplate applied to a student routine.
 * Generates fresh unique IDs for routine, workouts, and exercises.
 */
export function cloneTemplateToRoutine(
  template: WorkoutTemplate, 
  student: Student, 
  customTitle?: string
): WorkoutRoutine {
  const newRoutineId = generateId('routine');
  const nowIso = new Date().toISOString();

  const clonedWorkouts: RoutineWorkout[] = template.workouts.map((w, wIdx) => {
    const newWorkoutId = generateId('rw');
    const groupMapping = new Map<string, string>();

    const clonedExercises: RoutineExercise[] = w.exercises.map((ex, exIdx) => {
      let mappedGroupId = ex.groupId;
      if (ex.groupId) {
        if (!groupMapping.has(ex.groupId)) {
          groupMapping.set(ex.groupId, generateId('grp'));
        }
        mappedGroupId = groupMapping.get(ex.groupId);
      }

      return {
        ...ex,
        id: generateId('re'),
        order: ex.order ?? (exIdx + 1),
        groupId: mappedGroupId
      };
    });

    return {
      id: newWorkoutId,
      routineId: newRoutineId,
      letter: w.letter || String.fromCharCode(65 + (wIdx % 26)),
      name: w.name || `Treino ${w.letter || 'A'}`,
      description: w.description || '',
      order: w.order ?? (wIdx + 1),
      exercises: clonedExercises,
      groups: w.groups ? JSON.parse(JSON.stringify(w.groups)) : undefined
    };
  });

  const finalTitle = customTitle?.trim() || template.name || 'Rotina de Treinamento';

  return {
    id: newRoutineId,
    studentId: student.id,
    title: finalTitle,
    name: finalTitle,
    objective: template.objective || student.goal || 'Hipertrofia Muscular',
    description: template.description || '',
    notes: template.description || '',
    status: 'active',
    isArchived: false,
    version: 1,
    workouts: clonedWorkouts,
    createdAt: nowIso,
    updatedAt: nowIso,
    letter: clonedWorkouts[0]?.letter || 'A',
    exercises: clonedWorkouts[0]?.exercises || []
  };
}

/**
 * Creates a completely independent deep copy of a student's WorkoutRoutine as a WorkoutTemplate.
 * Generates fresh unique IDs so modifying the template later will NEVER affect the routine.
 */
export function cloneRoutineToTemplate(
  routine: WorkoutRoutine,
  options?: { name?: string; description?: string; objective?: string; level?: string }
): WorkoutTemplate {
  const newTemplateId = generateId('tmpl');
  const nowIso = new Date().toISOString();

  const clonedWorkouts: RoutineWorkout[] = routine.workouts.map((w, wIdx) => {
    const newWorkoutId = generateId('rw');
    const groupMapping = new Map<string, string>();

    const clonedExercises: RoutineExercise[] = w.exercises.map((ex, exIdx) => {
      let mappedGroupId = ex.groupId;
      if (ex.groupId) {
        if (!groupMapping.has(ex.groupId)) {
          groupMapping.set(ex.groupId, generateId('grp'));
        }
        mappedGroupId = groupMapping.get(ex.groupId);
      }

      return {
        ...ex,
        id: generateId('re'),
        order: ex.order ?? (exIdx + 1),
        groupId: mappedGroupId
      };
    });

    return {
      id: newWorkoutId,
      routineId: newTemplateId,
      letter: w.letter || String.fromCharCode(65 + (wIdx % 26)),
      name: w.name || `Treino ${w.letter || 'A'}`,
      description: w.description || '',
      order: w.order ?? (wIdx + 1),
      exercises: clonedExercises,
      groups: w.groups ? JSON.parse(JSON.stringify(w.groups)) : undefined
    };
  });

  const templateName = options?.name?.trim() || routine.title || 'Modelo de Treino';
  const templateObjective = options?.objective?.trim() || routine.objective || 'Hipertrofia Muscular';
  const templateDescription = options?.description !== undefined ? options.description : (routine.notes || routine.description || '');
  const templateLevel = options?.level || 'todos';

  return {
    id: newTemplateId,
    name: templateName,
    title: templateName,
    objective: templateObjective,
    description: templateDescription,
    level: templateLevel,
    tags: [],
    isFavorite: false,
    category: '',
    workouts: clonedWorkouts,
    createdAt: nowIso,
    updatedAt: nowIso
  };
}

/**
 * Duplicates a WorkoutTemplate with a new ID and "[Nome] — CÓPIA" title.
 */
export function duplicateWorkoutTemplate(template: WorkoutTemplate): WorkoutTemplate {
  const newTemplateId = generateId('tmpl');
  const nowIso = new Date().toISOString();

  const clonedWorkouts: RoutineWorkout[] = template.workouts.map((w, wIdx) => {
    const newWorkoutId = generateId('rw');
    const groupMapping = new Map<string, string>();

    const clonedExercises: RoutineExercise[] = w.exercises.map((ex, exIdx) => {
      let mappedGroupId = ex.groupId;
      if (ex.groupId) {
        if (!groupMapping.has(ex.groupId)) {
          groupMapping.set(ex.groupId, generateId('grp'));
        }
        mappedGroupId = groupMapping.get(ex.groupId);
      }

      return {
        ...ex,
        id: generateId('re'),
        order: ex.order ?? (exIdx + 1),
        groupId: mappedGroupId
      };
    });

    return {
      id: newWorkoutId,
      routineId: newTemplateId,
      letter: w.letter || String.fromCharCode(65 + (wIdx % 26)),
      name: w.name || `Treino ${w.letter || 'A'}`,
      description: w.description || '',
      order: w.order ?? (wIdx + 1),
      exercises: clonedExercises,
      groups: w.groups ? JSON.parse(JSON.stringify(w.groups)) : undefined
    };
  });

  const newName = `${template.name} — CÓPIA`;

  return {
    ...template,
    id: newTemplateId,
    name: newName,
    title: newName,
    workouts: clonedWorkouts,
    createdAt: nowIso,
    updatedAt: nowIso
  };
}

export function normalizeStudent(raw: any): Student {
  if (!raw || typeof raw !== 'object') {
    return {
      id: generateId('student'),
      name: 'Aluno',
      photo: '',
      phone: '',
      email: '',
      goal: 'Hipertrofia',
      notes: '',
      status: 'active',
      gender: 'male',
      planName: 'Plano Presencial',
      priceMonthly: 0,
      startDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  return {
    id: raw.id || generateId('student'),
    name: raw.name || 'Aluno',
    photo: raw.photo || '',
    phone: raw.phone || '',
    email: raw.email || '',
    goal: raw.goal || 'Hipertrofia',
    notes: raw.notes || '',
    status: raw.status === 'inactive' ? 'inactive' : 'active',
    gender: raw.gender === 'female' ? 'female' : 'male',
    planName: raw.planName || 'Plano Presencial',
    priceMonthly: typeof raw.priceMonthly === 'number' ? raw.priceMonthly : 0,
    startDate: raw.startDate || new Date().toISOString().split('T')[0],
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString()
  };
}

export function normalizeWorkoutSession(raw: any): WorkoutSession {
  if (!raw || typeof raw !== 'object') {
    return {
      id: generateId('session'),
      studentId: '',
      studentName: 'Aluno',
      routineTitle: 'Treino',
      startTime: new Date().toISOString(),
      durationSeconds: 0,
      status: 'completed',
      totalVolume: 0,
      totalSets: 0,
      sets: [],
      prsAchieved: []
    };
  }

  const sets: WorkoutSetRecord[] = Array.isArray(raw.sets)
    ? raw.sets.map((st: any, idx: number) => ({
        id: st.id || generateId('set'),
        sessionId: st.sessionId || raw.id || '',
        exerciseId: st.exerciseId || '',
        exerciseName: st.exerciseName || 'Exercício',
        muscleGroup: st.muscleGroup || 'Geral',
        setNumber: typeof st.setNumber === 'number' ? st.setNumber : idx + 1,
        weightKg: typeof st.weightKg === 'number' ? st.weightKg : (typeof st.weight === 'number' ? st.weight : 0),
        actualReps: typeof st.actualReps === 'number' ? st.actualReps : (typeof st.reps === 'number' ? st.reps : 0),
        actualDurationSeconds: typeof st.actualDurationSeconds === 'number' ? st.actualDurationSeconds : st.durationSeconds,
        durationUnit: st.durationUnit || 'seconds',
        actualDistance: typeof st.actualDistance === 'number' ? st.actualDistance : st.distanceMeters,
        distanceUnit: st.distanceUnit || 'meters',
        cardioSpeedKmh: st.cardioSpeedKmh,
        cardioInclinePct: st.cardioInclinePct,
        rpe: st.rpe ?? null,
        isWarmup: Boolean(st.isWarmup),
        isDropSet: Boolean(st.isDropSet),
        isFailure: Boolean(st.isFailure),
        restSeconds: typeof st.restSeconds === 'number' ? st.restSeconds : 60,
        notes: st.notes || '',
        status: st.status || 'completed',
        completedAt: st.completedAt || raw.startTime || new Date().toISOString(),
        prescriptionType: st.prescriptionType || 'weight_reps',
        groupId: st.groupId,
        groupType: st.groupType,
        groupName: st.groupName,
        roundNumber: st.roundNumber
      }))
    : [];

  const prsAchieved: PersonalRecord[] = Array.isArray(raw.prsAchieved)
    ? raw.prsAchieved.map((pr: any) => ({
        id: pr.id || generateId('pr'),
        studentId: pr.studentId || raw.studentId || '',
        exerciseId: pr.exerciseId || '',
        exerciseName: pr.exerciseName || '',
        type: pr.type || 'weight_reps',
        metricLabel: pr.metricLabel || '',
        weightKg: typeof pr.weightKg === 'number' ? pr.weightKg : 0,
        reps: typeof pr.reps === 'number' ? pr.reps : 0,
        previousBestWeightKg: pr.previousBestWeightKg,
        previousBestReps: pr.previousBestReps,
        achievedAt: pr.achievedAt || raw.startTime || new Date().toISOString(),
        sessionId: pr.sessionId || raw.id
      }))
    : [];

  let routineSnapshot = raw.routineSnapshot;
  if (routineSnapshot && typeof routineSnapshot === 'object') {
    routineSnapshot = normalizeWorkoutRoutine(routineSnapshot);
    if (!Array.isArray(routineSnapshot.exercises)) {
      routineSnapshot.exercises = routineSnapshot.workouts?.[0]?.exercises || [];
    }
  }

  let workoutSnapshot = raw.workoutSnapshot;
  if (workoutSnapshot && typeof workoutSnapshot === 'object') {
    workoutSnapshot = {
      ...workoutSnapshot,
      exercises: Array.isArray(workoutSnapshot.exercises) ? workoutSnapshot.exercises : []
    };
  }

  return {
    id: raw.id || generateId('session'),
    studentId: raw.studentId || '',
    studentName: raw.studentName || 'Aluno',
    studentPhoto: raw.studentPhoto || '',
    routineId: raw.routineId,
    routineTitle: raw.routineTitle || raw.routineName,
    routineName: raw.routineName || raw.routineTitle,
    workoutId: raw.workoutId,
    workoutLetter: raw.workoutLetter,
    workoutName: raw.workoutName,
    routineSnapshot,
    workoutSnapshot,
    startTime: raw.startTime || new Date().toISOString(),
    endTime: raw.endTime,
    durationSeconds: typeof raw.durationSeconds === 'number' ? raw.durationSeconds : 0,
    status: raw.status || 'completed',
    totalVolume: typeof raw.totalVolume === 'number' ? raw.totalVolume : 0,
    totalSets: typeof raw.totalSets === 'number' ? raw.totalSets : sets.length,
    notes: raw.notes || '',
    sets,
    prsAchieved
  };
}

export function normalizeScheduleAppointment(raw: any): ScheduleAppointment {
  if (!raw || typeof raw !== 'object') {
    return {
      id: generateId('appt'),
      studentId: '',
      studentName: 'Aluno',
      date: new Date().toISOString().split('T')[0],
      time: '08:00',
      durationMinutes: 60,
      status: 'scheduled'
    };
  }

  return {
    id: raw.id || generateId('appt'),
    studentId: raw.studentId || '',
    studentName: raw.studentName || 'Aluno',
    studentPhoto: raw.studentPhoto,
    routineId: raw.routineId,
    routineTitle: raw.routineTitle,
    workoutId: raw.workoutId,
    workoutLetter: raw.workoutLetter,
    workoutTitle: raw.workoutTitle,
    date: raw.date || new Date().toISOString().split('T')[0],
    time: raw.time || '08:00',
    durationMinutes: typeof raw.durationMinutes === 'number' ? raw.durationMinutes : 60,
    status: raw.status || 'scheduled',
    recurrenceId: raw.recurrenceId,
    notes: raw.notes
  };
}

export function normalizeScheduleRecurrence(raw: any): ScheduleRecurrence {
  if (!raw || typeof raw !== 'object') {
    return {
      id: generateId('rec'),
      studentId: '',
      studentName: 'Aluno',
      startDate: new Date().toISOString().split('T')[0],
      periodType: 'indefinite',
      status: 'active',
      weekdays: [1, 3, 5],
      defaultTime: '08:00',
      defaultDurationMinutes: 60,
      useDifferentTimes: false,
      useDifferentRoutines: false,
      weekdayConfigs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  const weekdays = Array.isArray(raw.weekdays) ? raw.weekdays : [];
  const weekdayConfigs = Array.isArray(raw.weekdayConfigs) ? raw.weekdayConfigs : [];

  return {
    id: raw.id || generateId('rec'),
    studentId: raw.studentId || '',
    studentName: raw.studentName || 'Aluno',
    studentPhoto: raw.studentPhoto,
    startDate: raw.startDate || new Date().toISOString().split('T')[0],
    endDate: raw.endDate ?? null,
    periodType: raw.periodType || 'indefinite',
    status: raw.status || 'active',
    pausedFrom: raw.pausedFrom,
    pausedUntil: raw.pausedUntil,
    weekdays,
    defaultTime: raw.defaultTime || '08:00',
    defaultDurationMinutes: typeof raw.defaultDurationMinutes === 'number' ? raw.defaultDurationMinutes : 60,
    defaultRoutineId: raw.defaultRoutineId,
    defaultRoutineTitle: raw.defaultRoutineTitle,
    defaultWorkoutId: raw.defaultWorkoutId,
    defaultWorkoutLetter: raw.defaultWorkoutLetter,
    defaultWorkoutTitle: raw.defaultWorkoutTitle,
    useDifferentTimes: Boolean(raw.useDifferentTimes),
    useDifferentRoutines: Boolean(raw.useDifferentRoutines),
    weekdayConfigs,
    notes: raw.notes,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString()
  };
}

export async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  if (dbOpenPromise) return dbOpenPromise;

  dbOpenPromise = new Promise((resolve, reject) => {
    let hasResolvedOrRejected = false;

    // Watchdog timer for DB connection (7s timeout)
    const timeout = setTimeout(() => {
      if (!hasResolvedOrRejected) {
        hasResolvedOrRejected = true;
        dbOpenPromise = null;
        const timeoutError = new Error('Timeout de 7s ao inicializar IndexedDB. O banco pode estar bloqueado por outra aba.');
        recordSanitizedError('indexeddb_open_timeout', timeoutError);
        reject(timeoutError);
      }
    }, 7000);

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onblocked = (event) => {
        console.warn('TFIVE PRO IndexedDB upgrade blocked by another active window:', event);
        recordSanitizedError('indexeddb_blocked', new Error('Acesso ao IndexedDB bloqueado por outra janela ativa do TFIVE PRO.'));
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        try {
          const db = (event.target as IDBOpenDBRequest).result;

          if (!db.objectStoreNames.contains('students')) {
            db.createObjectStore('students', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('exercises')) {
            db.createObjectStore('exercises', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('routines')) {
            db.createObjectStore('routines', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('sessions')) {
            db.createObjectStore('sessions', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('assessments')) {
            db.createObjectStore('assessments', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('schedule')) {
            db.createObjectStore('schedule', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('schedule_recurrences')) {
            const recStore = db.createObjectStore('schedule_recurrences', { keyPath: 'id' });
            recStore.createIndex('studentId', 'studentId', { unique: false });
            recStore.createIndex('status', 'status', { unique: false });
          }
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains('active_workouts')) {
            const activeStore = db.createObjectStore('active_workouts', { keyPath: 'sessionId' });
            activeStore.createIndex('studentId', 'studentId', { unique: false });
          }
          if (!db.objectStoreNames.contains('photos')) {
            const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
            photoStore.createIndex('studentId', 'studentId', { unique: false });
          }
          if (!db.objectStoreNames.contains('functional_tests')) {
            db.createObjectStore('functional_tests', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('functional_assessments')) {
            const faStore = db.createObjectStore('functional_assessments', { keyPath: 'id' });
            faStore.createIndex('studentId', 'studentId', { unique: false });
            faStore.createIndex('date', 'date', { unique: false });
          }
          if (!db.objectStoreNames.contains('functional_goals')) {
            const fgStore = db.createObjectStore('functional_goals', { keyPath: 'id' });
            fgStore.createIndex('studentId', 'studentId', { unique: false });
            fgStore.createIndex('status', 'status', { unique: false });
          }
          if (!db.objectStoreNames.contains('functional_milestones')) {
            const fmStore = db.createObjectStore('functional_milestones', { keyPath: 'id' });
            fmStore.createIndex('studentId', 'studentId', { unique: false });
            fmStore.createIndex('date', 'date', { unique: false });
          }
          if (!db.objectStoreNames.contains('functional_batteries')) {
            db.createObjectStore('functional_batteries', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('active_workout')) {
            db.createObjectStore('active_workout', { keyPath: 'key' });
          }
          if (!db.objectStoreNames.contains('evolution_reports')) {
            const repStore = db.createObjectStore('evolution_reports', { keyPath: 'id' });
            repStore.createIndex('studentId', 'studentId', { unique: false });
            repStore.createIndex('status', 'status', { unique: false });
            repStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
          if (!db.objectStoreNames.contains('workout_templates')) {
            const tmplStore = db.createObjectStore('workout_templates', { keyPath: 'id' });
            tmplStore.createIndex('name', 'name', { unique: false });
            tmplStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
          if (!db.objectStoreNames.contains('proposals')) {
            const propStore = db.createObjectStore('proposals', { keyPath: 'id' });
            propStore.createIndex('studentId', 'studentId', { unique: false });
            propStore.createIndex('status', 'status', { unique: false });
            propStore.createIndex('createdAt', 'createdAt', { unique: false });
            propStore.createIndex('validUntil', 'validUntil', { unique: false });
          }
          if (!db.objectStoreNames.contains('proposal_templates')) {
            const ptStore = db.createObjectStore('proposal_templates', { keyPath: 'id' });
            ptStore.createIndex('name', 'name', { unique: false });
            ptStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
          if (!db.objectStoreNames.contains('training_cycles')) {
            const cycleStore = db.createObjectStore('training_cycles', { keyPath: 'id' });
            cycleStore.createIndex('studentId', 'studentId', { unique: false });
            cycleStore.createIndex('status', 'status', { unique: false });
            cycleStore.createIndex('startDate', 'startDate', { unique: false });
          }
          if (!db.objectStoreNames.contains('student_onboardings')) {
            const onbStore = db.createObjectStore('student_onboardings', { keyPath: 'id' });
            onbStore.createIndex('studentId', 'studentId', { unique: false });
            onbStore.createIndex('status', 'status', { unique: false });
            onbStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
          if (!db.objectStoreNames.contains('student_access')) {
            const saStore = db.createObjectStore('student_access', { keyPath: 'id' });
            saStore.createIndex('studentId', 'studentId', { unique: false });
            saStore.createIndex('organizationId', 'organizationId', { unique: false });
            saStore.createIndex('status', 'status', { unique: false });
            saStore.createIndex('authUid', 'authUid', { unique: false });
          } else {
            try {
              const upgradeTx = (event.target as IDBOpenDBRequest)?.transaction;
              if (upgradeTx) {
                const existingSaStore = upgradeTx.objectStore('student_access');
                if (existingSaStore.indexNames.contains('studentId')) {
                  existingSaStore.deleteIndex('studentId');
                }
                existingSaStore.createIndex('studentId', 'studentId', { unique: false });
              }
            } catch (upgradeSaErr) {
              console.warn('TFIVE PRO: aviso na migração do índice student_access:', upgradeSaErr);
            }
          }
          if (!db.objectStoreNames.contains('app_users')) {
            const usrStore = db.createObjectStore('app_users', { keyPath: 'id' });
            usrStore.createIndex('authUid', 'authUid', { unique: true });
            usrStore.createIndex('role', 'role', { unique: false });
            usrStore.createIndex('organizationId', 'organizationId', { unique: false });
            usrStore.createIndex('studentId', 'studentId', { unique: false });
          }
          if (!db.objectStoreNames.contains('active_plans')) {
            const planStore = db.createObjectStore('active_plans', { keyPath: 'id' });
            planStore.createIndex('proposalId', 'proposalId', { unique: false });
            planStore.createIndex('organizationId', 'organizationId', { unique: false });
            planStore.createIndex('status', 'status', { unique: false });
            planStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
          if (!db.objectStoreNames.contains('plan_transfers')) {
            const transStore = db.createObjectStore('plan_transfers', { keyPath: 'id' });
            transStore.createIndex('activePlanId', 'activePlanId', { unique: false });
            transStore.createIndex('effectiveDate', 'effectiveDate', { unique: false });
            transStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
          if (!db.objectStoreNames.contains('plan_suspensions')) {
            const suspStore = db.createObjectStore('plan_suspensions', { keyPath: 'id' });
            suspStore.createIndex('activePlanId', 'activePlanId', { unique: false });
            suspStore.createIndex('participantId', 'participantId', { unique: false });
            suspStore.createIndex('status', 'status', { unique: false });
          }
          if (!db.objectStoreNames.contains('plan_audit_logs')) {
            const logStore = db.createObjectStore('plan_audit_logs', { keyPath: 'id' });
            logStore.createIndex('activePlanId', 'activePlanId', { unique: false });
            logStore.createIndex('timestamp', 'timestamp', { unique: false });
            logStore.createIndex('eventType', 'eventType', { unique: false });
          }
          if (!db.objectStoreNames.contains('training_memories')) {
            const memoryStore = db.createObjectStore('training_memories', { keyPath: 'id' });
            memoryStore.createIndex('studentId', 'studentId', { unique: false });
            memoryStore.createIndex('status', 'status', { unique: false });
            memoryStore.createIndex('exerciseId', 'exerciseId', { unique: false });
            memoryStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
        } catch (upgradeErr) {
          recordSanitizedError('indexeddb_upgrade_error', upgradeErr);
        }
      };

      request.onsuccess = () => {
        clearTimeout(timeout);
        if (!hasResolvedOrRejected) {
          hasResolvedOrRejected = true;
          dbInstance = request.result;
          
          // Gracefully close on version change so another tab or SW can upgrade without blockage
          dbInstance.onversionchange = () => {
            if (dbInstance) {
              dbInstance.close();
              dbInstance = null;
              dbOpenPromise = null;
            }
          };

          resolve(dbInstance);
        }
      };

      request.onerror = () => {
        clearTimeout(timeout);
        if (!hasResolvedOrRejected) {
          hasResolvedOrRejected = true;
          dbOpenPromise = null;
          recordSanitizedError('indexeddb_open_error', request.error);
          reject(request.error || new Error('Falha ao abrir o IndexedDB'));
        }
      };
    } catch (err) {
      clearTimeout(timeout);
      if (!hasResolvedOrRejected) {
        hasResolvedOrRejected = true;
        dbOpenPromise = null;
        recordSanitizedError('indexeddb_open_sync_error', err);
        reject(err);
      }
    }
  });

  return dbOpenPromise;
}

// Generic IndexedDB operations with error handling and fallback
export async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains(storeName)) {
          resolve([]);
          return;
        }
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => {
          recordSanitizedError(`store_getall_${storeName}`, request.error);
          reject(request.error);
        };
      } catch (err) {
        recordSanitizedError(`store_getall_tx_${storeName}`, err);
        reject(err);
      }
    });
  } catch (err) {
    recordSanitizedError(`store_getall_db_${storeName}`, err);
    return [];
  }
}

export async function getByIdFromStore<T>(storeName: string, id: string): Promise<T | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains(storeName)) {
          resolve(null);
          return;
        }
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => {
          recordSanitizedError(`store_getbyid_${storeName}`, request.error);
          reject(request.error);
        };
      } catch (err) {
        recordSanitizedError(`store_getbyid_tx_${storeName}`, err);
        reject(err);
      }
    });
  } catch (err) {
    recordSanitizedError(`store_getbyid_db_${storeName}`, err);
    return null;
  }
}

export async function putInStore<T>(storeName: string, item: T): Promise<T> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    try {
      if (!db.objectStoreNames.contains(storeName)) {
        resolve(item);
        return;
      }
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve(item);
      request.onerror = (e) => {
        const error = request.error;
        if (error && error.name === 'QuotaExceededError') {
          console.warn('IndexedDB QuotaExceededError in store:', storeName);
          recordSanitizedError('quota_exceeded', error);
        } else {
          recordSanitizedError(`store_put_${storeName}`, error);
        }
        reject(error);
      };
    } catch (err) {
      recordSanitizedError(`store_put_tx_${storeName}`, err);
      reject(err);
    }
  });
}

export async function deleteFromStore(storeName: string, id: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains(storeName)) {
          resolve();
          return;
        }
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          recordSanitizedError(`store_delete_${storeName}`, request.error);
          reject(request.error);
        };
      } catch (err) {
        recordSanitizedError(`store_delete_tx_${storeName}`, err);
        reject(err);
      }
    });
  } catch (err) {
    recordSanitizedError(`store_delete_db_${storeName}`, err);
  }
}

export async function clearStore(storeName: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      try {
        if (!db.objectStoreNames.contains(storeName)) {
          resolve();
          return;
        }
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => {
          recordSanitizedError(`store_clear_${storeName}`, request.error);
          reject(request.error);
        };
      } catch (err) {
        recordSanitizedError(`store_clear_tx_${storeName}`, err);
        reject(err);
      }
    });
  } catch (err) {
    recordSanitizedError(`store_clear_db_${storeName}`, err);
  }
}

/**
 * Validates active workout state safely without crashing if one session is corrupt
 */
export function validateAndSanitizeActiveWorkout(raw: any): ActiveWorkoutState | null {
  if (!raw || typeof raw !== 'object') return null;
  if (!raw.session || typeof raw.session !== 'object') return null;

  const sessionId = raw.sessionId || raw.session.id || generateId('session');
  const studentId = raw.studentId || raw.session.studentId || '';
  const studentName = raw.studentName || raw.session.studentName || 'Aluno';
  const routineTitle = raw.routineTitle || raw.session.routineTitle || 'Treino';

  let routineSnapshot = raw.routineSnapshot || raw.session.routineSnapshot;
  if (routineSnapshot && typeof routineSnapshot === 'object') {
    routineSnapshot = normalizeWorkoutRoutine(routineSnapshot);
    if (!Array.isArray(routineSnapshot.exercises)) {
      routineSnapshot.exercises = routineSnapshot.workouts?.[0]?.exercises || [];
    }
  }

  const workoutId = raw.workoutId || raw.session.workoutId;
  const workoutLetter = raw.workoutLetter || raw.session.workoutLetter;
  const workoutName = raw.workoutName || raw.session.workoutName;

  let workoutSnapshot = raw.workoutSnapshot || raw.session.workoutSnapshot;
  if (workoutSnapshot && typeof workoutSnapshot === 'object') {
    workoutSnapshot = {
      ...workoutSnapshot,
      exercises: Array.isArray(workoutSnapshot.exercises) ? workoutSnapshot.exercises : []
    };
  } else if (routineSnapshot?.workouts && routineSnapshot.workouts.length > 0) {
    // If no explicit workout snapshot exists but workoutId/letter exists, find matching workout
    const matched = routineSnapshot.workouts.find((w: any) => 
      (workoutId && w.id === workoutId) || 
      (workoutLetter && w.letter?.toUpperCase() === workoutLetter.toUpperCase())
    );
    if (matched) {
      workoutSnapshot = {
        ...matched,
        exercises: Array.isArray(matched.exercises) ? matched.exercises : []
      };
    }
  }

  return {
    ...raw,
    sessionId,
    studentId,
    studentName,
    routineTitle,
    routineSnapshot,
    workoutId,
    workoutLetter,
    workoutName,
    workoutSnapshot,
    elapsedSeconds: typeof raw.elapsedSeconds === 'number' ? raw.elapsedSeconds : 0,
    isPaused: Boolean(raw.isPaused),
    restTimerSeconds: typeof raw.restTimerSeconds === 'number' ? raw.restTimerSeconds : 0,
    isRestActive: Boolean(raw.isRestActive),
    currentExerciseIndex: typeof raw.currentExerciseIndex === 'number' ? raw.currentExerciseIndex : (typeof raw.exerciseIndex === 'number' ? raw.exerciseIndex : 0),
    currentSetIndex: typeof raw.currentSetIndex === 'number' ? raw.currentSetIndex : 0,
    session: {
      ...raw.session,
      id: sessionId,
      studentId,
      studentName,
      routineTitle,
      routineSnapshot,
      workoutId,
      workoutLetter,
      workoutName,
      workoutSnapshot,
      sets: Array.isArray(raw.session.sets) ? raw.session.sets : [],
      status: raw.session.status || 'in_progress',
      startTime: raw.session.startTime || new Date().toISOString()
    }
  };
}

// Active Workouts Persistence (Supports up to 2 concurrent sessions)
export async function saveActiveWorkoutState(state: ActiveWorkoutState): Promise<void> {
  const sanitized = validateAndSanitizeActiveWorkout(state);
  if (!sanitized) return;
  await putInStore('active_workouts', sanitized);
}

/**
 * Safely migrates any legacy records from 'active_workout' to 'active_workouts' without loss
 */
export async function migrateActiveWorkoutsStoreIfNeeded(): Promise<void> {
  try {
    const db = await getDB();
    if (!db.objectStoreNames.contains('active_workout')) {
      return;
    }

    const legacyItems = await getAllFromStore<any>('active_workout');
    if (!legacyItems || legacyItems.length === 0) {
      return;
    }

    const currentActive = await getAllFromStore<any>('active_workouts');
    const existingSessionIds = new Set((currentActive || []).map(i => i?.sessionId || i?.session?.id));

    for (const legacy of legacyItems) {
      const sanitized = validateAndSanitizeActiveWorkout(legacy);
      if (sanitized && !existingSessionIds.has(sanitized.sessionId)) {
        await putInStore('active_workouts', sanitized);
      }
    }

    // Safely clear legacy store after verified transfer
    await clearStore('active_workout');
  } catch (err) {
    recordSanitizedError('migrate_active_workouts_error', err);
  }
}

export async function getAllActiveWorkoutStates(): Promise<ActiveWorkoutState[]> {
  try {
    const list = await getAllFromStore<any>('active_workouts');
    const validList: ActiveWorkoutState[] = [];

    for (const item of list) {
      const sanitized = validateAndSanitizeActiveWorkout(item);
      if (sanitized) {
        validList.push(sanitized);
      }
    }

    if (validList.length > 0) {
      return validList;
    }

    // Backward compatibility fallback to 'active_workout' store if migration hasn't run
    const legacy = await getByIdFromStore<any>('active_workout', 'current_active_session');
    if (legacy && legacy.session) {
      const sanitized = validateAndSanitizeActiveWorkout(legacy);
      if (sanitized) {
        await saveActiveWorkoutState(sanitized);
        await deleteFromStore('active_workout', 'current_active_session');
        return [sanitized];
      }
    }
    return [];
  } catch (err) {
    recordSanitizedError('get_active_workouts', err);
    return [];
  }
}

export async function deleteActiveWorkoutState(sessionId: string): Promise<void> {
  await deleteFromStore('active_workouts', sessionId);
  try {
    await deleteFromStore('active_workout', 'current_active_session');
  } catch {
    // Ignore legacy cleanup errors
  }
}

export async function clearAllActiveWorkouts(): Promise<void> {
  await clearStore('active_workouts');
  try {
    await clearStore('active_workout');
  } catch {
    // Ignore
  }
}

// Aliases for single active workout compatibility
export async function getActiveWorkoutState(): Promise<ActiveWorkoutState | null> {
  const all = await getAllActiveWorkoutStates();
  return all.length > 0 ? all[0] : null;
}

export async function clearActiveWorkoutState(): Promise<void> {
  await clearAllActiveWorkouts();
}

export function normalizeEvolutionReport(raw: any): EvolutionReport {
  if (!raw || typeof raw !== 'object') {
    return {} as EvolutionReport;
  }
  return {
    id: raw.id || generateId('rep'),
    studentId: raw.studentId || '',
    studentName: raw.studentName || 'Aluno',
    studentPhoto: raw.studentPhoto,
    status: raw.status || 'draft',
    title: raw.title || 'Relatório de Performance e Evolução',
    periodType: raw.periodType || 'Trimestral',
    startDate: raw.startDate || new Date().toISOString().split('T')[0],
    endDate: raw.endDate || new Date().toISOString().split('T')[0],
    durationDays: typeof raw.durationDays === 'number' ? raw.durationDays : 90,
    primaryGoal: raw.primaryGoal || 'Longevidade funcional',
    secondaryGoals: Array.isArray(raw.secondaryGoals) ? raw.secondaryGoals : [],
    periodStatus: raw.periodStatus || 'Evolução consistente',
    trainerProfile: raw.trainerProfile || DEFAULT_TRAINER,
    evolutionScore: raw.evolutionScore || {
      overallScore: 85,
      dimensions: {} as any,
      methodologyNotes: ''
    },
    keyIndicators: Array.isArray(raw.keyIndicators) ? raw.keyIndicators : [],
    achievements: Array.isArray(raw.achievements) ? raw.achievements : [],
    adherence: raw.adherence || {
      plannedSessions: 0,
      completedSessions: 0,
      missedSessions: 0,
      cancelledSessions: 0,
      adherenceRatePercent: 0,
      avgWeeklyFrequency: 0,
      longestActiveStreakWeeks: 0,
      monthlyBreakdown: []
    },
    exerciseProgressions: Array.isArray(raw.exerciseProgressions) ? raw.exerciseProgressions : [],
    performanceHighlights: Array.isArray(raw.performanceHighlights) ? raw.performanceHighlights : [],
    physicalComparison: raw.physicalComparison || { hasData: false, metrics: [] },
    functionalComparison: raw.functionalComparison || { hasData: false, tests: [] },
    dailyLivingImpact: raw.dailyLivingImpact || { indicators: [] },
    timelineEvents: Array.isArray(raw.timelineEvents) ? raw.timelineEvents : [],
    goals: Array.isArray(raw.goals) ? raw.goals : [],
    trainerOpinion: raw.trainerOpinion || {
      summaryStatement: '',
      observedEvolution: '',
      keyAchievements: '',
      challengesFaced: '',
      contributingFactors: '',
      improvementAreas: '',
      dateIssued: new Date().toISOString().split('T')[0],
      trainerName: '',
      trainerCref: ''
    },
    nextCyclePlan: raw.nextCyclePlan || {
      maintainList: [],
      progressList: [],
      prioritizeList: [],
      monitorList: [],
      newPrimaryGoal: 'Longevidade funcional',
      expectedWeeklyFrequency: 3,
      keyFocusAreas: '',
      nextAssessmentTargetDate: '',
      nextCycleGoals: []
    },
    dataSources: Array.isArray(raw.dataSources) ? raw.dataSources : [],
    version: typeof raw.version === 'number' ? raw.version : 1,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
    finalizedAt: raw.finalizedAt
  };
}

export async function getEvolutionReports(studentId?: string): Promise<EvolutionReport[]> {
  try {
    const rawList = await getAllFromStore<any>('evolution_reports');
    let list = rawList.map(normalizeEvolutionReport);
    if (studentId) {
      list = list.filter(r => r.studentId === studentId);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    recordSanitizedError('get_evolution_reports', err);
    return [];
  }
}

export async function getEvolutionReportById(id: string): Promise<EvolutionReport | null> {
  try {
    const raw = await getByIdFromStore<any>('evolution_reports', id);
    return raw ? normalizeEvolutionReport(raw) : null;
  } catch (err) {
    recordSanitizedError('get_evolution_report_by_id', err);
    return null;
  }
}

export async function saveEvolutionReport(report: EvolutionReport): Promise<EvolutionReport> {
  const norm = normalizeEvolutionReport({
    ...report,
    updatedAt: new Date().toISOString()
  });
  await putInStore('evolution_reports', norm);
  return norm;
}

export async function deleteEvolutionReport(id: string): Promise<void> {
  await deleteFromStore('evolution_reports', id);
}

/**
 * Backup JSON Export with Versioning & Metadata
 */
export interface TFIVEBackupPayload {
  appName: string;
  backupVersion: number;
  createdAt: string;
  data: {
    students: Student[];
    exercises: Exercise[];
    routines: WorkoutRoutine[];
    sessions: WorkoutSession[];
    assessments: PhysicalAssessment[];
    schedule: ScheduleAppointment[];
    scheduleRecurrences?: ScheduleRecurrence[];
    activeWorkouts?: ActiveWorkoutState[];
    settings: { key: string; value: unknown }[];
    photos?: StudentPhoto[];
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
    studentAccess?: StudentAccess[];
    appUsers?: AppUser[];
    activePlans?: ActivePlan[];
    planTransfers?: PlanTransfer[];
    planSuspensions?: PlanSuspension[];
    planAuditLogs?: PlanAuditLog[];
    trainingMemories?: TrainingMemory[];
  };
}

export async function exportDatabaseToJSON(): Promise<string> {
  if (DATA_BACKEND === 'supabase') {
    const students = await getStudentRepository().getAll().catch(() => []);
    const exercises = await getExerciseRepository().getAll().catch(() => []);
    const routines = await getRoutineRepository().getAll().catch(() => []);
    const sessions = await getSessionRepository().getAll().catch(() => []);
    const assessments = await getAssessmentRepository().getAll().catch(() => []);
    const schedule = await getScheduleRepository().getAppointments().catch(() => []);
    const scheduleRecurrences = await getScheduleRepository().getRecurrences().catch(() => []);
    const trainingCycles = await getTrainingCycleRepository().getAll().catch(() => []);
    const proposals = await getProposalRepository().getAll().catch(() => []);
    const activePlans = await getActivePlanRepository().getAll().catch(() => []);
    const functionalTests = await getFunctionalTestRepository().getAll().catch(() => []);
    const functionalBatteries = await getFunctionalBatteryRepository().getAll().catch(() => []);

    // These remain local for now as no Supabase repo exists for them yet
    const settings = await getAllFromStore<{ key: string; value: unknown }>('settings');
    const activeWorkouts = await getAllActiveWorkoutStates();
    const photos = await getAllFromStore<StudentPhoto>('photos');
    const functionalAssessments = await getAllFromStore<FunctionalAssessment>('functional_assessments');
    const functionalGoals = await getAllFromStore<FunctionalGoal>('functional_goals');
    const functionalMilestones = await getAllFromStore<FunctionalMilestone>('functional_milestones');
    const evolutionReports = await getEvolutionReports();
    const workoutTemplates = await getAllFromStore<WorkoutTemplate>('workout_templates');
    const proposalTemplates = await getAllFromStore<ProposalTemplate>('proposal_templates');
    const studentOnboardings = await getAllFromStore<StudentOnboarding>('student_onboardings');
    const studentAccess = await getAllFromStore<StudentAccess>('student_access');
    const appUsers = await getAllFromStore<AppUser>('app_users');
    const planTransfers = await getAllFromStore<PlanTransfer>('plan_transfers');
    const planSuspensions = await getAllFromStore<PlanSuspension>('plan_suspensions');
    const planAuditLogs = await getAllFromStore<PlanAuditLog>('plan_audit_logs');
    const trainingMemories = await getAllFromStore<TrainingMemory>('training_memories');

    const backupData: TFIVEBackupPayload = {
      appName: 'TFIVE PRO',
      backupVersion: 1,
      createdAt: new Date().toISOString(),
      data: {
        students, exercises, routines, sessions, assessments,
        schedule, scheduleRecurrences,
        activeWorkouts, settings, photos, functionalTests,
        functionalAssessments, functionalGoals,
        functionalMilestones, functionalBatteries,
        evolutionReports, workoutTemplates,
        proposals, proposalTemplates, trainingCycles,
        studentOnboardings, studentAccess,
        appUsers, activePlans, planTransfers,
        planSuspensions, planAuditLogs,
        trainingMemories
      }
    };
    return JSON.stringify(backupData, null, 2);
  }

  const students = await getAllFromStore<Student>('students');
  const exercises = await getAllFromStore<Exercise>('exercises');
  const routines = await getAllFromStore<WorkoutRoutine>('routines');
  const sessions = await getAllFromStore<WorkoutSession>('sessions');
  const assessments = await getAllFromStore<PhysicalAssessment>('assessments');
  const schedule = await getAllFromStore<ScheduleAppointment>('schedule');
  const scheduleRecurrences = await getAllFromStore<ScheduleRecurrence>('schedule_recurrences');
  const activeWorkouts = await getAllActiveWorkoutStates();
  const settings = await getAllFromStore<{ key: string; value: unknown }>('settings');
  const photos = await getAllFromStore<StudentPhoto>('photos');
  const functionalTests = await getAllFromStore<FunctionalTest>('functional_tests');
  const functionalAssessments = await getAllFromStore<FunctionalAssessment>('functional_assessments');
  const functionalGoals = await getAllFromStore<FunctionalGoal>('functional_goals');
  const functionalMilestones = await getAllFromStore<FunctionalMilestone>('functional_milestones');
  const functionalBatteries = await getAllFromStore<FunctionalBattery>('functional_batteries');
  const evolutionReports = await getEvolutionReports();
  const workoutTemplates = await getAllFromStore<WorkoutTemplate>('workout_templates');
  const proposals = await getAllFromStore<Proposal>('proposals');
  const proposalTemplates = await getAllFromStore<ProposalTemplate>('proposal_templates');
  const trainingCycles = await getAllFromStore<TrainingCycle>('training_cycles');
  const studentOnboardings = await getAllFromStore<StudentOnboarding>('student_onboardings');
  const studentAccess = await getAllFromStore<StudentAccess>('student_access');
  const appUsers = await getAllFromStore<AppUser>('app_users');
  const activePlans = await getAllFromStore<ActivePlan>('active_plans');
  const planTransfers = await getAllFromStore<PlanTransfer>('plan_transfers');
  const planSuspensions = await getAllFromStore<PlanSuspension>('plan_suspensions');
  const planAuditLogs = await getAllFromStore<PlanAuditLog>('plan_audit_logs');
  const trainingMemories = await getAllFromStore<TrainingMemory>('training_memories');

  const backupData: TFIVEBackupPayload = {
    appName: 'TFIVE PRO',
    backupVersion: 8,
    createdAt: new Date().toISOString(),
    data: {
      students,
      exercises,
      routines,
      workoutTemplates,
      sessions,
      assessments,
      schedule,
      scheduleRecurrences,
      activeWorkouts,
      settings,
      photos,
      functionalTests,
      functionalAssessments,
      functionalGoals,
      functionalMilestones,
      functionalBatteries,
      evolutionReports,
      proposals,
      proposalTemplates,
      trainingCycles,
      studentOnboardings,
      studentAccess,
      appUsers,
      activePlans,
      planTransfers,
      planSuspensions,
      planAuditLogs,
      trainingMemories
    }
  };

  return JSON.stringify(backupData, null, 2);
}

/**
 * Validates and safely imports backup data without wiping current data if invalid
 */
export async function importDatabaseFromJSON(jsonString: string): Promise<{ success: boolean; message: string }> {
  try {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      return { success: false, message: 'Arquivo corrompido: JSON inválido.' };
    }

    if (!parsed || typeof parsed !== 'object') {
      return { success: false, message: 'Formato de arquivo inválido.' };
    }

    // Validate TFIVE identifier or data payload
    if (!parsed.data && !parsed.students) {
      return { success: false, message: 'Estrutura de dados TFIVE PRO não encontrada no arquivo.' };
    }

    const payloadData = parsed.data || parsed;
    const { 
      students, 
      exercises, 
      routines, 
      workoutTemplates,
      workout_templates,
      sessions, 
      assessments, 
      schedule, 
      scheduleRecurrences,
      schedule_recurrences,
      activeWorkouts, 
      settings, 
      photos,
      functionalTests,
      functionalAssessments,
      functionalGoals,
      functionalMilestones,
      functionalBatteries
    } = payloadData;

    // Validate types before making changes
    if (students && !Array.isArray(students)) {
      return { success: false, message: 'Validação falhou: lista de alunos inválida.' };
    }
    if (sessions && !Array.isArray(sessions)) {
      return { success: false, message: 'Validação falhou: histórico de treinos inválido.' };
    }

    // Safely restore stores
    if (Array.isArray(students)) {
      await clearStore('students');
      for (const item of students) await putInStore('students', item);
    }
    if (Array.isArray(exercises) && exercises.length > 0) {
      await clearStore('exercises');
      for (const item of exercises) await putInStore('exercises', item);
    }
    if (Array.isArray(routines)) {
      await clearStore('routines');
      for (const item of routines) await putInStore('routines', normalizeWorkoutRoutine(item));
    }
    const templatesToRestore = workoutTemplates || workout_templates;
    if (Array.isArray(templatesToRestore)) {
      await clearStore('workout_templates');
      for (const item of templatesToRestore) await putInStore('workout_templates', normalizeWorkoutTemplate(item));
    }
    if (Array.isArray(sessions)) {
      await clearStore('sessions');
      for (const item of sessions) await putInStore('sessions', item);
    }
    if (Array.isArray(assessments)) {
      await clearStore('assessments');
      for (const item of assessments) await putInStore('assessments', item);
    }
    if (Array.isArray(schedule)) {
      await clearStore('schedule');
      for (const item of schedule) await putInStore('schedule', item);
    }
    const recurrencesToRestore = scheduleRecurrences || schedule_recurrences;
    if (Array.isArray(recurrencesToRestore)) {
      await clearStore('schedule_recurrences');
      for (const item of recurrencesToRestore) await putInStore('schedule_recurrences', item);
    }
    if (Array.isArray(activeWorkouts)) {
      await clearStore('active_workouts');
      for (const item of activeWorkouts) await putInStore('active_workouts', item);
    }
    if (Array.isArray(settings)) {
      await clearStore('settings');
      for (const item of settings) await putInStore('settings', item);
    }
    if (Array.isArray(photos)) {
      await clearStore('photos');
      for (const item of photos) await putInStore('photos', item);
    }
    if (Array.isArray(functionalTests) && functionalTests.length > 0) {
      await clearStore('functional_tests');
      for (const item of functionalTests) await putInStore('functional_tests', item);
    }
    if (Array.isArray(functionalAssessments)) {
      await clearStore('functional_assessments');
      for (const item of functionalAssessments) await putInStore('functional_assessments', item);
    }
    if (Array.isArray(functionalGoals)) {
      await clearStore('functional_goals');
      for (const item of functionalGoals) await putInStore('functional_goals', item);
    }
    if (Array.isArray(functionalMilestones)) {
      await clearStore('functional_milestones');
      for (const item of functionalMilestones) await putInStore('functional_milestones', item);
    }
    if (Array.isArray(functionalBatteries)) {
      await clearStore('functional_batteries');
      for (const item of functionalBatteries) await putInStore('functional_batteries', item);
    }
    const { evolutionReports } = payloadData;
    if (Array.isArray(evolutionReports)) {
      await clearStore('evolution_reports');
      for (const item of evolutionReports) await putInStore('evolution_reports', normalizeEvolutionReport(item));
    }
    const proposals = payloadData.proposals;
    if (Array.isArray(proposals)) {
      await clearStore('proposals');
      for (const item of proposals) await putInStore('proposals', normalizeProposal(item));
    }
    const proposalTemplates = payloadData.proposalTemplates || payloadData.proposal_templates;
    if (Array.isArray(proposalTemplates)) {
      await clearStore('proposal_templates');
      for (const item of proposalTemplates) await putInStore('proposal_templates', normalizeProposalTemplate(item));
    }
    const trainingCycles = payloadData.trainingCycles || payloadData.training_cycles;
    if (Array.isArray(trainingCycles)) {
      await clearStore('training_cycles');
      for (const item of trainingCycles) await putInStore('training_cycles', normalizeTrainingCycle(item));
    }
    const studentOnboardings = payloadData.studentOnboardings || payloadData.student_onboardings;
    if (Array.isArray(studentOnboardings)) {
      await clearStore('student_onboardings');
      for (const item of studentOnboardings) await putInStore('student_onboardings', normalizeStudentOnboarding(item));
    }
    const studentAccess = payloadData.studentAccess || payloadData.student_access;
    if (Array.isArray(studentAccess)) {
      await clearStore('student_access');
      for (const item of studentAccess) await putInStore('student_access', item);
    }
    const appUsers = payloadData.appUsers || payloadData.app_users;
    if (Array.isArray(appUsers)) {
      await clearStore('app_users');
      for (const item of appUsers) await putInStore('app_users', item);
    }
    const activePlans = payloadData.activePlans || payloadData.active_plans;
    if (Array.isArray(activePlans)) {
      await clearStore('active_plans');
      for (const item of activePlans) await putInStore('active_plans', normalizeActivePlan(item));
    }
    const planTransfers = payloadData.planTransfers || payloadData.plan_transfers;
    if (Array.isArray(planTransfers)) {
      await clearStore('plan_transfers');
      for (const item of planTransfers) await putInStore('plan_transfers', item);
    }
    const planSuspensions = payloadData.planSuspensions || payloadData.plan_suspensions;
    if (Array.isArray(planSuspensions)) {
      await clearStore('plan_suspensions');
      for (const item of planSuspensions) await putInStore('plan_suspensions', item);
    }
    const planAuditLogs = payloadData.planAuditLogs || payloadData.plan_audit_logs;
    if (Array.isArray(planAuditLogs)) {
      await clearStore('plan_audit_logs');
      for (const item of planAuditLogs) await putInStore('plan_audit_logs', item);
    }
    const trainingMemories = payloadData.trainingMemories || payloadData.training_memories;
    if (Array.isArray(trainingMemories)) {
      await clearStore('training_memories');
      for (const item of trainingMemories) await putInStore('training_memories', item);
    }

    return { success: true, message: 'Backup restaurado com sucesso!' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro ao processar dados.';
    return { success: false, message: `Erro ao importar: ${errorMsg}` };
  }
}

/**
 * Clears all user data completely, restoring an empty clean state without dummy students.
 */
export async function clearAllDatabase(): Promise<void> {
  await clearStore('students');
  await clearStore('routines');
  await clearStore('workout_templates');
  await clearStore('sessions');
  await clearStore('assessments');
  await clearStore('schedule');
  await clearStore('schedule_recurrences');
  await clearStore('active_workouts');
  await clearStore('active_workout');
  await clearStore('settings');
  await clearStore('photos');
  await clearStore('exercises');
  await clearStore('functional_tests');
  await clearStore('functional_assessments');
  await clearStore('functional_goals');
  await clearStore('functional_milestones');
  await clearStore('functional_batteries');
  await clearStore('evolution_reports');
  await clearStore('proposals');
  await clearStore('proposal_templates');
}

/**
 * Normalizes a Proposal object ensuring snapshot integrity and valid pricing.
 */
export function normalizeProposal(raw: any): Proposal {
  const nowIso = new Date().toISOString();
  if (!raw || typeof raw !== 'object') {
    const studentSnapshot = { name: 'Aluno' };
    const defaultPart: ProposalParticipant = {
      id: generateId('part'),
      nameSnapshot: 'Aluno',
      role: 'holder'
    };
    const defaultPlan = createDefaultPlanItem('Plano Anual', 'Personal Training Presencial', [defaultPart]);

    return {
      id: generateId('prop'),
      studentId: '',
      studentSnapshot,
      participants: [defaultPart],
      planType: 'individual',
      title: 'Proposta Comercial — Plano Anual',
      service: 'Personal Training Presencial',
      description: 'Apresentação de acompanhamento físico personalizado TFIVE PRO.',
      mode: 'single_plan',
      plans: [defaultPlan],
      conditions: '',
      validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'draft',
      createdAt: nowIso,
      updatedAt: nowIso,
      version: 1,
      trainerSnapshot: {
        name: DEFAULT_TRAINER.name,
        cref: DEFAULT_TRAINER.cref,
        phone: DEFAULT_TRAINER.phone,
        email: DEFAULT_TRAINER.email,
        slogan: DEFAULT_TRAINER.slogan
      }
    };
  }

  const id = raw.id || generateId('prop');
  const studentId = raw.studentId || '';
  const studentSnapshot = {
    name: raw.studentSnapshot?.name || 'Aluno',
    phone: raw.studentSnapshot?.phone,
    email: raw.studentSnapshot?.email,
    goal: raw.studentSnapshot?.goal
  };

  // Safe Participants Normalization with backwards compatibility
  let participants: ProposalParticipant[] = [];
  if (Array.isArray(raw.participants) && raw.participants.length > 0) {
    participants = raw.participants.map((p: any, idx: number) => ({
      id: p.id || generateId('part'),
      studentId: p.studentId || undefined,
      nameSnapshot: p.nameSnapshot || (idx === 0 ? studentSnapshot.name : `Participante ${idx + 1}`),
      phoneSnapshot: p.phoneSnapshot,
      emailSnapshot: p.emailSnapshot,
      role: p.role === 'holder' || idx === 0 ? 'holder' : 'participant',
      monthlyAmountCents: typeof p.monthlyAmountCents === 'number' ? p.monthlyAmountCents : undefined,
      discountPercent: typeof p.discountPercent === 'number' ? p.discountPercent : undefined
    }));
  } else {
    // Legacy proposal without participants array: wrap studentSnapshot as holder
    participants = [
      {
        id: generateId('part'),
        studentId: studentId || undefined,
        nameSnapshot: studentSnapshot.name,
        phoneSnapshot: studentSnapshot.phone,
        emailSnapshot: studentSnapshot.email,
        role: 'holder'
      }
    ];
  }

  if (participants.length > 0 && !participants.some(p => p.role === 'holder')) {
    participants[0].role = 'holder';
  }

  const planType: ProposalPlanType = raw.planType || (
    participants.length === 1 ? 'individual' : participants.length === 2 ? 'duo' : 'family_group'
  );

  const title = raw.title || 'Proposta Comercial';
  const service = raw.service || 'Personal Training Presencial';
  const description = raw.description || '';
  const mode = raw.mode === 'compare_plans' ? 'compare_plans' : 'single_plan';

  let plans: ProposalPlanItem[] = [];
  if (Array.isArray(raw.plans) && raw.plans.length > 0) {
    plans = raw.plans.map((p: any, idx: number) => {
      const pId = p.id || generateId('plan');
      const pName = p.name || `Plano ${idx + 1}`;
      const pService = p.service || service;
      const pDesc = p.description || '';
      const pDuration = typeof p.durationMonths === 'number' ? p.durationMonths : 12;
      const pFreq = p.frequency || '3x por semana';
      const isRecommended = Boolean(p.isRecommended);
      const benefits = Array.isArray(p.benefits) ? p.benefits : [];
      const pricing = (p.pricing && typeof p.pricing.finalAmountCents === 'number' && p.pricing.finalAmountCents >= 0)
        ? p.pricing
        : recalculatePlanPricing({ ...(p.pricing || {}), durationMonths: pDuration, planType }, participants);

      return {
        id: pId,
        name: pName,
        service: pService,
        description: pDesc,
        durationMonths: pDuration,
        frequency: pFreq,
        isRecommended,
        pricing,
        benefits
      };
    });
  } else {
    plans = [createDefaultPlanItem('Plano Anual', service, participants)];
  }

  const conditions = raw.conditions || '';
  const validUntil = raw.validUntil || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const validStatuses = ['draft', 'sent', 'accepted', 'rejected', 'expired'];
  const status = validStatuses.includes(raw.status) ? raw.status : 'draft';
  const createdAt = raw.createdAt || nowIso;
  const updatedAt = raw.updatedAt || nowIso;
  const sentAt = raw.sentAt;
  const acceptedAt = raw.acceptedAt;
  const version = typeof raw.version === 'number' ? raw.version : 1;
  const templateId = raw.templateId;
  const trainerSnapshot = {
    name: raw.trainerSnapshot?.name || DEFAULT_TRAINER.name,
    title: raw.trainerSnapshot?.title || DEFAULT_TRAINER.title,
    cref: raw.trainerSnapshot?.cref || DEFAULT_TRAINER.cref,
    phone: raw.trainerSnapshot?.phone || DEFAULT_TRAINER.phone,
    email: raw.trainerSnapshot?.email || DEFAULT_TRAINER.email,
    instagram: raw.trainerSnapshot?.instagram,
    qrCodeUrl: raw.trainerSnapshot?.qrCodeUrl,
    slogan: raw.trainerSnapshot?.slogan || DEFAULT_TRAINER.slogan
  };

  return {
    id,
    studentId,
    studentSnapshot,
    participants,
    planType,
    title,
    service,
    description,
    mode,
    plans,
    conditions,
    validUntil,
    status,
    createdAt,
    updatedAt,
    sentAt,
    acceptedAt,
    version,
    templateId,
    trainerSnapshot
  };
}

/**
 * Normalizes a ProposalTemplate object.
 */
export function normalizeProposalTemplate(raw: any): ProposalTemplate {
  const nowIso = new Date().toISOString();
  if (!raw || typeof raw !== 'object') {
    return {
      id: generateId('ptmpl'),
      name: 'Novo Modelo de Proposta',
      title: 'Proposta Comercial — Acompanhamento',
      service: 'Personal Training Presencial',
      description: 'Modelo base para propostas de treinamento presencial.',
      planType: 'individual',
      mode: 'single_plan',
      plans: [createDefaultPlanItem()],
      conditions: '',
      defaultValidityDays: 15,
      createdAt: nowIso,
      updatedAt: nowIso
    };
  }

  const id = raw.id || generateId('ptmpl');
  const name = raw.name || raw.title || 'Modelo de Proposta';
  const title = raw.title || name;
  const service = raw.service || 'Personal Training Presencial';
  const description = raw.description || '';
  const planType: ProposalPlanType = raw.planType || 'individual';
  const mode = raw.mode === 'compare_plans' ? 'compare_plans' : 'single_plan';

  let plans: ProposalPlanItem[] = [];
  if (Array.isArray(raw.plans) && raw.plans.length > 0) {
    plans = raw.plans.map((p: any, idx: number) => {
      const pId = p.id || generateId('plan');
      const pName = p.name || `Plano ${idx + 1}`;
      const pService = p.service || service;
      const pDesc = p.description || '';
      const pDuration = typeof p.durationMonths === 'number' ? p.durationMonths : 12;
      const pFreq = p.frequency || '3x por semana';
      const isRecommended = Boolean(p.isRecommended);
      const benefits = Array.isArray(p.benefits) ? p.benefits : [];
      const pricing = recalculatePlanPricing({ ...(p.pricing || {}), durationMonths: pDuration, planType });

      return {
        id: pId,
        name: pName,
        service: pService,
        description: pDesc,
        durationMonths: pDuration,
        frequency: pFreq,
        isRecommended,
        pricing,
        benefits
      };
    });
  } else {
    plans = [createDefaultPlanItem()];
  }

  const conditions = raw.conditions || '';
  const defaultValidityDays = typeof raw.defaultValidityDays === 'number' ? raw.defaultValidityDays : 15;
  const createdAt = raw.createdAt || nowIso;
  const updatedAt = raw.updatedAt || nowIso;

  return {
    id,
    name,
    title,
    service,
    description,
    planType,
    mode,
    plans,
    conditions,
    defaultValidityDays,
    createdAt,
    updatedAt
  };
}

/**
 * Creates an independent duplicate of a proposal with a new ID, reset status to 'draft', and current date.
 */
export function duplicateProposal(proposal: Proposal): Proposal {
  const newId = generateId('prop');
  const nowIso = new Date().toISOString();
  const validUntil = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const clonedParticipants: ProposalParticipant[] = (proposal.participants || []).map(p => ({
    ...p,
    id: generateId('part')
  }));

  const clonedPlans: ProposalPlanItem[] = proposal.plans.map(p => ({
    ...p,
    id: generateId('plan'),
    pricing: JSON.parse(JSON.stringify(p.pricing)),
    benefits: [...p.benefits]
  }));

  return {
    ...proposal,
    id: newId,
    title: `${proposal.title} (Cópia)`,
    status: 'draft',
    participants: clonedParticipants,
    plans: clonedPlans,
    createdAt: nowIso,
    updatedAt: nowIso,
    sentAt: undefined,
    acceptedAt: undefined,
    version: (proposal.version || 1) + 1,
    validUntil
  };
}

/**
 * Creates an independent revision of an already sent/accepted proposal.
 */
export function createProposalRevision(proposal: Proposal): Proposal {
  const newId = generateId('prop');
  const nowIso = new Date().toISOString();

  const clonedParticipants: ProposalParticipant[] = (proposal.participants || []).map(p => ({
    ...p,
    id: generateId('part')
  }));

  const clonedPlans: ProposalPlanItem[] = proposal.plans.map(p => ({
    ...p,
    id: generateId('plan'),
    pricing: JSON.parse(JSON.stringify(p.pricing)),
    benefits: [...p.benefits]
  }));

  return {
    ...proposal,
    id: newId,
    title: proposal.title.includes('v') ? proposal.title : `${proposal.title} (v${(proposal.version || 1) + 1})`,
    status: 'draft',
    participants: clonedParticipants,
    plans: clonedPlans,
    createdAt: nowIso,
    updatedAt: nowIso,
    sentAt: undefined,
    acceptedAt: undefined,
    version: (proposal.version || 1) + 1
  };
}

/**
 * Creates an independent Proposal from a ProposalTemplate without hardcoding any student.
 */
export function createProposalFromTemplate(
  template: ProposalTemplate,
  student?: Student | null,
  trainerProfile?: TrainerProfile
): Proposal {
  const newId = generateId('prop');
  const nowIso = new Date().toISOString();
  const validityDays = template.defaultValidityDays || 15;
  const validUntil = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const initialParticipants: ProposalParticipant[] = student ? [
    {
      id: generateId('part'),
      studentId: student.id,
      nameSnapshot: student.name,
      phoneSnapshot: student.phone,
      emailSnapshot: student.email,
      role: 'holder'
    }
  ] : [];

  const planType: ProposalPlanType = template.planType || 'individual';

  const clonedPlans: ProposalPlanItem[] = template.plans.map(p => ({
    ...p,
    id: generateId('plan'),
    pricing: recalculatePlanPricing({ ...p.pricing, planType }, initialParticipants),
    benefits: [...p.benefits]
  }));

  return {
    id: newId,
    studentId: student?.id || '',
    studentSnapshot: {
      name: student?.name || '',
      phone: student?.phone,
      email: student?.email,
      goal: student?.goal
    },
    participants: initialParticipants,
    planType,
    title: template.title || (student ? `Proposta Comercial — ${student.name}` : 'Proposta Comercial de Treinamento'),
    service: template.service || 'Personal Training Presencial',
    description: template.description || '',
    mode: template.mode || 'single_plan',
    plans: clonedPlans,
    conditions: template.conditions || '',
    validUntil,
    status: 'draft',
    createdAt: nowIso,
    updatedAt: nowIso,
    version: 1,
    templateId: template.id,
    trainerSnapshot: {
      name: trainerProfile?.name || DEFAULT_TRAINER.name,
      title: trainerProfile?.title || DEFAULT_TRAINER.title,
      cref: trainerProfile?.cref || DEFAULT_TRAINER.cref,
      phone: trainerProfile?.phone || DEFAULT_TRAINER.phone,
      email: trainerProfile?.email || DEFAULT_TRAINER.email,
      slogan: trainerProfile?.slogan || DEFAULT_TRAINER.slogan
    }
  };
}

/**
 * Saves a Proposal as an independent ProposalTemplate.
 */
export function cloneProposalToTemplate(
  proposal: Proposal,
  templateName?: string
): ProposalTemplate {
  const newTemplateId = generateId('ptmpl');
  const nowIso = new Date().toISOString();

  const clonedPlans: ProposalPlanItem[] = proposal.plans.map(p => ({
    ...p,
    id: generateId('plan'),
    pricing: JSON.parse(JSON.stringify(p.pricing)),
    benefits: [...p.benefits]
  }));

  return {
    id: newTemplateId,
    name: templateName?.trim() || proposal.title || 'Novo Modelo de Proposta',
    title: proposal.title,
    service: proposal.service,
    description: proposal.description,
    planType: proposal.planType || 'individual',
    mode: proposal.mode,
    plans: clonedPlans,
    conditions: proposal.conditions,
    defaultValidityDays: 15,
    createdAt: nowIso,
    updatedAt: nowIso
  };
}

/**
 * Duplicates a ProposalTemplate.
 */
export function duplicateProposalTemplate(template: ProposalTemplate): ProposalTemplate {
  const newId = generateId('ptmpl');
  const nowIso = new Date().toISOString();

  const clonedPlans: ProposalPlanItem[] = template.plans.map(p => ({
    ...p,
    id: generateId('plan'),
    pricing: JSON.parse(JSON.stringify(p.pricing)),
    benefits: [...p.benefits]
  }));

  return {
    ...template,
    id: newId,
    name: `${template.name} — CÓPIA`,
    title: `${template.title} — CÓPIA`,
    planType: template.planType || 'individual',
    plans: clonedPlans,
    createdAt: nowIso,
    updatedAt: nowIso
  };
}

/**
 * Database helpers for Proposals & Proposal Templates
 */
export async function getProposals(): Promise<Proposal[]> {
  try {
    const raw = await getAllFromStore<Proposal>('proposals');
    return (raw || []).map(normalizeProposal);
  } catch (err) {
    recordSanitizedError('getProposals_error', err);
    return [];
  }
}

export async function saveProposal(proposal: Proposal): Promise<void> {
  try {
    const normalized = normalizeProposal(proposal);
    normalized.updatedAt = new Date().toISOString();
    await putInStore('proposals', normalized);
  } catch (err) {
    recordSanitizedError('saveProposal_error', err);
    throw err;
  }
}

export async function deleteProposal(id: string): Promise<void> {
  try {
    await deleteFromStore('proposals', id);
  } catch (err) {
    recordSanitizedError('deleteProposal_error', err);
    throw err;
  }
}

export async function getProposalTemplates(): Promise<ProposalTemplate[]> {
  try {
    const raw = await getAllFromStore<ProposalTemplate>('proposal_templates');
    return (raw || []).map(normalizeProposalTemplate);
  } catch (err) {
    recordSanitizedError('getProposalTemplates_error', err);
    return [];
  }
}

export async function saveProposalTemplate(template: ProposalTemplate): Promise<void> {
  try {
    const normalized = normalizeProposalTemplate(template);
    normalized.updatedAt = new Date().toISOString();
    await putInStore('proposal_templates', normalized);
  } catch (err) {
    recordSanitizedError('saveProposalTemplate_error', err);
    throw err;
  }
}

export async function deleteProposalTemplate(id: string): Promise<void> {
  try {
    await deleteFromStore('proposal_templates', id);
  } catch (err) {
    recordSanitizedError('deleteProposalTemplate_error', err);
    throw err;
  }
}

/**
 * Database helpers for Workout Templates
 */
export async function getWorkoutTemplates(): Promise<WorkoutTemplate[]> {
  try {
    const rawTemplates = await getAllFromStore<WorkoutTemplate>('workout_templates');
    return (rawTemplates || []).map(normalizeWorkoutTemplate);
  } catch (err) {
    recordSanitizedError('getWorkoutTemplates_error', err);
    return [];
  }
}

export async function saveWorkoutTemplate(template: WorkoutTemplate): Promise<void> {
  try {
    const normalized = normalizeWorkoutTemplate(template);
    normalized.updatedAt = new Date().toISOString();
    await putInStore('workout_templates', normalized);
  } catch (err) {
    recordSanitizedError('saveWorkoutTemplate_error', err);
    throw err;
  }
}

export async function deleteWorkoutTemplate(id: string): Promise<void> {
  try {
    await deleteFromStore('workout_templates', id);
  } catch (err) {
    recordSanitizedError('deleteWorkoutTemplate_error', err);
    throw err;
  }
}

// Alias for backward compatibility
export const reseedDatabase = clearAllDatabase;

export { normalizeTrainingCycle };

export async function getTrainingCycles(): Promise<TrainingCycle[]> {
  try {
    const rawCycles = await getAllFromStore<TrainingCycle>('training_cycles');
    return (rawCycles || []).map(normalizeTrainingCycle);
  } catch (err) {
    recordSanitizedError('getTrainingCycles_error', err);
    return [];
  }
}

export async function saveTrainingCycleToDb(cycle: TrainingCycle): Promise<void> {
  try {
    const normalized = normalizeTrainingCycle(cycle);
    normalized.updatedAt = new Date().toISOString();
    await putInStore('training_cycles', normalized);
  } catch (err) {
    recordSanitizedError('saveTrainingCycleToDb_error', err);
    throw err;
  }
}

export async function deleteTrainingCycleFromDb(id: string): Promise<void> {
  try {
    await deleteFromStore('training_cycles', id);
  } catch (err) {
    recordSanitizedError('deleteTrainingCycleFromDb_error', err);
    throw err;
  }
}

/**
 * Normalizes a StudentOnboarding object ensuring integrity and safe defaults
 */
export function normalizeStudentOnboarding(raw: any): StudentOnboarding {
  if (!raw || typeof raw !== 'object') {
    const now = new Date().toISOString();
    return {
      id: generateId('onb'),
      studentId: '',
      status: 'not_started',
      startedAt: now,
      steps: createInitialOnboardingSteps(),
      createdAt: now,
      updatedAt: now
    };
  }

  const defaultSteps = createInitialOnboardingSteps();
  const rawSteps: any[] = Array.isArray(raw.steps) ? raw.steps : [];

  // Merge steps ensuring all 6 canonical steps exist in order
  const mergedSteps = defaultSteps.map(defStep => {
    const existing = rawSteps.find(s => s && s.id === defStep.id);
    if (existing) {
      return {
        ...defStep,
        completed: Boolean(existing.completed),
        completedAt: existing.completedAt || (existing.completed ? new Date().toISOString() : undefined),
        notes: existing.notes || ''
      };
    }
    return defStep;
  });

  const now = new Date().toISOString();
  return {
    id: raw.id || generateId('onb'),
    studentId: raw.studentId || '',
    status: (raw.status === 'completed' || raw.status === 'in_progress' || raw.status === 'not_started') ? raw.status : 'in_progress',
    startedAt: raw.startedAt || now,
    completedAt: raw.completedAt,
    steps: mergedSteps,
    customWelcomeMessage: raw.customWelcomeMessage || '',
    welcomeMessageSnapshot: raw.welcomeMessageSnapshot,
    guideSnapshot: raw.guideSnapshot,
    planNameOverride: raw.planNameOverride,
    frequencyOverride: raw.frequencyOverride,
    startDateOverride: raw.startDateOverride,
    notes: raw.notes || '',
    sourceProposalId: raw.sourceProposalId,
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now
  };
}

export async function getStudentOnboardings(): Promise<StudentOnboarding[]> {
  try {
    const rawList = await getAllFromStore<StudentOnboarding>('student_onboardings');
    return (rawList || []).map(normalizeStudentOnboarding);
  } catch (err) {
    recordSanitizedError('getStudentOnboardings_error', err);
    return [];
  }
}

export async function getStudentOnboardingByStudentId(studentId: string): Promise<StudentOnboarding | null> {
  try {
    const all = await getStudentOnboardings();
    return all.find(o => o.studentId === studentId) || null;
  } catch (err) {
    recordSanitizedError('getStudentOnboardingByStudentId_error', err);
    return null;
  }
}

export const getStudentOnboardingFromDb = getStudentOnboardingByStudentId;

export async function saveStudentOnboardingToDb(onboarding: StudentOnboarding): Promise<StudentOnboarding> {
  try {
    const normalized = normalizeStudentOnboarding(onboarding);
    normalized.updatedAt = new Date().toISOString();
    await putInStore('student_onboardings', normalized);
    return normalized;
  } catch (err) {
    recordSanitizedError('saveStudentOnboardingToDb_error', err);
    throw err;
  }
}

export async function deleteStudentOnboardingFromDb(id: string): Promise<void> {
  try {
    await deleteFromStore('student_onboardings', id);
  } catch (err) {
    recordSanitizedError('deleteStudentOnboardingFromDb_error', err);
    throw err;
  }
}

export async function getOnboardingGlobalConfigFromDb(trainer?: Partial<TrainerProfile>): Promise<OnboardingGlobalConfig> {
  try {
    const saved = await getByIdFromStore<{ key: string; value: OnboardingGlobalConfig }>('settings', 'onboarding_config');
    if (saved && saved.value && typeof saved.value === 'object') {
      const def = createDefaultGlobalConfig(trainer);
      return {
        ...def,
        ...saved.value,
        trainerName: saved.value.trainerName || trainer?.name || def.trainerName,
        trainerCref: saved.value.trainerCref || trainer?.cref || def.trainerCref,
        trainerPhone: saved.value.trainerPhone || trainer?.phone || def.trainerPhone,
        trainerEmail: saved.value.trainerEmail || trainer?.email || def.trainerEmail,
        slogan: saved.value.slogan || trainer?.slogan || def.slogan,
        services: Array.isArray(saved.value.services) && saved.value.services.length > 0 ? saved.value.services : def.services,
        technologyItems: Array.isArray(saved.value.technologyItems) && saved.value.technologyItems.length > 0 ? saved.value.technologyItems : def.technologyItems,
        trainerCommitments: Array.isArray(saved.value.trainerCommitments) && saved.value.trainerCommitments.length > 0 ? saved.value.trainerCommitments : def.trainerCommitments,
        studentCommitments: Array.isArray(saved.value.studentCommitments) && saved.value.studentCommitments.length > 0 ? saved.value.studentCommitments : def.studentCommitments,
        journeySteps: Array.isArray(saved.value.journeySteps) && saved.value.journeySteps.length > 0 ? saved.value.journeySteps : def.journeySteps,
        orientations: Array.isArray(saved.value.orientations) ? saved.value.orientations : def.orientations,
        customImages: Array.isArray(saved.value.customImages) ? saved.value.customImages : []
      };
    }
    return createDefaultGlobalConfig(trainer);
  } catch (err) {
    recordSanitizedError('getOnboardingGlobalConfigFromDb_error', err);
    return createDefaultGlobalConfig(trainer);
  }
}

export async function saveOnboardingGlobalConfigToDb(config: OnboardingGlobalConfig): Promise<void> {
  try {
    await putInStore('settings', { key: 'onboarding_config', value: config });
  } catch (err) {
    recordSanitizedError('saveOnboardingGlobalConfigToDb_error', err);
    throw err;
  }
}

// ==========================================
// TFIVE PRO — MODO ALUNO: PERSISTÊNCIA & VÍNCULO (ETAPA 1)
// ==========================================

export async function getStudentAccessByStudentId(studentId: string): Promise<StudentAccess | null> {
  try {
    const list = await getAllFromStore<StudentAccess>('student_access');
    return list.find(a => a.studentId === studentId) || null;
  } catch (err) {
    recordSanitizedError('getStudentAccessByStudentId_error', err);
    return null;
  }
}

export async function saveStudentAccessToDb(access: StudentAccess): Promise<void> {
  try {
    const targetId = access.id || `access_${access.studentId}`;
    const all = await getAllFromStore<StudentAccess>('student_access');
    
    // Remove registros duplicados/conflitantes com o mesmo studentId para garantir integridade
    const conflicting = all.filter(a => a.studentId === access.studentId && a.id !== targetId);
    for (const conf of conflicting) {
      await deleteFromStore('student_access', conf.id).catch(() => {});
    }

    await putInStore('student_access', { ...access, id: targetId });
  } catch (err: any) {
    // Recuperação de emergência contra erros de chave única em navegadores com índice pré-existente
    if (err?.message?.includes('uniqueness') || err?.name === 'ConstraintError') {
      try {
        const all = await getAllFromStore<StudentAccess>('student_access');
        const toClean = all.filter(a => a.studentId === access.studentId);
        for (const item of toClean) {
          await deleteFromStore('student_access', item.id).catch(() => {});
        }
        await putInStore('student_access', { ...access, id: `access_${access.studentId}` });
        return;
      } catch (recoveryErr) {
        console.warn('Falha na recuperação de chave única em student_access:', recoveryErr);
      }
    }
    recordSanitizedError('saveStudentAccessToDb_error', err);
    throw err;
  }
}

export async function getAllStudentAccessFromDb(): Promise<StudentAccess[]> {
  try {
    return await getAllFromStore<StudentAccess>('student_access');
  } catch (err) {
    recordSanitizedError('getAllStudentAccessFromDb_error', err);
    return [];
  }
}

export async function getAppUserByAuthUidFromDb(authUid: string): Promise<AppUser | null> {
  try {
    const list = await getAllFromStore<AppUser>('app_users');
    return list.find(u => u.authUid === authUid) || null;
  } catch (err) {
    recordSanitizedError('getAppUserByAuthUidFromDb_error', err);
    return null;
  }
}

export async function saveAppUserToDb(user: AppUser): Promise<void> {
  try {
    await putInStore('app_users', user);
  } catch (err) {
    recordSanitizedError('saveAppUserToDb_error', err);
    throw err;
  }
}

/**
 * Migration Idempotente e Tolerante (Requisito 8):
 * Percorre os registros pré-existentes no IndexedDB para auditoria.
 * Executar novamente NÃO duplica registros nem altera IDs existentes.
 */
export async function runIdempotentOrganizationMigration(): Promise<{
  migratedCount: number;
  alreadyMigratedCount: number;
  totalRecordsChecked: number;
}> {
  try {
    const storesToCheck = [
      'students',
      'routines',
      'sessions',
      'assessments',
      'schedule',
      'schedule_recurrences',
      'training_cycles',
      'proposals',
      'evolution_reports'
    ];

    let migratedCount = 0;
    let alreadyMigratedCount = 0;
    let totalRecordsChecked = 0;

    for (const storeName of storesToCheck) {
      try {
        const items = await getAllFromStore<any>(storeName);
        for (const item of items) {
          totalRecordsChecked++;
          if (item.organizationId) {
            alreadyMigratedCount++;
          }
        }
      } catch (storeErr) {
        recordSanitizedError(`migration_store_${storeName}`, storeErr);
      }
    }

    return { migratedCount, alreadyMigratedCount, totalRecordsChecked };
  } catch (err) {
    recordSanitizedError('runIdempotentOrganizationMigration_error', err);
    return { migratedCount: 0, alreadyMigratedCount: 0, totalRecordsChecked: 0 };
  }
}

/**
 * Isolamento de Cache no Logout (Requisitos 17 e 18):
 * Quando um aluno faz logout, qualquer estado temporário ou de sessão em cache
 * associado àquele studentId é expurgado do dispositivo.
 * O cache de outros contextos não é afetado e dados do Personal são mantidos.
 */
export async function purgeStudentSessionCache(studentId: string): Promise<void> {
  try {
    if (!studentId) return;
    const active = await getAllFromStore<any>('active_workouts');
    for (const act of active) {
      if (act.studentId === studentId) {
        await deleteFromStore('active_workouts', act.sessionId);
      }
    }
  } catch (err) {
    recordSanitizedError('purgeStudentSessionCache_error', err);
  }
}

/**
 * Normaliza e sanitiza um ActivePlan
 */
export function normalizeActivePlan(raw: any): ActivePlan {
  return {
    id: raw.id || generateId('plan'),
    proposalId: raw.proposalId || '',
    organizationId: raw.organizationId || '',
    type: raw.type || 'individual',
    status: raw.status || 'ACTIVE',
    name: raw.name || 'Plano de Treinamento',
    service: raw.service || 'Personal Training Presencial',
    frequencyPerWeek: raw.frequencyPerWeek || '3x por semana',
    durationMonths: Number(raw.durationMonths) || 12,
    startDate: raw.startDate || new Date().toISOString().split('T')[0],
    endDate: raw.endDate || undefined,
    originalEndDate: raw.originalEndDate || raw.endDate || undefined,
    originalValueCents: Number(raw.originalValueCents) || 0,
    discountCents: Number(raw.discountCents) || 0,
    finalValueCents: Number(raw.finalValueCents) || 0,
    pricingSnapshot: raw.pricingSnapshot || {},
    participantsSnapshot: Array.isArray(raw.participantsSnapshot) ? raw.participantsSnapshot : [],
    conditionsSnapshot: raw.conditionsSnapshot || '',
    participants: Array.isArray(raw.participants) ? raw.participants.map((p: any) => ({
      id: p.id || generateId('part'),
      activePlanId: p.activePlanId || raw.id,
      studentId: p.studentId || undefined,
      nameSnapshot: p.nameSnapshot || '',
      phoneSnapshot: p.phoneSnapshot || undefined,
      emailSnapshot: p.emailSnapshot || undefined,
      role: p.role || 'participant',
      status: p.status || 'ACTIVE',
      joinedAt: p.joinedAt || raw.startDate || new Date().toISOString().split('T')[0],
      leftAt: p.leftAt || undefined
    })) : [],
    suspensionExtendsPlan: raw.suspensionExtendsPlan !== undefined ? Boolean(raw.suspensionExtendsPlan) : true,
    notes: raw.notes || '',
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString()
  };
}

export async function getActivePlans(): Promise<ActivePlan[]> {
  try {
    const raw = await getAllFromStore<ActivePlan>('active_plans');
    return (raw || []).map(normalizeActivePlan);
  } catch (err) {
    recordSanitizedError('getActivePlans_error', err);
    return [];
  }
}

export async function getActivePlanById(id: string): Promise<ActivePlan | null> {
  try {
    const raw = await getByIdFromStore<ActivePlan>('active_plans', id);
    return raw ? normalizeActivePlan(raw) : null;
  } catch (err) {
    recordSanitizedError('getActivePlanById_error', err);
    return null;
  }
}

export async function getActivePlanByProposalId(proposalId: string): Promise<ActivePlan | null> {
  try {
    const all = await getActivePlans();
    return all.find(p => p.proposalId === proposalId && p.status !== 'CANCELED') || all.find(p => p.proposalId === proposalId) || null;
  } catch (err) {
    recordSanitizedError('getActivePlanByProposalId_error', err);
    return null;
  }
}

export async function getActivePlansByStudentId(studentId: string): Promise<ActivePlan[]> {
  try {
    const all = await getActivePlans();
    return all.filter(p => p.participants?.some(part => part.studentId === studentId));
  } catch (err) {
    recordSanitizedError('getActivePlansByStudentId_error', err);
    return [];
  }
}

export async function saveActivePlanToDb(plan: ActivePlan): Promise<void> {
  try {
    const normalized = normalizeActivePlan(plan);
    normalized.updatedAt = new Date().toISOString();
    await putInStore('active_plans', normalized);
  } catch (err) {
    recordSanitizedError('saveActivePlanToDb_error', err);
    throw err;
  }
}

export async function deleteActivePlanFromDb(id: string): Promise<void> {
  try {
    await deleteFromStore('active_plans', id);
  } catch (err) {
    recordSanitizedError('deleteActivePlanFromDb_error', err);
    throw err;
  }
}

// Plan Transfers
export async function getPlanTransfers(activePlanId?: string): Promise<PlanTransfer[]> {
  try {
    const all = await getAllFromStore<PlanTransfer>('plan_transfers');
    if (!activePlanId) return all || [];
    return (all || []).filter(t => t.activePlanId === activePlanId);
  } catch (err) {
    recordSanitizedError('getPlanTransfers_error', err);
    return [];
  }
}

export async function savePlanTransferToDb(transfer: PlanTransfer): Promise<void> {
  try {
    await putInStore('plan_transfers', transfer);
  } catch (err) {
    recordSanitizedError('savePlanTransferToDb_error', err);
    throw err;
  }
}

// Plan Suspensions
export async function getPlanSuspensions(activePlanId?: string): Promise<PlanSuspension[]> {
  try {
    const all = await getAllFromStore<PlanSuspension>('plan_suspensions');
    if (!activePlanId) return all || [];
    return (all || []).filter(s => s.activePlanId === activePlanId);
  } catch (err) {
    recordSanitizedError('getPlanSuspensions_error', err);
    return [];
  }
}

export async function savePlanSuspensionToDb(suspension: PlanSuspension): Promise<void> {
  try {
    await putInStore('plan_suspensions', suspension);
  } catch (err) {
    recordSanitizedError('savePlanSuspensionToDb_error', err);
    throw err;
  }
}

// Plan Audit Logs
export async function getPlanAuditLogs(activePlanId?: string): Promise<PlanAuditLog[]> {
  try {
    const all = await getAllFromStore<PlanAuditLog>('plan_audit_logs');
    const filtered = !activePlanId ? (all || []) : (all || []).filter(l => l.activePlanId === activePlanId);
    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (err) {
    recordSanitizedError('getPlanAuditLogs_error', err);
    return [];
  }
}

export async function savePlanAuditLogToDb(log: PlanAuditLog): Promise<void> {
  try {
    await putInStore('plan_audit_logs', log);
  } catch (err) {
    recordSanitizedError('savePlanAuditLogToDb_error', err);
    throw err;
  }
}

export const getPlanTransfersByPlanId = getPlanTransfers;
export const getPlanSuspensionsByPlanId = getPlanSuspensions;
export const getPlanAuditLogsByPlanId = getPlanAuditLogs;

// ==========================================
// TRAINING MEMORY (CENTRAL HOJE / LEMBRETES)
// ==========================================

export async function getTrainingMemories(): Promise<TrainingMemory[]> {
  try {
    const memories = await getAllFromStore<TrainingMemory>('training_memories');
    return (memories || []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    recordSanitizedError('getTrainingMemories_error', err);
    return [];
  }
}

export async function getTrainingMemoriesByStudentId(studentId: string): Promise<TrainingMemory[]> {
  try {
    const all = await getTrainingMemories();
    return all.filter(m => m.studentId === studentId);
  } catch (err) {
    recordSanitizedError('getTrainingMemoriesByStudentId_error', err);
    return [];
  }
}

export async function saveTrainingMemoryToDb(memory: TrainingMemory): Promise<void> {
  try {
    await putInStore('training_memories', memory);
  } catch (err) {
    recordSanitizedError('saveTrainingMemoryToDb_error', err);
    throw err;
  }
}

export async function resolveTrainingMemoryInDb(id: string): Promise<void> {
  try {
    const memory = await getByIdFromStore<TrainingMemory>('training_memories', id);
    if (memory) {
      const updated: TrainingMemory = {
        ...memory,
        status: 'RESOLVED',
        resolvedAt: new Date().toISOString()
      };
      await putInStore('training_memories', updated);
    }
  } catch (err) {
    recordSanitizedError('resolveTrainingMemoryInDb_error', err);
    throw err;
  }
}




