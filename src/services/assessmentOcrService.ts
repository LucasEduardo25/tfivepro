/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TFIVE PRO — Local-First Physical Assessment OCR & Semantic Parser
 * 
 * Extracts physical assessment measurements (Weight, Body Fat %, Lean Mass,
 * Skinfolds, Circumferences, BMI, Waist-to-Hip ratio, dates, and classifications)
 * from photos, screenshots, and PDF/report images 100% in the client browser.
 */

import { AssessmentProtocol, FieldProvenance } from '../types';

export interface ExtractedAssessmentData {
  assessmentDate?: string;
  protocol?: AssessmentProtocol;
  weightKg?: number;
  heightCm?: number;
  bmi?: number;
  bodyFatPercentage?: number;
  fatMassKg?: number;
  leanMassPercentage?: number;
  leanMassKg?: number;
  waistHipRatio?: number;
  skinfolds?: {
    chest?: number;
    abdominal?: number;
    thigh?: number;
    triceps?: number;
    subscapular?: number;
    suprailiac?: number;
    midaxillary?: number;
  };
  circumferences?: {
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
    shoulders?: number;
    neck?: number;
  };
  originalClassifications: Record<string, string>;
  fieldWarnings: Record<string, string>;
  fieldConfidence: Record<string, 'high' | 'medium' | 'low'>;
  provenance: Record<string, FieldProvenance>;
  rawText: string;
}

export interface OcrProgressEvent {
  stage: 'preprocessing' | 'recognizing' | 'parsing' | 'completed' | 'error';
  progress: number; // 0 to 100
  message: string;
}

/**
 * Preprocesses image on canvas to enhance contrast for OCR
 */
