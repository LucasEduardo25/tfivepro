/**
 * ============================================================================
 * TFIVE PRO — MOTOR DE CLASSIFICAÇÕES CIENTÍFICAS DE AVALIAÇÃO FÍSICA
 * Tabelas e referências validadas por sexo, idade, indicador e protocolo
 * ============================================================================
 */

export interface MetricClassification {
  label: string;
  category: 'excellent' | 'good' | 'average' | 'above_average' | 'high' | 'very_high' | 'low' | 'normal' | 'alert';
  referenceSource: string;
  badgeStyle: {
    bg: string;
    text: string;
    border: string;
  };
  description?: string;
}

/**
 * 1. CLASSIFICAÇÃO DE GORDURA CORPORAL (% GC)
 * Referência: Pollock & Wilmore (1990) / American College of Sports Medicine (ACSM)
 * Estratificado por Sexo (Masculino / Feminino) e Faixa Etária (18-29, 30-39, 40-49, 50-59, 60+)
 */
export function getBodyFatClassification(
  bodyFatPct: number,
  gender: 'male' | 'female',
  age: number
): MetricClassification | null {
  if (bodyFatPct <= 0 || !isFinite(bodyFatPct)) return null;

  const safeAge = Math.max(15, Math.min(100, age || 25));

  // Tabela Masculina (Pollock & Wilmore / ACSM)
  if (gender === 'male') {
    const ref = `Pollock & Wilmore / ACSM (Homens ${getAgeBracketLabel(safeAge)})`;

    if (safeAge < 30) {
      if (bodyFatPct < 6) return makeClass('Atleta / Muito Baixo', 'low', ref, 'Abaixo dos limites essenciais para atletas de alto rendimento');
      if (bodyFatPct <= 10.9) return makeClass('Excelente', 'excellent', ref, 'Nível atlético de alta definição');
      if (bodyFatPct <= 14.9) return makeClass('Bom', 'good', ref, 'Excelente composição corporal e aptidão física');
      if (bodyFatPct <= 17.9) return makeClass('Na Média', 'average', ref, 'Faixa média saudável da população');
      if (bodyFatPct <= 21.9) return makeClass('Acima da Média', 'above_average', ref, 'Levemente acima do percentual recomendado');
      if (bodyFatPct <= 24.9) return makeClass('Alto', 'high', ref, 'Percentual elevado; recomenda-se protocolo de redução');
      return makeClass('Muito Alto', 'very_high', ref, 'Percentual de gordura muito elevado');
    } else if (safeAge < 40) {
      if (bodyFatPct < 7) return makeClass('Atleta / Muito Baixo', 'low', ref);
      if (bodyFatPct <= 12.9) return makeClass('Excelente', 'excellent', ref);
      if (bodyFatPct <= 16.9) return makeClass('Bom', 'good', ref);
      if (bodyFatPct <= 19.9) return makeClass('Na Média', 'average', ref);
      if (bodyFatPct <= 23.9) return makeClass('Acima da Média', 'above_average', ref);
      if (bodyFatPct <= 26.9) return makeClass('Alto', 'high', ref);
      return makeClass('Muito Alto', 'very_high', ref);
    } else if (safeAge < 50) {
      if (bodyFatPct < 8) return makeClass('Atleta / Muito Baixo', 'low', ref);
      if (bodyFatPct <= 14.9) return makeClass('Excelente', 'excellent', ref);
      if (bodyFatPct <= 18.9) return makeClass('Bom', 'good', ref);
      if (bodyFatPct <= 21.9) return makeClass('Na Média', 'average', ref);
      if (bodyFatPct <= 25.9) return makeClass('Acima da Média', 'above_average', ref);
      if (bodyFatPct <= 28.9) return makeClass('Alto', 'high', ref);
      return makeClass('Muito Alto', 'very_high', ref);
    } else if (safeAge < 60) {
      if (bodyFatPct < 9) return makeClass('Atleta / Muito Baixo', 'low', ref);
      if (bodyFatPct <= 16.9) return makeClass('Excelente', 'excellent', ref);
      if (bodyFatPct <= 20.9) return makeClass('Bom', 'good', ref);
      if (bodyFatPct <= 23.9) return makeClass('Na Média', 'average', ref);
      if (bodyFatPct <= 27.9) return makeClass('Acima da Média', 'above_average', ref);
      if (bodyFatPct <= 30.9) return makeClass('Alto', 'high', ref);
      return makeClass('Muito Alto', 'very_high', ref);
    } else {
      if (bodyFatPct < 10) return makeClass('Atleta / Muito Baixo', 'low', ref);
      if (bodyFatPct <= 18.9) return makeClass('Excelente', 'excellent', ref);
      if (bodyFatPct <= 22.9) return makeClass('Bom', 'good', ref);
      if (bodyFatPct <= 25.9) return makeClass('Na Média', 'average', ref);
      if (bodyFatPct <= 29.9) return makeClass('Acima da Média', 'above_average', ref);
      if (bodyFatPct <= 32.9) return makeClass('Alto', 'high', ref);
      return makeClass('Muito Alto', 'very_high', ref);
    }
  }

  // Tabela Feminina (Pollock & Wilmore / ACSM)
  const ref = `Pollock & Wilmore / ACSM (Mulheres ${getAgeBracketLabel(safeAge)})`;

  if (safeAge < 30) {
    if (bodyFatPct < 12) return makeClass('Atleta / Muito Baixo', 'low', ref, 'Abaixo dos limites essenciais para mulheres');
    if (bodyFatPct <= 16.9) return makeClass('Excelente', 'excellent', ref, 'Nível atlético de alta definição');
    if (bodyFatPct <= 20.9) return makeClass('Bom', 'good', ref, 'Excelente composição corporal e aptidão física');
    if (bodyFatPct <= 23.9) return makeClass('Na Média', 'average', ref, 'Faixa média saudável da população');
    if (bodyFatPct <= 27.9) return makeClass('Acima da Média', 'above_average', ref, 'Levemente acima do percentual recomendado');
    if (bodyFatPct <= 31.9) return makeClass('Alto', 'high', ref, 'Percentual elevado');
    return makeClass('Muito Alto', 'very_high', ref);
  } else if (safeAge < 40) {
    if (bodyFatPct < 13) return makeClass('Atleta / Muito Baixo', 'low', ref);
    if (bodyFatPct <= 18.9) return makeClass('Excelente', 'excellent', ref);
    if (bodyFatPct <= 22.9) return makeClass('Bom', 'good', ref);
    if (bodyFatPct <= 25.9) return makeClass('Na Média', 'average', ref);
    if (bodyFatPct <= 29.9) return makeClass('Acima da Média', 'above_average', ref);
    if (bodyFatPct <= 33.9) return makeClass('Alto', 'high', ref);
    return makeClass('Muito Alto', 'very_high', ref);
  } else if (safeAge < 50) {
    if (bodyFatPct < 14) return makeClass('Atleta / Muito Baixo', 'low', ref);
    if (bodyFatPct <= 20.9) return makeClass('Excelente', 'excellent', ref);
    if (bodyFatPct <= 24.9) return makeClass('Bom', 'good', ref);
    if (bodyFatPct <= 27.9) return makeClass('Na Média', 'average', ref);
    if (bodyFatPct <= 31.9) return makeClass('Acima da Média', 'above_average', ref);
    if (bodyFatPct <= 35.9) return makeClass('Alto', 'high', ref);
    return makeClass('Muito Alto', 'very_high', ref);
  } else if (safeAge < 60) {
    if (bodyFatPct < 15) return makeClass('Atleta / Muito Baixo', 'low', ref);
    if (bodyFatPct <= 22.9) return makeClass('Excelente', 'excellent', ref);
    if (bodyFatPct <= 26.9) return makeClass('Bom', 'good', ref);
    if (bodyFatPct <= 29.9) return makeClass('Na Média', 'average', ref);
    if (bodyFatPct <= 33.9) return makeClass('Acima da Média', 'above_average', ref);
    if (bodyFatPct <= 37.9) return makeClass('Alto', 'high', ref);
    return makeClass('Muito Alto', 'very_high', ref);
  } else {
    if (bodyFatPct < 16) return makeClass('Atleta / Muito Baixo', 'low', ref);
    if (bodyFatPct <= 24.9) return makeClass('Excelente', 'excellent', ref);
    if (bodyFatPct <= 28.9) return makeClass('Bom', 'good', ref);
    if (bodyFatPct <= 31.9) return makeClass('Na Média', 'average', ref);
    if (bodyFatPct <= 35.9) return makeClass('Acima da Média', 'above_average', ref);
    if (bodyFatPct <= 39.9) return makeClass('Alto', 'high', ref);
    return makeClass('Muito Alto', 'very_high', ref);
  }
}

