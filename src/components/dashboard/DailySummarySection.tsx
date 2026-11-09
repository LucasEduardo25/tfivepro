import React from 'react';
import { 
  Flame, 
  Clock, 
  Dumbbell, 
  Trophy, 
  Share2, 
  Zap, 
  Layers, 
  Activity 
} from 'lucide-react';
import { DailySummaryData } from '../../utils/dashboardMetrics';

interface DailySummarySectionProps {
  summary: DailySummaryData;
  onOpenDailyStory: () => void;
}

export const DailySummarySection: React.FC<DailySummarySectionProps> = ({
  summary,
  onOpenDailyStory
}) => {
  const hasActivity = summary.completedWorkoutsCount > 0 || summary.activeWorkoutsCount > 0;

  return (
    <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-5 shadow-lg space-y-4 relative overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#374151]">
            <Flame className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-white">
              Resumo de Hoje
            </h2>
          </div>
        </div>

        {summary.completedWorkoutsCount > 0 && (
          <button
            onClick={onOpenDailyStory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#050505] hover:bg-[#18181B] border border-[#D1D5DB] hover:border-[#374151] text-[11px] font-bold text-white transition-all shadow-sm group"
          >
            <Share2 className="w-3.5 h-3.5 text-[#374151] group-hover:scale-110 transition-transform" />
            <span>Criar Story do Dia</span>
          </button>
        )}
      </div>

      {hasActivity ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* Card: Atendimentos */}
          <div className="bg-[#050505] p-3 rounded-xl border border-[#27272a]">
            <span className="block text-[10px] uppercase font-bold text-[#71717A] tracking-wider mb-1">
              Atendimentos
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black font-display text-white">
                {summary.completedWorkoutsCount}
              </span>
              {summary.activeWorkoutsCount > 0 && (
                <span className="text-[10px] font-bold text-[#374151]">
                  +{summary.activeWorkoutsCount} ativo
                </span>
              )}
            </div>
          </div>

          {/* Card: Tempo Total */}
          <div className="bg-[#050505] p-3 rounded-xl border border-[#27272a]">
            <span className="block text-[10px] uppercase font-bold text-[#71717A] tracking-wider mb-1">
              Tempo Total
            </span>
            <span className="text-xl font-black font-display text-white truncate block">
              {summary.durationFormatted}
            </span>
          </div>

          {/* Card: Volume Total */}
          <div className="bg-[#050505] p-3 rounded-xl border border-[#27272a]">
            <span className="block text-[10px] uppercase font-bold text-[#71717A] tracking-wider mb-1">
              Volume Total
            </span>
            <span className="text-xl font-black font-display text-white truncate block">
              {summary.volumeFormatted}
            </span>
          </div>

          {/* Card: Séries Concluídas */}
          <div className="bg-[#050505] p-3 rounded-xl border border-[#27272a]">
            <span className="block text-[10px] uppercase font-bold text-[#71717A] tracking-wider mb-1">
              Séries Válidas
            </span>
            <span className="text-xl font-black font-display text-white block">
              {summary.totalSetsCount}
            </span>
          </div>

          {/* Card: PRs Registrados */}
          <div className="bg-[#050505] p-3 rounded-xl border border-[#27272a]">
            <span className="block text-[10px] uppercase font-bold text-[#71717A] tracking-wider mb-1">
              Recordes (PRs)
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`text-xl font-black font-display ${summary.totalPRsCount > 0 ? 'text-[#374151]' : 'text-white'}`}>
                {summary.totalPRsCount}
              </span>
              {summary.totalPRsCount > 0 && <Trophy className="w-3.5 h-3.5 text-[#374151]" />}
            </div>
          </div>

          {/* Card: Densidade Média */}
          <div className="bg-[#050505] p-3 rounded-xl border border-[#27272a]">
            <span className="block text-[10px] uppercase font-bold text-[#71717A] tracking-wider mb-1">
              Densidade Média
            </span>
            <span className="text-xl font-black font-display text-white block truncate">
              {summary.densityKgMin} <span className="text-[10px] text-[#71717A] font-normal">kg/min</span>
            </span>
          </div>

        </div>
      ) : (
        /* Empty today state */
        <div className="p-4 rounded-xl bg-[#050505] border border-[#27272a] text-center">
          <p className="text-xs font-bold text-[#4B5563]">Nenhum treino concluído hoje.</p>
          <p className="text-[11px] text-[#71717A] mt-0.5">
            Os indicadores de volume, séries e PRs serão atualizados em tempo real conforme as sessões forem finalizadas.
          </p>
        </div>
      )}

    </div>
  );
};