export async function preprocessImageForOcr(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 2000;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);
        const d = imgData.data;

        // Enhance contrast and convert to grayscale for crisp text edges
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          // Grayscale luminance
          let gray = 0.299 * r + 0.587 * g + 0.114 * b;
          // Contrast stretch
          gray = (gray - 128) * 1.25 + 128;
          gray = Math.max(0, Math.min(255, gray));
          d[i] = gray;
          d[i + 1] = gray;
          d[i + 2] = gray;
        }
        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (err) {
        console.warn('Preprocessing canvas error, falling back to original:', err);
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Parses numeric strings in Brazilian ("69,50") and International ("69.50") format
 */
export function parseLocalizedNumber(raw: string): number | null {
  if (!raw) return null;
  // Clean unwanted characters except digits, dot and comma
  const cleaned = raw.trim().replace(/[^\d.,]/g, '');
  if (!cleaned) return null;

  // Handle formats:
  // "1.234,56" -> 1234.56
  // "69,50" -> 69.50
  // "69.50" -> 69.50
  // "69,5" -> 69.5
  if (cleaned.includes('.') && cleaned.includes(',')) {
    const withoutThousands = cleaned.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(withoutThousands);
    return isNaN(num) ? null : num;
  }

  if (cleaned.includes(',')) {
    const num = parseFloat(cleaned.replace(',', '.'));
    return isNaN(num) ? null : num;
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Checks plausibility of a measurement and produces a human warning if abnormal
 */
function validatePlausibility(key: string, value: number): string | null {
  switch (key) {
    case 'weightKg':
      if (value < 20 || value > 350) return 'Esse valor parece incomum. Confira antes de salvar.';
      break;
    case 'heightCm':
      if (value < 80 || value > 250) return 'Altura fora da faixa comum (80-250cm).';
      break;
    case 'bodyFatPercentage':
      if (value < 2 || value > 75) return '% de gordura parece fora do padrão (2-75%).';
      break;
    case 'fatMassKg':
      if (value < 1 || value > 200) return 'Massa gorda parece incomum.';
      break;
    case 'leanMassKg':
      if (value < 10 || value > 200) return 'Massa magra parece incomum.';
      break;
    case 'leanMassPercentage':
      if (value < 20 || value > 98) return '% de massa magra fora da faixa comum.';
      break;
    case 'waistHipRatio':
      if (value < 0.4 || value > 1.8) return 'Relação cintura-quadril parece incomum.';
      break;
    case 'bmi':
      if (value < 10 || value > 80) return 'IMC fora da faixa esperada.';
      break;
    default:
      if (value < 0) return 'Valor não pode ser negativo.';
  }
  return null;
}

/**
 * Semantic Parser: Analyzes raw OCR text and matches keywords, metrics, percentages, and classifications
 */
export function parseAssessmentText(rawText: string): ExtractedAssessmentData {
  const result: ExtractedAssessmentData = {
    originalClassifications: {},
    fieldWarnings: {},
    fieldConfidence: {},
    provenance: {},
    rawText
  };

  const text = rawText || '';
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Helper to mark field
  const assignField = (
    key: string, 
    value: number | undefined, 
    confidence: 'high' | 'medium' | 'low' = 'high'
  ) => {
    if (value === undefined || isNaN(value)) return;
    const warning = validatePlausibility(key, value);
    result.fieldConfidence[key] = warning ? 'low' : confidence;
    result.provenance[key] = 'imported';
    if (warning) {
      result.fieldWarnings[key] = warning;
    }
  };

  // 1. DATE EXTRACTION
  // Look for DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, YYYY-MM-DD
  const dateRegex = /(?:data|data da avaliação|avaliação em|realizada em|em)?:?\s*(\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b)/i;
  const dateMatch = text.match(dateRegex);
  if (dateMatch && dateMatch[1]) {
    const rawDate = dateMatch[1].replace(/[./]/g, '-');
    const parts = rawDate.split('-');
    if (parts.length === 3) {
      let day = parts[0].padStart(2, '0');
      let month = parts[1].padStart(2, '0');
      let year = parts[2];
      if (year.length === 2) year = `20${year}`;
      // In case format is YYYY-MM-DD
      if (parts[0].length === 4) {
        result.assessmentDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else {
        result.assessmentDate = `${year}-${month}-${day}`;
      }
    }
  }

  // 2. PROTOCOL DETECTION
  if (/jackson|pollock|dobras\s*cut[âa]neas/i.test(text)) {
    result.protocol = 'jackson_pollock_7';
  } else if (/bioimped[âa]ncia|inbody|tanita|omron|tetrapolar/i.test(text)) {
    result.protocol = 'bioimpedance';
  } else if (/next\s*fit|tecnofit|evo|pactor|app/i.test(text)) {
    result.protocol = 'external_app';
  } else {
    result.protocol = 'bioimpedance'; // Default plausible fallback
  }

  // 3. COMBINED LINE MATCHING (e.g. "Massa gorda 33,9% 23,53kg" or "Massa magra 66,1% 45,97kg")
  for (const line of lines) {
    const normalizedLine = line.toLowerCase();

    // Check Massa Gorda compound line (Percent + Kg)
    if ((normalizedLine.includes('massa gorda') || normalizedLine.includes('gordura corporal') || normalizedLine.includes('gordura total')) && !normalizedLine.includes('isenta')) {
      const numbersInLine = Array.from(line.matchAll(/(\d+(?:[.,]\d+)?)\s*(%|kg)?/gi));
      for (const m of numbersInLine) {
        const val = parseLocalizedNumber(m[1]);
        const unit = m[2]?.toLowerCase();
        if (val !== null) {
          if (unit === '%' || (val <= 75 && result.bodyFatPercentage === undefined && !unit)) {
            result.bodyFatPercentage = val;
            assignField('bodyFatPercentage', val);
          } else if (unit === 'kg' || (val > 0 && result.fatMassKg === undefined)) {
            result.fatMassKg = val;
            assignField('fatMassKg', val);
          }
        }
      }
    }

    // Check Massa Magra compound line (Percent + Kg)
    if (normalizedLine.includes('massa magra') || normalizedLine.includes('massa livre') || normalizedLine.includes('lean mass')) {
      const numbersInLine = Array.from(line.matchAll(/(\d+(?:[.,]\d+)?)\s*(%|kg)?/gi));
      for (const m of numbersInLine) {
        const val = parseLocalizedNumber(m[1]);
        const unit = m[2]?.toLowerCase();
        if (val !== null) {
          if (unit === '%' || (val <= 100 && val >= 30 && result.leanMassPercentage === undefined && !unit)) {
            result.leanMassPercentage = val;
            assignField('leanMassPercentage', val);
          } else if (unit === 'kg' || (val > 0 && result.leanMassKg === undefined)) {
            result.leanMassKg = val;
            assignField('leanMassKg', val);
          }
        }
      }
    }
  }

  // 4. GENERAL FIELDS PARSING WITH SPECIFIC   // Helper to find first valid number match across all occurrences of regexes
  const findValidMatch = (
    patterns: RegExp[],
    validator: (val: number) => boolean,
    multiplier: number = 1
  ): number | null => {
    for (const pat of patterns) {
      // Use global search to scan all occurrences
      const globalRegex = new RegExp(pat.source, pat.flags.includes('i') ? 'gi' : 'g');
      const matches = Array.from(text.matchAll(globalRegex));
      for (const match of matches) {
        if (match && match[1]) {
          const val = parseLocalizedNumber(match[1]);
          if (val !== null) {
            const finalVal = val * multiplier;
            if (validator(finalVal)) {
              return finalVal;
            }
          }
        }
      }
    }
    return null;
  };

  // PESO (WEIGHT)
  if (result.weightKg === undefined) {
    const val = findValidMatch(
      [
        /(?:peso\s*corporal|peso\s*atual|peso|massa\s*corporal|body\s*weight|weight)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:kg|kilos|quilos)?/i,
        /(\d+(?:[.,]\d+)?)\s*kg\b/i
      ],
      v => v >= 25 && v <= 350
    );
    if (val !== null) {
      result.weightKg = val;
      assignField('weightKg', val);
    }
  }

  // ALTURA (HEIGHT)
  if (result.heightCm === undefined) {
    for (const pat of [
      /(?:altura|estatura|height)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:cm|m)?/i,
      /(\d{1,3}[.,]\d{1,2})\s*m\b/i,
      /(\d{3})\s*cm\b/i
    ]) {
      const globalRegex = new RegExp(pat.source, 'gi');
      const matches = Array.from(text.matchAll(globalRegex));
      let found = false;
      for (const match of matches) {
        if (match && match[1]) {
          let val = parseLocalizedNumber(match[1]);
          if (val) {
            if (val < 3 && val > 0.8) {
              val = Math.round(val * 100);
            }
            if (val >= 80 && val <= 250) {
              result.heightCm = val;
              assignField('heightCm', val);
              found = true;
              break;
            }
          }
        }
      }
      if (found) break;
    }
  }

  // IMC (BMI)
  if (result.bmi === undefined) {
    const val = findValidMatch(
      [/(?:imc|índice\s*de\s*massa\s*corporal|indice\s*de\s*massa\s*corporal|bmi)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i],
      v => v >= 10 && v <= 80
    );
    if (val !== null) {
      result.bmi = val;
      assignField('bmi', val);
    }
  }

  // RELAÇÃO CINTURA/QUADRIL (RCQ / WHR)
  if (result.waistHipRatio === undefined) {
    const val = findValidMatch(
      [/(?:rela[çc][ãa]o\s*cintura[-/\s]*quadril|rcq|whr|cintura\s*[/]\s*quadril)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i],
      v => v >= 0.4 && v <= 1.8
    );
    if (val !== null) {
      result.waistHipRatio = val;
      assignField('waistHipRatio', val);
    }
  }

  // GORDURA CORPORAL % (se ainda não preenchido)
  if (result.bodyFatPercentage === undefined) {
    const val = findValidMatch(
      [
        /(?:%\s*gordura|gordura\s*corporal|percentual\s*de\s*gordura|bf%|bf|gordura\s*\(%\)|%\s*de\s*gordura)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*%/i,
        /(?:gordura|bf)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*%/i
      ],
      v => v >= 2 && v <= 75
    );
    if (val !== null) {
      result.bodyFatPercentage = val;
      assignField('bodyFatPercentage', val);
    }
  }

  // MASSA GORDA KG (se ainda não preenchido)
  if (result.fatMassKg === undefined) {
    const val = findValidMatch(
      [/(?:massa\s*gorda|massa\s*de\s*gordura|gordura\s*\(kg\)|peso\s*gordo|fat\s*mass)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:kg)?/i],
      v => v > 0 && v <= 150
    );
    if (val !== null) {
      result.fatMassKg = val;
      assignField('fatMassKg', val);
    }
  }

  // MASSA MAGRA KG (se ainda não preenchido)
  if (result.leanMassKg === undefined) {
    const val = findValidMatch(
      [/(?:massa\s*magra|massa\s*livre\s*de\s*gordura|lean\s*mass|peso\s*magro|massa\s*muscular)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:kg)?/i],
      v => v > 10 && v <= 200
    );
    if (val !== null) {
      result.leanMassKg = val;
      assignField('leanMassKg', val);
    }
  }

  // 5. CIRCUNFERÊNCIAS (PERÍMETROS)
  const circumferences: NonNullable<ExtractedAssessmentData['circumferences']> = {};
  
  const circDefs: Array<{
    key: keyof NonNullable<ExtractedAssessmentData['circumferences']>;
    patterns: RegExp[];
  }> = [
    {
      key: 'neck',
      patterns: [/(?:pesco[çc]o|neck)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?/i]
    },
    {
      key: 'shoulders',
      patterns: [/(?:ombros?|shoulders?)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?/i]
    },
    {
      key: 'chest',
      patterns: [/(?:t[óo]rax|peitoral|peito|chest)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?/i]
    },
    {
      key: 'waist',
      patterns: [/(?:cintura|waist)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?/i]
    },
    {
      key: 'abdomen',
      patterns: [/(?:abd[ôo]men|abdominal|abdomen|cintura\s*umbilical)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?/i]
    },
    {
      key: 'hips',
      patterns: [/(?:(?:^|[^\w\-])quadril|quadr[ií]l|hips|gl[úu]teos?)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?/i]
    },
    {
      key: 'rightArmContracted',
      patterns: [
        /(?:bra[çc]o\s*(?:direito|dir|d\.?)\s*(?:contra[íi]do|contr\.?)?|bra[çc]o\s*contra[íi]do\s*(?:direito|dir|d\.?)|bra[çc]o\s*d)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?/i
      ]
    },
    {
      key: 'leftArmContracted',
      patterns: [
        /(?:bra[çc]o\s*(?:esquerdo|esq|e\.?)\s*(?:contra[íi]do|contr\.?)?|bra[çc]o\s*contra[íi]do\s*(?:esquerdo|esq|e\.?)|bra[çc]o\s*e)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?/i
      ]
    },
    {
      key: 'rightForearm',
      patterns: [/(?:antebra[çc]o\s*dir(?:eito)?|antebra[çc]o\s*d|antebra[çc]o|forearm)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?/i]
    },
    {
      key: 'leftForearm',
      patterns: [/(?:antebra[çc]o\s*esq(?:uerdo)?|antebra[çc]o\s*e)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?/i]
    },
    {
      key: 'rightThigh',
      patterns: [/(?:coxa\s*dir(?:eita)?|coxa\s*d|coxa\s*medial|coxa|thigh)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?/i]
    },
    {
      key: 'leftThigh',
      patterns: [/(?:coxa\s*esq(?:uerda)?|coxa\s*e)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?/i]
    },
    {
      key: 'rightCalf',
      patterns: [/(?:panturrilha\s*dir(?:eita)?|panturrilha\s*d|panturrilha|calf)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?/i]
    },
    {
      key: 'leftCalf',
      patterns: [/(?:panturrilha\s*esq(?:uerda)?|panturrilha\s*e)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?/i]
    }
  ];

  for (const item of circDefs) {
    const val = findValidMatch(item.patterns, v => v >= 10 && v <= 250);
    if (val !== null) {
      circumferences[item.key] = val;
      assignField(`circumference_${item.key}`, val);
    }
  }

  if (Object.keys(circumferences).length > 0) {
    result.circumferences = circumferences;
  }

  // 6. DOBRAS CUTÂNEAS (SKINFOLDS)
  const skinfolds: NonNullable<ExtractedAssessmentData['skinfolds']> = {};
  const skinfoldDefs: Array<{
    key: keyof NonNullable<ExtractedAssessmentData['skinfolds']>;
    patterns: RegExp[];
  }> = [
    {
      key: 'triceps',
      patterns: [
        /(?:dobra\s*tr[íi]ceps|dobra\s*tricipital|tr[íi]ceps|tricipital|triceps)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?/i
      ]
    },
    {
      key: 'subscapular',
      patterns: [
        /(?:dobra\s*subescapular|subescapular|subscapular)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?/i
      ]
    },
    {
      key: 'suprailiac',
      patterns: [
        /(?:dobra\s*suprail[íi]aca|suprail[íi]aca|suprailiaca|supra-il[íi]aca)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?/i
      ]
    },
    {
      key: 'abdominal',
      patterns: [
        /(?:dobra\s*abdominal|abdominal\s*\(mm\)|dobra\s*abdome)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?/i,
        /(?:abdominal|abdome)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*mm\b/i
      ]
    },
    {
      key: 'thigh',
      patterns: [
        /(?:dobra\s*coxa|coxa\s*\(mm\)|thigh\s*skinfold)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?/i,
        /coxa\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*mm\b/i
      ]
    },
    {
      key: 'chest',
      patterns: [
        /(?:dobra\s*peitoral|peitoral\s*\(mm\)|t[óo]rax\s*\(mm\))\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?/i,
        /peitoral\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*mm\b/i
      ]
    },
    {
      key: 'midaxillary',
      patterns: [
        /(?:axilar\s*m[ée]dia|axilar\s*media|midaxillary)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?/i
      ]
    }
  ];

  for (const item of skinfoldDefs) {
    const val = findValidMatch(item.patterns, v => v >= 1 && v <= 100);
    if (val !== null) {
      skinfolds[item.key] = val;
      assignField(`skinfold_${item.key}`, val);
    }
  }

  if (Object.keys(skinfolds).length > 0) {
    result.skinfolds = skinfolds;
  }

  // 7. EXTERNAL CLASSIFICATIONS (Qualitative texts)
  const classificationKeywords = [
    'excelente', 'muito bom', 'bom', 'normal', 'adequado', 
    'média', 'medio', 'médio', 'acima da média', 'acima da media', 
    'pior que a média', 'abaixo da média', 'abaixo da media',
    'alto', 'muito alto', 'sobrepeso', 'obesidade', 'baixo', 'muito baixo'
  ];

  for (const line of lines) {
    const low = line.toLowerCase();
    for (const kw of classificationKeywords) {
      if (low.includes(kw)) {
        if (low.includes('gordura') || low.includes('bf')) {
          result.originalClassifications['bodyFat'] = kw.toUpperCase();
        } else if (low.includes('imc') || low.includes('bmi')) {
          result.originalClassifications['bmi'] = kw.toUpperCase();
        } else if (low.includes('cintura') || low.includes('rcq') || low.includes('quadril')) {
          result.originalClassifications['rcq'] = kw.toUpperCase();
        }
      }
    }
  }

  return result;
}