/**
 * 2. CLASSIFICAÇÃO DO ÍNDICE DE MASSA CORPORAL (IMC)
 * Referência: Organização Mundial da Saúde (OMS / WHO)
 */
export function getBMIClassification(bmi: number): MetricClassification | null {
  if (bmi <= 0 || !isFinite(bmi)) return null;

  const ref = 'Organização Mundial da Saúde (OMS)';

  if (bmi < 18.5) {
    return makeClass('Abaixo do Peso', 'low', ref, 'IMC < 18,5 kg/m²');
  }
  if (bmi <= 24.9) {
    return makeClass('Peso Normal', 'good', ref, 'IMC 18,5 - 24,9 kg/m²');
  }
  if (bmi <= 29.9) {
    return makeClass('Sobrepeso', 'above_average', ref, 'IMC 25,0 - 29,9 kg/m²');
  }
  if (bmi <= 34.9) {
    return makeClass('Obesidade Grau I', 'high', ref, 'IMC 30,0 - 34,9 kg/m²');
  }
  if (bmi <= 39.9) {
    return makeClass('Obesidade Grau II', 'very_high', ref, 'IMC 35,0 - 39,9 kg/m²');
  }
  return makeClass('Obesidade Grau III (Mórbida)', 'alert', ref, 'IMC ≥ 40,0 kg/m²');
}

