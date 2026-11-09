import React from 'react';
import { 
  X, 
  Repeat, 
  Calendar, 
  CalendarRange, 
  Layers, 
  Trash2, 
  Edit3,
  AlertTriangle 
} from 'lucide-react';
import { ScheduleAppointment } from '../../types';

export type RecurringActionScope = 'single' | 'future' | 'all';

interface RecurringPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: ScheduleAppointment;
  actionType: 'edit' | 'delete';
  onConfirm: (scope: RecurringActionScope) => void;
}

export const RecurringPromptModal: React.FC<RecurringPromptModalProps> = ({
  isOpen,
  onClose,
  appointment,
  actionType,
  onConfirm
}) => {
  if (!isOpen) return null;

  const formattedDate = new Date(appointment.date + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#27272a] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              actionType === 'delete' 
                ? 'bg-[#F3F4F6] border border-[#E5E7EB] text-[#374151]' 
                : 'bg-blue-500/15 border border-blue-500/30 text-blue-400'
            }`}>
              {actionType === 'delete' ? <Trash2 className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold font-display uppercase text-white">
                {actionType === 'delete' ? 'Excluir Atendimento Recorrente' : 'Editar Atendimento Recorrente'}
              </h3>
              <p className="text-xs text-[#4B5563]">
                Este agendamento faz parte de uma rotina semanal
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#F8F9FA] text-[#4B5563] hover:text-white border border-[#E5E7EB]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Appointment Context Info */}
        <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-3.5 space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-sm">{appointment.studentName}</span>
            <span className="text-[#374151] font-mono-nums font-bold">{appointment.time} ({appointment.durationMinutes} min)</span>
          </div>
          <p className="text-[#4B5563] capitalize">{formattedDate}</p>
          <p className="text-[#4B5563] text-[11px]">{appointment.routineTitle || 'Treino Presencial'}</p>
        </div>

        {/* Prompt Question */}
        <p className="text-xs text-[#374151] font-semibold">
          {actionType === 'delete' 
            ? 'Qual escopo você deseja excluir?' 
            : 'Qual escopo você deseja alterar?'}
        </p>

        {/* Option 1: Only this */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => onConfirm('single')}
            className="w-full p-3.5 rounded-2xl bg-[#F8F9FA] hover:bg-[#27272A] border border-[#E5E7EB] hover:border-[#3f3f46] text-left flex items-center gap-3 transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-[#27272A] flex items-center justify-center text-[#4B5563] group-hover:text-white shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-xs">Somente este atendimento</p>
              <p className="text-[11px] text-[#4B5563]">
                {actionType === 'delete' 
                  ? 'Exclui apenas a sessão desta data específica' 
                  : 'Modifica apenas a sessão desta data específica'}
              </p>
            </div>
          </button>

          {/* Option 2: This and future */}
          <button
            type="button"
            onClick={() => onConfirm('future')}
            className="w-full p-3.5 rounded-2xl bg-[#F8F9FA] hover:bg-[#27272A] border border-[#E5E7EB] hover:border-[#3f3f46] text-left flex items-center gap-3 transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-[#27272A] flex items-center justify-center text-[#4B5563] group-hover:text-white shrink-0">
              <CalendarRange className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-xs">Este e os próximos atendimentos</p>
              <p className="text-[11px] text-[#4B5563]">
                {actionType === 'delete' 
                  ? 'Exclui esta sessão e todos os agendamentos futuros desta rotina' 
                  : 'Aplica a mudança a partir desta data em diante'}
              </p>
            </div>
          </button>

          {/* Option 3: All occurrences */}
          <button
            type="button"
            onClick={() => onConfirm('all')}
            className="w-full p-3.5 rounded-2xl bg-[#F8F9FA] hover:bg-[#27272A] border border-[#E5E7EB] hover:border-[#3f3f46] text-left flex items-center gap-3 transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-[#27272A] flex items-center justify-center text-[#4B5563] group-hover:text-white shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-xs">Toda a série (Rotina Completa)</p>
              <p className="text-[11px] text-[#4B5563]">
                {actionType === 'delete' 
                  ? 'Exclui todas as sessões agendadas e encerra a rotina semanal' 
                  : 'Aplica a alteração em todas as sessões da rotina'}
              </p>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-[#F8F9FA] hover:bg-[#27272A] text-[#4B5563] hover:text-white text-xs font-bold transition-colors"
          >
            Cancelar
          </button>
        </div>

      </div>
    </div>
  );
};
