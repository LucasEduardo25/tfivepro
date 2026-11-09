/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  ScheduleAppointment, 
  Student, 
  WorkoutRoutine, 
  RoutineWorkout, 
  WorkoutSession, 
  WorkoutSetRecord,
  ActiveWorkoutState,
  PersonalRecord,
  PhysicalAssessment,
  TrainingCycle,
  ActivePlan
} from '../types';
import { computeCycleMetrics, formatDateBr } from '../utils/cycleCalculations';
import { getStudentExerciseHistory } from '../utils/studentExerciseHistory';

export interface TodayAppointmentsSummary {
  appointments: ScheduleAppointment[];
  total: number;
  completed: number;
  remaining: number;
  active: number;
  missed: number;
  targetDate: string;
}

export interface ResolvedWorkoutInfo {
  routine?: WorkoutRoutine;
  workout?: RoutineWorkout;
  workoutTitle: string;
  workoutLetter?: string;
  isDefined: boolean;
}

export interface LastComparableSessionSummary {
  session: WorkoutSession;
  dateFormatted: string;
  rawDate: string;
  durationMinutes: number;
  totalExercises: number;
  totalSets: number;
  totalVolume?: number;
  volumeFormatted?: string;
  coachNotes?: string;
  workoutLabel: string;
}

export interface ExerciseSetHistoryItem {
  setNumber: number;
  weightKg?: number;
  reps?: number;
  durationSeconds?: number;
}

export interface ExercisePerformanceSummary {
  exerciseId: string;
  exerciseName: string;
  muscleGroup?: string;
  todayPrescription: {
    sets: number;
    reps?: string;
    targetReps?: number;
    weightKg?: number;
    restSeconds?: number;
    notes?: string;
  };
  hasHistory: boolean;
  lastDateFormatted?: string;
  lastSets?: ExerciseSetHistoryItem[];
  bestSetSummary?: string;
}

export interface StudentCycleSummary {
  cycleName: string;
  objective?: string;
  blockName: string;
  blockOrder: number;
  blockWeek: number;
  totalBlockWeeks: number;
  cycleWeek: number;
  totalCycleWeeks: number;
  reviewDateFormatted?: string;
}

export interface StudentPlanInfo {
  exists: boolean;
  planId?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'CANCELLED' | 'NONE';
  planType?: string;
  frequencyWeekly?: number;
  badgeText: string;
}

export interface AssessmentAlertInfo {
  hasAlert: boolean;
  text: string;
  subtext?: string;
  isUpcoming?: boolean;
}

/**
 * Returns YYYY-MM-DD in local time
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns formatted header date e.g. "Terça-feira, 08 de setembro"
 */
export function formatTodayHeaderDate(date: Date = new Date()): string {
  try {
    const days = [
      'Domingo',
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado'
    ];
    const months = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    const dayOfWeek = days[date.getDay()];
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    return `${dayOfWeek}, ${day} de ${month}`;
  } catch {
    return date.toLocaleDateString('pt-BR');
  }
}

/**
 * Formats short date e.g. "08/09"
 */
