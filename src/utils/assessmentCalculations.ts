import { PhysicalAssessment } from '../types';

/**
 * ============================================================================
 * TFIVE PRO — MOTOR DE CÁLCULO CENTRALIZADO DE AVALIAÇÃO FÍSICA
 * Jackson & Pollock (7 e 3 Dobras) + Equação de Siri + Composição Corporal
 * ============================================================================
 */

export interface SkinfoldMap {
  chest?: number;
  abdominal?: number;
  thigh?: number;
  triceps?: number;
  subscapular?: number;
  suprailiac?: number;
  midaxillary?: number;
}

export interface CircumferenceMap {
  neck?: number;
  shoulders?: number;
  chest?: number;
  waist?: number;
  abdomen?: number;
  hips?: number;
  rightArmRelaxed?: number;
  rightArmContracted?: number;
  leftArmRelaxed?: number;
  leftArmContracted?: number;
  rightForearm?: number;
  leftForearm?: number;
  rightThigh?: number;
  leftThigh?: number;
  rightCalf?: number;
  leftCalf?: number;
}

export interface ComputedAssessmentMetrics {
  sumOfSkinfolds: number;
  bodyDensity: number;
  bodyFatPercentage: number;
  fatMassKg: number;
  leanMassKg: number;
  leanMassPercentage: number;
  bmi: number;
  waistHipRatio?: number;
  formulaUsed: string;
}

/**
 * 1. Jackson & Pollock 7 Dobras — Densidade Corporal
 *
 * Homens:
 * D = 1.112 - (0.00043499 × Σ7) + (0.00000055 × Σ7²) - (0.00028826 × idade)
 *
 * Mulheres:
 * D = 1.097 - (0.00046971 × Σ7) + (0.00000056 × Σ7²) - (0.00012828 × idade)
 */
export function calculateJP7Density(
  gender: 'male' | 'female',
  age: number,
  sum7Mm: number
): number {
  const safeAge = Math.max(10, Math.min(120, age || 25));
  const s = Math.max(0, sum7Mm);

  if (s <= 0) return 1.0;

  if (gender === 'male') {
    const density = 1.112 - (0.00043499 * s) + (0.00000055 * (s * s)) - (0.00028826 * safeAge);
    return Number(density.toFixed(6));
  } else {
    const density = 1.097 - (0.00046971 * s) + (0.00000056 * (s * s)) - (0.00012828 * safeAge);
    return Number(density.toFixed(6));
  }
}

/**
 * 2. Jackson & Pollock 3 Dobras — Densidade Corporal
 * Homens (Peitoral, Abdominal, Coxa):
 * D = 1.10938 - (0.0008267 × Σ3) + (0.0000016 × Σ3²) - (0.0002574 × idade)
 *
 * Mulheres (Tríceps, Suprailíaca, Coxa):
 * D = 1.0994921 - (0.0009929 × Σ3) + (0.0000023 × Σ3²) - (0.0001392 × idade)
 */
export function calculateJP3Density(
  gender: 'male' | 'female',
  age: number,
  sum3Mm: number
): number {
  const safeAge = Math.max(10, Math.min(120, age || 25));
  const s = Math.max(0, sum3Mm);

  if (s <= 0) return 1.0;

  if (gender === 'male') {
    const density = 1.10938 - (0.0008267 * s) + (0.0000016 * (s * s)) - (0.0002574 * safeAge);
    return Number(density.toFixed(6));
  } else {
    const density = 1.0994921 - (0.0009929 * s) + (0.0000023 * (s * s)) - (0.0001392 * safeAge);
    return Number(density.toFixed(6));
  }
}

/**
 * 3. Equação de Siri (1956)
 * % gordura = (495 / densidade) - 450
 */
export function calculateSiriBodyFat(density: number): number {
  if (density <= 0 || !isFinite(density)) return 0;
  const bf = (495 / density) - 450;
  // Bound to biologically possible limits for safe display
  const bounded = Math.max(2.0, Math.min(75.0, bf));
  return Number(bounded.toFixed(1));
}

/**
 * 4. Massa Gorda (kg) = peso × (% gordura / 100)
 */
export function calculateFatMass(weightKg: number, bodyFatPct: number): number {
  if (weightKg <= 0 || bodyFatPct <= 0) return 0;
  const fat = weightKg * (bodyFatPct / 100);
  return Number(fat.toFixed(2));
}

/**
 * 5. Massa Magra (kg) = peso - massa gorda
 */
export function calculateLeanMass(weightKg: number, fatMassKg: number): number {
  if (weightKg <= 0) return 0;
  const lean = Math.max(0, weightKg - fatMassKg);
  return Number(lean.toFixed(2));
}

/**
 * 6. IMC = peso / (altura / 100)²
 */
