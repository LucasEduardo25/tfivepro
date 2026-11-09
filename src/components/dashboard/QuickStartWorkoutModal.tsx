import React, { useState, useMemo } from 'react';
import { 
  X, 
  Play, 
  Search, 
  UserPlus, 
  Dumbbell, 
  Zap, 
  ChevronRight, 
  Sparkles, 
  Users 
} from 'lucide-react';
import { Student, WorkoutRoutine } from '../../types';
import { useApp } from '../../context/AppContext';
import { StudentAvatar } from '../common/StudentAvatar';

interface QuickStartWorkoutModalProps {
  onClose: () => void;
  onSelectStudentToStart: (student: Student, routine?: WorkoutRoutine) => void;
  onOpenNewStudent: () => void;
}

export const QuickStartWorkoutModal: React.FC<QuickStartWorkoutModalProps> = ({
  onClose,
  onSelectStudentToStart,
  onOpenNewStudent
}) => {
  const { students, routines, activeWorkouts } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [customStudentName, setCustomStudentName] = useState('');
  const [isAdHocMode, setIsAdHocMode] = useState(false);

  const activeStudents = useMemo(() => {
    return students.filter(s => s.status === 'active');
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return activeStudents;
    const term = searchTerm.toLowerCase();
    return activeStudents.filter(
      s => s.name.toLowerCase().includes(term) || s.goal.toLowerCase().includes(term)
    );
  }, [activeStudents, searchTerm]);

  // Routines for the selected student
  const studentRoutines = useMemo(() => {
    if (!selectedStudent) return [];
    return routines.filter(r => r.studentId === selectedStudent.id && !r.isArchived);
  }, [selectedStudent, routines]);

  // Active workout student IDs
  const activeStudentIds = useMemo(() => {
    return new Set(activeWorkouts.map(w => w.studentId));
  }, [activeWorkouts]);

  const isDualModeAvailable = activeWorkouts.length === 1;
  const isFullCapacity = activeWorkouts.length >= 2;

  const handleStartWithStudentAndRoutine = (routine?: WorkoutRoutine) => {
    if (!selectedStudent) return;
    onSelectStudentToStart(selectedStudent, routine);
    onClose();
  };

  const handleStartAdHoc = () => {
    const name = customStudentName.trim() || 'Treino Avulso';
    const adHocStudent: Student = {
      id: `avulso_${Date.now()}`,
      name,
      photo: '',
      phone: '',
      email: '',
      goal: 'Sessão Avulsa',
      notes: '',
      status: 'active',
      gender: 'male',
      planName: 'Avulso',
      priceMonthly: 0,
      startDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    onSelectStudentToStart(adHocStudent);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121212] border border-[#27272a] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-[#27272a] flex items-center justify-between bg-[#18181B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#374151] flex items-center justify-center text-white shadow-[0_0_15px_rgba(217,4,41,0.4)]">
              <Play className="w-5 h-5 fill-white ml-0.5" />
            </div>
            <div>
              <h2 className="text-lg font-black font-display text-white tracking-tight">
                {isDualModeAvailable ? 'Adicionar 2º Aluno (Modo Duplo)' : 'Iniciar Sessão de Treino'}
              </h2>
              <p className="text-xs text-[#4B5563]">
                {isDualModeAvailable 
                  ? `Treino atual com ${activeWorkouts[0].studentName.split(' ')[0]}. Selecione o próximo aluno.` 
                  : 'Selecione o aluno e a ficha para iniciar'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#27272a]/60 hover:bg-[#27272a] text-[#4B5563] hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          
          {isFullCapacity ? (
            <div className="p-4 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] text-center space-y-2">
              <p className="text-sm font-bold text-[#374151]">Capacidade Máxima Atingida (2 Alunos)</p>
              <p className="text-xs text-[#4B5563]">
                Você já possui 2 sessões em andamento ({activeWorkouts[0]?.studentName.split(' ')[0]} e {activeWorkouts[1]?.studentName.split(' ')[0]}). Finalize uma para iniciar outra.
              </p>
            </div>
          ) : !selectedStudent && !isAdHocMode ? (
            <>
              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar aluno por nome..."
                  className="w-full bg-[#050505] border border-[#27272a] focus:border-[#374151] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#71717A] focus:outline-none transition-colors"
                  autoFocus
                />
              </div>

              {/* Quick Actions Row */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdHocMode(true)}
                  className="p-3 rounded-xl bg-[#050505] border border-[#27272a] hover:border-[#374151] hover:bg-[#18181B] flex items-center gap-2.5 transition-all text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 group-hover:bg-[#F3F4F6] flex items-center justify-center text-[#4B5563] group-hover:text-[#1F2937] transition-colors">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-white group-hover:text-[#1F2937] transition-colors">Treino Avulso</span>
                    <span className="block text-[10px] text-[#71717A]">Sem ficha prévia</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenNewStudent();
                  }}
                  className="p-3 rounded-xl bg-[#050505] border border-[#27272a] hover:border-[#374151] hover:bg-[#18181B] flex items-center gap-2.5 transition-all text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 group-hover:bg-[#F3F4F6] flex items-center justify-center text-[#4B5563] group-hover:text-[#1F2937] transition-colors">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-white group-hover:text-[#1F2937] transition-colors">Novo Aluno</span>
                    <span className="block text-[10px] text-[#71717A]">Cadastrar agora</span>
                  </div>
                </button>
              </div>

              {/* Student list */}
              <div className="space-y-1.5 pt-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#71717A] px-1">
                  Selecione o Aluno ({filteredStudents.length})
                </p>

                {filteredStudents.length === 0 ? (
                  <div className="text-center py-8 px-4 rounded-xl bg-[#050505] border border-[#27272a]">
                    <Users className="w-8 h-8 text-[#71717A] mx-auto mb-2 opacity-80" />
                    <p className="text-xs font-bold text-[#4B5563]">Nenhum aluno encontrado</p>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenNewStudent();
                      }}
                      className="mt-3 text-xs font-bold text-[#374151] hover:underline"
                    >
                      Cadastrar novo aluno agora
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {filteredStudents.map(student => {
                      const isAlreadyTraining = activeStudentIds.has(student.id);
                      return (
                        <button
                          key={student.id}
                          disabled={isAlreadyTraining}
                          onClick={() => setSelectedStudent(student)}
                          className={`w-full p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all text-left ${
                            isAlreadyTraining
                              ? 'bg-[#18181B]/40 border-[#27272a]/40 opacity-80 cursor-not-allowed'
                              : 'bg-[#050505] border-[#27272a] hover:border-[#374151]/50 hover:bg-[#18181B]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <StudentAvatar student={student} size="sm" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{student.name}</p>
                              <p className="text-[11px] text-[#71717A] truncate">{student.goal}</p>
                            </div>
                          </div>

                          {isAlreadyTraining ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F3F4F6] text-[#374151]">
                              Em treino
                            </span>
                          ) : (
                            <ChevronRight className="w-4 h-4 text-[#71717A] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : isAdHocMode ? (
            /* Ad-hoc workout flow */
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-[#050505] border border-[#27272a] space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                  Identificação do Aluno Avulso
                </label>
                <input
                  type="text"
                  value={customStudentName}
                  onChange={e => setCustomStudentName(e.target.value)}
                  placeholder="Nome do aluno (ex: Treino Avulso / Convidado)"
                  className="w-full bg-[#121212] border border-[#27272a] focus:border-[#374151] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#71717A] focus:outline-none"
                  autoFocus
                />
                <p className="text-[11px] text-[#71717A]">
                  Você poderá adicionar exercícios e registrar cargas em tempo real.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdHocMode(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#27272a] text-xs font-bold text-[#4B5563] hover:text-white"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleStartAdHoc}
                  className="px-5 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-xs font-bold text-white transition-all shadow-[0_4px_15px_rgba(217,4,41,0.3)] flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Iniciar Sessão Avulsa</span>
                </button>
              </div>
            </div>
          ) : (
            /* Student selected: Choose Routine */
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-[#050505] border border-[#27272a] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <StudentAvatar student={selectedStudent} size="md" />
                  <div>
                    <h3 className="text-sm font-bold text-white">{selectedStudent.name}</h3>
                    <p className="text-xs text-[#71717A]">{selectedStudent.goal}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-xs font-bold text-[#374151] hover:underline"
                >
                  Trocar
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
                  Escolha a Ficha / Rotina de Treino
                </p>

                {studentRoutines.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#050505] border border-[#27272a] text-center space-y-3">
                    <p className="text-xs text-[#4B5563]">
                      Este aluno ainda não possui fichas cadastradas.
                    </p>
                    <button
                      onClick={() => handleStartWithStudentAndRoutine(undefined)}
                      className="px-4 py-2 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-xs font-bold text-white transition-all shadow-md flex items-center gap-2 mx-auto"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Iniciar Treino Livre / Personalizado</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {studentRoutines.map(routine => (
                      <button
                        key={routine.id}
                        onClick={() => handleStartWithStudentAndRoutine(routine)}
                        className="w-full p-3 rounded-xl bg-[#050505] border border-[#27272a] hover:border-[#374151] hover:bg-[#18181B] flex items-center justify-between gap-3 transition-all text-left group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center font-bold text-xs text-[#374151] shrink-0">
                            {routine.letter || 'T'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white group-hover:text-[#1F2937] transition-colors truncate">
                              {routine.title}
                            </p>
                            <p className="text-[11px] text-[#71717A]">
                              {routine.exercises.length} {routine.exercises.length === 1 ? 'exercício' : 'exercícios'}
                            </p>
                          </div>
                        </div>
                        <Play className="w-4 h-4 text-[#71717A] group-hover:text-[#1F2937] group-hover:fill-[#374151] transition-colors shrink-0" />
                      </button>
                    ))}

                    <button
                      onClick={() => handleStartWithStudentAndRoutine(undefined)}
                      className="w-full p-2.5 rounded-xl border border-dashed border-[#27272a] hover:border-[#374151]/50 hover:bg-[#18181B] text-center text-xs font-bold text-[#4B5563] hover:text-white transition-all"
                    >
                      + Iniciar Treino Livre (Sem Ficha Fixa)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
