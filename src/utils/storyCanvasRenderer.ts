import { WorkoutSession, WorkoutSetRecord, PersonalRecord, ExternalStoryData } from '../types';
import { 
  calculateWorkoutDensity, 
  formatWorkoutDuration, 
  formatTonnesOrKg, 
  computeSessionEvolution,
  generateWorkoutHeadline
} from './calculations';
import { getAnimationForExercise, ExerciseAnimationDefinition } from '../services/exerciseAnimationRegistry';

export type StoryTemplateId = 
  | 'minimal'
  | 'performance'
  | 'pr'
  | 'workout'
  | 'tfive_signature'
  | 'motion';

export type StoryStylePreset = StoryTemplateId | 'clean'; // backwards compatibility
export type StoryOverlayPreset = 'glass' | 'clean' | 'red';
export type StoryOverlayFormat = 'strip' | 'card' | 'minimal' | 'exercises';
export type StoryTextColor = 'light' | 'dark';

export interface StoryMotionExerciseItem {
  exerciseId: string;
  exerciseName: string;
  muscleGroup?: string;
  bestWeight?: number;
  bestReps?: number;
  totalSets?: number;
  isPR?: boolean;
  animationId?: string;
}

export interface StoryOverlayOptions {
  templateId?: StoryTemplateId;
  stylePreset?: StoryStylePreset;
  format?: StoryOverlayFormat;
  preset?: StoryOverlayPreset;
  textColor?: StoryTextColor;
  showLogo?: boolean;
  showStudentName: boolean;
  showVolume: boolean;
  showDuration: boolean;
  showDensity?: boolean;
  showSets: boolean;
  showExercisesCount?: boolean;
  showRepsOrDensity?: boolean;
  showPRs: boolean;
  showSlogan: boolean;
  showRoutineTitle: boolean;
  showMuscleTags?: boolean;
  useTonnesForVolume?: boolean;
  customHeadline?: string;
  primaryMuscleLabels?: string[];
  // Story 07 Motion specific options
  motionSelectedExercises?: StoryMotionExerciseItem[];
  motionActiveIndex?: number;
  motionProgress?: number; // 0.0 to 1.0
  // External workout story support
  externalData?: ExternalStoryData;
}

export interface DailyStoryOptions {
  date: string;
  sessions: WorkoutSession[];
  trainerName?: string;
  showTrainerName?: boolean;
  showStudentCount?: boolean;
  showExercises?: boolean;
  showSlogan?: boolean;
  customHeadline?: string;
}

/**
 * Draws a smooth rounded rectangle
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number | number[]
) {
  const r = typeof radius === 'number' ? [radius, radius, radius, radius] : radius;
  ctx.beginPath();
  ctx.moveTo(x + r[0], y);
  ctx.lineTo(x + w - r[1], y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r[1]);
  ctx.lineTo(x + w, y + h - r[2]);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
  ctx.lineTo(x + r[3], y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r[3]);
  ctx.lineTo(x, y + r[0]);
  ctx.quadraticCurveTo(x, y, x + r[0], y);
  ctx.closePath();
}

/**
 * Applies protective shadow to make text crisp on any light or dark photo background
 */
function setCrispTextShadow(ctx: CanvasRenderingContext2D, color: 'light' | 'dark' = 'light') {
  if (color === 'light') {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;
  } else {
    ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
  }
}

function clearShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

/**
 * Extracts only the first name for privacy (e.g., "Rafael Silva" -> "Rafael")
 */
