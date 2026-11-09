import React, { useState } from 'react';
import { X, Dumbbell, ArrowRight, AlertCircle, RefreshCw, Check } from 'lucide-react';
import { TrainingCycle, TrainingBlock, WorkoutRoutine } from '../../types';

interface ChangeBlockRoutineModalProps {
  cycle: TrainingCycle;
  block: TrainingBlock;
  routines: WorkoutRoutine[];
  onClose: () => void;
  onConfirm: (routineId: string, routineTitle: string, note?: string) => Promise<void>;
}

export const ChangeBlockRoutineModal: React.FC<ChangeBlockRoutineModalProps> = ({
  cycle,
  block,
  routines,
  onClose,
  onConfirm
}) => {
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>(block.routineId || '');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const currentRoutine = routines.find(r => r.id === block.routineId);
  const selectedRoutine = routines.find(r => r.id === selectedRoutineId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoutineId || selectedRoutineId === block.routineId) {
      onClose();
      return;
    }

    const title = selectedRoutine?.title || 'Rotina Personalizada';
    try {
      setIsSubmitting(true);
      await onConfirm(selectedRoutineId, title, note.trim() || undefined);
      onClose();
    } catch (err) {
      console.error('Failed to change block routine:', err);
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
              Trocar Rotina do Bloco
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
          {/* Routine Selection */}
          <div>
            <label className="block text-xs font-bold font-display uppercase tracking-wider text-[#4B5563] mb-2">
              Selecione a Nova Rotina
            </label>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {routines.map(r => {
                const isSelected = selectedRoutineId === r.id;
                const isCurrent = block.routineId === r.id;

                return (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => setSelectedRoutineId(r.id)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-[#F3F4F6] border-[#374151] text-white shadow-md'
                        : 'bg-[#18181B] border-[#27272A] text-[#4B5563] hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-[#374151] text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                        <Dumbbell className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-white truncate">{r.title}</span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-zinc-700">
                              Atual
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#4B5563] truncate">
                          {r.workouts?.length || 0} treinos ({r.workouts?.map(w => w.letter).join(', ')})
                          {r.objective ? ` • ${r.objective}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-[#374151] bg-[#374151] text-white' : 'border-[#27272A] bg-transparent'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}

              {routines.length === 0 && (
                <div className="p-4 rounded-2xl bg-[#18181B] border border-[#27272A] text-center text-xs text-[#4B5563]">
                  Nenhuma rotina cadastrada para este aluno ainda.
                </div>
              )}
            </div>
          </div>

          {/* Optional reason / note */}
          <div>
            <label className="block text-xs font-bold font-display uppercase tracking-wider text-[#4B5563] mb-1.5">
              Motivo do Ajuste (Opcional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Ajuste de volume / foco em membros superiores"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#18181B] border border-[#27272A] text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-[#374151]"
            />
          </div>

          {/* Immutability guarantee info */}
          <div className="p-3.5 rounded-2xl bg-[#18181B] border border-[#27272A] flex items-start gap-2.5 text-[11px] text-[#4B5563] leading-relaxed">
            <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-white">Preservação Histórica:</strong> A substituição da rotina afetará apenas os futuros atendimentos deste bloco. Sessões antigas, cargas, PRs e rotinas históricas permanecem 100% inalteradas.
            </span>
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
              disabled={isSubmitting || !selectedRoutineId || selectedRoutineId === block.routineId}
              className="flex-1 py-3 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all shadow-lg shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-80"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{isSubmitting ? 'Atualizando...' : 'Trocar Rotina'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
