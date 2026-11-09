import { 
  WorkoutSession, 
  WorkoutSetRecord, 
  PersonalRecord, 
  PhysicalAssessment, 
  PRType, 
  ConsolidatedPR, 
  MuscleGroup,
  RoutineExercise,
  ExerciseGroup,
  PrescriptionType
} from '../types';

/**
 * 1RM Estimado usando a fórmula de Epley:
 * 1RM = Carga * (1 + Reps / 30)
 * Válido para repetições entre 1 e 15.
 * Se reps === 1, 1RM = Carga.
 * Se reps > 15, não extrapola para evitar distorções biomecânicas.
 */
export function calculateEstimated1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return Number(weightKg.toFixed(1));
  if (reps > 15) {
    return Number((weightKg * (1 + 15 / 30)).toFixed(1));
  }
  return Number((weightKg * (1 + reps / 30)).toFixed(1));
}

/**
 * Formata duração em segundos para formato legível (ex: 45s, 10 min, 1h 20m)
 */
export function formatDurationOrSeconds(seconds?: number): string {
  if (seconds === undefined || seconds <= 0) return '0s';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (s === 0) return `${m} min`;
  return `${m}m ${s}s`;
}

/**
 * Formata distância (metros ou km)
 */
export function formatDistance(distance?: number, unit: 'meters' | 'km' = 'meters'): string {
  if (distance === undefined || distance <= 0) return '';
  if (unit === 'km' || distance >= 1000) {
    const kmVal = unit === 'km' ? distance : distance / 1000;
    return `${kmVal.toFixed(1).replace('.', ',')} km`;
  }
  return `${Math.round(distance)} m`;
}

/**
 * Formatação de métrica executada ou prescrita adaptada ao tipo de exercício
 */
export function formatSetMetric(set: Partial<WorkoutSetRecord> | RoutineExercise): string {
  const type: PrescriptionType = (set as any).prescriptionType || (set as any).recordType || 'weight_reps';

  if (type === 'isometric' || type === 'duration') {
    const dur = (set as any).actualDurationSeconds ?? (set as any).durationSeconds ?? (set as any).targetDurationSeconds;
    if (dur !== undefined && dur > 0) {
      return formatDurationOrSeconds(dur);
    }
    return 'Tempo';
  }

  if (type === 'weight_duration') {
    const w = (set as any).weightKg ?? (set as any).lastSuggestedLoad ?? 0;
    const dur = (set as any).actualDurationSeconds ?? (set as any).durationSeconds ?? (set as any).targetDurationSeconds ?? 0;
    if (w > 0 && dur > 0) {
      return `${w} kg • ${formatDurationOrSeconds(dur)}`;
    }
    if (dur > 0) return formatDurationOrSeconds(dur);
    if (w > 0) return `${w} kg`;
    return 'Carga + Tempo';
  }

  if (type === 'distance') {
    const dist = (set as any).actualDistance ?? (set as any).distanceMeters ?? (set as any).targetDistance ?? 0;
    const unit = (set as any).distanceUnit || 'meters';
    return dist > 0 ? formatDistance(dist, unit) : 'Distância';
  }

  if (type === 'duration_distance' || type === 'cardio') {
    const dur = (set as any).actualDurationSeconds ?? (set as any).durationSeconds ?? (set as any).targetDurationSeconds ?? 0;
    const dist = (set as any).actualDistance ?? (set as any).distanceMeters ?? (set as any).targetDistance ?? 0;
    const unit = (set as any).distanceUnit || 'meters';
    const parts: string[] = [];
    if (dur > 0) parts.push(formatDurationOrSeconds(dur));
    if (dist > 0) parts.push(formatDistance(dist, unit));
    return parts.length > 0 ? parts.join(' • ') : 'Cardio';
  }

  if (type === 'reps') {
    const reps = (set as any).actualReps ?? (set as any).targetReps;
    if (reps !== undefined) return `${reps} reps`;
    if ((set as any).targetRepsMin !== undefined) {
      return `${(set as any).targetRepsMin}-${(set as any).targetRepsMax} reps`;
    }
    return 'Repetições';
  }

  // default: weight_reps
  const w = (set as any).weightKg;
  const reps = (set as any).actualReps ?? (set as any).targetReps;
  if (w !== undefined && reps !== undefined) {
    return `${w} kg × ${reps}`;
  }
  if ((set as any).targetRepsMin !== undefined) {
    return `${(set as any).targetRepsMin}-${(set as any).targetRepsMax} reps`;
  }
  return `${w || 0} kg`;
}

/**
 * Formata a prescrição resumida para exibição em fichas e cards
 */
