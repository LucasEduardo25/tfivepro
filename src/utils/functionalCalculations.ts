import {
  FunctionalAssessment,
  FunctionalTestResult,
  FunctionalTest,
  FunctionalDomain,
  AutonomyTaskKey,
  EvolutionStatus,
  FunctionalGoal,
  ImprovementDirection
} from '../types/functionalLongevity';
import { BUILT_IN_FUNCTIONAL_TESTS } from '../data/functionalTestsBank';

export interface TestComparisonResult {
  testId: string;
  testName: string;
  domain: FunctionalDomain;
  autonomyTask?: AutonomyTaskKey;
  direction: ImprovementDirection;
  unit: string;
  unitLabel: string;
  
  // Current assessment
  currentDate: string;
  currentValueFormatted: string;
  currentNumeric?: number;
  currentCategorical?: string;
  
  // Previous assessment (if exists)
  hasPrevious: boolean;
  previousDate?: string;
  previousValueFormatted?: string;
  previousNumeric?: number;
  previousCategorical?: string;
  
  // Delta & Status
  deltaNumeric?: number;
  deltaPercent?: number;
  status: EvolutionStatus;
  statusLabel: string;
  summaryText: string;
}

export interface DomainSummary {
  domain: FunctionalDomain;
  label: string;
  status: EvolutionStatus;
  statusLabel: string;
  testsCount: number;
  latestAssessmentDate?: string;
  details: string;
}

export interface AutonomyCardData {
  taskKey: AutonomyTaskKey;
  title: string;
  description: string;
  latestResult: FunctionalTestResult | null;
  latestDate: string | null;
  previousResult: FunctionalTestResult | null;
  comparison: TestComparisonResult | null;
  status: EvolutionStatus;
  statusLabel: string;
  activeGoal: FunctionalGoal | null;
  isAssessed: boolean;
}

export const DOMAIN_LABELS: Record<FunctionalDomain, string> = {
  strength: 'Força Funcional',
  mobility: 'Mobilidade',
  balance: 'Equilíbrio',
  power: 'Potência',
  locomotion: 'Capacidade Locomotora',
  endurance: 'Resistência',
  autonomy: 'Autonomia'
};

export const AUTONOMY_TASK_CONFIG: Record<AutonomyTaskKey, { title: string; description: string; relatedTestIds: string[] }> = {
  stand_up: {
    title: 'LEVANTAR',
    description: 'Capacidade de erguer-se da cadeira ou assento com estabilidade e força.',
    relatedTestIds: ['test-30s-chair-stand', 'test-5x-chair-stand']
  },
  walk: {
    title: 'CAMINHAR',
    description: 'Mobilidade de marcha, velocidade segura e agilidade locomotora.',
    relatedTestIds: ['test-tug', 'test-gait-speed', 'test-6min-walk']
  },
  balance: {
    title: 'EQUILIBRAR',
    description: 'Estabilidade estática e dinâmica para evitar quedas e desequilíbrios.',
    relatedTestIds: ['test-single-leg-stance', 'test-tandem-stance']
  },
  carry: {
    title: 'CARREGAR',
    description: 'Sustentação de cargas funcionais (compras, bolsas, objetos cotidianos).',
    relatedTestIds: ['test-farmer-carry', 'test-grip-strength']
  },
  climb: {
    title: 'SUBIR',
    description: 'Transposição de desníveis, degraus, calçadas e lances de escadas.',
    relatedTestIds: ['test-stair-climb', 'test-step-test']
  },
  squat: {
    title: 'AGACHAR',
    description: 'Flexão e extensão de membros inferiores com controle articular.',
    relatedTestIds: ['test-squat-and-rise']
  },
  floor_rise: {
    title: 'LEVANTAR DO CHÃO',
    description: 'Autonomia para erguer-se do piso em caso de queda ou atividade no solo.',
    relatedTestIds: ['test-floor-rise']
  }
};

/**
 * Formats a functional test value cleanly based on unit and direction
 */