/**
 * 3. CLASSIFICAÇÃO DA RELAÇÃO CINTURA-QUADRIL (RCQ)
 * Referência: Bray & Gray (1988) / OMS
 * Estratificado por Sexo e Faixa Etária
 */
export function getWHRClassification(
  whr: number | undefined,
  gender: 'male' | 'female',
  age: number
): MetricClassification | null {
  if (!whr || whr <= 0 || !isFinite(whr)) return null;

  const safeAge = Math.max(18, Math.min(100, age || 25));
  const ref = `Bray & Gray / OMS (${gender === 'male' ? 'Homens' : 'Mulheres'} ${getAgeBracketLabel(safeAge)})`;

  if (gender === 'male') {
    if (safeAge < 30) {
      if (whr < 0.83) return makeClass('Baixo Risco', 'good', ref);
      if (whr <= 0.88) return makeClass('Moderado', 'average', ref);
      if (whr <= 0.94) return makeClass('Alto Risco', 'above_average', ref);
      return makeClass('Muito Alto Risco', 'alert', ref);
    } else if (safeAge < 40) {
      if (whr < 0.84) return makeClass('Baixo Risco', 'good', ref);
      if (whr <= 0.91) return makeClass('Moderado', 'average', ref);
      if (whr <= 0.96) return makeClass('Alto Risco', 'above_average', ref);
      return makeClass('Muito Alto Risco', 'alert', ref);
    } else if (safeAge < 50) {
      if (whr < 0.88) return makeClass('Baixo Risco', 'good', ref);
      if (whr <= 0.95) return makeClass('Moderado', 'average', ref);
      if (whr <= 1.00) return makeClass('Alto Risco', 'above_average', ref);
      return makeClass('Muito Alto Risco', 'alert', ref);
    } else {
      if (whr < 0.90) return makeClass('Baixo Risco', 'good', ref);
      if (whr <= 0.97) return makeClass('Moderado', 'average', ref);
      if (whr <= 1.03) return makeClass('Alto Risco', 'above_average', ref);
      return makeClass('Muito Alto Risco', 'alert', ref);
    }
  } else {
    if (safeAge < 30) {
      if (whr < 0.71) return makeClass('Baixo Risco', 'good', ref);
      if (whr <= 0.77) return makeClass('Moderado', 'average', ref);
      if (whr <= 0.82) return makeClass('Alto Risco', 'above_average', ref);
      return makeClass('Muito Alto Risco', 'alert', ref);
    } else if (safeAge < 40) {
      if (whr < 0.72) return makeClass('Baixo Risco', 'good', ref);
      if (whr <= 0.79) return makeClass('Moderado', 'average', ref);
      if (whr <= 0.84) return makeClass('Alto Risco', 'above_average', ref);
      return makeClass('Muito Alto Risco', 'alert', ref);
    } else if (safeAge < 50) {
      if (whr < 0.73) return makeClass('Baixo Risco', 'good', ref);
      if (whr <= 0.80) return makeClass('Moderado', 'average', ref);
      if (whr <= 0.86) return makeClass('Alto Risco', 'above_average', ref);
      return makeClass('Muito Alto Risco', 'alert', ref);
    } else {
      if (whr < 0.76) return makeClass('Baixo Risco', 'good', ref);
      if (whr <= 0.83) return makeClass('Moderado', 'average', ref);
      if (whr <= 0.88) return makeClass('Alto Risco', 'above_average', ref);
      return makeClass('Muito Alto Risco', 'alert', ref);
    }
  }
}