export function formatPrescriptionSummary(ex: RoutineExercise): string {
  const rawType = ex.prescriptionType || ex.recordType || 'weight_reps';
  let type: PrescriptionType = 'weight_reps';
  if (rawType === 'isometry_time' || rawType === 'isometric') type = 'isometric';
  else if (rawType === 'duration_time' || rawType === 'duration') type = 'duration';
  else if (rawType === 'distance_cardio' || rawType === 'distance') type = 'distance';
  else if (rawType === 'bodyweight_reps' || rawType === 'reps') type = 'reps';
  else if (rawType === 'weight_duration') type = 'weight_duration';
  else if (rawType === 'duration_distance') type = 'duration_distance';
  else if (rawType === 'cardio') type = 'cardio';
  else type = 'weight_reps';

  const sets = ex.targetSets || 3;
  
  let metricPart = '';
  if (type === 'isometric' || type === 'duration') {
    const dur = ex.targetDurationSeconds || 30;
    metricPart = formatDurationOrSeconds(dur);
  } else if (type === 'weight_duration') {
    const dur = ex.targetDurationSeconds || 30;
    metricPart = `Carga • ${formatDurationOrSeconds(dur)}`;
  } else if (type === 'distance') {
    metricPart = formatDistance(ex.targetDistance || 200, ex.distanceUnit || 'meters');
  } else if (type === 'duration_distance' || type === 'cardio') {
    const dur = ex.targetDurationSeconds ? formatDurationOrSeconds(ex.targetDurationSeconds) : '';
    const dist = ex.targetDistance ? formatDistance(ex.targetDistance, ex.distanceUnit) : '';
    metricPart = [dur, dist].filter(Boolean).join(' / ') || 'Cardio';
  } else if (type === 'reps') {
    metricPart = ex.targetRepsMin === ex.targetRepsMax 
      ? `${ex.targetRepsMin} reps` 
      : `${ex.targetRepsMin}-${ex.targetRepsMax} reps`;
  } else {
    metricPart = ex.targetRepsMin === ex.targetRepsMax 
      ? `${ex.targetRepsMin} reps` 
      : `${ex.targetRepsMin}-${ex.targetRepsMax} reps`;
  }

  return `${sets} × ${metricPart}`;
}

/**
 * Agrupa exercícios consecutivos em blocos (Bi-Set, Tri-Set, Circuito ou Normal)
 */
export function getWorkoutExerciseGroups(exercises: RoutineExercise[]): ExerciseGroup[] {
  if (!exercises || exercises.length === 0) return [];
  const groups: ExerciseGroup[] = [];
  const processedGroupIds = new Set<string>();

  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    if (ex.groupId && (ex.groupType === 'bi_set' || ex.groupType === 'tri_set' || ex.groupType === 'circuit')) {
      if (!processedGroupIds.has(ex.groupId)) {
        processedGroupIds.add(ex.groupId);
        const groupExercises = exercises.filter(e => e.groupId === ex.groupId);
        
        let defaultName = 'Bi-Set';
        if (ex.groupType === 'tri_set') defaultName = 'Tri-Set';
        else if (ex.groupType === 'circuit') defaultName = 'Circuito';

        groups.push({
          id: ex.groupId,
          type: ex.groupType,
          name: ex.groupName || defaultName,
          order: groups.length + 1,
          rounds: ex.groupRounds || ex.targetSets || 3,
          restBetweenExercises: ex.restBetweenExercises ?? 0,
          restAfterRound: ex.restAfterRound ?? ex.restSeconds ?? 60,
          exercises: groupExercises
        });
      }
    } else {
      groups.push({
        id: ex.id,
        type: 'normal',
        name: ex.exerciseName,
        order: groups.length + 1,
        rounds: ex.targetSets || 3,
        restBetweenExercises: 0,
        restAfterRound: ex.restSeconds || 60,
        exercises: [ex]
      });
    }
  }

  return groups;
}

/**
 * Jackson Pollock 3 & 7 Dobras Cutâneas e Equação de Siri para Composição Corporal
 */
