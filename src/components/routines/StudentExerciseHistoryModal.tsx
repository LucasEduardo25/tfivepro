import React from 'react';
import { X, History, Trophy, Calendar, Dumbbell, TrendingUp, CheckCircle2 } from 'lucide-react';
import { StudentExerciseHistoryResult, ExerciseSessionHistory } from '../../utils/studentExerciseHistory';

interface StudentExerciseHistoryModalProps {
  exerciseName: string;
  studentName: string;
  history: StudentExerciseHistoryResult;
  onClose: () => void;
}

export const StudentExerciseHistoryModal: React.FC<StudentExerciseHistoryModalProps> = ({
  exerciseName,
  studentName,
  history,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-70 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-[#121212] border border-[#27272A] rounded-3xl w-full max-w-lg max-h-[88vh] flex flex-col shadow-2xl overflow-hidden text-white">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#27272A] flex items-center justify-between bg-[#18181B] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#374151] shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#374151]">
                Histórico Real do Aluno
              </span>
              <h3 className="text-base font-bold font-display text-white truncate">
                {exerciseName}
              </h3>
              <p className="text-xs text-[#4B5563] truncate">
                {studentName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#27272A]/70 hover:bg-[#27272A] text-[#4B5563] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {!history.hasHistory ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#18181B] border border-[#27272A] flex items-center justify-center mx-auto text-[#71717A]">
                <Dumbbell className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">Nenhum histórico registrado</h4>
              <p className="text-xs text-[#4B5563] max-w-xs mx-auto">
                Este aluno ainda não possui execuções concluídas registradas para este exercício.
              </p>
            </div>
          ) : (
            <>
              {/* PR / Record Card (if exists) */}
              {history.personalRecord && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                        Recorde Pessoal (PR)
                      </span>
                      <p className="text-sm font-black font-display text-white">
                        {history.personalRecord.weightKg} kg × {history.personalRecord.reps} reps
                      </p>
                      <p className="text-[10px] text-[#4B5563]">
                        1RM Estimado: <strong className="text-white">{history.personalRecord.estimated1RM} kg</strong> • {history.personalRecord.date}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Sessions Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#4B5563] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#374151]" />
                    Últimas Sessões Executadas ({history.totalExecutions})
                  </span>
                </div>

                <div className="space-y-2.5">
                  {history.recentSessions.map((session: ExerciseSessionHistory, sIdx: number) => {
                    const isLatest = sIdx === 0;
                    return (
                      <div
                        key={session.sessionId || sIdx}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isLatest
                            ? 'bg-[#18181B] border-[#D1D5DB] shadow-sm'
                            : 'bg-[#141417] border-[#27272A]'
                        }`}
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-[#27272A]">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              isLatest ? 'bg-[#374151] text-white' : 'bg-[#27272A] text-[#4B5563]'
                            }`}>
                              {isLatest ? 'Última Execução' : session.date}
                            </span>
                            {session.workoutLetter && (
                              <span className="text-[10px] font-bold text-[#4B5563]">
                                Treino {session.workoutLetter}
                              </span>
                            )}
                          </div>

                          {session.hasPR && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                              <Trophy className="w-3 h-3" />
                              PR Batido
                            </span>
                          )}
                        </div>

                        {/* Sets grid */}
                        <div className="pt-2 space-y-1">
                          {session.sets.map((set, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-[#0E0E11] border border-[#27272A]/50"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono-nums font-bold text-[#71717A] text-[11px] w-5">
                                  S{set.setNumber}
                                </span>
                                {set.isWarmup && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400">
                                    Aquecimento
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3 font-mono-nums font-bold">
                                {set.weightKg !== undefined && set.weightKg > 0 && (
                                  <span className="text-white">
                                    {set.weightKg} kg
                                  </span>
                                )}
                                {set.reps !== undefined && (
                                  <span className="text-[#374151]">
                                    × {set.reps} reps
                                  </span>
                                )}
                                {set.durationSeconds !== undefined && set.durationSeconds > 0 && (
                                  <span className="text-blue-400">
                                    {set.durationSeconds}s
                                  </span>
                                )}
                                {set.rpe ? (
                                  <span className="text-[10px] text-[#71717A]">
                                    RPE {set.rpe}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#27272A] bg-[#18181B] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold transition-all"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
