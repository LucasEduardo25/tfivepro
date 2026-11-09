import React, { useState, useMemo } from 'react';
import { 
  X, 
  Dumbbell, 
  Layers, 
  Search, 
  Plus, 
  ArrowRight, 
  Check, 
  Sparkles,
  BookOpen,
  ChevronRight,
  Eye
} from 'lucide-react';
import { Student, WorkoutTemplate, WorkoutRoutine } from '../../types';
import { useApp } from '../../context/AppContext';

interface TemplateSelectorModalProps {
  student: Student;
  onClose: () => void;
  onCreateFromScratch: () => void;
  onTemplateApplied: (routine: WorkoutRoutine) => void;
}

export const TemplateSelectorModal: React.FC<TemplateSelectorModalProps> = ({
  student,
  onClose,
  onCreateFromScratch,
  onTemplateApplied
}) => {
  const { workoutTemplates, applyTemplateToStudent } = useApp();

  const [mode, setMode] = useState<'choose' | 'library'>('choose');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [isApplying, setIsApplying] = useState<boolean>(false);

  const filteredTemplates = useMemo(() => {
    return workoutTemplates.filter(t => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        (t.objective && t.objective.toLowerCase().includes(q)) ||
        (t.level && t.level.toLowerCase().includes(q))
      );
    });
  }, [workoutTemplates, searchQuery]);

  const handleSelectTemplate = (template: WorkoutTemplate) => {
    setSelectedTemplate(template);
    setCustomTitle(template.name);
  };

  const handleApply = async () => {
    if (!selectedTemplate) return;
    setIsApplying(true);
    try {
      const routine = await applyTemplateToStudent(
        selectedTemplate,
        student,
        customTitle.trim() || selectedTemplate.name
      );
      onTemplateApplied(routine);
      onClose();
    } catch (err) {
      console.error('Erro ao aplicar modelo:', err);
      alert('Não foi possível aplicar o modelo ao aluno.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#121212] border border-[#27272A] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] text-white">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#27272A] flex items-center justify-between gap-3 shrink-0 bg-[#0A0A0A] rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] text-[#374151]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black font-display uppercase tracking-wide">
                Nova Rotina para {student.name.split(' ')[0]}
              </h3>
              <p className="text-xs text-[#4B5563]">
                Escolha como deseja prescrever o novo treino
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#4B5563] hover:text-white hover:bg-[#18181B] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {mode === 'choose' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              
              {/* Option 1: Criar do Zero */}
              <button
                type="button"
                onClick={onCreateFromScratch}
                className="p-6 rounded-2xl bg-[#18181B] hover:bg-[#27272A] border-2 border-[#27272A] hover:border-[#374151] text-left transition-all group flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] text-[#374151] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Plus className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-white group-hover:text-[#1F2937] transition-colors">
                    Criar do Zero
                  </h4>
                  <p className="text-xs text-[#4B5563]">
                    Monte a rotina manualmente escolhendo cada exercício, série, repetição e tempo de descanso.
                  </p>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-[#374151] group-hover:translate-x-1 transition-transform">
                  <span>Abrir Editor</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>

              {/* Option 2: Usar da Biblioteca de Modelos */}
              <button
                type="button"
                onClick={() => setMode('library')}
                className="p-6 rounded-2xl bg-[#18181B] hover:bg-[#27272A] border-2 border-[#27272A] hover:border-[#374151] text-left transition-all group flex flex-col justify-between space-y-4 relative overflow-hidden"
              >
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-white group-hover:text-[#1F2937] transition-colors">
                      Usar da Biblioteca
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#374151] text-white">
                      {workoutTemplates.length}
                    </span>
                  </div>
                  <p className="text-xs text-[#4B5563]">
                    Aplique um modelo pronto (ex: Hipertrofia ABC, Full Body 3x) com apenas um clique.
                  </p>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-white group-hover:text-[#1F2937] group-hover:translate-x-1 transition-transform">
                  <span>Explorar Modelos</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>

            </div>
          )}

          {mode === 'library' && (
            <div className="space-y-4">
              
              {/* Back to choices button + search */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('choose');
                    setSelectedTemplate(null);
                  }}
                  className="px-3 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-xs font-bold text-[#4B5563] hover:text-white border border-[#27272A] transition-all self-start"
                >
                  ← Voltar
                </button>

                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar modelos na biblioteca..."
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#374151] transition-all"
                  />
                </div>
              </div>

              {/* Template List */}
              {workoutTemplates.length === 0 ? (
                <div className="p-8 text-center bg-[#18181B] border border-dashed border-[#27272A] rounded-2xl space-y-3">
                  <BookOpen className="w-8 h-8 text-[#71717A] mx-auto" />
                  <p className="text-xs text-[#4B5563]">
                    Sua biblioteca de modelos ainda está vazia. Você pode salvar qualquer rotina existente como modelo ou criar novos modelos na aba "Modelos".
                  </p>
                  <button
                    type="button"
                    onClick={onCreateFromScratch}
                    className="px-4 py-2 rounded-xl bg-[#374151] text-white text-xs font-bold"
                  >
                    Criar Rotina do Zero
                  </button>
                </div>
              ) : filteredTemplates.length === 0 ? (
                <p className="text-xs text-[#71717A] text-center py-6">
                  Nenhum modelo encontrado com o termo "{searchQuery}".
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {filteredTemplates.map(t => {
                    const isSelected = selectedTemplate?.id === t.id;
                    const totalEx = t.workouts?.reduce((s, w) => s + (w.exercises?.length || 0), 0) || 0;
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleSelectTemplate(t)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#18181B] border-[#374151] shadow-md shadow-xs'
                            : 'bg-[#18181B] border-[#27272A] hover:border-[#3F3F46]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-bold text-white">{t.name}</h5>
                              {t.level && (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#27272A] text-[#4B5563]">
                                  {t.level}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#4B5563] mt-0.5">
                              {t.workouts?.length || 0} Treinos ({t.workouts?.map(w => w.letter).join(' • ')}) • {totalEx} Exercícios
                            </p>
                          </div>

                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            isSelected ? 'bg-[#374151] border-[#374151] text-white' : 'border-[#3F3F46]'
                          }`}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Selected Template Action Area */}
              {selectedTemplate && (
                <div className="pt-3 border-t border-[#27272A] space-y-3 bg-[#0A0A0A] p-4 rounded-xl">
                  <div>
                    <label className="block text-[11px] font-bold text-[#4B5563] uppercase tracking-wider mb-1">
                      Título da Rotina para {student.name}
                    </label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={e => setCustomTitle(e.target.value)}
                      placeholder="Nome da rotina..."
                      className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#374151]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={isApplying}
                    className="w-full py-3 rounded-xl bg-[#374151] hover:bg-[#1F2937] disabled:opacity-80 text-xs font-black font-display uppercase tracking-wider text-white shadow-lg shadow-xs transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isApplying ? 'Aplicando ao aluno...' : `Aplicar "${selectedTemplate.name}" a ${student.name.split(' ')[0]}`}</span>
                  </button>
                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