export function calculateBodyComposition(
  gender: 'male' | 'female',
  age: number,
  weightKg: number,
  heightCm: number,
  skinfolds: {
    chest?: number;
    midaxillary?: number;
    triceps?: number;
    subscapular?: number;
    abdominal?: number;
    suprailiac?: number;
    thigh?: number;
  },
  protocol: 'jackson_pollock_3' | 'jackson_pollock_7' = 'jackson_pollock_7'
): { bodyFatPercentage: number; fatMassKg: number; leanMassKg: number; bmi: number } {
  const heightM = heightCm > 0 ? heightCm / 100 : 1.75;
  const bmi = weightKg > 0 && heightM > 0 ? Number((weightKg / (heightM * heightM)).toFixed(1)) : 0;

  let bodyDensity = 1.05;

  if (protocol === 'jackson_pollock_7') {
    const sum7 =
      (skinfolds.chest || 0) +
      (skinfolds.midaxillary || 0) +
      (skinfolds.triceps || 0) +
      (skinfolds.subscapular || 0) +
      (skinfolds.abdominal || 0) +
      (skinfolds.suprailiac || 0) +
      (skinfolds.thigh || 0);

    if (sum7 > 0) {
      if (gender === 'male') {
        bodyDensity =
          1.112 -
          0.00043499 * sum7 +
          0.00000055 * sum7 * sum7 -
          0.00028826 * age;
      } else {
        bodyDensity =
          1.097 -
          0.00046971 * sum7 +
          0.00000056 * sum7 * sum7 -
          0.00012828 * age;
      }
    }
  } else {
    // Pollock 3 Dobras
    if (gender === 'male') {
      // Homens: Peitoral, Abdômen, Coxa
      const sum3 = (skinfolds.chest || 0) + (skinfolds.abdominal || 0) + (skinfolds.thigh || 0);
      if (sum3 > 0) {
        bodyDensity =
          1.10938 -
          0.0008267 * sum3 +
          0.0000016 * sum3 * sum3 -
          0.0002574 * age;
      }
    } else {
      // Mulheres: Tríceps, Supra-ilíaca, Coxa
      const sum3 = (skinfolds.triceps || 0) + (skinfolds.suprailiac || 0) + (skinfolds.thigh || 0);
      if (sum3 > 0) {
        bodyDensity =
          1.0994921 -
          0.0009929 * sum3 +
          0.0000023 * sum3 * sum3 -
          0.0001392 * age;
      }
    }
  }

  // Equação de Siri: %Gordura = ((4.95 / Densidade) - 4.50) * 100
  let bodyFatPercentage = ((4.95 / bodyDensity) - 4.5) * 100;
  if (isNaN(bodyFatPercentage) || bodyFatPercentage < 3) bodyFatPercentage = 3;
  if (bodyFatPercentage > 60) bodyFatPercentage = 60;
  bodyFatPercentage = Number(bodyFatPercentage.toFixed(1));

  const fatMassKg = Number(((weightKg * bodyFatPercentage) / 100).toFixed(1));
  const leanMassKg = Number((weightKg - fatMassKg).toFixed(1));

  return { bodyFatPercentage, fatMassKg, leanMassKg, bmi };
}

/**
 * Cálculo simplificado para bioimpedância direta
 */
export function calculateSimpleBodyComposition(
  weightKg: number,
  heightCm: number,
  bodyFatPercentage: number
): { fatMassKg: number; leanMassKg: number; bmi: number } {
  const heightM = heightCm > 0 ? heightCm / 100 : 1.75;
  const bmi = weightKg > 0 && heightM > 0 ? Number((weightKg / (heightM * heightM)).toFixed(1)) : 0;
  const clampedBF = Math.max(3, Math.min(60, bodyFatPercentage));
  const fatMassKg = Number(((weightKg * clampedBF) / 100).toFixed(1));
  const leanMassKg = Number((weightKg - fatMassKg).toFixed(1));

  return { fatMassKg, leanMassKg, bmi };
}

/**
 * Estrutura de Recordes Pessoais Históricos por Exercício
 */
export interface ExerciseHistoricalStats {
  exerciseId: string;
  exerciseName: string;
  maxWeight: number;
  maxRepsAtMaxWeight: number;
  maxEstimated1RM: number;
  maxSetVolume: number;
  maxSessionVolume: number;
  bestReps: number;
  maxDuration?: number;
  maxDistance?: number;
  date: string;
}

/**
 * Mapeia todos os recordes históricos reais de um aluno
 */
export function calculateAllTimePRs(
  sessions: WorkoutSession[] = [], 
  studentId?: string
): Map<string, ExerciseHistoricalStats> {
  const prMap = new Map<string, ExerciseHistoricalStats>();
  const safeSessions = Array.isArray(sessions) ? sessions : [];

  const relevantSessions = studentId 
    ? safeSessions.filter(s => s && s.studentId === studentId && (s.status === 'completed' || s.status === 'in_progress'))
    : safeSessions.filter(s => s && (s.status === 'completed' || s.status === 'in_progress'));

  for (const session of relevantSessions) {
    const sessionExerciseVolume = new Map<string, number>();
    const sets = Array.isArray(session?.sets) ? session.sets : [];

    for (const set of sets) {
      if (!set || set.isWarmup || set.status === 'skipped' || !set.exerciseId) continue;
      
      const type = set.prescriptionType || set.recordType || 'weight_reps';
      const isWeightBearing = type === 'weight_reps' || (!type && (set.weightKg || 0) > 0);
      const setVol = isWeightBearing && (set.weightKg || 0) > 0 && (set.actualReps || 0) > 0 
        ? set.weightKg * set.actualReps 
        : 0;
      
      if (setVol > 0) {
        sessionExerciseVolume.set(
          set.exerciseId, 
          (sessionExerciseVolume.get(set.exerciseId) || 0) + setVol
        );
      }

      const est1RM = isWeightBearing && (set.weightKg || 0) > 0 && (set.actualReps || 0) > 0 
        ? calculateEstimated1RM(set.weightKg, set.actualReps) 
        : 0;
      
      const dur = set.actualDurationSeconds ?? set.durationSeconds ?? 0;
      const dist = set.actualDistance ?? set.distanceMeters ?? 0;
      const current = prMap.get(set.exerciseId);

      if (!current) {
        prMap.set(set.exerciseId, {
          exerciseId: set.exerciseId,
          exerciseName: set.exerciseName || 'Exercício',
          maxWeight: isWeightBearing ? Math.max(0, set.weightKg || 0) : 0,
          maxRepsAtMaxWeight: isWeightBearing ? Math.max(0, set.actualReps || 0) : 0,
          maxEstimated1RM: est1RM,
          maxSetVolume: setVol,
          maxSessionVolume: setVol,
          bestReps: Math.max(0, set.actualReps || 0),
          maxDuration: dur > 0 ? dur : undefined,
          maxDistance: dist > 0 ? dist : undefined,
          date: (session.startTime || '').split('T')[0] || ''
        });
      } else {
        const isNewMaxWeight = isWeightBearing && (set.weightKg || 0) > current.maxWeight;
        const maxWeight = isWeightBearing ? Math.max(current.maxWeight, set.weightKg || 0) : current.maxWeight;
        const maxRepsAtMaxWeight = isNewMaxWeight 
          ? (set.actualReps || 0) 
          : (isWeightBearing && set.weightKg === current.maxWeight ? Math.max(current.maxRepsAtMaxWeight, set.actualReps || 0) : current.maxRepsAtMaxWeight);
        const maxEstimated1RM = Math.max(current.maxEstimated1RM, est1RM);
        const maxSetVolume = Math.max(current.maxSetVolume, setVol);
        const bestReps = Math.max(current.bestReps, set.actualReps || 0);
        const maxDuration = Math.max(current.maxDuration || 0, dur);
        const maxDistance = Math.max(current.maxDistance || 0, dist);

        prMap.set(set.exerciseId, {
          exerciseId: set.exerciseId,
          exerciseName: set.exerciseName || current.exerciseName,
          maxWeight,
          maxRepsAtMaxWeight,
          maxEstimated1RM,
          maxSetVolume,
          maxSessionVolume: current.maxSessionVolume,
          bestReps,
          maxDuration: maxDuration > 0 ? maxDuration : undefined,
          maxDistance: maxDistance > 0 ? maxDistance : undefined,
          date: (session.startTime || '').split('T')[0] || current.date
        });
      }
    }

    // Atualiza volume máximo da sessão por exercício
    sessionExerciseVolume.forEach((vol, exId) => {
      const stats = prMap.get(exId);
      if (stats && vol > stats.maxSessionVolume) {
        stats.maxSessionVolume = vol;
      }
    });
  }

  return prMap;
}

