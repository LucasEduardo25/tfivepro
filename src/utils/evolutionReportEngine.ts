import { 
  Student, 
  WorkoutSession, 
  PhysicalAssessment, 
  WorkoutRoutine,
  ScheduleAppointment,
  ScheduleRecurrence,
  TrainerProfile,
  FunctionalAssessment,
  FunctionalGoal,
  EvolutionReport,
  ReportPeriodType,
  StudentReportGoal,
  ReportPeriodStatus,
  ReportEvolutionScore,
  ScoreDimension,
  ReportKeyIndicator,
  ReportAchievement,
  ReportAdherenceMetrics,
  MonthlyAdherenceBreakdown,
  ReportExerciseProgression,
  ExerciseHistoryPoint,
  ReportPerformanceHighlight,
  ReportPhysicalComparison,
  PhysicalComparisonMetric,
  ReportFunctionalComparison,
  FunctionalComparisonTest,
  ReportDailyLivingImpact,
  DailyLivingIndicator,
  ReportTimelineEvent,
  ReportGoalItem,
  ReportTrainerOpinion,
  ReportNextCyclePlan,
  DataSourceReference
} from '../types';
import { generateId } from '../db/indexedDB';
import { formatWeight, calculateEstimated1RM } from './calculations';
import { DOMAIN_LABELS } from './functionalCalculations';

export const REPORT_GOALS: StudentReportGoal[] = [
  'Longevidade funcional',
  'Hipertrofia',
  'Emagrecimento',
  'Recomposição corporal',
  'Ganho de força',
  'Condicionamento físico',
  'Qualidade de vida',
  'Performance esportiva',
  'Retorno à atividade',
  'Outro'
];

export const PERIOD_STATUS_OPTIONS: ReportPeriodStatus[] = [
  'Evolução excelente',
  'Evolução acima do esperado',
  'Evolução consistente',
  'Evolução moderada',
  'Manutenção',
  'Atenção necessária'
];

export const DEFAULT_DAILY_LIVING_ITEMS: { id: string; name: string; defaultScore: number }[] = [
  { id: 'dl-energy', name: 'Nível de energia e disposição ao longo do dia', defaultScore: 8 },
  { id: 'dl-stairs', name: 'Facilidade para subir e descer escadas', defaultScore: 8 },
  { id: 'dl-stand', name: 'Facilidade para levantar de cadeiras e sofás', defaultScore: 9 },
  { id: 'dl-floor', name: 'Facilidade e segurança para sentar/levantar do chão', defaultScore: 7 },
  { id: 'dl-carry', name: 'Capacidade para carregar sacolas, malas ou objetos', defaultScore: 8 },
  { id: 'dl-confidence', name: 'Confiança e segurança em movimentos cotidianos', defaultScore: 9 },
  { id: 'dl-conditioning', name: 'Percepção geral de fôlego e condicionamento', defaultScore: 8 },
  { id: 'dl-movement-quality', name: 'Fluidez e ausência de travamentos no corpo', defaultScore: 8 }
];

export interface ReportGenerationInput {
  student: Student;
  periodType: ReportPeriodType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  primaryGoal: StudentReportGoal;
  secondaryGoals?: string[];
  trainerProfile?: TrainerProfile;
  sessions: WorkoutSession[];
  assessments: PhysicalAssessment[];
  functionalAssessments: FunctionalAssessment[];
  functionalGoals?: FunctionalGoal[];
  routines: WorkoutRoutine[];
  appointments?: ScheduleAppointment[];
  recurrences?: ScheduleRecurrence[];
  existingReports?: EvolutionReport[];
  initialReportState?: Partial<EvolutionReport>;
}

/**
 * Calculates start and end dates based on period type preset
 */
export function getPresetDateRange(periodType: ReportPeriodType, baseDate: Date = new Date()): { startDate: string; endDate: string } {
  const end = new Date(baseDate);
  const start = new Date(baseDate);

  if (periodType === 'Trimestral') {
    start.setDate(end.getDate() - 90);
  } else if (periodType === 'Semestral') {
    start.setDate(end.getDate() - 180);
  } else if (periodType === 'Anual') {
    start.setDate(end.getDate() - 365);
  } else {
    // Default 90 days for custom if not set
    start.setDate(end.getDate() - 90);
  }

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  };
}

/**
 * Builds a complete, data-grounded EvolutionReport for a student in a period
 */
