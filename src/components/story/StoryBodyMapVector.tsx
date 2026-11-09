import React, { useMemo } from 'react';
import { BodyRegionId, MuscleIntensity } from '../common/BodyMap/bodyMapTypes';
import { WorkoutSession, WorkoutSetRecord, Exercise } from '../../types';
import { 
  processWorkoutMuscles, 
  ExerciseMuscleInput, 
  MonochromeBodyTheme, 
  MonochromeStyleAttrs 
} from '../../utils/dynamicMuscleMapping';

export interface StoryBodyMapVectorProps {
  intensities?: Partial<Record<BodyRegionId, MuscleIntensity>>;
  session?: WorkoutSession | null;
  exercises?: ExerciseMuscleInput[] | Exercise[];
  sets?: WorkoutSetRecord[];
  exerciseBank?: Exercise[];
  theme?: MonochromeBodyTheme;
  className?: string;
  showLabels?: boolean;
  view?: 'both' | 'front' | 'back';
}

/**
 * Paleta de Destaque Muscular Exigida pelo TFIVE PRO:
 * - Músculos primários: grafite escuro #3F3F46 (stroke #27272A)
 * - Músculos secundários: cinza médio #A1A1AA (stroke #71717A)
 * - Músculos não trabalhados / Base anatômica: cinza muito claro #E5E5E5 (stroke discreto #D4D4D8)
 * - Zero vermelho, zero cores vibrantes, zero gradientes.
 */
const COLOR_PRIMARY = '#3F3F46';
const STROKE_PRIMARY = '#27272A';

const COLOR_SECONDARY = '#A1A1AA';
const STROKE_SECONDARY = '#71717A';

const COLOR_REST = '#E5E5E5';
const STROKE_REST = '#D4D4D8';

