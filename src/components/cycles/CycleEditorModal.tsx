import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Layers, 
  Plus, 
  Trash2, 
  Dumbbell, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  Sparkles,
  ArrowRight,
  ChevronDown,
  Info
} from 'lucide-react';
import { 
  TrainingCycle, 
  TrainingBlock, 
  TrainingCycleStatus, 
  WorkoutRoutine, 
  Student 
} from '../../types';
import { 
  formatDateBr, 
  formatIsoDateOnly, 
  addDaysToDate, 
  parseIsoDateOnly, 
  recalculateBlockDates,
  DEFAULT_CYCLE_OBJECTIVES,
  createDefaultTrainingBlock
} from '../../utils/cycleCalculations';
import { generateId } from '../../db/indexedDB';

interface CycleEditorModalProps {
  student: Student;
  routines: WorkoutRoutine[];
  existingCycle?: TrainingCycle | null;
  onClose: () => void;
  onSave: (cycle: TrainingCycle) => Promise<void>;
}

const DURATION_PRESETS = [4, 6, 8, 12, 16, 24];
const COMMON_CYCLE_NAMES = [
  'Hipertrofia',
  'Força Máxima',
  'Adaptação Anatômica',
  'Emagrecimento & Definição',
  'Resistência Muscular',
  'Condicionamento Funcional',
  'Periodização Linear',
  'Periodização Ondulatória'
];

