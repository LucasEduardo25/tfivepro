import React, { useState } from 'react';
import { X, Calendar, Clock, Plus, ArrowRight, AlertCircle } from 'lucide-react';
import { TrainingCycle, TrainingBlock } from '../../types';
import { formatDateBr, addDaysToDate, parseIsoDateOnly, formatIsoDateOnly } from '../../utils/cycleCalculations';

interface ExtendBlockModalProps {
  cycle: TrainingCycle;
  block: TrainingBlock;
  onClose: () => void;
  onConfirm: (additionalWeeks: number) => Promise<void>;
}

export const ExtendBlockModal: React.FC<ExtendBlockModalProps> = ({
  cycle,
  block,
  onClose,
  onConfirm
}) => {
  const [weeksToAdd, setWeeksToAdd] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const newDuration = block.durationWeeks + weeksToAdd;
  
  // Calculate new end date for this block
  const blockStart = parseIsoDateOnly(block.startDate);
  const newEndDateObj = addDaysToDate(blockStart, newDuration * 7 - 1);
  const newEndDateStr = formatIsoDateOnly(newEndDateObj);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (weeksToAdd <= 0) return;
    try {
      setIsSubmitting(true);
      await onConfirm(weeksToAdd);
      onClose();
    } catch (err) {
      console.error('Failed to extend block:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-[#121212] border border-[#27272A] w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl relative max-h-[calc(100dvh-2rem)] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#27272A] mb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#374151] bg-[#F3F4F6] px-2.5 py-0.5 rounded-full border border-[#374151]/20">
              Periodização
            </span>
            <h3 className="text-lg font-bold font-display text-white mt-1">
              Estender Duração do Bloco
            </h3>
            <p className="text-xs text-[#4B5563] mt-0.5">
              {block.name} — Ciclo: {cycle.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#4B5563] hover:text-white transition-all"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold font-display uppercase tracking-wider text-[#4B5563] mb-2">
              Quantas semanas deseja adicionar?
            </label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[1, 2, 3, 4].map(w => (
                <button
                  type="button"
                  key={w}
                  onClick={() => setWeeksToAdd(w)}
                  className={`py-3 rounded-2xl text-xs font-black font-display uppercase tracking-wider transition-all border ${
                    weeksToAdd === w
                      ? 'bg-[#374151] text-white border-[#374151] shadow-lg shadow-xs'
                      : 'bg-[#18181B] text-[#4B5563] border-[#27272A] hover:text-white hover:border-zinc-700'
                  }`}
                >
                  +{w} {w === 1 ? 'Semana' : 'Semanas'}
                </button>
              ))}
            </div>
          </div>

          {/* Impact preview */}
          <div className="p-4 rounded-2xl bg-[#18181B] border border-[#27272A] space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-[#4B5563]">
              <span>Duração do bloco:</span>
              <div className="flex items-center gap-1.5 font-bold text-white">
                <span>{block.durationWeeks} sem</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#374151]" />
                <span className="text-emerald-400 font-black">{newDuration} semanas</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[#4B5563]">
              <span>Data final do bloco:</span>
              <div className="flex items-center gap-1.5 font-bold text-white">
                <span>{formatDateBr(block.endDate)}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#374151]" />
                <span className="text-emerald-400 font-black">{formatDateBr(newEndDateStr)}</span>
              </div>
            </div>

            <div className="flex items-start gap-2 pt-2 border-t border-[#27272A] text-[11px] text-[#4B5563] leading-relaxed">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>
                As datas de início e término dos blocos subsequentes deste ciclo serão recalculadas automaticamente. O histórico de treinos e rotinas anteriores não será alterado.
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-white text-xs font-bold font-display uppercase tracking-wider transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all shadow-lg shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-80"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Salvando...' : 'Confirmar Extensão'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