/**
 * Calculates derived physical assessment metrics when base values are confirmed
 */
export function calculateDerivedAssessmentMetrics(
  weightKg?: number,
  heightCm?: number,
  bodyFatPercentage?: number,
  leanMassKg?: number,
  fatMassKg?: number
): {
  calculatedFatMassKg?: number;
  calculatedLeanMassKg?: number;
  calculatedLeanMassPercentage?: number;
  calculatedBmi?: number;
} {
  const output: {
    calculatedFatMassKg?: number;
    calculatedLeanMassKg?: number;
    calculatedLeanMassPercentage?: number;
    calculatedBmi?: number;
  } = {};

  if (weightKg && weightKg > 0) {
    // 1. BMI Calculation
    if (heightCm && heightCm > 0) {
      const heightMeters = heightCm / 100;
      output.calculatedBmi = parseFloat((weightKg / (heightMeters * heightMeters)).toFixed(2));
    }

    // 2. Fat Mass & Lean Mass from Weight & %Fat
    if (bodyFatPercentage !== undefined && bodyFatPercentage > 0 && bodyFatPercentage < 100) {
      const fatKg = parseFloat(((weightKg * bodyFatPercentage) / 100).toFixed(2));
      const leanKg = parseFloat((weightKg - fatKg).toFixed(2));
      const leanPct = parseFloat((100 - bodyFatPercentage).toFixed(1));

      if (fatMassKg === undefined) {
        output.calculatedFatMassKg = fatKg;
      }
      if (leanMassKg === undefined) {
        output.calculatedLeanMassKg = leanKg;
      }
      output.calculatedLeanMassPercentage = leanPct;
    }
  }

  return output;
}

