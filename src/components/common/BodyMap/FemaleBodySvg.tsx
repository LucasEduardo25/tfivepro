import React from 'react';
import { BodyRegionId, MuscleIntensity } from './bodyMapTypes';
import { generate3DDefsMarkup, get3DRegionAttrs } from './body3DShaders';

export interface FemaleBodySvgProps {
  intensities: Record<BodyRegionId, MuscleIntensity>;
  view?: 'both' | 'front' | 'back';
  className?: string;
  accentColor?: string;
}

export const FemaleBodySvg: React.FC<FemaleBodySvgProps> = ({
  intensities,
  view = 'both',
  className = 'w-full h-auto',
  accentColor = '#374151'
}) => {
  const prefix = 'female-map-v2';

  const getStyle = (regionId: BodyRegionId, side: 'front' | 'back' = 'front', subPart?: string) => {
    const intensity = intensities[regionId] || 'none';
    const attrs = get3DRegionAttrs(prefix, regionId, intensity, side, subPart);
    return {
      fill: attrs.fill,
      stroke: attrs.stroke,
      strokeWidth: attrs.strokeWidth,
      filter: attrs.filter,
      transition: 'all 0.2s ease-in-out'
    };
  };

  const basePartStyle = {
    fill: '#202026',
    stroke: '#3B3B48',
    strokeWidth: 0.75
  };

  const lineDiv = {
    stroke: '#2F2F3B',
    strokeWidth: 0.7,
    fill: 'none',
    strokeLinecap: 'round' as const
  };

  return (
    <div className={`flex items-start justify-center gap-6 sm:gap-10 md:gap-14 w-full ${className}`}>
      {/* Defs SVG com filtros de glow */}
      <svg width="0" height="0" className="absolute hidden" aria-hidden="true">
        <g dangerouslySetInnerHTML={{ __html: generate3DDefsMarkup(prefix, accentColor) }} />
      </svg>

      {/* ================================================================== */}
      {/* 1. VISTA FRONTAL FEMININA — MAPA MUSCULAR FITNESS VETORIAL         */}
      {/* ================================================================== */}
      {(view === 'both' || view === 'front') && (
        <div className="flex flex-col items-center flex-1 max-w-[210px] sm:max-w-[260px] md:max-w-[280px]">
          <div className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#E4E4E7] mb-2.5 font-display flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#374151] shadow-sm shadow-[#374151]" />
            Frente
          </div>
          <svg
            viewBox="0 0 200 420"
            className="w-full h-auto select-none"
            aria-label="Mapa Muscular Feminino - Frente"
            style={{ filter: `url(#${prefix}-silhouette-shadow)` }}
          >
            {/* 0. BASE ESTRUTURAL FEMININA */}
            <g id="female-front-structure">
              {/* Cabeça / Crânio Feminino */}
              <path
                d="M100,16 C108,16 113,23 113,32 C113,41 107,49 100,49 C93,49 87,41 87,32 C87,23 92,16 100,16 Z"
                style={basePartStyle}
              />
              {/* Pescoço conectado à mandíbula */}
              <path
                d="M94,47 L106,47 L107,61 L93,61 Z"
                style={basePartStyle}
              />
              {/* Mãos Conectadas aos Antebraços */}
              <path
                d="M25,225 C22,230 23,241 27,244 C30,243 32,235 31,227 Z"
                style={basePartStyle}
              />
              <path
                d="M175,225 C178,230 177,241 173,244 C170,243 168,235 169,227 Z"
                style={basePartStyle}
              />
              {/* Joelhos */}
              <path
                d="M72,280 C72,277 80,277 80,280 C80,286 72,286 72,280 Z"
                style={basePartStyle}
              />
              <path
                d="M120,280 C120,277 128,277 128,280 C128,286 120,286 120,280 Z"
                style={basePartStyle}
              />
              {/* Pés */}
              <path
                d="M67,380 C67,389 58,393 52,393 C47,393 47,384 55,380 Z"
                style={basePartStyle}
              />
              <path
                d="M133,380 C133,389 142,393 148,393 C153,393 153,384 145,380 Z"
                style={basePartStyle}
              />
              {/* Pelve Feminina */}
              <path
                d="M84,178 L116,178 L110,200 L90,200 Z"
                style={basePartStyle}
              />
            </g>

            {/* 1. TRAPÉZIO (traps) */}
            <g id="female-front-traps" data-muscle="traps">
              <path
                d="M93,51 C86,55 80,59 75,65 L87,66 L93,61 Z"
                style={getStyle('traps', 'front')}
              />
              <path
                d="M107,51 C114,55 120,59 125,65 L113,66 L107,61 Z"
                style={getStyle('traps', 'front')}
              />
            </g>

            {/* 2. DELTOIDE ANTERIOR (frontShoulders) */}
            <g id="female-front-frontShoulders" data-muscle="frontShoulders">
              <path
                d="M74,65 C66,68 60,76 57,84 C55,90 58,96 63,99 L71,86 L80,67 Z"
                style={getStyle('frontShoulders', 'front')}
              />
              <path
                d="M126,65 C134,68 140,76 143,84 C145,90 142,96 137,99 L129,86 L120,67 Z"
                style={getStyle('frontShoulders', 'front')}
              />
            </g>

            {/* 3. DELTOIDE LATERAL (sideShoulders) */}
            <g id="female-front-sideShoulders" data-muscle="sideShoulders">
              <path
                d="M57,80 C51,86 51,94 54,103 C56,106 60,106 62,100 L58,88 Z"
                style={getStyle('sideShoulders', 'front')}
              />
              <path
                d="M143,80 C149,86 149,94 146,103 C144,106 140,106 138,100 L142,88 Z"
                style={getStyle('sideShoulders', 'front')}
              />
            </g>

            {/* 4. PEITORAL MAIOR (chest) */}
            <g id="female-front-chest" data-muscle="chest">
              <path
                d="M80,67 L98,67 C99,78 98,98 96,109 C87,113 74,111 69,101 C66,89 71,73 80,67 Z"
                style={getStyle('chest', 'front', 'left')}
              />
              <path
                d="M120,67 L102,67 C101,78 102,98 104,109 C113,113 126,111 131,101 C134,89 129,73 120,67 Z"
                style={getStyle('chest', 'front', 'right')}
              />
              <path d="M100,67 L100,109" style={lineDiv} />
            </g>

            {/* 5. BÍCEPS (biceps) */}
            <g id="female-front-biceps" data-muscle="biceps">
              <path
                d="M56,104 C50,113 49,132 54,147 C58,149 64,143 65,134 C67,122 63,109 56,104 Z"
                style={getStyle('biceps', 'front')}
              />
              <path
                d="M144,104 C150,113 151,132 146,147 C142,149 136,143 135,134 C133,122 137,109 144,104 Z"
                style={getStyle('biceps', 'front')}
              />
            </g>

            {/* 6. ANTEBRAÇOS (forearms) */}
            <g id="female-front-forearms" data-muscle="forearms">
              <path
                d="M52,151 C47,167 40,194 34,219 C33,224 36,227 40,223 C47,205 55,178 59,159 Z"
                style={getStyle('forearms', 'front')}
              />
              <path
                d="M148,151 C153,167 160,194 166,219 C167,224 164,227 160,223 C153,205 145,178 141,159 Z"
                style={getStyle('forearms', 'front')}
              />
            </g>

            {/* 7. RETO ABDOMINAL (abs) */}
            <g id="female-front-abs" data-muscle="abs">
              <path d="M87,114 L98,114 L98,131 L86,131 C85,124 86,118 87,114 Z" style={getStyle('abs', 'front')} />
              <path d="M113,114 L102,114 L102,131 L114,131 C115,124 114,118 113,114 Z" style={getStyle('abs', 'front')} />
              <path d="M86,134 L98,134 L98,152 L85,152 Z" style={getStyle('abs', 'front')} />
              <path d="M114,134 L102,134 L102,152 L115,152 Z" style={getStyle('abs', 'front')} />
              <path d="M86,155 L98,155 L98,176 C91,174 88,167 86,155 Z" style={getStyle('abs', 'front')} />
              <path d="M114,155 L102,155 L102,176 C109,174 112,167 114,155 Z" style={getStyle('abs', 'front')} />
              <path d="M100,114 L100,176" style={lineDiv} />
              <path d="M86,133 L114,133" style={lineDiv} />
              <path d="M86,154 L114,154" style={lineDiv} />
            </g>

            {/* 8. OBLÍQUOS (obliques) */}
            <g id="female-front-obliques" data-muscle="obliques">
              <path
                d="M73,116 C76,113 82,113 83,117 L83,167 C77,171 73,162 70,147 C69,132 71,120 73,116 Z"
                style={getStyle('obliques', 'front')}
              />
              <path
                d="M127,116 C124,113 118,113 117,117 L117,167 C123,171 127,162 130,147 C131,132 129,120 127,116 Z"
                style={getStyle('obliques', 'front')}
              />
            </g>

            {/* 9. QUADRÍCEPS (quadriceps) */}
            <g id="female-front-quadriceps" data-muscle="quadriceps">
              <path
                d="M71,192 C68,211 66,241 71,272 C76,278 83,278 85,272 C87,251 87,216 85,194 C79,190 74,190 71,192 Z"
                style={getStyle('quadriceps', 'front')}
              />
              <path
                d="M85,198 C87,219 88,250 86,275 C91,280 95,271 96,255 C96,233 93,209 90,196 Z"
                style={getStyle('quadriceps', 'front')}
              />
              <path
                d="M129,192 C132,211 134,241 129,272 C124,278 117,278 115,272 C113,251 113,216 115,194 C121,190 126,190 129,192 Z"
                style={getStyle('quadriceps', 'front')}
              />
              <path
                d="M115,198 C113,219 112,250 114,275 C109,280 105,271 104,255 C104,233 107,209 110,196 Z"
                style={getStyle('quadriceps', 'front')}
              />
            </g>

            {/* 10. ADUTORES (adductors) */}
            <g id="female-front-adductors" data-muscle="adductors">
              <path
                d="M90,201 C93,215 93,236 90,250 C87,239 86,219 88,201 Z"
                style={getStyle('adductors', 'front')}
              />
              <path
                d="M110,201 C107,215 107,236 110,250 C113,239 114,219 112,201 Z"
                style={getStyle('adductors', 'front')}
              />
            </g>

            {/* 11. PANTURRILHAS (calves) */}
            <g id="female-front-calves" data-muscle="calves">
              <path
                d="M72,292 C65,306 64,335 69,362 C72,367 77,367 79,360 C82,336 83,311 83,292 C78,290 74,290 72,292 Z"
                style={getStyle('calves', 'front')}
              />
              <path
                d="M128,292 C135,306 136,335 131,362 C128,367 123,367 121,360 C118,336 117,311 117,292 C122,290 126,290 128,292 Z"
                style={getStyle('calves', 'front')}
              />
            </g>
          </svg>
        </div>
      )}

      {/* ================================================================== */}
      {/* 2. VISTA POSTERIOR FEMININA (COSTAS)                              */}
      {/* ================================================================== */}
      {(view === 'both' || view === 'back') && (
        <div className="flex flex-col items-center flex-1 max-w-[210px] sm:max-w-[260px] md:max-w-[280px]">
          <div className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#E4E4E7] mb-2.5 font-display flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#374151] shadow-sm shadow-[#374151]" />
            Costas
          </div>
          <svg
            viewBox="0 0 200 420"
            className="w-full h-auto select-none"
            aria-label="Mapa Muscular Feminino - Costas"
            style={{ filter: `url(#${prefix}-silhouette-shadow)` }}
          >
            {/* 0. BASE POSTERIOR FEMININA */}
            <g id="female-back-structure">
              <path
                d="M100,16 C108,16 113,23 113,32 C113,41 107,49 100,49 C93,49 87,41 87,32 C87,23 92,16 100,16 Z"
                style={basePartStyle}
              />
              <path
                d="M94,47 L106,47 L107,61 L93,61 Z"
                style={basePartStyle}
              />
              <path
                d="M25,225 C22,230 23,241 27,244 C30,243 32,235 31,227 Z"
                style={basePartStyle}
              />
              <path
                d="M175,225 C178,230 177,241 173,244 C170,243 168,235 169,227 Z"
                style={basePartStyle}
              />
              <path
                d="M73,279 C73,276 80,276 80,279 C80,285 73,285 73,279 Z"
                style={basePartStyle}
              />
              <path
                d="M119,279 C119,276 127,276 127,279 C127,285 119,285 119,279 Z"
                style={basePartStyle}
              />
              <path
                d="M67,380 C67,389 58,393 52,393 C47,393 47,384 55,380 Z"
                style={basePartStyle}
              />
              <path
                d="M133,380 C133,389 142,393 148,393 C153,393 153,384 145,380 Z"
                style={basePartStyle}
              />
            </g>

            {/* 1. TRAPÉZIO DORSAL (traps) */}
            <g id="female-back-traps" data-muscle="traps">
              <path
                d="M100,48 L78,63 L88,107 L100,122 L112,107 L122,63 Z"
                style={getStyle('traps', 'back')}
              />
              <path d="M100,48 L100,122" style={lineDiv} />
            </g>

            {/* 2. DELTOIDE POSTERIOR (rearShoulders) */}
            <g id="female-back-rearShoulders" data-muscle="rearShoulders">
              <path
                d="M75,65 C66,66 58,74 56,85 C55,93 59,99 65,103 L72,88 L78,69 Z"
                style={getStyle('rearShoulders', 'back')}
              />
              <path
                d="M125,65 C134,66 142,74 144,85 C145,93 141,99 135,103 L128,88 L122,69 Z"
                style={getStyle('rearShoulders', 'back')}
              />
            </g>

            {/* 3. DELTOIDE LATERAL POSTERIOR (sideShoulders) */}
            <g id="female-back-sideShoulders" data-muscle="sideShoulders">
              <path
                d="M55,83 C49,89 49,98 51,106 C53,109 57,109 60,103 L56,90 Z"
                style={getStyle('sideShoulders', 'back')}
              />
              <path
                d="M145,83 C151,89 151,98 149,106 C147,109 143,109 140,103 L144,90 Z"
                style={getStyle('sideShoulders', 'back')}
              />
            </g>

            {/* 4. COSTAS SUPERIORES / ESCÁPULAS (upperBack) */}
            <g id="female-back-upperBack" data-muscle="upperBack">
              <path
                d="M88,103 L73,97 C67,100 66,108 67,121 C73,125 82,124 88,120 Z"
                style={getStyle('upperBack', 'back')}
              />
              <path
                d="M112,103 L127,97 C133,100 134,108 133,121 C127,125 118,124 112,120 Z"
                style={getStyle('upperBack', 'back')}
              />
            </g>

            {/* 5. GRANDE DORSAL (lats) */}
            <g id="female-back-lats" data-muscle="lats">
              <path
                d="M66,123 C65,137 67,155 72,170 C77,172 82,171 86,167 L88,122 C79,126 71,126 66,123 Z"
                style={getStyle('lats', 'back')}
              />
              <path
                d="M134,123 C135,137 133,155 128,170 C123,172 118,171 114,167 L112,122 C121,126 129,126 134,123 Z"
                style={getStyle('lats', 'back')}
              />
            </g>

            {/* 6. TRÍCEPS (triceps) */}
            <g id="female-back-triceps" data-muscle="triceps">
              <path
                d="M55,106 C49,115 48,135 52,149 C57,151 62,145 64,135 C66,124 62,110 55,106 Z"
                style={getStyle('triceps', 'back')}
              />
              <path
                d="M145,106 C151,115 152,135 148,149 C143,151 138,145 136,135 C134,124 138,110 145,106 Z"
                style={getStyle('triceps', 'back')}
              />
            </g>

            {/* 7. ANTEBRAÇOS POSTERIORES (forearms) */}
            <g id="female-back-forearms" data-muscle="forearms">
              <path
                d="M50,154 C45,170 38,196 32,221 C31,226 34,229 38,225 C45,207 54,179 58,160 Z"
                style={getStyle('forearms', 'back')}
              />
              <path
                d="M150,154 C155,170 162,196 168,221 C169,226 166,229 162,225 C155,207 146,179 142,160 Z"
                style={getStyle('forearms', 'back')}
              />
            </g>

            {/* 8. LOMBAR / ERETORES (lowerBack) */}
            <g id="female-back-lowerBack" data-muscle="lowerBack">
              <path
                d="M88,125 L88,173 C91,176 95,177 98,177 L98,125 Z"
                style={getStyle('lowerBack', 'back')}
              />
              <path
                d="M112,125 L112,173 C109,176 105,177 102,177 L102,125 Z"
                style={getStyle('lowerBack', 'back')}
              />
              <path d="M100,123 L100,177" style={lineDiv} />
            </g>

            {/* 9. GLÚTEOS (glutes) */}
            <g id="female-back-glutes" data-muscle="glutes">
              <path
                d="M66,177 C61,194 65,221 76,230 C86,231 96,226 99,210 L99,179 C87,176 75,175 66,177 Z"
                style={getStyle('glutes', 'back')}
              />
              <path
                d="M134,177 C139,194 135,221 124,230 C114,231 104,226 101,210 L101,179 C113,176 125,175 134,177 Z"
                style={getStyle('glutes', 'back')}
              />
              <path d="M100,178 L100,222" style={lineDiv} />
            </g>

            {/* 10. ISQUIOTIBIAIS (hamstrings) */}
            <g id="female-back-hamstrings" data-muscle="hamstrings">
              <path
                d="M72,232 C67,251 66,274 70,290 C76,293 85,293 89,287 C92,268 93,247 93,229 C86,231 79,232 72,232 Z"
                style={getStyle('hamstrings', 'back')}
              />
              <path
                d="M128,232 C133,251 134,274 130,290 C124,293 115,293 111,287 C108,268 107,247 107,229 C114,231 121,232 128,232 Z"
                style={getStyle('hamstrings', 'back')}
              />
            </g>

            {/* 11. PANTURRILHAS POSTERIORES (calves) */}
            <g id="female-back-calves" data-muscle="calves">
              <path
                d="M70,301 C62,316 61,345 66,370 C70,377 77,377 79,368 C82,345 83,319 83,301 Z"
                style={getStyle('calves', 'back')}
              />
              <path
                d="M130,301 C138,316 139,345 134,370 C130,377 123,377 121,368 C118,345 117,319 117,301 Z"
                style={getStyle('calves', 'back')}
              />
            </g>
          </svg>
        </div>
      )}
    </div>
  );
};
