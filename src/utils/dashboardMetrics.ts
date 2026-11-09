import { 
  Student, 
  WorkoutSession, 
  ActiveWorkoutState, 
  ScheduleAppointment, 
  PersonalRecord 
} from '../types';
import { calculateWorkoutDensity, formatWorkoutDuration, formatTonnesOrKg } from './calculations';

/**
 * Returns dynamic greeting based on local hour and trainer's first name
 * Ex: "Bom dia, Rafael" / "Boa tarde, Rafael" / "Boa noite, Rafael"
 */
export function getGreeting(trainerName?: string): string {
  const hour = new Date().getHours();
  let salutation = 'Olá';
  if (hour >= 5 && hour < 12) {
    salutation = 'Bom dia';
  } else if (hour >= 12 && hour < 18) {
    salutation = 'Boa tarde';
  } else {
    salutation = 'Boa noite';
  }

  if (!trainerName || !trainerName.trim()) {
    return `${salutation}, Treinador`;
  }

  const firstName = trainerName.trim().split(/\s+/)[0];
  const capitalized = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  return `${salutation}, ${capitalized}`;
}

/**
 * Formats local device date into Portuguese
 * Ex: "Sábado, 22 de agosto"
 */
export function getFormattedDeviceDate(date: Date = new Date()): string {
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
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro'
  ];

  const dayName = days[date.getDay()];
  const dayNumber = date.getDate();
  const monthName = months[date.getMonth()];

  return `${dayName}, ${dayNumber} de ${monthName}`;
}

/**
 * Daily Summary Real Metrics structure
 */
export interface DailySummaryData {
  date: string;
  completedWorkoutsCount: number;
  activeWorkoutsCount: number;
  totalDurationSeconds: number;
  totalVolumeKg: number;
  totalSetsCount: number;
  totalPRsCount: number;
  densityKgMin: number;
  durationFormatted: string;
  volumeFormatted: string;
  todayCompletedSessions: WorkoutSession[];
}

/**
 * Computes centralized real metrics for today
 */
export function calculateDailySummary(
  sessions: WorkoutSession[] = [],
  activeWorkouts: ActiveWorkoutState[] = [],
  targetDateStr?: string
): DailySummaryData {
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const safeActiveWorkouts = Array.isArray(activeWorkouts) ? activeWorkouts : [];
  const todayStr = targetDateStr || new Date().toISOString().split('T')[0];

  const todayCompletedSessions = safeSessions.filter(s => {
    if (!s || s.status !== 'completed' || !s.startTime) return false;
    const sessionDate = s.startTime.split('T')[0];
    return sessionDate === todayStr;
  });

  const completedWorkoutsCount = todayCompletedSessions.length;
  const activeWorkoutsCount = safeActiveWorkouts.length;

  let totalDurationSeconds = todayCompletedSessions.reduce((acc, s) => acc + (s?.durationSeconds || 0), 0);
  let totalVolumeKg = todayCompletedSessions.reduce((acc, s) => acc + (s?.totalVolume || 0), 0);
  let totalSetsCount = todayCompletedSessions.reduce((acc, s) => {
    const sSets = Array.isArray(s?.sets) ? s.sets : [];
    return acc + sSets.filter(st => st && !st.isWarmup && st.status !== 'skipped').length;
  }, 0);
  let totalPRsCount = todayCompletedSessions.reduce((acc, s) => {
    const sPrs = Array.isArray(s?.prsAchieved) ? s.prsAchieved : [];
    return acc + sPrs.length;
  }, 0);

  // Add active workout live metrics if currently running today
  for (const active of safeActiveWorkouts) {
    if (!active) continue;
    totalDurationSeconds += active.elapsedSeconds || 0;
    const activeSets = Array.isArray(active.session?.sets)
      ? active.session.sets.filter(st => st && !st.isWarmup && st.status === 'completed')
      : [];
    totalSetsCount += activeSets.length;
    const activeVolume = activeSets.reduce((acc, st) => acc + ((st.weightKg || 0) * (st.actualReps || 0)), 0);
    totalVolumeKg += activeVolume;
    const activePRs = Array.isArray(active.session?.prsAchieved) ? active.session.prsAchieved : [];
    totalPRsCount += activePRs.length;
  }

  const densityKgMin = calculateWorkoutDensity(totalVolumeKg, totalDurationSeconds, true);
  const durationFormatted = formatWorkoutDuration(totalDurationSeconds);
  const volumeFormatted = formatTonnesOrKg(totalVolumeKg);

  return {
    date: todayStr,
    completedWorkoutsCount,
    activeWorkoutsCount,
    totalDurationSeconds,
    totalVolumeKg,
    totalSetsCount,
    totalPRsCount,
    densityKgMin,
    durationFormatted,
    volumeFormatted,
    todayCompletedSessions
  };
}

/**
 * Returns today's appointments in chronological order
 */