export function formatShortDateBr(isoOrDateStr?: string): string {
  if (!isoOrDateStr) return '-';
  try {
    const clean = isoOrDateStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    const d = new Date(isoOrDateStr);
    if (!isNaN(d.getTime())) {
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  } catch {
    // fallback
  }
  return isoOrDateStr;
}

/**
 * Aggregates appointments for today
 */
export function getTodayAppointments(
  appointments: ScheduleAppointment[],
  activeWorkouts: ActiveWorkoutState[] = [],
  targetDate: string = getLocalDateString()
): TodayAppointmentsSummary {
  const filtered = appointments.filter(a => a.date === targetDate);

  // Sort chronologically by time
  const sorted = [...filtered].sort((a, b) => {
    const timeA = a.time || '00:00';
    const timeB = b.time || '00:00';
    return timeA.localeCompare(timeB);
  });

  const activeStudentIds = new Set(activeWorkouts.map(w => w.studentId));

  const total = sorted.length;
  const completed = sorted.filter(a => a.status === 'completed').length;
  const missed = sorted.filter(a => a.status === 'missed').length;
  const active = sorted.filter(a => activeStudentIds.has(a.studentId) && a.status !== 'completed' && a.status !== 'cancelled').length;
  const remaining = sorted.filter(a => a.status !== 'completed' && a.status !== 'cancelled').length;

  return {
    appointments: sorted,
    total,
    completed,
    remaining,
    active,
    missed,
    targetDate
  };
}

/**
 * Identifies the next operational appointment for today
 */
export function getNextAppointment(
  todayAppointments: ScheduleAppointment[],
  activeWorkouts: ActiveWorkoutState[] = [],
  currentTimeStr?: string
): ScheduleAppointment | null {
  if (todayAppointments.length === 0) return null;

  const activeStudentIds = new Set(activeWorkouts.map(w => w.studentId));

  // 1. If someone is currently active in attendance and appointment is not completed, they take highest operational focus
  const activeAppt = todayAppointments.find(
    a => activeStudentIds.has(a.studentId) && a.status !== 'completed' && a.status !== 'cancelled'
  );
  if (activeAppt) return activeAppt;

  // Filter valid candidate appointments
  const candidates = todayAppointments.filter(
    a => a.status === 'scheduled' || (a.status !== 'completed' && a.status !== 'cancelled')
  );
  if (candidates.length === 0) return null;

  // Current local time
  const nowTime = currentTimeStr || (() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  })();

  // 2. Look for upcoming appointments (scheduled for now or later today)
  // Give a 30-minute grace window for appointments that just began
  const upcoming = candidates.filter(a => {
    const [h, m] = (a.time || '00:00').split(':').map(Number);
    const apptMin = (h || 0) * 60 + (m || 0);
    const [nowH, nowM] = nowTime.split(':').map(Number);
    const currentMin = (nowH || 0) * 60 + (nowM || 0);
    return apptMin >= currentMin - 30;
  });

  if (upcoming.length > 0) {
    return upcoming[0];
  }

  // 3. Fallback to the first non-completed candidate of the day
  return candidates[0];
}

/**
 * Resolves the planned workout for a student and appointment.
 * STRICT RULE: If no workoutId/letter is defined, returns isDefined = false.
 * NEVER defaults silently to workouts[0] or Treino A!
 */
export function resolveWorkoutForAppointment(
  appointment: ScheduleAppointment | null | undefined,
  student: Student | null | undefined,
  routines: WorkoutRoutine[] = [],
  cycles: TrainingCycle[] = []
): ResolvedWorkoutInfo {
  if (!student) {
    return {
      workoutTitle: 'Aluno não selecionado',
      isDefined: false
    };
  }

  // Find candidate routines for this student
  const studentRoutines = routines.filter(r => r.studentId === student.id && !r.isArchived);

  // 1. Check if appointment has an explicit routineId
  let targetRoutine: WorkoutRoutine | undefined;
  if (appointment?.routineId) {
    targetRoutine = studentRoutines.find(r => r.id === appointment.routineId) || routines.find(r => r.id === appointment.routineId);
  }

  // 2. If no routine on appointment, check active cycle for this student
  if (!targetRoutine) {
    const activeCycle = cycles.find(c => c.studentId === student.id && c.status === 'current');
    if (activeCycle) {
      const metrics = computeCycleMetrics(activeCycle);
      if (metrics.currentBlock?.routineId) {
        targetRoutine = studentRoutines.find(r => r.id === metrics.currentBlock?.routineId);
      }
    }
  }

  // 3. If still no target routine, fallback to active student routine if only 1 exists
  if (!targetRoutine && studentRoutines.length === 1) {
    targetRoutine = studentRoutines[0];
  }

  // Check workout within routine
  if (targetRoutine && targetRoutine.workouts && targetRoutine.workouts.length > 0) {
    // A) Explicit workoutId on appointment
    if (appointment?.workoutId) {
      const matchingWorkout = targetRoutine.workouts.find(w => w.id === appointment.workoutId);
      if (matchingWorkout) {
        const title = matchingWorkout.letter 
          ? `Treino ${matchingWorkout.letter}${matchingWorkout.name ? ` — ${matchingWorkout.name}` : ''}`
          : matchingWorkout.name || 'Treino Definido';
        return {
          routine: targetRoutine,
          workout: matchingWorkout,
          workoutTitle: title,
          workoutLetter: matchingWorkout.letter,
          isDefined: true
        };
      }
    }

    // B) Explicit workoutLetter on appointment
    if (appointment?.workoutLetter) {
      const letterQuery = appointment.workoutLetter.trim().toUpperCase();
      const matchingWorkout = targetRoutine.workouts.find(w => w.letter?.toUpperCase() === letterQuery);
      if (matchingWorkout) {
        const title = `Treino ${matchingWorkout.letter}${matchingWorkout.name ? ` — ${matchingWorkout.name}` : ''}`;
        return {
          routine: targetRoutine,
          workout: matchingWorkout,
          workoutTitle: title,
          workoutLetter: matchingWorkout.letter,
          isDefined: true
        };
      }
    }

    // C) Check routineTitle on appointment if it explicitly specifies "Treino B", etc.
    if (appointment?.routineTitle) {
      const match = appointment.routineTitle.match(/treino\s+([a-z0-9])/i);
      if (match && match[1]) {
        const letter = match[1].toUpperCase();
        const matchingWorkout = targetRoutine.workouts.find(w => w.letter?.toUpperCase() === letter);
        if (matchingWorkout) {
          const title = `Treino ${matchingWorkout.letter}${matchingWorkout.name ? ` — ${matchingWorkout.name}` : ''}`;
          return {
            routine: targetRoutine,
            workout: matchingWorkout,
            workoutTitle: title,
            workoutLetter: matchingWorkout.letter,
            isDefined: true
          };
        }
      }
    }
  }

  // If we reach here, no explicit workout was chosen!
  // MUST NOT DEFAULT TO workouts[0] or Treino A!
  return {
    routine: targetRoutine,
    workout: undefined,
    workoutTitle: 'Treino Não Definido',
    isDefined: false
  };
}