/**
 * 4. CLASSIFICAÇÃO DA CIRCUNFERÊNCIA ABDOMINAL / CINTURA (Risco Cardiovascular e Metabólico)
 * Referência: International Diabetes Federation (IDF) / OMS
 */
export function getWaistCircumferenceClassification(
  waistCm: number | undefined,
  gender: 'male' | 'female'
): MetricClassification | null {
  if (!waistCm || waistCm <= 0 || !isFinite(waistCm)) return null;

  const ref = `IDF / OMS (${gender === 'male' ? 'Homens' : 'Mulheres'})`;

  if (gender === 'male') {
    if (waistCm < 94) {
      return makeClass('Normal / Baixo Risco', 'good', ref, '< 94 cm');
    }
    if (waistCm <= 102) {
      return makeClass('Risco Aumentado', 'above_average', ref, '94 a 102 cm');
    }
    return makeClass('Risco Substancialmente Aumentado', 'alert', ref, '> 102 cm');
  } else {
    if (waistCm < 80) {
      return makeClass('Normal / Baixo Risco', 'good', ref, '< 80 cm');
    }
    if (waistCm <= 88) {
      return makeClass('Risco Aumentado', 'above_average', ref, '80 a 88 cm');
    }
    return makeClass('Risco Substancialmente Aumentado', 'alert', ref, '> 88 cm');
  }
}

// ----------------------------------------------------------------------------
// Helper internal functions
// ----------------------------------------------------------------------------

function getAgeBracketLabel(age: number): string {
  if (age < 30) return '18-29 anos';
  if (age < 40) return '30-39 anos';
  if (age < 50) return '40-49 anos';
  if (age < 60) return '50-59 anos';
  return '60+ anos';
}

function makeClass(
  label: string,
  category: MetricClassification['category'],
  referenceSource: string,
  description?: string
): MetricClassification {
  // Styles are accessible and distinct from TFIVE Brand Red (#374151)
  let badgeStyle = {
    bg: 'bg-zinc-800',
    text: 'text-zinc-200',
    border: 'border-zinc-700'
  };

  switch (category) {
    case 'excellent':
      badgeStyle = {
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30'
      };
      break;
    case 'good':
      badgeStyle = {
        bg: 'bg-teal-500/15',
        text: 'text-teal-300',
        border: 'border-teal-500/30'
      };
      break;
    case 'average':
    case 'normal':
      badgeStyle = {
        bg: 'bg-sky-500/15',
        text: 'text-sky-300',
        border: 'border-sky-500/30'
      };
      break;
    case 'above_average':
      badgeStyle = {
        bg: 'bg-amber-500/15',
        text: 'text-amber-300',
        border: 'border-amber-500/30'
      };
      break;
    case 'high':
    case 'very_high':
      badgeStyle = {
        bg: 'bg-orange-500/15',
        text: 'text-orange-300',
        border: 'border-orange-500/30'
      };
      break;
    case 'alert':
      badgeStyle = {
        bg: 'bg-rose-500/15',
        text: 'text-rose-300',
        border: 'border-rose-500/30'
      };
      break;
    case 'low':
      badgeStyle = {
        bg: 'bg-indigo-500/15',
        text: 'text-indigo-300',
        border: 'border-indigo-500/30'
      };
      break;
  }

  return {
    label,
    category,
    referenceSource,
    badgeStyle,
    description
  };
}