export function getTodayAppointments(
  schedule: ScheduleAppointment[] = [],
  todayStr: string = new Date().toISOString().split('T')[0]
): ScheduleAppointment[] {
  const safeSchedule = Array.isArray(schedule) ? schedule : [];
  return safeSchedule
    .filter(a => a && a.date === todayStr)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
}

/**
 * Returns the immediate next upcoming appointment
 */
export function getNextAppointment(
  schedule: ScheduleAppointment[] = [],
  todayStr: string = new Date().toISOString().split('T')[0]
): ScheduleAppointment | null {
  const safeSchedule = Array.isArray(schedule) ? schedule : [];
  const todayApps = getTodayAppointments(safeSchedule, todayStr);
  
  // First check scheduled for today that are not completed/cancelled
  const pendingToday = todayApps.find(a => a?.status === 'scheduled');
  if (pendingToday) return pendingToday;

  // Otherwise return any upcoming scheduled appointment
  const allScheduled = safeSchedule
    .filter(a => a && a.status === 'scheduled' && a.date >= todayStr)
    .sort((a, b) => {
      if (a.date === b.date) return (a.time || '').localeCompare(b.time || '');
      return (a.date || '').localeCompare(b.date || '');
    });

  return allScheduled[0] || null;
}

/**
 * Returns recent students sorted by their latest activity
 */
export interface RecentStudentItem {
  student: Student;
  firstName: string;
  lastWorkoutDateLabel: string;
  totalWorkouts: number;
  latestSession?: WorkoutSession;
}

export function getRecentStudents(
  students: Student[] = [],
  sessions: WorkoutSession[] = [],
  limit = 6
): RecentStudentItem[] {
  const safeStudents = Array.isArray(students) ? students : [];
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const studentSessionsMap = new Map<string, WorkoutSession[]>();
  for (const session of safeSessions) {
    if (!session || session.status !== 'completed' || !session.studentId) continue;
    const list = studentSessionsMap.get(session.studentId) || [];
    list.push(session);
    studentSessionsMap.set(session.studentId, list);
  }

  const items: RecentStudentItem[] = safeStudents.map(student => {
    const studentSessions = studentSessionsMap.get(student.id) || [];
    studentSessions.sort((a, b) => new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime());
    const latestSession = studentSessions[0];

    let lastWorkoutDateLabel = 'Sem treinos';
    if (latestSession && latestSession.startTime) {
      const sessionDate = latestSession.startTime.split('T')[0];
      if (sessionDate === todayStr) {
        lastWorkoutDateLabel = 'Hoje';
      } else if (sessionDate === yesterdayStr) {
        lastWorkoutDateLabel = 'Ontem';
      } else {
        const [y, m, d] = sessionDate.split('-');
        lastWorkoutDateLabel = `${d || ''}/${m || ''}`;
      }
    }

    const firstName = (student?.name || 'Aluno').trim().split(/\s+/)[0];

    return {
      student,
      firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
      lastWorkoutDateLabel,
      totalWorkouts: studentSessions.length,
      latestSession
    };
  });

  // Sort: active students with most recent sessions first
  items.sort((a, b) => {
    const timeA = a.latestSession ? new Date(a.latestSession.startTime || 0).getTime() : 0;
    const timeB = b.latestSession ? new Date(b.latestSession.startTime || 0).getTime() : 0;
    if (timeB !== timeA) return timeB - timeA;
    if (a.student.status === 'active' && b.student.status !== 'active') return -1;
    if (b.student.status === 'active' && a.student.status !== 'active') return 1;
    return (a.student.name || '').localeCompare(b.student.name || '');
  });

  return items.slice(0, limit);
}

/**
 * Returns recent PRs & achievements from real session data
 */
export interface RecentAchievementItem {
  id: string;
  studentName: string;
  exerciseName: string;
  metricLabel: string;
  dateStr: string;
  weightKg: number;
  reps: number;
}

export function getRecentAchievements(
  sessions: WorkoutSession[] = [],
  limit = 3
): RecentAchievementItem[] {
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const achievements: RecentAchievementItem[] = [];

  const completed = [...safeSessions]
    .filter(s => s && s.status === 'completed' && Array.isArray(s.prsAchieved) && s.prsAchieved.length > 0)
    .sort((a, b) => new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime());

  for (const session of completed) {
    const prs = Array.isArray(session.prsAchieved) ? session.prsAchieved : [];
    for (const pr of prs) {
      if (!pr) continue;
      const firstName = (session.studentName || 'Aluno').trim().split(/\s+/)[0];
      achievements.push({
        id: `${session.id}_${pr.exerciseId || 'ex'}_${pr.weightKg || 0}_${pr.reps || 0}`,
        studentName: firstName,
        exerciseName: pr.exerciseName || 'Exercício',
        metricLabel: pr.metricLabel || `${pr.weightKg || 0} kg × ${pr.reps || 0}`,
        dateStr: (session.startTime || '').split('T')[0] || '',
        weightKg: pr.weightKg || 0,
        reps: pr.reps || 0
      });
      if (achievements.length >= limit) return achievements;
    }
  }

  return achievements;
}