export function calculateBMI(weightKg: number, heightCm: number): number {
  if (weightKg <= 0 || heightCm <= 0) return 0;
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return Number(bmi.toFixed(1));
}

/**
 * 7. RCQ (Relação Cintura-Quadril) = cintura / quadril
 */
export function calculateWHR(waistCm?: number, hipsCm?: number): number | undefined {
  if (!waistCm || !hipsCm || waistCm <= 0 || hipsCm <= 0) return undefined;
  return Number((waistCm / hipsCm).toFixed(2));
}

/**
 * 8. Média de múltiplas medidas de uma mesma dobra
 */
export function calculateSkinfoldAverage(measurements?: number[]): number {
  if (!measurements || measurements.length === 0) return 0;
  const valid = measurements.filter(v => typeof v === 'number' && v > 0 && !isNaN(v));
  if (valid.length === 0) return 0;
  const sum = valid.reduce((acc, curr) => acc + curr, 0);
  return Number((sum / valid.length).toFixed(1));
}

/**
 * 9. Soma das 7 Dobras Jackson & Pollock
 * Peitoral + Axilar Média + Tríceps + Subescapular + Abdominal + Supra-ilíaca + Coxa
 */
export function calculateSumOf7Skinfolds(skinfolds: SkinfoldMap): number {
  const { chest = 0, midaxillary = 0, triceps = 0, subscapular = 0, abdominal = 0, suprailiac = 0, thigh = 0 } = skinfolds;
  const sum = (Number(chest) || 0) +
              (Number(midaxillary) || 0) +
              (Number(triceps) || 0) +
              (Number(subscapular) || 0) +
              (Number(abdominal) || 0) +
              (Number(suprailiac) || 0) +
              (Number(thigh) || 0);
  return Number(sum.toFixed(1));
}

/**
 * 10. Validação completa e cálculo integrado da avaliação física Jackson & Pollock 7 Dobras
 */
export function computeCompleteJP7Assessment(params: {
  gender: 'male' | 'female';
  age: number;
  weightKg: number;
  heightCm: number;
  skinfolds: SkinfoldMap;
  circumferences?: CircumferenceMap;
}): ComputedAssessmentMetrics {
  const { gender, age, weightKg, heightCm, skinfolds, circumferences } = params;

  const sumOfSkinfolds = calculateSumOf7Skinfolds(skinfolds);
  const bodyDensity = calculateJP7Density(gender, age, sumOfSkinfolds);
  const bodyFatPercentage = calculateSiriBodyFat(bodyDensity);
  const fatMassKg = calculateFatMass(weightKg, bodyFatPercentage);
  const leanMassKg = calculateLeanMass(weightKg, fatMassKg);
  const leanMassPercentage = Number((100 - bodyFatPercentage).toFixed(1));
  const bmi = calculateBMI(weightKg, heightCm);
  const waistHipRatio = calculateWHR(circumferences?.waist, circumferences?.hips);

  return {
    sumOfSkinfolds,
    bodyDensity,
    bodyFatPercentage,
    fatMassKg,
    leanMassKg,
    leanMassPercentage,
    bmi,
    waistHipRatio,
    formulaUsed: 'Jackson & Pollock — 7 Dobras + Siri'
  };
}

/**
 * 11. Comparação entre avaliação atual e anterior (Evolução real)
 */
export interface AssessmentEvolutionComparison {
  latest: PhysicalAssessment;
  previous: PhysicalAssessment;
  daysBetween: number;
  deltas: {
    weightKg: number;
    bodyFatPercentage: number; // in percentage points (p.p.)
    fatMassKg: number;
    leanMassKg: number;
    sumOfSkinfolds?: number;
    bmi: number;
    waistHipRatio?: number;
  };
  skinfoldComparisons: Array<{
    key: keyof SkinfoldMap;
    label: string;
    previous: number;
    current: number;
    diff: number;
  }>;
  circumferenceComparisons: Array<{
    key: keyof CircumferenceMap;
    label: string;
    previous: number;
    current: number;
    diff: number;
  }>;
}

export const SKINFOLD_LABELS_PT: Record<keyof SkinfoldMap, string> = {
  chest: 'Peitoral',
  midaxillary: 'Axilar Média',
  triceps: 'Tríceps',
  subscapular: 'Subescapular',
  abdominal: 'Abdominal',
  suprailiac: 'Supra-ilíaca',
  thigh: 'Coxa'
};

