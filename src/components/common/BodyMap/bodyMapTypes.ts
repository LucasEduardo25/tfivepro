import { Exercise, MuscleGroup, WorkoutSetRecord } from '../../../types';

export type BodyRegionId =
  | 'chest'
  | 'frontShoulders'
  | 'sideShoulders'
  | 'rearShoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'obliques'
  | 'traps'
  | 'upperBack'
  | 'lats'
  | 'lowerBack'
  | 'glutes'
  | 'quadriceps'
  | 'hamstrings'
  | 'adductors'
  | 'calves';

export type MuscleIntensity = 'none' | 'secondary' | 'primary';

export type BodyViewAngle = 0 | 90 | 180 | 270;

export type BodyViewMode = 'rotatable' | 'both' | 'front' | 'back' | 'side-right' | 'side-left';

export interface ViewAngleInfo {
  angle: BodyViewAngle;
  label: string;
  shortLabel: string;
  degreeText: string;
}

export const VIEW_ANGLES_LIST: ViewAngleInfo[] = [
  { angle: 0, label: 'Vista Frontal', shortLabel: 'Frontal', degreeText: '0°' },
  { angle: 90, label: 'Lateral Direita', shortLabel: 'Lat. Dir.', degreeText: '90°' },
  { angle: 180, label: 'Vista Posterior', shortLabel: 'Costas', degreeText: '180°' },
  { angle: 270, label: 'Lateral Esquerda', shortLabel: 'Lat. Esq.', degreeText: '270°' }
];

export interface BodyRegionInfo {
  id: BodyRegionId;
  label: string;
  view: 'front' | 'back' | 'both' | 'all';
  category: 'upper' | 'core' | 'lower' | 'arms';
}

export const BODY_REGIONS: Record<BodyRegionId, BodyRegionInfo> = {
  chest: { id: 'chest', label: 'Peitoral', view: 'front', category: 'upper' },
  frontShoulders: { id: 'frontShoulders', label: 'Deltoide Anterior', view: 'front', category: 'upper' },
  sideShoulders: { id: 'sideShoulders', label: 'Deltoide Lateral', view: 'both', category: 'upper' },
  rearShoulders: { id: 'rearShoulders', label: 'Deltoide Posterior', view: 'back', category: 'upper' },
  biceps: { id: 'biceps', label: 'Bíceps', view: 'front', category: 'arms' },
  triceps: { id: 'triceps', label: 'Tríceps', view: 'back', category: 'arms' },
  forearms: { id: 'forearms', label: 'Antebraços', view: 'both', category: 'arms' },
  abs: { id: 'abs', label: 'Abdômen', view: 'front', category: 'core' },
  obliques: { id: 'obliques', label: 'Oblíquos', view: 'both', category: 'core' },
  traps: { id: 'traps', label: 'Trapézio', view: 'both', category: 'upper' },
  upperBack: { id: 'upperBack', label: 'Costas Superior / Rombóides', view: 'back', category: 'upper' },
  lats: { id: 'lats', label: 'Grande Dorsal (Lats)', view: 'back', category: 'upper' },
  lowerBack: { id: 'lowerBack', label: 'Lombar / Eretores', view: 'back', category: 'core' },
  glutes: { id: 'glutes', label: 'Glúteos', view: 'back', category: 'lower' },
  quadriceps: { id: 'quadriceps', label: 'Quadríceps', view: 'front', category: 'lower' },
  hamstrings: { id: 'hamstrings', label: 'Isquiotibiais (Posterior)', view: 'back', category: 'lower' },
  adductors: { id: 'adductors', label: 'Adutores', view: 'front', category: 'lower' },
  calves: { id: 'calves', label: 'Panturrilhas', view: 'both', category: 'lower' }
};

/**
 * Remove acentos e caracteres especiais para comparação fonética resiliente
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
 * Normaliza qualquer chave/nome de músculo ou região (em português, inglês, biomecânico ou alias)
 * para a chave canônica BodyRegionId.
 * É a camada única e central de normalização do TFIVE PRO.
 */
