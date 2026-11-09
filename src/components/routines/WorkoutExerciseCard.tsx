import React, { useState } from 'react';
import { 
  GripVertical, 
  ChevronUp, 
  ChevronDown, 
  MoreVertical, 
  Trash2, 
  Copy, 
  ArrowRightLeft, 
  History, 
  Split, 
  Minus, 
  Plus, 
  Dumbbell, 
  Clock, 
  Scale, 
  Zap, 
  Flame, 
  Timer, 
  Activity,
  TrendingUp,
  Sliders,
  ChevronRight
} from 'lucide-react';
import { RoutineExercise, PrescriptionType, Student, WorkoutSession } from '../../types';
import { NumberStepper, RestStepper, RepsRangeStepper } from '../common/StepperControl';
import { formatPrescriptionSummary } from '../../utils/calculations';
import { getStudentExerciseHistory } from '../../utils/studentExerciseHistory';

interface WorkoutExerciseCardProps {
  exercise: RoutineExercise;
  badgeIndexLabel: string;
  isInsideGroup?: boolean;
  standaloneIdx?: number;
  totalExercisesInWorkout: number;
  student?: Student;
  sessions?: WorkoutSession[];
  onUpdateProp: <K extends keyof RoutineExercise>(field: K, value: RoutineExercise[K]) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onReplace: () => void;
  onMakeBiSetWithNext?: () => void;
  onOpenHistory: (exerciseName: string, history: any) => void;
  // Drag and drop handlers
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onDragOver?: (e: React.DragEvent, id: string) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragging?: boolean;
}

const PRESCRIPTION_TYPES: { id: PrescriptionType; label: string; icon: any; hint: string }[] = [
  { id: 'weight_reps', label: 'Carga + Reps', icon: Dumbbell, hint: 'Musculação tradicional' },
  { id: 'reps', label: 'Apenas Reps', icon: Activity, hint: 'Peso corporal / calistenia' },
  { id: 'isometric', label: 'Isometria', icon: Timer, hint: 'Pranchas e sustentação' },
  { id: 'duration', label: 'Tempo / Duração', icon: Clock, hint: 'Execução por tempo' },
  { id: 'weight_duration', label: 'Carga + Tempo', icon: Scale, hint: 'Farmer walk / sustentação' },
  { id: 'distance', label: 'Distância', icon: Zap, hint: 'Metros / Quilômetros' },
  { id: 'duration_distance', label: 'Tempo + Distância', icon: Flame, hint: 'Cardio misto' },
  { id: 'cardio', label: 'Cardio / Esteira', icon: Flame, hint: 'Velocidade e inclinação' }
];

const RPE_PRESETS = [
  { label: 'Sem RPE', value: null },
  { label: 'RPE 6', value: 6 },
  { label: 'RPE 7', value: 7 },
  { label: 'RPE 7.5', value: 7.5 },
  { label: 'RPE 8', value: 8 },
  { label: 'RPE 8.5', value: 8.5 },
  { label: 'RPE 9', value: 9 },
  { label: 'RPE 9.5', value: 9.5 },
  { label: 'RPE 10 (Falha)', value: 10 }
];