export function formatTestValue(
  result: Partial<FunctionalTestResult>,
  testDef?: FunctionalTest
): string {
  if (result.primaryValueCategorical) {
    return result.primaryValueCategorical;
  }

  if (result.unit === 'm/s' && result.calculatedSpeedMs !== undefined) {
    return `${result.calculatedSpeedMs.toFixed(2).replace('.', ',')} m/s`;
  }

  if (result.primaryValueNumeric !== undefined) {
    const num = result.primaryValueNumeric;
    const label = result.unitLabel || (result.unit === 'seconds' ? 's' : result.unit === 'reps' ? 'reps' : '');
    
    if (result.unit === 'seconds') {
      return `${num.toFixed(1).replace('.', ',')} s`;
    }
    if (result.unit === 'kg') {
      return `${num.toFixed(1).replace('.', ',')} kg`;
    }
    if (result.unit === 'meters') {
      return `${Math.round(num)} m`;
    }
    if (result.unit === 'reps') {
      return `${num} reps`;
    }
    return `${num} ${label}`.trim();
  }

  return '—';
}

/**
 * Compares two results of the same functional test taking direction of improvement into account
 */
export function compareTestResults(
  currentResult: FunctionalTestResult,
  previousResult: FunctionalTestResult | null,
  currentDate: string,
  previousDate?: string
): TestComparisonResult {
  const testDef = BUILT_IN_FUNCTIONAL_TESTS.find(t => t.id === currentResult.testId);
  const direction = currentResult.direction || testDef?.direction || 'higher_is_better';

  const currentValueFormatted = formatTestValue(currentResult, testDef);
  const currentNumeric = currentResult.primaryValueNumeric ?? (currentResult.calculatedSpeedMs);
  const currentCategorical = currentResult.primaryValueCategorical;

  // Single baseline evaluation
  if (!previousResult) {
    return {
      testId: currentResult.testId,
      testName: currentResult.testName,
      domain: currentResult.domain,
      autonomyTask: currentResult.autonomyTask,
      direction,
      unit: currentResult.unit,
      unitLabel: currentResult.unitLabel,
      currentDate,
      currentValueFormatted,
      currentNumeric,
      currentCategorical,
      hasPrevious: false,
      status: 'baseline',
      statusLabel: 'LINHA DE BASE REGISTRADA',
      summaryText: `Linha de base: ${currentValueFormatted}`
    };
  }

  // 2+ evaluations comparison
  const previousValueFormatted = formatTestValue(previousResult, testDef);
  const previousNumeric = previousResult.primaryValueNumeric ?? (previousResult.calculatedSpeedMs);
  const previousCategorical = previousResult.primaryValueCategorical;

  let deltaNumeric: number | undefined = undefined;
  let deltaPercent: number | undefined = undefined;
  let status: EvolutionStatus = 'stable';
  let statusLabel = 'ESTÁVEL';
  let summaryText = '';

  // Numeric comparison
  if (currentNumeric !== undefined && previousNumeric !== undefined) {
    deltaNumeric = Number((currentNumeric - previousNumeric).toFixed(2));

    if (previousNumeric > 0) {
      deltaPercent = Number((((currentNumeric - previousNumeric) / previousNumeric) * 100).toFixed(1));
    }

    if (direction === 'higher_is_better') {
      if (deltaNumeric > 0.001) {
        status = 'improving';
        statusLabel = 'EVOLUINDO';
        const plusSign = '+';
        const percentStr = deltaPercent !== undefined ? ` (${plusSign}${deltaPercent.toFixed(1).replace('.', ',')}%)` : '';
        summaryText = `${plusSign}${deltaNumeric.toString().replace('.', ',')} ${currentResult.unitLabel}${percentStr} • MELHORA DE DESEMPENHO`;
      } else if (deltaNumeric < -0.001) {
        status = 'declining';
        statusLabel = 'REDUÇÃO DE DESEMPENHO';
        const percentStr = deltaPercent !== undefined ? ` (${deltaPercent.toFixed(1).replace('.', ',')}%)` : '';
        summaryText = `${deltaNumeric.toString().replace('.', ',')} ${currentResult.unitLabel}${percentStr}`;
      } else {
        status = 'stable';
        statusLabel = 'ESTÁVEL';
        summaryText = 'Desempenho mantido estável';
      }
    } else if (direction === 'lower_is_better') {
      // Lower time is BETTER!
      if (deltaNumeric < -0.001) {
        status = 'improving';
        statusLabel = 'EVOLUINDO';
        // Note: For time reduction, e.g. 10.4s -> 8.9s => delta is -1.5s
        const absPercent = deltaPercent !== undefined ? Math.abs(deltaPercent) : 0;
        summaryText = `−${Math.abs(deltaNumeric).toString().replace('.', ',')} ${currentResult.unitLabel} (−${absPercent.toFixed(1).replace('.', ',')}%) • MELHORA DE DESEMPENHO`;
      } else if (deltaNumeric > 0.001) {
        status = 'declining';
        statusLabel = 'REDUÇÃO DE DESEMPENHO';
        summaryText = `+${deltaNumeric.toString().replace('.', ',')} ${currentResult.unitLabel}`;
      } else {
        status = 'stable';
        statusLabel = 'ESTÁVEL';
        summaryText = 'Desempenho mantido estável';
      }
    }
  } else if (currentCategorical && previousCategorical) {
    // Categorical comparison (e.g. Levantar do chão)
    const levels = testDef?.categoricalLevels || [];
    const prevLevelObj = levels.find(l => l.label === previousCategorical);
    const currLevelObj = levels.find(l => l.label === currentCategorical);

    if (prevLevelObj && currLevelObj) {
      if (currLevelObj.level > prevLevelObj.level) {
        status = 'improving';
        statusLabel = 'EVOLUÇÃO FUNCIONAL';
        summaryText = `${previousCategorical} → ${currentCategorical} • CONQUISTA DE AUTONOMIA`;
      } else if (currLevelObj.level < prevLevelObj.level) {
        status = 'declining';
        statusLabel = 'REDUÇÃO DE DESEMPENHO';
        summaryText = `${previousCategorical} → ${currentCategorical}`;
      } else {
        status = 'stable';
        statusLabel = 'ESTÁVEL';
        summaryText = 'Nível de autonomia mantido';
      }
    } else {
      if (currentCategorical !== previousCategorical) {
        summaryText = `${previousCategorical} → ${currentCategorical}`;
      } else {
        summaryText = 'Nível mantido';
      }
    }
  }

  return {
    testId: currentResult.testId,
    testName: currentResult.testName,
    domain: currentResult.domain,
    autonomyTask: currentResult.autonomyTask,
    direction,
    unit: currentResult.unit,
    unitLabel: currentResult.unitLabel,
    currentDate,
    currentValueFormatted,
    currentNumeric,
    currentCategorical,
    hasPrevious: true,
    previousDate,
    previousValueFormatted,
    previousNumeric,
    previousCategorical,
    deltaNumeric,
    deltaPercent,
    status,
    statusLabel,
    summaryText
  };
}

