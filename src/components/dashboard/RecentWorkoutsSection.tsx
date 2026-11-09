import React from 'react';
import { 
  Dumbbell, 
  Clock, 
  Share2, 
  FileText, 
  Trophy, 
  ChevronRight, 
  Eye, 
  Layers 
} from 'lucide-react';
import { WorkoutSession, Student } from '../../types';
import { formatWorkoutDuration, formatTonnesOrKg } from '../../utils/calculations';

interface RecentWorkoutsSectionProps {
  sessions: WorkoutSession[];
  students: Student[];
  onOpenStory: (session: WorkoutSession) => void;
  onOpenReport: (student: Student, session: WorkoutSession) => void;
  onViewSessionDetails: (session: WorkoutSession) => void;
  onSelectStudent: (student: Student) => void;
}

export const RecentWorkoutsSection: React.FC<RecentWorkoutsSectionProps> = ({
  sessions,
  students,
  onOpenStory,
  onOpenReport,
  onViewSessionDetails,
  onSelectStudent
}) => {
  const studentsMap = new Map<string, Student>(students.map(s => [s.id, s]));

  return (
    <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#374151]">
            <Dumbbell className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-xs font-black uppercase tracking-wider text-white">
            Treinos Recentes ({sessions.length})
          </h2>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-6 px-4 rounded-xl bg-[#050505] border border-[#27272a]">
          <p className="text-xs font-bold text-[#4B5563]">Nenhum treino concluído recentemente</p>
          <p className="text-[11px] text-[#71717A] mt-0.5">
            Ao finalizar um treino, o histórico completo e opções de Story aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => {
            const student = studentsMap.get(session.studentId);
            const prsCount = session.prsAchieved?.length || 0;
            const sessionSets = Array.isArray(session.sets) ? session.sets : [];
            const completedSets = sessionSets.filter(s => s && !s.isWarmup && s.status === 'completed');
            const totalExercises = session.routineSnapshot?.workouts?.[0]?.exercises?.length ||
              session.routineSnapshot?.exercises?.length || 
              session.workoutSnapshot?.exercises?.length ||
              new Set(sessionSets.map(s => s.exerciseId)).size || 1;

            const sessionDate = new Date(session.startTime);
            const dateFormatted = `${sessionDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • ${sessionDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

            return (
              <div
                key={session.id}
                className="p-4 rounded-xl bg-[#050505] border border-[#27272a] hover:border-[#3f3f46] transition-all space-y-3"
              >
                {/* Top Info Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 
                        onClick={() => student && onSelectStudent(student)}
                        className="text-sm font-bold text-white hover:text-[#1F2937] cursor-pointer transition-colors"
                      >
                        {session.studentName}
                      </h3>
                      {prsCount > 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F3F4F6] border border-[#E5E7EB] text-[#374151] flex items-center gap-1">
                          <Trophy className="w-3 h-3" />
                          <span>{prsCount} {prsCount === 1 ? 'PR' : 'PRs'}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#71717A]">
                      {session.routineTitle || 'Treino Personalizado'} • <span className="text-[#4B5563]">{dateFormatted}</span>
                    </p>
                  </div>

                  {/* Summary Badges */}
                  <div className="flex items-center gap-3 text-xs">
                    <div className="px-2.5 py-1 rounded-lg bg-[#121212] border border-[#27272a] text-[#4B5563]">
                      <span>{formatWorkoutDuration(session.durationSeconds)}</span>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-[#121212] border border-[#27272a] text-white font-bold">
                      <span>{formatTonnesOrKg(session.totalVolume)}</span>
                    </div>
                    <div className="hidden sm:block px-2.5 py-1 rounded-lg bg-[#121212] border border-[#27272a] text-[#4B5563]">
                      <span>{completedSets.length} séries</span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-2 border-t border-[#27272a]/60 flex items-center justify-end gap-2">
                  <button
                    onClick={() => onViewSessionDetails(session)}
                    className="px-3 py-1.5 rounded-lg bg-[#121212] hover:bg-[#18181B] border border-[#27272a] text-[11px] font-bold text-[#4B5563] hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Ver Resumo</span>
                  </button>

                  {student && (
                    <button
                      onClick={() => onOpenReport(student, session)}
                      className="px-3 py-1.5 rounded-lg bg-[#121212] hover:bg-[#18181B] border border-[#27272a] text-[11px] font-bold text-[#4B5563] hover:text-white transition-colors flex items-center gap-1.5"
                    >
                      <FileText className="w-3 h-3 text-[#71717A]" />
                      <span>Relatório</span>
                    </button>
                  )}

                  <button
                    onClick={() => onOpenStory(session)}
                    className="px-3 py-1.5 rounded-lg bg-[#F3F4F6] hover:bg-[#1F2937] border border-[#D1D5DB] hover:border-[#374151] text-[11px] font-bold text-[#374151] hover:text-white transition-all flex items-center gap-1.5"
                  >
                    <Share2 className="w-3 h-3" />
                    <span>Criar Story PNG</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
