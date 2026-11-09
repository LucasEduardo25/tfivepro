import React, { useState } from 'react';
import { X, BookmarkPlus, Sparkles, Check, AlertCircle, Layers } from 'lucide-react';
import { WorkoutRoutine } from '../../types';
import { useApp } from '../../context/AppContext';

interface SaveRoutineAsTemplateModalProps {
  routine: WorkoutRoutine;
  onClose: () => void;
  onSaved?: (templateId: string) => void;
}

const OBJECTIVE_PRESETS = [
  'Hipertrofia Muscular',
  'Hipertrofia ABC',
  'Hipertrofia ABCD',
  'Full Body 3x',
  'Força Máxima & Potência',
  'Emagrecimento & Definição',
  'Adaptação',
  'Membros Inferiores',
  'Superiores / Inferiores',
  'Condicionamento Geral',
  'Longevidade & Autonomia',
  'Personalizado'
];

const LEVEL_PRESETS = [
  'Iniciante',
  'Intermediário',
  'Avançado',
  'Atleta / Performance',
  'Todos os Níveis'
];

export const SaveRoutineAsTemplateModal: React.FC<SaveRoutineAsTemplateModalProps> = ({
  routine,
  onClose,
  onSaved
}) => {
  const { saveRoutineAsTemplate } = useApp();

  const [name, setName] = useState<string>(routine.title || routine.name || 'Modelo de Treino');
  const [objective, setObjective] = useState<string>(routine.objective || 'Hipertrofia Muscular');
  const [level, setLevel] = useState<string>('Intermediário');
  const [description, setDescription] = useState<string>(routine.description || routine.notes || '');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const workoutsCount = routine.workouts?.length || 0;
  const totalExercises = routine.workouts?.reduce((sum, w) => sum + (w.exercises?.length || 0), 0) || 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const template = await saveRoutineAsTemplate(routine, {
        name: name.trim(),
        objective: objective.trim(),
        level: level.trim(),
        description: description.trim()
      });

      setSaveSuccess(true);
      setTimeout(() => {
        if (onSaved) onSaved(template.id);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Erro ao salvar modelo:', err);
      alert('Não foi possível salvar o modelo de treino.');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto bg-[#121212] border border-[#27272A] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#27272A] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] text-[#374151]">
              <BookmarkPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black font-display uppercase tracking-wide">
                Salvar como Modelo
              </h3>
              <p className="text-xs text-[#4B5563]">
                Cria uma cópia independente na sua Biblioteca de Modelos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 rounded-xl text-[#4B5563] hover:text-white hover:bg-[#18181B] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {saveSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto animate-bounce">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">Modelo Salvo com Sucesso!</h4>
            <p className="text-xs text-[#4B5563]">
              O modelo está disponível na sua biblioteca para aplicação em qualquer aluno.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {/* Info Summary Box */}
            <div className="p-3.5 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#374151]" />
                <span className="text-[#4B5563]">Estrutura copiada:</span>
              </div>
              <span className="font-bold text-white">
                {workoutsCount} {workoutsCount === 1 ? 'Treino' : 'Treinos'} • {totalExercises} {totalExercises === 1 ? 'Exercício' : 'Exercícios'}
              </span>
            </div>

            {/* Template Name */}
            <div>
              <label className="block text-xs font-bold text-[#4B5563] uppercase tracking-wider mb-1.5">
                Nome do Modelo *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Hipertrofia ABC, Full Body 3x, Adaptação..."
                required
                className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#374151] transition-all"
              />
            </div>

            {/* Objective */}
            <div>
              <label className="block text-xs font-bold text-[#4B5563] uppercase tracking-wider mb-1.5">
                Objetivo Principal
              </label>
              <select
                value={objective}
                onChange={e => setObjective(e.target.value)}
                className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#374151] transition-all"
              >
                {OBJECTIVE_PRESETS.map(obj => (
                  <option key={obj} value={obj}>{obj}</option>
                ))}
              </select>
            </div>

            {/* Level */}
            <div>
              <label className="block text-xs font-bold text-[#4B5563] uppercase tracking-wider mb-1.5">
                Nível Recomendado
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {LEVEL_PRESETS.map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLevel(lvl)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      level === lvl
                        ? 'bg-[#374151] text-white shadow-md shadow-xs'
                        : 'bg-[#18181B] text-[#4B5563] hover:text-white border border-[#27272A]'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-[#4B5563] uppercase tracking-wider mb-1.5">
                Descrição ou Orientações (Opcional)
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="Ex: Foco em sobrecarga progressiva, 3x na semana, descanso de 90s..."
                className="w-full bg-[#18181B] border border-[#27272A] rounded-xl p-3 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#374151] resize-none transition-all"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#27272A]">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-xs font-bold text-[#4B5563] hover:text-white border border-[#27272A] transition-all"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSaving || !name.trim()}
                className="px-6 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] disabled:opacity-80 text-xs font-black font-display uppercase tracking-wider text-white shadow-lg shadow-xs transition-all flex items-center gap-2"
              >
                <BookmarkPlus className="w-4 h-4" />
                <span>{isSaving ? 'Salvando...' : 'Salvar Modelo'}</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
