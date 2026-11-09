import { 
  WorkoutSession, 
  WorkoutSetRecord, 
  PersonalRecord, 
  MuscleGroup,
  PrescriptionType 
} from '../types';
import { calculateEstimated1RM } from './calculations';

export type MetricsPeriod = '30d' | '90d' | '6m' | '1y' | 'all';

export interface DateRange {
  start: Date;
  end: Date;
  prevStart?: Date;
  prevEnd?: Date;
  label: string;
}

export interface MetricDelta {
  current: number;
  previous: number | null;
  delta: number | null;
  percentChange: number | null;
  formattedDelta: string;
}

export interface TopExerciseProgression {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  initialWeight: number;
  initialReps: number;
  currentWeight: number;
  currentReps: number;
  weightDelta: number;
  percentDelta: number;
  sessionsCount: number;
  firstDate: string;
  lastDate: string;
}

export interface MostPerformedExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  sessionsCount: number;
  totalSets: number;
  totalVolume: number;
}

export interface MuscleGroupVolumeStat {
  muscleGroup: MuscleGroup | string;
  totalVolume: number;
  totalSets: number;
  percentage: number;
}

export interface WeeklyBucket {
  weekKey: string;
  weekLabel: string;
  startDate: string;
  endDate: string;
  sessionsCount: number;
  totalVolume: number;
  totalSets: number;
  hasWorkout: boolean;
}

export interface ExerciseDataPoint {
  date: string;
  timestamp: number;
  sessionId: string;
  weight: number;
  reps: number;
  volume: number;
  estimated1RM: number;
  rpe?: number | null;
}

export interface ExerciseProgressionDetails {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  points: ExerciseDataPoint[];
  initialWeight: number;
  currentWeight: number;
  differenceWeight: number;
  bestWeight: number;
  bestRepsAtBestWeight: number;
  bestEstimated1RM: number;
  totalSessionsInPeriod: number;
}

export interface PeriodPRItem {
  id: string;
  date: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  weightKg: number;
  reps: number;
  metricLabel: string;
  estimated1RM?: number;
}

export interface ConsolidatedMetricsSummary {
  period: MetricsPeriod;
  dateRange: DateRange;
  hasEnoughData: boolean;
  
  // 4 Top Metrics
  totalCompletedSessions: MetricDelta;
  weeklyFrequency: MetricDelta;
  averageSessionVolume: MetricDelta;
  totalProgressionsCount: number;
  distinctExercisesCount: number;

  // Highlights
  newPRsCount: number;
  periodPRs: PeriodPRItem[];
  topProgressions: TopExerciseProgression[];
  mostPerformedExercises: MostPerformedExercise[];

  // Charts
  weeklyBuckets: WeeklyBucket[];
  muscleDistribution: MuscleGroupVolumeStat[];
  
  // Consistency
  totalWeeksInPeriod: number;
  weeksWithWorkoutCount: number;
  consecutiveWeeksActive: number;
  
  // All trained exercises in period / history for picker
  availableExercises: { id: string; name: string; muscleGroup: string; sessionsCount: number }[];
}

/**
 * Calcula limites exatos de data para o período selecionado e o período anterior de mesma duração
 */
