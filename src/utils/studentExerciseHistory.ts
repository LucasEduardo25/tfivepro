import { WorkoutSession, WorkoutSetRecord } from '../types';
import { calculateEstimated1RM } from './calculations';

export interface ExerciseHistorySet {
  setNumber: number;
  weightKg?: number;
  reps?: number;
  durationSeconds?: number;
  distance?: number;
  rpe?: number;
  isWarmup?: boolean;
}

export interface ExerciseSessionHistory {
  sessionId: string;
  date: string;
  rawDate: string;
  routineName?: string;
  workoutLetter?: string;
  sets: ExerciseHistorySet[];
  maxWeightKg?: number;
  bestSetSummary?: string; // e.g. "80 kg × 10"
  hasPR?: boolean;
}

export interface StudentExerciseHistoryResult {
  hasHistory: boolean;
  totalExecutions: number;
  lastExecution?: ExerciseSessionHistory;
  personalRecord?: {
    weightKg: number;
    reps: number;
    estimated1RM: number;
    date: string;
  };
  recentSessions: ExerciseSessionHistory[];
}

/**
 * Normalizes text for comparison (ignoring accents and case)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Formats ISO date or date string to readable PT-BR short date (e.g. "20 Ago 2026")
 */
function formatShortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

/**
 * Retrieves real historical execution data for a student on a specific exercise.
 * NEVER fabricates or estimates non-existent data.
 */
export function getStudentExerciseHistory(
  studentId: string | undefined,
  exerciseId: string | undefined,
  exerciseName: string | undefined,
  sessions: WorkoutSession[] | undefined
): StudentExerciseHistoryResult {
  if (!studentId || !sessions || sessions.length === 0) {
    return { hasHistory: false, totalExecutions: 0, recentSessions: [] };
  }

  const normalizedTargetName = exerciseName ? normalizeString(exerciseName) : '';

  // 1. Filter completed sessions for this student
  const studentSessions = sessions.filter(s => {
    if (s.studentId !== studentId) return false;
    // Must have at least some completed sets or be marked completed
    return s.status === 'completed' || Boolean(s.endTime) || (s.sets && s.sets.some(st => st.status === 'completed' || Boolean(st.completedAt)));
  });

  if (studentSessions.length === 0) {
    return { hasHistory: false, totalExecutions: 0, recentSessions: [] };
  }

  // 2. Extract matching sessions with matching sets
  const historyList: ExerciseSessionHistory[] = [];
  let bestPR: { weightKg: number; reps: number; estimated1RM: number; date: string } | undefined;

  // Sort sessions chronologically descending (newest first)
  const sortedSessions = [...studentSessions].sort((a, b) => {
    const timeA = new Date(a.startTime || 0).getTime();
    const timeB = new Date(b.startTime || 0).getTime();
    return timeB - timeA;
  });

  for (const session of sortedSessions) {
    if (!session.sets || session.sets.length === 0) continue;

    // Filter sets for this exercise
    const matchingSets = session.sets.filter((st: WorkoutSetRecord) => {
      if (st.status === 'skipped') return false; // skip skipped sets
      if (exerciseId && st.exerciseId === exerciseId) return true;
      if (normalizedTargetName && st.exerciseName && normalizeString(st.exerciseName) === normalizedTargetName) return true;
      return false;
    });

    if (matchingSets.length === 0) continue;

    // Extract set details
    const parsedSets: ExerciseHistorySet[] = matchingSets.map((st, idx) => ({
      setNumber: st.setNumber || idx + 1,
      weightKg: st.weightKg,
      reps: st.actualReps ?? st.targetReps,
      durationSeconds: st.actualDurationSeconds ?? st.durationSeconds ?? st.targetDurationSeconds,
      distance: st.actualDistance ?? st.distanceMeters ?? st.targetDistance,
      rpe: st.rpe ?? undefined,
      isWarmup: st.isWarmup
    }));

    // Find best set of this session
    let maxWeight = 0;
    let bestSet: ExerciseHistorySet | null = null;

    for (const s of parsedSets) {
      if (s.isWarmup) continue;
      const w = s.weightKg || 0;
      const r = s.reps || 0;
      if (w > maxWeight || (w === maxWeight && r > (bestSet?.reps || 0))) {
        maxWeight = w;
        bestSet = s;
      }
    }

    if (!bestSet && parsedSets.length > 0) {
      bestSet = parsedSets[0];
      maxWeight = bestSet.weightKg || 0;
    }

    let bestSetSummary = '';
    if (bestSet) {
      if (bestSet.weightKg !== undefined && bestSet.weightKg > 0 && bestSet.reps !== undefined && bestSet.reps > 0) {
        bestSetSummary = `${bestSet.weightKg} kg × ${bestSet.reps}`;
      } else if (bestSet.weightKg !== undefined && bestSet.weightKg > 0) {
        bestSetSummary = `${bestSet.weightKg} kg`;
      } else if (bestSet.reps !== undefined && bestSet.reps > 0) {
        bestSetSummary = `${bestSet.reps} reps`;
      } else if (bestSet.durationSeconds !== undefined && bestSet.durationSeconds > 0) {
        bestSetSummary = `${bestSet.durationSeconds}s`;
      }
    }

    // Check PRs
    const sessionDate = session.startTime || new Date().toISOString();
    for (const s of parsedSets) {
      if (s.weightKg && s.weightKg > 0 && s.reps && s.reps > 0) {
        const e1rm = calculateEstimated1RM(s.weightKg, s.reps);
        if (!bestPR || e1rm > bestPR.estimated1RM) {
          bestPR = {
            weightKg: s.weightKg,
            reps: s.reps,
            estimated1RM: e1rm,
            date: formatShortDate(sessionDate)
          };
        }
      }
    }

    // Check if session has PRs achieved
    const hasPR = Boolean(
      session.prsAchieved?.some(pr => 
        (exerciseId && pr.exerciseId === exerciseId) || 
        (normalizedTargetName && pr.exerciseName && normalizeString(pr.exerciseName) === normalizedTargetName)
      )
    );

    historyList.push({
      sessionId: session.id,
      date: formatShortDate(sessionDate),
      rawDate: sessionDate,
      routineName: session.routineName || session.routineTitle,
      workoutLetter: session.workoutLetter,
      sets: parsedSets,
      maxWeightKg: maxWeight > 0 ? maxWeight : undefined,
      bestSetSummary: bestSetSummary || undefined,
      hasPR
    });
  }

  if (historyList.length === 0) {
    return { hasHistory: false, totalExecutions: 0, recentSessions: [] };
  }

  return {
    hasHistory: true,
    totalExecutions: historyList.length,
    lastExecution: historyList[0],
    personalRecord: bestPR,
    recentSessions: historyList.slice(0, 5)
  };
}
