import React, { useState, useEffect } from 'react';
import { Minus, Plus } from 'lucide-react';

export interface NumberStepperProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  ariaLabelMinus?: string;
  ariaLabelPlus?: string;
  helperText?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  quickPresets?: { label: string; value: number }[];
}

/**
 * Standard Numeric Stepper with − / + touch buttons (≥44px touch area)
 * and direct numeric keyboard input support (inputMode="numeric").
 */
export const NumberStepper: React.FC<NumberStepperProps> = ({
  label,
  value,
  onChange,
  min = 1,
  max = 20,
  step = 1,
  unit = '',
  ariaLabelMinus,
  ariaLabelPlus,
  helperText,
  className = '',
  size = 'md',
  quickPresets
}) => {
  const safeValue = typeof value === 'number' && !isNaN(value) ? Math.max(min, Math.min(max, value)) : min;
  const [inputText, setInputText] = useState<string>(String(safeValue));

  useEffect(() => {
    setInputText(String(safeValue));
  }, [safeValue]);

  const handleDecrease = () => {
    const next = Math.max(min, safeValue - step);
    onChange(next);
  };

  const handleIncrease = () => {
    const next = Math.min(max, safeValue + step);
    onChange(next);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value.replace(/[^0-9]/g, '');
    setInputText(text);
    if (text !== '') {
      const num = parseInt(text, 10);
      if (!isNaN(num)) {
        const clamped = Math.max(min, Math.min(max, num));
        onChange(clamped);
      }
    }
  };

  const handleInputBlur = () => {
    if (inputText === '' || isNaN(parseInt(inputText, 10))) {
      setInputText(String(min));
      onChange(min);
    } else {
      const num = parseInt(inputText, 10);
      const clamped = Math.max(min, Math.min(max, num));
      setInputText(String(clamped));
      onChange(clamped);
    }
  };

  // Button sizes (minimum 44x44px for excellent touch accessibility)
  const btnSizeClasses = size === 'sm' 
    ? 'w-10 h-10 sm:w-11 sm:h-11 min-w-[40px] min-h-[40px]' 
    : size === 'lg'
    ? 'w-12 h-12 min-w-[48px] min-h-[48px]'
    : 'w-11 h-11 min-w-[44px] min-h-[44px]';

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#4B5563] flex items-center gap-1.5">
            <span>{label}</span>
            {helperText && <span className="text-[9px] text-[#71717A] lowercase font-normal">({helperText})</span>}
          </label>
          {unit && <span className="text-[10px] text-[#71717A] font-mono-nums font-bold">{unit}</span>}
        </div>
      )}

      <div className="flex items-center bg-[#121212] border border-[#27272A] focus-within:border-[#374151] rounded-2xl p-1 shadow-inner transition-all">
        {/* Minus Button */}
        <button
          type="button"
          onClick={handleDecrease}
          disabled={safeValue <= min}
          aria-label={ariaLabelMinus || `Diminuir ${label || 'séries'}`}
          className={`${btnSizeClasses} rounded-xl bg-[#18181B] hover:bg-[#27272A] active:bg-[#3F3F46] disabled:opacity-80 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all select-none border border-[#27272A]/70 shrink-0`}
        >
          <Minus className="w-4 h-4 text-[#A1A1AA] hover:text-white" />
        </button>

        {/* Value Text / Input */}
        <div className="flex-1 flex items-center justify-center px-2 min-w-0">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={inputText}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onFocus={(e) => e.target.select()}
            className="w-full bg-transparent text-center text-base sm:text-lg font-black font-mono-nums text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* Plus Button */}
        <button
          type="button"
          onClick={handleIncrease}
          disabled={safeValue >= max}
          aria-label={ariaLabelPlus || `Aumentar ${label || 'séries'}`}
          className={`${btnSizeClasses} rounded-xl bg-[#18181B] hover:bg-[#27272A] active:bg-[#3F3F46] disabled:opacity-80 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all select-none border border-[#27272A]/70 shrink-0`}
        >
          <Plus className="w-4 h-4 text-[#A1A1AA] hover:text-white" />
        </button>
      </div>

      {/* Optional Quick Presets Chips */}
      {quickPresets && quickPresets.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          {quickPresets.map(preset => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange(preset.value)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono-nums transition-all ${
                safeValue === preset.value
                  ? 'bg-[#374151] text-white'
                  : 'bg-[#18181B] text-[#71717A] hover:text-white border border-[#27272A]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export interface RestStepperProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
}

const COMMON_REST_CHIPS = [
  { label: '0s', value: 0 },
  { label: '30s', value: 30 },
  { label: '45s', value: 45 },
  { label: '60s', value: 60 },
  { label: '90s', value: 90 },
  { label: '120s', value: 120 }
];

/**
 * Specialized Rest Stepper with -15s / +15s buttons and quick preset chips.
 */
export const RestStepper: React.FC<RestStepperProps> = ({
  label = 'Descanso',
  value = 60,
  onChange,
  step = 15,
  min = 0,
  max = 600,
  className = ''
}) => {
  const safeValue = typeof value === 'number' && !isNaN(value) ? Math.max(min, Math.min(max, value)) : 60;
  const [inputText, setInputText] = useState<string>(String(safeValue));

  useEffect(() => {
    setInputText(String(safeValue));
  }, [safeValue]);

  const handleDecrease = () => {
    const next = Math.max(min, safeValue - step);
    onChange(next);
  };

  const handleIncrease = () => {
    const next = Math.min(max, safeValue + step);
    onChange(next);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value.replace(/[^0-9]/g, '');
    setInputText(text);
    if (text !== '') {
      const num = parseInt(text, 10);
      if (!isNaN(num)) {
        const clamped = Math.max(min, Math.min(max, num));
        onChange(clamped);
      }
    }
  };

  const handleInputBlur = () => {
    if (inputText === '' || isNaN(parseInt(inputText, 10))) {
      setInputText(String(min));
      onChange(min);
    } else {
      const num = parseInt(inputText, 10);
      const clamped = Math.max(min, Math.min(max, num));
      setInputText(String(clamped));
      onChange(clamped);
    }
  };

  const formatRestDisplay = (s: number) => {
    if (s === 0) return '0s (direto)';
    if (s >= 60 && s % 60 === 0) return `${s / 60} min`;
    if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`;
    return `${s}s`;
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA]">
          {label}
        </label>
        <span className="text-[10px] font-mono-nums font-bold text-[#E4E4E7]">
          {formatRestDisplay(safeValue)}
        </span>
      </div>

      <div className="flex items-center bg-[#121212] border border-[#27272A] focus-within:border-[#374151] rounded-2xl p-1 shadow-inner transition-all">
        {/* -15s Button */}
        <button
          type="button"
          onClick={handleDecrease}
          disabled={safeValue <= min}
          aria-label={`Diminuir descanso em ${step} segundos`}
          className="h-11 px-3 min-w-[44px] rounded-xl bg-[#18181B] hover:bg-[#27272A] active:bg-[#3F3F46] disabled:opacity-80 disabled:cursor-not-allowed text-white text-xs font-bold font-mono-nums flex items-center justify-center gap-1 transition-all select-none border border-[#27272A]/70 shrink-0"
        >
          <Minus className="w-3.5 h-3.5" />
          <span>{step}s</span>
        </button>

        {/* Value Text / Input */}
        <div className="flex-1 flex items-center justify-center px-1.5 min-w-0">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={inputText}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onFocus={(e) => e.target.select()}
            className="w-full bg-transparent text-center text-base sm:text-lg font-black font-mono-nums text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-xs font-bold text-[#71717A] ml-0.5">s</span>
        </div>

        {/* +15s Button */}
        <button
          type="button"
          onClick={handleIncrease}
          disabled={safeValue >= max}
          aria-label={`Aumentar descanso em ${step} segundos`}
          className="h-11 px-3 min-w-[44px] rounded-xl bg-[#18181B] hover:bg-[#27272A] active:bg-[#3F3F46] disabled:opacity-80 disabled:cursor-not-allowed text-white text-xs font-bold font-mono-nums flex items-center justify-center gap-1 transition-all select-none border border-[#27272A]/70 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{step}s</span>
        </button>
      </div>

      {/* Preset Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {COMMON_REST_CHIPS.map(chip => (
          <button
            key={chip.label}
            type="button"
            onClick={() => onChange(chip.value)}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono-nums whitespace-nowrap transition-all ${
              safeValue === chip.value
                ? 'bg-[#374151] text-white shadow-sm'
                : 'bg-[#18181B] text-[#71717A] hover:text-white border border-[#27272A]'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export interface RepsRangeStepperProps {
  repsMin: number;
  repsMax: number;
  onChangeMin: (val: number) => void;
  onChangeMax: (val: number) => void;
  className?: string;
}

const COMMON_REPS_PRESETS = [
  { label: '8–12', min: 8, max: 12 },
  { label: '10–12', min: 10, max: 12 },
  { label: '12–15', min: 12, max: 15 },
  { label: '6–8 (Força)', min: 6, max: 8 },
  { label: '15–20', min: 15, max: 20 },
  { label: '4–6', min: 4, max: 6 }
];

/**
 * Control for Repetitions with Steppers for Min and Max reps, plus 1-touch preset chips.
 */
export const RepsRangeStepper: React.FC<RepsRangeStepperProps> = ({
  repsMin,
  repsMax,
  onChangeMin,
  onChangeMax,
  className = ''
}) => {
  const safeMin = Math.max(1, repsMin || 1);
  const safeMax = Math.max(safeMin, repsMax || safeMin);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <NumberStepper
          label="Reps Mín"
          value={safeMin}
          min={1}
          max={100}
          onChange={(newMin) => {
            onChangeMin(newMin);
            if (newMin > safeMax) {
              onChangeMax(newMin);
            }
          }}
          ariaLabelMinus="Diminuir repetições mínimas"
          ariaLabelPlus="Aumentar repetições mínimas"
        />

        <NumberStepper
          label="Reps Máx"
          value={safeMax}
          min={safeMin}
          max={100}
          onChange={(newMax) => {
            onChangeMax(Math.max(safeMin, newMax));
          }}
          ariaLabelMinus="Diminuir repetições máximas"
          ariaLabelPlus="Aumentar repetições máximas"
        />
      </div>

      {/* Preset range buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {COMMON_REPS_PRESETS.map(p => {
          const isActive = safeMin === p.min && safeMax === p.max;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                onChangeMin(p.min);
                onChangeMax(p.max);
              }}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono-nums whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#374151] text-white shadow-sm'
                  : 'bg-[#18181B] text-[#71717A] hover:text-white border border-[#27272A]'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
