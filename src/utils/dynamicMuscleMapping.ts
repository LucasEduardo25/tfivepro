import { BodyRegionId, MuscleIntensity, BODY_REGIONS } from '../components/common/BodyMap/bodyMapTypes';
import { WorkoutSession, WorkoutSetRecord, Exercise } from '../types';

/**
 * Interface tolerante a múltiplos formatos de exercícios e dados de treino:
 * Suporta campos snake_case (primary_muscles, secondary_muscles) e camelCase (primaryMuscles, secondaryMuscles),
 * arrays de strings ou strings delimitadas por vírgula.
 */
export interface ExerciseMuscleInput {
  id?: string;
  name?: string;
  exerciseName?: string;
  exerciseId?: string;
  muscleGroup?: string;
  targetMuscle?: string;
  primary_muscles?: string[] | string;
  secondary_muscles?: string[] | string;
  primaryMuscles?: string[] | string;
  secondaryMuscles?: string[] | string;
  status?: string;
  weightKg?: number;
  actualReps?: number;
  targetReps?: number;
  sets?: number;
}

export type MonochromeBodyTheme = 'light' | 'dark' | 'graphite' | 'transparent-light' | 'transparent-dark';

export interface MonochromeStyleAttrs {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity?: number;
  filter?: string;
}

export interface DynamicMuscleDistributionItem {
  regionId: BodyRegionId;
  label: string;
  category: 'upper' | 'core' | 'lower' | 'arms';
  intensity: 'primary' | 'secondary';
  setsCount: number;
  exercisesCount: number;
  percentage: number;
}

export interface DynamicMuscleMappingResult {
  intensities: Record<BodyRegionId, MuscleIntensity>;
  primaryRegions: BodyRegionId[];
  secondaryRegions: BodyRegionId[];
  activeRegions: BodyRegionId[];
  primaryLabels: string[];
  secondaryLabels: string[];
  allActiveLabels: string[];
  distribution: DynamicMuscleDistributionItem[];
  totalSets: number;
  totalExercises: number;
  totalPrimary: number;
  totalSecondary: number;
  dominantCategory: string;
  summaryText: string;
  getStyle: (regionId: BodyRegionId, theme?: MonochromeBodyTheme) => MonochromeStyleAttrs;
  getBaseStyle: (theme?: MonochromeBodyTheme) => MonochromeStyleAttrs;
  getDividerStyle: (theme?: MonochromeBodyTheme) => MonochromeStyleAttrs;
}

/**
 * Remove acentuação e caracteres especiais para comparação fonética resiliente.
 */