/**
 * Avalia se uma série representa recorde pessoal real e quais categorias
 */
export function evaluateSetForPR(
  set: WorkoutSetRecord,
  studentPastSessions: WorkoutSession[]
): { isPR: boolean; prTypes: PRType[]; metricLabel: string; prevValue: number; newValue: number } {
  if (set.isWarmup || set.status === 'skipped') {
    return { isPR: false, prTypes: [], metricLabel: '', prevValue: 0, newValue: 0 };
  }

  const type = set.prescriptionType || set.recordType || 'weight_reps';
  const prMap = calculateAllTimePRs(studentPastSessions, set.studentId);
  const currentPR = prMap.get(set.exerciseId);

  const prTypes: PRType[] = [];
  const est1RM = type === 'weight_reps' && set.weightKg > 0 && set.actualReps > 0 
    ? calculateEstimated1RM(set.weightKg, set.actualReps) 
    : 0;
  const setVolume = type === 'weight_reps' && set.weightKg > 0 && set.actualReps > 0 
    ? set.weightKg * set.actualReps 
    : 0;
  const duration = set.actualDurationSeconds ?? set.durationSeconds ?? 0;
  const distance = set.actualDistance ?? set.distanceMeters ?? 0;

  // CASO 1: Exercícios por Tempo / Isometria
  if (type === 'duration' || type === 'isometric') {
    if (duration <= 0) return { isPR: false, prTypes: [], metricLabel: '', prevValue: 0, newValue: 0 };
    if (!currentPR || !currentPR.maxDuration) {
      return {
        isPR: true,
        prTypes: ['duration'],
        metricLabel: `Primeiro registro (${formatDurationOrSeconds(duration)})`,
        prevValue: 0,
        newValue: duration
      };
    }
    if (duration > (currentPR.maxDuration || 0)) {
      return {
        isPR: true,
        prTypes: ['duration'],
        metricLabel: `Novo PR de Duração (${formatDurationOrSeconds(duration)})`,
        prevValue: currentPR.maxDuration || 0,
        newValue: duration
      };
    }
    return { isPR: false, prTypes: [], metricLabel: '', prevValue: 0, newValue: 0 };
  }

  // CASO 2: Exercícios por Distância
  if (type === 'distance') {
    if (distance <= 0) return { isPR: false, prTypes: [], metricLabel: '', prevValue: 0, newValue: 0 };
    if (!currentPR || !currentPR.maxDistance) {
      return {
        isPR: true,
        prTypes: ['distance'],
        metricLabel: `Primeiro registro (${formatDistance(distance, set.distanceUnit)})`,
        prevValue: 0,
        newValue: distance
      };
    }
    if (distance > (currentPR.maxDistance || 0)) {
      return {
        isPR: true,
        prTypes: ['distance'],
        metricLabel: `Novo PR de Distância (${formatDistance(distance, set.distanceUnit)})`,
        prevValue: currentPR.maxDistance || 0,
        newValue: distance
      };
    }
    return { isPR: false, prTypes: [], metricLabel: '', prevValue: 0, newValue: 0 };
  }

  // CASO 3: Apenas Repetições (Peso Corporal)
  if (type === 'reps') {
    if (set.actualReps <= 0) return { isPR: false, prTypes: [], metricLabel: '', prevValue: 0, newValue: 0 };
    if (!currentPR || !currentPR.bestReps) {
      return {
        isPR: true,
        prTypes: ['reps'],
        metricLabel: `Primeiro registro (${set.actualReps} reps)`,
        prevValue: 0,
        newValue: set.actualReps
      };
    }
    if (set.actualReps > currentPR.bestReps) {
      return {
        isPR: true,
        prTypes: ['reps'],
        metricLabel: `Novo PR de Repetições (${set.actualReps} reps)`,
        prevValue: currentPR.bestReps,
        newValue: set.actualReps
      };
    }
    return { isPR: false, prTypes: [], metricLabel: '', prevValue: 0, newValue: 0 };
  }

  // CASO 4: Carga + Tempo (ex: Farmer Carry)
  if (type === 'weight_duration') {
    if (set.weightKg <= 0 && duration <= 0) return { isPR: false, prTypes: [], metricLabel: '', prevValue: 0, newValue: 0 };
    if (!currentPR) {
      return {
        isPR: true,
        prTypes: ['weight_duration'],
        metricLabel: `Primeiro registro (${set.weightKg} kg • ${formatDurationOrSeconds(duration)})`,
        prevValue: 0,
        newValue: set.weightKg
      };
    }
    if (set.weightKg > currentPR.maxWeight) {
      return {
        isPR: true,
        prTypes: ['weight_duration'],
        metricLabel: `Novo PR de Carga (${set.weightKg} kg • ${formatDurationOrSeconds(duration)})`,
        prevValue: currentPR.maxWeight,
        newValue: set.weightKg
      };
    }
    return { isPR: false, prTypes: [], metricLabel: '', prevValue: 0, newValue: 0 };
  }

  // CASO 5: Carga + Repetições Tradicional (Musculação)
  if (!currentPR) {
    if (set.weightKg > 0 || set.actualReps > 0) {
      if (set.weightKg > 0) prTypes.push('weight');
      if (set.actualReps > 0) prTypes.push('reps');
      if (setVolume > 0) prTypes.push('set_volume');
      if (est1RM > 0) prTypes.push('estimated_1rm');
      return {
        isPR: true,
        prTypes,
        metricLabel: 'Primeiro registro de carga',
        prevValue: 0,
        newValue: set.weightKg
      };
    }
    return { isPR: false, prTypes: [], metricLabel: '', prevValue: 0, newValue: 0 };
  }

  let metricLabel = '';
  let prevValue = 0;
  let newValue = 0;

  // 1. PR de Carga Absoluta
  if (set.weightKg > currentPR.maxWeight) {
    prTypes.push('weight');
    metricLabel = `Novo PR de Carga (+${(set.weightKg - currentPR.maxWeight).toFixed(1)} kg)`;
    prevValue = currentPR.maxWeight;
    newValue = set.weightKg;
  }

  // 2. PR de 1RM Estimado
  if (est1RM > currentPR.maxEstimated1RM && set.actualReps <= 15) {
    prTypes.push('estimated_1rm');
    if (!metricLabel) {
      metricLabel = `Novo PR de 1RM Estimado (${est1RM} kg)`;
      prevValue = currentPR.maxEstimated1RM;
      newValue = est1RM;
    }
  }

  // 3. PR de Volume de Série (Carga x Repetições)
  if (setVolume > currentPR.maxSetVolume && set.weightKg > 0) {
    prTypes.push('set_volume');
    if (!metricLabel) {
      metricLabel = `Novo PR de Volume de Série (${setVolume} kg)`;
      prevValue = currentPR.maxSetVolume;
      newValue = setVolume;
    }
  }

  // 4. PR de Repetições em Carga Igual ou Maior
  if (set.weightKg >= currentPR.maxWeight && set.actualReps > currentPR.maxRepsAtMaxWeight) {
    prTypes.push('reps');
    if (!metricLabel) {
      metricLabel = `Novo PR de Repetições (${set.actualReps} reps com ${set.weightKg} kg)`;
      prevValue = currentPR.maxRepsAtMaxWeight;
      newValue = set.actualReps;
    }
  }

  return {
    isPR: prTypes.length > 0,
    prTypes,
    metricLabel,
    prevValue,
    newValue
  };
}

