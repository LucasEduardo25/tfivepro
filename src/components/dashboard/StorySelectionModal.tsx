import React from 'react';
import { X, Share2, Dumbbell, Calendar, ChevronRight, Flame, ExternalLink } from 'lucide-react';
import { WorkoutSession } from '../../types';
import { formatWorkoutDuration, formatTonnesOrKg } from '../../utils/calculations';

interface StorySelectionModalProps {
  recentSessions: WorkoutSession[];
  hasTodayCompleted: boolean;
  onSelectSession: (session: WorkoutSession) => void;
  onSelectDailySummary: () => void;
  onSelectExternalWorkout: () => void;
  onClose: () => void;
}

export const StorySelectionModal: React.FC<StorySelectionModalProps> = ({
  recentSessions,
  hasTodayCompleted,
  onSelectSession,
  onSelectDailySummary,
  onSelectExternalWorkout,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121212] border border-[#27272a] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-[#27272a] flex items-center justify-between bg-[#18181B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#374151] flex items-center justify-center text-white shadow-[0_0_15px_rgba(217,4,41,0.4)]">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black font-display text-white tracking-tight">
                Criar Story em PNG Transparente
              </h2>
              <p className="text-xs text-[#4B5563]">
                Selecione o tipo de sticker esportivo para gerar
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

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* External Workout Story Option */}
          <button
            id="create-external-workout-story-btn"
            onClick={() => {
              onSelectExternalWorkout();
              onClose();
            }}
            className="w-full p-4 rounded-xl border border-red-500/30 hover:border-[#374151] bg-gradient-to-r from-red-950/20 via-[#050505] to-[#050505] hover:bg-[#18181B] flex items-center justify-between gap-3 text-left transition-all group cursor-pointer shadow-sm hover:shadow-red-950/20"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-500 shrink-0 group-hover:scale-105 transition-transform">
                <ExternalLink className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white group-hover:text-[#1F2937] transition-colors uppercase tracking-tight">
                    Criar Story de Treino Externo
                  </h3>
                  <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider">
                    NOVO
                  </span>
                </div>
                <p className="text-xs text-[#71717A]">
                  Gerar Story TFIVE a partir de prints de outros apps (MFit, Strava, etc.)
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#71717A] group-hover:text-white transition-colors shrink-0" />
          </button>

          {/* Daily Summary Option */}
          <button
            disabled={!hasTodayCompleted}
            onClick={() => {
              onSelectDailySummary();
              onClose();
            }}
            className={`w-full p-4 rounded-xl border flex items-center justify-between gap-3 text-left transition-all group ${
              hasTodayCompleted
                ? 'bg-[#050505] border-[#D1D5DB] hover:border-[#374151] hover:bg-[#18181B]'
                : 'bg-[#18181B]/40 border-[#27272a]/40 opacity-80 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#374151] shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white group-hover:text-[#1F2937] transition-colors">
                  Resumo Diário (Todos os Treinos de Hoje)
                </h3>
                <p className="text-xs text-[#71717A]">
                  {hasTodayCompleted
                    ? 'Total de alunos atendidos, volume e PRs do dia'
                    : 'Nenhum treino concluído hoje ainda'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#71717A] group-hover:text-white transition-colors shrink-0" />
          </button>

          {/* Individual Workouts */}
          <div className="space-y-2 pt-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
              Ou Escolha um Treino Realizado no TFIVE
            </p>

            {recentSessions.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#050505] border border-[#27272a] text-center">
                <p className="text-xs text-[#4B5563]">Nenhum treino recente disponível</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {recentSessions.map(session => {
                  const sessionDate = new Date(session.startTime);
                  const dateStr = `${sessionDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${sessionDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

                  return (
                    <button
                      key={session.id}
                      onClick={() => {
                        onSelectSession(session);
                        onClose();
                      }}
                      className="w-full p-3 rounded-xl bg-[#050505] border border-[#27272a] hover:border-[#374151]/50 hover:bg-[#18181B] flex items-center justify-between gap-3 text-left transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#27272a] flex items-center justify-center text-[#4B5563] group-hover:text-white shrink-0">
                          <Dumbbell className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white group-hover:text-[#1F2937] transition-colors truncate">
                            {session.studentName}
                          </p>
                          <p className="text-[11px] text-[#71717A] truncate">
                            {session.routineTitle} • {formatWorkoutDuration(session.durationSeconds)} • {formatTonnesOrKg(session.totalVolume)}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#71717A] group-hover:text-white transition-colors shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
