import React from 'react';
import { Dumbbell, History, AlertCircle } from 'lucide-react';
import { ExercisePerformanceSummary } from '../../services/todayHubService';

interface ExerciseComparisonCardProps {
  item: ExercisePerformanceSummary;
}

export const ExerciseComparisonCard: React.FC<ExerciseComparisonCardProps> = ({ item }) => {
  const {
    exerciseName,
    muscleGroup,
    todayPrescription,
    hasHistory,
    lastDateFormatted,
    lastSets,
    bestSetSummary
  } = item;

  return (
    <div className="p-4 rounded-xl bg-[#050505] border border-[#27272a] hover:border-[#3f3f46] transition-colors">
      {/* Exercise Title and Muscle Group */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#374151] shrink-0">
            <Dumbbell className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-sm font-black uppercase tracking-wide text-white truncate">
            {exerciseName}
          </h4>
        </div>

        {muscleGroup && (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#18181B] border border-[#27272a] text-[#4B5563] whitespace-nowrap">
            {muscleGroup}
          </span>
        )}
      </div>

      {/* Grid: Prescrição de Hoje vs Última Execução */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#18181B]">
        {/* LADO ESQUERDO: PRESCRIÇÃO DE HOJE */}
        <div className="p-3 rounded-lg bg-[#121212] border border-[#27272a]/60 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#4B5563]">
              Prescrição de Hoje
            </span>
            <span className="text-[10px] font-mono font-bold text-[#374151]">
              {todayPrescription.sets} séries
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-base font-black font-mono text-white">
              {todayPrescription.sets} × {todayPrescription.reps || '8–12'}
            </span>
            {todayPrescription.weightKg !== undefined && todayPrescription.weightKg > 0 && (
              <span className="text-xs font-mono font-bold text-[#4B5563]">
                @{todayPrescription.weightKg} kg
              </span>
            )}
          </div>

          {todayPrescription.notes && (
            <p className="text-[11px] text-[#4B5563] italic pt-1 border-t border-[#18181B] line-clamp-2">
              "{todayPrescription.notes}"
            </p>
          )}
        </div>

        {/* LADO DIREITO: ÚLTIMA EXECUÇÃO REAL */}
        <div className="p-3 rounded-lg bg-[#121212] border border-[#27272a]/60 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#71717A] flex items-center gap-1">
              <History className="w-3 h-3 text-[#71717A]" />
              <span>Última Execução</span>
            </span>
            {hasHistory && lastDateFormatted && (
              <span className="text-[10px] font-mono font-bold text-[#4B5563]">
                {lastDateFormatted}
              </span>
            )}
          </div>

          {hasHistory && lastSets && lastSets.length > 0 ? (
            <div className="space-y-1.5">
              {/* Individual real load reps */}
              <div className="flex flex-wrap gap-1.5">
                {lastSets.map(st => (
                  <span
                    key={st.setNumber}
                    className="px-2 py-0.5 rounded bg-[#18181B] border border-[#27272a] text-xs font-mono font-bold text-white whitespace-nowrap"
                  >
                    {st.weightKg !== undefined && st.weightKg > 0 ? `${st.weightKg} kg` : ''}
                    {st.weightKg !== undefined && st.weightKg > 0 && st.reps ? ' × ' : ''}
                    {st.reps ? `${st.reps}` : st.durationSeconds ? `${st.durationSeconds}s` : ''}
                  </span>
                ))}
              </div>

              {bestSetSummary && (
                <p className="text-[10px] text-[#71717A] font-medium pt-0.5">
                  Melhor série: <span className="text-white font-mono font-bold">{bestSetSummary}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 py-1 text-[#71717A]">
              <AlertCircle className="w-3.5 h-3.5 text-[#52525B] shrink-0" />
              <span className="text-xs font-medium uppercase tracking-wider text-[#52525B]">
                Sem histórico anterior
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