export function getFirstNameOnly(fullName: string): string {
  if (!fullName) return '';
  const first = fullName.trim().split(/\s+/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export interface AutoFitTextOptions {
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  maxLines?: number;
  maxFontSize: number;
  minFontSize?: number;
  fontWeight?: string | number;
  fontFamily?: string;
  lineHeightRatio?: number;
  textAlign?: CanvasTextAlign;
  textBaseline?: CanvasTextBaseline;
  color?: string;
  crispShadow?: 'light' | 'dark' | false;
  draw?: boolean;
}

export interface AutoFitTextResult {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  totalHeight: number;
  endY: number;
}

/**
 * Intelligent Text Auto-Fit Engine for Story Canvas
 * Automatically calculates optimal font size, word wrapping, and balanced line breaking.
 * Strictly guarantees that dynamic text never clips or overflows the container or canvas safe area.
 */
export function drawAutoFitText(
  ctx: CanvasRenderingContext2D,
  options: AutoFitTextOptions
): AutoFitTextResult {
  const {
    text,
    x,
    y,
    maxWidth,
    maxLines = 2,
    maxFontSize,
    minFontSize = Math.max(14, Math.floor(maxFontSize * 0.55)),
    fontWeight = '900',
    fontFamily = 'system-ui, -apple-system, sans-serif',
    lineHeightRatio = 1.18,
    textAlign = 'center',
    textBaseline = 'top',
    color = '#FFFFFF',
    crispShadow = false,
    draw = true
  } = options;

  if (!text || text.trim() === '') {
    return { lines: [], fontSize: maxFontSize, lineHeight: 0, totalHeight: 0, endY: y };
  }

  const cleanText = text.trim().replace(/\s+/g, ' ');
  const words = cleanText.split(' ');

  let bestFontSize = maxFontSize;
  let bestLines: string[] = [cleanText];
  let foundFit = false;

  // Helper to test word wrap at a specific font size
  const testWrap = (size: number): { fits: boolean; lines: string[] } => {
    ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
    
    // Check if any single word alone is wider than maxWidth
    for (const word of words) {
      if (ctx.measureText(word).width > maxWidth) {
        return { fits: false, lines: [] };
      }
    }

    // Try single line first if possible
    const singleLineWidth = ctx.measureText(cleanText).width;
    if (singleLineWidth <= maxWidth) {
      return { fits: true, lines: [cleanText] };
    }

    if (maxLines <= 1) {
      return { fits: false, lines: [cleanText] };
    }

    // Wrap words into lines greedily
    const lines: string[] = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }

    // Try to balance lines if we have 2 lines to avoid orphan single words
    if (lines.length === 2 && words.length >= 3) {
      const mid = Math.ceil(words.length / 2);
      const balanced1 = words.slice(0, mid).join(' ');
      const balanced2 = words.slice(mid).join(' ');
      if (
        ctx.measureText(balanced1).width <= maxWidth &&
        ctx.measureText(balanced2).width <= maxWidth
      ) {
        return { fits: true, lines: [balanced1, balanced2] };
      }
    }

    return {
      fits: lines.length <= maxLines,
      lines: lines
    };
  };

  // Iteratively find optimal font size from maxFontSize down to minFontSize
  for (let sz = maxFontSize; sz >= minFontSize; sz -= 2) {
    const wrapResult = testWrap(sz);
    if (wrapResult.fits) {
      bestFontSize = sz;
      bestLines = wrapResult.lines;
      foundFit = true;
      break;
    }
  }

  // If still not fitting at minFontSize, enforce maxLines
  if (!foundFit) {
    bestFontSize = minFontSize;
    ctx.font = `${fontWeight} ${bestFontSize}px ${fontFamily}`;
    
    const lines: string[] = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? `${currentLine} ${word}` : word;

      if (ctx.measureText(testLine).width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (lines.length < maxLines - 1) {
          lines.push(currentLine || word);
          currentLine = currentLine ? word : '';
        } else {
          currentLine = testLine;
        }
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    
    // Ensure last line doesn't exceed maxWidth
    if (lines.length > 0) {
      let last = lines[lines.length - 1];
      while (ctx.measureText(last).width > maxWidth && last.length > 3) {
        last = last.slice(0, -1);
      }
      lines[lines.length - 1] = last;
    }

    bestLines = lines.slice(0, maxLines);
  }

  const lineHeight = Math.round(bestFontSize * lineHeightRatio);
  const totalHeight = bestLines.length * lineHeight;

  if (draw) {
    ctx.save();
    if (crispShadow) {
      setCrispTextShadow(ctx, crispShadow);
    }
    ctx.fillStyle = color;
    ctx.font = `${fontWeight} ${bestFontSize}px ${fontFamily}`;
    ctx.textAlign = textAlign;
    ctx.textBaseline = textBaseline;

    bestLines.forEach((line, index) => {
      const lineY = y + index * lineHeight;
      ctx.fillText(line, x, lineY);
    });

    if (crispShadow) {
      clearShadow(ctx);
    }
    ctx.restore();
  }

  return {
    lines: bestLines,
    fontSize: bestFontSize,
    lineHeight,
    totalHeight,
    endY: y + totalHeight
  };
}

/**
 * Main Transparent PNG Workout Overlay Generator
 * Resolution: 1080 × 1920 px (9:16 Aspect Ratio)
 * Guarantees 100% Alpha Transparency on the root canvas for transparent templates.
 */
export async function generateTransparentWorkoutOverlay(
  session: WorkoutSession | null | undefined,
  allSessions: WorkoutSession[],
  options: StoryOverlayOptions
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  
  // Standard Instagram Story 9:16 Canvas Resolution
  const width = 1080;
  const height = 1920;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) throw new Error('Could not get canvas 2d context with alpha transparency');

  // CRITICAL: Pure transparency initialization (DO NOT fill background!)
  ctx.clearRect(0, 0, width, height);

  const ext = options.externalData;
  const isExternal = Boolean(ext);

  // Dynamic metrics extraction (handles both TFIVE sessions and external manual workouts)
  let totalSets = 0;
  let hasSets = false;
  let totalVolume = 0;
  let hasVolume = false;
  let volumeFormatted = '';
  let durationSec = 0;
  let hasDuration = false;
  let durationFormatted = '';
  let exercisesCount = 0;
  let hasExercises = false;
  let caloriesFormatted = '';
  let hasCalories = false;
  let prsCount = 0;
  let highlightText = '';
  let rawStudentName = '';
  let routineOrWorkoutName = '';
  let densityKgMin = 0;
  let uniqueExercises: { name: string; muscle: string; bestWeight: number; bestReps: number; isPR?: boolean }[] = [];

  if (isExternal && ext) {
    rawStudentName = ext.studentName?.trim() || '';
    routineOrWorkoutName = ext.workoutName?.trim() || '';
    if (ext.highlight && ext.highlight.trim()) {
      highlightText = ext.highlight.trim().toUpperCase();
    }

    // 1. Volume
    if (ext.volume !== undefined && ext.volume !== null && String(ext.volume).trim() !== '') {
      const volStr = String(ext.volume).trim();
      const numMatch = volStr.replace(/\./g, '').replace(/,/g, '.').match(/[\d.]+/);
      const parsedNum = numMatch ? parseFloat(numMatch[0]) : 0;
      totalVolume = parsedNum;
      
      if (/ton|t\b/i.test(volStr) && parsedNum < 1000) {
        totalVolume = parsedNum * 1000;
      }
      
      if (volStr.toUpperCase().includes('KG') || volStr.toUpperCase().includes('T')) {
        volumeFormatted = volStr.toUpperCase();
      } else if (options.useTonnesForVolume && totalVolume >= 1000) {
        volumeFormatted = `${(totalVolume / 1000).toFixed(2).replace('.', ',')} T`;
      } else if (parsedNum > 0) {
        volumeFormatted = `${parsedNum.toLocaleString('pt-BR')} KG`;
      } else {
        volumeFormatted = volStr.toUpperCase();
      }
      hasVolume = Boolean(volumeFormatted && volumeFormatted !== '0 KG' && volumeFormatted !== '0');
    }

    // 2. Duration
    if (ext.duration !== undefined && ext.duration !== null && String(ext.duration).trim() !== '') {
      const durStr = String(ext.duration).trim();
      if (/^\d+$/.test(durStr)) {
        durationFormatted = `${durStr} MIN`;
        durationSec = parseInt(durStr, 10) * 60;
      } else {
        durationFormatted = durStr.toUpperCase();
        const m = durStr.match(/(\d+)/);
        if (m) durationSec = parseInt(m[1], 10) * 60;
      }
      hasDuration = Boolean(durationFormatted);
    }

    // 3. Sets
    if (ext.setCount !== undefined && ext.setCount !== null && String(ext.setCount).trim() !== '') {
      const sStr = String(ext.setCount).trim();
      const num = parseInt(sStr.replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > 0) {
        totalSets = num;
        hasSets = true;
      }
    }

    // 4. Exercises
    if (ext.exerciseCount !== undefined && ext.exerciseCount !== null && String(ext.exerciseCount).trim() !== '') {
      const exStr = String(ext.exerciseCount).trim();
      const num = parseInt(exStr.replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > 0) {
        exercisesCount = num;
        hasExercises = true;
      }
    }

    // 5. Calories
    if (ext.calories !== undefined && ext.calories !== null && String(ext.calories).trim() !== '') {
      const calStr = String(ext.calories).trim();
      if (/^\d+$/.test(calStr)) {
        caloriesFormatted = `${calStr} KCAL`;
      } else {
        caloriesFormatted = calStr.toUpperCase();
      }
      hasCalories = Boolean(caloriesFormatted);
    }
  } else if (session) {
    rawStudentName = session.studentName || '';
    routineOrWorkoutName = session.routineName || session.routineTitle || '';
    const safeSets = Array.isArray(session.sets) ? session.sets : [];
    const validSets = safeSets.filter((s) => s && !s.isWarmup && s.status !== 'skipped');
    totalSets = validSets.length;
    hasSets = totalSets > 0;
    totalVolume = session.totalVolume || 0;
    hasVolume = totalVolume > 0;
    durationSec = session.durationSeconds || 0;
    hasDuration = durationSec > 0;
    densityKgMin = calculateWorkoutDensity(totalVolume, durationSec, true);
    durationFormatted = formatWorkoutDuration(durationSec).toUpperCase();
    volumeFormatted = options.useTonnesForVolume && totalVolume >= 1000
      ? `${(totalVolume / 1000).toFixed(2).replace('.', ',')} T`
      : `${totalVolume.toLocaleString('pt-BR')} KG`;

    const exerciseMap = new Map<string, { name: string; muscle: string; bestWeight: number; bestReps: number; isPR?: boolean }>();
    for (const set of validSets) {
      const existing = exerciseMap.get(set.exerciseId);
      if (!existing || set.weightKg > existing.bestWeight || (set.weightKg === existing.bestWeight && set.actualReps > existing.bestReps)) {
        exerciseMap.set(set.exerciseId, {
          name: set.exerciseName,
          muscle: set.muscleGroup,
          bestWeight: set.weightKg,
          bestReps: set.actualReps,
          isPR: set.isPR
        });
      }
    }
    uniqueExercises = Array.from(exerciseMap.values());
    exercisesCount = uniqueExercises.length;
    hasExercises = exercisesCount > 0;
  }

  const evolution = session 
    ? computeSessionEvolution(session, allSessions || []) 
    : { totalPRs: 0, deltaVolumePercent: 0, isHeaviestSession: false, totalWeightIncreaseKg: 0, evolutions: [] };

  if (session) {
    prsCount = session.prsAchieved?.length || evolution.totalPRs || 0;
  }

  // Headline & Student Identity
  const firstName = getFirstNameOnly(rawStudentName);
  const showStudent = Boolean(options.showStudentName && firstName);
  const workoutTitle = (routineOrWorkoutName.trim() || highlightText.trim() || 'TREINO CONCLUÍDO').toUpperCase();
  const athleteHeader = showStudent ? `${firstName} • ${workoutTitle}` : workoutTitle;
  const showOrigin = Boolean(isExternal && ext?.showOrigin && ext?.originApp);

  // Normalize template selection (defaults to minimal)
  const activeTemplate: StoryTemplateId = options.templateId || (
    options.stylePreset === 'clean' ? 'minimal' :
    options.stylePreset === 'performance' ? 'performance' :
    options.stylePreset === 'pr' ? 'pr' :
    options.stylePreset === 'workout' ? 'workout' :
    options.stylePreset === 'tfive_signature' ? 'tfive_signature' :
    options.stylePreset === 'motion' ? 'motion' :
    'minimal'
  );

  // --------------------------------------------------------------------------
  // TEMPLATE 01: MINIMAL (Ultra-clean athletic transparent overlay)
  // --------------------------------------------------------------------------
  if (activeTemplate === 'minimal') {
    let curY = 260;

    // 1. Top Header: TFIVE PRO Brandmark
    if (options.showLogo !== false) {
      setCrispTextShadow(ctx, 'light');
      ctx.font = '900 42px system-ui, -apple-system, sans-serif';
      const tfiveWidth = ctx.measureText('TFIVE ').width;
      const proWidth = ctx.measureText('PRO').width;
      const startX = width / 2 - (tfiveWidth + proWidth) / 2;

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('TFIVE ', startX, curY);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillText('PRO', startX + tfiveWidth, curY);

      // Subtle red accent line under logo
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(startX, curY + 30);
      ctx.lineTo(startX + tfiveWidth + proWidth, curY + 30);
      ctx.stroke();
      clearShadow(ctx);

      curY += 120;
    }

    // 2. Workout Title / Student Focus in Bold Editorial Display
    if (options.showRoutineTitle !== false) {
      if (showStudent) {
        setCrispTextShadow(ctx, 'light');
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '800 22px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`TREINO DE ${firstName.toUpperCase()}`, width / 2, curY);
        clearShadow(ctx);
        curY += 34;
      }

      const titleFit = drawAutoFitText(ctx, {
        text: workoutTitle,
        x: width / 2,
        y: curY,
        maxWidth: 920,
        maxLines: 2,
        maxFontSize: 72,
        minFontSize: 44,
        fontWeight: '900',
        color: '#FFFFFF',
        textAlign: 'center',
        crispShadow: 'light'
      });
      curY += titleFit.totalHeight + 20;

      // Primary muscle focus tags line
      if (options.showMuscleTags !== false && options.primaryMuscleLabels && options.primaryMuscleLabels.length > 0) {
        const focusText = options.primaryMuscleLabels.slice(0, 4).join('  •  ').toUpperCase();
        const focusFit = drawAutoFitText(ctx, {
          text: focusText,
          x: width / 2,
          y: curY,
          maxWidth: 920,
          maxLines: 2,
          maxFontSize: 24,
          minFontSize: 16,
          fontWeight: '900',
          color: '#FFFFFF',
          textAlign: 'center',
          crispShadow: 'light'
        });
        curY += focusFit.totalHeight + 40;
      }
    }

    // 3. Central Typographic Hero Focus (Volume Monumental or Highlight)
    if (hasVolume && options.showVolume !== false) {
      curY += 40;
      setCrispTextShadow(ctx, 'light');
      ctx.fillStyle = '#A1A1AA';
      ctx.font = '800 22px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('VOLUME TOTAL MOVIMENTADO', width / 2, curY);

      curY += 38;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 130px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(volumeFormatted, width / 2, curY);
      clearShadow(ctx);

      curY += 160;
    } else if (highlightText) {
      curY += 60;
      setCrispTextShadow(ctx, 'light');
      drawAutoFitText(ctx, {
        text: highlightText,
        x: width / 2,
        y: curY,
        maxWidth: 900,
        maxLines: 2,
        maxFontSize: 80,
        minFontSize: 46,
        fontWeight: '900',
        color: '#FFFFFF',
        textAlign: 'center',
        crispShadow: 'light'
      });
      clearShadow(ctx);
      curY += 140;
    } else {
      curY += 60;
    }

    // 4. Hero Typographic Supporting Metrics Bar (Only renders existing fields!)
    const items: { val: string; label: string; highlight?: boolean }[] = [];
    if (options.showDuration !== false && hasDuration) {
      items.push({ val: durationFormatted, label: 'DURAÇÃO' });
    }
    if (options.showSets !== false && hasSets) {
      items.push({ val: `${totalSets}`, label: 'SÉRIES TOTAIS' });
    }
    if (hasCalories) {
      items.push({ val: caloriesFormatted, label: 'CALORIAS' });
    } else if (options.showExercisesCount !== false && hasExercises) {
      items.push({ val: `${exercisesCount}`, label: 'EXERCÍCIOS' });
    } else if (!isExternal && densityKgMin > 0) {
      items.push({ val: `${densityKgMin}`, label: 'DENSIDADE (KG/MIN)' });
    }

    if (items.length > 0) {
      const colWidth = 920 / items.length;
      const startColX = (width - 920) / 2;

      // Divider line above metrics
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startColX, curY);
      ctx.lineTo(startColX + 920, curY);
      ctx.stroke();

      curY += 45;

      items.forEach((it, idx) => {
        const colCenterX = startColX + (idx * colWidth) + (colWidth / 2);
        setCrispTextShadow(ctx, 'light');
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 58px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(it.val, colCenterX, curY);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.font = '800 20px system-ui, -apple-system, sans-serif';
        ctx.fillText(it.label, colCenterX, curY + 70);
        clearShadow(ctx);
      });
    }

    // 5. Highlight / PR Pill if exists
    if (highlightText && hasVolume) {
      curY += 150;
      setCrispTextShadow(ctx, 'light');
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      const pillW = Math.min(840, Math.max(340, ctx.measureText(highlightText).width + 60));
      roundRect(ctx, width / 2 - pillW / 2, curY, pillW, 56, 28);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 22px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(highlightText, width / 2, curY + 28);
      clearShadow(ctx);
    } else if (options.showPRs && prsCount > 0) {
      curY += 150;
      setCrispTextShadow(ctx, 'light');
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      roundRect(ctx, width / 2 - 240, curY, 480, 56, 28);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 22px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`🏆 ${prsCount} ${prsCount === 1 ? 'NOVO RECORDE (PR)' : 'NOVOS RECORDES (PR)'}`, width / 2, curY + 28);
      clearShadow(ctx);
    }

    // 6. Origin Attribution (Optional)
    if (showOrigin && ext?.originApp) {
      setCrispTextShadow(ctx, 'light');
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '800 16px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`REGISTRADO VIA ${ext.originApp.toUpperCase()}`, width / 2, height - 165);
      clearShadow(ctx);
    }

    // 7. Footer Slogan / Tagline
    if (options.showSlogan !== false) {
      setCrispTextShadow(ctx, 'light');
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '800 20px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TFIVE PRO  •  PERFORMANCE SEM DESCULPAS', width / 2, height - 120);
      clearShadow(ctx);
    }

    return canvas;
  }

  // --------------------------------------------------------------------------
  // TEMPLATE 02: PERFORMANCE (Focus: Total Volume or Colossal Primary Metric)
  // --------------------------------------------------------------------------
  if (activeTemplate === 'performance') {
    let curY = 240;

    // 1. Top Header: TFIVE PRO Brandmark
    if (options.showLogo !== false) {
      setCrispTextShadow(ctx, 'light');
      ctx.font = '900 42px system-ui, -apple-system, sans-serif';
      const tfiveWidth = ctx.measureText('TFIVE ').width;
      const proWidth = ctx.measureText('PRO').width;
      const startX = width / 2 - (tfiveWidth + proWidth) / 2;

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('TFIVE ', startX, curY);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillText('PRO', startX + tfiveWidth, curY);

      // Subtle red accent line under logo
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(startX, curY + 30);
      ctx.lineTo(startX + tfiveWidth + proWidth, curY + 30);
      ctx.stroke();
      clearShadow(ctx);

      curY += 130;
    }

    // 2. Central Protagonist: Colossal Metric in TFIVE Red (No empty 0 KG)
    curY += 20;
    setCrispTextShadow(ctx, 'light');
    
    if (hasVolume && options.showVolume !== false) {
      const rawVolumeStr = totalVolume >= 10000 && options.useTonnesForVolume
        ? (totalVolume / 1000).toFixed(1).replace('.', ',')
        : (totalVolume > 0 ? totalVolume.toLocaleString('pt-BR') : volumeFormatted);
      const unitStr = totalVolume >= 10000 && options.useTonnesForVolume ? 'TONELADAS' : 'KG';

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 180px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(rawVolumeStr, width / 2, curY);

      curY += 175;

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 52px system-ui, -apple-system, sans-serif';
      ctx.fillText(unitStr, width / 2, curY);

      curY += 70;

      ctx.fillStyle = '#A1A1AA';
      ctx.font = '800 24px system-ui, -apple-system, sans-serif';
      ctx.fillText('VOLUME TOTAL', width / 2, curY);
      clearShadow(ctx);
      curY += 130;
    } else if (hasDuration) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 160px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(durationFormatted, width / 2, curY);

      curY += 165;

      ctx.fillStyle = '#A1A1AA';
      ctx.font = '800 24px system-ui, -apple-system, sans-serif';
      ctx.fillText('DURAÇÃO TOTAL DO TREINO', width / 2, curY);
      clearShadow(ctx);
      curY += 130;
    } else if (hasExercises) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 180px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${exercisesCount}`, width / 2, curY);

      curY += 175;

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 52px system-ui, -apple-system, sans-serif';
      ctx.fillText('EXERCÍCIOS', width / 2, curY);

      curY += 70;

      ctx.fillStyle = '#A1A1AA';
      ctx.font = '800 24px system-ui, -apple-system, sans-serif';
      ctx.fillText('TOTAL EXECUTADO', width / 2, curY);
      clearShadow(ctx);
      curY += 130;
    } else if (highlightText) {
      ctx.fillStyle = '#FFFFFF';
      drawAutoFitText(ctx, {
        text: highlightText,
        x: width / 2,
        y: curY,
        maxWidth: 900,
        maxLines: 2,
        maxFontSize: 110,
        minFontSize: 54,
        fontWeight: '900',
        color: '#FFFFFF',
        textAlign: 'center',
        crispShadow: 'light'
      });
      clearShadow(ctx);
      curY += 180;
    } else {
      curY += 60;
    }

    // 3. Supporting Metrics Bar (Clean editorial typography, only existing items)
    const metricsStartX = 100;
    const metricsWidth = width - 200;

    const perfItems: { val: string; label: string }[] = [];
    if (hasDuration && hasVolume) {
      perfItems.push({ val: durationFormatted, label: 'DURAÇÃO' });
    }
    if (hasSets) {
      perfItems.push({ val: `${totalSets} SÉRIES`, label: 'SÉRIES TOTAIS' });
    }
    if (hasExercises && (hasVolume || hasDuration)) {
      perfItems.push({ val: `${exercisesCount} EXERCÍCIOS`, label: 'EXERCÍCIOS' });
    }
    if (hasCalories) {
      perfItems.push({ val: caloriesFormatted, label: 'CALORIAS' });
    }

    if (perfItems.length > 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(metricsStartX, curY);
      ctx.lineTo(metricsStartX + metricsWidth, curY);
      ctx.stroke();

      curY += 45;

      const colW = metricsWidth / perfItems.length;
      perfItems.forEach((it, idx) => {
        const cx = metricsStartX + idx * colW + colW / 2;
        setCrispTextShadow(ctx, 'light');
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 48px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(it.val, cx, curY);

        ctx.fillStyle = '#A1A1AA';
        ctx.font = '800 18px system-ui, -apple-system, sans-serif';
        ctx.fillText(it.label, cx, curY + 60);
        clearShadow(ctx);
      });

      curY += 160;
    }

    // 4. Workout Identity & Muscle Groups (Clean, spacious, high-contrast)
    if (options.showRoutineTitle !== false) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 80, curY);
      ctx.lineTo(width / 2 + 80, curY);
      ctx.stroke();

      curY += 40;

      if (showStudent) {
        setCrispTextShadow(ctx, 'light');
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '800 22px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`TREINO DE ${firstName.toUpperCase()}`, width / 2, curY);
        clearShadow(ctx);
        curY += 32;
      }

      const titleFit = drawAutoFitText(ctx, {
        text: workoutTitle,
        x: width / 2,
        y: curY,
        maxWidth: 900,
        maxLines: 2,
        maxFontSize: 64,
        minFontSize: 38,
        fontWeight: '900',
        color: '#FFFFFF',
        textAlign: 'center',
        crispShadow: 'light'
      });

      curY += titleFit.totalHeight + 16;

      if (options.showMuscleTags !== false && options.primaryMuscleLabels && options.primaryMuscleLabels.length > 0) {
        const musclesStr = options.primaryMuscleLabels.slice(0, 3).join('  +  ').toUpperCase();
        drawAutoFitText(ctx, {
          text: musclesStr,
          x: width / 2,
          y: curY,
          maxWidth: 900,
          maxLines: 1,
          maxFontSize: 32,
          minFontSize: 20,
          fontWeight: '900',
          color: '#FFFFFF',
          textAlign: 'center',
          crispShadow: 'light'
        });
      }
    }

    // 5. Origin attribution (Optional)
    if (showOrigin && ext?.originApp) {
      setCrispTextShadow(ctx, 'light');
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '800 16px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`REGISTRADO VIA ${ext.originApp.toUpperCase()}`, width / 2, height - 165);
      clearShadow(ctx);
    }

    // 6. Footer Tagline
    if (options.showSlogan !== false) {
      setCrispTextShadow(ctx, 'light');
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '800 20px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TFIVE PRO  •  PERFORMANCE SEM DESCULPAS', width / 2, height - 120);
      clearShadow(ctx);
    }

    return canvas;
  }

  // --------------------------------------------------------------------------
  // TEMPLATE 03: PR (Focus: Personal Record / Monumental Weight or Lift)
  // --------------------------------------------------------------------------
  if (activeTemplate === 'pr') {
    let curY = 240;

    // 1. Top Header: TFIVE PRO Brandmark
    if (options.showLogo !== false) {
      setCrispTextShadow(ctx, 'light');
      ctx.font = '900 42px system-ui, -apple-system, sans-serif';
      const tfiveWidth = ctx.measureText('TFIVE ').width;
      const proWidth = ctx.measureText('PRO').width;
      const startX = width / 2 - (tfiveWidth + proWidth) / 2;

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('TFIVE ', startX, curY);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillText('PRO', startX + tfiveWidth, curY);
      clearShadow(ctx);

      curY += 90;
    }

    // 2. Sub-Header: NOVO PR Badge
    setCrispTextShadow(ctx, 'light');
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 36px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(highlightText ? 'DESTAQUE DO TREINO' : 'NOVO PR', width / 2, curY);
    clearShadow(ctx);

    curY += 100;

    // 3. Protagonist: Enormous PR Weight Load or Lift
    const firstPR = session?.prsAchieved && session.prsAchieved.length > 0 ? session.prsAchieved[0] : null;
    const prExerciseName = (firstPR?.exerciseName || highlightText || workoutTitle || 'EXERCÍCIO PRINCIPAL').toUpperCase();
    const prWeightVal = firstPR?.weightKg 
      ? `${firstPR.weightKg} KG` 
      : (hasVolume ? volumeFormatted : (hasSets ? `${totalSets} SÉRIES` : (hasDuration ? durationFormatted : 'RECORD')));
    const prRepsVal = firstPR?.reps 
      ? `${firstPR.reps} REPETIÇÕES` 
      : (hasSets && hasVolume ? `${totalSets} SÉRIES TOTAIS` : (hasDuration ? `${durationFormatted} CONCLUÍDOS` : ''));

    setCrispTextShadow(ctx, 'light');
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 180px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(prWeightVal, width / 2, curY);
    clearShadow(ctx);

    curY += 210;

    // 4. Exercise Name with Intelligent Auto-Fit
    const exFit = drawAutoFitText(ctx, {
      text: prExerciseName,
      x: width / 2,
      y: curY,
      maxWidth: 920,
      maxLines: 3,
      maxFontSize: 60,
      minFontSize: 36,
      fontWeight: '900',
      color: '#FFFFFF',
      textAlign: 'center',
      crispShadow: 'light'
    });

    curY += exFit.totalHeight + 28;

    // Reps line
    if (prRepsVal) {
      setCrispTextShadow(ctx, 'light');
      ctx.fillStyle = '#A1A1AA';
      ctx.font = '800 32px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(prRepsVal, width / 2, curY);
      clearShadow(ctx);
      curY += 120;
    } else {
      curY += 60;
    }

    // 5. Workout Context
    if (options.showRoutineTitle !== false) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 120, curY);
      ctx.lineTo(width / 2 + 120, curY);
      ctx.stroke();

      curY += 36;

      drawAutoFitText(ctx, {
        text: workoutTitle,
        x: width / 2,
        y: curY,
        maxWidth: 900,
        maxLines: 1,
        maxFontSize: 44,
        minFontSize: 28,
        fontWeight: '900',
        color: '#FFFFFF',
        textAlign: 'center',
        crispShadow: 'light'
      });

      curY += 60;
    }

    // 6. Other PRs Notice
    if (session?.prsAchieved && session.prsAchieved.length > 1) {
      const othersCount = session.prsAchieved.length - 1;
      setCrispTextShadow(ctx, 'light');
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 22px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`+ ${othersCount} ${othersCount === 1 ? 'OUTRO RECORDE BATIDO HOJE' : 'OUTROS RECORDES BATIDOS HOJE'}`, width / 2, curY);
      clearShadow(ctx);
    }

    // 7. Origin attribution (Optional)
    if (showOrigin && ext?.originApp) {
      setCrispTextShadow(ctx, 'light');
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '800 16px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`REGISTRADO VIA ${ext.originApp.toUpperCase()}`, width / 2, height - 165);
      clearShadow(ctx);
    }

    // 8. Footer Tagline
    if (options.showSlogan !== false) {
      setCrispTextShadow(ctx, 'light');
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '800 20px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('EVOLUÇÃO CONSTANTE  •  TFIVE PRO', width / 2, height - 120);
      clearShadow(ctx);
    }

    return canvas;
  }

  // --------------------------------------------------------------------------
  // TEMPLATE 04: WORKOUT (Focus: Workout Completed Editorial Composition)
  // --------------------------------------------------------------------------
  if (activeTemplate === 'workout') {
    let curY = 240;

    // 1. Top Header: TFIVE PRO Brandmark
    if (options.showLogo !== false) {
      setCrispTextShadow(ctx, 'light');
      ctx.font = '900 42px system-ui, -apple-system, sans-serif';
      const tfiveWidth = ctx.measureText('TFIVE ').width;
      const proWidth = ctx.measureText('PRO').width;
      const startX = width / 2 - (tfiveWidth + proWidth) / 2;

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('TFIVE ', startX, curY);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillText('PRO', startX + tfiveWidth, curY);
      clearShadow(ctx);

      curY += 100;
    }

    // 2. Editorial Title: TREINO CONCLUÍDO or Custom Highlight
    setCrispTextShadow(ctx, 'light');
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 68px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    if (highlightText && highlightText !== 'TREINO CONCLUÍDO') {
      drawAutoFitText(ctx, {
        text: highlightText,
        x: width / 2,
        y: curY,
        maxWidth: 900,
        maxLines: 2,
        maxFontSize: 68,
        minFontSize: 42,
        fontWeight: '900',
        color: '#FFFFFF',
        textAlign: 'center',
        crispShadow: 'light'
      });
      curY += 100;
    } else {
      ctx.fillText('TREINO', width / 2, curY);
      curY += 76;
      ctx.fillText('CONCLUÍDO', width / 2, curY);
      curY += 130;
    }
    clearShadow(ctx);

    // 3. Routine Letter & Muscle Groups Focus
    if (showStudent) {
      setCrispTextShadow(ctx, 'light');
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '800 22px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`TREINO DE ${firstName.toUpperCase()}`, width / 2, curY);
      clearShadow(ctx);
      curY += 32;
    }

    const titleFit = drawAutoFitText(ctx, {
      text: workoutTitle,
      x: width / 2,
      y: curY,
      maxWidth: 900,
      maxLines: 2,
      maxFontSize: 64,
      minFontSize: 40,
      fontWeight: '900',
      color: '#FFFFFF',
      textAlign: 'center',
      crispShadow: 'light'
    });

    curY += titleFit.totalHeight + 20;

    if (options.showMuscleTags !== false && options.primaryMuscleLabels && options.primaryMuscleLabels.length > 0) {
      const musclesStr = options.primaryMuscleLabels.slice(0, 3).join('  +  ').toUpperCase();
      const muscleFit = drawAutoFitText(ctx, {
        text: musclesStr,
        x: width / 2,
        y: curY,
        maxWidth: 900,
        maxLines: 1,
        maxFontSize: 36,
        minFontSize: 24,
        fontWeight: '900',
        color: '#FFFFFF',
        textAlign: 'center',
        crispShadow: 'light'
      });
      curY += muscleFit.totalHeight + 40;
    } else {
      curY += 20;
    }

    // 4. Clean Metrics Horizontal Row (Only non-empty values!)
    const rowItems: string[] = [];
    if (options.showDuration !== false && hasDuration) rowItems.push(durationFormatted);
    if (options.showVolume !== false && hasVolume) rowItems.push(volumeFormatted);
    if (options.showSets !== false && hasSets) rowItems.push(`${totalSets} SÉRIES`);
    if (options.showExercisesCount !== false && hasExercises) rowItems.push(`${exercisesCount} EXERCÍCIOS`);
    if (hasCalories) rowItems.push(caloriesFormatted);

    if (rowItems.length > 0) {
      const metricsStartX = 100;
      const metricsWidth = width - 200;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(metricsStartX, curY);
      ctx.lineTo(metricsStartX + metricsWidth, curY);
      ctx.stroke();

      curY += 36;

      const metricsRowText = rowItems.join('    •    ');
      setCrispTextShadow(ctx, 'light');
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 40px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(metricsRowText, width / 2, curY);
      clearShadow(ctx);

      curY += 100;
    }

    // 5. Featured Exercises Names Showcase (Only if exercises exist)
    const topThreeEx = uniqueExercises.slice(0, 3);
    if (topThreeEx.length > 0) {
      curY += 20;
      topThreeEx.forEach((ex) => {
        const exFit = drawAutoFitText(ctx, {
          text: ex.name.toUpperCase(),
          x: width / 2,
          y: curY,
          maxWidth: 880,
          maxLines: 1,
          maxFontSize: 36,
          minFontSize: 24,
          fontWeight: '900',
          color: '#FFFFFF',
          textAlign: 'center',
          crispShadow: 'light'
        });
        curY += exFit.totalHeight + 24;
      });
    }

    // 6. Origin attribution (Optional)
    if (showOrigin && ext?.originApp) {
      setCrispTextShadow(ctx, 'light');
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '800 16px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`REGISTRADO VIA ${ext.originApp.toUpperCase()}`, width / 2, height - 165);
      clearShadow(ctx);
    }

    // 7. Footer Slogan
    if (options.showSlogan !== false) {
      setCrispTextShadow(ctx, 'light');
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '800 20px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TFIVE PRO  •  EXCELÊNCIA EM CADA SÉRIE', width / 2, height - 120);
      clearShadow(ctx);
    }

    return canvas;
  }

  // --------------------------------------------------------------------------
  // TEMPLATE 05: TFIVE SIGNATURE (Focus: Brand Masterpiece + Performance)
  // --------------------------------------------------------------------------
  if (activeTemplate === 'tfive_signature') {
    // 1. Signature Lateral Red Accent Line (Official TFIVE vertical line)
    const lineX = 90;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(lineX, 220);
    ctx.lineTo(lineX, height - 200);
    ctx.stroke();
    ctx.restore();

    const contentX = 140;
    let curY = 240;

    // 2. Brandmark Stacked High-Impact
    setCrispTextShadow(ctx, 'light');
    ctx.font = '900 60px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('TFIVE', contentX, curY);
    curY += 68;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('PRO', contentX, curY);
    clearShadow(ctx);

    curY += 130;

    // 3. Routine Title & Muscles
    if (showStudent) {
      setCrispTextShadow(ctx, 'light');
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '800 22px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`TREINO DE ${firstName.toUpperCase()}`, contentX, curY);
      clearShadow(ctx);
      curY += 32;
    }

    const titleFit = drawAutoFitText(ctx, {
      text: workoutTitle,
      x: contentX,
      y: curY,
      maxWidth: 820,
      maxLines: 2,
      maxFontSize: 60,
      minFontSize: 38,
      fontWeight: '900',
      color: '#FFFFFF',
      textAlign: 'left',
      crispShadow: 'light'
    });

    curY += titleFit.totalHeight + 16;

    if (options.showMuscleTags !== false && options.primaryMuscleLabels && options.primaryMuscleLabels.length > 0) {
      const musclesStr = options.primaryMuscleLabels.slice(0, 3).join('  +  ').toUpperCase();
      const muscleFit = drawAutoFitText(ctx, {
        text: musclesStr,
        x: contentX,
        y: curY,
        maxWidth: 820,
        maxLines: 1,
        maxFontSize: 34,
        minFontSize: 22,
        fontWeight: '900',
        color: '#FFFFFF',
        textAlign: 'left',
        crispShadow: 'light'
      });
      curY += muscleFit.totalHeight + 60;
    } else {
      curY += 50;
    }

    // 4. Sculpted Metrics (Volume Total, Duração, Séries - Adapts to available data!)
    setCrispTextShadow(ctx, 'light');
    if (hasVolume && options.showVolume !== false) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 100px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(volumeFormatted, contentX, curY);

      curY += 110;

      ctx.fillStyle = '#A1A1AA';
      ctx.font = '800 24px system-ui, -apple-system, sans-serif';
      ctx.fillText('VOLUME TOTAL', contentX, curY);

      curY += 75;
    } else if (hasDuration) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 100px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(durationFormatted, contentX, curY);

      curY += 110;

      ctx.fillStyle = '#A1A1AA';
      ctx.font = '800 24px system-ui, -apple-system, sans-serif';
      ctx.fillText('DURAÇÃO TOTAL', contentX, curY);

      curY += 75;
    } else if (hasExercises) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 100px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`${exercisesCount} EXERCÍCIOS`, contentX, curY);

      curY += 110;

      ctx.fillStyle = '#A1A1AA';
      ctx.font = '800 24px system-ui, -apple-system, sans-serif';
      ctx.fillText('TOTAL EXECUTADO', contentX, curY);

      curY += 75;
    }

    // Supporting line (duration / sets / exercises / calories)
    const sigSubItems: string[] = [];
    if (hasDuration && hasVolume) sigSubItems.push(durationFormatted);
    if (hasSets) sigSubItems.push(`${totalSets} SÉRIES`);
    if (hasExercises && !sigSubItems.includes(`${exercisesCount} EXERCÍCIOS`)) sigSubItems.push(`${exercisesCount} EXERCÍCIOS`);
    if (hasCalories) sigSubItems.push(caloriesFormatted);

    if (sigSubItems.length > 0) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 52px system-ui, -apple-system, sans-serif';
      ctx.fillText(sigSubItems.join('    •    '), contentX, curY);
      clearShadow(ctx);
      curY += 150;
    } else {
      clearShadow(ctx);
      curY += 80;
    }

    // 5. Origin attribution (Optional)
    if (showOrigin && ext?.originApp) {
      setCrispTextShadow(ctx, 'light');
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '800 18px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`FONTE: ${ext.originApp.toUpperCase()}`, contentX, curY);
      clearShadow(ctx);
      curY += 40;
    }

    // 6. Official Signature Manifesto
    setCrispTextShadow(ctx, 'light');
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 56px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('PERFORMANCE', contentX, curY);

    curY += 66;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('SEM DESCULPAS.', contentX, curY);
    clearShadow(ctx);

    return canvas;
  }

  // --------------------------------------------------------------------------
  // TEMPLATE 07: MOTION (3D Athletic Avatar Biomechanical Movement & Real Data)
  // --------------------------------------------------------------------------
  if (activeTemplate === 'motion') {
    let curY = 180;

    // 1. Top Story Segment Progress Indicators (if 2 or 3 exercises selected)
    const motionItems: StoryMotionExerciseItem[] = (options.motionSelectedExercises && options.motionSelectedExercises.length > 0)
      ? options.motionSelectedExercises
      : uniqueExercises.slice(0, 3).map(ue => ({
          exerciseId: ue.name,
          exerciseName: ue.name,
          muscleGroup: ue.muscle,
          bestWeight: ue.bestWeight,
          bestReps: ue.bestReps,
          isPR: ue.isPR
        }));

    const activeIdx = Math.min(Math.max(0, options.motionActiveIndex || 0), Math.max(0, motionItems.length - 1));
    const activeItem = motionItems[activeIdx] || motionItems[0] || {
      exerciseId: 'ex-001',
      exerciseName: 'SUPINO RETO',
      muscleGroup: 'Peitoral',
      bestWeight: 80,
      bestReps: 10
    };

    if (motionItems.length > 1) {
      const segWidth = (920 - (motionItems.length - 1) * 16) / motionItems.length;
      const startSegX = (width - 920) / 2;

      motionItems.forEach((_, idx) => {
        const segX = startSegX + idx * (segWidth + 16);
        ctx.save();
        // Background bar
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        roundRect(ctx, segX, curY, segWidth, 8, 4);
        ctx.fill();

        // Active/Completed fill
        if (idx < activeIdx) {
          ctx.fillStyle = '#FFFFFF';
          roundRect(ctx, segX, curY, segWidth, 8, 4);
          ctx.fill();
        } else if (idx === activeIdx) {
          const fillW = Math.max(8, segWidth * (options.motionProgress !== undefined ? options.motionProgress : 0.7));
          ctx.fillStyle = '#FFFFFF';
          roundRect(ctx, segX, curY, fillW, 8, 4);
          ctx.fill();
        }
        ctx.restore();
      });

      curY += 45;
    } else {
      curY += 20;
    }

    // 2. Top Header: TFIVE PRO Brandmark
    if (options.showLogo !== false) {
      setCrispTextShadow(ctx, 'light');
      ctx.font = '900 42px system-ui, -apple-system, sans-serif';
      const tfiveWidth = ctx.measureText('TFIVE ').width;
      const proWidth = ctx.measureText('PRO').width;
      const startX = width / 2 - (tfiveWidth + proWidth) / 2;

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('TFIVE ', startX, curY);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillText('PRO', startX + tfiveWidth, curY);

      // Subtle red accent line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(startX, curY + 28);
      ctx.lineTo(startX + tfiveWidth + proWidth, curY + 28);
      ctx.stroke();
      clearShadow(ctx);

      curY += 80;
    }

    // 3. Editorial Tagline / Workout Title (e.g. TREINO CONCLUÍDO)
    if (options.showRoutineTitle) {
      const routineTitle = (session?.routineName || workoutTitle || 'TREINO CONCLUÍDO').toUpperCase();
      const titleFit = drawAutoFitText(ctx, {
        text: routineTitle,
        x: width / 2,
        y: curY,
        maxWidth: 900,
        maxLines: 1,
        maxFontSize: 46,
        minFontSize: 28,
        fontWeight: '900',
        color: '#FFFFFF',
        textAlign: 'center',
        crispShadow: 'light'
      });
      curY += titleFit.totalHeight + 14;
    }

    // 4. Center Protagonist: 3D Athletic Avatar in Biomechanical Motion
    const avatarBoxY = curY + 20;
    const avatarBoxH = 680;
    const avatarBoxW = 900;
    const avatarBoxX = (width - avatarBoxW) / 2;

    // Resolve animation for active exercise
    const anim = getAnimationForExercise(activeItem.exerciseId, activeItem.exerciseName, activeItem.animationId);

    if (anim) {
      // Sub-canvas rendering for crisp scaled avatar projection
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = avatarBoxW;
      tempCanvas.height = avatarBoxH;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        const animProgress = options.motionProgress !== undefined ? options.motionProgress : 0.45;
        anim.render(tempCtx, animProgress, avatarBoxW, avatarBoxH, {
          scaleFactor: 1.85,
          theme: 'transparent'
        });
        ctx.drawImage(tempCanvas, avatarBoxX, avatarBoxY);
      }
    } else {
      // Clean fallback badge if animation is unavailable
      ctx.save();
      setCrispTextShadow(ctx, 'light');
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      roundRect(ctx, width / 2 - 200, avatarBoxY + 200, 400, 100, 24);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 24px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ANIMAÇÃO 3D EM BREVE', width / 2, avatarBoxY + 250);
      clearShadow(ctx);
      ctx.restore();
    }

    curY = avatarBoxY + avatarBoxH + 40;

    // 5. Exercise Name - Prominently Displayed with AutoFitText
    const exNameFit = drawAutoFitText(ctx, {
      text: activeItem.exerciseName.toUpperCase(),
      x: width / 2,
      y: curY,
      maxWidth: 920,
      maxLines: 2,
      maxFontSize: 64,
      minFontSize: 36,
      fontWeight: '900',
      color: '#FFFFFF',
      textAlign: 'center',
      crispShadow: 'light'
    });

    curY += exNameFit.totalHeight + 18;

    // 6. Real Executed Metrics for this Exercise (e.g. 80 KG × 10 REPS)
    let loadSummary = '';
    if (activeItem.bestWeight !== undefined && activeItem.bestWeight > 0 && activeItem.bestReps !== undefined && activeItem.bestReps > 0) {
      loadSummary = `${activeItem.bestWeight} KG × ${activeItem.bestReps} REPS`;
    } else if (activeItem.bestWeight !== undefined && activeItem.bestWeight > 0) {
      loadSummary = `${activeItem.bestWeight} KG`;
    } else if (activeItem.totalSets !== undefined && activeItem.totalSets > 0) {
      loadSummary = `${activeItem.totalSets} SÉRIES`;
    } else {
      loadSummary = 'EXECUÇÃO TÉCNICA';
    }

    setCrispTextShadow(ctx, 'light');
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 56px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(loadSummary, width / 2, curY);
    clearShadow(ctx);

    curY += 75;

    // 7. Supporting Workout Metrics Row (Duração • Volume Total)
    const metricsStartX = 140;
    const metricsWidth = width - 280;

    // Subtle divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(metricsStartX, curY);
    ctx.lineTo(metricsStartX + metricsWidth, curY);
    ctx.stroke();

    curY += 32;

    const rowMetrics = [
      { val: durationFormatted, label: 'TEMPO' },
      { val: volumeFormatted, label: 'VOLUME' },
      { val: `${totalSets} SÉRIES`, label: 'SÉRIES TOTAIS' }
    ];

    const colW = metricsWidth / rowMetrics.length;
    rowMetrics.forEach((m, idx) => {
      const cx = metricsStartX + idx * colW + colW / 2;
      setCrispTextShadow(ctx, 'light');
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 36px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(m.val, cx, curY);

      ctx.fillStyle = '#A1A1AA';
      ctx.font = '800 16px system-ui, -apple-system, sans-serif';
      ctx.fillText(m.label, cx, curY + 44);
      clearShadow(ctx);
    });

    // 8. Footer Slogan
    if (options.showSlogan) {
      setCrispTextShadow(ctx, 'light');
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '800 20px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TFIVE PRO  •  EXCELÊNCIA EM CADA SÉRIE', width / 2, height - 120);
      clearShadow(ctx);
    }

    return canvas;
  }

  // --------------------------------------------------------------------------
  // FORMAT 1: PERFORMANCE STRIP (Compact Horizontal Clean Overlay)
  // --------------------------------------------------------------------------
  if (options.format === 'strip') {
    const cardWidth = 960;
    const cardHeight = 440;
    const cardX = (width - cardWidth) / 2;
    const cardY = 740; // Centered within safe area

    // Draw Glass or Red or Clean panel
    if (options.preset === 'glass') {
      ctx.fillStyle = 'rgba(5, 5, 5, 0.82)';
      roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 32);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (options.preset === 'red') {
      ctx.fillStyle = 'rgba(18, 18, 18, 0.90)';
      roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 32);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 32);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    let curY = cardY + 45;

    // TFIVE PRO Brand
    setCrispTextShadow(ctx, 'light');
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 34px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('TFIVE', cardX + 44, curY);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('PRO', cardX + 150, curY);

    // Title / Athlete Name on right with Auto-Fit
    drawAutoFitText(ctx, {
      text: athleteHeader,
      x: cardX + cardWidth - 44,
      y: curY - 14,
      maxWidth: 480,
      maxLines: 2,
      maxFontSize: 24,
      minFontSize: 16,
      fontWeight: '800',
      color: '#FFFFFF',
      textAlign: 'right',
      crispShadow: 'light'
    });
    clearShadow(ctx);

    curY += 50;

    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cardX + 44, curY);
    ctx.lineTo(cardX + cardWidth - 44, curY);
    ctx.stroke();

    curY += 40;

    // Metrics Columns (4 metrics)
    const metrics = [
      { label: 'DURAÇÃO', value: durationFormatted },
      { label: 'VOLUME', value: volumeFormatted, highlight: true },
      { label: 'SÉRIES', value: `${totalSets} SÉRIES` },
      { label: 'DENSIDADE', value: `${densityKgMin} KG/MIN` }
    ];

    const colWidth = (cardWidth - 88) / metrics.length;

    metrics.forEach((m, idx) => {
      const colX = cardX + 44 + idx * colWidth + colWidth / 2;

      setCrispTextShadow(ctx, 'light');
      ctx.fillStyle = m.highlight ? '#FFFFFF' : '#FFFFFF';
      ctx.font = '900 38px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(m.value, colX, curY);

      ctx.fillStyle = '#A1A1AA';
      ctx.font = '800 16px system-ui, -apple-system, sans-serif';
      ctx.fillText(m.label, colX, curY + 48);
      clearShadow(ctx);
    });

    curY += 130;

    // PR Badge or Slogan bottom pill
    if (options.showPRs && prsCount > 0) {
      const badgeW = 420;
      const badgeH = 50;
      const badgeX = cardX + (cardWidth - badgeW) / 2;
      const badgeY = curY;

      ctx.fillStyle = '#FFFFFF';
      roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 25);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 18px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`🏆 ${prsCount} ${prsCount === 1 ? 'NOVO RECORDE (PR)' : 'NOVOS RECORDES (PR)'}`, badgeX + badgeW / 2, badgeY + badgeH / 2);
    } else if (options.showSlogan) {
      ctx.fillStyle = '#71717A';
      ctx.font = '700 14px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PERFORMANCE SEM DESCULPAS. RESULTADOS SEM LIMITES.', cardX + cardWidth / 2, cardY + cardHeight - 36);
    }
  }

  // --------------------------------------------------------------------------
  // FORMAT 2: PERFORMANCE CARD (Full Story Showcase)
  // --------------------------------------------------------------------------
  else if (options.format === 'card') {
    const cardWidth = 920;
    const cardHeight = 980;
    const cardX = (width - cardWidth) / 2;
    const cardY = 470;

    if (options.preset === 'glass') {
      ctx.fillStyle = 'rgba(6, 6, 6, 0.82)';
      roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 40);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (options.preset === 'red') {
      ctx.fillStyle = 'rgba(15, 15, 15, 0.90)';
      roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 40);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.68)';
      roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 40);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    let curY = cardY + 50;

    // Brand Logo & Subtitle
    setCrispTextShadow(ctx, 'light');
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 40px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('TFIVE', cardX + 48, curY);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('PRO', cardX + 176, curY);

    const dateFormatted = new Date(session?.startTime || ext?.date || Date.now()).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short'
    }).toUpperCase();
    ctx.fillStyle = '#A1A1AA';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(dateFormatted, cardX + cardWidth - 48, curY);
    clearShadow(ctx);

    curY += 52;

    // Headline Pill with Auto-Fit
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    roundRect(ctx, cardX + 48, curY, cardWidth - 96, 56, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    drawAutoFitText(ctx, {
      text: athleteHeader.toUpperCase(),
      x: cardX + cardWidth / 2,
      y: curY + 16,
      maxWidth: cardWidth - 140,
      maxLines: 1,
      maxFontSize: 24,
      minFontSize: 16,
      fontWeight: '900',
      color: '#FFFFFF',
      textAlign: 'center'
    });

    curY += 82;

    // 4 Metrics Grid (2x2)
    const gridW = (cardWidth - 96 - 20) / 2;
    const gridH = 140;

    // Cell 1: DURAÇÃO
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    roundRect(ctx, cardX + 48, curY, gridW, gridH, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    setCrispTextShadow(ctx, 'light');
    ctx.fillStyle = '#A1A1AA';
    ctx.font = '800 16px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('TEMPO DE TREINO', cardX + 70, curY + 20);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 42px system-ui, -apple-system, sans-serif';
    ctx.fillText(durationFormatted, cardX + 70, curY + 50);

    // Cell 2: VOLUME
    const cell2X = cardX + 48 + gridW + 20;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    roundRect(ctx, cell2X, curY, gridW, gridH, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#A1A1AA';
    ctx.font = '800 16px system-ui, -apple-system, sans-serif';
    ctx.fillText('TONELAGEM / VOLUME', cell2X + 22, curY + 20);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 42px system-ui, -apple-system, sans-serif';
    ctx.fillText(volumeFormatted, cell2X + 22, curY + 50);

    curY += gridH + 18;

    // Cell 3: SÉRIES
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    roundRect(ctx, cardX + 48, curY, gridW, gridH, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#A1A1AA';
    ctx.font = '800 16px system-ui, -apple-system, sans-serif';
    ctx.fillText('SÉRIES CONCLUÍDAS', cardX + 70, curY + 20);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 42px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${totalSets} SÉRIES`, cardX + 70, curY + 50);

    // Cell 4: DENSIDADE
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    roundRect(ctx, cell2X, curY, gridW, gridH, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#A1A1AA';
    ctx.font = '800 16px system-ui, -apple-system, sans-serif';
    ctx.fillText('DENSIDADE MECÂNICA', cell2X + 22, curY + 20);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 42px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${densityKgMin}`, cell2X + 22, curY + 50);

    ctx.fillStyle = '#71717A';
    ctx.font = '800 18px system-ui, -apple-system, sans-serif';
    ctx.fillText(' KG/MIN', cell2X + 22 + ctx.measureText(`${densityKgMin}`).width, curY + 68);
    clearShadow(ctx);

    curY += gridH + 28;

    // PRs Highlight banner
    if (options.showPRs && prsCount > 0) {
      const topPr = session?.prsAchieved?.[0];
      const topEvolutionPr = !topPr ? evolution?.evolutions?.find((e) => e.isPR) : undefined;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      roundRect(ctx, cardX + 48, curY, cardWidth - 96, 90, 20);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      setCrispTextShadow(ctx, 'light');
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 22px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`🏆 ${prsCount} ${prsCount === 1 ? 'NOVO RECORDE REGISTRADO' : 'NOVOS RECORDES REGISTRADOS'}`, cardX + 70, curY + 18);

      if (topPr) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '800 20px system-ui, -apple-system, sans-serif';
        ctx.fillText(`${topPr.exerciseName}: ${topPr.weightKg} kg × ${topPr.reps} reps`, cardX + 70, curY + 52);
      } else if (topEvolutionPr) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '800 20px system-ui, -apple-system, sans-serif';
        ctx.fillText(`${topEvolutionPr.exerciseName}: ${topEvolutionPr.todayWeight} kg × ${topEvolutionPr.todayReps} reps`, cardX + 70, curY + 52);
      }
      clearShadow(ctx);

      curY += 115;
    }

    // Footer Slogan
    if (options.showSlogan) {
      ctx.fillStyle = '#71717A';
      ctx.font = '700 14px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PERFORMANCE SEM DESCULPAS. RESULTADOS SEM LIMITES.', cardX + cardWidth / 2, cardY + cardHeight - 34);
    }
  }

  // --------------------------------------------------------------------------
  // FORMAT 3: MINIMAL (Floating Athletic Typography)
  // --------------------------------------------------------------------------
  else if (options.format === 'minimal') {
    const contentX = 100;
    let curY = 640;

    // Brand Floating Badge
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    roundRect(ctx, contentX, curY, 280, 60, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    setCrispTextShadow(ctx, 'light');
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 28px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('TFIVE', contentX + 24, curY + 30);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('PRO', contentX + 120, curY + 30);
    clearShadow(ctx);

    curY += 95;

    // Giant Dynamic Headline with Auto-Fit
    const headFit = drawAutoFitText(ctx, {
      text: athleteHeader.toUpperCase(),
      x: contentX,
      y: curY,
      maxWidth: 880,
      maxLines: 2,
      maxFontSize: 64,
      minFontSize: 36,
      fontWeight: '900',
      color: '#FFFFFF',
      textAlign: 'left',
      crispShadow: 'light'
    });

    curY += headFit.totalHeight + 25;

    // Single Floating Metric Line Chip
    const stripText = `${durationFormatted} • ${volumeFormatted} • ${totalSets} SÉRIES`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    roundRect(ctx, contentX, curY, 880, 84, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();

    setCrispTextShadow(ctx, 'light');
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 34px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stripText, contentX + 440, curY + 42);
    clearShadow(ctx);

    curY += 115;

    // Density Pill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    roundRect(ctx, contentX, curY, 460, 64, 22);
    ctx.fill();

    setCrispTextShadow(ctx, 'light');
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 26px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`⚡ DENSIDADE: ${densityKgMin} KG/MIN`, contentX + 230, curY + 32);
    clearShadow(ctx);

    if (options.showPRs && prsCount > 0) {
      curY += 88;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      roundRect(ctx, contentX, curY, 460, 64, 22);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

      setCrispTextShadow(ctx, 'light');
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 24px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`🏆 ${prsCount} NOVOS RECORDES`, contentX + 230, curY + 32);
      clearShadow(ctx);
    }
  }

  // --------------------------------------------------------------------------
  // FORMAT 4: EXERCÍCIOS (Detailed Workout Overview)
  // --------------------------------------------------------------------------
  else if (options.format === 'exercises') {
    const cardWidth = 940;
    const maxShow = 5;
    const displayExercises = uniqueExercises.slice(0, maxShow);
    const cardHeight = 360 + displayExercises.length * 135;
    const cardX = (width - cardWidth) / 2;
    const cardY = (height - cardHeight) / 2;

    ctx.fillStyle = 'rgba(8, 8, 8, 0.86)';
    roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 36);
    ctx.fill();
    ctx.strokeStyle = options.preset === 'red' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 2;
    ctx.stroke();

    let curY = cardY + 45;

    // Top Brand & Header
    setCrispTextShadow(ctx, 'light');
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 36px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('TFIVE', cardX + 44, curY);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('PRO', cardX + 155, curY);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 24px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(athleteHeader.toUpperCase(), cardX + cardWidth - 44, curY);
    clearShadow(ctx);

    curY += 46;

    // Mini strip summary
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    roundRect(ctx, cardX + 44, curY, cardWidth - 88, 54, 18);
    ctx.fill();

    setCrispTextShadow(ctx, 'light');
    ctx.fillStyle = '#D4D4D8';
    ctx.font = '800 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${durationFormatted}   •   ${volumeFormatted}   •   ${densityKgMin} KG/MIN`, cardX + cardWidth / 2, curY + 27);
    clearShadow(ctx);

    curY += 78;

    // Section Title
    setCrispTextShadow(ctx, 'light');
    ctx.fillStyle = '#A1A1AA';
    ctx.font = '800 18px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('PRINCIPAIS EXERCÍCIOS & CARGAS', cardX + 44, curY);
    clearShadow(ctx);

    curY += 36;

    // Exercise Rows
    for (const ex of displayExercises) {
      const rowH = 110;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      roundRect(ctx, cardX + 44, curY, cardWidth - 88, rowH, 20);
      ctx.fill();
      ctx.strokeStyle = ex.isPR ? '#FFFFFF' : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = ex.isPR ? 2 : 1;
      ctx.stroke();

      // Muscle Tag
      ctx.fillStyle = ex.isPR ? '#FFFFFF' : 'rgba(255, 255, 255, 0.12)';
      roundRect(ctx, cardX + 64, curY + 18, 130, 28, 12);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 13px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ex.muscle ? ex.muscle.toUpperCase() : 'TREINO', cardX + 64 + 65, curY + 32);

      // Exercise Name - Auto-Fit to prevent collision with load column
      drawAutoFitText(ctx, {
        text: ex.name,
        x: cardX + 64,
        y: curY + 54,
        maxWidth: cardWidth - 360,
        maxLines: 2,
        maxFontSize: 24,
        minFontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
        textAlign: 'left',
        crispShadow: 'light'
      });

      // Best Load
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 32px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${ex.bestWeight} kg × ${ex.bestReps}`, cardX + cardWidth - 64, curY + 55);

      if (ex.isPR) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 14px system-ui, -apple-system, sans-serif';
        ctx.fillText('★ NOVO PR', cardX + cardWidth - 64, curY + 24);
      }
      clearShadow(ctx);

      curY += rowH + 14;
    }
  }

  return canvas;
}

/**
 * Generates Daily Summary Story Canvas
 */
export async function generateDailyStoryCanvas(
  options: DailyStoryOptions
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const width = 1080;
  const height = 1920;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) throw new Error('Could not get canvas 2d context');

  ctx.clearRect(0, 0, width, height);

  const cardWidth = 920;
  const cardHeight = 980;
  const cardX = (width - cardWidth) / 2;
  const cardY = (height - cardHeight) / 2;

  ctx.fillStyle = 'rgba(5, 5, 5, 0.84)';
  roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 36);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Aggregate metrics
  const totalVolume = options.sessions.reduce((acc, s) => acc + (s.totalVolume || 0), 0);
  const totalDurationSec = options.sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  const totalPRs = options.sessions.reduce((acc, s) => acc + (s.prsAchieved?.length || 0), 0);
  const totalSets = options.sessions.reduce(
    (acc, s) => acc + (Array.isArray(s.sets) ? s.sets.filter((st) => !st.isWarmup && st.status !== 'skipped').length : 0),
    0
  );

  const volumeInTonnes = (totalVolume / 1000).toFixed(1).replace('.', ',');
  const durationFormatted = formatWorkoutDuration(totalDurationSec).toUpperCase();

  let curY = cardY + 50;

  // Header Brand
  setCrispTextShadow(ctx, 'light');
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 36px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('TFIVE', cardX + 44, curY);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('PRO', cardX + 160, curY);

  // Date Tag
  const dateFormatted = new Date(options.date + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long'
  }).toUpperCase();

  ctx.fillStyle = '#A1A1AA';
  ctx.font = '800 20px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(dateFormatted, cardX + cardWidth - 44, curY);
  clearShadow(ctx);

  curY += 50;

  // Title Banner with Auto-Fit
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  roundRect(ctx, cardX + 44, curY, cardWidth - 88, 54, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  drawAutoFitText(ctx, {
    text: options.customHeadline || `RESUMO DIÁRIO • ${options.sessions.length} ATENDIMENTOS`,
    x: cardX + cardWidth / 2,
    y: curY + 16,
    maxWidth: cardWidth - 120,
    maxLines: 1,
    maxFontSize: 22,
    minFontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center'
  });

  curY += 80;

  // 4 Metrics Grid
  const gridW = (cardWidth - 88 - 20) / 2;
  const gridH = 150;

  // Cell 1: Atendimentos
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  roundRect(ctx, cardX + 44, curY, gridW, gridH, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  setCrispTextShadow(ctx, 'light');
  ctx.fillStyle = '#A1A1AA';
  ctx.font = '800 16px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('ATENDIMENTOS', cardX + 64, curY + 22);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 48px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${options.sessions.length}`, cardX + 64, curY + 52);

  // Cell 2: Tonelagem
  const cell2X = cardX + 44 + gridW + 20;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  roundRect(ctx, cell2X, curY, gridW, gridH, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#A1A1AA';
  ctx.font = '800 16px system-ui, -apple-system, sans-serif';
  ctx.fillText('TONELAGEM TOTAL', cell2X + 20, curY + 22);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 48px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${volumeInTonnes} T`, cell2X + 20, curY + 52);

  curY += gridH + 20;

  // Cell 3: Tempo
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  roundRect(ctx, cardX + 44, curY, gridW, gridH, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#A1A1AA';
  ctx.font = '800 16px system-ui, -apple-system, sans-serif';
  ctx.fillText('TEMPO DE QUADRA / PISO', cardX + 64, curY + 22);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 44px system-ui, -apple-system, sans-serif';
  ctx.fillText(durationFormatted, cardX + 64, curY + 52);

  // Cell 4: Séries e PRs
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  roundRect(ctx, cell2X, curY, gridW, gridH, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#A1A1AA';
  ctx.font = '800 16px system-ui, -apple-system, sans-serif';
  ctx.fillText('SÉRIES & RECORDES (PR)', cell2X + 20, curY + 22);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 44px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${totalSets}`, cell2X + 20, curY + 52);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 22px system-ui, -apple-system, sans-serif';
  ctx.fillText(`séries • ${totalPRs} PRs`, cell2X + 20 + ctx.measureText(`${totalSets} `).width + 8, curY + 68);
  clearShadow(ctx);

  curY += gridH + 30;

  // Footer Slogan
  ctx.fillStyle = '#71717A';
  ctx.font = '700 14px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PERFORMANCE SEM DESCULPAS. RESULTADOS SEM LIMITES.', cardX + cardWidth / 2, curY + 20);

  return canvas;
}

/**
 * Exports Canvas to Blob with high quality PNG preserving alpha
 */
export function exportCanvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to generate PNG blob from canvas'));
      }
    }, 'image/png', 1.0);
  });
}

/**
 * Triggers direct PNG download
 */
export function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string) {
  const dataUrl = canvas.toDataURL('image/png', 1.0);
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Shares transparent canvas PNG via Web Share API or falls back to direct download
 */
export async function shareCanvasPng(
  canvas: HTMLCanvasElement, 
  filename: string, 
  title: string
): Promise<{ shared: boolean; method: 'web_share' | 'download' }> {
  try {
    const blob = await exportCanvasToBlob(canvas);
    const file = new File([blob], filename, { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title,
        text: 'Overlay de treino TFIVE PRO (PNG transparente)'
      });
      return { shared: true, method: 'web_share' };
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { shared: false, method: 'web_share' };
    }
  }

  // Fallback
  downloadCanvasAsPng(canvas, filename);
  return { shared: true, method: 'download' };
}