/**
 * Extracts and sorts student's functional assessments chronologically
 */
export function getSortedStudentAssessments(assessments: FunctionalAssessment[]): FunctionalAssessment[] {
  return [...assessments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Retrieves all chronological results for a specific test
 */
export function getTestHistory(
  assessments: FunctionalAssessment[],
  testId: string
): { assessment: FunctionalAssessment; result: FunctionalTestResult }[] {
  const sorted = getSortedStudentAssessments(assessments);
  const list: { assessment: FunctionalAssessment; result: FunctionalTestResult }[] = [];

  for (const a of sorted) {
    const r = a.results.find(res => res.testId === testId);
    if (r) {
      list.push({ assessment: a, result: r });
    }
  }

  return list;
}

/**
 * Computes all 7 Autonomy Map cards with true historical data
 */
export function computeAutonomyMap(
  assessments: FunctionalAssessment[],
  goals: FunctionalGoal[]
): AutonomyCardData[] {
  const sorted = getSortedStudentAssessments(assessments);

  const taskKeys: AutonomyTaskKey[] = [
    'stand_up',
    'walk',
    'balance',
    'carry',
    'climb',
    'squat',
    'floor_rise'
  ];

  return taskKeys.map(key => {
    const config = AUTONOMY_TASK_CONFIG[key];
    const relatedTestIds = config.relatedTestIds;

    // Find all results matching this autonomy task across assessments
    const matchingEntries: { assessment: FunctionalAssessment; result: FunctionalTestResult }[] = [];
    for (const a of sorted) {
      for (const r of a.results) {
        if (r.autonomyTask === key || relatedTestIds.includes(r.testId)) {
          matchingEntries.push({ assessment: a, result: r });
        }
      }
    }

    const isAssessed = matchingEntries.length > 0;
    const latestEntry = isAssessed ? matchingEntries[matchingEntries.length - 1] : null;
    const previousEntry = matchingEntries.length >= 2 ? matchingEntries[matchingEntries.length - 2] : null;

    let comparison: TestComparisonResult | null = null;
    let status: EvolutionStatus = 'not_assessed';
    let statusLabel = 'AINDA NÃO AVALIADO';

    if (latestEntry) {
      comparison = compareTestResults(
        latestEntry.result,
        previousEntry ? previousEntry.result : null,
        latestEntry.assessment.date,
        previousEntry ? previousEntry.assessment.date : undefined
      );
      status = comparison.status;
      statusLabel = comparison.statusLabel;
    }

    // Active goal matching this task
    const activeGoal = goals.find(
      g => g.status === 'active' && (g.autonomyTask === key || (latestEntry && g.testId === latestEntry.result.testId))
    ) || null;

    return {
      taskKey: key,
      title: config.title,
      description: config.description,
      latestResult: latestEntry ? latestEntry.result : null,
      latestDate: latestEntry ? latestEntry.assessment.date : null,
      previousResult: previousEntry ? previousEntry.result : null,
      comparison,
      status,
      statusLabel,
      activeGoal,
      isAssessed
    };
  });
}

/**
 * Computes functional overview by domain
 */
export function computeDomainSummaries(
  assessments: FunctionalAssessment[]
): DomainSummary[] {
  const domains: FunctionalDomain[] = [
    'strength',
    'mobility',
    'balance',
    'power',
    'locomotion',
    'endurance',
    'autonomy'
  ];

  const sorted = getSortedStudentAssessments(assessments);

  return domains.map(dom => {
    const domainLabel = DOMAIN_LABELS[dom];
    const matchingResults: { assessment: FunctionalAssessment; result: FunctionalTestResult }[] = [];

    for (const a of sorted) {
      for (const r of a.results) {
        if (r.domain === dom) {
          matchingResults.push({ assessment: a, result: r });
        }
      }
    }

    if (matchingResults.length === 0) {
      return {
        domain: dom,
        label: domainLabel,
        status: 'not_assessed',
        statusLabel: 'Sem testes registrados',
        testsCount: 0,
        details: 'Nenhum teste aplicado neste domínio até o momento.'
      };
    }

    const latestAssessmentDate = matchingResults[matchingResults.length - 1].assessment.date;

    // Distinct test IDs evaluated
    const uniqueTestIds = Array.from(new Set(matchingResults.map(m => m.result.testId)));

    // Evaluate progression across the distinct tests in this domain
    let improvingCount = 0;
    let decliningCount = 0;
    let stableCount = 0;
    let baselineCount = 0;

    for (const tid of uniqueTestIds) {
      const historyForTest = matchingResults.filter(m => m.result.testId === tid);
      if (historyForTest.length === 1) {
        baselineCount++;
      } else if (historyForTest.length >= 2) {
        const cur = historyForTest[historyForTest.length - 1];
        const prev = historyForTest[historyForTest.length - 2];
        const cmp = compareTestResults(cur.result, prev.result, cur.assessment.date, prev.assessment.date);
        if (cmp.status === 'improving') improvingCount++;
        else if (cmp.status === 'declining') decliningCount++;
        else stableCount++;
      }
    }

    let status: EvolutionStatus = 'baseline';
    let statusLabel = 'LINHA DE BASE REGISTRADA';

    if (improvingCount > 0 && improvingCount >= decliningCount) {
      status = 'improving';
      statusLabel = 'EVOLUINDO';
    } else if (decliningCount > 0 && decliningCount > improvingCount) {
      status = 'declining';
      statusLabel = 'REDUÇÃO DE DESEMPENHO';
    } else if (stableCount > 0) {
      status = 'stable';
      statusLabel = 'ESTÁVEL';
    } else if (baselineCount > 0) {
      status = 'baseline';
      statusLabel = 'LINHA DE BASE REGISTRADA';
    }

    return {
      domain: dom,
      label: domainLabel,
      status,
      statusLabel,
      testsCount: uniqueTestIds.length,
      latestAssessmentDate,
      details: `${uniqueTestIds.length} teste(s) monitorado(s) com ${matchingResults.length} registro(s).`
    };
  });
}