export const StoryBodyMapVector: React.FC<StoryBodyMapVectorProps> = ({
  intensities: directIntensities,
  session,
  exercises,
  sets,
  exerciseBank,
  theme = 'light',
  className = '',
  showLabels = true,
  view = 'both'
}) => {
  // Processa dados de treino via dynamicMuscleMapping se disponíveis
  const processedData = useMemo(() => {
    if (session || exercises || sets) {
      return processWorkoutMuscles({
        session,
        exercises,
        sets,
        exerciseBank
      });
    }
    return null;
  }, [session, exercises, sets, exerciseBank]);

  // Resolução consolidada de intensidades para cada uma das 18 regiões corporais
  const resolvedIntensities = useMemo<Record<BodyRegionId, MuscleIntensity>>(() => {
    if (directIntensities && Object.keys(directIntensities).length > 0) {
      return {
        chest: directIntensities.chest || 'none',
        frontShoulders: directIntensities.frontShoulders || 'none',
        sideShoulders: directIntensities.sideShoulders || 'none',
        rearShoulders: directIntensities.rearShoulders || 'none',
        biceps: directIntensities.biceps || 'none',
        triceps: directIntensities.triceps || 'none',
        forearms: directIntensities.forearms || 'none',
        abs: directIntensities.abs || 'none',
        obliques: directIntensities.obliques || 'none',
        traps: directIntensities.traps || 'none',
        upperBack: directIntensities.upperBack || 'none',
        lats: directIntensities.lats || 'none',
        lowerBack: directIntensities.lowerBack || 'none',
        glutes: directIntensities.glutes || 'none',
        quadriceps: directIntensities.quadriceps || 'none',
        hamstrings: directIntensities.hamstrings || 'none',
        adductors: directIntensities.adductors || 'none',
        calves: directIntensities.calves || 'none'
      };
    }
    if (processedData) {
      return processedData.intensities;
    }
    return {
      chest: 'none',
      frontShoulders: 'none',
      sideShoulders: 'none',
      rearShoulders: 'none',
      biceps: 'none',
      triceps: 'none',
      forearms: 'none',
      abs: 'none',
      obliques: 'none',
      traps: 'none',
      upperBack: 'none',
      lats: 'none',
      lowerBack: 'none',
      glutes: 'none',
      quadriceps: 'none',
      hamstrings: 'none',
      adductors: 'none',
      calves: 'none'
    };
  }, [directIntensities, processedData]);

  // Retorna estilos estritos do TFIVE PRO
  const getRegionStyle = (regionId: BodyRegionId): React.CSSProperties => {
    const intensity = resolvedIntensities[regionId] || 'none';

    if (intensity === 'primary') {
      return {
        fill: COLOR_PRIMARY,
        stroke: STROKE_PRIMARY,
        strokeWidth: 1.2,
        strokeLinejoin: 'round',
        strokeLinecap: 'round'
      };
    }
    if (intensity === 'secondary') {
      return {
        fill: COLOR_SECONDARY,
        stroke: STROKE_SECONDARY,
        strokeWidth: 1.0,
        strokeLinejoin: 'round',
        strokeLinecap: 'round'
      };
    }
    // Não trabalhado / Repouso
    return {
      fill: COLOR_REST,
      stroke: STROKE_REST,
      strokeWidth: 0.8,
      strokeLinejoin: 'round',
      strokeLinecap: 'round'
    };
  };

  // Estilo para partes neutras / articulações anatômicas (cabeça, punhos, patelas, pés)
  const neutralPartStyle: React.CSSProperties = {
    fill: COLOR_REST,
    stroke: STROKE_REST,
    strokeWidth: 0.8,
    strokeLinejoin: 'round',
    strokeLinecap: 'round'
  };

  // Linhas de sulco anatômico interno (linha alba, esterno, coluna vertebral)
  const internalGrooveStyle: React.CSSProperties = {
    fill: 'none',
    stroke: 'rgba(0, 0, 0, 0.16)',
    strokeWidth: 0.9,
    strokeLinecap: 'round'
  };

  return (
    <div className={`flex items-center justify-center gap-10 sm:gap-16 w-full select-none ${className}`}>
      {/* ==================================================================== */}
      {/* VISTA ANATÔMICA FRONTAL                                              */}
      {/* Proporções atléticas naturais com contornos musculares fluidos       */}
      {/* ==================================================================== */}
      {(view === 'both' || view === 'front') && (
        <div className="flex flex-col items-center flex-1 max-w-[340px]">
          {showLabels && (
            <span className="text-xs font-mono-nums font-black uppercase tracking-[0.3em] text-zinc-400 mb-3 block">
              FRENTE
            </span>
          )}

          <svg
            viewBox="0 0 260 580"
            className="w-full h-auto drop-shadow-sm select-none"
            aria-label="Mapa Muscular Anatômico - Vista Frontal"
          >
            {/* Silhueta Anatômica Contínua de Fundo (Garante unidade corporal perfeita) */}
            <path
              d="
                M 130,22
                C 142,22 152,32 152,48
                C 152,64 144,78 138,84
                C 146,88 164,98 184,126
                C 202,148 204,168 196,178
                C 190,192 198,228 194,242
                C 206,276 198,328 196,336
                C 208,350 206,378 200,392
                C 194,374 186,346 186,338
                C 182,310 178,258 178,242
                C 174,212 170,188 168,180
                C 164,210 166,252 166,290
                C 178,336 176,388 172,426
                C 168,432 172,434 172,438
                C 184,472 176,520 170,540
                C 184,554 182,564 174,565
                C 162,564 154,552 155,540
                C 144,484 148,444 146,428
                C 136,368 140,332 130,320
                C 120,332 124,368 114,428
                C 112,444 116,484 105,540
                C 106,552 98,564 86,565
                C 78,564 76,554 90,540
                C 84,520 76,472 88,438
                C 88,434 92,432 88,426
                C 84,388 82,336 94,290
                C 94,252 96,210 92,180
                C 90,188 86,212 82,242
                C 82,258 78,310 74,338
                C 74,346 66,374 60,392
                C 54,378 52,350 64,336
                C 62,328 54,276 66,242
                C 62,228 70,192 64,178
                C 56,168 58,148 76,126
                C 96,98 114,88 122,84
                C 116,78 108,64 108,48
                C 108,32 118,22 130,22 Z
              "
              style={neutralPartStyle}
            />

            {/* CABEÇA E MANDÍBULA ATLÉTICA */}
            <g id="front-head-jaw">
              <path
                d="M 130,22 C 142,22 152,32 152,48 C 152,66 144,78 138,84 C 134,87 126,87 122,84 C 116,78 108,66 108,48 C 108,32 118,22 130,22 Z"
                style={neutralPartStyle}
              />
              {/* Pescoço central */}
              <path
                d="M 122,84 L 138,84 L 140,114 C 134,117 126,117 120,114 Z"
                style={neutralPartStyle}
              />
            </g>

            {/* TRAPÉZIO ANTERIOR */}
            <g id="front-traps">
              {/* Trapézio Esquerdo */}
              <path
                d="M 120,86 C 112,92 98,102 78,126 L 98,128 C 110,122 118,118 120,114 Z"
                style={getRegionStyle('traps')}
              />
              {/* Trapézio Direito */}
              <path
                d="M 140,86 C 148,92 162,102 182,126 L 162,128 C 150,122 142,118 140,114 Z"
                style={getRegionStyle('traps')}
              />
            </g>

            {/* DELTOIDE ANTERIOR (Front Shoulders) */}
            <g id="front-shoulders">
              {/* Ombro Anterior Esquerdo */}
              <path
                d="M 78,126 C 70,130 63,142 64,158 C 65,168 70,175 78,176 L 86,156 L 96,128 Z"
                style={getRegionStyle('frontShoulders')}
              />
              {/* Ombro Anterior Direito */}
              <path
                d="M 182,126 C 190,130 197,142 196,158 C 195,168 190,175 182,176 L 174,156 L 164,128 Z"
                style={getRegionStyle('frontShoulders')}
              />
            </g>

            {/* DELTOIDE LATERAL (Side Shoulders - Frente) */}
            <g id="side-shoulders-front">
              {/* Deltoide Lateral Esquerdo */}
              <path
                d="M 76,126 C 62,142 60,158 64,174 C 67,176 72,176 74,170 L 66,150 Z"
                style={getRegionStyle('sideShoulders')}
              />
              {/* Deltoide Lateral Direito */}
              <path
                d="M 184,126 C 198,142 200,158 196,174 C 193,176 188,176 186,170 L 194,150 Z"
                style={getRegionStyle('sideShoulders')}
              />
            </g>

            {/* PEITORAL MAIOR (Chest) */}
            <g id="chest">
              {/* Peitoral Esquerdo */}
              <path
                d="M 98,128 L 128,128 L 128,190 C 114,194 98,190 92,178 C 88,162 94,136 98,128 Z"
                style={getRegionStyle('chest')}
              />
              {/* Peitoral Direito */}
              <path
                d="M 162,128 L 132,128 L 132,190 C 146,194 162,190 168,178 C 172,162 166,136 162,128 Z"
                style={getRegionStyle('chest')}
              />
              {/* Linha Divisória Esternal */}
              <path d="M 130,128 L 130,190" style={internalGrooveStyle} />
            </g>

            {/* BÍCEPS BRAQUIAL (Biceps) */}
            <g id="biceps">
              {/* Bíceps Esquerdo */}
              <path
                d="M 68,176 C 62,188 62,212 68,234 C 74,236 80,230 82,218 C 84,202 80,182 68,176 Z"
                style={getRegionStyle('biceps')}
              />
              {/* Bíceps Direito */}
              <path
                d="M 192,176 C 198,188 198,212 192,234 C 186,236 180,230 178,218 C 176,202 180,182 192,176 Z"
                style={getRegionStyle('biceps')}
              />
            </g>

            {/* ANTEBRAÇOS (Forearms - Flexores / Braquiorradial) */}
            <g id="forearms-front">
              {/* Antebraço Esquerdo */}
              <path
                d="M 66,242 C 58,262 50,296 46,326 C 45,332 50,336 54,332 C 64,306 74,272 80,248 Z"
                style={getRegionStyle('forearms')}
              />
              {/* Antebraço Direito */}
              <path
                d="M 194,242 C 202,262 210,296 214,326 C 215,332 210,336 206,332 C 196,306 186,272 180,248 Z"
                style={getRegionStyle('forearms')}
              />
            </g>

            {/* MÃOS (Hands Base) */}
            <g id="front-hands">
              {/* Mão Esquerda */}
              <path
                d="M 45,334 C 40,344 42,364 48,368 C 53,366 56,352 54,338 Z"
                style={neutralPartStyle}
              />
              {/* Mão Direita */}
              <path
                d="M 215,334 C 220,344 218,364 212,368 C 207,366 204,352 206,338 Z"
                style={neutralPartStyle}
              />
            </g>

            {/* RETO ABDOMINAL (Abs) */}
            <g id="abs">
              {/* Abdômen Superior Esquerdo */}
              <path d="M 112,196 L 128,196 L 128,220 L 110,220 C 109,208 110,200 112,196 Z" style={getRegionStyle('abs')} />
              {/* Abdômen Superior Direito */}
              <path d="M 148,196 L 132,196 L 132,220 L 150,220 C 151,208 150,200 148,196 Z" style={getRegionStyle('abs')} />

              {/* Abdômen Médio Esquerdo */}
              <path d="M 110,223 L 128,223 L 128,250 L 108,250 Z" style={getRegionStyle('abs')} />
              {/* Abdômen Médio Direito */}
              <path d="M 150,223 L 132,223 L 132,250 L 152,250 Z" style={getRegionStyle('abs')} />

              {/* Abdômen Inferior Esquerdo */}
              <path d="M 108,253 L 128,253 L 128,284 C 118,280 112,270 108,253 Z" style={getRegionStyle('abs')} />
              {/* Abdômen Inferior Direito */}
              <path d="M 152,253 L 132,253 L 132,284 C 142,280 148,270 152,253 Z" style={getRegionStyle('abs')} />

              {/* Linha Alba e Sulcos Transversais */}
              <path d="M 130,194 L 130,286" style={internalGrooveStyle} />
              <path d="M 110,221 L 150,221" style={internalGrooveStyle} />
              <path d="M 108,251 L 152,251" style={internalGrooveStyle} />
            </g>

            {/* OBLÍQUOS (Obliques) */}
            <g id="obliques">
              {/* Oblíquo Esquerdo */}
              <path
                d="M 92,196 C 96,192 105,192 106,198 L 106,270 C 96,276 90,262 86,240 C 85,218 87,202 92,196 Z"
                style={getRegionStyle('obliques')}
              />
              {/* Oblíquo Direito */}
              <path
                d="M 168,196 C 164,192 155,192 154,198 L 154,270 C 164,276 170,262 174,240 C 175,218 173,202 168,196 Z"
                style={getRegionStyle('obliques')}
              />
            </g>

            {/* QUADRÍCEPS (Quadriceps) */}
            <g id="quadriceps">
              {/* Vasto Lateral e Reto Femoral Esquerdo */}
              <path
                d="M 94,292 C 86,320 84,365 92,416 C 98,424 108,424 112,414 C 116,380 116,330 112,298 C 104,290 98,290 94,292 Z"
                style={getRegionStyle('quadriceps')}
              />
              {/* Vasto Medial (Gota) Esquerdo */}
              <path
                d="M 112,302 C 114,334 116,378 114,418 C 122,424 128,412 130,388 C 130,354 126,318 120,300 Z"
                style={getRegionStyle('quadriceps')}
              />

              {/* Vasto Lateral e Reto Femoral Direito */}
              <path
                d="M 166,292 C 174,320 176,365 168,416 C 162,424 152,424 148,414 C 144,380 144,330 148,298 C 156,290 162,290 166,292 Z"
                style={getRegionStyle('quadriceps')}
              />
              {/* Vasto Medial (Gota) Direito */}
              <path
                d="M 148,302 C 146,334 144,378 146,418 C 138,424 132,412 130,388 C 130,354 134,318 140,300 Z"
                style={getRegionStyle('quadriceps')}
              />
            </g>

            {/* ADUTORES (Adductors) */}
            <g id="adductors">
              {/* Adutor Esquerdo */}
              <path
                d="M 120,308 C 124,326 124,358 120,378 C 116,364 115,334 117,308 Z"
                style={getRegionStyle('adductors')}
              />
              {/* Adutor Direito */}
              <path
                d="M 140,308 C 136,326 136,358 140,378 C 144,364 145,334 143,308 Z"
                style={getRegionStyle('adductors')}
              />
            </g>

            {/* JOELHOS (Patelas Base) */}
            <g id="front-knees">
              <path d="M 94,424 C 94,418 106,418 106,424 C 106,432 94,432 94,424 Z" style={neutralPartStyle} />
              <path d="M 154,424 C 154,418 166,418 166,424 C 166,432 154,432 154,424 Z" style={neutralPartStyle} />
            </g>

            {/* PANTURRILHAS FRONTAIS (Calves / Tibiais) */}
            <g id="calves-front">
              {/* Panturrilha Esquerda */}
              <path
                d="M 94,438 C 82,456 80,500 88,536 C 92,542 100,542 104,534 C 108,500 110,466 110,438 C 102,434 96,434 94,438 Z"
                style={getRegionStyle('calves')}
              />
              {/* Panturrilha Direita */}
              <path
                d="M 166,438 C 178,456 180,500 172,536 C 168,542 160,542 156,534 C 152,500 150,466 150,438 C 158,434 164,434 166,438 Z"
                style={getRegionStyle('calves')}
              />
            </g>

            {/* PÉS FRONTAIS (Feet Base) */}
            <g id="front-feet">
              <path d="M 88,542 C 88,558 72,564 62,564 C 54,564 54,548 70,542 Z" style={neutralPartStyle} />
              <path d="M 172,542 C 172,558 188,564 198,564 C 206,564 206,548 190,542 Z" style={neutralPartStyle} />
            </g>
          </svg>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VISTA ANATÔMICA POSTERIOR (COSTAS)                                   */}
      {/* Trapézio dorsal em losango, asas dorsais, glúteos e isquiotibiais     */}
      {/* ==================================================================== */}
      {(view === 'both' || view === 'back') && (
        <div className="flex flex-col items-center flex-1 max-w-[340px]">
          {showLabels && (
            <span className="text-xs font-mono-nums font-black uppercase tracking-[0.3em] text-zinc-400 mb-3 block">
              COSTAS
            </span>
          )}

          <svg
            viewBox="0 0 260 580"
            className="w-full h-auto drop-shadow-sm select-none"
            aria-label="Mapa Muscular Anatômico - Vista Posterior"
          >
            {/* Silhueta Anatômica Contínua de Fundo Posterior */}
            <path
              d="
                M 130,22
                C 142,22 152,32 152,48
                C 152,64 144,78 138,84
                C 146,88 164,98 184,126
                C 202,148 204,168 196,178
                C 190,192 198,228 194,242
                C 206,276 198,328 196,336
                C 208,350 206,378 200,392
                C 194,374 186,346 186,338
                C 182,310 178,258 178,242
                C 174,212 170,188 168,180
                C 164,210 166,252 166,290
                C 178,336 176,388 172,426
                C 168,432 172,434 172,438
                C 184,472 176,520 170,540
                C 184,554 182,564 174,565
                C 162,564 154,552 155,540
                C 144,484 148,444 146,428
                C 136,368 140,332 130,320
                C 120,332 124,368 114,428
                C 112,444 116,484 105,540
                C 106,552 98,564 86,565
                C 78,564 76,554 90,540
                C 84,520 76,472 88,438
                C 88,434 92,432 88,426
                C 84,388 82,336 94,290
                C 94,252 96,210 92,180
                C 90,188 86,212 82,242
                C 82,258 78,310 74,338
                C 74,346 66,374 60,392
                C 54,378 52,350 64,336
                C 62,328 54,276 66,242
                C 62,228 70,192 64,178
                C 56,168 58,148 76,126
                C 96,98 114,88 122,84
                C 116,78 108,64 108,48
                C 108,32 118,22 130,22 Z
              "
              style={neutralPartStyle}
            />

            {/* CRÂNIO E NUCA POSTERIOR */}
            <g id="back-head-nape">
              <path
                d="M 130,22 C 142,22 152,32 152,48 C 152,66 144,78 138,84 C 134,87 126,87 122,84 C 116,78 108,66 108,48 C 108,32 118,22 130,22 Z"
                style={neutralPartStyle}
              />
              <path d="M 122,84 L 138,84 L 140,108 L 120,108 Z" style={neutralPartStyle} />
            </g>

            {/* TRAPÉZIO POSTERIOR (Dorsal Trapezius - Losango Completo) */}
            <g id="back-traps">
              <path
                d="M 130,84 L 84,124 L 104,180 L 130,206 L 156,180 L 176,124 Z"
                style={getRegionStyle('traps')}
              />
              {/* Linha da Coluna Cervicotorácica */}
              <path d="M 130,84 L 130,206" style={internalGrooveStyle} />
            </g>

            {/* DELTOIDE POSTERIOR (Rear Shoulders) */}
            <g id="rear-shoulders">
              {/* Ombro Posterior Esquerdo */}
              <path
                d="M 84,124 C 72,126 62,138 64,154 C 65,164 72,174 82,178 L 92,156 L 98,126 Z"
                style={getRegionStyle('rearShoulders')}
              />
              {/* Ombro Posterior Direito */}
              <path
                d="M 176,124 C 188,126 198,138 196,154 C 195,164 188,174 178,178 L 168,156 L 162,126 Z"
                style={getRegionStyle('rearShoulders')}
              />
            </g>

            {/* DELTOIDE LATERAL (Side Shoulders - Costas) */}
            <g id="side-shoulders-back">
              {/* Lateral Esquerdo */}
              <path
                d="M 64,148 C 58,156 58,168 62,178 C 65,182 70,182 74,174 L 66,158 Z"
                style={getRegionStyle('sideShoulders')}
              />
              {/* Lateral Direito */}
              <path
                d="M 196,148 C 202,156 202,168 198,178 C 195,182 190,182 186,174 L 194,158 Z"
                style={getRegionStyle('sideShoulders')}
              />
            </g>

            {/* COSTAS SUPERIORES (Upper Back / Rombóides / Escápulas) */}
            <g id="upper-back">
              {/* Escápula / Rombóide Esquerdo */}
              <path
                d="M 104,176 L 82,166 C 74,170 72,182 74,200 C 84,206 96,204 104,198 Z"
                style={getRegionStyle('upperBack')}
              />
              {/* Escápula / Rombóide Direito */}
              <path
                d="M 156,176 L 178,166 C 186,170 188,182 186,200 C 176,206 164,204 156,198 Z"
                style={getRegionStyle('upperBack')}
              />
            </g>

            {/* GRANDE DORSAL (Lats - Asas Dorsais Atléticas) */}
            <g id="lats">
              {/* Grande Dorsal Esquerdo */}
              <path
                d="M 74,202 C 72,224 76,252 86,276 C 92,278 100,276 106,270 L 106,204 C 92,208 82,208 74,202 Z"
                style={getRegionStyle('lats')}
              />
              {/* Grande Dorsal Direito */}
              <path
                d="M 186,202 C 188,224 184,252 174,276 C 168,278 160,276 154,270 L 154,204 C 168,208 178,208 186,202 Z"
                style={getRegionStyle('lats')}
              />
            </g>

            {/* TRÍCEPS BRAQUIAL (Triceps) */}
            <g id="triceps">
              {/* Tríceps Esquerdo */}
              <path
                d="M 68,178 C 60,192 58,220 64,242 C 70,244 78,236 80,222 C 82,204 78,184 68,178 Z"
                style={getRegionStyle('triceps')}
              />
              {/* Tríceps Direito */}
              <path
                d="M 192,178 C 200,192 202,220 196,242 C 190,244 182,236 180,222 C 178,204 182,184 192,178 Z"
                style={getRegionStyle('triceps')}
              />
            </g>

            {/* ANTEBRAÇOS POSTERIORES (Forearms - Extensores) */}
            <g id="forearms-back">
              {/* Antebraço Esquerdo */}
              <path
                d="M 64,244 C 56,264 48,298 44,328 C 43,334 48,338 52,334 C 62,308 72,274 78,250 Z"
                style={getRegionStyle('forearms')}
              />
              {/* Antebraço Direito */}
              <path
                d="M 196,244 C 204,264 212,298 216,328 C 217,334 212,338 208,334 C 198,308 188,274 182,250 Z"
                style={getRegionStyle('forearms')}
              />
            </g>

            {/* MÃOS POSTERIORES (Hands Base) */}
            <g id="back-hands">
              <path d="M 43,336 C 38,346 40,366 46,370 C 51,368 54,354 52,340 Z" style={neutralPartStyle} />
              <path d="M 217,336 C 222,346 220,366 214,370 C 209,368 206,354 208,340 Z" style={neutralPartStyle} />
            </g>

            {/* LOMBAR / ERETORES DA ESPINHA (Lower Back) */}
            <g id="lower-back">
              <path d="M 106,206 L 106,278 C 112,282 120,284 126,284 L 126,206 Z" style={getRegionStyle('lowerBack')} />
              <path d="M 154,206 L 154,278 C 148,282 140,284 134,284 L 134,206 Z" style={getRegionStyle('lowerBack')} />
              <path d="M 130,206 L 130,284" style={internalGrooveStyle} />
            </g>

            {/* GLÚTEOS (Glutes) */}
            <g id="glutes">
              {/* Glúteo Esquerdo */}
              <path
                d="M 86,282 C 78,308 82,348 98,362 C 112,364 126,356 130,332 L 130,284 C 114,280 98,278 86,282 Z"
                style={getRegionStyle('glutes')}
              />
              {/* Glúteo Direito */}
              <path
                d="M 174,282 C 182,308 178,348 162,362 C 148,364 134,356 130,332 L 130,284 C 146,280 162,278 174,282 Z"
                style={getRegionStyle('glutes')}
              />
              {/* Sulco Interglúteo */}
              <path d="M 130,284 L 130,350" style={internalGrooveStyle} />
            </g>

            {/* ISQUIOTIBIAIS (Hamstrings - Posterior de Coxa) */}
            <g id="hamstrings">
              {/* Isquiotibial Esquerdo */}
              <path
                d="M 94,366 C 86,396 86,432 92,454 C 100,458 112,458 118,450 C 122,422 124,390 124,362 C 114,364 104,366 94,366 Z"
                style={getRegionStyle('hamstrings')}
              />
              {/* Isquiotibial Direito */}
              <path
                d="M 166,366 C 174,396 174,432 168,454 C 160,458 148,458 142,450 C 138,422 136,390 136,362 C 146,364 156,366 166,366 Z"
                style={getRegionStyle('hamstrings')}
              />
            </g>

            {/* FOSSA POPLÍTEA (Knees Posterior Base) */}
            <g id="back-knees">
              <path d="M 96,448 C 96,442 108,442 108,448 C 108,456 96,456 96,448 Z" style={neutralPartStyle} />
              <path d="M 152,448 C 152,442 164,442 164,448 C 164,456 152,456 152,448 Z" style={neutralPartStyle} />
            </g>

            {/* PANTURRILHAS POSTERIORES (Calves - Gastrocnêmio e Sóleo) */}
            <g id="calves-back">
              {/* Panturrilha Posterior Esquerda */}
              <path
                d="M 92,460 C 80,480 78,522 86,554 C 92,562 100,562 104,550 C 108,520 110,486 110,460 C 102,456 96,456 92,460 Z"
                style={getRegionStyle('calves')}
              />
              {/* Panturrilha Posterior Direita */}
              <path
                d="M 168,460 C 180,480 182,522 174,554 C 168,562 160,562 156,550 C 152,520 150,486 150,460 C 158,456 164,456 168,460 Z"
                style={getRegionStyle('calves')}
              />
            </g>

            {/* CALCANHARES E PÉS POSTERIORES (Feet Base) */}
            <g id="back-feet">
              <path d="M 88,552 C 88,566 74,570 64,570 C 56,570 56,556 72,552 Z" style={neutralPartStyle} />
              <path d="M 172,552 C 172,566 186,570 196,570 C 204,570 204,556 188,552 Z" style={neutralPartStyle} />
            </g>
          </svg>
        </div>
      )}
    </div>
  );
};

// Aliases para compatibilidade total
export const WorkoutBodyMap = StoryBodyMapVector;
export default StoryBodyMapVector;
