import React from 'react';
import { 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  HelpCircle, 
  Play, 
  Target
} from 'lucide-react';
import { 
  Student, 
  AutonomyTaskKey, 
  FunctionalAssessment, 
  FunctionalGoal
} from '../../types';
import { useApp } from '../../context/AppContext';
import { 
  computeAutonomyMap, 
  formatTestValue 
} from '../../utils/functionalCalculations';

interface AutonomyMapSectionProps {
  student: Student;
  assessments: FunctionalAssessment[];
  goals: FunctionalGoal[];
  onOpenRunnerForTask: (task: AutonomyTaskKey) => void;
  onOpenNewGoalModal: (task?: AutonomyTaskKey) => void;
}

export const AutonomyMapSection: React.FC<AutonomyMapSectionProps> = ({
  student,
  assessments,
  goals,
  onOpenRunnerForTask,
  onOpenNewGoalModal
}) => {
  const { functionalTests } = useApp();

  const autonomyCards = React.useMemo(() => {
    return computeAutonomyMap(assessments, goals);
  }, [assessments, goals]);

  return (
    <div className="space-y-6">
      
      {/* Autonomy Map Header */}
      <div className="bg-[#18181B] border border-[#27272a] rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#374151] bg-[#F3F4F6] px-2 py-0.5 rounded-full border border-[#E5E7EB]">
              Mapeamento de Independência
            </span>
            <span className="text-xs text-[#4B5563]">
              7 Tarefas Fundamentais da Vida Diária
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-display text-white">
            Mapa de Autonomia Funcional
          </h2>
          <p className="text-xs text-[#4B5563] mt-1 max-w-2xl leading-relaxed">
            Acompanhamento contínuo da capacidade motora para realizar atividades cotidianas sem dor, dependência ou fadiga precoce.
          </p>
        </div>

        {/* Global Autonomy Stats */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-[#121212] border border-[#27272A] rounded-2xl px-4 py-3 text-center">
            <p className="text-[10px] font-bold text-[#4B5563] uppercase tracking-wider">Avaliadas</p>
            <p className="text-xl font-black font-mono-nums text-white">
              {autonomyCards.filter(s => s.isAssessed).length} / 7
            </p>
          </div>

          <div className="bg-[#121212] border border-[#27272A] rounded-2xl px-4 py-3 text-center">
            <p className="text-[10px] font-bold text-[#4B5563] uppercase tracking-wider">Evoluindo</p>
            <p className="text-xl font-black font-mono-nums text-emerald-400">
              {autonomyCards.filter(s => s.status === 'improving').length}
            </p>
          </div>
        </div>
      </div>

      {/* 7 Autonomy Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {autonomyCards.map((item) => {
          let statusBadgeClass = 'bg-[#27272A] text-[#4B5563] border-[#3F3F46]';
          let statusIcon = <HelpCircle className="w-3.5 h-3.5" />;

          if (item.status === 'improving') {
            statusBadgeClass = 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300';
            statusIcon = <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
          } else if (item.status === 'stable') {
            statusBadgeClass = 'bg-blue-950/70 border-blue-500/40 text-blue-300';
            statusIcon = <Minus className="w-3.5 h-3.5 text-blue-400" />;
          } else if (item.status === 'declining') {
            statusBadgeClass = 'bg-rose-950/70 border-rose-500/40 text-rose-300';
            statusIcon = <TrendingDown className="w-3.5 h-3.5 text-rose-400" />;
          } else if (item.isAssessed) {
            statusBadgeClass = 'bg-zinc-800 border-zinc-700 text-zinc-300';
            statusIcon = <ShieldCheck className="w-3.5 h-3.5 text-zinc-600" />;
          }

          return (
            <div
              key={item.taskKey}
              className="bg-[#18181B] border border-[#27272a] rounded-3xl p-5 hover:border-[#3F3F46] transition-all flex flex-col justify-between"
            >
              <div>
                {/* Card Top Row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-black font-display uppercase tracking-widest text-[#374151]">
                    TAREFA {item.taskKey.toUpperCase()}
                  </span>
                  <div className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${statusBadgeClass}`}>
                    {statusIcon}
                    <span>{item.statusLabel}</span>
                  </div>
                </div>

                {/* Task Title */}
                <h3 className="text-lg font-black font-display text-white">
                  {item.title}
                </h3>
                <p className="text-xs text-[#4B5563] mt-0.5 leading-relaxed">
                  {item.description}
                </p>

                {/* Current Value / Baseline Box */}
                <div className="mt-4 bg-[#121212] border border-[#27272A] rounded-2xl p-3.5">
                  {item.latestResult ? (
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-[#4B5563] mb-1">
                        <span className="font-bold uppercase tracking-wider">Última Marca ({item.latestDate})</span>
                        <span className="text-[10px] text-zinc-600 truncate max-w-[120px]">{item.latestResult.testName}</span>
                      </div>
                      <div className="text-2xl font-black font-mono-nums text-white">
                        {formatTestValue(item.latestResult)}
                      </div>

                      {item.comparison && item.comparison.hasPrevious && (
                        <div className="mt-2 pt-2 border-t border-[#27272A] flex items-center justify-between text-[11px] text-[#4B5563]">
                          <span>Linha Anterior ({item.comparison.previousDate})</span>
                          <span className="font-mono-nums font-bold text-zinc-300">
                            {item.comparison.previousValueFormatted}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-xs text-[#71717A] italic">
                        Nenhum teste registrado para esta tarefa.
                      </p>
                    </div>
                  )}
                </div>

                {/* Active Goals for this Task */}
                {item.activeGoal && (
                  <div className="mt-3 bg-[#F3F4F6] border border-[#374151]/20 rounded-xl p-2.5 flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#374151] shrink-0" />
                    <div className="text-[11px] text-white truncate">
                      <strong className="text-[#374151]">Meta Ativa:</strong> {item.activeGoal.title}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-4 border-t border-[#27272A] flex items-center gap-2">
                <button
                  onClick={() => onOpenRunnerForTask(item.taskKey)}
                  className="flex-1 px-3 py-2 rounded-xl bg-[#27272A] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 group"
                >
                  <Play className="w-3.5 h-3.5 fill-white group-hover:scale-110 transition-transform" />
                  <span>Avaliar</span>
                </button>

                <button
                  onClick={() => onOpenNewGoalModal(item.taskKey)}
                  className="px-3 py-2 rounded-xl bg-[#1F1F23] hover:bg-[#27272A] text-[#4B5563] hover:text-white text-xs font-bold transition-all border border-[#27272A] flex items-center justify-center"
                  title="Definir Meta para esta Capacidade"
                >
                  <Target className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
