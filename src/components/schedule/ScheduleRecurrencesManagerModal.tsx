import React, { useState } from 'react';
import { 
  X, 
  Repeat, 
  Pause, 
  Play, 
  Trash2, 
  Clock, 
  Calendar, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Dumbbell
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ScheduleRecurrence } from '../../types';
import { WEEKDAYS_ORDERED } from '../../utils/recurrenceEngine';
import { StudentAvatar } from '../common/StudentAvatar';

interface ScheduleRecurrencesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewRecurrence: () => void;
}

export const ScheduleRecurrencesManagerModal: React.FC<ScheduleRecurrencesManagerModalProps> = ({
  isOpen,
  onClose,
  onOpenNewRecurrence
}) => {
  const { 
    scheduleRecurrences, 
    pauseScheduleRecurrence, 
    resumeScheduleRecurrence, 
    endScheduleRecurrence,
    deleteScheduleRecurrence 
  } = useApp();

  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all');

  const filteredRecurrences = scheduleRecurrences.filter(r => {
    if (filter === 'active') return r.status === 'active';
    if (filter === 'paused') return r.status === 'paused';
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-[#27272a] rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#E5E7EB] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#374151]/15 border border-[#374151]/30 flex items-center justify-center text-[#374151]">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-display uppercase text-white tracking-wide">
                Rotinas Semanais Recorrentes
              </h2>
              <p className="text-xs text-[#4B5563]">
                Gerenciamento de horários fixos e grades de atendimento
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#F8F9FA] text-[#4B5563] hover:text-white border border-[#E5E7EB] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar & Quick Add */}
        <div className="p-4 sm:p-5 border-b border-[#E5E7EB] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex bg-[#F8F9FA] p-1 rounded-xl border border-[#E5E7EB] w-full sm:w-auto">
            {[
              { id: 'all', label: `Todas (${scheduleRecurrences.length})` },
              { id: 'active', label: `Ativas (${scheduleRecurrences.filter(r => r.status === 'active').length})` },
              { id: 'paused', label: `Pausadas (${scheduleRecurrences.filter(r => r.status === 'paused').length})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as typeof filter)}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg font-bold transition-all ${
                  filter === tab.id ? 'bg-[#374151] text-white' : 'text-[#4B5563] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              onClose();
              onOpenNewRecurrence();
            }}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white font-bold flex items-center justify-center gap-2 shadow-md shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>NOVA RECORRÊNCIA</span>
          </button>
        </div>

        {/* List of Recurrences */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-3 flex-1 text-xs">
          {filteredRecurrences.length > 0 ? (
            filteredRecurrences.map(rec => {
              const activeWeekdays = WEEKDAYS_ORDERED.filter(w => rec.weekdays.includes(w.day));
              const isPaused = rec.status === 'paused';
              const isEnded = rec.status === 'ended';

              return (
                <div
                  key={rec.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isPaused 
                      ? 'bg-[#F8F9FA]/50 border-[#E5E7EB] opacity-75' 
                      : isEnded 
                        ? 'bg-[#F8F9FA]/30 border-[#E5E7EB] opacity-80' 
                        : 'bg-[#F8F9FA] border-[#E5E7EB] hover:border-[#3f3f46]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    {/* Student and Weekdays */}
                    <div className="flex items-start sm:items-center gap-3">
                      <StudentAvatar name={rec.studentName} photo={rec.studentPhoto} size="md" />
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-sm">{rec.studentName}</h3>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            isPaused
                              ? 'bg-[#eab308]/20 text-[#eab308]'
                              : isEnded
                                ? 'bg-zinc-700/40 text-zinc-600'
                                : 'bg-[#16a34a]/20 text-[#16a34a]'
                          }`}>
                            {isPaused ? 'Pausada' : isEnded ? 'Encerrada' : 'Ativa'}
                          </span>
                        </div>

                        {/* Weekday Badges */}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {activeWeekdays.map(w => {
                            const cfg = rec.weekdayConfigs?.find(c => c.weekday === w.day);
                            const dayTime = (rec.useDifferentTimes && cfg?.time) ? cfg.time : rec.defaultTime;
                            return (
                              <span
                                key={w.day}
                                className="px-2 py-0.5 rounded-lg bg-white border border-[#E5E7EB] text-[10px] font-bold text-[#374151]"
                              >
                                <span className="text-[#374151] mr-1">{w.code}</span>
                                <span className="font-mono-nums">{dayTime}</span>
                              </span>
                            );
                          })}
                        </div>

                        {/* Period & Routine details */}
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-[#4B5563]">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#374151]" />
                            <span>{rec.defaultDurationMinutes} min</span>
                          </span>

                          <span>•</span>

                          <span className="flex items-center gap-1">
                            <Dumbbell className="w-3 h-3 text-[#374151]" />
                            <span className="truncate max-w-[150px]">{rec.defaultRoutineTitle || 'Treino Presencial'}</span>
                          </span>

                          <span>•</span>

                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#374151]" />
                            <span>
                              {rec.periodType === 'indefinite' 
                                ? 'Contínua (sem fim)' 
                                : rec.endDate 
                                  ? `Até ${new Date(rec.endDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}` 
                                  : 'Sem data final'}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {isPaused ? (
                        <button
                          type="button"
                          onClick={() => resumeScheduleRecurrence(rec.id)}
                          className="p-2 rounded-xl bg-[#16a34a]/15 text-[#16a34a] hover:bg-[#16a34a]/25 border border-[#16a34a]/30 font-bold flex items-center gap-1 text-[11px] transition-colors"
                          title="Retomar recorrência"
                        >
                          <Play className="w-3.5 h-3.5 fill-[#16a34a]" />
                          <span>Retomar</span>
                        </button>
                      ) : !isEnded ? (
                        <button
                          type="button"
                          onClick={() => pauseScheduleRecurrence(rec.id)}
                          className="p-2 rounded-xl bg-[#eab308]/15 text-[#eab308] hover:bg-[#eab308]/25 border border-[#eab308]/30 font-bold flex items-center gap-1 text-[11px] transition-colors"
                          title="Pausar recorrência"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pausar</span>
                        </button>
                      ) : null}

                      {!isEnded && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Deseja encerrar a recorrência de ${rec.studentName}? Os treinos futuros serão cancelados.`)) {
                              endScheduleRecurrence(rec.id);
                            }
                          }}
                          className="p-2 rounded-xl bg-[#27272A] text-[#4B5563] hover:text-white text-[11px] font-bold transition-colors"
                        >
                          Encerrar
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Deseja excluir permanentemente a recorrência de ${rec.studentName} e suas sessões não concluídas?`)) {
                            deleteScheduleRecurrence(rec.id, 'all');
                          }
                        }}
                        className="p-2 rounded-xl bg-white text-[#4B5563] hover:text-[#374151] border border-[#E5E7EB] transition-colors"
                        title="Excluir rotina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center bg-[#F8F9FA] rounded-2xl border border-[#E5E7EB]">
              <Repeat className="w-8 h-8 text-[#4B5563] mx-auto mb-2 opacity-80" />
              <p className="font-bold text-white text-xs">Nenhuma rotina recorrente encontrada.</p>
              <p className="text-[11px] text-[#4B5563] mt-1">
                Clique no botão &quot;Nova Recorrência&quot; acima para configurar horários fixos semanais para seus alunos.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#E5E7EB] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] text-[#4B5563] hover:text-white text-xs font-bold transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