export const CIRCUMFERENCE_LABELS_PT: Record<keyof CircumferenceMap, string> = {
  neck: 'Pescoço',
  shoulders: 'Ombros',
  chest: 'Tórax',
  waist: 'Cintura',
  abdomen: 'Abdômen',
  hips: 'Quadril',
  rightArmContracted: 'Braço Dir. (Contraído)',
  rightArmRelaxed: 'Braço Dir. (Relaxado)',
  leftArmContracted: 'Braço Esq. (Contraído)',
  leftArmRelaxed: 'Braço Esq. (Relaxado)',
  rightForearm: 'Antebraço Direito',
  leftForearm: 'Antebraço Esquerdo',
  rightThigh: 'Coxa Direita',
  leftThigh: 'Coxa Esquerda',
  rightCalf: 'Panturrilha Direita',
  leftCalf: 'Panturrilha Esquerda'
};

export function compareAssessments(
  latest: PhysicalAssessment,
  previous: PhysicalAssessment
): AssessmentEvolutionComparison {
  const d1 = new Date(latest.date).getTime();
  const d2 = new Date(previous.date).getTime();
  const daysBetween = Math.max(0, Math.round(Math.abs(d1 - d2) / (1000 * 60 * 60 * 24)));

  const latestSum = latest.sumOfSkinfolds ?? (latest.skinfolds ? calculateSumOf7Skinfolds(latest.skinfolds) : 0);
  const prevSum = previous.sumOfSkinfolds ?? (previous.skinfolds ? calculateSumOf7Skinfolds(previous.skinfolds) : 0);
  const sumDiff = (latestSum > 0 && prevSum > 0) ? Number((latestSum - prevSum).toFixed(1)) : undefined;

  const skinfoldComparisons: AssessmentEvolutionComparison['skinfoldComparisons'] = [];
  if (latest.skinfolds && previous.skinfolds) {
    const keys: Array<keyof SkinfoldMap> = ['chest', 'midaxillary', 'triceps', 'subscapular', 'abdominal', 'suprailiac', 'thigh'];
    for (const k of keys) {
      const c = latest.skinfolds[k];
      const p = previous.skinfolds[k];
      if (typeof c === 'number' && c > 0 && typeof p === 'number' && p > 0) {
        skinfoldComparisons.push({
          key: k,
          label: SKINFOLD_LABELS_PT[k] || k,
          previous: p,
          current: c,
          diff: Number((c - p).toFixed(1))
        });
      }
    }
  }

  const circumferenceComparisons: AssessmentEvolutionComparison['circumferenceComparisons'] = [];
  if (latest.circumferences && previous.circumferences) {
    const keys = Object.keys(CIRCUMFERENCE_LABELS_PT) as Array<keyof CircumferenceMap>;
    for (const k of keys) {
      const c = latest.circumferences[k];
      const p = previous.circumferences[k];
      if (typeof c === 'number' && c > 0 && typeof p === 'number' && p > 0) {
        circumferenceComparisons.push({
          key: k,
          label: CIRCUMFERENCE_LABELS_PT[k] || k,
          previous: p,
          current: c,
          diff: Number((c - p).toFixed(1))
        });
      }
    }
  }

  return {
    latest,
    previous,
    daysBetween,
    deltas: {
      weightKg: Number((latest.weightKg - previous.weightKg).toFixed(1)),
      bodyFatPercentage: Number((latest.bodyFatPercentage - previous.bodyFatPercentage).toFixed(1)),
      fatMassKg: Number(((latest.fatMassKg || 0) - (previous.fatMassKg || 0)).toFixed(1)),
      leanMassKg: Number(((latest.leanMassKg || 0) - (previous.leanMassKg || 0)).toFixed(1)),
      sumOfSkinfolds: sumDiff,
      bmi: Number(((latest.bmi || 0) - (previous.bmi || 0)).toFixed(1)),
      waistHipRatio: (latest.waistHipRatio && previous.waistHipRatio)
        ? Number((latest.waistHipRatio - previous.waistHipRatio).toFixed(2))
        : undefined
    },
    skinfoldComparisons,
    circumferenceComparisons
  };
}

/**
 * 12. Formatadores amigáveis em Padrão Brasileiro (pt-BR)
 */
export function formatNumberBR(val?: number, decimals: number = 1): string {
  if (val === undefined || val === null || isNaN(val)) return '—';
  return val.toFixed(decimals).replace('.', ',');
}

export function formatPercentagePointsBR(diff: number): string {
  if (isNaN(diff)) return '—';
  const sign = diff > 0 ? '+' : (diff < 0 ? '−' : '');
  const abs = Math.abs(diff).toFixed(1).replace('.', ',');
  return `${sign}${abs} p.p.`;
}

export function formatDeltaValueBR(diff: number, unit: string = 'kg'): string {
  if (isNaN(diff)) return '—';
  const sign = diff > 0 ? '+' : (diff < 0 ? '−' : '');
  const abs = Math.abs(diff).toFixed(1).replace('.', ',');
  return `${sign}${abs} ${unit}`;
}