/**
 * Resumo da evolução exercício a exercício pós-treino
 */
export interface ExerciseEvolutionSummary {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  previousWeight: number;
  previousReps: number;
  previous1RM: number;
  todayWeight: number;
  todayReps: number;
  today1RM: number;
  weightDelta: number;
  percentageDelta: number;
  hasPrevious: boolean;
  isPR: boolean;
  prTypes: PRType[];
}

export function computeSessionEvolution(
  currentSession: WorkoutSession,
  allSessions: WorkoutSession[] = []
): {
  evolutions: ExerciseEvolutionSummary[];
  totalPRs: number;
  exercisesEvolvedCount: number;
  volumeChangePercent: number;
} {
  const safeAllSessions = Array.isArray(allSessions) ? allSessions : [];
  // Busca histórico anterior do mesmo aluno ordenado por data
  const pastSessions = safeAllSessions
    .filter(s => s && s.studentId === currentSession?.studentId && s.id !== currentSession?.id && (s.status === 'completed' || s.status === 'in_progress'))
    .sort((a, b) => new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime());

  const evolutions: ExerciseEvolutionSummary[] = [];
  let totalPRs = 0;
  let exercisesEvolved = 0;

  // Agrupa séries válidas de hoje por exercício (melhor série por carga / 1RM)
  const todayExerciseMap = new Map<string, WorkoutSetRecord>();
  const currentSets = Array.isArray(currentSession?.sets) ? currentSession.sets : [];
  for (const set of currentSets) {
    if (!set || set.isWarmup || set.status === 'skipped' || !set.exerciseId) continue;
    const existing = todayExerciseMap.get(set.exerciseId);
    if (!existing || (set.weightKg || 0) > (existing.weightKg || 0) || ((set.weightKg || 0) === (existing.weightKg || 0) && (set.actualReps || 0) > (existing.actualReps || 0))) {
      todayExerciseMap.set(set.exerciseId, set);
    }
  }

  // Para cada exercício executado hoje, localiza a última execução real anterior desse aluno
  todayExerciseMap.forEach((todaySet, exerciseId) => {
    let lastPastSet: WorkoutSetRecord | null = null;

    for (const s of pastSessions) {
      const pastSets = Array.isArray(s?.sets) ? s.sets : [];
      const match = pastSets.find(st => st && st.exerciseId === exerciseId && !st.isWarmup && st.status !== 'skipped');
      if (match) {
        lastPastSet = match;
        break;
      }
    }

    const today1RM = calculateEstimated1RM(todaySet.weightKg, todaySet.actualReps);
    const prevWeight = lastPastSet ? lastPastSet.weightKg : 0;
    const prevReps = lastPastSet ? lastPastSet.actualReps : 0;
    const prev1RM = lastPastSet ? calculateEstimated1RM(lastPastSet.weightKg, lastPastSet.actualReps) : 0;
    const hasPrevious = Boolean(lastPastSet);

    const weightDelta = hasPrevious ? Number((todaySet.weightKg - prevWeight).toFixed(1)) : 0;
    const percentageDelta = (hasPrevious && prevWeight > 0)
      ? Number((((todaySet.weightKg - prevWeight) / prevWeight) * 100).toFixed(1))
      : 0;

    const prEval = evaluateSetForPR(todaySet, pastSessions);
    if (prEval.isPR) totalPRs++;

    if (hasPrevious && (weightDelta > 0 || (weightDelta === 0 && todaySet.actualReps > prevReps))) {
      exercisesEvolved++;
    }

    evolutions.push({
      exerciseId,
      exerciseName: todaySet.exerciseName,
      muscleGroup: todaySet.muscleGroup,
      previousWeight: prevWeight,
      previousReps: prevReps,
      previous1RM: prev1RM,
      todayWeight: todaySet.weightKg,
      todayReps: todaySet.actualReps,
      today1RM,
      weightDelta,
      percentageDelta,
      hasPrevious,
      isPR: prEval.isPR,
      prTypes: prEval.prTypes
    });
  });

  // Volume delta vs última sessão geral concluída
  const lastSession = pastSessions[0];
  const previousTotalVol = lastSession?.totalVolume || 0;
  const currentTotalVol = currentSession.totalVolume || 0;
  const volumeChangePercent = (previousTotalVol > 0 && currentTotalVol > 0)
    ? Number((((currentTotalVol - previousTotalVol) / previousTotalVol) * 100).toFixed(1))
    : 0;

  const consolidatedPRs = getConsolidatedWorkoutPRs(currentSession, pastSessions);

  return {
    evolutions,
    totalPRs: consolidatedPRs.length,
    exercisesEvolvedCount: exercisesEvolved,
    volumeChangePercent
  };
}