export function generateEvolutionReport(input: ReportGenerationInput): EvolutionReport {
  const {
    student,
    periodType,
    startDate,
    endDate,
    primaryGoal,
    secondaryGoals = [],
    trainerProfile,
    sessions,
    assessments,
    functionalAssessments,
    functionalGoals = [],
    routines,
    appointments = [],
    existingReports = []
  } = input;

  const startMs = new Date(startDate + 'T00:00:00').getTime();
  const endMs = new Date(endDate + 'T23:59:59').getTime();
  const durationDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)));
  const totalWeeks = Math.max(1, durationDays / 7);

  const dataSources: DataSourceReference[] = [];

  // 1. FILTER SESSIONS IN RANGE
  const studentSessions = sessions
    .filter(s => s.studentId === student.id && s.status === 'completed')
    .filter(s => {
      const time = new Date(s.startTime).getTime();
      return time >= startMs && time <= endMs;
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  if (studentSessions.length > 0) {
    dataSources.push({
      item: 'Sessões e Séries de Treino',
      source: `${studentSessions.length} treinos concluídos no histórico`,
      timestamp: studentSessions[studentSessions.length - 1].startTime
    });
  }

  // 2. FILTER APPOINTMENTS IN RANGE FOR ADHERENCE
  const studentAppts = appointments
    .filter(a => a.studentId === student.id)
    .filter(a => {
      const apptMs = new Date(a.date + 'T12:00:00').getTime();
      return apptMs >= startMs && apptMs <= endMs;
    });

  const completedApptsCount = studentAppts.filter(a => a.status === 'completed').length;
  const missedApptsCount = studentAppts.filter(a => a.status === 'missed').length;
  const cancelledApptsCount = studentAppts.filter(a => a.status === 'cancelled').length;

  // Planned sessions calculation:
  // If we have explicit schedule appointments in range, use them; otherwise base on completed sessions
  let plannedSessions = studentAppts.length;
  let completedSessions = studentSessions.length;
  let missedSessions = missedApptsCount;
  let cancelledSessions = cancelledApptsCount;

  if (plannedSessions === 0) {
    // If no schedule records, assume regular weekly target (e.g. 3x/week) or completed sessions + 0 missed
    plannedSessions = Math.max(completedSessions, Math.round(totalWeeks * 3));
    missedSessions = Math.max(0, plannedSessions - completedSessions);
  }

  // Adherence rate = (completed / planned) * 100
  const adherenceRatePercent = plannedSessions > 0 
    ? Math.min(100, Math.round((completedSessions / plannedSessions) * 100))
    : (completedSessions > 0 ? 100 : 0);

  const avgWeeklyFrequency = Number((completedSessions / totalWeeks).toFixed(1));

  // Monthly breakdown
  const monthlyMap = new Map<string, { planned: number; completed: number }>();
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  // Bucket sessions by month
  studentSessions.forEach(s => {
    const d = new Date(s.startTime);
    const key = `${monthNames[d.getMonth()]}/${d.getFullYear()}`;
    const curr = monthlyMap.get(key) || { planned: 0, completed: 0 };
    curr.completed += 1;
    monthlyMap.set(key, curr);
  });

  // Bucket appointments by month if available
  studentAppts.forEach(a => {
    const d = new Date(a.date + 'T12:00:00');
    const key = `${monthNames[d.getMonth()]}/${d.getFullYear()}`;
    const curr = monthlyMap.get(key) || { planned: 0, completed: 0 };
    curr.planned += 1;
    monthlyMap.set(key, curr);
  });

  const monthlyBreakdown: MonthlyAdherenceBreakdown[] = Array.from(monthlyMap.entries()).map(([monthLabel, data]) => {
    const planned = Math.max(data.planned, data.completed);
    const rate = planned > 0 ? Math.round((data.completed / planned) * 100) : 100;
    return {
      monthLabel,
      planned,
      completed: data.completed,
      ratePercent: rate
    };
  });

  // Best and lowest month
  let bestMonthLabel: string | undefined = undefined;
  let lowestMonthLabel: string | undefined = undefined;
  if (monthlyBreakdown.length > 0) {
    const sorted = [...monthlyBreakdown].sort((a, b) => b.ratePercent - a.ratePercent || b.completed - a.completed);
    bestMonthLabel = `${sorted[0].monthLabel} (${sorted[0].ratePercent}%)`;
    if (sorted.length > 1) {
      lowestMonthLabel = `${sorted[sorted.length - 1].monthLabel} (${sorted[sorted.length - 1].ratePercent}%)`;
    }
  }

  // Active weeks streak calculation
  let longestActiveStreakWeeks = 0;
  let currentStreak = 0;
  // Check week by week in range
  const weekCount = Math.ceil(durationDays / 7);
  for (let w = 0; w < weekCount; w++) {
    const wStart = startMs + w * 7 * 24 * 60 * 60 * 1000;
    const wEnd = wStart + 7 * 24 * 60 * 60 * 1000;
    const hasWorkout = studentSessions.some(s => {
      const t = new Date(s.startTime).getTime();
      return t >= wStart && t < wEnd;
    });
    if (hasWorkout) {
      currentStreak++;
      if (currentStreak > longestActiveStreakWeeks) longestActiveStreakWeeks = currentStreak;
    } else {
      currentStreak = 0;
    }
  }

  const adherence: ReportAdherenceMetrics = {
    plannedSessions,
    completedSessions,
    missedSessions,
    cancelledSessions,
    adherenceRatePercent,
    avgWeeklyFrequency,
    longestActiveStreakWeeks: longestActiveStreakWeeks || (completedSessions > 0 ? 1 : 0),
    bestMonthLabel,
    lowestMonthLabel,
    monthlyBreakdown
  };

  // 3. EXERCISE PROGRESSION TRACKING
  const exerciseMap = new Map<string, {
    exerciseName: string;
    muscleGroup: string;
    points: { date: string; loadKg: number; reps: number; volumeKg: number }[];
  }>();

  studentSessions.forEach(session => {
    const dateStr = session.startTime.split('T')[0];
    const sets = Array.isArray(session.sets) ? session.sets : [];

    sets.forEach(set => {
      if (!set || !set.exerciseId) return;
      const exId = set.exerciseId;
      const exName = set.exerciseName || 'Exercício';
      const mGroup = set.muscleGroup || 'Geral';
      const load = typeof set.weightKg === 'number' ? set.weightKg : 0;
      const reps = typeof set.actualReps === 'number' ? set.actualReps : (typeof set.targetReps === 'number' ? set.targetReps : 0);
      const setVol = load * reps;

      if (!exerciseMap.has(exId)) {
        exerciseMap.set(exId, {
          exerciseName: exName,
          muscleGroup: mGroup,
          points: []
        });
      }

      exerciseMap.get(exId)!.points.push({
        date: dateStr,
        loadKg: load,
        reps,
        volumeKg: setVol
      });
    });
  });

  const exerciseProgressions: ReportExerciseProgression[] = [];
  exerciseMap.forEach((data, exId) => {
    if (data.points.length === 0) return;
    // Sort chronologically
    data.points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const firstPt = data.points[0];
    const lastPt = data.points[data.points.length - 1];

    // Find max load in beginning third vs end third or first vs last point
    const initialLoadKg = firstPt.loadKg;
    const finalLoadKg = lastPt.loadKg;
    const deltaKg = Number((finalLoadKg - initialLoadKg).toFixed(1));
    const deltaPercent = initialLoadKg > 0 
      ? Number((((finalLoadKg - initialLoadKg) / initialLoadKg) * 100).toFixed(1))
      : (finalLoadKg > 0 ? 100 : 0);

    const bestSetVol = Math.max(...data.points.map(p => p.volumeKg));

    exerciseProgressions.push({
      exerciseId: exId,
      exerciseName: data.exerciseName,
      muscleGroup: data.muscleGroup,
      initialLoadKg,
      finalLoadKg,
      deltaKg,
      deltaPercent,
      initialReps: firstPt.reps,
      finalReps: lastPt.reps,
      bestSetVolumeKg: bestSetVol,
      historyData: data.points,
      isSelected: true // Default top exercises selected
    });
  });

  // Sort exercises by highest progression or highest load
  exerciseProgressions.sort((a, b) => b.deltaPercent - a.deltaPercent || b.finalLoadKg - a.finalLoadKg);

  // 4. PERFORMANCE HIGHLIGHTS & RECORDS
  const performanceHighlights: ReportPerformanceHighlight[] = [];

  // Extract PRs from sessions in period
  const prList: { exName: string; weight: number; reps: number; date: string }[] = [];
  studentSessions.forEach(s => {
    const sDate = s.startTime.split('T')[0];
    if (Array.isArray(s.prsAchieved)) {
      s.prsAchieved.forEach(pr => {
        prList.push({
          exName: pr.exerciseName,
          weight: pr.weightKg || pr.newValue || 0,
          reps: pr.reps || 1,
          date: pr.date || sDate
        });
      });
    }
    // Also check max load in sets
    if (Array.isArray(s.sets)) {
      s.sets.forEach(st => {
        if (st.weightKg && st.weightKg > 0) {
          prList.push({
            exName: st.exerciseName,
            weight: st.weightKg,
            reps: st.actualReps || 1,
            date: sDate
          });
        }
      });
    }
  });

  if (prList.length > 0) {
    prList.sort((a, b) => b.weight - a.weight);
    const topLoad = prList[0];
    performanceHighlights.push({
      id: generateId('high'),
      title: 'Carga Máxima do Ciclo',
      metricValue: `${topLoad.weight} kg (${topLoad.reps} reps)`,
      date: topLoad.date,
      exerciseOrTestName: topLoad.exName,
      type: 'max_load'
    });
  }

  // Best session volume
  let bestSessionVolume = 0;
  let bestSessionDate = '';
  let bestSessionRoutine = '';
  studentSessions.forEach(s => {
    if (s.totalVolume > bestSessionVolume) {
      bestSessionVolume = s.totalVolume;
      bestSessionDate = s.startTime.split('T')[0];
      bestSessionRoutine = s.routineTitle || s.workoutName || 'Treino';
    }
  });

  if (bestSessionVolume > 0) {
    performanceHighlights.push({
      id: generateId('high'),
      title: 'Maior Volume em Sessão Única',
      metricValue: `${formatWeight(bestSessionVolume)} movimentados`,
      date: bestSessionDate,
      exerciseOrTestName: bestSessionRoutine,
      type: 'max_volume'
    });
  }

  if (longestActiveStreakWeeks >= 3) {
    performanceHighlights.push({
      id: generateId('high'),
      title: 'Consistência Máxima',
      metricValue: `${longestActiveStreakWeeks} semanas consecutivas de treino`,
      date: endDate,
      type: 'best_streak'
    });
  }

  // 5. PHYSICAL ASSESSMENTS COMPARISON
  const studentAssessments = assessments
    .filter(a => a.studentId === student.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Look for assessments in range or closest before start and closest to end
  const assessmentsInRange = studentAssessments.filter(a => {
    const t = new Date(a.date).getTime();
    return t >= startMs && t <= endMs;
  });

  let initialAssessment: PhysicalAssessment | undefined = undefined;
  let finalAssessment: PhysicalAssessment | undefined = undefined;

  if (assessmentsInRange.length >= 2) {
    initialAssessment = assessmentsInRange[0];
    finalAssessment = assessmentsInRange[assessmentsInRange.length - 1];
  } else if (assessmentsInRange.length === 1) {
    // If only one in range, check if there was a previous baseline before start
    const beforeRange = studentAssessments.filter(a => new Date(a.date).getTime() < startMs);
    if (beforeRange.length > 0) {
      initialAssessment = beforeRange[beforeRange.length - 1];
      finalAssessment = assessmentsInRange[0];
    } else {
      finalAssessment = assessmentsInRange[0];
    }
  } else if (studentAssessments.length >= 2) {
    // Fallback: take latest two overall
    initialAssessment = studentAssessments[studentAssessments.length - 2];
    finalAssessment = studentAssessments[studentAssessments.length - 1];
  } else if (studentAssessments.length === 1) {
    finalAssessment = studentAssessments[0];
  }

  const physicalMetrics: PhysicalComparisonMetric[] = [];
  let physicalHasData = false;

  if (initialAssessment && finalAssessment && initialAssessment.id !== finalAssessment.id) {
    physicalHasData = true;
    dataSources.push({
      item: 'Avaliações Físicas Comparativas',
      source: `Comparativo de ${initialAssessment.date} vs ${finalAssessment.date}`,
      timestamp: finalAssessment.date
    });

    const addMetric = (
      key: string,
      label: string,
      initial: number | undefined,
      final: number | undefined,
      unit: string,
      direction: 'up_good' | 'down_good' | 'neutral'
    ) => {
      if (typeof initial === 'number' && typeof final === 'number' && (initial > 0 || final > 0)) {
        const deltaAbs = Number((final - initial).toFixed(2));
        const deltaPercent = initial > 0 ? Number((((final - initial) / initial) * 100).toFixed(1)) : 0;
        physicalMetrics.push({
          key,
          label,
          initial,
          final,
          deltaAbs,
          deltaPercent,
          unit,
          direction
        });
      }
    };

    addMetric('weight', 'Peso Corporal', initialAssessment.weightKg, finalAssessment.weightKg, 'kg', 'neutral');
    addMetric('bodyFat', '% Gordura Corporal', initialAssessment.bodyFatPercentage, finalAssessment.bodyFatPercentage, '%', 'down_good');
    addMetric('leanMass', 'Massa Muscular / Magra Estimada', initialAssessment.leanMassKg, finalAssessment.leanMassKg, 'kg', 'up_good');
    addMetric('fatMass', 'Massa Gorda', initialAssessment.fatMassKg, finalAssessment.fatMassKg, 'kg', 'down_good');
    addMetric('bmi', 'Índice de Massa Corporal (IMC)', initialAssessment.bmi, finalAssessment.bmi, 'kg/m²', 'neutral');

    // Circumferences
    const initCirc = initialAssessment.circumferences || {};
    const finalCirc = finalAssessment.circumferences || {};

    addMetric('waist', 'Cintura', initCirc.waist, finalCirc.waist, 'cm', 'down_good');
    addMetric('abdomen', 'Abdômen', initCirc.abdomen, finalCirc.abdomen, 'cm', 'down_good');
    addMetric('hips', 'Quadril', initCirc.hips, finalCirc.hips, 'cm', 'neutral');
    addMetric('chest', 'Tórax / Peitoral', initCirc.chest, finalCirc.chest, 'cm', 'up_good');
    addMetric('armR', 'Braço Direito Contraído', initCirc.rightArmContracted, finalCirc.rightArmContracted, 'cm', 'up_good');
    addMetric('armL', 'Braço Esquerdo Contraído', initCirc.leftArmContracted, finalCirc.leftArmContracted, 'cm', 'up_good');
    addMetric('thighR', 'Coxa Direita', initCirc.rightThigh, finalCirc.rightThigh, 'cm', 'up_good');
    addMetric('thighL', 'Coxa Esquerda', initCirc.leftThigh, finalCirc.leftThigh, 'cm', 'up_good');
  }

  const physicalComparison: ReportPhysicalComparison = {
    hasData: physicalHasData,
    initialAssessmentDate: initialAssessment?.date,
    finalAssessmentDate: finalAssessment?.date,
    metrics: physicalMetrics,
    skinfoldSumInitial: initialAssessment?.sumOfSkinfolds,
    skinfoldSumFinal: finalAssessment?.sumOfSkinfolds,
    skinfoldSumDeltaPercent: initialAssessment?.sumOfSkinfolds && finalAssessment?.sumOfSkinfolds
      ? Number((((finalAssessment.sumOfSkinfolds - initialAssessment.sumOfSkinfolds) / initialAssessment.sumOfSkinfolds) * 100).toFixed(1))
      : undefined
  };

  // 6. FUNCTIONAL ASSESSMENTS COMPARISON
  const studentFA = functionalAssessments
    .filter(fa => fa.studentId === student.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const functionalTestsComparison: FunctionalComparisonTest[] = [];
  let functionalHasData = false;

  // Aggregate results by testId
  const testResultsMap = new Map<string, {
    testName: string;
    domain: string;
    unit: string;
    unitLabel: string;
    results: { date: string; numeric?: number; text: string; direction: string }[];
  }>();

  studentFA.forEach(fa => {
    fa.results.forEach(res => {
      if (!testResultsMap.has(res.testId)) {
        testResultsMap.set(res.testId, {
          testName: res.testName,
          domain: DOMAIN_LABELS[res.domain] || res.domain,
          unit: res.unit,
          unitLabel: res.unitLabel,
          results: []
        });
      }

      const formattedVal = res.primaryValueNumeric !== undefined 
        ? `${res.primaryValueNumeric} ${res.unitLabel || ''}`
        : (res.primaryValueCategorical || '-');

      testResultsMap.get(res.testId)!.results.push({
        date: fa.date,
        numeric: res.primaryValueNumeric,
        text: formattedVal,
        direction: res.direction
      });
    });
  });

  testResultsMap.forEach((entry, testId) => {
    if (entry.results.length === 0) return;
    functionalHasData = true;
    entry.results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const firstRes = entry.results[0];
    const lastRes = entry.results[entry.results.length - 1];

    let deltaPercent: number | undefined = undefined;
    let status: 'improving' | 'stable' | 'declining' | 'baseline' | 'not_assessed' = 'baseline';
    let statusLabel = 'Linha de base';

    if (entry.results.length > 1 && firstRes.numeric !== undefined && lastRes.numeric !== undefined && firstRes.numeric > 0) {
      const isHigherBetter = firstRes.direction !== 'lower_is_better';
      const rawDelta = ((lastRes.numeric - firstRes.numeric) / firstRes.numeric) * 100;
      deltaPercent = Number(rawDelta.toFixed(1));

      if (isHigherBetter) {
        if (deltaPercent >= 5) {
          status = 'improving';
          statusLabel = 'Evolução Positiva (+)';
        } else if (deltaPercent <= -5) {
          status = 'declining';
          statusLabel = 'Atenção / Redução';
        } else {
          status = 'stable';
          statusLabel = 'Estável / Manutenção';
        }
      } else {
        // Lower is better (e.g. TUG time)
        if (deltaPercent <= -5) {
          status = 'improving';
          statusLabel = 'Evolução Positiva (Tempo menor)';
        } else if (deltaPercent >= 5) {
          status = 'declining';
          statusLabel = 'Atenção / Tempo maior';
        } else {
          status = 'stable';
          statusLabel = 'Estável / Manutenção';
        }
      }
    }

    functionalTestsComparison.push({
      testId,
      testName: entry.testName,
      domain: entry.domain,
      unit: entry.unit,
      unitLabel: entry.unitLabel,
      initialDate: firstRes.date,
      initialValue: firstRes.text,
      initialNumeric: firstRes.numeric,
      finalDate: lastRes.date,
      finalValue: lastRes.text,
      finalNumeric: lastRes.numeric,
      deltaPercent,
      status,
      statusLabel
    });
  });

  const functionalComparison: ReportFunctionalComparison = {
    hasData: functionalHasData,
    tests: functionalTestsComparison
  };

  if (functionalHasData) {
    dataSources.push({
      item: 'Baterias Funcionais & Testes de Longevidade',
      source: `${functionalTestsComparison.length} testes funcionais analisados`,
      timestamp: endDate
    });
  }

  // 7. DAILY LIVING IMPACT (AUTORREFERIDOS)
  const dailyLivingImpact: ReportDailyLivingImpact = {
    indicators: DEFAULT_DAILY_LIVING_ITEMS.map(item => ({
      id: item.id,
      name: item.name,
      score: item.defaultScore,
      previousScore: Math.max(1, item.defaultScore - 2),
      isCustom: false
    })),
    generalNotes: 'Indicadores qualitativos autorreferidos pelo aluno ao longo do período de acompanhamento físico e funcional.',
    assessedAt: endDate
  };

  // 8. GOALS PROGRESSION
  const reportGoals: ReportGoalItem[] = [];

  // Check functional goals if exist
  functionalGoals.forEach(fg => {
    let status: ReportGoalItem['status'] = 'in_progress';
    if (fg.status === 'achieved') status = 'achieved';
    else if (fg.status === 'cancelled') status = 'not_achieved';

    reportGoals.push({
      id: fg.id,
      name: fg.title,
      associatedMetric: fg.testName || DOMAIN_LABELS[fg.domain],
      initialValue: fg.initialValueNumeric !== undefined ? `${fg.initialValueNumeric} ${fg.unitLabel || ''}` : undefined,
      targetValue: fg.targetValueNumeric !== undefined ? `${fg.targetValueNumeric} ${fg.unitLabel || ''}` : (fg.targetValueCategorical || 'Meta funcional'),
      currentValue: fg.currentValueNumeric !== undefined ? `${fg.currentValueNumeric} ${fg.unitLabel || ''}` : undefined,
      status,
      notes: fg.notes
    });
  });

  // If no functional goals exist, create standard goals from metrics
  if (reportGoals.length === 0) {
    reportGoals.push({
      id: generateId('goal'),
      name: 'Taxa de Adesão aos Treinos ≥ 90%',
      associatedMetric: 'Adesão',
      initialValue: '80%',
      targetValue: '≥ 90%',
      currentValue: `${adherenceRatePercent}%`,
      status: adherenceRatePercent >= 90 ? 'achieved' : (adherenceRatePercent >= 80 ? 'in_progress' : 'not_achieved')
    });

    if (exerciseProgressions.length > 0) {
      const topEx = exerciseProgressions[0];
      reportGoals.push({
        id: generateId('goal'),
        name: `Sobrecarga Progressiva em ${topEx.exerciseName}`,
        associatedMetric: 'Força & Cargas',
        initialValue: `${topEx.initialLoadKg} kg`,
        targetValue: `+15% (${Math.round(topEx.initialLoadKg * 1.15)} kg)`,
        currentValue: `${topEx.finalLoadKg} kg (${topEx.deltaPercent >= 0 ? '+' : ''}${topEx.deltaPercent}%)`,
        status: topEx.deltaPercent >= 15 ? 'achieved' : (topEx.deltaPercent > 0 ? 'in_progress' : 'not_started')
      });
    }

    if (physicalComparison.hasData && physicalMetrics.length > 0) {
      const bfMetric = physicalMetrics.find(m => m.key === 'bodyFat');
      const lmMetric = physicalMetrics.find(m => m.key === 'leanMass');
      if (bfMetric) {
        reportGoals.push({
          id: generateId('goal'),
          name: 'Otimização de Composição Corporal (% Gordura)',
          associatedMetric: '% Gordura',
          initialValue: `${bfMetric.initial}%`,
          targetValue: `Redução sustentável`,
          currentValue: `${bfMetric.final}% (${bfMetric.deltaAbs > 0 ? '+' : ''}${bfMetric.deltaAbs}%)`,
          status: bfMetric.deltaAbs <= -0.5 ? 'achieved' : 'in_progress'
        });
      } else if (lmMetric) {
        reportGoals.push({
          id: generateId('goal'),
          name: 'Aumento de Massa Magra Estimada',
          associatedMetric: 'Massa Magra',
          initialValue: `${lmMetric.initial} kg`,
          targetValue: `+1.0 kg`,
          currentValue: `${lmMetric.final} kg (${lmMetric.deltaAbs > 0 ? '+' : ''}${lmMetric.deltaAbs} kg)`,
          status: lmMetric.deltaAbs >= 1.0 ? 'achieved' : 'in_progress'
        });
      }
    }

    if (functionalComparison.hasData && functionalTestsComparison.length > 0) {
      const topTest = functionalTestsComparison[0];
      reportGoals.push({
        id: generateId('goal'),
        name: `Melhora no Teste de ${topTest.testName}`,
        associatedMetric: 'Capacidade Funcional',
        initialValue: topTest.initialValue,
        targetValue: 'Evolução Positiva',
        currentValue: topTest.finalValue,
        status: topTest.status === 'improving' ? 'achieved' : 'in_progress'
      });
    }
  }

  // 9. TFIVE EVOLUTION SCORE MULTIDIMENSIONAL
  // Weights adjustment based on primaryGoal:
  let wAdherence = 25;
  let wPerformance = 25;
  let wFunctional = 20;
  let wMobility = 15;
  let wBodyComp = 15;

  if (primaryGoal === 'Longevidade funcional' || primaryGoal === 'Qualidade de vida') {
    wAdherence = 30;
    wFunctional = 30;
    wMobility = 20;
    wPerformance = 10;
    wBodyComp = 10;
  } else if (primaryGoal === 'Hipertrofia' || primaryGoal === 'Ganho de força') {
    wPerformance = 35;
    wAdherence = 25;
    wBodyComp = 20;
    wFunctional = 10;
    wMobility = 10;
  } else if (primaryGoal === 'Emagrecimento' || primaryGoal === 'Recomposição corporal') {
    wBodyComp = 35;
    wAdherence = 30;
    wPerformance = 20;
    wFunctional = 10;
    wMobility = 5;
  }

  // 1. Adherence score (0-100)
  const scoreAdherenceVal = Math.min(100, Math.max(0, adherenceRatePercent));

  // 2. Performance score (0-100)
  let scorePerformanceVal = 80;
  if (exerciseProgressions.length > 0) {
    const avgProg = exerciseProgressions.slice(0, 5).reduce((acc, ex) => acc + Math.max(0, ex.deltaPercent), 0) / Math.min(5, exerciseProgressions.length);
    // 0% -> 70, 10% -> 85, 20%+ -> 95-100
    scorePerformanceVal = Math.min(100, Math.max(50, Math.round(70 + (avgProg * 1.5))));
  }

  // 3. Functional Capacity score (0-100)
  let scoreFunctionalVal = 85;
  const functionalHasEnough = functionalComparison.hasData && functionalTestsComparison.length > 0;
  if (functionalHasEnough) {
    const improvingCount = functionalTestsComparison.filter(t => t.status === 'improving').length;
    const ratio = improvingCount / functionalTestsComparison.length;
    scoreFunctionalVal = Math.round(70 + ratio * 30);
  }

  // 4. Mobility score (0-100)
  const mobilityTests = functionalTestsComparison.filter(t => t.domain.toLowerCase().includes('mobilidade') || t.domain.toLowerCase().includes('equilíbrio'));
  const mobilityHasEnough = mobilityTests.length > 0;
  let scoreMobilityVal = 80;
  if (mobilityHasEnough) {
    const mobImproving = mobilityTests.filter(t => t.status === 'improving' || t.status === 'stable').length;
    scoreMobilityVal = Math.round(75 + (mobImproving / mobilityTests.length) * 25);
  }

  // 5. Body Comp score (0-100)
  const bodyCompHasEnough = physicalComparison.hasData && physicalMetrics.length >= 2;
  let scoreBodyCompVal = 80;
  if (bodyCompHasEnough) {
    let positiveChanges = 0;
    physicalMetrics.forEach(m => {
      if (m.direction === 'down_good' && m.deltaAbs < 0) positiveChanges++;
      if (m.direction === 'up_good' && m.deltaAbs > 0) positiveChanges++;
    });
    scoreBodyCompVal = Math.round(70 + (positiveChanges / physicalMetrics.length) * 30);
  }

  const dimensions: ReportEvolutionScore['dimensions'] = {
    adherence: {
      key: 'adherence',
      label: 'Adesão & Consistência',
      score: scoreAdherenceVal,
      weight: wAdherence,
      enabled: true,
      hasEnoughData: true,
      details: `${completedSessions} de ${plannedSessions} sessões realizadas (${adherenceRatePercent}% de adesão)`,
      metrics: [`${adherenceRatePercent}% taxa de adesão`, `${avgWeeklyFrequency}x frequência semanal média`, `${longestActiveStreakWeeks} semanas de sequência`]
    },
    performance: {
      key: 'performance',
      label: 'Performance & Sobrecarga',
      score: scorePerformanceVal,
      weight: wPerformance,
      enabled: true,
      hasEnoughData: exerciseProgressions.length > 0,
      details: exerciseProgressions.length > 0 
        ? `Evolução média de carga nos principais exercícios: +${exerciseProgressions[0]?.deltaPercent || 0}%`
        : 'Sem registros suficientes de progressão no período',
      metrics: exerciseProgressions.slice(0, 3).map(e => `${e.exerciseName}: ${e.initialLoadKg}kg → ${e.finalLoadKg}kg (+${e.deltaPercent}%)`)
    },
    functionalCapacity: {
      key: 'functionalCapacity',
      label: 'Capacidade Funcional',
      score: scoreFunctionalVal,
      weight: wFunctional,
      enabled: functionalHasEnough,
      hasEnoughData: functionalHasEnough,
      details: functionalHasEnough 
        ? `${functionalTestsComparison.length} testes funcionais monitorados com melhora locomotora e estabilidade`
        : 'Testes funcionais sem repetição no período',
      metrics: functionalTestsComparison.slice(0, 3).map(t => `${t.testName}: ${t.initialValue} → ${t.finalValue}`)
    },
    mobility: {
      key: 'mobility',
      label: 'Mobilidade & Estabilidade',
      score: scoreMobilityVal,
      weight: wMobility,
      enabled: mobilityHasEnough,
      hasEnoughData: mobilityHasEnough,
      details: mobilityHasEnough 
        ? 'Amplitude de movimento preservada e controle postural adequado'
        : 'Indicador baseado na consistência dos treinos de mobilidade',
      metrics: mobilityTests.map(t => `${t.testName}: ${t.statusLabel}`)
    },
    bodyComposition: {
      key: 'bodyComposition',
      label: 'Composição Corporal',
      score: scoreBodyCompVal,
      weight: wBodyComp,
      enabled: bodyCompHasEnough,
      hasEnoughData: bodyCompHasEnough,
      details: bodyCompHasEnough 
        ? `Comparativo físico entre ${initialAssessment?.date} e ${finalAssessment?.date}`
        : 'Avaliação física comparativa não cadastrada no período',
      metrics: physicalMetrics.slice(0, 3).map(m => `${m.label}: ${m.initial} → ${m.final} ${m.unit} (${m.deltaAbs > 0 ? '+' : ''}${m.deltaAbs})`)
    }
  };

  // Calculate weighted overall score among enabled and with-enough-data dimensions
  let totalWeighted = 0;
  let totalWeight = 0;
  Object.values(dimensions).forEach(dim => {
    if (dim.enabled && dim.hasEnoughData) {
      totalWeighted += dim.score * dim.weight;
      totalWeight += dim.weight;
    }
  });

  const overallScore = totalWeight > 0 ? Math.round(totalWeighted / totalWeight) : 85;

  const evolutionScore: ReportEvolutionScore = {
    overallScore,
    dimensions,
    methodologyNotes: 'O TFIVE Evolution Score é um índice interno multidimensional e transparente de acompanhamento do treinamento e adesão. Não constitui diagnóstico clínico ou prognóstico médico.'
  };

  // 10. SUGGEST PERIOD STATUS
  let periodStatus: ReportPeriodStatus = 'Evolução consistente';
  if (overallScore >= 92 && adherenceRatePercent >= 90) {
    periodStatus = 'Evolução excelente';
  } else if (overallScore >= 84) {
    periodStatus = 'Evolução acima do esperado';
  } else if (overallScore >= 72) {
    periodStatus = 'Evolução consistente';
  } else if (overallScore >= 60) {
    periodStatus = 'Evolução moderada';
  } else if (adherenceRatePercent < 50) {
    periodStatus = 'Atenção necessária';
  } else {
    periodStatus = 'Manutenção';
  }

  // 11. KEY INDICATORS CARDS
  const keyIndicators: ReportKeyIndicator[] = [
    {
      id: 'ki-adherence',
      label: 'ADESÃO AO PROGRAMA',
      value: `${adherenceRatePercent}%`,
      change: `${completedSessions} de ${plannedSessions} treinos`,
      isPositive: adherenceRatePercent >= 80,
      category: 'adherence',
      highlight: true,
      sourceNote: 'Histórico de presença e sessões'
    },
    {
      id: 'ki-workouts',
      label: 'TREINOS REALIZADOS',
      value: `${completedSessions}`,
      change: `${avgWeeklyFrequency}x por semana`,
      isPositive: true,
      category: 'volume',
      highlight: true,
      sourceNote: 'Sessões concluídas'
    }
  ];

  if (exerciseProgressions.length > 0) {
    const topProg = exerciseProgressions[0];
    keyIndicators.push({
      id: 'ki-strength',
      label: 'FORÇA & CARGAS',
      value: `+${topProg.deltaPercent}%`,
      change: `Destaque: ${topProg.exerciseName} (${topProg.initialLoadKg}kg → ${topProg.finalLoadKg}kg)`,
      isPositive: topProg.deltaPercent >= 0,
      category: 'strength',
      highlight: true,
      sourceNote: 'Sobrecarga progressiva'
    });
  }

  if (functionalHasEnough) {
    keyIndicators.push({
      id: 'ki-functional',
      label: 'CAPACIDADE FUNCIONAL',
      value: `${scoreFunctionalVal}/100`,
      change: `${functionalTestsComparison.filter(t => t.status === 'improving').length} testes com melhora`,
      isPositive: true,
      category: 'functional',
      highlight: true,
      sourceNote: 'Bateria de testes funcionais'
    });
  }

  if (bodyCompHasEnough) {
    const bf = physicalMetrics.find(m => m.key === 'bodyFat');
    const lm = physicalMetrics.find(m => m.key === 'leanMass');
    keyIndicators.push({
      id: 'ki-bodycomp',
      label: 'COMPOSIÇÃO CORPORAL',
      value: bf ? `${bf.deltaAbs > 0 ? '+' : ''}${bf.deltaAbs}% Gordura` : (lm ? `+${lm.deltaAbs}kg Massa Magra` : 'Evolução Positiva'),
      change: `Avaliação de ${initialAssessment?.date} a ${finalAssessment?.date}`,
      isPositive: true,
      category: 'body_comp',
      highlight: true,
      sourceNote: 'Protocolo de avaliação física'
    });
  }

  // 12. ACHIEVEMENTS OF THE PERIOD
  const achievements: ReportAchievement[] = [];
  if (adherenceRatePercent >= 90) {
    achievements.push({
      id: generateId('ach'),
      title: 'Alta Adesão ao Treinamento',
      description: `Completou ${adherenceRatePercent}% das sessões planejadas com disciplina e frequência exemplar.`,
      category: 'streak',
      isAutoGenerated: true
    });
  }

  if (exerciseProgressions.length > 0 && exerciseProgressions[0].deltaPercent >= 10) {
    const bestEx = exerciseProgressions[0];
    achievements.push({
      id: generateId('ach'),
      title: `Evolução de Força em ${bestEx.exerciseName}`,
      description: `Aumento de ${bestEx.deltaKg} kg (+${bestEx.deltaPercent}%) na carga de trabalho com técnica controlada.`,
      category: 'load',
      isAutoGenerated: true
    });
  }

  if (longestActiveStreakWeeks >= 4) {
    achievements.push({
      id: generateId('ach'),
      title: 'Sequência de Consistência',
      description: `${longestActiveStreakWeeks} semanas consecutivas mantendo a rotina de treinos sem interrupções.`,
      category: 'streak',
      isAutoGenerated: true
    });
  }

  if (physicalComparison.hasData) {
    const bf = physicalMetrics.find(m => m.key === 'bodyFat' && m.deltaAbs <= -0.5);
    const lm = physicalMetrics.find(m => m.key === 'leanMass' && m.deltaAbs >= 0.5);
    if (bf) {
      achievements.push({
        id: generateId('ach'),
        title: 'Redução de Gordura Corporal',
        description: `Redução de ${Math.abs(bf.deltaAbs)}% no percentual de gordura (${bf.initial}% → ${bf.final}%).`,
        category: 'body_comp',
        isAutoGenerated: true
      });
    }
    if (lm) {
      achievements.push({
        id: generateId('ach'),
        title: 'Aumento de Massa Magra Estimada',
        description: `Ganho de ${lm.deltaAbs} kg de massa magra (${lm.initial} kg → ${lm.final} kg).`,
        category: 'body_comp',
        isAutoGenerated: true
      });
    }
  }

  // 13. TIMELINE EVENTS
  const timelineEvents: ReportTimelineEvent[] = [];
  if (initialAssessment) {
    timelineEvents.push({
      id: generateId('tl'),
      date: initialAssessment.date,
      title: 'Avaliação Inicial do Ciclo',
      description: `Registro da linha de base: peso de ${initialAssessment.weightKg} kg e ${initialAssessment.bodyFatPercentage}% de gordura.`,
      type: 'assessment'
    });
  }

  if (studentSessions.length > 0) {
    const firstS = studentSessions[0];
    timelineEvents.push({
      id: generateId('tl'),
      date: firstS.startTime.split('T')[0],
      title: 'Início da Fase de Treinamento',
      description: `Início da periodização com foco em ${primaryGoal}.`,
      type: 'phase_change'
    });
  }

  if (performanceHighlights.length > 0) {
    performanceHighlights.forEach(ph => {
      timelineEvents.push({
        id: generateId('tl'),
        date: ph.date || startDate,
        title: ph.title,
        description: `${ph.exerciseOrTestName ? ph.exerciseOrTestName + ': ' : ''}${ph.metricValue}`,
        type: 'pr_record'
      });
    });
  }

  if (finalAssessment && (!initialAssessment || finalAssessment.id !== initialAssessment.id)) {
    timelineEvents.push({
      id: generateId('tl'),
      date: finalAssessment.date,
      title: 'Reavaliação e Fechamento do Ciclo',
      description: `Conclusão da medição do período com peso de ${finalAssessment.weightKg} kg e consolidação dos resultados.`,
      type: 'reevaluation'
    });
  }

  // Sort timeline chronologically
  timelineEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 14. TRAINER OPINION DRAFT
  const trainerName = trainerProfile?.name || 'Personal Trainer TFIVE PRO';
  const trainerCref = trainerProfile?.cref || 'CREF';

  const trainerOpinion: ReportTrainerOpinion = {
    summaryStatement: `Durante este ciclo (${startDate} a ${endDate}), o aluno ${student.name} demonstrou comprometimento exemplar com o planejamento prescrito, alcançando ${adherenceRatePercent}% de adesão e média de ${avgWeeklyFrequency} treinos semanais.`,
    observedEvolution: `Notou-se expressivo aprimoramento na execução técnica e na capacidade de suporte de carga, destacando-se uma evolução média positiva nos exercícios multiarticulares e consolidação da capacidade funcional.`,
    keyAchievements: achievements.map(a => `• ${a.title}: ${a.description}`).join('\n') || '• Manutenção da regularidade e consistência semanal.',
    challengesFaced: `Adaptação inicial às cargas de trabalho e ajuste fino da recuperação muscular entre as sessões mais intensas.`,
    contributingFactors: `Pontualidade nas sessões, cumprimento das séries prescritas e comunicação transparente dos níveis de esforço (RPE).`,
    improvementAreas: `Consolidar a progressão em exercícios complementares e manter a disciplina nas rotinas de mobilidade articular.`,
    dateIssued: new Date().toISOString().split('T')[0],
    trainerName,
    trainerCref
  };

  // 15. NEXT CYCLE PLAN
  const nextCyclePlan: ReportNextCyclePlan = {
    maintainList: [
      `Frequência mínima de ${Math.max(3, Math.round(avgWeeklyFrequency))} sessões semanais`,
      'Execução com técnica estrita e amplitude completa',
      'Registro contínuo das percepções de esforço e recuperação'
    ],
    progressList: [
      'Sobrecarga progressiva nos exercícios compostos fundamentais',
      'Aumento gradual da densidade de treino com controle do tempo de pausa',
      'Testes funcionais de mobilidade e estabilidade postural'
    ],
    prioritizeList: [
      `Foco prioritário no objetivo: ${primaryGoal}`,
      'Fortalecimento de cadeias musculares estabilizadoras e core',
      'Autonomia e capacidade locomotora nas atividades cotidianas'
    ],
    monitorList: [
      'Controle de volume semanal total',
      'Prevenção de sobrecarga articular e sinais de fadiga',
      'Aderência e assiduidade mensal'
    ],
    newPrimaryGoal: primaryGoal,
    expectedWeeklyFrequency: Math.max(3, Math.round(avgWeeklyFrequency)),
    keyFocusAreas: `Consolidação dos ganhos obtidos no ciclo anterior e avanço na periodização voltada para ${primaryGoal.toLowerCase()}.`,
    nextAssessmentTargetDate: new Date(new Date(endDate).getTime() + (periodType === 'Semestral' ? 180 : 90) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    nextCycleGoals: [
      'Manter taxa de adesão ≥ 90%',
      'Progredir em pelo menos 10% a tonelagem total nos exercícios base',
      'Realizar nova reavaliação física e funcional na data prevista'
    ]
  };

  const activeTrainer: TrainerProfile = trainerProfile || {
    name: 'Treinador TFIVE',
    title: 'Personal Trainer',
    cref: 'CREF 000000-G/SP',
    phone: '',
    email: '',
    slogan: 'Performance sem desculpas. Resultados sem limites.'
  };

  return {
    id: generateId('rep'),
    studentId: student.id,
    studentName: student.name,
    studentPhoto: student.photo,
    status: 'draft',
    title: `Relatório de Performance e Evolução — ${student.name}`,
    periodType,
    startDate,
    endDate,
    durationDays,
    primaryGoal,
    secondaryGoals,
    periodStatus,
    trainerProfile: activeTrainer,
    evolutionScore,
    keyIndicators,
    achievements,
    adherence,
    exerciseProgressions,
    performanceHighlights,
    physicalComparison,
    functionalComparison,
    dailyLivingImpact,
    timelineEvents,
    goals: reportGoals,
    trainerOpinion,
    nextCyclePlan,
    dataSources,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
