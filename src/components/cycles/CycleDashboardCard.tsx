import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Layers, 
  Dumbbell, 
  Play, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Edit3, 
  RefreshCw, 
  CheckSquare, 
  ChevronRight,
  TrendingUp,
  Sparkles,
  MoreVertical,
  Copy
} from 'lucide-react';
import { 
  TrainingCycle, 
  TrainingBlock, 
  WorkoutRoutine, 
  Student, 
  RoutineWorkout 
} from '../../types';
import { 
  computeCycleMetrics, 
  formatDateBr, 
  formatDateShortBr, 
  CycleMetrics 
} from '../../utils/cycleCalculations';
import { ExtendBlockModal } from './ExtendBlockModal';
import { ChangeBlockRoutineModal } from './ChangeBlockRoutineModal';

interface CycleDashboardCardProps {
  student: Student;
  currentCycle?: TrainingCycle | null;
  routines: WorkoutRoutine[];
  onStartWorkout?: (student: Student, routine?: WorkoutRoutine, workout?: RoutineWorkout | string) => void;
  onViewRoutine?: (routineId: string) => void;
  onOpenNewCycleModal: () => void;
  onEditCycle: (cycle: TrainingCycle) => void;
  onCompleteCycle: (cycleId: string) => Promise<any>;
  onExtendBlock: (cycleId: string, blockId: string, additionalWeeks: number) => Promise<any>;
  onChangeBlockRoutine: (cycleId: string, blockId: string, routineId: string, routineTitle: string, note?: string) => Promise<any>;
  onDuplicateCycle?: (cycle: TrainingCycle) => Promise<any> | void;
}