export function calculateDateRanges(period: MetricsPeriod, referenceDate: Date = new Date()): DateRange {
  const end = new Date(referenceDate.getTime());
  // Normaliza o fim para 23:59:59.999
  end.setHours(23, 59, 59, 999);

  let start = new Date(referenceDate.getTime());
  let prevStart: Date | undefined;
  let prevEnd: Date | undefined;
  let label = 'Últimos 90 dias';

  if (period === '30d') {
    start.setDate(end.getDate() - 30);
    start.setHours(0, 0, 0, 0);

    prevEnd = new Date(start.getTime() - 1);
    prevStart = new Date(prevEnd.getTime());
    prevStart.setDate(prevEnd.getDate() - 30);
    prevStart.setHours(0, 0, 0, 0);
    label = 'Últimos 30 dias';
  } else if (period === '90d') {
    start.setDate(end.getDate() - 90);
    start.setHours(0, 0, 0, 0);

    prevEnd = new Date(start.getTime() - 1);
    prevStart = new Date(prevEnd.getTime());
    prevStart.setDate(prevEnd.getDate() - 90);
    prevStart.setHours(0, 0, 0, 0);
    label = 'Últimos 90 dias';
  } else if (period === '6m') {
    start.setMonth(end.getMonth() - 6);
    start.setHours(0, 0, 0, 0);

    prevEnd = new Date(start.getTime() - 1);
    prevStart = new Date(prevEnd.getTime());
    prevStart.setMonth(prevEnd.getMonth() - 6);
    prevStart.setHours(0, 0, 0, 0);
    label = 'Últimos 6 meses';
  } else if (period === '1y') {
    start.setFullYear(end.getFullYear() - 1);
    start.setHours(0, 0, 0, 0);

    prevEnd = new Date(start.getTime() - 1);
    prevStart = new Date(prevEnd.getTime());
    prevStart.setFullYear(prevEnd.getFullYear() - 1);
    prevStart.setHours(0, 0, 0, 0);
    label = 'Último ano';
  } else {
    // 'all'
    start = new Date(0); // início absoluto
    label = 'Todo o histórico';
  }

  return {
    start,
    end,
    prevStart,
    prevEnd,
    label
  };
}

/**
 * Filtra sessões concluídas do aluno válidas sem duplicação
 */
export function getValidStudentSessions(sessions: WorkoutSession[], studentId: string): WorkoutSession[] {
  if (!Array.isArray(sessions)) return [];
  
  const seenIds = new Set<string>();
  const valid: WorkoutSession[] = [];

  for (const s of sessions) {
    if (!s || !s.id || s.studentId !== studentId) continue;
    // Sessões válidas concluídas
    if (s.status !== 'completed') continue;
    if (seenIds.has(s.id)) continue;
    seenIds.add(s.id);
    valid.push(s);
  }

  return valid.sort((a, b) => new Date(a.startTime || 0).getTime() - new Date(b.startTime || 0).getTime());
}

/**
 * Calcula o volume de musculação (kg) estritamente válido de uma sessão
 * volume = soma(carga * reps) para séries com carga e reps aplicáveis.
 * Não inclui tempo, distância ou séries com status 'skipped' ou 'isWarmup'.
 */
export function calculateSessionVolume(session: WorkoutSession): number {
  if (!session || !Array.isArray(session.sets)) return 0;
  
  let vol = 0;
  for (const set of session.sets) {
    if (!set || set.status === 'skipped' || set.isWarmup) continue;
    
    const pType: PrescriptionType = (set.prescriptionType || set.recordType || 'weight_reps') as PrescriptionType;
    // Apenas tipos com sobrecarga e repetições contribuem para volume em kg
    if (pType === 'weight_reps' || (!set.prescriptionType && (set.weightKg || 0) > 0)) {
      const w = Number(set.weightKg) || 0;
      const r = Number(set.actualReps) || 0;
      if (w > 0 && r > 0) {
        vol += w * r;
      }
    }
  }

  return Math.round(vol);
}

/**
 * Conta séries válidas de uma sessão (excluindo skipped e warmup)
 */
export function countSessionValidSets(session: WorkoutSession): number {
  if (!session || !Array.isArray(session.sets)) return 0;
  return session.sets.filter(s => s && s.status !== 'skipped' && !s.isWarmup).length;
}

/**
 * Formata delta numérico com sinal claro (+X / -X / 0)
 */
export function formatDeltaValue(delta: number | null, unit: string = ''): string {
  if (delta === null || isNaN(delta)) return '—';
  if (delta === 0) return `0 ${unit}`.trim();
  const sign = delta > 0 ? '+' : '';
  const numStr = Number.isInteger(delta) ? delta.toString() : delta.toFixed(1).replace('.', ',');
  return `${sign}${numStr} ${unit}`.trim();
}

/**
 * Formata variação percentual (+X% / -X% / 0%)
 */
