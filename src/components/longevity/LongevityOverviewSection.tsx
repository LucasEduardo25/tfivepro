import React from 'react';
import { 
  Activity, 
  Target, 
  Play, 
  FileText, 
  Share2, 
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { 
  Student, 
  FunctionalAssessment, 
  FunctionalGoal, 
  FunctionalMilestone, 
  AutonomyTaskKey
} from '../../types';
import { useApp } from '../../context/AppContext';
import { computeDomainSummaries, computeAutonomyMap, formatTestValue } from '../../utils/functionalCalculations';

interface LongevityOverviewSectionProps {
  student: Student;
  assessments: FunctionalAssessment[];
  goals: FunctionalGoal[];
  milestones: FunctionalMilestone[];
  onOpenRunnerModal: () => void;
  onOpenReportModal: () => void;
  onOpenStoryModal: () => void;
  onOpenNewGoalModal: (task?: AutonomyTaskKey) => void;
  onNavigateSubTab: (tab: 'overview' | 'autonomy_map' | 'tests' | 'goals' | 'evolution') => void;
}

export const LongevityOverviewSection: React.FC<LongevityOverviewSectionProps> = ({
  student,
  assessments,
  goals,
  milestones,
  onOpenRunnerModal,
  onOpenReportModal,
  onOpenStoryModal,
  onOpenNewGoalModal,
  onNavigateSubTab
}) => {
  const { functionalTests, functionalBatteries } = useApp();

  const domainSummaries = React.useMemo(() => {
    return computeDomainSummaries(assessments);
  }, [assessments]);

  const autonomyMapCards = React.useMemo(() => {
    return computeAutonomyMap(assessments, goals);
  }, [assessments, goals]);

  const latestAssessment = assessments.length > 0
    ? [...assessments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

  const activeGoals = goals.filter(g => g.status === 'active');

  const daysSinceLastAssessment = latestAssessment
    ? Math.floor((Date.now() - new Date(latestAssessment.date).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-6">
      
      {/* Hero Overview Banner */}
      <div className="bg-[#18181B] border border-[#27272a] rounded-3xl p-5 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 max-w-xl z-10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#374151] bg-[#F3F4F6] px-2.5 py-0.5 rounded-full border border-[#E5E7EB] flex items-center gap-1">
              <Activity className="w-3 h-3 text-[#374151]" />
              TFIVE PRO LONGEVIDADE FUNCIONAL
            </span>
            {latestAssessment && (
              <span className="text-xs text-[#4B5563] font-mono-nums">
                Última avaliação: {latestAssessment.date}
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-black font-display text-white">
            Autonomia & Preservação da Capacidade Motora
          </h2>
          <p className="text-xs text-[#4B5563] leading-relaxed">
            Acompanhamento focado na vida real: sentar, levantar do chão, caminhar com segurança, carregar objetos e manter independência física.
          </p>

          {/* Quick Metrics Bar */}
          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-white font-bold font-mono-nums">
                {autonomyMapCards.filter(s => s.isAssessed).length} de 7
              </span>
              <span className="text-[#4B5563]">Tarefas Mapeadas</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#374151]" />
              <span className="text-white font-bold font-mono-nums">{activeGoals.length}</span>
              <span className="text-[#4B5563]">Metas Ativas</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-white font-bold font-mono-nums">{milestones.length}</span>
              <span className="text-[#4B5563]">Conquistas</span>
            </div>
          </div>
        </div>

        {/* Action Buttons Hub */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 z-10">
          <button
            onClick={onOpenRunnerModal}
            className="px-5 py-3 rounded-2xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-xs"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Nova Avaliação Funcional</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenReportModal}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold font-display uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
              title="Gerar Relatório PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Relatório</span>
            </button>

            <button
              onClick={onOpenStoryModal}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold font-display uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
              title="Criar Story para Instagram / WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Story</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reassessment Alert if > 60 days */}
      {daysSinceLastAssessment !== null && daysSinceLastAssessment > 60 && (
        <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-amber-300">Reavaliação Funcional Recomendada</p>
              <p className="text-zinc-600 mt-0.5">
                Já se passaram {daysSinceLastAssessment} dias desde o último teste funcional de {student.name}.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenRunnerModal}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-black uppercase font-display tracking-wider shrink-0 transition-all"
          >
            Reavaliar Agora
          </button>
        </div>
      )}

      {/* 7 Functional Domains Summary Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black font-display uppercase tracking-wider text-[#4B5563]">
            Capacidades Físicas & Domínios Avaliados
          </h3>
          <button
            onClick={() => onNavigateSubTab('autonomy_map')}
            className="text-xs font-bold text-[#374151] hover:underline flex items-center gap-1"
          >
            <span>Ver Mapa de Autonomia Completo</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {domainSummaries.map((dom) => (
            <div
              key={dom.domain}
              className="bg-[#18181B] border border-[#27272a] rounded-2xl p-4.5 flex flex-col justify-between hover:border-[#3F3F46] transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    dom.status === 'improving'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                      : dom.status === 'declining'
                      ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                      : dom.testsCount > 0
                      ? 'bg-blue-950 text-blue-300 border border-blue-500/30'
                      : 'bg-[#27272A] text-[#71717A]'
                  }`}>
                    {dom.statusLabel}
                  </span>
                </div>

                <h4 className="text-sm font-black font-display text-white">
                  {dom.label}
                </h4>
                <p className="text-xs text-[#4B5563] mt-0.5 line-clamp-2">
                  {dom.details}
                </p>
              </div>

              <div className="mt-3.5 pt-3 border-t border-[#27272A] flex items-center justify-between text-[11px] text-[#4B5563]">
                <span>{dom.testsCount} {dom.testsCount === 1 ? 'teste avaliado' : 'testes avaliados'}</span>
                <button
                  onClick={() => onNavigateSubTab('tests')}
                  className="font-bold text-[#374151] hover:underline"
                >
                  Ver Testes
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Goals Spotlight & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Active Goals Spotlight */}
        <div className="bg-[#18181B] border border-[#27272a] rounded-3xl p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[#374151]" />
                <h3 className="text-sm font-black font-display uppercase tracking-wider text-white">
                  Metas Funcionais Ativas
                </h3>
              </div>
              <button
                onClick={() => onOpenNewGoalModal()}
                className="text-xs font-bold text-[#374151] hover:underline"
              >
                + Nova Meta
              </button>
            </div>

            {activeGoals.length === 0 ? (
              <p className="text-xs text-[#71717A] italic py-4">
                Nenhuma meta ativa definida. Cadastre objetivos de autonomia motora para engajar o aluno.
              </p>
            ) : (
              <div className="space-y-2 mt-3">
                {activeGoals.slice(0, 3).map((goal) => (
                  <div
                    key={goal.id}
                    className="bg-[#121212] p-3 rounded-xl border border-[#27272A] text-xs flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-white">{goal.title}</p>
                      {goal.deadlineDate && (
                        <p className="text-[10px] text-[#4B5563] mt-0.5">Prazo: {goal.deadlineDate}</p>
                      )}
                    </div>
                    {goal.targetValueNumeric !== undefined && (
                      <span className="font-mono-nums font-black text-emerald-400 shrink-0">
                        Alvo: {goal.targetValueNumeric} {goal.unitLabel}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateSubTab('goals')}
            className="w-full py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold font-display uppercase tracking-wider transition-all text-center"
          >
            Gerenciar Todas as Metas ({goals.length})
          </button>
        </div>

        {/* Quick Batteries Launcher */}
        <div className="bg-[#18181B] border border-[#27272a] rounded-3xl p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-[#374151]" />
              <h3 className="text-sm font-black font-display uppercase tracking-wider text-white">
                Baterias Recomendadas
              </h3>
            </div>
            <p className="text-xs text-[#4B5563]">
              Aplique sequências de testes padronizadas e rápidas durante a aula.
            </p>

            <div className="space-y-2 mt-3">
              {functionalBatteries.slice(0, 2).map((b) => (
                <div
                  key={b.id}
                  className="bg-[#121212] p-3 rounded-xl border border-[#27272A] flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-white">{b.title}</p>
                    <p className="text-[10px] text-[#4B5563]">{b.testIds.length} testes • ~{b.estimatedDurationMinutes} min</p>
                  </div>
                  <button
                    onClick={onOpenRunnerModal}
                    className="px-3 py-1.5 rounded-lg bg-[#374151] hover:bg-[#1F2937] text-white font-bold text-[11px] uppercase tracking-wider"
                  >
                    Iniciar
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigateSubTab('tests')}
            className="w-full py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-bold font-display uppercase tracking-wider transition-all text-center"
          >
            Ver Biblioteca de Testes ({functionalTests.length})
          </button>
        </div>

      </div>

    </div>
  );
};
