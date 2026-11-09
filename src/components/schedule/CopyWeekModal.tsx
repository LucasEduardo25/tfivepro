import React, { useState, useMemo } from 'react';
import { 
  X, 
  Copy, 
  Calendar, 
  ArrowRight, 
  CheckCircle, 
  AlertTriangle,
  Info 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  getMondayOfWeek, 
  getWeekDates, 
  parseISODate, 
  formatDateToISO, 
  addDaysToDate 
} from '../../utils/recurrenceEngine';

interface CopyWeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDateStr: string;
}

export const CopyWeekModal: React.FC<CopyWeekModalProps> = ({
  isOpen,
  onClose,
  currentDateStr
}) => {
  const { schedule, copyWeekSchedule } = useApp();

  const sourceMonday = useMemo(() => {
    return getMondayOfWeek(currentDateStr || formatDateToISO(new Date()));
  }, [currentDateStr]);

  const defaultTargetMonday = useMemo(() => {
    const src = parseISODate(sourceMonday);
    const target = addDaysToDate(src, 7);
    return formatDateToISO(target);
  }, [sourceMonday]);

  const [selectedTargetMonday, setSelectedTargetMonday] = useState<string>(defaultTargetMonday);
  const [isCopying, setIsCopying] = useState<boolean>(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  // Source week appointments
  const sourceWeekAppointments = useMemo(() => {
    const weekDates = getWeekDates(sourceMonday);
    return schedule.filter(a => weekDates.includes(a.date) && a.status !== 'cancelled')
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [schedule, sourceMonday]);

  const formattedSourceRange = useMemo(() => {
    const start = parseISODate(sourceMonday);
    const end = addDaysToDate(start, 6);
    return `${start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a ${end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
  }, [sourceMonday]);

  const formattedTargetRange = useMemo(() => {
    const start = parseISODate(selectedTargetMonday);
    const end = addDaysToDate(start, 6);
    return `${start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a ${end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
  }, [selectedTargetMonday]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (sourceWeekAppointments.length === 0) return;
    setIsCopying(true);
    try {
      const { createdCount, skippedCount } = await copyWeekSchedule(sourceMonday, selectedTargetMonday);
      setResultMessage(`${createdCount} atendimento(s) copiado(s) com sucesso.${skippedCount > 0 ? ` (${skippedCount} já existiam e foram mantidos)` : ''}`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Error copying week schedule:', err);
      alert('Erro ao copiar atendimentos da semana.');
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#E5E7EB] rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-5 max-h-[calc(100dvh-2rem)] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#374151]/15 border border-[#374151]/30 flex items-center justify-center text-[#374151]">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-display uppercase text-[#1F2937]">Copiar Semana de Treinos</h3>
              <p className="text-xs text-[#4B5563]">Replique a grade de atendimentos para outra semana</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#F8F9FA] text-[#4B5563] hover:text-[#1F2937] border border-[#E5E7EB]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source -> Target Comparison */}
        <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 flex items-center justify-between gap-3 text-xs">
          <div className="flex-1 text-center">
            <span className="block text-[10px] text-[#4B5563] uppercase font-bold">Semana de Origem</span>
            <span className="font-bold text-[#1F2937] mt-0.5 block">{formattedSourceRange}</span>
            <span className="text-[11px] text-[#374151] font-bold">{sourceWeekAppointments.length} sessões</span>
          </div>

          <ArrowRight className="w-5 h-5 text-[#4B5563] shrink-0" />

          <div className="flex-1 text-center">
            <span className="block text-[10px] text-[#4B5563] uppercase font-bold">Semana de Destino</span>
            <input
              type="date"
              value={selectedTargetMonday}
              onChange={e => setSelectedTargetMonday(getMondayOfWeek(e.target.value))}
              className="mt-0.5 bg-white border border-[#E5E7EB] rounded-lg px-2 py-1 text-[#1F2937] text-xs font-bold text-center focus:outline-none focus:border-[#374151] w-full"
            />
            <span className="text-[10px] text-[#4B5563] block mt-0.5">{formattedTargetRange}</span>
          </div>
        </div>

        {/* List of Sessions to be Copied */}
        <div>
          <label className="block text-[#1F2937] font-bold mb-2 text-xs">Sessões a serem duplicadas</label>
          
          {sourceWeekAppointments.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#E5E7EB] text-center text-xs text-[#4B5563]">
              Nenhum atendimento encontrado na semana de origem.
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {sourceWeekAppointments.map(appt => {
                const dateObj = parseISODate(appt.date);
                const dayLabel = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase();
                return (
                  <div key={appt.id} className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#E5E7EB] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#374151] w-10">{dayLabel}</span>
                      <span className="font-bold text-[#1F2937]">{appt.studentName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#4B5563]">
                      <span className="font-mono-nums font-bold">{appt.time}</span>
                      <span>•</span>
                      <span className="truncate max-w-[120px]">{appt.routineTitle || 'Treino'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Status result */}
        {resultMessage && (
          <div className="p-3 rounded-xl bg-[#16a34a]/15 border border-[#16a34a]/40 text-[#16a34a] text-xs font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{resultMessage}</span>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-[#F8F9FA] hover:bg-[#E5E7EB] text-[#4B5563] hover:text-[#1F2937] text-xs font-bold transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleCopy}
            disabled={isCopying || sourceWeekAppointments.length === 0}
            className="px-5 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] disabled:opacity-80 text-white font-bold font-display text-xs tracking-wider transition-all shadow-md flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            <span>{isCopying ? 'COPIANDO...' : 'COPIAR SESSÕES'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
