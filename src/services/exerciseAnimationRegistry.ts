import { ExerciseAnimationMeta, ExerciseAnimationType } from '../types';

export interface ExerciseAnimationDefinition extends ExerciseAnimationMeta {
  targetMuscle: string;
  equipmentType: string;
  viewAngle: 'side' | 'isometric' | 'front';
  cycleDurationMs: number;
  render: (
    ctx: CanvasRenderingContext2D,
    progress: number, // 0.0 to 1.0
    width: number,
    height: number,
    options?: AnimationRenderOptions
  ) => void;
}

export interface AnimationRenderOptions {
  theme?: 'dark' | 'transparent' | 'light';
  accentColor?: string;
  showFloorShadow?: boolean;
  showBarbellWeights?: boolean;
  scaleFactor?: number;
  highlightMuscles?: boolean;
}

/**
 * Normalizes text to match exercise names robustly
 */
export function normalizeExerciseName(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim();
}

/**
 * Easing functions for natural biomechanical tempos
 */
function smoothStep(t: number): number {
  return t * t * (3 - 2 * t);
}

// Biomechanical tempo: Eccentric phase 60% of cycle, Concentric phase 40%
function getTempoProgress(cycleProgress: number): { phase: 'eccentric' | 'concentric'; depth: number } {
  const p = cycleProgress % 1.0;
  if (p < 0.55) {
    // Eccentric (lowering / stretching)
    const t = p / 0.55;
    return { phase: 'eccentric', depth: smoothStep(t) };
  } else {
    // Concentric (pressing / lifting / returning)
    const t = (p - 0.55) / 0.45;
    return { phase: 'concentric', depth: 1 - smoothStep(t) };
  }
}

/**
 * Helper to draw a sleek athletic limb capsule with studio shading and rim lighting
 */
