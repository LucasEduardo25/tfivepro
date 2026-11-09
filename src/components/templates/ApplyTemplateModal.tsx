import React, { useState, useMemo } from 'react';
import { X, UserCheck, Search, Dumbbell, Layers, Check, AlertCircle, Sparkles, User, ArrowRight } from 'lucide-react';
import { WorkoutTemplate, Student, WorkoutRoutine } from '../../types';
import { useApp } from '../../context/AppContext';

interface ApplyTemplateModalProps {
  template: WorkoutTemplate;
  onClose: () => void;
  onApplied?: (student: Student, createdRoutine: WorkoutRoutine) => void;
}

export const ApplyTemplateModal: React.FC<ApplyTemplateModalProps> = ({
  template,
  onClose,
  onApplied
}) => {
  const { students, applyTemplateToStudent } = useApp();

  const [searchStudent, setSearchStudent] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [customTitle, setCustomTitle] = useState<string>(template.name);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [applySuccess, setApplySuccess] = useState<boolean>(false);

  const activeStudents = useMemo(() => {
    return students
      .filter(s => s.status === 'active')
      .filter(s => {
        if (!searchStudent.trim()) return true;
        const q = searchStudent.toLowerCase();
        return s.name.toLowerCase().includes(q) || (s.email && s.email.toLowerCase().includes(q));
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, searchStudent]);

  const selectedStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  const workoutsCount = template.workouts?.length || 0;
  const totalExercises = template.workouts?.reduce((sum, w) => sum + (w.exercises?.length || 0), 0) || 0;

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      alert('Selecione um aluno para aplicar o modelo de treino.');
      return;
    }

    setIsApplying(true);
    try {
      const routine = await applyTemplateToStudent(template, selectedStudent, customTitle.trim() || template.name);
      setApplySuccess(true);
      setTimeout(() => {
        if (onApplied) onApplied(selectedStudent, routine);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Erro ao aplicar modelo:', err);
      alert('Não foi possível aplicar o modelo ao aluno.');
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto bg-[#121212] border border-[#27272A] rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#27272A] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] text-[#374151]">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black font-display uppercase tracking-wide">
                Aplicar Modelo a um Aluno
              </h3>
              <p className="text-xs text-[#4B5563]">
                Cria uma nova rotina independente no perfil do aluno selecionado
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isApplying}
            className="p-2 rounded-xl text-[#4B5563] hover:text-white hover:bg-[#18181B] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {applySuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto animate-bounce">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">Rotina Aplicada com Sucesso!</h4>
            <p className="text-xs text-[#4B5563]">
              A rotina foi inserida no perfil de <strong className="text-white">{selectedStudent?.name}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleApply} className="space-y-4">
            
            {/* Template Summary Pill */}
            <div className="p-3.5 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-[#374151]" />
                <span className="font-bold text-white">{template.name}</span>
              </div>
              <span className="text-[#4B5563]">
                {workoutsCount} {workoutsCount === 1 ? 'Treino' : 'Treinos'} ({template.workouts?.map(w => w.letter).join(' • ')}) • {totalExercises} Ex
              </span>
            </div>

            {/* Custom Routine Title for Student */}
            <div>
              <label className="block text-xs font-bold text-[#4B5563] uppercase tracking-wider mb-1.5">
                Nome da Rotina para o Aluno
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={e => setCustomTitle(e.target.value)}
                placeholder="Ex: Hipertrofia ABC (Julho/2026)"
                required
                className="w-full bg-[#18181B] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#374151] transition-all"
              />
            </div>

            {/* Student Selector */}
            <div>
              <label className="block text-xs font-bold text-[#4B5563] uppercase tracking-wider mb-1.5">
                Selecione o Aluno *
              </label>

              {/* Search filter for students */}
              <div className="relative mb-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
                <input
                  type="text"
                  value={searchStudent}
                  onChange={e => setSearchStudent(e.target.value)}
                  placeholder="Buscar aluno por nome..."
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#374151] transition-all"
                />
              </div>

              {/* Student Radio list */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-[#27272A] bg-[#0A0A0A] p-2 rounded-xl">
                {activeStudents.length > 0 ? (
                  activeStudents.map(st => {
                    const isSelected = selectedStudentId === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setSelectedStudentId(st.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all ${
                          isSelected
                            ? 'bg-[#374151] text-white shadow-md'
                            : 'bg-[#18181B] text-[#4B5563] hover:text-white hover:bg-[#27272A]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            isSelected ? 'bg-white text-black' : 'bg-[#27272A] text-zinc-300'
                          }`}>
                            {st.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{st.name}</p>
                            {st.goal && (
                              <p className={`text-[10px] truncate ${isSelected ? 'text-zinc-200' : 'text-[#71717A]'}`}>
                                Meta: {st.goal}
                              </p>
                            )}
                          </div>
                        </div>

                        {isSelected && <Check className="w-4 h-4 shrink-0 text-white" />}
                      </button>
                    );
                  })
                ) : (
                  <p className="text-xs text-[#71717A] text-center py-4">
                    Nenhum aluno encontrado.
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#27272A]">
              <button
                type="button"
                onClick={onClose}
                disabled={isApplying}
                className="px-4 py-2.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-xs font-bold text-[#4B5563] hover:text-white border border-[#27272A] transition-all"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isApplying || !selectedStudentId}
                className="px-6 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] disabled:opacity-80 text-xs font-black font-display uppercase tracking-wider text-white shadow-lg shadow-xs transition-all flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>{isApplying ? 'Aplicando...' : 'Aplicar ao Aluno'}</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
