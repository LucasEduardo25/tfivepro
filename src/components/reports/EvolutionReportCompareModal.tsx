import React from 'react';
import { 
  X, 
  Layers, 
  TrendingUp, 
  Zap, 
  Flame, 
  Dumbbell, 
  Scale, 
  HeartPulse 
} from 'lucide-react';
import { 
  EvolutionReport, 
  Student 
} from '../../types';

interface EvolutionReportCompareModalProps {
  reportA: EvolutionReport;
  reportB: EvolutionReport;
  student: Student;
  onClose: () => void;
}

export const EvolutionReportCompareModal: React.FC<EvolutionReportCompareModalProps> = ({
  reportA,
  reportB,
  student,
  onClose
}) => {
  // Compute deltas between older reportA and newer reportB
  const scoreDelta = (reportB.evolutionScore?.overallScore || 0) - (reportA.evolutionScore?.overallScore || 0);
  const adherenceDelta = (reportB.adherence?.adherenceRatePercent || 0) - (reportA.adherence?.adherenceRatePercent || 0);
  const sessionsDelta = (reportB.adherence?.completedSessions || 0) - (reportA.adherence?.completedSessions || 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-scaleIn">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#F8F9FA] border-b border-[#E5E7EB] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#374151]/15 border border-[#374151]/30 flex items-center justify-center text-[#374151]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded bg-[#27272A] text-[10px] font-black uppercase tracking-wider text-white">
                Comparativo de Ciclos
              </span>
              <h2 className="text-base sm:text-lg font-black text-[#1F2937] mt-0.5">
                Evolução Comparada — {student.name}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#4B5563] hover:text-white hover:bg-[#27272A] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 text-xs">
          
          {/* Comparison Header Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Report A */}
            <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-4">
              <span className="text-[10px] text-[#4B5563] uppercase font-bold block mb-1">
                Ciclo 1 ({reportA.periodType})
              </span>
              <h3 className="text-sm font-bold text-white mb-1">{reportA.title}</h3>
              <p className="text-[11px] text-[#4B5563] font-mono-nums mb-3">
                {reportA.startDate} a {reportA.endDate} ({reportA.durationDays} dias)
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB]">
                <span className="text-[#4B5563]">Score:</span>
                <span className="text-lg font-black text-[#1F2937] font-mono-nums">
                  {reportA.evolutionScore?.overallScore || 0}/100
                </span>
              </div>
            </div>

            {/* Report B */}
            <div className="bg-[#F8F9FA] border border-[#374151]/40 rounded-xl p-4 shadow-sm shadow-xs">
              <span className="text-[10px] text-[#374151] uppercase font-bold block mb-1">
                Ciclo 2 ({reportB.periodType})
              </span>
              <h3 className="text-sm font-bold text-white mb-1">{reportB.title}</h3>
              <p className="text-[11px] text-[#4B5563] font-mono-nums mb-3">
                {reportB.startDate} a {reportB.endDate} ({reportB.durationDays} dias)
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB]">
                <span className="text-[#4B5563]">Score:</span>
                <span className="text-lg font-black text-[#1F2937] font-mono-nums flex items-center gap-1.5">
                  {reportB.evolutionScore?.overallScore || 0}/100
                  <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                    scoreDelta >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta}
                  </span>
                </span>
              </div>
            </div>

          </div>

          {/* DELTA METRICS GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            
            {/* Score Delta */}
            <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-3.5 text-center">
              <span className="text-[10px] text-[#4B5563] uppercase font-bold block">Evolution Score</span>
              <div className="text-xl font-black text-[#1F2937] font-mono-nums mt-1">
                {reportA.evolutionScore?.overallScore} → {reportB.evolutionScore?.overallScore}
              </div>
              <span className={`text-[11px] font-bold block mt-0.5 ${scoreDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {scoreDelta >= 0 ? `+${scoreDelta} pts` : `${scoreDelta} pts`}
              </span>
            </div>

            {/* Adherence Delta */}
            <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-3.5 text-center">
              <span className="text-[10px] text-[#4B5563] uppercase font-bold block">Adesão ao Plano</span>
              <div className="text-xl font-black font-display text-emerald-400 font-mono-nums mt-1">
                {reportA.adherence?.adherenceRatePercent}% → {reportB.adherence?.adherenceRatePercent}%
              </div>
              <span className={`text-[11px] font-bold block mt-0.5 ${adherenceDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {adherenceDelta >= 0 ? `+${adherenceDelta}%` : `${adherenceDelta}%`}
              </span>
            </div>

            {/* Completed Sessions Delta */}
            <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-3.5 text-center">
              <span className="text-[10px] text-[#4B5563] uppercase font-bold block">Treinos Realizados</span>
              <div className="text-xl font-black text-[#1F2937] font-mono-nums mt-1">
                {reportA.adherence?.completedSessions} → {reportB.adherence?.completedSessions}
              </div>
              <span className="text-[11px] text-[#4B5563] block mt-0.5">
                {sessionsDelta >= 0 ? `+${sessionsDelta} treinos` : `${sessionsDelta} treinos`}
              </span>
            </div>

          </div>

          {/* PHYSICAL COMPARISON */}
          <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-[#374151]" />
              <span>Composição Corporal Comparada</span>
            </h4>

            {reportA.physicalComparison?.hasData && reportB.physicalComparison?.hasData ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                {reportB.physicalComparison.metrics.slice(0, 3).map((mB, idx) => {
                  const mA = reportA.physicalComparison.metrics.find(m => m.key === mB.key);
                  return (
                    <div key={idx} className="bg-[#0D0D0D] p-3 rounded-lg border border-[#E5E7EB]">
                      <span className="text-[10px] text-[#4B5563] uppercase block">{mB.label}</span>
                      <div className="font-bold text-white font-mono-nums mt-1">
                        {mA?.final || '—'} → {mB.final} {mB.unit}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[#4B5563] text-center py-2">
                Um ou ambos os relatórios não possuem avaliação física vinculada.
              </p>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F8F9FA] border-t border-[#E5E7EB] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold font-display uppercase tracking-wider transition-all"
          >
            Fechar Comparativo
          </button>
        </div>

      </div>
    </div>
  );
};