/**
 * Executes Local-First OCR using Tesseract.js via Dynamic Lazy Import.
 * Worker is initialized, performs recognition, and is cleanly terminated to free memory.
 */
export async function performAssessmentOCR(
  imageDataUrl: string,
  onProgress?: (event: OcrProgressEvent) => void
): Promise<ExtractedAssessmentData> {
  onProgress?.({
    stage: 'preprocessing',
    progress: 15,
    message: 'Otimizando contraste e alinhamento da imagem...'
  });

  // 1. Preprocess image
  const preprocessedUrl = await preprocessImageForOcr(imageDataUrl);

  onProgress?.({
    stage: 'recognizing',
    progress: 35,
    message: 'Inicializando motor OCR local...'
  });

  // 2. Dynamically import Tesseract.js (Lazy Loaded, 0ms impact on app boot)
  const { createWorker } = await import('tesseract.js');

  let worker: any = null;
  try {
    onProgress?.({
      stage: 'recognizing',
      progress: 50,
      message: 'Detectando caracteres e tabelas de medidas...'
    });

    worker = await createWorker('por+eng', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text' && typeof m.progress === 'number') {
          const prog = Math.round(50 + m.progress * 35);
          onProgress?.({
            stage: 'recognizing',
            progress: prog,
            message: `Lendo texto da imagem (${Math.round(m.progress * 100)}%)...`
          });
        }
      }
    });

    const ret = await worker.recognize(preprocessedUrl);
    const rawText = ret.data?.text || '';

    onProgress?.({
      stage: 'parsing',
      progress: 90,
      message: 'Interpretando medidas e parâmetros corporais...'
    });

    // 3. Parse semantically
    const parsedData = parseAssessmentText(rawText);

    onProgress?.({
      stage: 'completed',
      progress: 100,
      message: 'Leitura concluída com sucesso!'
    });

    return parsedData;
  } catch (err: unknown) {
    console.error('Local OCR Error:', err);
    // If OCR engine fails, return an empty parsed structure with fallback error
    onProgress?.({
      stage: 'error',
      progress: 100,
      message: 'Não foi possível processar a imagem com OCR local.'
    });
    return {
      originalClassifications: {},
      fieldWarnings: { general: 'Falha no reconhecimento da imagem. Você pode preencher os campos manualmente.' },
      fieldConfidence: {},
      provenance: {},
      rawText: ''
    };
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // Ignore worker terminate error
      }
    }
  }
}