/**
 * Finds the last comparable completed session for this student and workout.
 * Strictly checks studentId and matching workoutId / workoutLetter.
 */
export function getLastComparableSession(
  studentId: string,
  routineId?: string,
  workoutId?: string,
  workoutLetter?: string,
  sessions: WorkoutSession[] = []
): LastComparableSessionSummary | null {
  if (!studentId || sessions.length === 0) return null;

  // Filter completed sessions for this student
  const studentSessions = sessions.filter(s => {
    if (s.studentId !== studentId) return false;
    return s.status === 'completed' || Boolean(s.endTime) || (s.sets && s.sets.some(st => st.status === 'completed'));
  });

  if (studentSessions.length === 0) return null;

  // Sort descending by startTime
  const sorted = [...studentSessions].sort((a, b) => {
    const timeA = new Date(a.startTime || 0).getTime();
    const timeB = new Date(b.startTime || 0).getTime();
    return timeB - timeA;
  });

  // Target workout letter normalized
  const targetLetter = workoutLetter?.trim().toUpperCase();

  // Find first session matching workoutId or matching workoutLetter
  const match = sorted.find(s => {
    if (workoutId && s.workoutId === workoutId) return true;
    if (routineId && s.routineId === routineId && targetLetter && s.workoutLetter?.toUpperCase() === targetLetter) return true;
    if (targetLetter && s.workoutLetter?.toUpperCase() === targetLetter) return true;
    return false;
  });

  if (!match) return null;

  // Compute metrics
  const sessionDate = match.startTime || match.endTime || new Date().toISOString();
  const durationMinutes = match.durationSeconds ? Math.round(match.durationSeconds / 60) : 0;
  
  // Unique exercises count
  const exerciseIds = new Set<string>();
  let totalSetsCount = 0;
  if (match.sets) {
    for (const st of match.sets) {
      if (st.status !== 'skipped') {
        totalSetsCount++;
        if (st.exerciseId) exerciseIds.add(st.exerciseId);
      }
    }
  }

  const workoutLabel = match.workoutLetter ? `Treino ${match.workoutLetter}` : match.routineName || 'Treino';

  return {
    session: match,
    dateFormatted: formatShortDateBr(sessionDate),
    rawDate: sessionDate,
    durationMinutes,
    totalExercises: exerciseIds.size,
    totalSets: totalSetsCount,
    totalVolume: match.totalVolume,
    volumeFormatted: match.totalVolume && match.totalVolume > 0 ? `${match.totalVolume.toLocaleString('pt-BR')} kg` : undefined,
    coachNotes: match.coachNotes || match.notes,
    workoutLabel
  };
}

/**
 * Retrieves the real previous execution for an exercise of a student.
 * STRICT RULE: Uses studentId + exerciseId.
 * Never fabricates or hallucinates previous loads.
 */
