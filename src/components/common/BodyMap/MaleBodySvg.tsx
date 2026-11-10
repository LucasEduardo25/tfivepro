import React from 'react';
import { BodyRegionId, MuscleIntensity } from './bodyMapTypes';
import { get3DRegionAttrs } from './body3DShaders';

export interface MaleBodySvgProps {
  intensities: Record<BodyRegionId, MuscleIntensity>;
  view?: 'both' | 'front' | 'back';
  className?: string;
  accentColor?: string;
}

export const MaleBodySvg: React.FC<MaleBodySvgProps> = ({
  intensities,
  view = 'both',
  className = 'w-full h-auto',
  accentColor = '#374151'
}) => {
  const prefix = 'male-map-v2';

  const getStyle = (regionId: BodyRegionId, side: 'front' | 'back' = 'front', subPart?: string) => {
    const intensity = intensities[regionId] || 'none';
    const attrs = get3DRegionAttrs(prefix, regionId, intensity, side, subPart);
    return {
      fill: attrs.fill,
      stroke: attrs.stroke,
      strokeWidth: attrs.strokeWidth,
      filter: 'none',
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
    <div className={`flex items-start justify-center gap-6 sm:gap-10 md:gap-14 w-full ${className}`}>{/* ================================================================== */}
      {/* 1. VISTA FRONTAL MASCULINA — MAPA MUSCULAR FITNESS VETORIAL       */}
      {/* ================================================================== */}
      {(view === 'both' || view === 'front') && (
        <div className="flex flex-col items-center flex-1 max-w-[210px] sm:max-w-[260px] md:max-w-[280px]">
          <div className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#E4E4E7] mb-2.5 font-display flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#374151] shadow-sm shadow-[#374151]" />
            Frente
          </div>
          <svg
            width="200"
            height="420"
            width="200"
            height="420"
            viewBox="0 0 200 420"
            className="w-full h-auto select-none"
            style={{ width: "100%", height: "auto", display: "block" }}
            style={{ width: "100%", height: "auto", display: "block" }}
            aria-label="Mapa Muscular Masculino - Frente"
          >
            {/* 0. BASE CORPORAL INTEGRADA (Cabeça, Pescoço, Articulações, Mãos, Pés) */}
            <g id="male-front-structure">
              {/* Cabeça / Crânio e Mandíbula contínua */}
              <path
                d="M100,16 C109,16 114,23 114,32 C114,42 108,50 100,50 C92,50 86,42 86,32 C86,23 91,16 100,16 Z"
                style={basePartStyle}
              />
              {/* Pescoço conectado à mandíbula */}
              <path
                d="M93,48 L107,48 L108,62 L92,62 Z"
                style={basePartStyle}
              />
              {/* Mão Esquerda fluida conectada ao antebraço */}
              <path
                d="M21,228 C18,233 19,245 23,248 C27,247 29,238 28,230 Z"
                style={basePartStyle}
              />
              {/* Mão Direita fluida conectada ao antebraço */}
              <path
                d="M179,228 C182,233 181,245 177,248 C173,247 171,238 172,230 Z"
                style={basePartStyle}
              />
              {/* Joelho Esquerdo */}
              <path
                d="M71,280 C71,277 79,277 79,280 C79,287 71,287 71,280 Z"
                style={basePartStyle}
              />
              {/* Joelho Direito */}
              <path
                d="M121,280 C121,277 129,277 129,280 C129,287 121,287 121,280 Z"
                style={basePartStyle}
              />
              {/* Pé Esquerdo conectado à canela */}
              <path
                d="M66,380 C66,390 56,394 50,394 C45,394 45,384 54,380 Z"
                style={basePartStyle}
              />
              {/* Pé Direito conectado à canela */}
              <path
                d="M134,380 C134,390 144,394 150,394 C155,394 155,384 146,380 Z"
                style={basePartStyle}
              />
              {/* Região Pélvica Base */}
              <path
                d="M84,178 L116,178 L110,200 L90,200 Z"
                style={basePartStyle}
              />
            </g>

            {/* 1. TRAPÉZIO FRONTAL (traps) */}
            <g id="male-front-traps" data-muscle="traps">
              <path
                d="M92,50 C85,54 78,59 72,66 L86,67 L92,62 Z"
                style={getStyle('traps', 'front')}
              />
              <path
                d="M108,50 C115,54 122,59 128,66 L114,67 L108,62 Z"
                style={getStyle('traps', 'front')}
              />
            </g>

            {/* 2. DELTOIDE ANTERIOR (frontShoulders) */}
            <g id="male-front-frontShoulders" data-muscle="frontShoulders">
              <path
                d="M71,66 C62,69 55,77 52,86 C50,92 53,98 59,101 L67,88 L78,68 Z"
                style={getStyle('frontShoulders', 'front')}
              />
              <path
                d="M129,66 C138,69 145,77 148,86 C150,92 147,98 141,101 L133,88 L122,68 Z"
                style={getStyle('frontShoulders', 'front')}
              />
            </g>

            {/* 3. DELTOIDE LATERAL (sideShoulders) */}
            <g id="male-front-sideShoulders" data-muscle="sideShoulders">
              <path
                d="M52,82 C46,88 45,97 48,106 C50,109 54,109 57,103 L53,90 Z"
                style={getStyle('sideShoulders', 'front')}
              />
              <path
                d="M148,82 C154,88 155,97 152,106 C150,109 146,109 143,103 L147,90 Z"
                style={getStyle('sideShoulders', 'front')}
              />
            </g>

            {/* 4. PEITORAL MAIOR (chest) */}
            <g id="male-front-chest" data-muscle="chest">
              {/* Peitoral Esquerdo */}
              <path
                d="M78,68 L98,68 C99,80 99,102 97,112 C86,116 70,113 65,103 C62,90 68,74 78,68 Z"
                style={getStyle('chest', 'front', 'left')}
              />
              {/* Peitoral Direito */}
              <path
                d="M122,68 L102,68 C101,80 101,102 103,112 C114,116 130,113 135,103 C138,90 132,74 122,68 Z"
                style={getStyle('chest', 'front', 'right')}
              />
              {/* Sulco esternal central */}
              <path d="M100,68 L100,112" style={lineDiv} />
            </g>

            {/* 5. BÍCEPS BRAQUIAL (biceps) */}
            <g id="male-front-biceps" data-muscle="biceps">
              <path
                d="M52,106 C46,115 44,134 49,150 C54,152 60,146 62,136 C64,124 60,110 52,106 Z"
                style={getStyle('biceps', 'front')}
              />
              <path
                d="M148,106 C154,115 156,134 151,150 C146,152 140,146 138,136 C136,124 140,110 148,106 Z"
                style={getStyle('biceps', 'front')}
              />
            </g>

            {/* 6. ANTEBRAÇOS (forearms) */}
            <g id="male-front-forearms" data-muscle="forearms">
              <path
                d="M48,154 C42,170 34,197 28,222 C27,227 30,231 34,227 C42,208 51,180 56,161 Z"
                style={getStyle('forearms', 'front')}
              />
              <path
                d="M152,154 C158,170 166,197 172,222 C173,227 170,231 166,227 C158,208 149,180 144,161 Z"
                style={getStyle('forearms', 'front')}
              />
            </g>

            {/* 7. RETO ABDOMINAL (abs) */}
            <g id="male-front-abs" data-muscle="abs">
              {/* Gomo Superior */}
              <path d="M86,116 L98,116 L98,132 L85,132 C84,125 85,119 86,116 Z" style={getStyle('abs', 'front')} />
              <path d="M114,116 L102,116 L102,132 L115,132 C116,125 115,119 114,116 Z" style={getStyle('abs', 'front')} />
              {/* Gomo Médio */}
              <path d="M84,135 L98,135 L98,153 L83,153 Z" style={getStyle('abs', 'front')} />
              <path d="M116,135 L102,135 L102,153 L117,153 Z" style={getStyle('abs', 'front')} />
              {/* Gomo Inferior */}
              <path d="M84,156 L98,156 L98,177 C90,175 86,168 84,156 Z" style={getStyle('abs', 'front')} />
              <path d="M116,156 L102,156 L102,177 C110,175 114,168 116,156 Z" style={getStyle('abs', 'front')} />
              {/* Linhas anatômicas sutis */}
              <path d="M100,116 L100,177" style={lineDiv} />
              <path d="M85,134 L115,134" style={lineDiv} />
              <path d="M84,155 L116,155" style={lineDiv} />
            </g>

            {/* 8. OBLÍQUOS (obliques) */}
            <g id="male-front-obliques" data-muscle="obliques">
              <path
                d="M70,118 C73,115 80,115 81,119 L81,168 C74,172 70,163 67,148 C66,133 68,122 70,118 Z"
                style={getStyle('obliques', 'front')}
              />
              <path
                d="M130,118 C127,115 120,115 119,119 L119,168 C126,172 130,163 133,148 C134,133 132,122 130,118 Z"
                style={getStyle('obliques', 'front')}
              />
            </g>

            {/* 9. QUADRÍCEPS (quadriceps) */}
            <g id="male-front-quadriceps" data-muscle="quadriceps">
              {/* Perna Esquerda: Reto Femoral & Vasto Lateral */}
              <path
                d="M70,192 C67,211 65,241 70,272 C75,278 82,278 84,272 C86,251 86,216 84,194 C78,190 73,190 70,192 Z"
                style={getStyle('quadriceps', 'front')}
              />
              {/* Vasto Medial Esquerdo (Gota anatômica) */}
              <path
                d="M84,198 C86,219 87,250 85,275 C90,280 95,271 96,255 C96,233 93,209 89,196 Z"
                style={getStyle('quadriceps', 'front')}
              />
              {/* Perna Direita: Reto Femoral & Vasto Lateral */}
              <path
                d="M130,192 C133,211 135,241 130,272 C125,278 118,278 116,272 C114,251 114,216 116,194 C122,190 127,190 130,192 Z"
                style={getStyle('quadriceps', 'front')}
              />
              {/* Vasto Medial Direito */}
              <path
                d="M116,198 C114,219 113,250 115,275 C110,280 105,271 104,255 C104,233 107,209 111,196 Z"
                style={getStyle('quadriceps', 'front')}
              />
            </g>

            {/* 10. ADUTORES (adductors) */}
            <g id="male-front-adductors" data-muscle="adductors">
              <path
                d="M90,201 C93,215 93,236 90,250 C87,239 86,219 88,201 Z"
                style={getStyle('adductors', 'front')}
              />
              <path
                d="M110,201 C107,215 107,236 110,250 C113,239 114,219 112,201 Z"
                style={getStyle('adductors', 'front')}
              />
            </g>

            {/* 11. PANTURRILHAS FRONTAIS (calves) */}
            <g id="male-front-calves" data-muscle="calves">
              <path
                d="M71,292 C63,306 62,335 67,362 C70,367 76,367 78,360 C81,336 82,311 82,292 C77,290 73,290 71,292 Z"
                style={getStyle('calves', 'front')}
              />
              <path
                d="M129,292 C137,306 138,335 133,362 C130,367 124,367 122,360 C119,336 118,311 118,292 C123,290 127,290 129,292 Z"
                style={getStyle('calves', 'front')}
              />
            </g>
          </svg>
        </div>
      )}

      {/* ================================================================== */}
      {/* 2. VISTA POSTERIOR MASCULINA (COSTAS)                             */}
      {/* ================================================================== */}
      {(view === 'both' || view === 'back') && (
        <div className="flex flex-col items-center flex-1 max-w-[210px] sm:max-w-[260px] md:max-w-[280px]">
          <div className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#E4E4E7] mb-2.5 font-display flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#374151] shadow-sm shadow-[#374151]" />
            Costas
          </div>
          <svg
            width="200"
            height="420"
            viewBox="0 0 200 420"
            className="w-full h-auto select-none"
            style={{ width: "100%", height: "auto", display: "block" }}
            aria-label="Mapa Muscular Masculino - Costas"
          >
            {/* 0. BASE POSTERIOR INTEGRADA */}
            <g id="male-back-structure">
              {/* Nuca e Cabeça Posterior */}
              <path
                d="M100,16 C109,16 114,23 114,32 C114,42 108,50 100,50 C92,50 86,42 86,32 C86,23 91,16 100,16 Z"
                style={basePartStyle}
              />
              {/* Pescoço Posterior */}
              <path
                d="M93,48 L107,48 L108,62 L92,62 Z"
                style={basePartStyle}
              />
              {/* Mãos Posteriores */}
              <path
                d="M21,228 C18,233 19,245 23,248 C27,247 29,238 28,230 Z"
                style={basePartStyle}
              />
              <path
                d="M179,228 C182,233 181,245 177,248 C173,247 171,238 172,230 Z"
                style={basePartStyle}
              />
              {/* Fossa Poplítea (Atrás dos Joelhos) */}
              <path
                d="M72,279 C72,276 80,276 80,279 C80,285 72,285 72,279 Z"
                style={basePartStyle}
              />
              <path
                d="M120,279 C120,276 128,276 128,279 C128,285 120,285 120,279 Z"
                style={basePartStyle}
              />
              {/* Pés Posteriores */}
              <path
                d="M66,380 C66,390 56,394 50,394 C45,394 45,384 54,380 Z"
                style={basePartStyle}
              />
              <path
                d="M134,380 C134,390 144,394 150,394 C155,394 155,384 146,380 Z"
                style={basePartStyle}
              />
            </g>

            {/* 1. TRAPÉZIO DORSAL (traps) */}
            <g id="male-back-traps" data-muscle="traps">
              <path
                d="M100,48 L76,64 L87,108 L100,123 L113,108 L124,64 Z"
                style={getStyle('traps', 'back')}
              />
              {/* Linha espinhal */}
              <path d="M100,48 L100,123" style={lineDiv} />
            </g>

            {/* 2. DELTOIDE POSTERIOR (rearShoulders) */}
            <g id="male-back-rearShoulders" data-muscle="rearShoulders">
              <path
                d="M73,65 C63,66 54,75 52,86 C51,94 55,101 62,105 L69,90 L76,70 Z"
                style={getStyle('rearShoulders', 'back')}
              />
              <path
                d="M127,65 C137,66 146,75 148,86 C149,94 145,101 138,105 L131,90 L124,70 Z"
                style={getStyle('rearShoulders', 'back')}
              />
            </g>

            {/* 3. DELTOIDE LATERAL POSTERIOR (sideShoulders) */}
            <g id="male-back-sideShoulders" data-muscle="sideShoulders">
              <path
                d="M51,84 C45,90 45,99 47,107 C49,110 54,110 57,104 L52,91 Z"
                style={getStyle('sideShoulders', 'back')}
              />
              <path
                d="M149,84 C155,90 155,99 153,107 C151,110 146,110 143,104 L148,91 Z"
                style={getStyle('sideShoulders', 'back')}
              />
            </g>

            {/* 4. COSTAS SUPERIORES / ESCÁPULAS (upperBack) */}
            <g id="male-back-upperBack" data-muscle="upperBack">
              <path
                d="M87,104 L71,98 C65,101 63,109 64,122 C71,126 80,125 87,121 Z"
                style={getStyle('upperBack', 'back')}
              />
              <path
                d="M113,104 L129,98 C135,101 137,109 136,122 C129,126 120,125 113,121 Z"
                style={getStyle('upperBack', 'back')}
              />
            </g>

            {/* 5. GRANDE DORSAL (lats) */}
            <g id="male-back-lats" data-muscle="lats">
              <path
                d="M63,124 C62,138 64,156 70,171 C75,173 81,172 85,168 L87,123 C77,127 69,127 63,124 Z"
                style={getStyle('lats', 'back')}
              />
              <path
                d="M137,124 C138,138 136,156 130,171 C125,173 119,172 115,168 L113,123 C123,127 131,127 137,124 Z"
                style={getStyle('lats', 'back')}
              />
            </g>

            {/* 6. TRÍCEPS (triceps) */}
            <g id="male-back-triceps" data-muscle="triceps">
              <path
                d="M51,107 C45,116 43,136 47,151 C52,153 58,147 60,137 C62,125 59,111 51,107 Z"
                style={getStyle('triceps', 'back')}
              />
              <path
                d="M149,107 C155,116 157,136 153,151 C148,153 142,147 140,137 C138,125 141,111 149,107 Z"
                style={getStyle('triceps', 'back')}
              />
            </g>

            {/* 7. ANTEBRAÇOS POSTERIORES (forearms) */}
            <g id="male-back-forearms" data-muscle="forearms">
              <path
                d="M46,155 C40,171 33,198 27,223 C26,228 29,232 33,228 C41,209 50,181 55,162 Z"
                style={getStyle('forearms', 'back')}
              />
              <path
                d="M154,155 C160,171 167,198 173,223 C174,228 171,232 167,228 C159,209 150,181 145,162 Z"
                style={getStyle('forearms', 'back')}
              />
            </g>

            {/* 8. LOMBAR / ERETORES (lowerBack) */}
            <g id="male-back-lowerBack" data-muscle="lowerBack">
              <path
                d="M87,126 L87,174 C90,177 95,178 98,178 L98,126 Z"
                style={getStyle('lowerBack', 'back')}
              />
              <path
                d="M113,126 L113,174 C110,177 105,178 102,178 L102,126 Z"
                style={getStyle('lowerBack', 'back')}
              />
              <path d="M100,124 L100,178" style={lineDiv} />
            </g>

            {/* 9. GLÚTEOS (glutes) */}
            <g id="male-back-glutes" data-muscle="glutes">
              <path
                d="M66,178 C62,195 65,221 76,230 C86,231 96,226 99,210 L99,180 C87,177 75,176 66,178 Z"
                style={getStyle('glutes', 'back')}
              />
              <path
                d="M134,178 C138,195 135,221 124,230 C114,231 104,226 101,210 L101,180 C113,177 125,176 134,178 Z"
                style={getStyle('glutes', 'back')}
              />
              {/* Sulco interglúteo */}
              <path d="M100,179 L100,222" style={lineDiv} />
            </g>

            {/* 10. POSTERIOR DE COXA / ISQUIOTIBIAIS (hamstrings) */}
            <g id="male-back-hamstrings" data-muscle="hamstrings">
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
            <g id="male-back-calves" data-muscle="calves">
              <path
                d="M69,301 C61,316 60,345 65,370 C69,377 76,377 79,368 C82,345 83,319 83,301 Z"
                style={getStyle('calves', 'back')}
              />
              <path
                d="M131,301 C139,316 140,345 135,370 C131,377 124,377 121,368 C118,345 117,319 117,301 Z"
                style={getStyle('calves', 'back')}
              />
            </g>
          </svg>
        </div>
      )}
    </div>
  );
};
