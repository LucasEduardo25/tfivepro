import React from 'react';
import { X, ArrowRightLeft, Dumbbell, Check, RefreshCw } from 'lucide-react';
import { Exercise, RoutineExercise } from '../../types';
import { formatPrescriptionSummary } from '../../utils/calculations';

interface ReplaceExerciseModalProps {
  currentExercise: RoutineExercise;
  newExercise: Exercise;
  onConfirm: (keepPrescription: boolean) => void;
  onCancel: () => void;
}

export const ReplaceExerciseModal: React.FC<ReplaceExerciseModalProps> = ({
  currentExercise,
  newExercise,
  onConfirm,
  onCancel
}) => {
  return (
    <div className="fixed inset-0 z-70 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-[#121212] border border-[#27272A] rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-5 text-white max-h-[calc(100dvh-2rem)] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#27272A] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#374151] shrink-0">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#374151]">
                Substituição de Exercício
              </span>
              <h3 className="text-base font-bold font-display text-white">
                Substituir no Treino
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl bg-[#27272A]/70 hover:bg-[#27272A] text-[#4B5563] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Box */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 space-y-3">
          {/* Current */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#71717A] uppercase">Exercício Atual:</span>
            <div className="p-2.5 rounded-xl bg-[#121212] border border-[#27272A]">
              <p className="text-xs font-bold text-white line-through opacity-70">
                {currentExercise.exerciseName}
              </p>
              <p className="text-[11px] text-[#4B5563] font-mono-nums mt-0.5">
                {formatPrescriptionSummary(currentExercise)}
                {currentExercise.restSeconds ? ` • ${currentExercise.restSeconds}s descanso` : ''}
              </p>
            </div>
          </div>

          {/* New */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#374151] uppercase">Novo Exercício:</span>
            <div className="p-2.5 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB]">
              <p className="text-xs font-bold text-white">
                {newExercise.name}
              </p>
              <p className="text-[10px] text-[#4B5563] mt-0.5">
                {newExercise.muscleGroup} • {newExercise.equipment || 'Equipamento padrão'}
              </p>
            </div>
          </div>
        </div>

        {/* Choice Explanation */}
        <div className="space-y-2">
          <p className="text-xs text-[#4B5563] font-medium">
            Como deseja configurar a prescrição do novo exercício?
          </p>

          <div className="grid grid-cols-1 gap-2.5">
            <button
              type="button"
              onClick={() => onConfirm(true)}
              className="p-3.5 rounded-2xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] hover:border-[#374151] text-left transition-all group flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-[#F3F4F6] text-[#374151] flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white group-hover:text-[#1F2937] transition-colors">
                  Manter Prescrição Atual
                </p>
                <p className="text-[11px] text-[#71717A] leading-relaxed">
                  Preserva as {currentExercise.targetSets || 3} séries, faixa de repetições ({currentExercise.targetRepsMin || 10}–{currentExercise.targetRepsMax || 12}), descanso ({currentExercise.restSeconds || 60}s) e observações.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onConfirm(false)}
              className="p-3.5 rounded-2xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] hover:border-zinc-500 text-left transition-all group flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-[#27272A] text-[#4B5563] flex items-center justify-center shrink-0 mt-0.5">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  Redefinir com Padrões do Exercício
                </p>
                <p className="text-[11px] text-[#71717A] leading-relaxed">
                  Aplica os valores padrão do catálogo para este exercício (3 séries, 10–12 reps, descanso recomendado).
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#4B5563] hover:text-white transition-colors"
          >
            Cancelar
          </button>
        </div>

      </div>
    </div>
  );
};