export function normalizeMuscleKey(rawKey: string): BodyRegionId | null {
  if (!rawKey) return null;
  const s = sanitizeMuscleString(rawKey);

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
  // Bíceps Femoral -> Isquiotibiais (não bíceps de braço!)
  if (s.includes('biceps femor') || s.includes('bíceps femor') || s.includes('femoral') || s.includes('femoris')) {
    return 'hamstrings';
  }

  // Tríceps Sural -> Panturrilhas (não tríceps de braço!)
  if (s.includes('triceps sural') || s.includes('tríceps sural') || s.includes('sural')) {
    return 'calves';
  }

  // Deltoide anterior / frontal / anterior deltoid
  if (
    s.includes('deltoide anterior') ||
    s.includes('deltoid anterior') ||
    s.includes('anterior deltoid') ||
    s.includes('ombro anterior') ||
    s.includes('ombros anterior') ||
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
    s.includes('ombros posterior') ||
    s.includes('feixe posterior') ||
    s.includes('deltoide post')
  ) {
    return 'rearShoulders';
  }

  // Deltoide lateral / médio / lateral deltoid
  if (
    s.includes('deltoide lateral') ||
    s.includes('deltoid lateral') ||
    s.includes('lateral deltoid') ||
    s.includes('deltoide medio') ||
    s.includes('ombro lateral') ||
    s.includes('ombros lateral') ||
    s.includes('feixe lateral')
  ) {
    return 'sideShoulders';
  }

  // Posterior de coxa / Isquiotibiais / Isquios / Semitendinoso / Semimembranoso
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

  // Grande Dorsal / Latíssimo / Latissimus
  if (
    s.includes('latissimo') ||
    s.includes('grande dorsal') ||
    s.includes('dorsal') ||
    s.includes('dorsais') ||
    s.includes('latissimus')
  ) {
    return 'lats';
  }

  // Costas Superior / Rombóides / Escápulas / Manguito / Rotadores Externos / Redondo Maior
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
    s.includes('rotadores') ||
    s.includes('redondo maior') ||
    s.includes('redondo menor') ||
    s.includes('infraespin')
  ) {
    return 'upperBack';
  }

  // Lombar / Eretores da Espinha / Paravertebrais
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
    s.includes('pectoralis')
  ) {
    return 'chest';
  }

  // Quadríceps / Coxa Anterior / Vasto / Reto Femoral
  if (
    s.includes('quadriceps') ||
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

  // Glúteos / Glúteo Máximo / Glúteo Médio / Quadril
  if (
    s.includes('gluteo') ||
    s.includes('gluteus') ||
    s.includes('glute') ||
    s.includes('quadril') ||
    s.includes('pelvico')
  ) {
    return 'glutes';
  }

  // Adutores / Coxa Interna / Grácil / Virilha
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

  // Tríceps (braço)
  if (s.includes('triceps') || s.includes('triceps brachii')) {
    return 'triceps';
  }

  // Bíceps (braço) / Braquial
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

  // Abdômen / Core / Reto Abdominal
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

  // Ombros / Deltoides em geral (fallback se não especificado)
  if (s.includes('ombro') || s.includes('deltoide') || s.includes('shoulder')) {
    return 'sideShoulders';
  }

  // Costas em geral (fallback)
  if (s.includes('costas') || s.includes('back')) {
    return 'upperBack';
  }

  return null;
}

/**
 * Normaliza e mapeia qualquer grupo muscular (MuscleGroup) para suas regiões primárias e secundárias
 */