/**
 * Consolida todos os recordes pessoais batidos em uma sessão por exercício.
 * Garante que múltiplos PRs no mesmo exercício (ex: 70kg -> 72.5kg -> 75kg)
 * sejam consolidados em um único card com a melhor marca e todos os selos de PR atingidos.
 */
export function getConsolidatedWorkoutPRs(
  session: WorkoutSession,
  allSessions: WorkoutSession[] = []
): ConsolidatedPR[] {
  const pastSessions = allSessions.filter(
    s => s.studentId === session.studentId && s.id !== session.id && (s.status === 'completed' || s.status === 'in_progress')
  );

  const historicalPRMap = calculateAllTimePRs(pastSessions, session.studentId);
  const consolidatedList: ConsolidatedPR[] = [];

  // Agrupa séries válidas concluídas desta sessão por exerciseId
  const validSets = (session.sets || []).filter(s => !s.isWarmup && s.status !== 'skipped');
  const exerciseSetsMap = new Map<string, WorkoutSetRecord[]>();

  for (const set of validSets) {
    const list = exerciseSetsMap.get(set.exerciseId) || [];
    list.push(set);
    exerciseSetsMap.set(set.exerciseId, list);
  }

  exerciseSetsMap.forEach((sets, exerciseId) => {
    if (sets.length === 0) return;
    const firstSet = sets[0];
    const exerciseName = firstSet.exerciseName;
    const muscleGroup = firstSet.muscleGroup;

    // Estatísticas de pico alcançadas nesta sessão
    let maxWeight = 0;
    let maxRepsAtMaxWeight = 0;
    let maxEstimated1RM = 0;
    let maxSetVolume = 0;
    let totalExerciseVolume = 0;
    let bestReps = 0;

    for (const s of sets) {
      const setVol = s.weightKg * s.actualReps;
      totalExerciseVolume += setVol;
      const est1RM = calculateEstimated1RM(s.weightKg, s.actualReps);

      if (s.weightKg > maxWeight) {
        maxWeight = s.weightKg;
        maxRepsAtMaxWeight = s.actualReps;
      } else if (s.weightKg === maxWeight && s.actualReps > maxRepsAtMaxWeight) {
        maxRepsAtMaxWeight = s.actualReps;
      }

      if (est1RM > maxEstimated1RM) {
        maxEstimated1RM = est1RM;
      }
      if (setVol > maxSetVolume) {
        maxSetVolume = setVol;
      }
      if (s.actualReps > bestReps) {
        bestReps = s.actualReps;
      }
    }

    const currentPR = historicalPRMap.get(exerciseId);
    const prTypes: PRType[] = [];
    const badges: { type: PRType; label: string; detail?: string }[] = [];

    if (!currentPR) {
      // Primeiro registro do exercício
      if (maxWeight > 0 || bestReps > 0) {
        if (maxWeight > 0) prTypes.push('weight');
        if (maxEstimated1RM > 0) prTypes.push('estimated_1rm');
        if (maxSetVolume > 0) prTypes.push('set_volume');
        if (bestReps > 0) prTypes.push('reps');

        badges.push({
          type: 'weight',
          label: 'PR de Carga',
          detail: `${maxWeight} kg (1ª marca)`
        });
        if (maxEstimated1RM > 0) {
          badges.push({
            type: 'estimated_1rm',
            label: 'PR de 1RM Estimado',
            detail: `${maxEstimated1RM} kg`
          });
        }
      }
    } else {
      // 1. PR de Carga Absoluta
      if (maxWeight > currentPR.maxWeight) {
        prTypes.push('weight');
        const diff = (maxWeight - currentPR.maxWeight).toFixed(1).replace('.0', '');
        badges.push({
          type: 'weight',
          label: 'PR de Carga',
          detail: `+${diff} kg`
        });
      }

      // 2. PR de 1RM Estimado
      if (maxEstimated1RM > currentPR.maxEstimated1RM && maxEstimated1RM > 0) {
        prTypes.push('estimated_1rm');
        badges.push({
          type: 'estimated_1rm',
          label: 'PR de 1RM Estimado',
          detail: `${maxEstimated1RM} kg`
        });
      }

      // 3. PR de Volume de Série (Carga x Reps)
      if (maxSetVolume > currentPR.maxSetVolume && maxSetVolume > 0) {
        prTypes.push('set_volume');
        badges.push({
          type: 'set_volume',
          label: 'PR de Volume de Série',
          detail: `${formatWeight(maxSetVolume)}`
        });
      }

      // 4. PR de Volume Total do Exercício
      if (totalExerciseVolume > currentPR.maxSessionVolume && totalExerciseVolume > 0) {
        prTypes.push('exercise_volume');
        badges.push({
          type: 'exercise_volume',
          label: 'PR de Volume Total',
          detail: `${formatWeight(totalExerciseVolume)}`
        });
      }

      // 5. PR de Repetições em Carga Igual ou Maior
      if (maxWeight >= currentPR.maxWeight && maxRepsAtMaxWeight > currentPR.maxRepsAtMaxWeight) {
        prTypes.push('reps');
        badges.push({
          type: 'reps',
          label: 'PR de Repetições',
          detail: `${maxRepsAtMaxWeight} reps com ${maxWeight} kg`
        });
      }
    }

    if (prTypes.length > 0) {
      let previousSummary: string | undefined;
      if (currentPR) {
        previousSummary = `Anterior: ${currentPR.maxWeight} kg × ${currentPR.maxRepsAtMaxWeight} reps (1RM est: ${currentPR.maxEstimated1RM} kg)`;
      } else {
        previousSummary = 'Primeiro registro de referência';
      }

      consolidatedList.push({
        exerciseId,
        exerciseName,
        muscleGroup,
        bestWeight: maxWeight,
        bestReps: maxRepsAtMaxWeight,
        estimated1RM: maxEstimated1RM,
        totalVolume: totalExerciseVolume,
        bestSetVolume: maxSetVolume,
        prTypes,
        badges,
        metricHeadline: `${maxWeight > 0 ? `${maxWeight} kg` : ''}${maxWeight > 0 && maxRepsAtMaxWeight > 0 ? ' × ' : ''}${maxRepsAtMaxWeight > 0 ? `${maxRepsAtMaxWeight}` : ''}`.trim() || `${maxEstimated1RM} kg 1RM`,
        previousSummary
      });
    }
  });

  return consolidatedList;
}


