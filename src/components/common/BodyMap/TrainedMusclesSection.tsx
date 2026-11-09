import React, { useMemo } from 'react';
import { Activity, Layers } from 'lucide-react';
import { WorkoutSetRecord, Exercise } from '../../../types';
import { analyzeTrainedMuscles, TrainedMusclesAnalysis } from './bodyMapTypes';
import { BodyMap } from './BodyMap';
import { INITIAL_EXERCISES } from '../../../data/exerciseBank';

export interface TrainedMusclesSectionProps {
  sets: WorkoutSetRecord[] | undefined;
  gender?: 'male' | 'female';
  exerciseBank?: Exercise[];
  className?: string;
  compact?: boolean;
  showDistribution?: boolean;
}

export const TrainedMusclesSection: React.FC<TrainedMusclesSectionProps> = ({
  sets,
  gender = 'male',
  exerciseBank = INITIAL_EXERCISES,
  className = '',
  compact = false,
  showDistribution = true
}) => {
  const analysis: TrainedMusclesAnalysis = useMemo(() => {
    return analyzeTrainedMuscles(sets, exerciseBank);
  }, [sets, exerciseBank]);

  const hasTrainedRegions = analysis.primaryRegions.length > 0 || analysis.secondaryRegions.length > 0;

  if (!hasTrainedRegions) {
    return (
      <div className={`bg-[#18181B] border border-[#27272A] rounded-2xl p-5 text-center ${className}`}>
        <div className="flex items-center justify-center gap-2 mb-2 text-[#71717A]">
          <Activity className="w-4 h-4 text-[#71717A]" />
          <span className="text-xs font-black uppercase tracking-wider text-[#4B5563]">
            Regiões Trabalhadas
          </span>
        </div>
        <p className="text-xs text-[#71717A]">
          Nenhuma região muscular registrada nesta sessão.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-[#18181B] border border-[#27272A] rounded-3xl p-4 sm:p-6 shadow-xl ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#27272A]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-[#F3F4F6] border border-[#D1D5DB] flex items-center justify-center shadow-sm shadow-xs">
            <Activity className="w-4 h-4 text-[#374151]" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black font-display uppercase tracking-wider text-white">
              Regiões Trabalhadas
            </h3>
            <p className="text-[11px] text-[#4B5563]">
              Mapeamento biomecânico anatômico da sessão
            </p>
          </div>
        </div>

        {analysis.dominantCategory && (
          <span className="px-3 py-1 rounded-full bg-[#27272A] text-[10px] sm:text-xs font-black uppercase tracking-wider text-white border border-[#3F3F46] shadow-sm">
            {analysis.dominantCategory}
          </span>
        )}
      </div>

      {/* Body Map & Breakdown Stack */}
      <div className="flex flex-col items-center justify-center gap-5">
        {/* Large Vector SVG Body Map (Frente + Costas) */}
        <div className="w-full flex justify-center py-2 bg-[#121215]/60 rounded-2xl border border-[#27272A]/50 p-3 sm:p-4">
          <BodyMap
            gender={gender}
            intensities={analysis.intensities}
            viewMode="both"
            showLegend={true}
            className="w-full max-w-md sm:max-w-lg"
          />
        </div>

        {/* Breakdown details */}
        <div className="w-full space-y-4 pt-1">
          {/* Músculos Principais */}
          {analysis.primaryLabels.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] sm:text-xs font-black uppercase tracking-wider text-white">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#374151] shadow-sm shadow-xs inline-block" />
                <span>Principais ({analysis.primaryLabels.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {analysis.primaryLabels.map((lbl, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-[#374151] text-white text-xs font-black uppercase tracking-wide shadow-md shadow-xs border border-white/20"
                  >
                    {lbl}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Músculos Secundários */}
          {analysis.secondaryLabels.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] sm:text-xs font-black uppercase tracking-wider text-[#4B5563]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#374151]/45 border border-[#374151]/70 inline-block" />
                <span>Secundários ({analysis.secondaryLabels.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {analysis.secondaryLabels.map((lbl, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-[#27272A] border border-[#D1D5DB] text-[#E4E4E7] text-xs font-bold uppercase tracking-wide hover:border-[#374151]/70 transition-colors"
                  >
                    {lbl}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Distribuição do Treino (Participação por Região) */}
          {showDistribution && analysis.distribution.length > 0 && !compact && (
            <div className="pt-4 border-t border-[#27272A] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-[#4B5563] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#374151]" />
                  Distribuição do Treino
                </span>
                <span className="text-[11px] text-[#71717A] font-mono-nums font-bold">
                  {analysis.totalSets} séries totais
                </span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {analysis.distribution.map((item) => (
                  <div key={item.regionId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.intensity === 'primary' ? 'bg-[#374151]' : 'bg-[#374151]/50'
                          }`}
                        />
                        {item.label}
                      </span>
                      <span className="font-mono-nums font-bold text-[#4B5563]">
                        {item.percentage}%{' '}
                        <span className="text-[10px] text-[#71717A] font-normal">
                          ({item.setsCount} {item.setsCount === 1 ? 'série' : 'séries'})
                        </span>
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-[#27272A] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          item.intensity === 'primary'
                            ? 'bg-[#374151]'
                            : 'bg-[#374151]/45'
                        }`}
                        style={{ width: `${Math.min(100, item.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