export function normalizeMuscleGroup(muscleGroup: string): { primary: BodyRegionId[]; secondary: BodyRegionId[] } {
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

  if (s.includes('mobilidade')) {
    return {
      primary: ['abs', 'glutes', 'upperBack'],
      secondary: ['hamstrings', 'lowerBack']
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

  // Tenta mapear diretamente usando normalizeMuscleKey
  const direct = normalizeMuscleKey(muscleGroup);
  if (direct) {
    return {
      primary: [direct],
      secondary: []
    };
  }

  return {
    primary: [],
    secondary: []
  };
}

/**
 * Mapeamento compatível para rotinas legadas
 */
export function mapMuscleGroupToRegions(muscleGroup: string): { primary: BodyRegionId[]; secondary: BodyRegionId[] } {
  return normalizeMuscleGroup(muscleGroup);
}

/**
 * Normaliza qualquer string de músculo secundário vinda do banco ou metadados
 */
export function mapSecondaryStringToRegion(sec: string): BodyRegionId | null {
  return normalizeMuscleKey(sec);
}

export interface MuscleDistributionItem {
  regionId: BodyRegionId;
  label: string;
  category: 'upper' | 'core' | 'lower' | 'arms';
  intensity: 'primary' | 'secondary';
  setsCount: number;
  exercisesCount: number;
  percentage: number;
}

export interface TrainedMusclesAnalysis {
  intensities: Record<BodyRegionId, MuscleIntensity>;
  primaryRegions: BodyRegionId[];
  secondaryRegions: BodyRegionId[];
  primaryLabels: string[];
  secondaryLabels: string[];
  distribution: MuscleDistributionItem[];
  totalSets: number;
  totalExercises: number;
  dominantCategory: string;
}

/**
 * Analisa os exercícios realizados na sessão e extrai as regiões musculares trabalhadas
 * de ponta a ponta com rigor biomecânico, normalização central e preservação absoluta de dados.
 *
 * Regras estritas:
 * 1. Processa todos os exercícios e séries válidas da sessão (ignorando séries com status === 'skipped').
 * 2. Se uma região aparecer pelo menos uma vez como PRIMARY: ela permanece PRIMARY.
 * 3. Se aparecer somente como SECONDARY: ela permanece SECONDARY.
 * 4. PRIMARY tem prioridade visual e lógica absoluta sobre SECONDARY.
 * 5. O BodyMap e a lista textual (PRINCIPAIS / SECUNDÁRIOS) usam EXATAMENTE a mesma fonte única da verdade normalizada.
 */
export function analyzeTrainedMuscles(
  sets: WorkoutSetRecord[] | undefined,
  exerciseBank?: Exercise[]
): TrainedMusclesAnalysis {
  const regionSetCounts: Record<BodyRegionId, { primarySets: number; secondarySets: number; exerciseIds: Set<string> }> = {
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

  const validSets = (sets || []).filter(s => s && s.status !== 'skipped');
  const uniqueExercises = new Set<string>();

  // Mapa de busca de alta tolerância para metadados
  const bankMapById = new Map<string, Exercise>();
  const bankMapByName = new Map<string, Exercise>();

  if (exerciseBank && Array.isArray(exerciseBank)) {
    for (const ex of exerciseBank) {
      if (!ex) continue;
      if (ex.id) bankMapById.set(ex.id, ex);
      if (ex.name) {
        bankMapByName.set(sanitizeMuscleString(ex.name), ex);
        bankMapByName.set(ex.name.trim().toLowerCase(), ex);
      }
    }
  }

  for (const set of validSets) {
    const exId = set.exerciseId || set.exerciseName || 'unknown';
    uniqueExercises.add(exId);

    // Resolução de metadados com resiliência
    const bankEx =
      (set.exerciseId ? bankMapById.get(set.exerciseId) : undefined) ||
      (set.exerciseName ? bankMapByName.get(sanitizeMuscleString(set.exerciseName)) : undefined) ||
      (set.exerciseName ? bankMapByName.get(set.exerciseName.trim().toLowerCase()) : undefined);

    const muscleGroup = set.muscleGroup || bankEx?.muscleGroup;

    // 1. Extração e normalização das regiões PRIMÁRIAS (suporte a camelCase e snake_case)
    const exercisePrimaryRegions: BodyRegionId[] = [];

    const rawPrimaryList: string[] = [
      ...((set.primaryMuscles && Array.isArray(set.primaryMuscles)) ? set.primaryMuscles : []),
      ...(((set as any).primary_muscles && Array.isArray((set as any).primary_muscles)) ? (set as any).primary_muscles : []),
      ...((bankEx?.primaryMuscles && Array.isArray(bankEx.primaryMuscles)) ? bankEx.primaryMuscles : []),
      ...(((bankEx as any)?.primary_muscles && Array.isArray((bankEx as any).primary_muscles)) ? (bankEx as any).primary_muscles : [])
    ];

    if (rawPrimaryList.length > 0) {
      for (const rawP of rawPrimaryList) {
        const canonical = normalizeMuscleKey(rawP);
        if (canonical && !exercisePrimaryRegions.includes(canonical)) {
          exercisePrimaryRegions.push(canonical);
        } else if (!canonical) {
          const groupRegions = normalizeMuscleGroup(rawP);
          for (const gp of groupRegions.primary) {
            if (!exercisePrimaryRegions.includes(gp)) {
              exercisePrimaryRegions.push(gp);
            }
          }
        }
      }
    }

    // Prioridade B: Se não tiver lista explícita de primários, usa o muscleGroup do exercício
    if (exercisePrimaryRegions.length === 0 && muscleGroup) {
      const groupMapping = normalizeMuscleGroup(muscleGroup);
      for (const gp of groupMapping.primary) {
        if (!exercisePrimaryRegions.includes(gp)) {
          exercisePrimaryRegions.push(gp);
        }
      }
    }

    // Registra as regiões primárias para este set
    for (const p of exercisePrimaryRegions) {
      regionSetCounts[p].primarySets += 1;
      regionSetCounts[p].exerciseIds.add(exId);
    }

    // 2. Extração e normalização das regiões SECUNDÁRIAS (suporte a camelCase e snake_case)
    const exerciseSecondaryRegions: BodyRegionId[] = [];

    const rawSecondaryList: string[] = [
      ...((set.secondaryMuscles && Array.isArray(set.secondaryMuscles)) ? set.secondaryMuscles : []),
      ...(((set as any).secondary_muscles && Array.isArray((set as any).secondary_muscles)) ? (set as any).secondary_muscles : []),
      ...((bankEx?.secondaryMuscles && Array.isArray(bankEx.secondaryMuscles)) ? bankEx.secondaryMuscles : []),
      ...(((bankEx as any)?.secondary_muscles && Array.isArray((bankEx as any).secondary_muscles)) ? (bankEx as any).secondary_muscles : [])
    ];

    if (rawSecondaryList.length > 0) {
      for (const rawS of rawSecondaryList) {
        const canonical = normalizeMuscleKey(rawS);
        if (canonical && !exercisePrimaryRegions.includes(canonical) && !exerciseSecondaryRegions.includes(canonical)) {
          exerciseSecondaryRegions.push(canonical);
        } else if (!canonical) {
          const groupRegions = normalizeMuscleGroup(rawS);
          for (const gs of groupRegions.secondary) {
            if (!exercisePrimaryRegions.includes(gs) && !exerciseSecondaryRegions.includes(gs)) {
              exerciseSecondaryRegions.push(gs);
            }
          }
        }
      }
    } else if (muscleGroup) {
      // Fallback para secundários padrão do grupo muscular
      const groupMapping = normalizeMuscleGroup(muscleGroup);
      for (const gs of groupMapping.secondary) {
        if (!exercisePrimaryRegions.includes(gs) && !exerciseSecondaryRegions.includes(gs)) {
          exerciseSecondaryRegions.push(gs);
        }
      }
    }

    // Registra as regiões secundárias para este set
    for (const s of exerciseSecondaryRegions) {
      regionSetCounts[s].secondarySets += 1;
      regionSetCounts[s].exerciseIds.add(exId);
    }
  }

  // 3. Aplicação rigorosa da Regra de Prioridade: PRIMARY > SECONDARY
  const intensities: Record<BodyRegionId, MuscleIntensity> = {} as any;
  const primaryRegions: BodyRegionId[] = [];
  const secondaryRegions: BodyRegionId[] = [];
  const distribution: MuscleDistributionItem[] = [];

  let totalWeightedParticipation = 0;

  for (const [key, val] of Object.entries(regionSetCounts)) {
    const rId = key as BodyRegionId;

    if (val.primarySets > 0) {
      // Se apareceu pelo menos uma vez como primário: DEVE SER PRIMARY
      intensities[rId] = 'primary';
      primaryRegions.push(rId);
      totalWeightedParticipation += val.primarySets * 1.0;
    } else if (val.secondarySets > 0) {
      // Se apareceu apenas como secundário: DEVE SER SECONDARY
      intensities[rId] = 'secondary';
      secondaryRegions.push(rId);
      totalWeightedParticipation += val.secondarySets * 0.4;
    } else {
      intensities[rId] = 'none';
    }
  }

  // 4. Construção da lista de distribuição
  const allActiveRegions = [...primaryRegions, ...secondaryRegions];
  for (const rId of allActiveRegions) {
    const val = regionSetCounts[rId];
    const isPrimary = intensities[rId] === 'primary';
    const weight = isPrimary ? val.primarySets * 1.0 : val.secondarySets * 0.4;
    const percentage = totalWeightedParticipation > 0 ? Math.round((weight / totalWeightedParticipation) * 100) : 0;

    distribution.push({
      regionId: rId,
      label: BODY_REGIONS[rId].label,
      category: BODY_REGIONS[rId].category,
      intensity: intensities[rId] as 'primary' | 'secondary',
      setsCount: isPrimary ? val.primarySets : val.secondarySets,
      exercisesCount: val.exerciseIds.size,
      percentage
    });
  }

  // Ordenação por intensidade primária primeiro, depois participação percentual
  distribution.sort((a, b) => {
    if (a.intensity === 'primary' && b.intensity !== 'primary') return -1;
    if (a.intensity !== 'primary' && b.intensity === 'primary') return 1;
    return b.percentage - a.percentage;
  });

  // 5. Listas textuais garantindo a mesma fonte de verdade
  const primaryLabels = primaryRegions.map(r => BODY_REGIONS[r].label);
  const secondaryLabels = secondaryRegions.map(r => BODY_REGIONS[r].label);

  // Categoria dominante para resumos
  const categoryScores: Record<string, number> = { upper: 0, lower: 0, arms: 0, core: 0 };
  for (const item of distribution) {
    categoryScores[item.category] += item.percentage;
  }
  let dominantCategory = 'Geral';
  if (categoryScores.upper > 40) dominantCategory = 'Membros Superiores';
  else if (categoryScores.lower > 40) dominantCategory = 'Membros Inferiores';
  else if (categoryScores.arms > 40) dominantCategory = 'Braços';
  else if (categoryScores.core > 40) dominantCategory = 'Core & Abdômen';

  return {
    intensities,
    primaryRegions,
    secondaryRegions,
    primaryLabels,
    secondaryLabels,
    distribution,
    totalSets: validSets.length,
    totalExercises: uniqueExercises.size,
    dominantCategory
  };
}