function drawAthleticLimb(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  thickness: number,
  color: string = '#27272A',
  rimColor: string = '#E4E4E7',
  accentColor?: string
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 0.001) return;

  const nx = -dy / len;
  const ny = dx / len;
  const half = thickness / 2;

  ctx.save();
  // Base muscle capsule
  ctx.beginPath();
  ctx.arc(x1, y1, half, 0, Math.PI * 2);
  ctx.arc(x2, y2, half * 0.85, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x1 + nx * half, y1 + ny * half);
  ctx.lineTo(x2 + nx * half * 0.85, y2 + ny * half * 0.85);
  ctx.lineTo(x2 - nx * half * 0.85, y2 - ny * half * 0.85);
  ctx.lineTo(x1 - nx * half, y1 - ny * half);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  // Studio Rim light (top/outer highlight)
  ctx.strokeStyle = rimColor;
  ctx.lineWidth = Math.max(1.5, thickness * 0.12);
  ctx.beginPath();
  ctx.moveTo(x1 + nx * (half - 1), y1 + ny * (half - 1));
  ctx.lineTo(x2 + nx * (half * 0.85 - 1), y2 + ny * (half * 0.85 - 1));
  ctx.stroke();

  // Optional TFIVE Red accent stripe
  if (accentColor) {
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = Math.max(2, thickness * 0.18);
    ctx.beginPath();
    ctx.moveTo(x1 + dx * 0.35 + nx * (half - 1.5), y1 + dy * 0.35 + ny * (half - 1.5));
    ctx.lineTo(x1 + dx * 0.65 + nx * (half - 1.5), y1 + dy * 0.65 + ny * (half - 1.5));
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws the athletic torso (V-taper)
 */
function drawAthleticTorso(
  ctx: CanvasRenderingContext2D,
  shoulderX: number,
  shoulderY: number,
  hipX: number,
  hipY: number,
  shoulderWidth: number,
  waistWidth: number,
  bodyColor: string = '#18181B',
  rimColor: string = '#FFFFFF'
) {
  const dx = hipX - shoulderX;
  const dy = hipY - shoulderY;
  const len = Math.hypot(dx, dy);
  if (len < 0.001) return;

  const nx = -dy / len;
  const ny = dx / len;

  ctx.save();
  ctx.beginPath();
  // Left shoulder
  ctx.moveTo(shoulderX + nx * (shoulderWidth / 2), shoulderY + ny * (shoulderWidth / 2));
  // Right shoulder
  ctx.lineTo(shoulderX - nx * (shoulderWidth / 2), shoulderY - ny * (shoulderWidth / 2));
  // Right waist
  ctx.lineTo(hipX - nx * (waistWidth / 2), hipY - ny * (waistWidth / 2));
  // Left waist
  ctx.lineTo(hipX + nx * (waistWidth / 2), hipY + ny * (waistWidth / 2));
  ctx.closePath();

  // Gradient shading
  const grad = ctx.createLinearGradient(
    shoulderX + nx * (shoulderWidth / 2),
    shoulderY + ny * (shoulderWidth / 2),
    shoulderX - nx * (shoulderWidth / 2),
    shoulderY - ny * (shoulderWidth / 2)
  );
  grad.addColorStop(0, '#27272A');
  grad.addColorStop(0.5, bodyColor);
  grad.addColorStop(1, '#09090B');

  ctx.fillStyle = grad;
  ctx.fill();

  // Athletic rim outline
  ctx.strokeStyle = rimColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Subtle TFIVE chest emblem
  ctx.fillStyle = '#374151';
  const midX = (shoulderX * 2 + hipX) / 3;
  const midY = (shoulderY * 2 + hipY) / 3;
  ctx.beginPath();
  ctx.arc(midX, midY, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws the faceless athletic head with studio rim light
 */
function drawAthleticHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number = 14,
  headColor: string = '#27272A',
  rimColor: string = '#FFFFFF'
) {
  ctx.save();
  // Head sphere
  const grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.1, x, y, radius);
  grad.addColorStop(0, '#3F3F46');
  grad.addColorStop(0.7, headColor);
  grad.addColorStop(1, '#09090B');

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Rim lighting
  ctx.strokeStyle = rimColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, radius, -Math.PI * 0.8, 0);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws a clean athletic studio floor shadow / reflection
 */
function drawStudioFloor(
  ctx: CanvasRenderingContext2D,
  cx: number,
  floorY: number,
  shadowWidth: number = 160
) {
  ctx.save();
  const grad = ctx.createRadialGradient(cx, floorY, 10, cx, floorY, shadowWidth);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
  grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.15)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, floorY, shadowWidth, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draws an Olympic Barbell with bumper plates
 */
function drawOlympicBarbell(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  plateRadius: number = 24,
  collarColor: string = '#374151'
) {
  ctx.save();
  // Steel bar shaft
  ctx.strokeStyle = '#D4D4D8';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Left sleeve & plates
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;

  // Left Red Bumper Plate
  ctx.fillStyle = collarColor;
  ctx.beginPath();
  ctx.ellipse(x1 + dx * 0.08, y1 + dy * 0.08, 6, plateRadius, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Right Red Bumper Plate
  ctx.fillStyle = collarColor;
  ctx.beginPath();
  ctx.ellipse(x2 - dx * 0.08, y2 - dy * 0.08, 6, plateRadius, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

// ============================================================================
// OFFICIAL ANIMATION DEFINITIONS (BIOMECHANICALLY ACCURATE 3D AVATAR ENGINES)
// ============================================================================

export const ANIMATION_DEFINITIONS: Record<string, ExerciseAnimationDefinition> = {
  // --------------------------------------------------------------------------
  // 1. SUPINO RETO COM BARRA (BENCH PRESS)
  // --------------------------------------------------------------------------
  bench_press_barbell_v1: {
    animationId: 'bench_press_barbell_v1',
    animationName: 'Supino Reto com Barra',
    version: '1.0',
    type: '3d_avatar_loop',
    targetMuscle: 'Peitoral',
    equipmentType: 'Barra e Banco',
    viewAngle: 'isometric',
    cycleDurationMs: 2400,
    render: (ctx, progress, w, h, opts) => {
      const cx = w * 0.5;
      const cy = h * 0.52;
      const scale = (opts?.scaleFactor || 1) * (w / 380);
      const { depth } = getTempoProgress(progress);

      // Floor Shadow
      drawStudioFloor(ctx, cx, cy + 120 * scale, 140 * scale);

      // Bench Structure
      ctx.save();
      // Bench legs & frame
      ctx.strokeStyle = '#27272A';
      ctx.lineWidth = 6 * scale;
      ctx.beginPath();
      // Bench post Left
      ctx.moveTo(cx - 90 * scale, cy + 40 * scale);
      ctx.lineTo(cx - 90 * scale, cy + 115 * scale);
      // Bench post Right
      ctx.moveTo(cx + 70 * scale, cy + 40 * scale);
      ctx.lineTo(cx + 70 * scale, cy + 115 * scale);
      ctx.stroke();

      // Bench Pad
      ctx.fillStyle = '#18181B';
      ctx.strokeStyle = '#3F3F46';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.roundRect(cx - 110 * scale, cy + 30 * scale, 190 * scale, 18 * scale, 8 * scale);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Avatar on Bench (Head to left, hips to right)
      const headX = cx - 85 * scale;
      const headY = cy + 18 * scale;
      const shoulderX = cx - 55 * scale;
      const shoulderY = cy + 24 * scale;
      const hipX = cx + 35 * scale;
      const hipY = cy + 26 * scale;
      const kneeX = cx + 65 * scale;
      const kneeY = cy + 60 * scale;
      const footX = cx + 80 * scale;
      const footY = cy + 110 * scale;

      // Legs
      drawAthleticLimb(ctx, hipX, hipY, kneeX, kneeY, 14 * scale, '#18181B', '#71717A');
      drawAthleticLimb(ctx, kneeX, kneeY, footX, footY, 12 * scale, '#27272A', '#A1A1AA', '#374151');

      // Torso
      drawAthleticTorso(ctx, shoulderX, shoulderY, hipX, hipY, 32 * scale, 22 * scale, '#18181B', '#FFFFFF');

      // Head
      drawAthleticHead(ctx, headX, headY, 13 * scale, '#27272A', '#FFFFFF');

      // Biomechanical Arm Press Movement
      // Barbell height: Top lockout at y = -60, Bottom chest contact at y = 14
      const barY = cy + (-55 + depth * 62) * scale;
      const barX = cx - 40 * scale;

      // Hand position grips the bar
      const handX = barX;
      const handY = barY;

      // Elbow flares down and out during eccentric descent
      const elbowX = shoulderX + (12 + depth * 16) * scale;
      const elbowY = shoulderY + (10 + depth * 22) * scale;

      // Arm: Shoulder -> Elbow -> Hand
      drawAthleticLimb(ctx, shoulderX, shoulderY, elbowX, elbowY, 14 * scale, '#27272A', '#FFFFFF', depth > 0.6 ? '#374151' : undefined);
      drawAthleticLimb(ctx, elbowX, elbowY, handX, handY, 12 * scale, '#3F3F46', '#FFFFFF');

      // Olympic Barbell (Frontal horizontal bar path)
      drawOlympicBarbell(ctx, barX - 110 * scale, barY - 12 * scale, barX + 110 * scale, barY + 12 * scale, 26 * scale);
    }
  },

  // --------------------------------------------------------------------------
  // 2. AGACHAMENTO LIVRE (BARBELL BACK SQUAT)
  // --------------------------------------------------------------------------
  squat_barbell_v1: {
    animationId: 'squat_barbell_v1',
    animationName: 'Agachamento Livre com Barra',
    version: '1.0',
    type: '3d_avatar_loop',
    targetMuscle: 'Quadríceps / Glúteos',
    equipmentType: 'Barra Olímpica',
    viewAngle: 'side',
    cycleDurationMs: 2600,
    render: (ctx, progress, w, h, opts) => {
      const cx = w * 0.5;
      const cy = h * 0.48;
      const scale = (opts?.scaleFactor || 1) * (w / 380);
      const { depth } = getTempoProgress(progress);

      const floorY = cy + 130 * scale;
      drawStudioFloor(ctx, cx, floorY, 130 * scale);

      // Squat kinematics
      // Standing height vs Squat depth
      const drop = depth * 70 * scale;
      const hipShiftBack = depth * 35 * scale;
      const kneeShiftFwd = depth * 22 * scale;
      const torsoForwardTilt = depth * 18 * scale;

      // Feet on floor
      const ankleX = cx - 5 * scale;
      const ankleY = floorY - 10 * scale;

      // Knee
      const kneeX = cx + 18 * scale + kneeShiftFwd;
      const kneeY = cy + 55 * scale + drop * 0.4;

      // Hip
      const hipX = cx - 20 * scale - hipShiftBack;
      const hipY = cy + 15 * scale + drop;

      // Torso / Shoulder
      const shoulderX = cx + 5 * scale - torsoForwardTilt;
      const shoulderY = cy - 65 * scale + drop;

      // Head
      const headX = shoulderX + 8 * scale;
      const headY = shoulderY - 24 * scale;

      // Barbell on upper traps
      const barX = shoulderX - 4 * scale;
      const barY = shoulderY - 6 * scale;

      // Upper & Lower Legs
      drawAthleticLimb(ctx, hipX, hipY, kneeX, kneeY, 18 * scale, '#27272A', '#FFFFFF', depth > 0.5 ? '#374151' : undefined);
      drawAthleticLimb(ctx, kneeX, kneeY, ankleX, ankleY, 14 * scale, '#18181B', '#71717A', '#374151');

      // Torso
      drawAthleticTorso(ctx, shoulderX, shoulderY, hipX, hipY, 34 * scale, 24 * scale, '#18181B', '#FFFFFF');

      // Head
      drawAthleticHead(ctx, headX, headY, 13 * scale, '#27272A', '#FFFFFF');

      // Arms holding barbell
      const elbowX = shoulderX - 18 * scale;
      const elbowY = shoulderY + 22 * scale;
      drawAthleticLimb(ctx, shoulderX, shoulderY, elbowX, elbowY, 11 * scale, '#27272A', '#A1A1AA');
      drawAthleticLimb(ctx, elbowX, elbowY, barX, barY, 10 * scale, '#3F3F46', '#FFFFFF');

      // Olympic Barbell on Traps
      drawOlympicBarbell(ctx, barX - 100 * scale, barY - 10 * scale, barX + 100 * scale, barY + 10 * scale, 28 * scale);
    }
  },

  // --------------------------------------------------------------------------
  // 3. PUXADA FRONTAL (LAT PULLDOWN)
  // --------------------------------------------------------------------------
  lat_pulldown_v1: {
    animationId: 'lat_pulldown_v1',
    animationName: 'Puxada Frontal na Polia',
    version: '1.0',
    type: '3d_avatar_loop',
    targetMuscle: 'Dorsais / Costas',
    equipmentType: 'Polia Alta',
    viewAngle: 'front',
    cycleDurationMs: 2400,
    render: (ctx, progress, w, h, opts) => {
      const cx = w * 0.5;
      const cy = h * 0.5;
      const scale = (opts?.scaleFactor || 1) * (w / 380);
      const { depth } = getTempoProgress(progress);

      const floorY = cy + 130 * scale;
      drawStudioFloor(ctx, cx, floorY, 120 * scale);

      // Lat Pulldown Station Structure (Top pulley & cable)
      ctx.save();
      ctx.strokeStyle = '#27272A';
      ctx.lineWidth = 5 * scale;
      // Overhead Pulley Beam
      ctx.beginPath();
      ctx.moveTo(cx, cy - 150 * scale);
      ctx.lineTo(cx, cy - 130 * scale);
      ctx.stroke();

      // Pulley Wheel
      ctx.fillStyle = '#374151';
      ctx.beginPath();
      ctx.arc(cx, cy - 130 * scale, 7 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Seat & Thigh Pad
      ctx.fillStyle = '#18181B';
      ctx.roundRect(cx - 35 * scale, cy + 45 * scale, 70 * scale, 14 * scale, 6 * scale);
      ctx.fill();
      ctx.restore();

      // Avatar seated upright with slight lean back
      const hipX = cx;
      const hipY = cy + 40 * scale;
      const shoulderX = cx;
      const shoulderY = cy - 20 * scale;
      const headX = cx;
      const headY = cy - 44 * scale;

      // Legs locked under pad
      const kneeLX = cx - 35 * scale;
      const kneeRX = cx + 35 * scale;
      const kneeY = cy + 50 * scale;
      const footY = cy + 115 * scale;

      drawAthleticLimb(ctx, hipX - 10 * scale, hipY, kneeLX, kneeY, 14 * scale, '#18181B', '#71717A');
      drawAthleticLimb(ctx, hipX + 10 * scale, hipY, kneeRX, kneeY, 14 * scale, '#18181B', '#71717A');
      drawAthleticLimb(ctx, kneeLX, kneeY, kneeLX, footY, 12 * scale, '#27272A', '#A1A1AA');
      drawAthleticLimb(ctx, kneeRX, kneeY, kneeRX, footY, 12 * scale, '#27272A', '#A1A1AA');

      // Torso
      drawAthleticTorso(ctx, shoulderX, shoulderY, hipX, hipY, 44 * scale, 26 * scale, '#18181B', '#FFFFFF');

      // Head
      drawAthleticHead(ctx, headX, headY, 13 * scale, '#27272A', '#FFFFFF');

      // Cable & Lat Pulldown Bar
      // Bar Y moves from -100 (top stretch) to -25 (clavicle pull)
      const barY = cy + (-95 + depth * 70) * scale;
      const barW = 190 * scale;

      // Cable from top pulley to bar center
      ctx.save();
      ctx.strokeStyle = '#A1A1AA';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 130 * scale);
      ctx.lineTo(cx, barY);
      ctx.stroke();

      // Wide Grip Pulldown Curved Bar
      ctx.strokeStyle = '#D4D4D8';
      ctx.lineWidth = 5 * scale;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - barW / 2, barY + 12 * scale);
      ctx.lineTo(cx - barW * 0.35, barY);
      ctx.lineTo(cx + barW * 0.35, barY);
      ctx.lineTo(cx + barW / 2, barY + 12 * scale);
      ctx.stroke();

      // Red rubber grips
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 7 * scale;
      ctx.beginPath();
      ctx.moveTo(cx - barW / 2, barY + 12 * scale);
      ctx.lineTo(cx - barW * 0.42, barY + 4 * scale);
      ctx.moveTo(cx + barW / 2, barY + 12 * scale);
      ctx.lineTo(cx + barW * 0.42, barY + 4 * scale);
      ctx.stroke();
      ctx.restore();

      // Arms: Shoulders -> Elbows (flare down & back) -> Hands (gripping bar)
      const handLX = cx - barW * 0.44;
      const handRX = cx + barW * 0.44;
      const handY = barY + 8 * scale;

      // Elbow positions flare down as bar is pulled
      const elbowSpread = (65 - depth * 15) * scale;
      const elbowY = shoulderY + (-15 + depth * 45) * scale;

      // Left Arm
      drawAthleticLimb(ctx, shoulderX - 18 * scale, shoulderY, cx - elbowSpread, elbowY, 13 * scale, '#27272A', '#FFFFFF', depth > 0.5 ? '#374151' : undefined);
      drawAthleticLimb(ctx, cx - elbowSpread, elbowY, handLX, handY, 11 * scale, '#3F3F46', '#FFFFFF');

      // Right Arm
      drawAthleticLimb(ctx, shoulderX + 18 * scale, shoulderY, cx + elbowSpread, elbowY, 13 * scale, '#27272A', '#FFFFFF', depth > 0.5 ? '#374151' : undefined);
      drawAthleticLimb(ctx, cx + elbowSpread, elbowY, handRX, handY, 11 * scale, '#3F3F46', '#FFFFFF');
    }
  },

  // --------------------------------------------------------------------------
  // 4. REMADA CURVADA (BARBELL ROW)
  // --------------------------------------------------------------------------
  barbell_row_v1: {
    animationId: 'barbell_row_v1',
    animationName: 'Remada Curvada com Barra',
    version: '1.0',
    type: '3d_avatar_loop',
    targetMuscle: 'Costas / Dorsais',
    equipmentType: 'Barra Olímpica',
    viewAngle: 'side',
    cycleDurationMs: 2300,
    render: (ctx, progress, w, h, opts) => {
      const cx = w * 0.5;
      const cy = h * 0.52;
      const scale = (opts?.scaleFactor || 1) * (w / 380);
      const { depth } = getTempoProgress(progress);

      const floorY = cy + 120 * scale;
      drawStudioFloor(ctx, cx, floorY, 130 * scale);

      // Hinged stance (45° torso angle)
      const footX = cx - 35 * scale;
      const footY = floorY - 8 * scale;
      const kneeX = cx - 18 * scale;
      const kneeY = cy + 45 * scale;
      const hipX = cx - 45 * scale;
      const hipY = cy - 10 * scale;

      const shoulderX = cx + 30 * scale;
      const shoulderY = cy - 40 * scale;
      const headX = cx + 45 * scale;
      const headY = cy - 58 * scale;

      // Legs
      drawAthleticLimb(ctx, hipX, hipY, kneeX, kneeY, 17 * scale, '#18181B', '#71717A');
      drawAthleticLimb(ctx, kneeX, kneeY, footX, footY, 13 * scale, '#27272A', '#A1A1AA', '#374151');

      // Torso (Solid flat spine)
      drawAthleticTorso(ctx, shoulderX, shoulderY, hipX, hipY, 34 * scale, 24 * scale, '#18181B', '#FFFFFF');

      // Head
      drawAthleticHead(ctx, headX, headY, 13 * scale, '#27272A', '#FFFFFF');

      // Barbell row path: Bottom (straight arms) at y = cy + 35 -> Rowed to navel at y = cy - 18
      const barY = cy + (35 - depth * 52) * scale;
      const barX = cx + (15 - depth * 8) * scale;

      const elbowX = shoulderX - (15 + depth * 32) * scale;
      const elbowY = shoulderY + (20 - depth * 35) * scale;

      // Arms pulling barbell
      drawAthleticLimb(ctx, shoulderX, shoulderY, elbowX, elbowY, 14 * scale, '#27272A', '#FFFFFF', depth > 0.5 ? '#374151' : undefined);
      drawAthleticLimb(ctx, elbowX, elbowY, barX, barY, 12 * scale, '#3F3F46', '#FFFFFF');

      // Olympic Barbell
      drawOlympicBarbell(ctx, barX - 95 * scale, barY - 8 * scale, barX + 95 * scale, barY + 8 * scale, 26 * scale);
    }
  },

  // --------------------------------------------------------------------------
  // 5. ROSCA DIRETA (BICEP CURL)
  // --------------------------------------------------------------------------
  bicep_curl_v1: {
    animationId: 'bicep_curl_v1',
    animationName: 'Rosca Direta com Barra',
    version: '1.0',
    type: '3d_avatar_loop',
    targetMuscle: 'Bíceps',
    equipmentType: 'Barra W / Reta',
    viewAngle: 'front',
    cycleDurationMs: 2200,
    render: (ctx, progress, w, h, opts) => {
      const cx = w * 0.5;
      const cy = h * 0.5;
      const scale = (opts?.scaleFactor || 1) * (w / 380);
      const { depth } = getTempoProgress(progress);

      const floorY = cy + 135 * scale;
      drawStudioFloor(ctx, cx, floorY, 110 * scale);

      // Standing posture
      const footLX = cx - 25 * scale;
      const footRX = cx + 25 * scale;
      const hipX = cx;
      const hipY = cy + 20 * scale;
      const shoulderX = cx;
      const shoulderY = cy - 55 * scale;
      const headX = cx;
      const headY = cy - 80 * scale;

      // Legs
      drawAthleticLimb(ctx, hipX - 12 * scale, hipY, footLX, floorY - 8 * scale, 15 * scale, '#18181B', '#71717A');
      drawAthleticLimb(ctx, hipX + 12 * scale, hipY, footRX, floorY - 8 * scale, 15 * scale, '#18181B', '#71717A');

      // Torso
      drawAthleticTorso(ctx, shoulderX, shoulderY, hipX, hipY, 40 * scale, 24 * scale, '#18181B', '#FFFFFF');

      // Head
      drawAthleticHead(ctx, headX, headY, 13 * scale, '#27272A', '#FFFFFF');

      // Bicep Curl Kinematics: Elbow pinned at ribs (cy - 10)
      const elbowLX = cx - 24 * scale;
      const elbowRX = cx + 24 * scale;
      const elbowY = cy - 10 * scale;

      // Hands curl up in circular arc
      // Bottom y = cy + 38 -> Top peak contraction y = cy - 38
      const handY = cy + (36 - depth * 72) * scale;
      const handLX = cx - 20 * scale;
      const handRX = cx + 20 * scale;

      // Upper arms (Shoulder to fixed elbow)
      drawAthleticLimb(ctx, shoulderX - 18 * scale, shoulderY, elbowLX, elbowY, 14 * scale, '#27272A', '#FFFFFF', depth > 0.5 ? '#374151' : undefined);
      drawAthleticLimb(ctx, shoulderX + 18 * scale, shoulderY, elbowRX, elbowY, 14 * scale, '#27272A', '#FFFFFF', depth > 0.5 ? '#374151' : undefined);

      // Forearms (Elbow to hand)
      drawAthleticLimb(ctx, elbowLX, elbowY, handLX, handY, 12 * scale, '#3F3F46', '#FFFFFF');
      drawAthleticLimb(ctx, elbowRX, elbowY, handRX, handY, 12 * scale, '#3F3F46', '#FFFFFF');

      // EZ-Bar / Barbell held in palms
      const barW = 130 * scale;
      drawOlympicBarbell(ctx, cx - barW / 2, handY, cx + barW / 2, handY, 20 * scale);
    }
  },

  // --------------------------------------------------------------------------
  // 6. TRÍCEPS POLIA / CORDA (TRICEPS PUSHDOWN)
  // --------------------------------------------------------------------------
  triceps_pushdown_v1: {
    animationId: 'triceps_pushdown_v1',
    animationName: 'Tríceps Polia / Corda',
    version: '1.0',
    type: '3d_avatar_loop',
    targetMuscle: 'Tríceps',
    equipmentType: 'Polia Alta e Corda',
    viewAngle: 'side',
    cycleDurationMs: 2100,
    render: (ctx, progress, w, h, opts) => {
      const cx = w * 0.5;
      const cy = h * 0.5;
      const scale = (opts?.scaleFactor || 1) * (w / 380);
      const { depth } = getTempoProgress(progress);

      const floorY = cy + 130 * scale;
      drawStudioFloor(ctx, cx, floorY, 110 * scale);

      // Cable machine post on right
      ctx.save();
      ctx.strokeStyle = '#27272A';
      ctx.lineWidth = 4 * scale;
      ctx.beginPath();
      ctx.moveTo(cx + 90 * scale, cy - 140 * scale);
      ctx.lineTo(cx + 90 * scale, floorY);
      ctx.stroke();

      // Top Pulley
      ctx.fillStyle = '#374151';
      ctx.beginPath();
      ctx.arc(cx + 90 * scale, cy - 120 * scale, 6 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Standing athletic stance with slight forward lean
      const footX = cx - 40 * scale;
      const hipX = cx - 25 * scale;
      const hipY = cy + 15 * scale;
      const shoulderX = cx + 10 * scale;
      const shoulderY = cy - 50 * scale;
      const headX = cx + 22 * scale;
      const headY = cy - 74 * scale;

      // Legs
      drawAthleticLimb(ctx, hipX, hipY, footX, floorY - 8 * scale, 15 * scale, '#18181B', '#71717A');

      // Torso
      drawAthleticTorso(ctx, shoulderX, shoulderY, hipX, hipY, 36 * scale, 22 * scale, '#18181B', '#FFFFFF');

      // Head
      drawAthleticHead(ctx, headX, headY, 13 * scale, '#27272A', '#FFFFFF');

      // Elbow pinned at side of ribs
      const elbowX = shoulderX + 5 * scale;
      const elbowY = cy - 12 * scale;

      // Hands: Pushdown from 90° elbow bend (y = cy - 10) down to full extension (y = cy + 62)
      const handY = cy + (-10 + depth * 72) * scale;
      const handX = elbowX + (12 + depth * 8) * scale;

      // Cable from high pulley to hands
      ctx.save();
      ctx.strokeStyle = '#A1A1AA';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(cx + 90 * scale, cy - 120 * scale);
      ctx.lineTo(handX, handY - 15 * scale);
      ctx.stroke();

      // Triceps Rope
      ctx.strokeStyle = '#E4E4E7';
      ctx.lineWidth = 4 * scale;
      ctx.beginPath();
      ctx.moveTo(handX, handY - 15 * scale);
      ctx.lineTo(handX, handY + 10 * scale);
      ctx.stroke();

      // Red rubber stopper
      ctx.fillStyle = '#374151';
      ctx.beginPath();
      ctx.arc(handX, handY + 10 * scale, 4 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Arms (Shoulder to fixed elbow, then elbow to hand extension)
      drawAthleticLimb(ctx, shoulderX, shoulderY, elbowX, elbowY, 14 * scale, '#27272A', '#FFFFFF', depth > 0.5 ? '#374151' : undefined);
      drawAthleticLimb(ctx, elbowX, elbowY, handX, handY, 12 * scale, '#3F3F46', '#FFFFFF');
    }
  },

  // --------------------------------------------------------------------------
  // 7. ELEVAÇÃO LATERAL (LATERAL RAISE)
  // --------------------------------------------------------------------------
  lateral_raise_v1: {
    animationId: 'lateral_raise_v1',
    animationName: 'Elevação Lateral com Halteres',
    version: '1.0',
    type: '3d_avatar_loop',
    targetMuscle: 'Deltóide Lateral',
    equipmentType: 'Halteres',
    viewAngle: 'front',
    cycleDurationMs: 2200,
    render: (ctx, progress, w, h, opts) => {
      const cx = w * 0.5;
      const cy = h * 0.5;
      const scale = (opts?.scaleFactor || 1) * (w / 380);
      const { depth } = getTempoProgress(progress);

      const floorY = cy + 130 * scale;
      drawStudioFloor(ctx, cx, floorY, 120 * scale);

      // Standing posture
      const footLX = cx - 25 * scale;
      const footRX = cx + 25 * scale;
      const hipX = cx;
      const hipY = cy + 20 * scale;
      const shoulderX = cx;
      const shoulderY = cy - 55 * scale;
      const headX = cx;
      const headY = cy - 80 * scale;

      // Legs
      drawAthleticLimb(ctx, hipX - 12 * scale, hipY, footLX, floorY - 8 * scale, 15 * scale, '#18181B', '#71717A');
      drawAthleticLimb(ctx, hipX + 12 * scale, hipY, footRX, floorY - 8 * scale, 15 * scale, '#18181B', '#71717A');

      // Torso
      drawAthleticTorso(ctx, shoulderX, shoulderY, hipX, hipY, 42 * scale, 24 * scale, '#18181B', '#FFFFFF');

      // Head
      drawAthleticHead(ctx, headX, headY, 13 * scale, '#27272A', '#FFFFFF');

      // Lateral Arm Abduction
      // Arms lift from thighs (spread = 28, y = 20) out to parallel 90° (spread = 110, y = -50)
      const armSpread = (26 + depth * 84) * scale;
      const handY = cy + (22 - depth * 74) * scale;
      const elbowY = cy + (15 - depth * 70) * scale;

      // Left Arm & Dumbbell
      drawAthleticLimb(ctx, shoulderX - 20 * scale, shoulderY, cx - armSpread * 0.6, elbowY, 13 * scale, '#27272A', '#FFFFFF', depth > 0.6 ? '#374151' : undefined);
      drawAthleticLimb(ctx, cx - armSpread * 0.6, elbowY, cx - armSpread, handY, 11 * scale, '#3F3F46', '#FFFFFF');

      // Right Arm & Dumbbell
      drawAthleticLimb(ctx, shoulderX + 20 * scale, shoulderY, cx + armSpread * 0.6, elbowY, 13 * scale, '#27272A', '#FFFFFF', depth > 0.6 ? '#374151' : undefined);
      drawAthleticLimb(ctx, cx + armSpread * 0.6, elbowY, cx + armSpread, handY, 11 * scale, '#3F3F46', '#FFFFFF');

      // Dumbbells in hands
      ctx.fillStyle = '#374151';
      ctx.beginPath();
      ctx.roundRect(cx - armSpread - 8 * scale, handY - 10 * scale, 16 * scale, 20 * scale, 4 * scale);
      ctx.roundRect(cx + armSpread - 8 * scale, handY - 10 * scale, 16 * scale, 20 * scale, 4 * scale);
      ctx.fill();
    }
  },

  // --------------------------------------------------------------------------
  // 8. LEG PRESS 45° (LEG PRESS SLED)
  // --------------------------------------------------------------------------
  leg_press_v1: {
    animationId: 'leg_press_v1',
    animationName: 'Leg Press 45°',
    version: '1.0',
    type: '3d_avatar_loop',
    targetMuscle: 'Quadríceps / Pernas',
    equipmentType: 'Aparelho Leg 45°',
    viewAngle: 'side',
    cycleDurationMs: 2500,
    render: (ctx, progress, w, h, opts) => {
      const cx = w * 0.5;
      const cy = h * 0.52;
      const scale = (opts?.scaleFactor || 1) * (w / 380);
      const { depth } = getTempoProgress(progress);

      const floorY = cy + 120 * scale;
      drawStudioFloor(ctx, cx, floorY, 130 * scale);

      // Leg Press 45° Machine Frame & Rails
      ctx.save();
      ctx.strokeStyle = '#27272A';
      ctx.lineWidth = 8 * scale;
      // 45 degree guide rail
      ctx.beginPath();
      ctx.moveTo(cx - 90 * scale, cy + 80 * scale);
      ctx.lineTo(cx + 90 * scale, cy - 100 * scale);
      ctx.stroke();

      // Backrest pad at 45 degrees
      ctx.fillStyle = '#18181B';
      ctx.strokeStyle = '#3F3F46';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(cx - 100 * scale, cy + 90 * scale);
      ctx.lineTo(cx - 120 * scale, cy + 20 * scale);
      ctx.lineTo(cx - 105 * scale, cy + 15 * scale);
      ctx.lineTo(cx - 85 * scale, cy + 85 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Avatar seated
      const hipX = cx - 80 * scale;
      const hipY = cy + 70 * scale;
      const shoulderX = cx - 105 * scale;
      const shoulderY = cy + 30 * scale;
      const headX = cx - 118 * scale;
      const headY = cy + 12 * scale;

      // Sled platform travel along 45° rail
      // Extension top (cx + 55, cy - 65) -> Flexion bottom (cx + 10, cy - 20)
      const footX = cx + (55 - depth * 45) * scale;
      const footY = cy + (-65 + depth * 45) * scale;

      // Knee bends out & back towards chest during descent
      const kneeX = cx + (-15 - depth * 25) * scale;
      const kneeY = cy + (10 + depth * 15) * scale;

      // Torso & Head
      drawAthleticTorso(ctx, shoulderX, shoulderY, hipX, hipY, 32 * scale, 22 * scale, '#18181B', '#FFFFFF');
      drawAthleticHead(ctx, headX, headY, 13 * scale, '#27272A', '#FFFFFF');

      // Heavy Thigh & Calf
      drawAthleticLimb(ctx, hipX, hipY, kneeX, kneeY, 18 * scale, '#27272A', '#FFFFFF', depth > 0.5 ? '#374151' : undefined);
      drawAthleticLimb(ctx, kneeX, kneeY, footX, footY, 14 * scale, '#18181B', '#71717A', '#374151');

      // Footplate & Sled
      ctx.save();
      ctx.fillStyle = '#374151';
      ctx.beginPath();
      ctx.roundRect(footX - 12 * scale, footY - 20 * scale, 24 * scale, 40 * scale, 4 * scale);
      ctx.fill();
      ctx.restore();
    }
  }
};

/**
 * Exercise Name -> AnimationId Mapping Rules
 * Robust matching for instant resolving of animations from real exercise catalog or trainer names.
 */
const EXERCISE_KEYWORD_RULES: { keywords: string[]; animationId: string }[] = [
  {
    keywords: ['supino reto', 'supino com barra', 'bench press', 'supino plano', 'supino reto com barra'],
    animationId: 'bench_press_barbell_v1'
  },
  {
    keywords: ['agachamento livre', 'agachamento com barra', 'squat', 'back squat', 'agachamento'],
    animationId: 'squat_barbell_v1'
  },
  {
    keywords: ['puxada frontal', 'puxada aberta', 'lat pulldown', 'puxada na polia', 'puxada articulada'],
    animationId: 'lat_pulldown_v1'
  },
  {
    keywords: ['remada curvada', 'remada com barra', 'barbell row', 'remada pronada', 'remada supinada', 'remada fechada'],
    animationId: 'barbell_row_v1'
  },
  {
    keywords: ['rosca direta', 'rosca com barra', 'bicep curl', 'rosca direta com barra', 'rosca w'],
    animationId: 'bicep_curl_v1'
  },
  {
    keywords: ['triceps pulley', 'triceps corda', 'triceps na polia', 'triceps pushdown', 'triceps barra'],
    animationId: 'triceps_pushdown_v1'
  },
  {
    keywords: ['elevacao lateral', 'elevacao lateral com halteres', 'lateral raise', 'abducao de ombros'],
    animationId: 'lateral_raise_v1'
  },
  {
    keywords: ['leg press', 'leg 45', 'leg press 45', 'leg horizontal'],
    animationId: 'leg_press_v1'
  }
];

/**
 * Resolves an animation definition for an exercise by ID or name
 */
export function getAnimationForExercise(
  exerciseId?: string,
  exerciseName?: string,
  explicitAnimationId?: string
): ExerciseAnimationDefinition | null {
  // 1. Direct explicit animationId match
  if (explicitAnimationId && ANIMATION_DEFINITIONS[explicitAnimationId]) {
    return ANIMATION_DEFINITIONS[explicitAnimationId];
  }

  // 2. Direct exerciseId known aliases
  if (exerciseId) {
    if (ANIMATION_DEFINITIONS[exerciseId]) return ANIMATION_DEFINITIONS[exerciseId];
    if (exerciseId === 'ex-001') return ANIMATION_DEFINITIONS.bench_press_barbell_v1;
    if (exerciseId === 'ex-003') return ANIMATION_DEFINITIONS.bench_press_barbell_v1;
  }

  // 3. Name based keyword resolution
  if (exerciseName) {
    const normalized = normalizeExerciseName(exerciseName);
    
    for (const rule of EXERCISE_KEYWORD_RULES) {
      for (const kw of rule.keywords) {
        if (normalized.includes(normalizeExerciseName(kw))) {
          return ANIMATION_DEFINITIONS[rule.animationId] || null;
        }
      }
    }
  }

  return null;
}

/**
 * Checks if an exercise has a 3D animation available
 */
export function hasAnimationForExercise(
  exerciseId?: string,
  exerciseName?: string,
  explicitAnimationId?: string
): boolean {
  return getAnimationForExercise(exerciseId, exerciseName, explicitAnimationId) !== null;
}

/**
 * Lists all available animations in the registry
 */
export function listAvailableAnimations(): ExerciseAnimationDefinition[] {
  return Object.values(ANIMATION_DEFINITIONS);
}
