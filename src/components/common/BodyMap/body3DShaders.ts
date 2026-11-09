import { BodyRegionId, MuscleIntensity } from './bodyMapTypes';

export interface BodyRegionStyleAttrs {
  fill: string;
  stroke: string;
  strokeWidth: number;
  filter?: string;
}

/**
 * Retorna atributos vetoriais consistentes para renderização do Muscle Heatmap do TFIVE PRO
 * Base grafite escuro profissional no repouso, cinza médio no secundário e grafite profundo / branco no primário.
 */
export function get3DRegionAttrs(
  prefix: string,
  regionId: BodyRegionId,
  intensity: MuscleIntensity,
  side: 'front' | 'back' = 'front',
  subPart?: string
): BodyRegionStyleAttrs {
  if (intensity === 'primary') {
    return {
      fill: '#FFFFFF',
      stroke: '#E4E4E7',
      strokeWidth: 1.2,
      filter: `url(#${prefix}-glow-primary)`
    };
  }

  if (intensity === 'secondary') {
    return {
      fill: '#71717A',
      stroke: '#A1A1AA',
      strokeWidth: 0.95,
      filter: `url(#${prefix}-depth-secondary)`
    };
  }

  // Base em Repouso: Grafite Profissional com contorno suave
  return {
    fill: '#202026',
    stroke: '#3B3B48',
    strokeWidth: 0.75
  };
}

/**
 * Retorna as definições SVG com filtros de glow sutil para músculos ativos
 */
export function generate3DDefsMarkup(prefix: string, accentColor = '#FFFFFF'): string {
  return `
    <defs>
      <!-- Glow para Músculos Primários Ativos -->
      <filter id="${prefix}-glow-primary" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="${accentColor}" flood-opacity="0.35" />
      </filter>

      <!-- Profundidade para Músculos Secundários -->
      <filter id="${prefix}-depth-secondary" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#71717A" flood-opacity="0.3" />
      </filter>

      <!-- Sombra geral da silhueta para contraste em fotos claras/escuras -->
      <filter id="${prefix}-silhouette-shadow" x="-15%" y="-10%" width="130%" height="125%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.45" />
      </filter>
    </defs>
  `;
}