export const WorkoutExerciseCard: React.FC<WorkoutExerciseCardProps> = ({
  exercise,
  badgeIndexLabel,
  isInsideGroup = false,
  standaloneIdx,
  totalExercisesInWorkout,
  student,
  sessions,
  onUpdateProp,
  onMoveUp,
  onMoveDown,
  onRemove,
  onDuplicate,
  onReplace,
  onMakeBiSetWithNext,
  onOpenHistory,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging = false
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showMenu, setShowMenu] = useState<boolean>(false);

  const currentType: PrescriptionType = exercise.prescriptionType || 'weight_reps';

  // Real student execution data
  const history = getStudentExerciseHistory(student?.id, exercise.exerciseId, exercise.exerciseName, sessions);
  const lastExecution = history.lastExecution;

  return (
    <div
      draggable={!isInsideGroup}
      onDragStart={e => onDragStart && onDragStart(e, exercise.id)}
      onDragOver={e => onDragOver && onDragOver(e, exercise.id)}
      onDragEnd={onDragEnd}
      className={`bg-[#F8F9FA] border rounded-2xl p-3 sm:p-4 transition-all relative ${
        isDragging
          ? 'opacity-70 border-dashed border-[#374151]'
          : isInsideGroup
          ? 'border-[#E5E7EB]/80'
          : 'border-[#E5E7EB] hover:border-[#D1D5DB]'
      }`}
    >
      {/* CARD MAIN ROW */}
      <div className="flex items-center justify-between gap-3">
        
        {/* Left Side: Drag Handle, Number Badge, Title, Muscle & Summary */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          
          {/* Drag Handle (Desktop/Tablet) */}
          {!isInsideGroup && (
            <div 
              className="hidden sm:flex text-[#52525B] hover:text-[#4B5563] cursor-grab active:cursor-grabbing p-1 -ml-1 touch-none"
              title="Arraste para reordenar"
            >
              <GripVertical className="w-4 h-4" />
            </div>
          )}

          {/* Index Badge */}
          <span className={`w-7 h-7 rounded-xl font-mono-nums font-black text-xs flex items-center justify-center shrink-0 ${
            isInsideGroup ? 'bg-[#F3F4F6] text-[#374151]' : 'bg-white border border-[#E5E7EB] text-[#1F2937]'
          }`}>
            {badgeIndexLabel}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-bold text-[#1F2937] truncate">
                {exercise.exerciseName}
              </h4>
              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-white text-[#4B5563] border border-[#E5E7EB]">
                {exercise.muscleGroup}
              </span>
              <span className="px-2 py-0.2 rounded text-[9px] font-bold bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB] uppercase">
                {PRESCRIPTION_TYPES.find(p => p.id === currentType)?.label || 'Carga + Reps'}
              </span>
            </div>

            {/* Formatted prescription summary & Progression hint */}
            <div className="flex items-center gap-2 flex-wrap text-[11px] text-[#4B5563] font-mono-nums mt-0.5">
              <span>{formatPrescriptionSummary(exercise)}</span>
              {!isInsideGroup && exercise.restSeconds !== undefined && (
                <>
                  <span className="text-[#52525B]">•</span>
                  <span>{exercise.restSeconds}s descanso</span>
                </>
              )}
              {exercise.targetRPE ? (
                <>
                  <span className="text-[#52525B]">•</span>
                  <span className="text-amber-400">RPE {exercise.targetRPE}</span>
                </>
              ) : null}
            </div>

            {/* REAL HISTORICAL EXECUTION BADGE (ONLY IF REAL DATA EXISTS) */}
            {history.hasHistory && lastExecution && (
              <div className="flex items-center gap-2 mt-1.5 pt-1 border-t border-[#E5E7EB]/60 flex-wrap">
                <div className="flex items-center gap-1.5 text-[10px] text-[#4B5563]">
                  <History className="w-3 h-3 text-[#374151]" />
                  <span className="text-[#4B5563]">Última execução ({lastExecution.date}):</span>
                  <span className="font-mono-nums font-bold text-white bg-[#F3F4F6] px-1.5 py-0.2 rounded border border-[#E5E7EB]">
                    {lastExecution.bestSetSummary || `${lastExecution.sets[0]?.weightKg} kg × ${lastExecution.sets[0]?.reps}`}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenHistory(exercise.exerciseName, history)}
                  className="text-[10px] font-bold text-[#374151] hover:underline flex items-center gap-0.5"
                >
                  <span>Ver Histórico</span>
                  <ChevronRight className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Fast Inline Steppers & Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          
          {/* Quick Series Stepper (Fast tap - +) */}
          {!isInsideGroup && (
            <div 
              className="flex items-center bg-white border border-[#E5E7EB] rounded-xl p-0.5" 
              title="Ajuste rápido de séries"
            >
              <button
                type="button"
                disabled={(exercise.targetSets || 3) <= 1}
                onClick={() => onUpdateProp('targetSets', Math.max(1, (exercise.targetSets || 3) - 1))}
                aria-label="Diminuir séries"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#F8F9FA] hover:bg-[#27272A] active:bg-[#F3F4F6] disabled:opacity-80 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all border border-[#E5E7EB]/70 shrink-0"
              >
                <Minus className="w-3 h-3 text-[#4B5563] hover:text-white" />
              </button>
              <div className="px-1.5 sm:px-2 min-w-[28px] sm:min-w-[34px] text-center font-mono-nums font-black text-xs sm:text-sm text-white select-none">
                {exercise.targetSets || 3}x
              </div>
              <button
                type="button"
                disabled={(exercise.targetSets || 3) >= 20}
                onClick={() => onUpdateProp('targetSets', Math.min(20, (exercise.targetSets || 3) + 1))}
                aria-label="Aumentar séries"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#F8F9FA] hover:bg-[#27272A] active:bg-[#F3F4F6] disabled:opacity-80 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all border border-[#E5E7EB]/70 shrink-0"
              >
                <Plus className="w-3 h-3 text-[#4B5563] hover:text-white" />
              </button>
            </div>
          )}

          {/* Quick Reorder Arrows (Mobile & Accessible) */}
          <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-xl border border-[#E5E7EB]">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={standaloneIdx === 0}
              className="p-1.5 rounded-lg text-[#4B5563] hover:text-white disabled:opacity-25 transition-colors"
              title="Mover para cima"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={standaloneIdx !== undefined && standaloneIdx >= totalExercisesInWorkout - 1}
              className="p-1.5 rounded-lg text-[#4B5563] hover:text-white disabled:opacity-25 transition-colors"
              title="Mover para baixo"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Expand / Collapse Details Button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              isExpanded
                ? 'bg-[#374151] text-white border-[#374151] shadow-sm'
                : 'bg-white border-[#E5E7EB] text-[#4B5563] hover:text-[#1F2937] hover:border-[#D1D5DB]'
            }`}
          >
            {isExpanded ? 'Recolher' : 'Configurar'}
          </button>

          {/* Action Menu (Substituir, Duplicar, Bi-set, Excluir) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#4B5563] hover:text-[#1F2937] border border-[#E5E7EB] transition-colors"
              title="Mais opções do exercício"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowMenu(false)} 
                />
                <div className="absolute right-0 top-full mt-1 z-50 w-52 bg-[#18181B] border border-[#27272A] rounded-2xl p-1.5 shadow-2xl space-y-1 text-white animate-in fade-in zoom-in-95 duration-100">
                  
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onReplace();
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-white hover:bg-[#27272A] flex items-center gap-2.5 transition-colors"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-white" />
                    <span>Substituir Exercício</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onDuplicate();
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-white hover:bg-[#27272A] flex items-center gap-2.5 transition-colors"
                  >
                    <Copy className="w-4 h-4 text-white" />
                    <span>Duplicar Exercício</span>
                  </button>

                  {!isInsideGroup && onMakeBiSetWithNext && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onMakeBiSetWithNext();
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-white hover:bg-[#27272A] flex items-center gap-2.5 transition-colors"
                    >
                      <Split className="w-4 h-4 text-amber-400" />
                      <span>Agrupar em Bi-Set</span>
                    </button>
                  )}

                  {history.hasHistory && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onOpenHistory(exercise.exerciseName, history);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-white hover:bg-[#27272A] flex items-center gap-2.5 transition-colors"
                    >
                      <History className="w-4 h-4 text-blue-400" />
                      <span>Ver Histórico do Aluno</span>
                    </button>
                  )}

                  <div className="border-t border-[#27272A] my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onRemove();
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-red-400 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir do Treino</span>
                  </button>

                </div>
              </>
            )}
          </div>

        </div>

      </div>

      {/* EXPANDED DETAILED PRESCRIPTION PANEL */}
      {isExpanded && (
        <div className="mt-4 pt-3.5 border-t border-[#E5E7EB] space-y-4 animate-in fade-in duration-150">
          
          {/* Prescription Type Switcher */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-[#4B5563] mb-1.5">
              Tipo de Prescrição
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {PRESCRIPTION_TYPES.map(pt => {
                const Icon = pt.icon;
                const isSelected = currentType === pt.id;
                return (
                  <button
                    key={pt.id}
                    type="button"
                    onClick={() => onUpdateProp('prescriptionType', pt.id)}
                    className={`p-2 rounded-xl text-left border transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'bg-[#374151] border-[#374151] text-white shadow-sm'
                        : 'bg-white border-[#E5E7EB] text-[#4B5563] hover:text-[#1F2937] hover:border-[#D1D5DB]'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-[#4B5563]'}`} />
                    <span className="text-[11px] font-bold truncate">{pt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Input Fields based on Prescription Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-3.5 rounded-2xl border border-[#E5E7EB]">
            
            {/* Séries Alvo */}
            <NumberStepper
              label="Séries Alvo"
              value={exercise.targetSets || 3}
              min={1}
              max={20}
              step={1}
              onChange={val => onUpdateProp('targetSets', val)}
              ariaLabelMinus="Diminuir séries"
              ariaLabelPlus="Aumentar séries"
              quickPresets={[{ label: '3x', value: 3 }, { label: '4x', value: 4 }, { label: '5x', value: 5 }]}
            />

            {/* Repetições (para weight_reps e reps) */}
            {(currentType === 'weight_reps' || currentType === 'reps') && (
              <div className="sm:col-span-2 lg:col-span-2">
                <RepsRangeStepper
                  repsMin={exercise.targetRepsMin || 10}
                  repsMax={exercise.targetRepsMax || 12}
                  onChangeMin={val => onUpdateProp('targetRepsMin', val)}
                  onChangeMax={val => onUpdateProp('targetRepsMax', val)}
                />
              </div>
            )}

            {/* Tempo / Duração */}
            {(currentType === 'isometric' || currentType === 'duration' || currentType === 'weight_duration' || currentType === 'duration_distance' || currentType === 'cardio') && (
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#4B5563]">
                    Duração Alvo
                  </span>
                  <div className="flex items-center gap-1 bg-[#F8F9FA] p-0.5 rounded-lg border border-[#E5E7EB]">
                    <button
                      type="button"
                      onClick={() => onUpdateProp('durationUnit', 'seconds')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                        (exercise.durationUnit || 'seconds') === 'seconds'
                          ? 'bg-[#374151] text-white'
                          : 'text-[#4B5563] hover:text-[#1F2937]'
                      }`}
                    >
                      Seg
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateProp('durationUnit', 'minutes')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                        exercise.durationUnit === 'minutes'
                          ? 'bg-[#374151] text-white'
                          : 'text-[#4B5563] hover:text-[#1F2937]'
                      }`}
                    >
                      Min
                    </button>
                  </div>
                </div>

                <NumberStepper
                  value={
                    exercise.durationUnit === 'minutes'
                      ? Math.round((exercise.targetDurationSeconds || 60) / 60)
                      : (exercise.targetDurationSeconds || 30)
                  }
                  min={1}
                  max={exercise.durationUnit === 'minutes' ? 120 : 600}
                  step={exercise.durationUnit === 'minutes' ? 1 : 5}
                  unit={exercise.durationUnit === 'minutes' ? 'min' : 's'}
                  onChange={val => {
                    const inSec = exercise.durationUnit === 'minutes' ? val * 60 : val;
                    onUpdateProp('targetDurationSeconds', inSec);
                  }}
                  ariaLabelMinus="Diminuir duração"
                  ariaLabelPlus="Aumentar duração"
                  quickPresets={exercise.durationUnit === 'minutes' 
                    ? [{ label: '1 min', value: 1 }, { label: '2 min', value: 2 }, { label: '5 min', value: 5 }]
                    : [{ label: '20s', value: 20 }, { label: '30s', value: 30 }, { label: '45s', value: 45 }, { label: '60s', value: 60 }]
                  }
                />
              </div>
            )}

            {/* Distância */}
            {(currentType === 'distance' || currentType === 'duration_distance' || currentType === 'cardio') && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#4B5563]">
                    Distância Alvo
                  </span>
                  <div className="flex items-center gap-1 bg-[#F8F9FA] p-0.5 rounded-lg border border-[#E5E7EB]">
                    <button
                      type="button"
                      onClick={() => onUpdateProp('distanceUnit', 'meters')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                        (exercise.distanceUnit || 'meters') === 'meters'
                          ? 'bg-[#374151] text-white'
                          : 'text-[#4B5563] hover:text-[#1F2937]'
                      }`}
                    >
                      m
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateProp('distanceUnit', 'km')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                        exercise.distanceUnit === 'km'
                          ? 'bg-[#374151] text-white'
                          : 'text-[#4B5563] hover:text-[#1F2937]'
                      }`}
                    >
                      km
                    </button>
                  </div>
                </div>

                <NumberStepper
                  value={exercise.targetDistance || (exercise.distanceUnit === 'km' ? 3 : 200)}
                  min={1}
                  max={exercise.distanceUnit === 'km' ? 50 : 5000}
                  step={exercise.distanceUnit === 'km' ? 1 : 50}
                  unit={exercise.distanceUnit === 'km' ? 'km' : 'm'}
                  onChange={val => onUpdateProp('targetDistance', val)}
                  ariaLabelMinus="Diminuir distância"
                  ariaLabelPlus="Aumentar distância"
                />
              </div>
            )}

            {/* Carga Sugerida */}
            {(currentType === 'weight_reps' || currentType === 'weight_duration') && (
              <div>
                <NumberStepper
                  label="Carga Sugerida"
                  value={exercise.lastSuggestedLoad || 0}
                  min={0}
                  max={500}
                  step={2}
                  unit="kg"
                  onChange={val => onUpdateProp('lastSuggestedLoad', val > 0 ? val : undefined)}
                  ariaLabelMinus="Diminuir carga sugerida"
                  ariaLabelPlus="Aumentar carga sugerida"
                  helperText="opcional"
                  quickPresets={[{ label: '10kg', value: 10 }, { label: '20kg', value: 20 }, { label: '30kg', value: 30 }]}
                />
              </div>
            )}

            {/* RPE Sugerido */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#4B5563]">
                RPE Sugerido
              </label>
              <select
                value={exercise.targetRPE ?? ''}
                onChange={e => onUpdateProp('targetRPE', e.target.value ? parseFloat(e.target.value) : null)}
                className="h-11 w-full bg-[#F8F9FA] border border-[#E5E7EB] focus:border-[#374151] rounded-2xl px-3 font-bold text-[#1F2937] text-xs focus:outline-none transition-colors"
              >
                {RPE_PRESETS.map(r => (
                  <option key={r.label} value={r.value ?? ''} className="bg-white text-[#1F2937]">{r.label}</option>
                ))}
              </select>
            </div>

            {/* Descanso Individual (se não for parte de um grupo) */}
            {!isInsideGroup && (
              <div className="sm:col-span-2">
                <RestStepper
                  label="Descanso Entre Séries"
                  value={exercise.restSeconds ?? 60}
                  min={0}
                  max={600}
                  step={15}
                  onChange={val => onUpdateProp('restSeconds', val)}
                />
              </div>
            )}

            {/* Observações Técnicas */}
            <div className="col-span-full">
              <label className="block text-[10px] font-bold uppercase text-[#4B5563] mb-1">
                Observações Técnicas / Instruções de Execução
              </label>
              <input
                type="text"
                value={exercise.notes || ''}
                onChange={e => onUpdateProp('notes', e.target.value)}
                placeholder="Ex: Pausa de 2s no ponto de estiramento, usar pegada neutra..."
                className="w-full bg-[#F8F9FA] border border-[#E5E7EB] focus:border-[#374151] rounded-xl px-3.5 py-2.5 text-xs text-[#1F2937] placeholder-[#71717A] focus:outline-none transition-colors"
              />
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