export const CycleEditorModal: React.FC<CycleEditorModalProps> = ({
  student,
  routines,
  existingCycle,
  onClose,
  onSave
}) => {
  const isEditing = !!existingCycle;
  const todayIso = useMemo(() => formatIsoDateOnly(new Date()), []);

  // Cycle basic fields
  const [name, setName] = useState<string>(existingCycle?.name || 'Hipertrofia');
  const [objective, setObjective] = useState<string>(existingCycle?.objective || 'Hipertrofia');
  const [startDate, setStartDate] = useState<string>(existingCycle?.startDate || todayIso);
  const [totalWeeks, setTotalWeeks] = useState<number>(existingCycle?.totalWeeks || 12);
  const [status, setStatus] = useState<TrainingCycleStatus>(existingCycle?.status || 'current');
  const [notes, setNotes] = useState<string>(existingCycle?.notes || '');
  const [reviewDate, setReviewDate] = useState<string>(existingCycle?.reviewDate || '');

  // Blocks state
  const [blocks, setBlocks] = useState<TrainingBlock[]>(() => {
    if (existingCycle && existingCycle.blocks.length > 0) {
      return JSON.parse(JSON.stringify(existingCycle.blocks));
    }
    // Default: 3 initial blocks for a 12-week cycle
    const defaultRoutines = routines.slice(0, 3);
    const b1 = createDefaultTrainingBlock(1, 'Adaptação', 4, defaultRoutines[0]?.id, defaultRoutines[0]?.title);
    const b2 = createDefaultTrainingBlock(2, 'Hipertrofia', 4, defaultRoutines[1]?.id || defaultRoutines[0]?.id, defaultRoutines[1]?.title || defaultRoutines[0]?.title);
    const b3 = createDefaultTrainingBlock(3, 'Progressão / Choque', 4, defaultRoutines[2]?.id || defaultRoutines[0]?.id, defaultRoutines[2]?.title || defaultRoutines[0]?.title);
    return recalculateBlockDates([b1, b2, b3], todayIso);
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Recalculate block dates whenever startDate or block durations change
  useEffect(() => {
    setBlocks(prev => recalculateBlockDates(prev, startDate));
  }, [startDate]);

  // Suggested review date (default to end of cycle or last block end date)
  useEffect(() => {
    if (!existingCycle && blocks.length > 0) {
      const lastBlock = blocks[blocks.length - 1];
      if (lastBlock?.endDate) {
        setReviewDate(lastBlock.endDate);
      }
    }
  }, [blocks, existingCycle]);

  // Sum of block weeks
  const sumBlockWeeks = useMemo(() => {
    return blocks.reduce((sum, b) => sum + (Number(b.durationWeeks) || 0), 0);
  }, [blocks]);

  // Auto-sync cycle weeks to sum of block weeks
  const handleSyncWeeksWithBlocks = () => {
    setTotalWeeks(sumBlockWeeks);
  };

  // Add a new block
  const handleAddBlock = () => {
    const nextOrder = blocks.length + 1;
    const remainingWeeks = Math.max(2, totalWeeks - sumBlockWeeks);
    const duration = remainingWeeks > 0 ? remainingWeeks : 4;
    const routine = routines[Math.min(blocks.length, routines.length - 1)];
    const newBlock = createDefaultTrainingBlock(
      nextOrder,
      `Bloco ${nextOrder}`,
      duration,
      routine?.id,
      routine?.title
    );
    const updated = recalculateBlockDates([...blocks, newBlock], startDate);
    setBlocks(updated);
  };

  // Remove a block
  const handleRemoveBlock = (blockId: string) => {
    if (blocks.length <= 1) return;
    const filtered = blocks.filter(b => b.id !== blockId);
    const reordered = filtered.map((b, idx) => ({ ...b, order: idx + 1 }));
    setBlocks(recalculateBlockDates(reordered, startDate));
  };

  // Update a block field
  const handleUpdateBlock = (blockId: string, field: keyof TrainingBlock, value: any) => {
    setBlocks(prev => {
      const updated = prev.map(b => {
        if (b.id !== blockId) return b;
        if (field === 'routineId') {
          const selected = routines.find(r => r.id === value);
          return {
            ...b,
            routineId: value,
            routineTitleSnapshot: selected?.title || undefined
          };
        }
        return { ...b, [field]: value };
      });
      return recalculateBlockDates(updated, startDate);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Informe o nome do ciclo de treinamento.');
      return;
    }

    if (!startDate) {
      setFormError('Informe a data de início do ciclo.');
      return;
    }

    if (blocks.length === 0) {
      setFormError('Adicione pelo menos 1 bloco de treinamento.');
      return;
    }

    const calculatedBlocks = recalculateBlockDates(blocks, startDate);

    const cycleToSave: TrainingCycle = {
      id: existingCycle?.id || generateId('cycle'),
      studentId: student.id,
      name: name.trim(),
      objective: objective.trim() || undefined,
      startDate,
      totalWeeks: Number(totalWeeks) || sumBlockWeeks,
      reviewDate: reviewDate || undefined,
      status,
      blocks: calculatedBlocks,
      notes: notes.trim() || undefined,
      createdAt: existingCycle?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      setIsSubmitting(true);
      await onSave(cycleToSave);
      onClose();
    } catch (err) {
      console.error('Failed to save training cycle:', err);
      setFormError('Erro ao salvar o ciclo de treinamento. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div 
        className="bg-[#121212] border border-[#27272A] w-full max-w-2xl rounded-3xl p-5 sm:p-6 shadow-2xl relative my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#27272A] mb-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#374151] bg-[#F3F4F6] px-2.5 py-0.5 rounded-full border border-[#374151]/20">
                Periodização TFIVE PRO
              </span>
              <span className="text-[10px] font-bold text-[#4B5563] uppercase">
                Aluno: {student.name}
              </span>
            </div>
            <h2 className="text-xl font-black font-display text-white truncate">
              {isEditing ? 'Editar Ciclo de Treinamento' : 'Novo Ciclo de Treinamento'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#4B5563] hover:text-white transition-all shrink-0"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {formError && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* SECTION 1: DADOS DO CICLO */}
          <div className="space-y-4 bg-[#18181B] p-4 rounded-2xl border border-[#27272A]">
            <h3 className="text-xs font-black font-display uppercase tracking-wider text-white flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[#374151]" />
              <span>1. Configuração Geral do Ciclo</span>
            </h3>

            {/* Nome do Ciclo */}
            <div>
              <label className="block text-[11px] font-bold font-display uppercase tracking-wider text-[#4B5563] mb-1.5">
                Nome do Ciclo *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Hipertrofia 2026 / Força / Adaptação"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#121212] border border-[#27272A] text-white text-sm font-bold focus:outline-none focus:border-[#374151]"
                required
              />
              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {COMMON_CYCLE_NAMES.slice(0, 5).map(preset => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => {
                      setName(preset);
                      setObjective(preset);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-[#121212] hover:bg-[#27272A] text-[10px] text-[#4B5563] hover:text-white border border-[#27272A] transition-all"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Objective & Status Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold font-display uppercase tracking-wider text-[#4B5563] mb-1.5">
                  Objetivo Principal
                </label>
                <select
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#27272A] text-white text-xs focus:outline-none focus:border-[#374151]"
                >
                  {DEFAULT_CYCLE_OBJECTIVES.map(obj => (
                    <option key={obj} value={obj}>{obj}</option>
                  ))}
                  <option value="Personalizado">Personalizado</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold font-display uppercase tracking-wider text-[#4B5563] mb-1.5">
                  Status do Ciclo
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TrainingCycleStatus)}
                  className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#27272A] text-white text-xs focus:outline-none focus:border-[#374151]"
                >
                  <option value="current">Ativo / Atual (Em andamento)</option>
                  <option value="planned">Planejado (Próximo ciclo)</option>
                  <option value="completed">Concluído</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>
            </div>

            {/* Start Date, Total Duration, Reavaliação */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold font-display uppercase tracking-wider text-[#4B5563] mb-1.5">
                  Data de Início *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#27272A] text-white text-xs focus:outline-none focus:border-[#374151]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold font-display uppercase tracking-wider text-[#4B5563] mb-1.5">
                  Duração Total (Semanas)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={totalWeeks}
                    onChange={(e) => setTotalWeeks(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#27272A] text-white text-xs font-bold focus:outline-none focus:border-[#374151]"
                  />
                  <span className="text-xs text-[#4B5563] shrink-0">sem</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold font-display uppercase tracking-wider text-[#4B5563] mb-1.5">
                  Data Reavaliação
                </label>
                <input
                  type="date"
                  value={reviewDate}
                  onChange={(e) => setReviewDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#121212] border border-[#27272A] text-white text-xs focus:outline-none focus:border-[#374151]"
                />
              </div>
            </div>

            {/* Quick Weeks Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-[#4B5563] mr-1">Atalhos:</span>
              {DURATION_PRESETS.map(w => (
                <button
                  type="button"
                  key={w}
                  onClick={() => setTotalWeeks(w)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    totalWeeks === w
                      ? 'bg-[#374151] text-white shadow-sm'
                      : 'bg-[#121212] text-[#4B5563] hover:text-white border border-[#27272A]'
                  }`}
                >
                  {w} sem
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 2: BLOCOS DE TREINAMENTO */}
          <div className="space-y-4 bg-[#18181B] p-4 rounded-2xl border border-[#27272A]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black font-display uppercase tracking-wider text-white flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-[#374151]" />
                  <span>2. Blocos de Treinamento ({blocks.length})</span>
                </h3>
                <p className="text-[11px] text-[#4B5563] mt-0.5">
                  Cada bloco dura um número de semanas e associa uma rotina de treino existente
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddBlock}
                className="px-3 py-1.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-bold font-display uppercase tracking-wider transition-all flex items-center gap-1 shadow-md shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Bloco</span>
              </button>
            </div>

            {/* Blocks List */}
            <div className="space-y-3">
              {blocks.map((block, index) => (
                <div 
                  key={block.id} 
                  className="bg-[#121212] border border-[#27272A] rounded-2xl p-3.5 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB] flex items-center justify-center text-xs font-black">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={block.name}
                        onChange={(e) => handleUpdateBlock(block.id, 'name', e.target.value)}
                        placeholder={`Nome do Bloco ${index + 1}`}
                        className="px-2.5 py-1 rounded-lg bg-[#18181B] border border-[#27272A] text-white text-xs font-bold focus:outline-none focus:border-[#374151]"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Dates calculated automatically */}
                      <span className="text-[11px] text-zinc-400 font-medium">
                        {formatDateBr(block.startDate)} até {formatDateBr(block.endDate)}
                      </span>

                      {blocks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBlock(block.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                          title="Remover bloco"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Duration in weeks */}
                    <div>
                      <label className="block text-[10px] font-bold font-display uppercase tracking-wider text-[#4B5563] mb-1">
                        Duração do Bloco
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max="24"
                          value={block.durationWeeks}
                          onChange={(e) => handleUpdateBlock(block.id, 'durationWeeks', Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-20 px-2.5 py-1.5 rounded-lg bg-[#18181B] border border-[#27272A] text-white text-xs font-bold text-center focus:outline-none focus:border-[#374151]"
                        />
                        <span className="text-xs text-[#4B5563]">semanas</span>
                        <div className="flex items-center gap-1 ml-2">
                          {[2, 4, 6].map(w => (
                            <button
                              type="button"
                              key={w}
                              onClick={() => handleUpdateBlock(block.id, 'durationWeeks', w)}
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                block.durationWeeks === w 
                                  ? 'bg-[#374151] text-white' 
                                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
                              }`}
                            >
                              {w}s
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Associated Routine */}
                    <div>
                      <label className="block text-[10px] font-bold font-display uppercase tracking-wider text-[#4B5563] mb-1">
                        Rotina Associada (A / B / C / D)
                      </label>
                      <select
                        value={block.routineId || ''}
                        onChange={(e) => handleUpdateBlock(block.id, 'routineId', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#18181B] border border-[#27272A] text-white text-xs focus:outline-none focus:border-[#374151]"
                      >
                        <option value="">Sem rotina associada</option>
                        {routines.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.title} ({r.workouts?.map(w => w.letter).join('/')}) {r.objective ? `- ${r.objective}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Weeks validation & auto-sync message */}
            <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
              sumBlockWeeks === totalWeeks
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}>
              <div className="flex items-center gap-2">
                {sumBlockWeeks === totalWeeks ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span>
                  Soma dos blocos: <strong>{sumBlockWeeks} sem</strong> | Duração do ciclo: <strong>{totalWeeks} sem</strong>
                </span>
              </div>

              {sumBlockWeeks !== totalWeeks && (
                <button
                  type="button"
                  onClick={handleSyncWeeksWithBlocks}
                  className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[11px] font-bold transition-all shrink-0"
                >
                  Ajustar ciclo para {sumBlockWeeks} sem
                </button>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-bold font-display uppercase tracking-wider text-[#4B5563] mb-1.5">
              Observações do Planejamento (Opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Foco na transição para força pura na semana 8. Aluno com leve sobrecarga no manguito rotador."
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl bg-[#18181B] border border-[#27272A] text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-[#374151]"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center gap-3 pt-2 border-t border-[#27272A]">
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
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Salvando...' : isEditing ? 'Atualizar Ciclo' : 'Criar Ciclo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
