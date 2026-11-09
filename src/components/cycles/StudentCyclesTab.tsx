import React, { useState } from 'react';
import { 
  Layers, 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Copy, 
  Edit3, 
  Trash2, 
  Play, 
  ArrowRight,
  Dumbbell,
  Sparkles,
  History,
  Info
} from 'lucide-react';
import { 
  TrainingCycle, 
  TrainingBlock, 
  WorkoutRoutine, 
  Student, 
  RoutineWorkout 
} from '../../types';
import { CycleDashboardCard } from './CycleDashboardCard';
import { CycleEditorModal } from './CycleEditorModal';
import { useApp } from '../../context/AppContext';
import { formatDateBr, formatDateShortBr, computeCycleMetrics } from '../../utils/cycleCalculations';

interface StudentCyclesTabProps {
  student: Student;
  routines: WorkoutRoutine[];
  onStartWorkout?: (student: Student, routine?: WorkoutRoutine, workout?: RoutineWorkout | string) => void;
  onViewRoutine?: (routineId: string) => void;
}

export const StudentCyclesTab: React.FC<StudentCyclesTabProps> = ({
  student,
  routines,
  onStartWorkout,
  onViewRoutine
}) => {
  const {
    trainingCycles,
    saveTrainingCycle,
    deleteTrainingCycle,
    duplicateTrainingCycle,
    setCurrentTrainingCycle,
    extendTrainingBlock,
    changeBlockRoutine,
    completeTrainingCycle
  } = useApp();

  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingCycle, setEditingCycle] = useState<TrainingCycle | null>(null);

  // Filter cycles for this student
  const studentCycles = trainingCycles.filter(c => c.studentId === student.id);
  
  // Current active cycle
  const currentCycle = studentCycles.find(c => c.status === 'current') || 
                       studentCycles.find(c => c.status === 'planned') || null;

  // Other cycles (completed / planned / archived)
  const otherCycles = studentCycles.filter(c => c.id !== currentCycle?.id);

  const handleOpenCreateModal = () => {
    setEditingCycle(null);
    setIsEditorOpen(true);
  };

  const handleOpenEditModal = (cycle: TrainingCycle) => {
    setEditingCycle(cycle);
    setIsEditorOpen(true);
  };

  const handleSaveCycle = async (cycleToSave: TrainingCycle) => {
    await saveTrainingCycle(cycleToSave);
  };

  const handleDeleteCycle = async (cycleId: string) => {
    if (window.confirm('Deseja realmente excluir este ciclo de treinamento?')) {
      await deleteTrainingCycle(cycleId);
    }
  };

  const handleDuplicate = async (cycle: TrainingCycle) => {
    await duplicateTrainingCycle(cycle);
  };

  return (
    <div className="space-y-6 animate-fadeIn select-none">
      
      {/* 1. CURRENT ACTIVE CYCLE DASHBOARD CARD */}
      <CycleDashboardCard
        student={student}
        currentCycle={currentCycle}
        routines={routines}
        onStartWorkout={onStartWorkout}
        onViewRoutine={onViewRoutine}
        onOpenNewCycleModal={handleOpenCreateModal}
        onEditCycle={handleOpenEditModal}
        onCompleteCycle={completeTrainingCycle}
        onExtendBlock={extendTrainingBlock}
        onChangeBlockRoutine={changeBlockRoutine}
        onDuplicateCycle={handleDuplicate}
      />

      {/* 2. BLOCKS BREAKDOWN FOR CURRENT CYCLE */}
      {currentCycle && currentCycle.blocks.length > 0 && (
        <div className="bg-[#121212] border border-[#27272A] rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-bold font-display text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#374151]" />
                <span>Estrutura de Blocos do Ciclo</span>
              </h3>
              <p className="text-xs text-[#4B5563] mt-0.5">
                Detalhamento dos períodos, objetivos e rotinas associadas
              </p>
            </div>

            <button
              onClick={() => handleOpenEditModal(currentCycle)}
              className="px-3 py-1.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-white text-xs font-bold font-display uppercase tracking-wider transition-all flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#374151]" />
              <span>Editar Blocos</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {currentCycle.blocks.map((block, idx) => {
              const routine = routines.find(r => r.id === block.routineId);
              const metrics = computeCycleMetrics(currentCycle);
              const isCurrent = metrics.currentBlock?.id === block.id;

              return (
                <div 
                  key={block.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                    isCurrent 
                      ? 'bg-[#18181B] border-[#374151] shadow-lg shadow-xs' 
                      : 'bg-[#18181B]/60 border-[#27272A]'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        isCurrent 
                          ? 'bg-[#374151] text-white' 
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {isCurrent ? 'Bloco Atual' : `Bloco ${idx + 1}`}
                      </span>

                      <span className="text-xs font-bold text-white">
                        {block.durationWeeks} semanas
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white">
                      {block.name}
                    </h4>

                    <p className="text-[11px] text-zinc-400">
                      {formatDateBr(block.startDate)} a {formatDateBr(block.endDate)}
                    </p>
                  </div>

                  {/* Associated routine badge */}
                  <div className="pt-2 border-t border-[#27272A]">
                    <div className="flex items-center gap-2 text-xs">
                      <Dumbbell className="w-3.5 h-3.5 text-[#374151] shrink-0" />
                      <span className="truncate text-white font-medium">
                        {routine?.title || block.routineTitleSnapshot || 'Sem rotina vinculada'}
                      </span>
                    </div>

                    {/* Routine change history badge if present */}
                    {block.routineHistory && block.routineHistory.length > 0 && (
                      <div className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1">
                        <History className="w-3 h-3 text-amber-400" />
                        <span>Rotina atualizada em {formatDateBr(block.routineHistory[block.routineHistory.length - 1].date)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. HISTÓRICO DE CICLOS ANTERIORES OU PLANEJADOS */}
      <div className="bg-[#121212] border border-[#27272A] rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold font-display text-white flex items-center gap-2">
              <History className="w-4 h-4 text-[#374151]" />
              <span>Histórico de Ciclos ({studentCycles.length})</span>
            </h3>
            <p className="text-xs text-[#4B5563] mt-0.5">
              Registro completo de todas as fases e planejamentos de {student.name}
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="px-3.5 py-2 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Novo Ciclo</span>
          </button>
        </div>

        {studentCycles.length > 0 ? (
          <div className="space-y-3">
            {studentCycles.map(cycle => {
              const isCurrent = cycle.id === currentCycle?.id;

              return (
                <div 
                  key={cycle.id}
                  className="p-4 rounded-2xl bg-[#18181B] border border-[#27272A] hover:border-zinc-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        cycle.status === 'current'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : cycle.status === 'planned'
                          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}>
                        {cycle.status === 'current' ? 'Atual' : cycle.status === 'planned' ? 'Planejado' : 'Concluído'}
                      </span>

                      {cycle.objective && (
                        <span className="text-[10px] text-[#374151] font-bold uppercase">
                          {cycle.objective}
                        </span>
                      )}

                      <span className="text-[11px] text-zinc-400">
                        {formatDateBr(cycle.startDate)} • {cycle.totalWeeks} semanas • {cycle.blocks?.length || 0} blocos
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white truncate">
                      {cycle.name}
                    </h4>

                    {cycle.notes && (
                      <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
                        {cycle.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                    {cycle.status !== 'current' && (
                      <button
                        onClick={() => setCurrentTrainingCycle(cycle.id, student.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-[#121212] hover:bg-[#27272A] border border-[#27272A] text-emerald-400 text-xs font-bold transition-all"
                        title="Tornar este ciclo o ativo"
                      >
                        Ativar
                      </button>
                    )}

                    <button
                      onClick={() => handleDuplicate(cycle)}
                      className="p-2 rounded-xl bg-[#121212] hover:bg-[#27272A] border border-[#27272A] text-zinc-400 hover:text-white transition-all"
                      title="Duplicar ciclo como base para novo planejamento"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(cycle)}
                      className="p-2 rounded-xl bg-[#121212] hover:bg-[#27272A] border border-[#27272A] text-zinc-400 hover:text-white transition-all"
                      title="Editar ciclo"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteCycle(cycle.id)}
                      className="p-2 rounded-xl bg-[#121212] hover:bg-rose-500/10 border border-[#27272A] hover:border-rose-500/30 text-zinc-400 hover:text-rose-400 transition-all"
                      title="Excluir ciclo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-[#18181B] border border-[#27272A] text-center space-y-2">
            <Layers className="w-8 h-8 text-zinc-500 mx-auto" />
            <p className="text-sm font-bold text-white">Nenhum ciclo cadastrado ainda</p>
            <p className="text-xs text-[#4B5563]">
              Crie o primeiro ciclo para planejar semanas, blocos e rotinas associadas.
            </p>
          </div>
        )}
      </div>

      {/* CREATE / EDIT CYCLE MODAL */}
      {isEditorOpen && (
        <CycleEditorModal
          student={student}
          routines={routines}
          existingCycle={editingCycle}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingCycle(null);
          }}
          onSave={handleSaveCycle}
        />
      )}

    </div>
  );
};
