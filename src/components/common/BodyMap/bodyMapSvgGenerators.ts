import { BodyRegionId, MuscleIntensity } from './bodyMapTypes';
import { generate3DDefsMarkup, get3DRegionAttrs } from './body3DShaders';

interface SvgGeneratorOptions {
  accentColor?: string;
  width?: number;
  height?: number;
}

export function generateMaleBodySvgMarkup(
  intensities: Record<BodyRegionId, MuscleIntensity>,
  options: SvgGeneratorOptions = {}
): string {
  const accentColor = options.accentColor || '#374151';
  const prefix = 'male-story-map';

  const getAttr = (regionId: BodyRegionId, side: 'front' | 'back' = 'front', subPart?: string) => {
    const intensity = intensities[regionId] || 'none';
    const attrs = get3DRegionAttrs(prefix, regionId, intensity, side, subPart);
    const filterAttr = attrs.filter ? ` filter="${attrs.filter}"` : '';
    return `fill="${attrs.fill}" stroke="${attrs.stroke}" stroke-width="${attrs.strokeWidth}"${filterAttr}`;
  };

  const baseAttr = `fill="#202026" stroke="#3B3B48" stroke-width="0.75"`;
  const divAttr = `stroke="#2F2F3B" stroke-width="0.7" fill="none" stroke-linecap="round"`;

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 430 420" width="430" height="420" style="background:transparent;">
  ${generate3DDefsMarkup(prefix, accentColor)}

  <!-- ================= FRONT VIEW (x: 0) ================= -->
  <g transform="translate(0, 0)">
    <!-- Base Estrutura Frontal -->
    <path d="M100,16 C109,16 114,23 114,32 C114,42 108,50 100,50 C92,50 86,42 86,32 C86,23 91,16 100,16 Z" ${baseAttr} />
    <path d="M93,48 L107,48 L108,62 L92,62 Z" ${baseAttr} />
    <path d="M21,228 C18,233 19,245 23,248 C27,247 29,238 28,230 Z" ${baseAttr} />
    <path d="M179,228 C182,233 181,245 177,248 C173,247 171,238 172,230 Z" ${baseAttr} />
    <path d="M71,280 C71,277 79,277 79,280 C79,287 71,287 71,280 Z" ${baseAttr} />
    <path d="M121,280 C121,277 129,277 129,280 C129,287 121,287 121,280 Z" ${baseAttr} />
    <path d="M66,380 C66,390 56,394 50,394 C45,394 45,384 54,380 Z" ${baseAttr} />
    <path d="M134,380 C134,390 144,394 150,394 C155,394 155,384 146,380 Z" ${baseAttr} />
    <path d="M84,178 L116,178 L110,200 L90,200 Z" ${baseAttr} />

    <!-- Traps -->
    <path d="M92,50 C85,54 78,59 72,66 L86,67 L92,62 Z" ${getAttr('traps', 'front')} />
    <path d="M108,50 C115,54 122,59 128,66 L114,67 L108,62 Z" ${getAttr('traps', 'front')} />

    <!-- Front Shoulders -->
    <path d="M71,66 C62,69 55,77 52,86 C50,92 53,98 59,101 L67,88 L78,68 Z" ${getAttr('frontShoulders', 'front')} />
    <path d="M129,66 C138,69 145,77 148,86 C150,92 147,98 141,101 L133,88 L122,68 Z" ${getAttr('frontShoulders', 'front')} />

    <!-- Side Shoulders -->
    <path d="M52,82 C46,88 45,97 48,106 C50,109 54,109 57,103 L53,90 Z" ${getAttr('sideShoulders', 'front')} />
    <path d="M148,82 C154,88 155,97 152,106 C150,109 146,109 143,103 L147,90 Z" ${getAttr('sideShoulders', 'front')} />

    <!-- Chest -->
    <path d="M78,68 L98,68 C99,80 99,102 97,112 C86,116 70,113 65,103 C62,90 68,74 78,68 Z" ${getAttr('chest', 'front', 'left')} />
    <path d="M122,68 L102,68 C101,80 101,102 103,112 C114,116 130,113 135,103 C138,90 132,74 122,68 Z" ${getAttr('chest', 'front', 'right')} />
    <path d="M100,68 L100,112" ${divAttr} />

    <!-- Biceps -->
    <path d="M52,106 C46,115 44,134 49,150 C54,152 60,146 62,136 C64,124 60,110 52,106 Z" ${getAttr('biceps', 'front')} />
    <path d="M148,106 C154,115 156,134 151,150 C146,152 140,146 138,136 C136,124 140,110 148,106 Z" ${getAttr('biceps', 'front')} />

    <!-- Forearms -->
    <path d="M48,154 C42,170 34,197 28,222 C27,227 30,231 34,227 C42,208 51,180 56,161 Z" ${getAttr('forearms', 'front')} />
    <path d="M152,154 C158,170 166,197 172,222 C173,227 170,231 166,227 C158,208 149,180 144,161 Z" ${getAttr('forearms', 'front')} />

    <!-- Abs -->
    <path d="M86,116 L98,116 L98,132 L85,132 C84,125 85,119 86,116 Z" ${getAttr('abs', 'front')} />
    <path d="M114,116 L102,116 L102,132 L115,132 C116,125 115,119 114,116 Z" ${getAttr('abs', 'front')} />
    <path d="M84,135 L98,135 L98,153 L83,153 Z" ${getAttr('abs', 'front')} />
    <path d="M116,135 L102,135 L102,153 L117,153 Z" ${getAttr('abs', 'front')} />
    <path d="M84,156 L98,156 L98,177 C90,175 86,168 84,156 Z" ${getAttr('abs', 'front')} />
    <path d="M116,156 L102,156 L102,177 C110,175 114,168 116,156 Z" ${getAttr('abs', 'front')} />
    <path d="M100,116 L100,177" ${divAttr} />
    <path d="M85,134 L115,134" ${divAttr} />
    <path d="M84,155 L116,155" ${divAttr} />

    <!-- Obliques -->
    <path d="M70,118 C73,115 80,115 81,119 L81,168 C74,172 70,163 67,148 C66,133 68,122 70,118 Z" ${getAttr('obliques', 'front')} />
    <path d="M130,118 C127,115 120,115 119,119 L119,168 C126,172 130,163 133,148 C134,133 132,122 130,118 Z" ${getAttr('obliques', 'front')} />

    <!-- Quadriceps -->
    <path d="M70,192 C67,211 65,241 70,272 C75,278 82,278 84,272 C86,251 86,216 84,194 C78,190 73,190 70,192 Z" ${getAttr('quadriceps', 'front')} />
    <path d="M84,198 C86,219 87,250 85,275 C90,280 95,271 96,255 C96,233 93,209 89,196 Z" ${getAttr('quadriceps', 'front')} />
    <path d="M130,192 C133,211 135,241 130,272 C125,278 118,278 116,272 C114,251 114,216 116,194 C122,190 127,190 130,192 Z" ${getAttr('quadriceps', 'front')} />
    <path d="M116,198 C114,219 113,250 115,275 C110,280 105,271 104,255 C104,233 107,209 111,196 Z" ${getAttr('quadriceps', 'front')} />

    <!-- Adductors -->
    <path d="M90,201 C93,215 93,236 90,250 C87,239 86,219 88,201 Z" ${getAttr('adductors', 'front')} />
    <path d="M110,201 C107,215 107,236 110,250 C113,239 114,219 112,201 Z" ${getAttr('adductors', 'front')} />

    <!-- Calves -->
    <path d="M71,292 C63,306 62,335 67,362 C70,367 76,367 78,360 C81,336 82,311 82,292 C77,290 73,290 71,292 Z" ${getAttr('calves', 'front')} />
    <path d="M129,292 C137,306 138,335 133,362 C130,367 124,367 122,360 C119,336 118,311 118,292 C123,290 127,290 129,292 Z" ${getAttr('calves', 'front')} />
  </g>

  <!-- ================= BACK VIEW (x: 220) ================= -->
  <g transform="translate(220, 0)">
    <!-- Base Estrutura Posterior -->
    <path d="M100,16 C109,16 114,23 114,32 C114,42 108,50 100,50 C92,50 86,42 86,32 C86,23 91,16 100,16 Z" ${baseAttr} />
    <path d="M93,48 L107,48 L108,62 L92,62 Z" ${baseAttr} />
    <path d="M21,228 C18,233 19,245 23,248 C27,247 29,238 28,230 Z" ${baseAttr} />
    <path d="M179,228 C182,233 181,245 177,248 C173,247 171,238 172,230 Z" ${baseAttr} />
    <path d="M72,279 C72,276 80,276 80,279 C80,285 72,285 72,279 Z" ${baseAttr} />
    <path d="M120,279 C120,276 128,276 128,279 C128,285 120,285 120,279 Z" ${baseAttr} />
    <path d="M66,380 C66,390 56,394 50,394 C45,394 45,384 54,380 Z" ${baseAttr} />
    <path d="M134,380 C134,390 144,394 150,394 C155,394 155,384 146,380 Z" ${baseAttr} />

    <!-- Traps Back -->
    <path d="M100,48 L76,64 L87,108 L100,123 L113,108 L124,64 Z" ${getAttr('traps', 'back')} />
    <path d="M100,48 L100,123" ${divAttr} />

    <!-- Rear Shoulders -->
    <path d="M73,65 C63,66 54,75 52,86 C51,94 55,101 62,105 L69,90 L76,70 Z" ${getAttr('rearShoulders', 'back')} />
    <path d="M127,65 C137,66 146,75 148,86 C149,94 145,101 138,105 L131,90 L124,70 Z" ${getAttr('rearShoulders', 'back')} />

    <!-- Side Shoulders Back -->
    <path d="M51,84 C45,90 45,99 47,107 C49,110 54,110 57,104 L52,91 Z" ${getAttr('sideShoulders', 'back')} />
    <path d="M149,84 C155,90 155,99 153,107 C151,110 146,110 143,104 L148,91 Z" ${getAttr('sideShoulders', 'back')} />

    <!-- Upper Back -->
    <path d="M87,104 L71,98 C65,101 63,109 64,122 C71,126 80,125 87,121 Z" ${getAttr('upperBack', 'back')} />
    <path d="M113,104 L129,98 C135,101 137,109 136,122 C129,126 120,125 113,121 Z" ${getAttr('upperBack', 'back')} />

    <!-- Lats -->
    <path d="M63,124 C62,138 64,156 70,171 C75,173 81,172 85,168 L87,123 C77,127 69,127 63,124 Z" ${getAttr('lats', 'back')} />
    <path d="M137,124 C138,138 136,156 130,171 C125,173 119,172 115,168 L113,123 C123,127 131,127 137,124 Z" ${getAttr('lats', 'back')} />

    <!-- Triceps -->
    <path d="M51,107 C45,116 43,136 47,151 C52,153 58,147 60,137 C62,125 59,111 51,107 Z" ${getAttr('triceps', 'back')} />
    <path d="M149,107 C155,116 157,136 153,151 C148,153 142,147 140,137 C138,125 141,111 149,107 Z" ${getAttr('triceps', 'back')} />

    <!-- Forearms Back -->
    <path d="M46,155 C40,171 33,198 27,223 C26,228 29,232 33,228 C41,209 50,181 55,162 Z" ${getAttr('forearms', 'back')} />
    <path d="M154,155 C160,171 167,198 173,223 C174,228 171,232 167,228 C159,209 150,181 145,162 Z" ${getAttr('forearms', 'back')} />

    <!-- Lower Back -->
    <path d="M87,126 L87,174 C90,177 95,178 98,178 L98,126 Z" ${getAttr('lowerBack', 'back')} />
    <path d="M113,126 L113,174 C110,177 105,178 102,178 L102,126 Z" ${getAttr('lowerBack', 'back')} />
    <path d="M100,124 L100,178" ${divAttr} />

    <!-- Glutes -->
    <path d="M66,178 C62,195 65,221 76,230 C86,231 96,226 99,210 L99,180 C87,177 75,176 66,178 Z" ${getAttr('glutes', 'back')} />
    <path d="M134,178 C138,195 135,221 124,230 C114,231 104,226 101,210 L101,180 C113,177 125,176 134,178 Z" ${getAttr('glutes', 'back')} />
    <path d="M100,179 L100,222" ${divAttr} />

    <!-- Hamstrings -->
    <path d="M72,232 C67,251 66,274 70,290 C76,293 85,293 89,287 C92,268 93,247 93,229 C86,231 79,232 72,232 Z" ${getAttr('hamstrings', 'back')} />
    <path d="M128,232 C133,251 134,274 130,290 C124,293 115,293 111,287 C108,268 107,247 107,229 C114,231 121,232 128,232 Z" ${getAttr('hamstrings', 'back')} />

    <!-- Calves Back -->
    <path d="M69,301 C61,316 60,345 65,370 C69,377 76,377 79,368 C82,345 83,319 83,301 Z" ${getAttr('calves', 'back')} />
    <path d="M131,301 C139,316 140,345 135,370 C131,377 124,377 121,368 C118,345 117,319 117,301 Z" ${getAttr('calves', 'back')} />
  </g>
</svg>
`;
}

export function generateFemaleBodySvgMarkup(
  intensities: Record<BodyRegionId, MuscleIntensity>,
  options: SvgGeneratorOptions = {}
): string {
  const accentColor = options.accentColor || '#374151';
  const prefix = 'female-story-map';

  const getAttr = (regionId: BodyRegionId, side: 'front' | 'back' = 'front', subPart?: string) => {
    const intensity = intensities[regionId] || 'none';
    const attrs = get3DRegionAttrs(prefix, regionId, intensity, side, subPart);
    const filterAttr = attrs.filter ? ` filter="${attrs.filter}"` : '';
    return `fill="${attrs.fill}" stroke="${attrs.stroke}" stroke-width="${attrs.strokeWidth}"${filterAttr}`;
  };

  const baseAttr = `fill="#202026" stroke="#3B3B48" stroke-width="0.75"`;
  const divAttr = `stroke="#2F2F3B" stroke-width="0.7" fill="none" stroke-linecap="round"`;

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 430 420" width="430" height="420" style="background:transparent;">
  ${generate3DDefsMarkup(prefix, accentColor)}

  <!-- ================= FRONT VIEW (x: 0) ================= -->
  <g transform="translate(0, 0)">
    <!-- Base Estrutura Frontal -->
    <path d="M100,16 C108,16 113,23 113,32 C113,41 107,49 100,49 C93,49 87,41 87,32 C87,23 92,16 100,16 Z" ${baseAttr} />
    <path d="M94,47 L106,47 L107,61 L93,61 Z" ${baseAttr} />
    <path d="M25,225 C22,230 23,241 27,244 C30,243 32,235 31,227 Z" ${baseAttr} />
    <path d="M175,225 C178,230 177,241 173,244 C170,243 168,235 169,227 Z" ${baseAttr} />
    <path d="M72,280 C72,277 80,277 80,280 C80,286 72,286 72,280 Z" ${baseAttr} />
    <path d="M120,280 C120,277 128,277 128,280 C128,286 120,286 120,280 Z" ${baseAttr} />
    <path d="M67,380 C67,389 58,393 52,393 C47,393 47,384 55,380 Z" ${baseAttr} />
    <path d="M133,380 C133,389 142,393 148,393 C153,393 153,384 145,380 Z" ${baseAttr} />
    <path d="M84,178 L116,178 L110,200 L90,200 Z" ${baseAttr} />

    <!-- Traps -->
    <path d="M93,51 C86,55 80,59 75,65 L87,66 L93,61 Z" ${getAttr('traps', 'front')} />
    <path d="M107,51 C114,55 120,59 125,65 L113,66 L107,61 Z" ${getAttr('traps', 'front')} />

    <!-- Front Shoulders -->
    <path d="M74,65 C66,68 60,76 57,84 C55,90 58,96 63,99 L71,86 L80,67 Z" ${getAttr('frontShoulders', 'front')} />
    <path d="M126,65 C134,68 140,76 143,84 C145,90 142,96 137,99 L129,86 L120,67 Z" ${getAttr('frontShoulders', 'front')} />

    <!-- Side Shoulders -->
    <path d="M57,80 C51,86 51,94 54,103 C56,106 60,106 62,100 L58,88 Z" ${getAttr('sideShoulders', 'front')} />
    <path d="M143,80 C149,86 149,94 146,103 C144,106 140,106 138,100 L142,88 Z" ${getAttr('sideShoulders', 'front')} />

    <!-- Chest -->
    <path d="M80,67 L98,67 C99,78 98,98 96,109 C87,113 74,111 69,101 C66,89 71,73 80,67 Z" ${getAttr('chest', 'front', 'left')} />
    <path d="M120,67 L102,67 C101,78 102,98 104,109 C113,113 126,111 131,101 C134,89 129,73 120,67 Z" ${getAttr('chest', 'front', 'right')} />
    <path d="M100,67 L100,109" ${divAttr} />

    <!-- Biceps -->
    <path d="M56,104 C50,113 49,132 54,147 C58,149 64,143 65,134 C67,122 63,109 56,104 Z" ${getAttr('biceps', 'front')} />
    <path d="M144,104 C150,113 151,132 146,147 C142,149 136,143 135,134 C133,122 137,109 144,104 Z" ${getAttr('biceps', 'front')} />

    <!-- Forearms -->
    <path d="M52,151 C47,167 40,194 34,219 C33,224 36,227 40,223 C47,205 55,178 59,159 Z" ${getAttr('forearms', 'front')} />
    <path d="M148,151 C153,167 160,194 166,219 C167,224 164,227 160,223 C153,205 145,178 141,159 Z" ${getAttr('forearms', 'front')} />

    <!-- Abs -->
    <path d="M87,114 L98,114 L98,131 L86,131 C85,124 86,118 87,114 Z" ${getAttr('abs', 'front')} />
    <path d="M113,114 L102,114 L102,131 L114,131 C115,124 114,118 113,114 Z" ${getAttr('abs', 'front')} />
    <path d="M86,134 L98,134 L98,152 L85,152 Z" ${getAttr('abs', 'front')} />
    <path d="M114,134 L102,134 L102,152 L115,152 Z" ${getAttr('abs', 'front')} />
    <path d="M86,155 L98,155 L98,176 C91,174 88,167 86,155 Z" ${getAttr('abs', 'front')} />
    <path d="M114,155 L102,155 L102,176 C109,174 112,167 114,155 Z" ${getAttr('abs', 'front')} />
    <path d="M100,114 L100,176" ${divAttr} />
    <path d="M86,133 L114,133" ${divAttr} />
    <path d="M86,154 L114,154" ${divAttr} />

    <!-- Obliques -->
    <path d="M73,116 C76,113 82,113 83,117 L83,167 C77,171 73,162 70,147 C69,132 71,120 73,116 Z" ${getAttr('obliques', 'front')} />
    <path d="M127,116 C124,113 118,113 117,117 L117,167 C123,171 127,162 130,147 C131,132 129,120 127,116 Z" ${getAttr('obliques', 'front')} />

    <!-- Quadriceps -->
    <path d="M71,192 C68,211 66,241 71,272 C76,278 83,278 85,272 C87,251 87,216 85,194 C79,190 74,190 71,192 Z" ${getAttr('quadriceps', 'front')} />
    <path d="M85,198 C87,219 88,250 86,275 C91,280 95,271 96,255 C96,233 93,209 90,196 Z" ${getAttr('quadriceps', 'front')} />
    <path d="M129,192 C132,211 134,241 129,272 C124,278 117,278 115,272 C113,251 113,216 115,194 C121,190 126,190 129,192 Z" ${getAttr('quadriceps', 'front')} />
    <path d="M115,198 C113,219 112,250 114,275 C109,280 105,271 104,255 C104,233 107,209 110,196 Z" ${getAttr('quadriceps', 'front')} />

    <!-- Adductors -->
    <path d="M90,201 C93,215 93,236 90,250 C87,239 86,219 88,201 Z" ${getAttr('adductors', 'front')} />
    <path d="M110,201 C107,215 107,236 110,250 C113,239 114,219 112,201 Z" ${getAttr('adductors', 'front')} />

    <!-- Calves -->
    <path d="M72,292 C65,306 64,335 69,362 C72,367 77,367 79,360 C82,336 83,311 83,292 C78,290 74,290 72,292 Z" ${getAttr('calves', 'front')} />
    <path d="M128,292 C135,306 136,335 131,362 C128,367 123,367 121,360 C118,336 117,311 117,292 C122,290 126,290 128,292 Z" ${getAttr('calves', 'front')} />
  </g>

  <!-- ================= BACK VIEW (x: 220) ================= -->
  <g transform="translate(220, 0)">
    <!-- Base Estrutura Posterior -->
    <path d="M100,16 C108,16 113,23 113,32 C113,41 107,49 100,49 C93,49 87,41 87,32 C87,23 92,16 100,16 Z" ${baseAttr} />
    <path d="M94,47 L106,47 L107,61 L93,61 Z" ${baseAttr} />
    <path d="M25,225 C22,230 23,241 27,244 C30,243 32,235 31,227 Z" ${baseAttr} />
    <path d="M175,225 C178,230 177,241 173,244 C170,243 168,235 169,227 Z" ${baseAttr} />
    <path d="M73,279 C73,276 80,276 80,279 C80,285 73,285 73,279 Z" ${baseAttr} />
    <path d="M119,279 C119,276 127,276 127,279 C127,285 119,285 119,279 Z" ${baseAttr} />
    <path d="M67,380 C67,389 58,393 52,393 C47,393 47,384 55,380 Z" ${baseAttr} />
    <path d="M133,380 C133,389 142,393 148,393 C153,393 153,384 145,380 Z" ${baseAttr} />

    <!-- Traps Back -->
    <path d="M100,48 L78,63 L88,107 L100,122 L112,107 L122,63 Z" ${getAttr('traps', 'back')} />
    <path d="M100,48 L100,122" ${divAttr} />

    <!-- Rear Shoulders -->
    <path d="M75,65 C66,66 58,74 56,85 C55,93 59,99 65,103 L72,88 L78,69 Z" ${getAttr('rearShoulders', 'back')} />
    <path d="M125,65 C134,66 142,74 144,85 C145,93 141,99 135,103 L128,88 L122,69 Z" ${getAttr('rearShoulders', 'back')} />

    <!-- Side Shoulders Back -->
    <path d="M55,83 C49,89 49,98 51,106 C53,109 57,109 60,103 L56,90 Z" ${getAttr('sideShoulders', 'back')} />
    <path d="M145,83 C151,89 151,98 149,106 C147,109 143,109 140,103 L144,90 Z" ${getAttr('sideShoulders', 'back')} />

    <!-- Upper Back -->
    <path d="M88,103 L73,97 C67,100 66,108 67,121 C73,125 82,124 88,120 Z" ${getAttr('upperBack', 'back')} />
    <path d="M112,103 L127,97 C133,100 134,108 133,121 C127,125 118,124 112,120 Z" ${getAttr('upperBack', 'back')} />

    <!-- Lats -->
    <path d="M66,123 C65,137 67,155 72,170 C77,172 82,171 86,167 L88,122 C79,126 71,126 66,123 Z" ${getAttr('lats', 'back')} />
    <path d="M134,123 C135,137 133,155 128,170 C123,172 118,171 114,167 L112,122 C121,126 129,126 134,123 Z" ${getAttr('lats', 'back')} />

    <!-- Triceps -->
    <path d="M55,106 C49,115 48,135 52,149 C57,151 62,145 64,135 C66,124 62,110 55,106 Z" ${getAttr('triceps', 'back')} />
    <path d="M145,106 C151,115 152,135 148,149 C143,151 138,145 136,135 C134,124 138,110 145,106 Z" ${getAttr('triceps', 'back')} />

    <!-- Forearms Back -->
    <path d="M50,154 C45,170 38,196 32,221 C31,226 34,229 38,225 C45,207 54,179 58,160 Z" ${getAttr('forearms', 'back')} />
    <path d="M150,154 C155,170 162,196 168,221 C169,226 166,229 162,225 C155,207 146,179 142,160 Z" ${getAttr('forearms', 'back')} />

    <!-- Lower Back -->
    <path d="M88,125 L88,173 C91,176 95,177 98,177 L98,125 Z" ${getAttr('lowerBack', 'back')} />
    <path d="M112,125 L112,173 C109,176 105,177 102,177 L102,125 Z" ${getAttr('lowerBack', 'back')} />
    <path d="M100,123 L100,177" ${divAttr} />

    <!-- Glutes -->
    <path d="M66,177 C61,194 65,221 76,230 C86,231 96,226 99,210 L99,179 C87,176 75,175 66,177 Z" ${getAttr('glutes', 'back')} />
    <path d="M134,177 C139,194 135,221 124,230 C114,231 104,226 101,210 L101,179 C113,176 125,175 134,177 Z" ${getAttr('glutes', 'back')} />
    <path d="M100,178 L100,222" ${divAttr} />

    <!-- Hamstrings -->
    <path d="M72,232 C67,251 66,274 70,290 C76,293 85,293 89,287 C92,268 93,247 93,229 C86,231 79,232 72,232 Z" ${getAttr('hamstrings', 'back')} />
    <path d="M128,232 C133,251 134,274 130,290 C124,293 115,293 111,287 C108,268 107,247 107,229 C114,231 121,232 128,232 Z" ${getAttr('hamstrings', 'back')} />

    <!-- Calves Back -->
    <path d="M70,301 C62,316 61,345 66,370 C70,377 77,377 79,368 C82,345 83,319 83,301 Z" ${getAttr('calves', 'back')} />
    <path d="M130,301 C138,316 139,345 134,370 C130,377 123,377 121,368 C118,345 117,319 117,301 Z" ${getAttr('calves', 'back')} />
  </g>
</svg>
`;
}

export async function renderSvgToImage(svgMarkup: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

