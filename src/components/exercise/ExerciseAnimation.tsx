import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Play, Pause, RotateCcw, Sparkles, Activity } from 'lucide-react';
import { 
  getAnimationForExercise, 
  hasAnimationForExercise, 
  ExerciseAnimationDefinition,
  AnimationRenderOptions 
} from '../../services/exerciseAnimationRegistry';

export interface ExerciseAnimationProps {
  exerciseId?: string;
  exerciseName?: string;
  animationId?: string;
  autoplay?: boolean;
  loop?: boolean;
  showControls?: boolean;
  showBadge?: boolean;
  showEquipmentLabel?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'story' | 'full';
  className?: string;
  theme?: 'dark' | 'transparent' | 'light';
  renderOptions?: AnimationRenderOptions;
  onFrameCapture?: (canvas: HTMLCanvasElement) => void;
  fallbackText?: string;
}

export const ExerciseAnimation: React.FC<ExerciseAnimationProps> = ({
  exerciseId,
  exerciseName,
  animationId,
  autoplay = true,
  loop = true,
  showControls = false,
  showBadge = false,
  showEquipmentLabel = false,
  size = 'md',
  className = '',
  theme = 'transparent',
  renderOptions,
  onFrameCapture,
  fallbackText = 'Animação 3D em breve'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(autoplay);
  const [progress, setProgress] = useState<number>(0);

  // Resolve animation definition
  const animation: ExerciseAnimationDefinition | null = useMemo(() => {
    return getAnimationForExercise(exerciseId, exerciseName, animationId);
  }, [exerciseId, exerciseName, animationId]);

  // Sizing styles
  const sizeClasses = useMemo(() => {
    switch (size) {
      case 'sm':
        return 'w-24 h-24';
      case 'md':
        return 'w-48 h-48';
      case 'lg':
        return 'w-64 h-64';
      case 'xl':
        return 'w-80 h-80';
      case 'story':
        return 'w-full h-full max-h-[500px] aspect-square';
      case 'full':
        return 'w-full h-full';
      default:
        return 'w-48 h-48';
    }
  }, [size]);

  // Main 60fps render loop
  const renderFrame = useCallback((timestamp: number) => {
    if (!canvasRef.current || !animation) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
    }

    const elapsed = timestamp - startTimeRef.current;
    const duration = animation.cycleDurationMs || 2400;
    const rawProgress = (elapsed % duration) / duration;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Call animation render engine
    animation.render(ctx, rawProgress, canvas.width, canvas.height, {
      theme,
      ...renderOptions
    });

    setProgress(rawProgress);

    if (onFrameCapture) {
      onFrameCapture(canvas);
    }

    if (isPlaying) {
      animFrameId.current = requestAnimationFrame(renderFrame);
    }
  }, [animation, isPlaying, theme, renderOptions, onFrameCapture]);

  // Canvas resize and render trigger
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Use sharp high-DPI resolution
    const rect = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(rect.width, 240);
    const h = Math.max(rect.height, 240);

    canvas.width = w * dpr;
    canvas.height = h * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    if (animation) {
      if (isPlaying) {
        animFrameId.current = requestAnimationFrame(renderFrame);
      } else {
        // Draw initial resting pose
        ctx?.clearRect(0, 0, w, h);
        animation.render(ctx!, 0, w, h, { theme, ...renderOptions });
      }
    }

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [animation, isPlaying, renderFrame, theme, renderOptions]);

  // Play / Pause toggle
  const togglePlay = () => {
    setIsPlaying(prev => !prev);
    if (!isPlaying) {
      startTimeRef.current = null;
    }
  };

  // Reset to beginning
  const handleReset = () => {
    startTimeRef.current = null;
    if (canvasRef.current && animation) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const rect = containerRef.current?.getBoundingClientRect() || { width: 240, height: 240 };
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        animation.render(ctx, 0, rect.width, rect.height, { theme, ...renderOptions });
      }
    }
  };

  // Fallback when no animation is available
  if (!animation) {
    return (
      <div 
        className={`relative flex flex-col items-center justify-center rounded-2xl bg-[#18181B]/50 border border-dashed border-[#27272A] p-4 text-center ${sizeClasses} ${className}`}
      >
        <div className="w-10 h-10 rounded-xl bg-[#27272A] flex items-center justify-center text-[#71717A] mb-2">
          <Activity className="w-5 h-5" />
        </div>
        <p className="text-xs font-bold text-[#4B5563] uppercase tracking-wider line-clamp-1">
          {exerciseName || 'Exercício'}
        </p>
        <span className="text-[10px] text-[#71717A] mt-1">
          {fallbackText}
        </span>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-2xl ${sizeClasses} ${className}`}
    >
      {/* 3D Render Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain pointer-events-none select-none"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Top Badge: 3D Biomechanical Engine */}
      {showBadge && (
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-[9px] font-black font-display text-white uppercase tracking-wider z-10">
          <Sparkles className="w-2.5 h-2.5 text-[#374151]" />
          <span>3D MOTION</span>
        </div>
      )}

      {/* Equipment / Muscle Indicator */}
      {showEquipmentLabel && animation && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#18181B]/80 backdrop-blur-sm border border-[#27272A] text-[9px] font-bold text-[#4B5563] z-10">
          <span className="text-white">{animation.targetMuscle}</span>
          <span>•</span>
          <span>{animation.equipmentType}</span>
        </div>
      )}

      {/* Optional Interactive Controls */}
      {showControls && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm p-1 rounded-xl border border-white/10 z-10">
          <button
            onClick={togglePlay}
            className="p-1 rounded-lg hover:bg-white/10 text-white transition-all"
            title={isPlaying ? 'Pausar' : 'Reproduzir'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-[#374151]" />}
          </button>
          <button
            onClick={handleReset}
            className="p-1 rounded-lg hover:bg-white/10 text-[#4B5563] hover:text-white transition-all"
            title="Reiniciar"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