export function sanitizeMuscleString(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Converte entradas brutas de músculos (seja array ou string com separadores)
 * em um array de strings limpas e sanitizadas.
 */
export function parseMuscleList(input?: string[] | string | null): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map(item => String(item).trim()).filter(Boolean);
  }
  if (typeof input === 'string') {
    return input
      .split(/[,;|/]/)
      .map(s => s.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Dicionário canônico e normalizador de músculos com suporte a:
 * - Português (com e sem acento)
 * - Inglês
 * - Nomenclatura anatômica/biomecânica
 * - Nomes de exercícios associados
 * - snake_case e camelCase
 */
export function normalizeMuscleToRegion(rawInput: string): BodyRegionId | null {
  if (!rawInput) return null;
  const s = sanitizeMuscleString(rawInput);

  // 1. Chaves canônicas diretas
  if (s === 'chest') return 'chest';
  if (s === 'frontshoulders' || s === 'front_shoulders' || s === 'front shoulders') return 'frontShoulders';
  if (s === 'sideshoulders' || s === 'side_shoulders' || s === 'side shoulders') return 'sideShoulders';
  if (s === 'rearshoulders' || s === 'rear_shoulders' || s === 'rear shoulders') return 'rearShoulders';
  if (s === 'biceps') return 'biceps';
  if (s === 'triceps') return 'triceps';
  if (s === 'forearms' || s === 'forearm') return 'forearms';
  if (s === 'abs') return 'abs';
  if (s === 'obliques' || s === 'oblique') return 'obliques';
  if (s === 'traps' || s === 'trapezius') return 'traps';
  if (s === 'upperback' || s === 'upper_back' || s === 'upper back') return 'upperBack';
  if (s === 'lats' || s === 'lat') return 'lats';
  if (s === 'lowerback' || s === 'lower_back' || s === 'lower back') return 'lowerBack';
  if (s === 'glutes' || s === 'glute') return 'glutes';
  if (s === 'quadriceps' || s === 'quads' || s === 'quad') return 'quadriceps';
  if (s === 'hamstrings' || s === 'hamstring') return 'hamstrings';
  if (s === 'adductors' || s === 'adductor') return 'adductors';
  if (s === 'calves' || s === 'calf') return 'calves';

  // 2. Desambiguações compostas cruciais
  // Bíceps Femoral -> Isquiotibiais (nunca bíceps braquial!)
  if (s.includes('biceps femor') || s.includes('femoral') || s.includes('femoris')) {
    return 'hamstrings';
  }

  // Tríceps Sural -> Panturrilhas (nunca tríceps braquial!)
  if (s.includes('triceps sural') || s.includes('sural')) {
    return 'calves';
  }

  // Deltoide anterior / frontal
  if (
    s.includes('deltoide anterior') ||
    s.includes('deltoid anterior') ||
    s.includes('anterior deltoid') ||
    s.includes('ombro anterior') ||
    s.includes('feixe anterior') ||
    s.includes('deltoide frontal')
  ) {
    return 'frontShoulders';
  }

  // Deltoide posterior / rear deltoid
  if (
    s.includes('deltoide posterior') ||
    s.includes('deltoid posterior') ||
    s.includes('rear deltoid') ||
    s.includes('posterior deltoid') ||
    s.includes('ombro posterior') ||
    s.includes('feixe posterior') ||
    s.includes('deltoide post')
  ) {
    return 'rearShoulders';
  }

  // Deltoide lateral / médio
  if (
    s.includes('deltoide lateral') ||
    s.includes('deltoid lateral') ||
    s.includes('lateral deltoid') ||
    s.includes('deltoide medio') ||
    s.includes('ombro lateral') ||
    s.includes('feixe lateral')
  ) {
    return 'sideShoulders';
  }

  // Isquiotibiais / Posterior de coxa
  if (
    s.includes('isquiotibial') ||
    s.includes('isquiotibiais') ||
    s.includes('isquio') ||
    s.includes('posterior de coxa') ||
    s.includes('posteriores de coxa') ||
    s.includes('posterior coxa') ||
    s.includes('semitendin') ||
    s.includes('semimembran') ||
    s === 'posterior' ||
    s === 'posteriores'
  ) {
    return 'hamstrings';
  }

  // Grande dorsal / Latíssimo
  if (
    s.includes('latissimo') ||
    s.includes('grande dorsal') ||
    s.includes('dorsal') ||
    s.includes('dorsais') ||
    s.includes('latissimus')
  ) {
    return 'lats';
  }

  // Costas Superior / Rombóides / Escápulas / Manguito / Redondo Maior
  if (
    s.includes('romboide') ||
    s.includes('rhomboid') ||
    s.includes('escapula') ||
    s.includes('escapular') ||
    s.includes('costas superior') ||
    s.includes('costas superiores') ||
    s.includes('upper back') ||
    s.includes('manguito') ||
    s.includes('rotador') ||
    s.includes('redondo maior') ||
    s.includes('redondo menor') ||
    s.includes('infraespin')
  ) {
    return 'upperBack';
  }

  // Lombar / Eretores da espinha / Paravertebrais
  if (
    s.includes('lombar') ||
    s.includes('eretor') ||
    s.includes('erector') ||
    s.includes('paravertebral') ||
    s.includes('paravertebrais') ||
    s.includes('espinha baixa')
  ) {
    return 'lowerBack';
  }

  // Peitoral / Peito
  if (
    s.includes('peitoral') ||
    s.includes('peito') ||
    s.includes('pectoral') ||
    s.includes('pectoralis') ||
    s.includes('supino')
  ) {
    return 'chest';
  }

  // Quadríceps / Coxa Anterior / Vasto / Reto femoral
  if (
    s.includes('quadriceps') ||
    s.includes('quads') ||
    s.includes('coxa anterior') ||
    s.includes('vasto lateral') ||
    s.includes('vasto medial') ||
    s.includes('vasto intermedio') ||
    s.includes('reto femoral') ||
    s === 'quad' ||
    s === 'coxa' ||
    s === 'coxas'
  ) {
    return 'quadriceps';
  }

  // Glúteos
  if (
    s.includes('gluteo') ||
    s.includes('gluteus') ||
    s.includes('glute') ||
    s.includes('quadril') ||
    s.includes('pelvico')
  ) {
    return 'glutes';
  }

  // Adutores / Coxa interna / Grácil
  if (
    s.includes('adutor') ||
    s.includes('adductor') ||
    s.includes('gracil') ||
    s.includes('pectineo') ||
    s.includes('coxa interna') ||
    s.includes('virilha')
  ) {
    return 'adductors';
  }

  // Panturrilhas / Gastrocnêmio / Sóleo / Tibial
  if (
    s.includes('panturrilha') ||
    s.includes('gastrocnem') ||
    s.includes('soleo') ||
    s.includes('soleus') ||
    s.includes('tibial') ||
    s.includes('perna inferior')
  ) {
    return 'calves';
  }

  // Trapézio
  if (s.includes('trapezio') || s.includes('trapezius') || s.includes('cervical')) {
    return 'traps';
  }

  // Tríceps braquial
  if (s.includes('triceps') || s.includes('triceps brachii')) {
    return 'triceps';
  }

  // Bíceps braquial / Braquial
  if (
    s.includes('biceps') ||
    s.includes('braquial anterior') ||
    s.includes('braquial') ||
    s.includes('brachialis')
  ) {
    return 'biceps';
  }

  // Antebraços / Braquiorradial / Punho
  if (
    s.includes('antebraco') ||
    s.includes('braquiorradial') ||
    s.includes('brachioradialis') ||
    s.includes('punho') ||
    s.includes('grip')
  ) {
    return 'forearms';
  }

  // Oblíquos / Serrátil / Transverso
  if (
    s.includes('obliquo') ||
    s.includes('serratil') ||
    s.includes('serratus') ||
    s.includes('transverso') ||
    s.includes('flancos')
  ) {
    return 'obliques';
  }

  // Abdômen / Reto abdominal / Core
  if (
    s.includes('abdomen') ||
    s.includes('abdominal') ||
    s.includes('abdominais') ||
    s.includes('core') ||
    s.includes('reto abdominal') ||
    s.includes('infra') ||
    s.includes('supra')
  ) {
    return 'abs';
  }

  // Ombros / Deltoides em geral
  if (s.includes('ombro') || s.includes('deltoide') || s.includes('shoulder')) {
    return 'sideShoulders';
  }

  // Costas em geral
  if (s.includes('costas') || s.includes('back')) {
    return 'upperBack';
  }

  return null;
}

/**
 * Mapeia grupo muscular amplo (ex: 'PEITORAL', 'COSTAS', 'PERNAS') para regiões primárias e secundárias padrão.
 */
export function mapMuscleGroupToRegions(muscleGroup: string): { primary: BodyRegionId[]; secondary: BodyRegionId[] } {
  const s = sanitizeMuscleString(muscleGroup);

  if (s.includes('peitoral') || s.includes('peito') || s.includes('chest')) {
    return {
      primary: ['chest'],
      secondary: ['frontShoulders', 'triceps']
    };
  }

  if (s.includes('costas') || s.includes('dorsal') || s.includes('back')) {
    return {
      primary: ['lats', 'upperBack'],
      secondary: ['biceps', 'rearShoulders', 'traps']
    };
  }

  if (s.includes('quadriceps') || s.includes('coxa anterior') || s.includes('quads') || s === 'coxa') {
    return {
      primary: ['quadriceps'],
      secondary: ['glutes', 'adductors', 'calves']
    };
  }

  if (
    s.includes('isquiotibial') ||
    s.includes('isquiotibiais') ||
    s.includes('posterior de coxa') ||
    s.includes('posteriores') ||
    s.includes('hamstrings')
  ) {
    return {
      primary: ['hamstrings'],
      secondary: ['glutes', 'calves', 'lowerBack']
    };
  }

  if (s.includes('gluteo') || s.includes('glutes')) {
    return {
      primary: ['glutes'],
      secondary: ['hamstrings', 'quadriceps']
    };
  }

  if (s.includes('ombro') || s.includes('deltoide') || s.includes('shoulders')) {
    return {
      primary: ['frontShoulders', 'sideShoulders', 'rearShoulders'],
      secondary: ['traps', 'triceps']
    };
  }

  if (s.includes('biceps')) {
    return {
      primary: ['biceps'],
      secondary: ['forearms']
    };
  }

  if (s.includes('triceps')) {
    return {
      primary: ['triceps'],
      secondary: ['forearms']
    };
  }

  if (s.includes('abdomen') || s.includes('abdominal') || s.includes('core') || s.includes('abs')) {
    return {
      primary: ['abs', 'obliques'],
      secondary: ['lowerBack']
    };
  }

  if (s.includes('panturrilha') || s.includes('calves')) {
    return {
      primary: ['calves'],
      secondary: []
    };
  }

  if (s.includes('antebraco') || s.includes('forearms')) {
    return {
      primary: ['forearms'],
      secondary: ['biceps']
    };
  }

  if (s.includes('cardio') || s.includes('funcional')) {
    return {
      primary: ['quadriceps', 'hamstrings', 'abs', 'calves'],
      secondary: ['glutes', 'frontShoulders']
    };
  }

  if (s.includes('perna') || s.includes('inferiores') || s.includes('legs') || s.includes('lower')) {
    return {
      primary: ['quadriceps', 'hamstrings', 'glutes', 'calves'],
      secondary: ['adductors', 'lowerBack']
    };
  }

  if (s.includes('braco') || s.includes('arms')) {
    return {
      primary: ['biceps', 'triceps'],
      secondary: ['forearms', 'frontShoulders']
    };
  }

  if (s.includes('superior') || s.includes('upper') || s.includes('push') || s.includes('pull')) {
    return {
      primary: ['chest', 'lats', 'frontShoulders', 'sideShoulders'],
      secondary: ['triceps', 'biceps', 'upperBack']
    };
  }

  const direct = normalizeMuscleToRegion(muscleGroup);
  if (direct) {
    return { primary: [direct], secondary: [] };
  }

  return { primary: [], secondary: [] };
}

/**
 * Processador Dinâmico de Mapeamento Muscular:
 * Extrai dados reais de exercícios do treino através de qualquer fonte:
 * - Exercícios diretos (com primary_muscles / secondary_muscles em snake_case ou camelCase)
 * - Sessão de treino (sets e metadados)
 * - Banco de exercícios de referência (fallback para enriquecimento biomecânico)
 *
 * Aplica regra rigorosa:
 * - PRIMARY: região ativada como principal em pelo menos um exercício/série da sessão.
 * - SECONDARY: região ativada apenas como sinergista/secundária.
 * - NONE: região em repouso.
 */
export function processWorkoutMuscles(
  data: 
    | WorkoutSession 
    | WorkoutSetRecord[] 
    | ExerciseMuscleInput[] 
    | {
        session?: WorkoutSession | null;
        sets?: WorkoutSetRecord[];
        exercises?: ExerciseMuscleInput[] | Exercise[];
        exerciseBank?: Exercise[];
      }
    | undefined,
  exerciseBankFallback?: Exercise[]
): DynamicMuscleMappingResult {
  // Inicialização do contador por região
  const regionStats: Record<BodyRegionId, { primarySets: number; secondarySets: number; exerciseIds: Set<string> }> = {
    chest: { primarySets: 0, secondarySets: 0, exerciseIds: new Set() },
    frontShoulders: { primarySets: 0, secondarySets: 0, exerciseIds: new Set() },
    sideShoulders: { primarySets: 0, secondarySets: 0, exerciseIds: new Set() },
    rearShoulders: { primarySets: 0, secondarySets: 0, exerciseIds: new Set() },
    biceps: { primarySets: 0, secondarySets: 0, exerciseIds: new Set() },
    triceps: { primarySets: 0, secondarySets: 0, exerciseIds: new Set() },
    forearms: { primarySets: 0, secondarySets: 0, exerciseIds: new Set() },
    abs: { primarySets: 0, secondarySets: 0, exerciseIds: new Set() },
    obliques: { primarySets: 0, secondarySets: 0, exerciseIds: new Set() },
    traps: { primarySets: 0, secondarySets: 0, exerciseIds: new Set() },
    upperBack: { primarySets: 0, secondarySets: 0, exerciseIds: new Set() },
    lats: { primarySets: 0, secondarySets: 0, exerciseIds: new Set() },
    lowerBack: { primarySets: 0, secondarySets: 0, exerciseIds: new Set() },
    glutes: { primarySets: 0, secondarySets: 0, exerciseIds: new Set() },
    quadriceps: { primarySets: 0, secondarySets: 0, exerciseIds: new Set() },
    hamstrings: { primarySets: 0, secondarySets: 0, exerciseIds: new Set() },
    adductors: { primarySets: 0, secondarySets: 0, exerciseIds: new Set() },
    calves: { primarySets: 0, secondarySets: 0, exerciseIds: new Set() }
  };

  // Extrair itens de entrada (sets ou exercícios)
  let itemsToProcess: ExerciseMuscleInput[] = [];
  let bank: Exercise[] = exerciseBankFallback || [];

  if (Array.isArray(data)) {
    itemsToProcess = data as ExerciseMuscleInput[];
  } else if (data && typeof data === 'object') {
    const obj = data as any;
    if (obj.exerciseBank && Array.isArray(obj.exerciseBank)) {
      bank = obj.exerciseBank;
    }

    if (Array.isArray(obj.sets)) {
      itemsToProcess = obj.sets;
    } else if (Array.isArray(obj.exercises)) {
      itemsToProcess = obj.exercises;
    } else if (obj.session && Array.isArray(obj.session.sets)) {
      itemsToProcess = obj.session.sets;
    }
  }

  // Filtrar itens válidos (ignorar 'skipped')
  const validItems = itemsToProcess.filter(item => {
    if (!item) return false;
    if (item.status === 'skipped') return false;
    return true;
  });

  // Mapa de busca para o banco de exercícios
  const bankById = new Map<string, Exercise>();
  const bankByName = new Map<string, Exercise>();
  for (const ex of bank) {
    if (!ex) continue;
    if (ex.id) bankById.set(ex.id, ex);
    if (ex.name) {
      bankByName.set(sanitizeMuscleString(ex.name), ex);
    }
  }

  const uniqueExercises = new Set<string>();

  for (const item of validItems) {
    const exId = item.exerciseId || item.id || item.exerciseName || item.name || 'ex_unknown';
    uniqueExercises.add(exId);

    // Buscar enriquecimento do banco se disponível
    const bankItem =
      (item.exerciseId ? bankById.get(item.exerciseId) : undefined) ||
      (item.id ? bankById.get(item.id) : undefined) ||
      (item.exerciseName ? bankByName.get(sanitizeMuscleString(item.exerciseName)) : undefined) ||
      (item.name ? bankByName.get(sanitizeMuscleString(item.name)) : undefined);

    // 1. Extração dos MÚSCULOS PRIMÁRIOS (primary_muscles ou primaryMuscles)
    const rawPrimary = [
      ...parseMuscleList(item.primary_muscles),
      ...parseMuscleList(item.primaryMuscles),
      ...parseMuscleList((bankItem as any)?.primary_muscles),
      ...parseMuscleList((bankItem as any)?.primaryMuscles)
    ];

    const primaryRegions: BodyRegionId[] = [];
    if (rawPrimary.length > 0) {
      for (const raw of rawPrimary) {
        const canonical = normalizeMuscleToRegion(raw);
        if (canonical && !primaryRegions.includes(canonical)) {
          primaryRegions.push(canonical);
        } else if (!canonical) {
          const groupMapped = mapMuscleGroupToRegions(raw);
          for (const p of groupMapped.primary) {
            if (!primaryRegions.includes(p)) primaryRegions.push(p);
          }
        }
      }
    }

    // Se não encontrou lista explícita, usa o muscleGroup / targetMuscle
    const rawGroup = item.muscleGroup || item.targetMuscle || bankItem?.muscleGroup;
    if (primaryRegions.length === 0 && rawGroup) {
      const groupMapped = mapMuscleGroupToRegions(rawGroup);
      for (const p of groupMapped.primary) {
        if (!primaryRegions.includes(p)) primaryRegions.push(p);
      }
    }

    // Contabiliza primários
    for (const r of primaryRegions) {
      regionStats[r].primarySets += 1;
      regionStats[r].exerciseIds.add(exId);
    }

    // 2. Extração dos MÚSCULOS SECUNDÁRIOS (secondary_muscles ou secondaryMuscles)
    const rawSecondary = [
      ...parseMuscleList(item.secondary_muscles),
      ...parseMuscleList(item.secondaryMuscles),
      ...parseMuscleList((bankItem as any)?.secondary_muscles),
      ...parseMuscleList((bankItem as any)?.secondaryMuscles)
    ];

    const secondaryRegions: BodyRegionId[] = [];
    if (rawSecondary.length > 0) {
      for (const raw of rawSecondary) {
        const canonical = normalizeMuscleToRegion(raw);
        if (canonical && !primaryRegions.includes(canonical) && !secondaryRegions.includes(canonical)) {
          secondaryRegions.push(canonical);
        } else if (!canonical) {
          const groupMapped = mapMuscleGroupToRegions(raw);
          for (const s of groupMapped.secondary) {
            if (!primaryRegions.includes(s) && !secondaryRegions.includes(s)) {
              secondaryRegions.push(s);
            }
          }
        }
      }
    } else if (rawGroup) {
      const groupMapped = mapMuscleGroupToRegions(rawGroup);
      for (const s of groupMapped.secondary) {
        if (!primaryRegions.includes(s) && !secondaryRegions.includes(s)) {
          secondaryRegions.push(s);
        }
      }
    }

    // Contabiliza secundários
    for (const r of secondaryRegions) {
      regionStats[r].secondarySets += 1;
      regionStats[r].exerciseIds.add(exId);
    }
  }

  // 3. Resolução da intensidade final: PRIMARY tem precedência total sobre SECONDARY
  const intensities: Record<BodyRegionId, MuscleIntensity> = {} as any;
  const primaryRegionsList: BodyRegionId[] = [];
  const secondaryRegionsList: BodyRegionId[] = [];
  const distribution: DynamicMuscleDistributionItem[] = [];

  let totalWeightedWork = 0;

  for (const [key, val] of Object.entries(regionStats)) {
    const rId = key as BodyRegionId;
    if (val.primarySets > 0) {
      intensities[rId] = 'primary';
      primaryRegionsList.push(rId);
      totalWeightedWork += val.primarySets * 1.0;
    } else if (val.secondarySets > 0) {
      intensities[rId] = 'secondary';
      secondaryRegionsList.push(rId);
      totalWeightedWork += val.secondarySets * 0.4;
    } else {
      intensities[rId] = 'none';
    }
  }

  // 4. Criação da lista de distribuição ordenada
  const allActiveRegions = [...primaryRegionsList, ...secondaryRegionsList];
  for (const rId of allActiveRegions) {
    const stat = regionStats[rId];
    const isPrimary = intensities[rId] === 'primary';
    const weight = isPrimary ? stat.primarySets * 1.0 : stat.secondarySets * 0.4;
    const percentage = totalWeightedWork > 0 ? Math.round((weight / totalWeightedWork) * 100) : 0;

    distribution.push({
      regionId: rId,
      label: BODY_REGIONS[rId]?.label || rId,
      category: BODY_REGIONS[rId]?.category || 'upper',
      intensity: intensities[rId] as 'primary' | 'secondary',
      setsCount: isPrimary ? stat.primarySets : stat.secondarySets,
      exercisesCount: stat.exerciseIds.size,
      percentage
    });
  }

  distribution.sort((a, b) => {
    if (a.intensity === 'primary' && b.intensity !== 'primary') return -1;
    if (a.intensity !== 'primary' && b.intensity === 'primary') return 1;
    return b.percentage - a.percentage;
  });

  // 5. Rótulos anatômicos em caixa alta editorial
  const primaryLabels = primaryRegionsList.map(r => (BODY_REGIONS[r]?.label || r).toUpperCase());
  const secondaryLabels = secondaryRegionsList.map(r => (BODY_REGIONS[r]?.label || r).toUpperCase());
  const allActiveLabels = [...primaryLabels, ...secondaryLabels];

  // 6. Categoria dominante
  const categoryScores: Record<string, number> = { upper: 0, lower: 0, arms: 0, core: 0 };
  for (const item of distribution) {
    categoryScores[item.category] = (categoryScores[item.category] || 0) + item.percentage;
  }
  let dominantCategory = 'Geral';
  if (categoryScores.upper >= 40) dominantCategory = 'Membros Superiores';
  else if (categoryScores.lower >= 40) dominantCategory = 'Membros Inferiores';
  else if (categoryScores.arms >= 40) dominantCategory = 'Braços';
  else if (categoryScores.core >= 40) dominantCategory = 'Core & Abdômen';

  const summaryText = primaryLabels.length > 0
    ? `${primaryLabels.slice(0, 3).join(', ')}${primaryLabels.length > 3 ? ` +${primaryLabels.length - 3}` : ''}`
    : 'Treino Geral';

  // 7. Resolução visual monocromática (grafite, cinza, branco, preto - ZERO VERMELHO)
  const getStyle = (regionId: BodyRegionId, theme: MonochromeBodyTheme = 'light'): MonochromeStyleAttrs => {
    const intensity = intensities[regionId] || 'none';

    if (theme === 'dark' || theme === 'transparent-dark') {
      // Tema Dark / Story Transparente Escuro
      if (intensity === 'primary') {
        return {
          fill: '#FFFFFF', // Branco de alto contraste
          stroke: '#FFFFFF',
          strokeWidth: 1.2
        };
      }
      if (intensity === 'secondary') {
        return {
          fill: '#71717A', // Cinza médio
          stroke: '#A1A1AA',
          strokeWidth: 1.0
        };
      }
      // Em repouso
      return {
        fill: 'rgba(255, 255, 255, 0.08)',
        stroke: 'rgba(255, 255, 255, 0.20)',
        strokeWidth: 0.8
      };
    }

    if (theme === 'graphite') {
      // Tema Grafite Técnico Monocromático
      if (intensity === 'primary') {
        return {
          fill: '#27272A',
          stroke: '#09090B',
          strokeWidth: 1.2
        };
      }
      if (intensity === 'secondary') {
        return {
          fill: '#71717A',
          stroke: '#52525B',
          strokeWidth: 1.0
        };
      }
      return {
        fill: '#F4F4F5',
        stroke: '#E4E4E7',
        strokeWidth: 0.8
      };
    }

    // Default: 'light' ou 'transparent-light' (Painel Editorial Branco/Translúcido TFIVE PRO)
    if (intensity === 'primary') {
      return {
        fill: '#3F3F46', // Grafite escuro
        stroke: '#27272A',
        strokeWidth: 1.2
      };
    }
    if (intensity === 'secondary') {
      return {
        fill: '#A1A1AA', // Cinza médio
        stroke: '#71717A',
        strokeWidth: 1.0
      };
    }
    // Em repouso
    return {
      fill: '#E5E5E5', // Cinza muito claro neutro
      stroke: '#D4D4D8', // Contorno discreto
      strokeWidth: 0.8
    };
  };

  const getBaseStyle = (theme: MonochromeBodyTheme = 'light'): MonochromeStyleAttrs => {
    if (theme === 'dark' || theme === 'transparent-dark') {
      return {
        fill: 'rgba(255, 255, 255, 0.05)',
        stroke: 'rgba(255, 255, 255, 0.16)',
        strokeWidth: 0.8
      };
    }
    return {
      fill: '#E5E5E5',
      stroke: '#D4D4D8',
      strokeWidth: 0.8
    };
  };

  const getDividerStyle = (theme: MonochromeBodyTheme = 'light'): MonochromeStyleAttrs => {
    if (theme === 'dark' || theme === 'transparent-dark') {
      return {
        stroke: 'rgba(255, 255, 255, 0.25)',
        strokeWidth: 0.7,
        fill: 'none'
      };
    }
    return {
      stroke: 'rgba(0, 0, 0, 0.15)',
      strokeWidth: 0.7,
      fill: 'none'
    };
  };

  return {
    intensities,
    primaryRegions: primaryRegionsList,
    secondaryRegions: secondaryRegionsList,
    activeRegions: allActiveRegions,
    primaryLabels,
    secondaryLabels,
    allActiveLabels,
    distribution,
    totalSets: validItems.length,
    totalExercises: uniqueExercises.size,
    totalPrimary: primaryRegionsList.length,
    totalSecondary: secondaryRegionsList.length,
    dominantCategory,
    summaryText,
    getStyle,
    getBaseStyle,
    getDividerStyle
  };
}
