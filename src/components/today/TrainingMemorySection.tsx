import React, { useState } from 'react';
import { 
  Bell, 
  Check, 
  Plus, 
  X, 
  Dumbbell, 
  Clock, 
  AlertCircle, 
  BookmarkCheck 
} from 'lucide-react';
import { TrainingMemory, Student, RoutineExercise } from '../../types';
import { generateId } from '../../db/indexedDB';
import { authService } from '../../services/authService';

interface TrainingMemorySectionProps {
  student: Student;
  activeMemories: TrainingMemory[];
  exercisesForContext?: RoutineExercise[];
  onSaveMemory: (memory: TrainingMemory) => Promise<void>;
  onResolveMemory: (id: string) => Promise<void>;
}

export const TrainingMemorySection: React.FC<TrainingMemorySectionProps> = ({
  student,
  activeMemories,
  exercisesForContext = [],
  onSaveMemory,
  onResolveMemory
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [reminderText, setReminderText] = useState('');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const handleResolve = async (id: string) => {
    try {
      setResolvingId(id);
      await onResolveMemory(id);
    } finally {
      setResolvingId(null);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderText.trim() || isSaving) return;

    try {
      setIsSaving(true);
      const chosenExercise = exercisesForContext.find(
        ex => (ex.exerciseId || (ex as any).id) === selectedExerciseId
      );

      const newMemory: TrainingMemory = {
        id: generateId(),
        organizationId: student.organizationId || authService.getOrganizationId(),
        studentId: student.id,
        exerciseId: selectedExerciseId ? selectedExerciseId : undefined,
        exerciseNameSnapshot: chosenExercise?.exerciseName || (chosenExercise as any)?.name || undefined,
        text: reminderText.trim(),
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      };

      await onSaveMemory(newMemory);
      setReminderText('');
      setSelectedExerciseId('');
      setIsAdding(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#121212] border border-[#27272a] rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#18181B] border border-[#27272a] flex items-center justify-center text-zinc-300">
            <Bell className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-wider text-white">
            Lembretes para Hoje ({activeMemories.length})
          </h3>
        </div>

        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="px-2.5 py-1.5 rounded-lg bg-[#18181B] hover:bg-[#27272a] border border-[#27272a] text-[11px] font-bold text-white flex items-center gap-1.5 transition-colors min-h-[36px]"
          >
            <Plus className="w-3.5 h-3.5 text-zinc-300" />
            <span>Adicionar Lembrete</span>
          </button>
        )}
      </div>

      {/* Inline composer to add new reminder */}
      {isAdding && (
        <form onSubmit={handleAdd} className="p-3 rounded-lg bg-[#050505] border border-[#27272a] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider">
              Novo Lembrete Operacional
            </span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-[#A1A1AA] hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {exercisesForContext.length > 0 && (
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#A1A1AA] mb-1">
                Vincular a um exercício (opcional)
              </label>
              <select
                value={selectedExerciseId}
                onChange={e => setSelectedExerciseId(e.target.value)}
                className="w-full bg-[#18181B] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-zinc-500 focus:outline-none"
              >
                <option value="" className="bg-[#18181B] text-white">Lembrete Geral da Sessão</option>
                {exercisesForContext.map(ex => {
                  const id = ex.exerciseId || (ex as any).id || '';
                  const name = ex.exerciseName || (ex as any).name || 'Exercício';
                  return (
                    <option key={id} value={id} className="bg-[#18181B] text-white">
                      {name}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[10px] uppercase font-bold text-[#A1A1AA] mb-1">
              Observação / Meta para a sessão
            </label>
            <textarea
              value={reminderText}
              onChange={e => setReminderText(e.target.value)}
              placeholder='Ex: "Testar 32 kg se completar a faixa de 10 reps" ou "Observar amplitude no agachamento"'
              rows={2}
              className="w-full bg-[#18181B] border border-[#27272a] rounded-lg p-2.5 text-xs text-white placeholder-[#71717A] focus:border-zinc-500 focus:outline-none resize-none"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#A1A1AA] hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!reminderText.trim() || isSaving}
              className="px-4 py-1.5 rounded-lg bg-[#1F2937] hover:bg-[#111827] disabled:opacity-50 text-xs font-bold text-white transition-colors min-h-[36px]"
            >
              {isSaving ? 'Salvando...' : 'Salvar Lembrete'}
            </button>
          </div>
        </form>
      )}

      {/* List of active reminders */}
      {activeMemories.length > 0 ? (
        <div className="space-y-2">
          {activeMemories.map(mem => {
            const isResolving = resolvingId === mem.id;

            return (
              <div
                key={mem.id}
                className="p-3 rounded-lg bg-[#050505] border border-[#27272a] flex items-start justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  {mem.exerciseNameSnapshot && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#18181B] border border-[#27272a] text-zinc-300">
                      <Dumbbell className="w-2.5 h-2.5" />
                      <span>{mem.exerciseNameSnapshot}</span>
                    </span>
                  )}
                  <p className="text-xs font-bold text-white leading-relaxed">
                    "{mem.text}"
                  </p>
                  <p className="text-[9px] text-[#A1A1AA] flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    <span>Criado em {new Date(mem.createdAt).toLocaleDateString('pt-BR')}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleResolve(mem.id)}
                  disabled={isResolving}
                  className="px-2.5 py-1.5 rounded-lg bg-[#18181B] hover:bg-[#27272a] border border-[#27272a] text-[11px] font-bold text-[#A1A1AA] hover:text-white flex items-center gap-1.5 shrink-0 transition-colors min-h-[38px]"
                  title="Marcar como resolvido mantendo histórico"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isResolving ? 'Resolvendo...' : 'Marcar como Resolvido'}</span>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        !isAdding && (
          <p className="text-[11px] text-[#A1A1AA] italic py-1">
            Nenhum lembrete pendente para este aluno.
          </p>
        )
      )}
    </div>
  );
};
