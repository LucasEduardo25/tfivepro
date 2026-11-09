import React, { useState } from 'react';
import { X, Dumbbell, ChevronRight, AlertCircle, Layers } from 'lucide-react';
import { Student, WorkoutRoutine, RoutineWorkout, ScheduleAppointment } from '../../types';

interface SelectWorkoutModalProps {
  student: Student;
  appointment?: ScheduleAppointment | null;
  routines: WorkoutRoutine[];
  onSelectWorkout: (routine: WorkoutRoutine, workout: RoutineWorkout) => void;
  onClose: () => void;
}

export const SelectWorkoutModal: React.FC<SelectWorkoutModalProps> = ({
  student,
  appointment,
  routines,
  onSelectWorkout,
  onClose
}) => {
  const studentRoutines = routines.filter(r => r.studentId === student.id && !r.isArchived);

  // If only 1 routine, pre-select it
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>(
    studentRoutines.length > 0 ? studentRoutines[0].id : ''
  );

  const currentRoutine = studentRoutines.find(r => r.id === selectedRoutineId) || studentRoutines[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121212] border border-[#27272a] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 max-h-[calc(100dvh-2rem)] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[#27272a] flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-black uppercase tracking-wider text-white">
              Selecionar Treino do Aluno
            </h3>
            <p className="text-xs text-[#4B5563]">
              {student.name} {appointment ? `• Atendimento das ${appointment.time}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#18181B] hover:bg-[#27272a] text-[#4B5563] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {studentRoutines.length === 0 ? (
            <div className="p-6 text-center space-y-3 bg-[#050505] rounded-xl border border-[#27272a]">
              <AlertCircle className="w-8 h-8 text-[#374151] mx-auto" />
              <p className="text-sm font-bold text-white">
                Nenhuma rotina ativa cadastrada para este aluno.
              </p>
              <p className="text-xs text-[#71717A]">
                Crie ou vincule uma rotina na ficha do aluno antes de iniciar a sessão.
              </p>
            </div>
          ) : (
            <>
              {/* Routine Selector if multiple routines exist */}
              {studentRoutines.length > 1 && (
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#71717A] mb-1.5">
                    Rotina
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {studentRoutines.map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedRoutineId(r.id)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap ${
                          r.id === currentRoutine?.id
                            ? 'bg-[#F3F4F6] border-[#374151] text-white'
                            : 'bg-[#18181B] border-[#27272a] text-[#4B5563] hover:text-white'
                        }`}
                      >
                        {r.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Workouts inside the routine (A, B, C, D...) */}
              <div className="space-y-2">
                <label className="block text-[10px] uppercase font-bold text-[#71717A]">
                  Escolha o Treino a ser Executado:
                </label>

                {currentRoutine && currentRoutine.workouts && currentRoutine.workouts.length > 0 ? (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {currentRoutine.workouts.map(w => {
                      const exerciseCount = w.exercises?.length || 0;
                      const letter = w.letter || 'A';

                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => {
                            onSelectWorkout(currentRoutine, w);
                            onClose();
                          }}
                          className="w-full p-3.5 rounded-xl bg-[#050505] border border-[#27272a] hover:border-[#374151] flex items-center justify-between gap-3 text-left group transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-[#18181B] border border-[#27272a] group-hover:border-[#374151] group-hover:text-[#1F2937] text-white font-black font-mono flex items-center justify-center shrink-0 transition-colors">
                              {letter}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-white group-hover:text-[#1F2937] transition-colors truncate">
                                Treino {letter} {w.name ? `— ${w.name}` : ''}
                              </h4>
                              <p className="text-xs text-[#71717A]">
                                {exerciseCount} exercício(s)
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold text-[#374151] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                              <span>Selecionar</span>
                              <ChevronRight className="w-4 h-4" />
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-[#71717A] italic py-2">
                    Esta rotina não possui treinos cadastrados.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#27272a] bg-[#050505] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#18181B] border border-[#27272a] text-xs font-bold text-[#4B5563] hover:text-white transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