export const CycleDashboardCard: React.FC<CycleDashboardCardProps> = ({
  student,
  currentCycle,
  routines,
  onStartWorkout,
  onViewRoutine,
  onOpenNewCycleModal,
  onEditCycle,
  onCompleteCycle,
  onExtendBlock,
  onChangeBlockRoutine,
  onDuplicateCycle
}) => {
  const [showExtendModal, setShowExtendModal] = useState<boolean>(false);
  const [showChangeRoutineModal, setShowChangeRoutineModal] = useState<boolean>(false);
  const [showConfirmComplete, setShowConfirmComplete] = useState<boolean>(false);

  // Compute live cycle metrics
  const metrics: CycleMetrics | null = useMemo(() => {
    if (!currentCycle) return null;
    try {
      return computeCycleMetrics(currentCycle);
    } catch {
      return null;
    }
  }, [currentCycle]);

  // Current active block
  const currentBlock = metrics?.currentBlock || currentCycle?.blocks[0] || null;

  // Associated workout routine for the current block
  const currentBlockRoutine = useMemo(() => {
    if (!currentBlock?.routineId) return null;
    return routines.find(r => r.id === currentBlock.routineId) || null;
  }, [currentBlock?.routineId, routines]);

  // If no cycle exists, render clean, high-contrast prompt to create first cycle
  if (!currentCycle) {
    return (
      <div className="bg-[#121212] border border-[#27272A] rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] border border-[#374151]/20 flex items-center justify-center text-[#374151] shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] bg-zinc-800 px-2.5 py-0.5 rounded-full border border-zinc-700">
                  Periodização
                </span>
                <span className="text-xs text-[#4B5563]">Nenhum ciclo ativo</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold font-display text-white">
                Acompanhamento por Ciclos & Blocos
              </h3>
              <p className="text-xs text-[#4B5563] mt-0.5">
                Estruture a periodização de {student.name} em blocos e semanas vinculados às rotinas existentes.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenNewCycleModal}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all shadow-lg shadow-xs flex items-center justify-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo Ciclo</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#121212] border border-[#27272A] rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden space-y-5">
      
      {/* CARD HEADER: BADGE, CYCLE NAME, OBJECTIVE, ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#27272A]">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
              currentCycle.status === 'current'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : currentCycle.status === 'planned'
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}>
              {currentCycle.status === 'current' ? 'Ciclo Atual' : currentCycle.status === 'planned' ? 'Ciclo Planejado' : 'Ciclo Concluído'}
            </span>

            {currentCycle.objective && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]">
                {currentCycle.objective}
              </span>
            )}

            <span className="text-[11px] text-[#4B5563]">
              Início: {formatDateBr(currentCycle.startDate)} • {currentCycle.totalWeeks} semanas totais
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black font-display text-white truncate">
            {currentCycle.name}
          </h3>
        </div>

        {/* Top actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onEditCycle(currentCycle)}
            className="px-3 py-1.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#4B5563] hover:text-white text-xs font-bold font-display uppercase tracking-wider transition-all flex items-center gap-1.5"
            title="Editar parâmetros do ciclo"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editar</span>
          </button>

          <button
            onClick={onOpenNewCycleModal}
            className="px-3 py-1.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-white text-xs font-bold font-display uppercase tracking-wider transition-all flex items-center gap-1.5"
            title="Planejar ou criar outro ciclo"
          >
            <Plus className="w-3.5 h-3.5 text-[#374151]" />
            <span>+ Novo Ciclo</span>
          </button>
        </div>
      </div>

      {/* CORE PERIODIZATION GRID: WEEKS DISTINCTION & CURRENT BLOCK */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* 1. BLOCO ATUAL */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold font-display uppercase tracking-wider text-[#4B5563]">
              Bloco Atual
            </span>
            <Layers className="w-4 h-4 text-[#374151]" />
          </div>
          <div>
            <div className="text-base font-black font-display text-white truncate">
              {currentBlock?.name || 'Fase Geral'}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {currentBlock ? `${formatDateShortBr(currentBlock.startDate)} a ${formatDateShortBr(currentBlock.endDate)}` : '-'}
            </p>
          </div>
        </div>

        {/* 2. SEMANA DO BLOCO */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold font-display uppercase tracking-wider text-[#4B5563]">
              Semana do Bloco
            </span>
            <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Fase
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-display text-white">
                Semana {metrics?.currentBlockWeek || 1}
              </span>
              <span className="text-xs text-zinc-400 font-bold">
                de {metrics?.totalBlockWeeks || currentBlock?.durationWeeks || 4}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {metrics?.daysRemainingInBlock !== undefined ? (
                metrics.daysRemainingInBlock > 0 
                  ? `${metrics.daysRemainingInBlock} dias restantes no bloco`
                  : 'Últimos dias do bloco'
              ) : '-'}
            </p>
          </div>
        </div>

        {/* 3. SEMANA DO CICLO */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold font-display uppercase tracking-wider text-[#4B5563]">
              Semana do Ciclo
            </span>
            <span className="text-[10px] font-black uppercase text-[#374151] bg-[#F3F4F6] px-2 py-0.5 rounded-full">
              Geral
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-display text-white">
                Semana {metrics?.currentCycleWeek || 1}
              </span>
              <span className="text-xs text-zinc-400 font-bold">
                de {metrics?.totalCycleWeeks || currentCycle.totalWeeks}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Progresso do macrociclo planejado
            </p>
          </div>
        </div>

        {/* 4. PRÓXIMA REAVALIAÇÃO */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold font-display uppercase tracking-wider text-[#4B5563]">
              Próxima Reavaliação
            </span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            {currentCycle.reviewDate ? (
              <>
                <div className="text-sm font-black font-display text-white truncate">
                  {formatDateBr(currentCycle.reviewDate)}
                </div>
                <p className="text-[11px] text-amber-400 font-bold mt-0.5">
                  {metrics?.reviewDaysRemaining !== undefined ? (
                    metrics.reviewDaysRemaining > 0
                      ? `Em ${metrics.reviewDaysRemaining} ${metrics.reviewDaysRemaining === 1 ? 'dia' : 'dias'}`
                      : metrics.reviewDaysRemaining === 0
                      ? 'Reavaliação hoje!'
                      : `Atrasada (${Math.abs(metrics.reviewDaysRemaining)} dias)`
                  ) : '-'}
                </p>
              </>
            ) : (
              <>
                <div className="text-xs text-[#4B5563]">Data não agendada</div>
                <p className="text-[11px] text-zinc-400 mt-0.5">Ao final do ciclo</p>
              </>
            )}
          </div>
        </div>

      </div>

      {/* PROGRESS BAR & BLOCK SEGMENTS */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold font-display uppercase tracking-wider text-[#4B5563]">
              Progresso do Ciclo
            </span>
            <span className="font-black text-white">{metrics?.percentComplete || 0}%</span>
          </div>

          <div className="text-[11px] text-zinc-400">
            {currentCycle.blocks.length} {currentCycle.blocks.length === 1 ? 'bloco' : 'blocos de periodização'}
          </div>
        </div>

        {/* Multi-segment progress bar representing blocks */}
        <div className="w-full bg-[#18181B] border border-[#27272A] rounded-xl h-3.5 p-0.5 flex gap-1 overflow-hidden">
          {currentCycle.blocks.map((b, idx) => {
            const isPastBlock = (metrics?.currentBlockIndex ?? 0) > idx;
            const isCurrentBlock = (metrics?.currentBlockIndex ?? 0) === idx;
            const blockWeight = (b.durationWeeks / currentCycle.totalWeeks) * 100;

            let fillPercent = 0;
            if (isPastBlock) fillPercent = 100;
            else if (isCurrentBlock) {
              const currentW = metrics?.currentBlockWeek || 1;
              const totalW = b.durationWeeks || 1;
              fillPercent = Math.min(100, Math.round((currentW / totalW) * 100));
            }

            return (
              <div 
                key={b.id} 
                style={{ width: `${blockWeight}%` }}
                className="h-full bg-zinc-800/60 rounded-md overflow-hidden relative group/seg"
                title={`${b.name} (${b.durationWeeks} sem)`}
              >
                <div 
                  style={{ width: `${fillPercent}%` }}
                  className={`h-full transition-all duration-500 ${
                    isCurrentBlock ? 'bg-[#374151]' : 'bg-emerald-500'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Labels under blocks */}
        <div className="flex justify-between items-center text-[10px] text-zinc-400 pt-0.5">
          {currentCycle.blocks.map((b, idx) => (
            <span 
              key={b.id} 
              className={`truncate max-w-[120px] ${
                (metrics?.currentBlockIndex ?? 0) === idx ? 'text-[#374151] font-bold' : ''
              }`}
            >
              {b.name} ({b.durationWeeks}s)
            </span>
          ))}
        </div>
      </div>

      {/* ASSOCIATED ROUTINE BANNER & QUICK ACTIONS */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Routine Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB] flex items-center justify-center shrink-0">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold font-display uppercase tracking-wider text-[#4B5563]">
                Rotina Associada ao Bloco Atual:
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-white text-base truncate">
                {currentBlockRoutine?.title || currentBlock?.routineTitleSnapshot || 'Nenhuma rotina associada'}
              </h4>
              {currentBlockRoutine?.workouts && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {currentBlockRoutine.workouts.map(w => w.letter).join(' • ')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Routine Actions & Block Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
          
          {/* Start Workout button directly with associated routine */}
          {onStartWorkout && (
            <button
              onClick={() => onStartWorkout(student, currentBlockRoutine || undefined)}
              className="px-3.5 py-2 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all shadow-md shadow-xs flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Iniciar Treino</span>
            </button>
          )}

          {/* View Routine */}
          {onViewRoutine && currentBlockRoutine && (
            <button
              onClick={() => onViewRoutine(currentBlockRoutine.id)}
              className="px-3 py-2 rounded-xl bg-[#121212] hover:bg-[#27272A] border border-[#27272A] text-white text-xs font-bold font-display uppercase tracking-wider transition-all"
            >
              Ver Rotina
            </button>
          )}

          {/* Estender Bloco */}
          {currentBlock && (
            <button
              onClick={() => setShowExtendModal(true)}
              className="px-3 py-2 rounded-xl bg-[#121212] hover:bg-[#27272A] border border-[#27272A] text-[#4B5563] hover:text-white text-xs font-bold font-display uppercase tracking-wider transition-all flex items-center gap-1.5"
              title="Adicionar semanas a este bloco"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Estender Bloco</span>
            </button>
          )}

          {/* Trocar Rotina */}
          {currentBlock && (
            <button
              onClick={() => setShowChangeRoutineModal(true)}
              className="px-3 py-2 rounded-xl bg-[#121212] hover:bg-[#27272A] border border-[#27272A] text-[#4B5563] hover:text-white text-xs font-bold font-display uppercase tracking-wider transition-all flex items-center gap-1.5"
              title="Substituir rotina vinculada ao bloco atual"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              <span>Trocar Rotina</span>
            </button>
          )}

          {/* Concluir Ciclo */}
          {currentCycle.status === 'current' && (
            <button
              onClick={() => setShowConfirmComplete(true)}
              className="px-3 py-2 rounded-xl bg-[#121212] hover:bg-[#27272A] border border-[#27272A] text-[#4B5563] hover:text-emerald-400 text-xs font-bold font-display uppercase tracking-wider transition-all flex items-center gap-1.5"
              title="Marcar ciclo como concluído"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Concluir Ciclo</span>
            </button>
          )}
        </div>
      </div>

      {/* CONFIRM CONCLUDE MODAL */}
      {showConfirmComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121212] border border-[#27272A] w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h4 className="text-base font-bold font-display text-white">
                Concluir este Ciclo de Treinamento?
              </h4>
              <p className="text-xs text-[#4B5563] mt-1">
                O ciclo "{currentCycle.name}" será marcado como concluído e arquivado no histórico do aluno.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmComplete(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-white text-xs font-bold font-display uppercase tracking-wider transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onCompleteCycle(currentCycle.id);
                  setShowConfirmComplete(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black font-display uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/30"
              >
                Sim, Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXTEND BLOCK MODAL */}
      {showExtendModal && currentBlock && (
        <ExtendBlockModal
          cycle={currentCycle}
          block={currentBlock}
          onClose={() => setShowExtendModal(false)}
          onConfirm={async (additionalWeeks) => {
            await onExtendBlock(currentCycle.id, currentBlock.id, additionalWeeks);
          }}
        />
      )}

      {/* CHANGE BLOCK ROUTINE MODAL */}
      {showChangeRoutineModal && currentBlock && (
        <ChangeBlockRoutineModal
          cycle={currentCycle}
          block={currentBlock}
          routines={routines}
          onClose={() => setShowChangeRoutineModal(false)}
          onConfirm={async (routineId, routineTitle, note) => {
            await onChangeBlockRoutine(currentCycle.id, currentBlock.id, routineId, routineTitle, note);
          }}
        />
      )}

    </div>
  );
};