/**
 * Formatação padrão brasileira de tempo (MM:SS ou HH:MM:SS)
 */
export function formatTimer(totalSeconds: number): string {
  const safeSec = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(safeSec / 3600);
  const minutes = Math.floor((safeSec % 3600) / 60);
  const seconds = safeSec % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Formatação de peso em português com vírgula (ex: 62,5 kg ou 1,20 t)
 */
export function formatWeight(kg: number): string {
  const safeKg = Math.max(0, Number(kg) || 0);
  if (safeKg >= 1000) {
    return `${(safeKg / 1000).toFixed(2).replace('.', ',')} t`;
  }
  return `${safeKg.toFixed(1).replace('.', ',')} kg`;
}

/**
 * Formatação de percentual em padrão brasileiro (ex: +8,3% ou -2,1%)
 */
export function formatPercent(pct: number): string {
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1).replace('.', ',')}%`;
}

/**
 * Formatação de data em padrão brasileiro DD/MM/AAAA
 */
export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('T')[0].split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

/**
 * Calcula a Densidade de Treino em kg/min (Pace da musculação)
 * Densidade = Volume Total (kg) / Duração (minutos)
 * Se duração for zero ou volume for zero, retorna 0.
 */
export function calculateWorkoutDensity(volumeKg: number, durationSecondsOrMinutes: number, isSeconds = true): number {
  const safeVol = Math.max(0, Number(volumeKg) || 0);
  const minutes = isSeconds ? Math.max(0, durationSecondsOrMinutes) / 60 : Math.max(0, durationSecondsOrMinutes);
  if (safeVol <= 0 || minutes <= 0.1) return 0;
  return Number((safeVol / minutes).toFixed(0));
}

/**
 * Formata a duração da sessão para formato amigável (ex: 48 min ou 1h 18min)
 */
export function formatWorkoutDuration(durationSeconds: number): string {
  const safeSec = Math.max(0, Math.floor(durationSeconds || 0));
  const totalMinutes = Math.floor(safeSec / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes > 0 ? `${minutes}min` : ''}`.trim();
  }
  return `${Math.max(1, minutes)} min`;
}