export function getExerciseLastPerformance(
  studentId: string,
  exerciseId: string,
  sessions: WorkoutSession[] = []
): {
  hasHistory: boolean;
  lastDateFormatted?: string;
  lastSets?: ExerciseSetHistoryItem[];
  bestSetSummary?: string;
} {
  if (!studentId || !exerciseId || sessions.length === 0) {
    return { hasHistory: false };
  }

  // Filter completed sessions for this student
  const studentSessions = sessions.filter(s => {
    if (s.studentId !== studentId) return false;
    return s.status === 'completed' || Boolean(s.endTime) || (s.sets && s.sets.some(st => st.status === 'completed'));
  });

  if (studentSessions.length === 0) {
    return { hasHistory: false };
  }

  // Sort descending by startTime
  const sorted = [...studentSessions].sort((a, b) => {
    const timeA = new Date(a.startTime || 0).getTime();
    const timeB = new Date(b.startTime || 0).getTime();
    return timeB - timeA;
  });

  // Find the first session that has sets for this exerciseId
  for (const session of sorted) {
    if (!session.sets || session.sets.length === 0) continue;

    const matchingSets = session.sets.filter((st: WorkoutSetRecord) => {
      return st.exerciseId === exerciseId && st.status !== 'skipped';
    });

    if (matchingSets.length > 0) {
      const sessionDate = session.startTime || session.endTime || new Date().toISOString();
      const lastSets: ExerciseSetHistoryItem[] = matchingSets.map((st, idx) => ({
        setNumber: st.setNumber || idx + 1,
        weightKg: st.weightKg,
        reps: st.actualReps ?? st.targetReps,
        durationSeconds: st.actualDurationSeconds ?? st.durationSeconds ?? st.targetDurationSeconds
      }));

      // Find best set summary
      let bestSet: ExerciseSetHistoryItem | null = null;
      let maxWeight = 0;
      for (const s of lastSets) {
        const w = s.weightKg || 0;
        const r = s.reps || 0;
        if (w > maxWeight || (w === maxWeight && r > (bestSet?.reps || 0))) {
          maxWeight = w;
          bestSet = s;
        }
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

      return {
        hasHistory: true,
        lastDateFormatted: formatShortDateBr(sessionDate),
        lastSets,
        bestSetSummary: bestSetSummary || undefined
      };
    }
  }

  return { hasHistory: false };
}

/**
 * Builds the complete exercise comparison list for today's workout vs last execution.
 */
export function getExercisesComparisonForWorkout(
  studentId: string,
  workout: RoutineWorkout | undefined,
  sessions: WorkoutSession[] = []
): ExercisePerformanceSummary[] {
  if (!workout || !workout.exercises || workout.exercises.length === 0) {
    return [];
  }

  return workout.exercises.map(item => {
    const exId = item.exerciseId || (item as any).id || '';
    const name = item.exerciseName || (item as any).name || 'Exercício';
    const muscleGroup = item.muscleGroup;

    const perf = getExerciseLastPerformance(studentId, exId, sessions);

    const repsStr = item.targetRepsMin && item.targetRepsMax
      ? `${item.targetRepsMin}–${item.targetRepsMax}`
      : item.targetRepsMin
      ? `${item.targetRepsMin}`
      : '8–12';

    return {
      exerciseId: exId,
      exerciseName: name,
      muscleGroup,
      todayPrescription: {
        sets: item.targetSets || 3,
        reps: repsStr,
        targetReps: item.targetRepsMin,
        weightKg: item.lastSuggestedLoad,
        restSeconds: item.restSeconds,
        notes: item.notes
      },
      hasHistory: perf.hasHistory,
      lastDateFormatted: perf.lastDateFormatted,
      lastSets: perf.lastSets,
      bestSetSummary: perf.bestSetSummary
    };
  });
}

/**
 * Retrieves the current training cycle and block metrics for a student.
 */
export function getCurrentStudentCycleSummary(
  studentId: string,
  cycles: TrainingCycle[] = []
): StudentCycleSummary | null {
  if (!studentId || cycles.length === 0) return null;

  const activeCycle = cycles.find(c => c.studentId === studentId && c.status === 'current');
  if (!activeCycle) return null;

  const metrics = computeCycleMetrics(activeCycle);

  return {
    cycleName: activeCycle.name,
    objective: activeCycle.objective,
    blockName: metrics.currentBlock?.name || `Bloco ${(metrics.currentBlockIndex || 0) + 1}`,
    blockOrder: (metrics.currentBlockIndex || 0) + 1,
    blockWeek: metrics.currentBlockWeek,
    totalBlockWeeks: metrics.totalBlockWeeks,
    cycleWeek: metrics.currentCycleWeek,
    totalCycleWeeks: metrics.totalCycleWeeks,
    reviewDateFormatted: activeCycle.reviewDate ? formatDateBr(activeCycle.reviewDate) : undefined
  };
}

/**
 * Retrieves student plan status (without any financial values).
 */
export function getStudentPlanSummary(
  studentId: string,
  activePlans: ActivePlan[] = []
): StudentPlanInfo {
  if (!studentId || activePlans.length === 0) {
    return { exists: false, status: 'NONE', badgeText: 'Sem plano ativo' };
  }

  // Find plan where student is participant
  const plan = activePlans.find(p => {
    if (p.participants && p.participants.some(pt => pt.studentId === studentId)) return true;
    return false;
  });

  if (!plan) {
    return { exists: false, status: 'NONE', badgeText: 'Sem plano ativo' };
  }

  const isSuspended = plan.status === 'SUSPENDED';
  const typeLabel = plan.type === 'family_group' ? 'Familiar' : plan.type === 'duo' ? 'Dupla' : 'Individual';
  const freq = plan.frequencyPerWeek ? ` • ${plan.frequencyPerWeek}` : '';

  if (isSuspended) {
    return {
      exists: true,
      planId: plan.id,
      status: 'SUSPENDED',
      planType: plan.type,
      frequencyWeekly: undefined,
      badgeText: 'PLANO SUSPENSO'
    };
  }

  return {
    exists: true,
    planId: plan.id,
    status: 'ACTIVE',
    planType: plan.type,
    frequencyWeekly: undefined,
    badgeText: `${typeLabel}${freq} • ATIVO`
  };
}

/**
 * Generates an operational alert regarding physical assessment.
 */
export function getStudentAssessmentAlert(
  studentId: string,
  assessments: PhysicalAssessment[] = [],
  appointments: ScheduleAppointment[] = [],
  cycleReviewDate?: string
): AssessmentAlertInfo {
  if (!studentId) return { hasAlert: false, text: '' };

  const todayStr = getLocalDateString();

  // 1. Check if there is an upcoming scheduled assessment
  const scheduledAssessment = appointments.find(
    a => a.studentId === studentId && 
    (a.type === 'physical_assessment' || a.type === 'functional_assessment') &&
    a.date >= todayStr &&
    a.status !== 'cancelled'
  );

  if (scheduledAssessment) {
    return {
      hasAlert: true,
      text: 'Reavaliação Agendada',
      subtext: `Prevista para ${formatShortDateBr(scheduledAssessment.date)} às ${scheduledAssessment.time}`,
      isUpcoming: true
    };
  }

  // 2. Check cycle review date
  if (cycleReviewDate && cycleReviewDate >= todayStr) {
    return {
      hasAlert: true,
      text: 'Revisão do Ciclo',
      subtext: `Prevista para ${formatShortDateBr(cycleReviewDate)}`,
      isUpcoming: true
    };
  }

  // 3. Check elapsed days since last physical assessment
  const studentAssessments = assessments.filter(a => a.studentId === studentId);
  if (studentAssessments.length > 0) {
    const sorted = [...studentAssessments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latest = sorted[0];
    const latestTime = new Date(latest.date).getTime();
    const nowTime = new Date().getTime();
    const diffDays = Math.floor((nowTime - latestTime) / (1000 * 60 * 60 * 24));

    if (diffDays >= 60) {
      return {
        hasAlert: true,
        text: 'Atenção para Reavaliação',
        subtext: `Última avaliação há ${diffDays} dias (${formatShortDateBr(latest.date)})`,
        isUpcoming: false
      };
    }
  }

  return { hasAlert: false, text: '' };
}

/**
 * Returns recent PRs for the student (max 3, prioritized by today's exercises).
 */
export function getStudentRecentPRs(
  studentId: string,
  prs: PersonalRecord[] = [],
  workoutExerciseIds: string[] = []
): PersonalRecord[] {
  if (!studentId || prs.length === 0) return [];

  // Sort descending by date
  const sorted = [...prs].sort((a, b) => {
    const timeA = new Date(a.date || 0).getTime();
    const timeB = new Date(b.date || 0).getTime();
    return timeB - timeA;
  });

  if (workoutExerciseIds.length > 0) {
    const matching = sorted.filter(p => workoutExerciseIds.includes(p.exerciseId));
    if (matching.length > 0) {
      return matching.slice(0, 3);
    }
  }

  return sorted.slice(0, 3);
}
