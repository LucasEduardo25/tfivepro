import React, { useState } from 'react';
import { BodyRegionId, MuscleIntensity, BODY_REGIONS } from '../common/BodyMap/bodyMapTypes';

export interface BodyMapDemoPreviewProps {
  initialIntensities?: Partial<Record<BodyRegionId, MuscleIntensity>>;
  className?: string;
}

/**
 * Cores Monocromáticas de Destaque TFIVE PRO:
 * - Primário: #3F3F46 (borda #27272A)
 * - Secundário: #A1A1AA (borda #71717A)
 * - Repouso: #E5E5E5 (borda #D4D4D8)
 */
const COLOR_PRIMARY = '#3F3F46';
const STROKE_PRIMARY = '#27272A';

const COLOR_SECONDARY = '#A1A1AA';
const STROKE_SECONDARY = '#71717A';

const COLOR_REST = '#E5E5E5';
const STROKE_REST = '#D4D4D8';

export const BodyMapDemoPreview: React.FC<BodyMapDemoPreviewProps> = ({
  initialIntensities,
  className = ''
}) => {
  // Estado de exemplo demonstrando os 3 níveis simultaneamente
  const [intensities, setIntensities] = useState<Record<BodyRegionId, MuscleIntensity>>({
    chest: 'primary',
    quadriceps: 'primary',
    lats: 'primary',
    frontShoulders: 'secondary',
    biceps: 'secondary',
    triceps: 'secondary',
    calves: 'secondary',
    sideShoulders: 'none',
    rearShoulders: 'none',
    forearms: 'none',
    abs: 'none',
    obliques: 'none',
    traps: 'none',
    upperBack: 'none',
    lowerBack: 'none',
    glutes: 'none',
    hamstrings: 'none',
    adductors: 'none',
    ...initialIntensities
  });

  const getStyle = (regionId: BodyRegionId): React.CSSProperties => {
    const intensity = intensities[regionId] || 'none';
    if (intensity === 'primary') {
      return { fill: COLOR_PRIMARY, stroke: STROKE_PRIMARY, strokeWidth: 1.2 };
    }
    if (intensity === 'secondary') {
      return { fill: COLOR_SECONDARY, stroke: STROKE_SECONDARY, strokeWidth: 1.0 };
    }
    return { fill: COLOR_REST, stroke: STROKE_REST, strokeWidth: 0.8 };
  };

  const neutralStyle: React.CSSProperties = {
    fill: COLOR_REST,
    stroke: STROKE_REST,
    strokeWidth: 0.8
  };

  const grooveStyle: React.CSSProperties = {
    fill: 'none',
    stroke: 'rgba(0,0,0,0.18)',
    strokeWidth: 0.8,
    strokeLinecap: 'round'
  };

  return (
    <div className={`w-full max-w-4xl mx-auto p-6 flex flex-col items-center gap-6 select-none bg-transparent ${className}`}>
      {/* Barra de Status e Legenda do Demo */}
      <div className="w-full flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/90 text-white border border-zinc-800 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-display font-black tracking-widest text-sm uppercase">
            Demonstração Isolada • Body Map
          </span>
        </div>
        <div className="flex items-center gap-5 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-xs" style={{ backgroundColor: COLOR_PRIMARY, borderColor: STROKE_PRIMARY, borderWidth: 1 }} />
            <span className="font-bold">Primário (#3F3F46)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-xs" style={{ backgroundColor: COLOR_SECONDARY, borderColor: STROKE_SECONDARY, borderWidth: 1 }} />
            <span className="font-bold">Secundário (#A1A1AA)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-xs" style={{ backgroundColor: COLOR_REST, borderColor: STROKE_REST, borderWidth: 1 }} />
            <span className="font-bold text-zinc-400">Inativo (#E5E5E5)</span>
          </div>
        </div>
      </div>

      {/* Grid com Vista Frontal e Posterior em Fundo Transparente */}
      <div className="w-full flex items-center justify-center gap-8 sm:gap-14 py-4 bg-transparent">
        {/* Vista Frontal */}
        <div className="flex flex-col items-center flex-1 max-w-[320px]">
          <span className="text-xs font-mono font-black uppercase tracking-[0.25em] text-zinc-500 mb-2">
            Vista Frontal (Anterior)
          </span>
          <svg viewBox="0 0 280 580" className="w-full h-auto drop-shadow-sm" style={{ background: 'transparent' }}>
            {/* Silhueta Base Neutra / Continuidade */}
            <path
              d="M 140,24 C 151,24 160,34 160,49 C 160,65 152,78 147,84 C 155,88 172,98 191,126 C 208,148 210,168 203,178 C 197,192 205,228 201,242 C 213,276 205,328 203,336 C 215,350 213,378 207,392 C 201,374 193,346 193,338 C 189,310 185,258 185,242 C 181,212 177,188 175,180 C 171,210 173,252 173,290 C 185,336 183,388 179,426 C 175,432 179,434 179,438 C 191,472 183,520 177,540 C 191,554 189,564 181,565 C 169,564 161,552 162,540 C 151,484 155,444 153,428 C 143,368 147,332 140,320 C 133,332 137,368 127,428 C 125,444 129,484 118,540 C 119,552 111,564 99,565 C 91,564 89,554 103,540 C 97,520 89,472 101,438 C 101,434 105,432 101,426 C 97,388 95,336 107,290 C 107,252 109,210 105,180 C 103,188 99,212 95,242 C 95,258 91,310 87,338 C 87,346 79,374 73,392 C 67,378 65,350 77,336 C 75,328 67,276 79,242 C 75,228 83,192 77,178 C 69,168 71,148 89,126 C 108,98 125,88 133,84 C 128,78 120,65 120,49 C 120,34 129,24 140,24 Z"
              style={neutralStyle}
            />

            {/* Cabeça e Pescoço */}
            <g id="demo-head-front">
              <path d="M 140,24 C 151,24 160,34 160,49 C 160,65 152,78 147,84 C 143,87 137,87 133,84 C 128,78 120,65 120,49 C 120,34 129,24 140,24 Z" style={neutralStyle} />
              <path d="M 132,84 L 148,84 L 150,114 C 144,117 136,117 130,114 Z" style={neutralStyle} />
            </g>

            {/* 1. TRAPÉZIO ANTERIOR (traps) */}
            <g id="region-traps-front" data-region="traps">
              <path d="M 130,86 C 122,92 108,102 88,126 L 108,128 C 120,122 128,118 130,114 Z" style={getStyle('traps')} />
              <path d="M 150,86 C 158,92 172,102 192,126 L 172,128 C 160,122 152,118 150,114 Z" style={getStyle('traps')} />
            </g>

            {/* 2. DELTOIDE ANTERIOR (frontShoulders) */}
            <g id="region-frontShoulders" data-region="frontShoulders">
              <path d="M 88,126 C 80,130 73,142 74,158 C 75,168 80,175 88,176 L 96,156 L 106,128 Z" style={getStyle('frontShoulders')} />
              <path d="M 192,126 C 200,130 207,142 206,158 C 205,168 200,175 192,176 L 184,156 L 174,128 Z" style={getStyle('frontShoulders')} />
            </g>

            {/* 3. DELTOIDE LATERAL (sideShoulders) */}
            <g id="region-sideShoulders-front" data-region="sideShoulders">
              <path d="M 86,126 C 72,142 70,158 74,174 C 77,176 82,176 84,170 L 76,150 Z" style={getStyle('sideShoulders')} />
              <path d="M 194,126 C 208,142 210,158 206,174 C 203,176 198,176 196,170 L 204,150 Z" style={getStyle('sideShoulders')} />
            </g>

            {/* 4. PEITORAL MAIOR (chest) */}
            <g id="region-chest" data-region="chest">
              <path d="M 108,128 L 138,128 L 138,190 C 124,194 108,190 102,178 C 98,162 104,136 108,128 Z" style={getStyle('chest')} />
              <path d="M 172,128 L 142,128 L 142,190 C 156,194 172,190 178,178 C 182,162 176,136 172,128 Z" style={getStyle('chest')} />
              <path d="M 140,128 L 140,190" style={grooveStyle} />
            </g>

            {/* 5. BÍCEPS (biceps) */}
            <g id="region-biceps" data-region="biceps">
              <path d="M 78,176 C 72,188 72,212 78,234 C 84,236 90,230 92,218 C 94,202 90,182 78,176 Z" style={getStyle('biceps')} />
              <path d="M 202,176 C 208,188 208,212 202,234 C 196,236 190,230 188,218 C 186,202 190,182 202,176 Z" style={getStyle('biceps')} />
            </g>

            {/* 6. ANTEBRAÇOS (forearms) */}
            <g id="region-forearms-front" data-region="forearms">
              <path d="M 76,242 C 68,262 60,296 56,326 C 55,332 60,336 64,332 C 74,306 84,272 90,248 Z" style={getStyle('forearms')} />
              <path d="M 204,242 C 212,262 220,296 224,326 C 225,332 220,336 216,332 C 206,306 196,272 190,248 Z" style={getStyle('forearms')} />
            </g>

            {/* Punhos e Mãos Frontais */}
            <g id="demo-hands-front">
              <path d="M 55,334 C 50,344 52,364 58,368 C 63,366 66,352 64,338 Z" style={neutralStyle} />
              <path d="M 225,334 C 230,344 228,364 222,368 C 217,366 214,352 216,338 Z" style={neutralStyle} />
            </g>

            {/* 7. ABDÔMEN (abs) */}
            <g id="region-abs" data-region="abs">
              <path d="M 122,196 L 138,196 L 138,220 L 120,220 C 119,208 120,200 122,196 Z" style={getStyle('abs')} />
              <path d="M 158,196 L 142,196 L 142,220 L 160,220 C 161,208 160,200 158,196 Z" style={getStyle('abs')} />
              <path d="M 120,223 L 138,223 L 138,250 L 118,250 Z" style={getStyle('abs')} />
              <path d="M 160,223 L 142,223 L 142,250 L 162,250 Z" style={getStyle('abs')} />
              <path d="M 118,253 L 138,253 L 138,284 C 128,280 122,270 118,253 Z" style={getStyle('abs')} />
              <path d="M 162,253 L 142,253 L 142,284 C 152,280 158,270 162,253 Z" style={getStyle('abs')} />
              <path d="M 140,194 L 140,286" style={grooveStyle} />
              <path d="M 120,221 L 160,221" style={grooveStyle} />
              <path d="M 118,251 L 162,251" style={grooveStyle} />
            </g>

            {/* 8. OBLÍQUOS (obliques) */}
            <g id="region-obliques-front" data-region="obliques">
              <path d="M 102,196 C 106,192 115,192 116,198 L 116,270 C 106,276 100,262 96,240 C 95,218 97,202 102,196 Z" style={getStyle('obliques')} />
              <path d="M 178,196 C 174,192 165,192 164,198 L 164,270 C 174,276 180,262 184,240 C 185,218 183,202 178,196 Z" style={getStyle('obliques')} />
            </g>

            {/* 9. ADUTORES (adductors) */}
            <g id="region-adductors" data-region="adductors">
              <path d="M 130,308 C 134,326 134,358 130,378 C 126,364 125,334 127,308 Z" style={getStyle('adductors')} />
              <path d="M 150,308 C 146,326 146,358 150,378 C 154,364 155,334 153,308 Z" style={getStyle('adductors')} />
            </g>

            {/* 10. QUADRÍCEPS (quadriceps) */}
            <g id="region-quadriceps" data-region="quadriceps">
              <path d="M 104,292 C 96,320 94,365 102,416 C 108,424 118,424 122,414 C 126,380 126,330 122,298 C 114,290 108,290 104,292 Z" style={getStyle('quadriceps')} />
              <path d="M 122,302 C 124,334 126,378 124,418 C 132,424 138,412 140,388 C 140,354 136,318 130,300 Z" style={getStyle('quadriceps')} />
              <path d="M 176,292 C 184,320 186,365 178,416 C 172,424 162,424 158,414 C 154,380 154,330 158,298 C 166,290 172,290 176,292 Z" style={getStyle('quadriceps')} />
              <path d="M 158,302 C 156,334 154,378 156,418 C 148,424 142,412 140,388 C 140,354 144,318 150,300 Z" style={getStyle('quadriceps')} />
            </g>

            {/* Patelas / Joelhos */}
            <g id="demo-knees-front">
              <path d="M 104,424 C 104,418 116,418 116,424 C 116,432 104,432 104,424 Z" style={neutralStyle} />
              <path d="M 164,424 C 164,418 176,418 176,424 C 176,432 164,432 164,424 Z" style={neutralStyle} />
            </g>

            {/* 11. PANTURRILHAS FRONTAIS (calves) */}
            <g id="region-calves-front" data-region="calves">
              <path d="M 104,438 C 92,456 90,500 98,536 C 102,542 110,542 114,534 C 118,500 120,466 120,438 C 112,434 106,434 104,438 Z" style={getStyle('calves')} />
              <path d="M 176,438 C 188,456 190,500 182,536 C 178,542 170,542 166,534 C 162,500 160,466 160,438 C 168,434 174,434 176,438 Z" style={getStyle('calves')} />
            </g>

            {/* Pés Frontais */}
            <g id="demo-feet-front">
              <path d="M 98,542 C 98,558 82,564 72,564 C 64,564 64,548 80,542 Z" style={neutralStyle} />
              <path d="M 182,542 C 182,558 198,564 208,564 C 216,564 216,548 200,542 Z" style={neutralStyle} />
            </g>
          </svg>
        </div>

        {/* Vista Posterior (Costas) */}
        <div className="flex flex-col items-center flex-1 max-w-[320px]">
          <span className="text-xs font-mono font-black uppercase tracking-[0.25em] text-zinc-500 mb-2">
            Vista Posterior (Costas)
          </span>
          <svg viewBox="0 0 280 580" className="w-full h-auto drop-shadow-sm" style={{ background: 'transparent' }}>
            {/* Silhueta Base Neutra / Continuidade */}
            <path
              d="M 140,24 C 151,24 160,34 160,49 C 160,65 152,78 147,84 C 155,88 172,98 191,126 C 208,148 210,168 203,178 C 197,192 205,228 201,242 C 213,276 205,328 203,336 C 215,350 213,378 207,392 C 201,374 193,346 193,338 C 189,310 185,258 185,242 C 181,212 177,188 175,180 C 171,210 173,252 173,290 C 185,336 183,388 179,426 C 175,432 179,434 179,438 C 191,472 183,520 177,540 C 191,554 189,564 181,565 C 169,564 161,552 162,540 C 151,484 155,444 153,428 C 143,368 147,332 140,320 C 133,332 137,368 127,428 C 125,444 129,484 118,540 C 119,552 111,564 99,565 C 91,564 89,554 103,540 C 97,520 89,472 101,438 C 101,434 105,432 101,426 C 97,388 95,336 107,290 C 107,252 109,210 105,180 C 103,188 99,212 95,242 C 95,258 91,310 87,338 C 87,346 79,374 73,392 C 67,378 65,350 77,336 C 75,328 67,276 79,242 C 75,228 83,192 77,178 C 69,168 71,148 89,126 C 108,98 125,88 133,84 C 128,78 120,65 120,49 C 120,34 129,24 140,24 Z"
              style={neutralStyle}
            />

            {/* Cabeça Posterior */}
            <g id="demo-head-back">
              <path d="M 140,24 C 151,24 160,34 160,49 C 160,65 152,78 147,84 C 143,87 137,87 133,84 C 128,78 120,65 120,49 C 120,34 129,24 140,24 Z" style={neutralStyle} />
            </g>

            {/* 12. TRAPÉZIO POSTERIOR (traps) */}
            <g id="region-traps-back" data-region="traps">
              <path d="M 140,84 L 110,108 L 126,168 L 140,188 L 154,168 L 170,108 Z" style={getStyle('traps')} />
              <path d="M 140,84 L 140,188" style={grooveStyle} />
            </g>

            {/* 13. DELTOIDE POSTERIOR (rearShoulders) */}
            <g id="region-rearShoulders" data-region="rearShoulders">
              <path d="M 106,110 C 92,112 80,124 78,138 C 76,150 82,160 92,166 L 102,144 L 110,118 Z" style={getStyle('rearShoulders')} />
              <path d="M 174,110 C 188,112 200,124 202,138 C 204,150 198,160 188,166 L 178,144 L 170,118 Z" style={getStyle('rearShoulders')} />
            </g>

            {/* 14. DORSAL SUPERIOR / ROMBOIDES (upperBack) */}
            <g id="region-upperBack" data-region="upperBack">
              <path d="M 126,162 L 102,154 C 94,158 92,170 94,188 C 104,194 116,192 126,186 Z" style={getStyle('upperBack')} />
              <path d="M 154,162 L 178,154 C 186,158 188,170 186,188 C 176,194 164,192 154,186 Z" style={getStyle('upperBack')} />
            </g>

            {/* 15. GRANDE DORSAL (lats) */}
            <g id="region-lats" data-region="lats">
              <path d="M 92,190 C 90,212 94,240 102,260 C 110,264 118,262 124,256 L 126,188 C 112,194 100,194 92,190 Z" style={getStyle('lats')} />
              <path d="M 188,190 C 190,212 186,240 178,260 C 170,264 162,262 156,256 L 154,188 C 168,194 180,194 188,190 Z" style={getStyle('lats')} />
            </g>

            {/* 16. TRÍCEPS (triceps) */}
            <g id="region-triceps" data-region="triceps">
              <path d="M 76,168 C 68,180 66,210 72,232 C 80,234 88,226 90,210 C 92,192 88,174 76,168 Z" style={getStyle('triceps')} />
              <path d="M 204,168 C 212,180 214,210 208,232 C 200,234 192,226 190,210 C 188,192 192,174 204,168 Z" style={getStyle('triceps')} />
            </g>

            {/* Antebraços Posteriores */}
            <g id="region-forearms-back" data-region="forearms">
              <path d="M 72,244 C 64,266 54,304 46,342 C 45,348 50,354 56,348 C 68,318 80,278 88,252 Z" style={getStyle('forearms')} />
              <path d="M 208,244 C 216,266 226,304 234,342 C 235,348 230,354 224,348 C 212,318 200,278 192,252 Z" style={getStyle('forearms')} />
            </g>

            {/* Punhos e Mãos Posteriores */}
            <g id="demo-hands-back">
              <path d="M 45,346 C 40,356 42,374 48,378 C 53,376 56,362 54,348 Z" style={neutralStyle} />
              <path d="M 235,346 C 240,356 238,374 232,378 C 227,376 224,362 226,348 Z" style={neutralStyle} />
            </g>

            {/* 17. LOMBAR (lowerBack) */}
            <g id="region-lowerBack" data-region="lowerBack">
              <path d="M 126,192 L 126,264 C 130,268 136,270 138,270 L 138,192 Z" style={getStyle('lowerBack')} />
              <path d="M 154,192 L 154,264 C 150,268 144,270 142,270 L 142,192 Z" style={getStyle('lowerBack')} />
              <path d="M 140,190 L 140,270" style={grooveStyle} />
            </g>

            {/* 18. GLÚTEOS (glutes) */}
            <g id="region-glutes" data-region="glutes">
              <path d="M 96,270 C 90,296 94,334 110,348 C 124,350 136,342 140,320 L 140,272 C 124,268 108,266 96,270 Z" style={getStyle('glutes')} />
              <path d="M 184,270 C 190,296 186,334 170,348 C 156,350 144,342 140,320 L 140,272 C 156,268 172,266 184,270 Z" style={getStyle('glutes')} />
              <path d="M 140,272 L 140,336" style={grooveStyle} />
            </g>

            {/* 19. ISQUIOTIBIAIS (hamstrings) */}
            <g id="region-hamstrings" data-region="hamstrings">
              <path d="M 104,352 C 98,380 96,412 102,434 C 110,438 122,438 128,430 C 132,402 134,372 134,348 C 124,350 114,352 104,352 Z" style={getStyle('hamstrings')} />
              <path d="M 176,352 C 182,380 184,412 178,434 C 170,438 158,438 152,430 C 148,402 146,372 146,348 C 156,350 166,352 176,352 Z" style={getStyle('hamstrings')} />
            </g>

            {/* Fossa Poplítea Posterior */}
            <g id="demo-knees-back">
              <path d="M 104,436 C 104,432 116,432 116,436 C 116,442 104,442 104,436 Z" style={neutralStyle} />
              <path d="M 164,436 C 164,432 176,432 176,436 C 176,442 164,442 164,436 Z" style={neutralStyle} />
            </g>

            {/* 20. PANTURRILHAS POSTERIORES (calves) */}
            <g id="region-calves-back" data-region="calves">
              <path d="M 102,448 C 90,470 88,512 96,548 C 102,558 112,558 116,546 C 120,512 122,476 122,448 Z" style={getStyle('calves')} />
              <path d="M 178,448 C 190,470 192,512 184,548 C 178,558 168,558 164,546 C 160,512 158,476 158,448 Z" style={getStyle('calves')} />
            </g>

            {/* Pés Posteriores */}
            <g id="demo-feet-back">
              <path d="M 98,548 C 98,564 82,570 72,570 C 64,570 64,554 80,548 Z" style={neutralStyle} />
              <path d="M 182,548 C 182,564 198,570 208,570 C 216,570 216,554 200,548 Z" style={neutralStyle} />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};