/**
 * Formata volume em toneladas ou quilogramas de forma expressiva
 */
export function formatTonnesOrKg(volumeKg: number): string {
  const safeKg = Math.max(0, Number(volumeKg) || 0);
  if (safeKg >= 1000) {
    return `${(safeKg / 1000).toFixed(2).replace('.', ',')} t`;
  }
  return `${safeKg.toLocaleString('pt-BR')} kg`;
}

/**
 * Gera frase de impacto dinâmica baseada em dados reais da sessão
 */
export function generateWorkoutHeadline(
  prsCount: number, 
  totalVolume: number, 
  totalSets: number,
  densityKgMin: number
): string {
  if (prsCount > 0) {
    return prsCount === 1 ? 'NOVO RECORDE REGISTRADO' : `${prsCount} NOVOS RECORDES`;
  }
  if (totalVolume >= 8000) {
    return `${(totalVolume / 1000).toFixed(1).replace('.', ',')} TONELADAS MOVIMENTADAS`;
  }
  if (densityKgMin >= 150) {
    return 'ALTA DENSIDADE DE CARGA';
  }
  if (totalSets >= 20) {
    return `${totalSets} SÉRIES CONCLUÍDAS`;
  }
  return 'TREINO DE ALTA PERFORMANCE';
}

/**
 * Compara duas avaliações físicas consecutivas e calcula deltas reais
 */
export function calculateAssessmentComparison(
  latest: PhysicalAssessment,
  previous: PhysicalAssessment
): {
  latest: PhysicalAssessment;
  previous: PhysicalAssessment;
  daysBetween: number;
  deltas: {
    weightKg: number;
    bodyFatPercentage: number;
    leanMassKg: number;
    fatMassKg: number;
    bmi: number;
  };
} {
  const d1 = new Date(latest.date).getTime();
  const d2 = new Date(previous.date).getTime();
  const daysBetween = Math.max(0, Math.round(Math.abs(d1 - d2) / (1000 * 60 * 60 * 24)));

  return {
    latest,
    previous,
    daysBetween,
    deltas: {
      weightKg: Number((latest.weightKg - previous.weightKg).toFixed(1)),
      bodyFatPercentage: Number((latest.bodyFatPercentage - previous.bodyFatPercentage).toFixed(1)),
      leanMassKg: Number(((latest.leanMassKg || 0) - (previous.leanMassKg || 0)).toFixed(1)),
      fatMassKg: Number(((latest.fatMassKg || 0) - (previous.fatMassKg || 0)).toFixed(1)),
      bmi: Number(((latest.bmi || 0) - (previous.bmi || 0)).toFixed(1))
    }
  };
}
