import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Trash2, 
  Share2, 
  FileText, 
  Activity,
  ChevronRight
} from 'lucide-react';
import { 
  Student, 
  FunctionalAssessment, 
  FunctionalMilestone 
} from '../../types';
import { useApp } from '../../context/AppContext';
import { compareTestResults, formatTestValue } from '../../utils/functionalCalculations';

interface FunctionalEvolutionSectionProps {
  student: Student;
  assessments: FunctionalAssessment[];
  milestones: FunctionalMilestone[];
  onOpenReportModal: (assessment?: FunctionalAssessment) => void;
  onOpenStoryModal: (assessment?: FunctionalAssessment) => void;
}

export const FunctionalEvolutionSection: React.FC<FunctionalEvolutionSectionProps> = ({
  student,
  assessments,
  milestones,
  onOpenReportModal,
  onOpenStoryModal
}) => {
  const { deleteFunctionalAssessment } = useApp();
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(
    assessments.length > 0 ? assessments[0].id : null
  );

  const sortedAssessments = React.useMemo(() => {
    return [...assessments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [assessments]);

  const activeAssessment = sortedAssessments.find(a => a.id === selectedAssessmentId) || sortedAssessments[0];
  const baselineAssessment = sortedAssessments.length > 1 ? sortedAssessments[sortedAssessments.length - 1] : null;

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-[#18181B] border border-[#27272a] rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#374151] bg-[#F3F4F6] px-2 py-0.5 rounded-full border border-[#E5E7EB]">
              Histórico & Progresso
            </span>
            <span className="text-xs text-[#4B5563]">
              {assessments.length} Avaliações Realizadas
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-display text-white">
            Evolução da Capacidade Funcional
          </h2>
          <p className="text-xs text-[#4B5563] mt-1 max-w-2xl leading-relaxed">
            Comparativo entre a linha de base e os testes atuais para demonstrar a preservação ou ganho de autonomia motora.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onOpenStoryModal(activeAssessment)}
            className="px-4 py-2.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-black font-display uppercase tracking-wider transition-all flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Story Conquista</span>
          </button>

          <button
            onClick={() => onOpenReportModal(activeAssessment)}
            className="px-4 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-xs"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Relatório Oficial</span>
          </button>
        </div>
      </div>

      {assessments.length === 0 ? (
        <div className="bg-[#18181B] border border-[#27272a] rounded-3xl p-8 text-center space-y-3">
          <Activity className="w-10 h-10 text-[#71717A] mx-auto" />
          <h4 className="text-base font-black font-display text-white">
            Nenhuma avaliação funcional realizada ainda
          </h4>
          <p className="text-xs text-[#4B5563] max-w-md mx-auto">
            Aplique a primeira bateria de testes funcionais para estabelecer a linha de base deste aluno.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Assessment Date Selector List (Left Column) */}
          <div className="space-y-3">
            <h3 className="text-xs font-black font-display uppercase tracking-wider text-[#4B5563]">
              Sessões de Avaliação
            </h3>

            <div className="space-y-2">
              {sortedAssessments.map((a, idx) => {
                const isSelected = (activeAssessment && activeAssessment.id === a.id);
                const isBaseline = (idx === sortedAssessments.length - 1 && sortedAssessments.length > 1);

                return (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAssessmentId(a.id)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#F3F4F6] border-[#374151] text-white shadow-lg shadow-xs'
                        : 'bg-[#18181B] border-[#27272a] text-[#4B5563] hover:border-[#3F3F46]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isBaseline ? 'bg-blue-950 text-blue-400 border border-blue-800' : 'bg-[#27272A] text-zinc-300'
                        }`}>
                          {isBaseline ? 'Linha de Base' : idx === 0 ? 'Mais Recente' : `Avaliação ${sortedAssessments.length - idx}`}
                        </span>
                        <span className="text-xs font-mono-nums text-white font-bold">{a.date}</span>
                      </div>
                      <h4 className="text-sm font-black font-display text-white mt-1">
                        {a.title}
                      </h4>
                      <p className="text-[11px] text-[#4B5563] mt-0.5">
                        {a.results.length} testes avaliados
                      </p>
                    </div>

                    <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-[#374151] translate-x-1' : 'text-[#71717A]'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Assessment Detailed Results Matrix (Right Column - Spans 2) */}
          <div className="lg:col-span-2 space-y-4">
            {activeAssessment && (
              <div className="bg-[#18181B] border border-[#27272a] rounded-3xl p-5 sm:p-6 space-y-5">
                
                {/* Detailed Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#27272A]">
                  <div>
                    <span className="text-xs text-[#4B5563] font-mono-nums">
                      Data da Avaliação: <strong className="text-white">{activeAssessment.date}</strong>
                    </span>
                    <h3 className="text-xl font-black font-display text-white mt-0.5">
                      {activeAssessment.title}
                    </h3>
                  </div>

                  <button
                    onClick={() => {
                      if (window.confirm('Deseja realmente excluir este registro de avaliação funcional?')) {
                        deleteFunctionalAssessment(activeAssessment.id);
                      }
                    }}
                    className="p-2 rounded-xl text-[#71717A] hover:text-rose-400 hover:bg-rose-950/30 transition-colors self-start sm:self-auto"
                    title="Excluir Avaliação"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Results Table / Cards */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black font-display uppercase tracking-wider text-[#4B5563]">
                    Resultados & Comparativo com Linha de Base
                  </h4>

                  <div className="space-y-3">
                    {activeAssessment.results.map((res) => {
                      let baselineResult = undefined;
                      if (baselineAssessment && baselineAssessment.id !== activeAssessment.id) {
                        baselineResult = baselineAssessment.results.find(r => r.testId === res.testId);
                      }

                      const comparison = baselineResult ? compareTestResults(
                        res, 
                        baselineResult, 
                        activeAssessment.date, 
                        baselineAssessment.date
                      ) : null;

                      let badgeClass = 'bg-[#27272A] text-[#4B5563]';
                      let icon = <Minus className="w-3.5 h-3.5" />;
                      let label = 'Linha de Base';

                      if (comparison) {
                        if (comparison.status === 'improving') {
                          badgeClass = 'bg-emerald-950 border border-emerald-500/40 text-emerald-300';
                          icon = <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
                          label = comparison.deltaPercent !== undefined
                            ? `${comparison.deltaPercent > 0 ? '+' : ''}${comparison.deltaPercent.toFixed(0)}%`
                            : 'Evolução';
                        } else if (comparison.status === 'declining') {
                          badgeClass = 'bg-rose-950 border border-rose-500/40 text-rose-300';
                          icon = <TrendingDown className="w-3.5 h-3.5 text-rose-400" />;
                          label = comparison.deltaPercent !== undefined
                            ? `${comparison.deltaPercent.toFixed(0)}%`
                            : 'Atenção';
                        } else {
                          badgeClass = 'bg-blue-950 border border-blue-500/40 text-blue-300';
                          icon = <Minus className="w-3.5 h-3.5 text-blue-400" />;
                          label = 'Estável';
                        }
                      }

                      return (
                        <div
                          key={res.id || res.testId}
                          className="bg-[#121212] border border-[#27272A] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-black uppercase text-[#374151] bg-[#F3F4F6] px-2 py-0.5 rounded-full">
                                {res.domain}
                              </span>
                              {res.usedHands && (
                                <span className="text-[10px] font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-800/40">
                                  Usou apoio mãos
                                </span>
                              )}
                            </div>
                            <h5 className="text-sm font-black font-display text-white">
                              {res.testName}
                            </h5>
                            {res.notes && (
                              <p className="text-xs text-[#4B5563] mt-0.5 italic">
                                "{res.notes}"
                              </p>
                            )}
                          </div>

                          {/* Value & Evolution Comparison */}
                          <div className="flex items-center gap-4 self-end sm:self-auto">
                            <div className="text-right">
                              <p className="text-[10px] font-bold uppercase text-[#4B5563]">Marca</p>
                              <p className="text-lg font-black font-mono-nums text-white">
                                {formatTestValue(res)}
                              </p>
                            </div>

                            {comparison && (
                              <div className={`px-2.5 py-1 rounded-xl text-xs font-black font-display uppercase tracking-wider flex items-center gap-1 shrink-0 ${badgeClass}`}>
                                {icon}
                                <span>{label}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {activeAssessment.trainerNotes && (
                  <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-4">
                    <p className="text-[11px] font-black font-display uppercase tracking-wider text-[#4B5563] mb-1">
                      Parecer Geral do Personal Trainer
                    </p>
                    <p className="text-xs text-white leading-relaxed">
                      {activeAssessment.trainerNotes}
                    </p>
                  </div>
                )}

              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