export function formatPercentDelta(pct: number | null): string {
  if (pct === null || isNaN(pct)) return '—';
  if (pct === 0) return '0%';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1).replace('.', ',')}%`;
}

/**
 * Gera agrupamentos semanais contínuos para o período selecionado
 */
export function buildWeeklyBuckets(sessions: WorkoutSession[], dateRange: DateRange): WeeklyBucket[] {
  if (sessions.length === 0 && dateRange.start.getTime() === 0) return [];

  // Determina data de início efetiva (se for 'all', usa a primeira sessão)
  let effectiveStart = new Date(dateRange.start.getTime());
  if (dateRange.start.getTime() === 0) {
    if (sessions.length > 0) {
      effectiveStart = new Date(sessions[0].startTime);
    } else {
      effectiveStart = new Date();
      effectiveStart.setDate(effectiveStart.getDate() - 30);
    }
  }

  // Ajusta effectiveStart para segunda-feira daquela semana
  effectiveStart = new Date(effectiveStart);
  const day = effectiveStart.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  effectiveStart.setDate(effectiveStart.getDate() + diffToMonday);
  effectiveStart.setHours(0, 0, 0, 0);

  const end = new Date(dateRange.end);
  const buckets: WeeklyBucket[] = [];

  let curStart = new Date(effectiveStart);

  while (curStart <= end) {
    const curEnd = new Date(curStart);
    curEnd.setDate(curEnd.getDate() + 6);
    curEnd.setHours(23, 59, 59, 999);

    const startMs = curStart.getTime();
    const endMs = curEnd.getTime();

    // Filtra sessões nesta semana
    const weekSessions = sessions.filter(s => {
      const sTime = new Date(s.startTime).getTime();
      return sTime >= startMs && sTime <= endMs;
    });

    const sessionsCount = weekSessions.length;
    const totalVolume = weekSessions.reduce((sum, s) => sum + calculateSessionVolume(s), 0);
    const totalSets = weekSessions.reduce((sum, s) => sum + countSessionValidSets(s), 0);

    const startLabel = curStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const endLabel = curEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    buckets.push({
      weekKey: `${curStart.getFullYear()}-W${Math.ceil(curStart.getDate() / 7)}_${startLabel}`,
      weekLabel: `${startLabel} a ${endLabel}`,
      startDate: curStart.toISOString(),
      endDate: curEnd.toISOString(),
      sessionsCount,
      totalVolume,
      totalSets,
      hasWorkout: sessionsCount > 0
    });

    // Próxima semana
    curStart = new Date(curStart);
    curStart.setDate(curStart.getDate() + 7);
  }

  return buckets;
}

/**
 * Calcula sequência máxima de semanas consecutivas ativas com treino no período
 */
export function calculateConsecutiveActiveWeeks(weeklyBuckets: WeeklyBucket[]): number {
  if (!weeklyBuckets || weeklyBuckets.length === 0) return 0;
  
  let currentStreak = 0;
  let maxStreak = 0;

  for (const b of weeklyBuckets) {
    if (b.hasWorkout) {
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
    }
  }

  // Retorna a sequência ativa atual (ou a maior do período)
  return maxStreak;
}

/**
 * Agregação da distribuição por grupo muscular (sem duplicações fictícias)
 */
export function calculateMuscleDistribution(sessions: WorkoutSession[]): MuscleGroupVolumeStat[] {
  const muscleMap = new Map<string, { totalVolume: number; totalSets: number }>();
  let totalVolOverall = 0;

  for (const s of sessions) {
    for (const set of s.sets || []) {
      if (!set || set.status === 'skipped' || set.isWarmup) continue;
      
      const grp = set.muscleGroup || 'Outros';
      const cur = muscleMap.get(grp) || { totalVolume: 0, totalSets: 0 };
      
      const pType: PrescriptionType = (set.prescriptionType || set.recordType || 'weight_reps') as PrescriptionType;
      const isWeight = pType === 'weight_reps' || (!set.prescriptionType && (set.weightKg || 0) > 0);
      const setVol = isWeight ? (set.weightKg || 0) * (set.actualReps || 0) : 0;

      cur.totalVolume += setVol;
      cur.totalSets += 1;
      muscleMap.set(grp, cur);

      totalVolOverall += setVol;
    }
  }

  const result: MuscleGroupVolumeStat[] = [];
  muscleMap.forEach((val, grp) => {
    const percentage = totalVolOverall > 0 
      ? Number(((val.totalVolume / totalVolOverall) * 100).toFixed(1))
      : 0;
    result.push({
      muscleGroup: grp,
      totalVolume: val.totalVolume,
      totalSets: val.totalSets,
      percentage
    });
  });

  // Ordena pelo maior volume/sets
  return result.sort((a, b) => b.totalVolume - a.totalVolume || b.totalSets - a.totalSets);
}

/**
 * Agregação detalhada da progressão de um exercício específico
 */
export function getExerciseProgressionDetails(
  exerciseId: string,
  sessions: WorkoutSession[]
): ExerciseProgressionDetails | null {
  if (!exerciseId || !sessions || sessions.length === 0) return null;

  const points: ExerciseDataPoint[] = [];
  let exerciseName = '';
  let muscleGroup = '';

  for (const session of sessions) {
    const validSets = (session.sets || []).filter(
      s => s && s.exerciseId === exerciseId && s.status !== 'skipped' && !s.isWarmup
    );

    if (validSets.length > 0) {
      if (!exerciseName) exerciseName = validSets[0].exerciseName;
      if (!muscleGroup) muscleGroup = validSets[0].muscleGroup;

      // Melhor série de carga / reps da sessão
      const bestSet = [...validSets].sort((a, b) => {
        return (b.weightKg || 0) - (a.weightKg || 0) || (b.actualReps || 0) - (a.actualReps || 0);
      })[0];

      const est1RM = calculateEstimated1RM(bestSet.weightKg || 0, bestSet.actualReps || 0);
      const vol = validSets.reduce((sum, s) => sum + ((s.weightKg || 0) * (s.actualReps || 0)), 0);

      points.push({
        date: new Date(session.startTime).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        timestamp: new Date(session.startTime).getTime(),
        sessionId: session.id,
        weight: bestSet.weightKg || 0,
        reps: bestSet.actualReps || 0,
        volume: vol,
        estimated1RM: est1RM,
        rpe: bestSet.rpe ?? null
      });
    }
  }

  if (points.length === 0) return null;

  const initial = points[0];
  const current = points[points.length - 1];
  const diffWeight = Number((current.weight - initial.weight).toFixed(1));

  let bestWeight = 0;
  let bestRepsAtBest = 0;
  let best1RM = 0;

  for (const pt of points) {
    if (pt.weight > bestWeight) {
      bestWeight = pt.weight;
      bestRepsAtBest = pt.reps;
    } else if (pt.weight === bestWeight && pt.reps > bestRepsAtBest) {
      bestRepsAtBest = pt.reps;
    }
    if (pt.estimated1RM > best1RM) {
      best1RM = pt.estimated1RM;
    }
  }

  return {
    exerciseId,
    exerciseName: exerciseName || 'Exercício',
    muscleGroup: muscleGroup || 'Geral',
    points,
    initialWeight: initial.weight,
    currentWeight: current.weight,
    differenceWeight: diffWeight,
    bestWeight,
    bestRepsAtBestWeight: bestRepsAtBest,
    bestEstimated1RM: best1RM,
    totalSessionsInPeriod: points.length
  };
}

/**
 * Ranking de exercícios com maior evolução de carga no período (primeira vs última execução)
 */
export function getTopProgressionsInPeriod(sessions: WorkoutSession[]): TopExerciseProgression[] {
  if (!sessions || sessions.length === 0) return [];

  // Mapeia todas as execuções por exercício em ordem cronológica
  const map = new Map<string, {
    exerciseName: string;
    muscleGroup: string;
    sessions: { weight: number; reps: number; date: string }[];
  }>();

  for (const s of sessions) {
    const sDate = s.startTime;
    for (const set of s.sets || []) {
      if (!set || set.status === 'skipped' || set.isWarmup || !set.exerciseId) continue;
      
      const pType: PrescriptionType = (set.prescriptionType || set.recordType || 'weight_reps') as PrescriptionType;
      if (pType !== 'weight_reps' && (set.weightKg || 0) <= 0) continue;

      const cur = map.get(set.exerciseId) || {
        exerciseName: set.exerciseName,
        muscleGroup: set.muscleGroup,
        sessions: []
      };

      // Adiciona melhor carga do dia
      const existingSessionEntry = cur.sessions.find(e => e.date === sDate);
      if (!existingSessionEntry) {
        cur.sessions.push({
          weight: set.weightKg || 0,
          reps: set.actualReps || 0,
          date: sDate
        });
      } else if ((set.weightKg || 0) > existingSessionEntry.weight) {
        existingSessionEntry.weight = set.weightKg || 0;
        existingSessionEntry.reps = set.actualReps || 0;
      }

      map.set(set.exerciseId, cur);
    }
  }

  const list: TopExerciseProgression[] = [];

  map.forEach((item, exId) => {
    if (item.sessions.length >= 2) {
      const first = item.sessions[0];
      const last = item.sessions[item.sessions.length - 1];
      const weightDelta = Number((last.weight - first.weight).toFixed(1));
      
      if (weightDelta > 0 && first.weight > 0) {
        const percentDelta = Number((((last.weight - first.weight) / first.weight) * 100).toFixed(1));
        list.push({
          exerciseId: exId,
          exerciseName: item.exerciseName,
          muscleGroup: item.muscleGroup,
          initialWeight: first.weight,
          initialReps: first.reps,
          currentWeight: last.weight,
          currentReps: last.reps,
          weightDelta,
          percentDelta,
          sessionsCount: item.sessions.length,
          firstDate: new Date(first.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          lastDate: new Date(last.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        });
      }
    }
  });

  // Ordena por maior delta de carga absoluto
  return list.sort((a, b) => b.weightDelta - a.weightDelta).slice(0, 5);
}

/**
 * Ranking de exercícios mais realizados no período
 */
export function getMostPerformedExercisesInPeriod(sessions: WorkoutSession[]): MostPerformedExercise[] {
  if (!sessions || sessions.length === 0) return [];

  const map = new Map<string, {
    exerciseName: string;
    muscleGroup: string;
    sessionIds: Set<string>;
    totalSets: number;
    totalVolume: number;
  }>();

  for (const s of sessions) {
    for (const set of s.sets || []) {
      if (!set || set.status === 'skipped' || set.isWarmup || !set.exerciseId) continue;
      
      const cur = map.get(set.exerciseId) || {
        exerciseName: set.exerciseName,
        muscleGroup: set.muscleGroup,
        sessionIds: new Set<string>(),
        totalSets: 0,
        totalVolume: 0
      };

      cur.sessionIds.add(s.id);
      cur.totalSets += 1;
      
      const pType = set.prescriptionType || set.recordType || 'weight_reps';
      if (pType === 'weight_reps' || (!set.prescriptionType && (set.weightKg || 0) > 0)) {
        cur.totalVolume += (set.weightKg || 0) * (set.actualReps || 0);
      }

      map.set(set.exerciseId, cur);
    }
  }

  const list: MostPerformedExercise[] = [];
  map.forEach((item, exId) => {
    list.push({
      exerciseId: exId,
      exerciseName: item.exerciseName,
      muscleGroup: item.muscleGroup,
      sessionsCount: item.sessionIds.size,
      totalSets: item.totalSets,
      totalVolume: Math.round(item.totalVolume)
    });
  });

  return list.sort((a, b) => b.sessionsCount - a.sessionsCount || b.totalSets - a.totalSets).slice(0, 5);
}

/**
 * Localiza PRs reais conquistados dentro do período selecionado
 */
export function getPeriodPRs(
  periodSessions: WorkoutSession[],
  allSessionsChronological: WorkoutSession[]
): PeriodPRItem[] {
  if (!periodSessions || periodSessions.length === 0) return [];

  const prList: PeriodPRItem[] = [];
  const periodSessionIds = new Set(periodSessions.map(s => s.id));

  // Itera pelas sessões do período identificando PRs gravados ou detectados
  for (const s of periodSessions) {
    const sDate = new Date(s.startTime).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    // Se a sessão possui prsAchieved gravados
    if (Array.isArray(s.prsAchieved) && s.prsAchieved.length > 0) {
      for (const pr of s.prsAchieved) {
        prList.push({
          id: `${s.id}_${pr.exerciseId}_${pr.prType}`,
          date: sDate,
          exerciseId: pr.exerciseId,
          exerciseName: pr.exerciseName,
          muscleGroup: pr.muscleGroup || 'Geral',
          weightKg: pr.weightKg || pr.newValue || 0,
          reps: pr.reps || 0,
          metricLabel: pr.metricLabel || `${pr.weightKg} kg × ${pr.reps}`,
          estimated1RM: pr.estimated1RM || (pr.weightKg && pr.reps ? calculateEstimated1RM(pr.weightKg, pr.reps) : undefined)
        });
      }
    } else {
      // Fallback para sessões antigas que possuem séries com isPR === true
      for (const set of s.sets || []) {
        if (set.isPR && !set.isWarmup && set.status !== 'skipped') {
          prList.push({
            id: set.id,
            date: sDate,
            exerciseId: set.exerciseId,
            exerciseName: set.exerciseName,
            muscleGroup: set.muscleGroup || 'Geral',
            weightKg: set.weightKg || 0,
            reps: set.actualReps || 0,
            metricLabel: `${set.weightKg} kg × ${set.actualReps} reps`,
            estimated1RM: set.weightKg && set.actualReps ? calculateEstimated1RM(set.weightKg, set.actualReps) : undefined
          });
        }
      }
    }
  }

  // Ordena os PRs mais recentes primeiro
  return prList.reverse();
}

/**
 * Função mestre de consolidação de todas as métricas do período
 */
export function aggregateStudentMetrics(
  allSessions: WorkoutSession[],
  studentId: string,
  period: MetricsPeriod = '90d',
  referenceDate: Date = new Date()
): ConsolidatedMetricsSummary {
  const validSessions = getValidStudentSessions(allSessions, studentId);
  const dateRange = calculateDateRanges(period, referenceDate);

  const startMs = dateRange.start.getTime();
  const endMs = dateRange.end.getTime();

  // Sessões no período atual
  const periodSessions = validSessions.filter(s => {
    const sTime = new Date(s.startTime).getTime();
    return sTime >= startMs && sTime <= endMs;
  });

  // Sessões no período anterior de mesma duração
  let prevPeriodSessions: WorkoutSession[] = [];
  if (dateRange.prevStart && dateRange.prevEnd) {
    const pStartMs = dateRange.prevStart.getTime();
    const pEndMs = dateRange.prevEnd.getTime();
    prevPeriodSessions = validSessions.filter(s => {
      const sTime = new Date(s.startTime).getTime();
      return sTime >= pStartMs && sTime <= pEndMs;
    });
  }

  const hasEnoughData = periodSessions.length > 0;

  // 1. Treinos Concluídos
  const curCompletedCount = periodSessions.length;
  const prevCompletedCount = dateRange.prevStart ? prevPeriodSessions.length : null;
  const deltaCompleted = prevCompletedCount !== null ? curCompletedCount - prevCompletedCount : null;
  const pctCompleted = (prevCompletedCount !== null && prevCompletedCount > 0)
    ? Number((((curCompletedCount - prevCompletedCount) / prevCompletedCount) * 100).toFixed(1))
    : null;

  // 2. Frequência Semanal Média
  // Número de semanas no período
  const diffDays = Math.max(1, Math.round((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)));
  const totalWeeks = Math.max(1, diffDays / 7);
  
  const curFreq = Number((curCompletedCount / totalWeeks).toFixed(1));
  const prevFreq = prevCompletedCount !== null ? Number((prevCompletedCount / totalWeeks).toFixed(1)) : null;
  const deltaFreq = prevFreq !== null ? Number((curFreq - prevFreq).toFixed(1)) : null;
  const pctFreq = (prevFreq !== null && prevFreq > 0)
    ? Number((((curFreq - prevFreq) / prevFreq) * 100).toFixed(1))
    : null;

  // 3. Volume Médio por Sessão
  const totalVolCurrent = periodSessions.reduce((sum, s) => sum + calculateSessionVolume(s), 0);
  const avgVolCurrent = curCompletedCount > 0 ? Math.round(totalVolCurrent / curCompletedCount) : 0;

  const totalVolPrev = prevPeriodSessions.reduce((sum, s) => sum + calculateSessionVolume(s), 0);
  const avgVolPrev = prevPeriodSessions.length > 0 ? Math.round(totalVolPrev / prevPeriodSessions.length) : null;
  
  const deltaAvgVol = avgVolPrev !== null ? avgVolCurrent - avgVolPrev : null;
  const pctAvgVol = (avgVolPrev !== null && avgVolPrev > 0)
    ? Number((((avgVolCurrent - avgVolPrev) / avgVolPrev) * 100).toFixed(1))
    : null;

  // 4. Progressões & Exercícios Únicos
  const topProgressions = getTopProgressionsInPeriod(periodSessions);
  const mostPerformedExercises = getMostPerformedExercisesInPeriod(periodSessions);
  
  const distinctExMap = new Map<string, { id: string; name: string; muscleGroup: string; sessionsCount: number }>();
  for (const s of periodSessions) {
    for (const set of s.sets || []) {
      if (set && set.exerciseId && set.status !== 'skipped' && !set.isWarmup) {
        const cur = distinctExMap.get(set.exerciseId) || {
          id: set.exerciseId,
          name: set.exerciseName,
          muscleGroup: set.muscleGroup,
          sessionsCount: 0
        };
        distinctExMap.set(set.exerciseId, cur);
      }
    }
  }

  // Conta sessões por exercício
  distinctExMap.forEach((val, exId) => {
    const count = periodSessions.filter(s => (s.sets || []).some(st => st.exerciseId === exId && st.status !== 'skipped')).length;
    val.sessionsCount = count;
  });

  const availableExercises = Array.from(distinctExMap.values()).sort((a, b) => b.sessionsCount - a.sessionsCount);

  // Semanas e consistência
  const weeklyBuckets = buildWeeklyBuckets(periodSessions, dateRange);
  const weeksWithWorkoutCount = weeklyBuckets.filter(b => b.hasWorkout).length;
  const consecutiveWeeksActive = calculateConsecutiveActiveWeeks(weeklyBuckets);

  // Distribuição Muscular
  const muscleDistribution = calculateMuscleDistribution(periodSessions);

  // PRs do Período
  const periodPRs = getPeriodPRs(periodSessions, validSessions);

  return {
    period,
    dateRange,
    hasEnoughData,

    totalCompletedSessions: {
      current: curCompletedCount,
      previous: prevCompletedCount,
      delta: deltaCompleted,
      percentChange: pctCompleted,
      formattedDelta: formatDeltaValue(deltaCompleted, 'treinos')
    },
    weeklyFrequency: {
      current: curFreq,
      previous: prevFreq,
      delta: deltaFreq,
      percentChange: pctFreq,
      formattedDelta: formatDeltaValue(deltaFreq, 'treinos/sem')
    },
    averageSessionVolume: {
      current: avgVolCurrent,
      previous: avgVolPrev,
      delta: deltaAvgVol,
      percentChange: pctAvgVol,
      formattedDelta: formatPercentDelta(pctAvgVol)
    },
    totalProgressionsCount: topProgressions.length,
    distinctExercisesCount: distinctExMap.size,

    newPRsCount: periodPRs.length,
    periodPRs,
    topProgressions,
    mostPerformedExercises,

    weeklyBuckets,
    muscleDistribution,

    totalWeeksInPeriod: weeklyBuckets.length,
    weeksWithWorkoutCount,
    consecutiveWeeksActive,

    availableExercises
  };
}
