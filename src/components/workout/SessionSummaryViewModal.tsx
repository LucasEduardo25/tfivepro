import React from 'react';
import { 
  X, 
  Dumbbell, 
  Clock, 
  Trophy, 
  Layers, 
  Calendar, 
  CheckCircle2, 
  Share2 
} from 'lucide-react';
import { WorkoutSession } from '../../types';
import { 
  formatWorkoutDuration, 
  formatTonnesOrKg, 
  calculateWorkoutDensity, 
  formatTimer,
  formatSetMetric
} from '../../utils/calculations';
import { useApp } from '../../context/AppContext';

interface SessionSummaryViewModalProps {
  session: WorkoutSession;
  onClose: () => void;
  onOpenStory?: () => void;
}

export const SessionSummaryViewModal: React.FC<SessionSummaryViewModalProps> = ({
  session,
  onClose,
  onOpenStory
}) => {
  const { students, exercises } = useApp();
  const student = students.find(s => s.id === session.studentId);
  const safeSets = Array.isArray(session.sets) ? session.sets : [];
  const density = calculateWorkoutDensity(session.totalVolume || 0, session.durationSeconds || 0, true);
  const completedSets = safeSets.filter(s => s && !s.isWarmup && s.status === 'completed');
  const sessionDate = new Date(session.startTime || Date.now());

  // Group sets by exercise
  const exerciseMap = new Map<string, { name: string; muscleGroup: string; sets: typeof session.sets }>();
  for (const set of safeSets) {
    if (!set) continue;
    const existing = exerciseMap.get(set.exerciseId) || {
      name: set.exerciseName || 'Exercício',
      muscleGroup: set.muscleGroup || 'Geral',
      sets: []
    };
    existing.sets.push(set);
    exerciseMap.set(set.exerciseId, existing);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-[#27272a] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-[#27272a] flex items-center justify-between bg-[#F8F9FA]">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#374151] tracking-wider block">
              Resumo do Treino Concluído
            </span>
            <h2 className="text-xl font-black text-[#1F2937] tracking-tight">
              {session.studentName}
            </h2>
            <p className="text-xs text-[#4B5563]">
              {session.routineTitle} • {sessionDate.toLocaleDateString('pt-BR')} às {sessionDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#27272a]/60 hover:bg-[#27272a] text-[#4B5563] hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#050505] p-3 rounded-xl border border-[#27272a]">
              <span className="block text-[10px] uppercase font-bold text-[#4B5563] mb-1">Duração</span>
              <span className="text-base font-black text-white">{formatWorkoutDuration(session.durationSeconds)}</span>
            </div>
            <div className="bg-[#050505] p-3 rounded-xl border border-[#27272a]">
              <span className="block text-[10px] uppercase font-bold text-[#4B5563] mb-1">Volume Total</span>
              <span className="text-base font-black text-white">{formatTonnesOrKg(session.totalVolume)}</span>
            </div>
            <div className="bg-[#050505] p-3 rounded-xl border border-[#27272a]">
              <span className="block text-[10px] uppercase font-bold text-[#4B5563] mb-1">Séries Válidas</span>
              <span className="text-base font-black text-white">{completedSets.length}</span>
            </div>
            <div className="bg-[#050505] p-3 rounded-xl border border-[#27272a]">
              <span className="block text-[10px] uppercase font-bold text-[#4B5563] mb-1">Densidade</span>
              <span className="text-base font-black text-[#374151]">{density} <span className="text-[10px] text-[#4B5563]">kg/min</span></span>
            </div>
          </div>

          {/* PRs achieved if any */}
          {session.prsAchieved && session.prsAchieved.length > 0 && (
            <div className="bg-[#F3F4F6] border border-[#374151]/30 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#374151]">
                <Trophy className="w-4 h-4" />
                <span>Recordes Pessoais Superados ({session.prsAchieved.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {session.prsAchieved.map((pr, idx) => (
                  <div key={idx} className="bg-[#050505] p-2.5 rounded-lg border border-[#27272a] text-xs">
                    <p className="font-bold text-white truncate">{pr.exerciseName}</p>
                    <p className="font-mono text-[#374151] font-bold mt-0.5">{pr.metricLabel}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exercises and Sets */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#4B5563]">
              Exercícios Realizados ({exerciseMap.size})
            </h3>

            <div className="space-y-2.5">
              {Array.from(exerciseMap.entries()).map(([exerciseId, data], idx) => (
                <div key={exerciseId} className="bg-[#050505] border border-[#27272a] rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-[#F8F9FA] flex items-center justify-center text-[10px] font-bold text-[#4B5563]">
                        {idx + 1}
                      </span>
                      <h4 className="text-xs font-bold text-white">{data.name}</h4>
                    </div>
                    <span className="text-[10px] font-bold text-[#4B5563]">{data.muscleGroup}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                    {data.sets.map((set, sIdx) => (
                      <div
                        key={set.id || sIdx}
                        className="bg-white border border-[#27272a] px-2 py-1.5 rounded-lg text-[11px] flex items-center justify-between"
                      >
                        <span className="text-[#4B5563]">Série {set.setNumber}</span>
                        <span className="font-mono font-bold text-white">{formatSetMetric(set)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Coach Notes if any */}
          {session.coachNotes && (
            <div className="bg-[#050505] border border-[#27272a] rounded-xl p-3 text-xs space-y-1">
              <span className="font-bold text-[#4B5563] uppercase tracking-wider text-[10px] block">
                Notas do Treinador:
              </span>
              <p className="text-white">{session.coachNotes}</p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#27272a] flex items-center justify-between bg-[#F8F9FA]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#27272a] text-xs font-bold text-[#4B5563] hover:text-white"
          >
            Fechar
          </button>

          {onOpenStory && (
            <button
              onClick={() => {
                onClose();
                onOpenStory();
              }}
              className="px-4 py-2 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-xs font-bold text-white transition-all shadow-md flex items-center gap-2"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Criar Story PNG</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
