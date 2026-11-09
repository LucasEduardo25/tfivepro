import React from 'react';
import { Calendar, Clock, Play, User, Plus, CalendarPlus, ChevronRight } from 'lucide-react';
import { ScheduleAppointment, Student } from '../../types';
import { StudentAvatar } from '../common/StudentAvatar';

interface NextAppointmentSectionProps {
  appointment: ScheduleAppointment | null;
  student: Student | null;
  onStartWorkout: (student: Student) => void;
  onViewStudent: (student: Student) => void;
  onOpenSchedule: () => void;
  onStartAdHocWorkout: () => void;
}

export const NextAppointmentSection: React.FC<NextAppointmentSectionProps> = ({
  appointment,
  student,
  onStartWorkout,
  onViewStudent,
  onOpenSchedule,
  onStartAdHocWorkout
}) => {
  return (
    <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
      
      {/* Section Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#374151]">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-xs font-black uppercase tracking-wider text-white">
            Próximo Atendimento
          </h2>
        </div>

        <button
          onClick={onOpenSchedule}
          className="text-[11px] font-bold text-[#4B5563] hover:text-white flex items-center gap-1 transition-colors"
        >
          <span>Agenda</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {appointment && student ? (
        <div className="space-y-4">
          
          {/* Main Appointment Card */}
          <div className="flex items-start justify-between gap-3 bg-[#050505] p-3.5 rounded-xl border border-[#27272a]">
            <div className="flex items-center gap-3 min-w-0">
              <StudentAvatar student={student} size="md" />
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white truncate">{student.name}</h3>
                <p className="text-xs text-[#71717A] truncate">
                  {appointment.routineTitle || student.goal || 'Treino Personalizado'}
                </p>
              </div>
            </div>

            {/* Time badge */}
            <div className="px-3 py-1.5 rounded-xl bg-[#18181B] border border-[#27272a] text-center shrink-0">
              <span className="block font-mono font-black text-sm text-white">{appointment.time}</span>
              <span className="block text-[9px] uppercase font-bold text-[#374151] tracking-wider">
                {appointment.date === new Date().toISOString().split('T')[0] ? 'Hoje' : appointment.date.split('-').slice(1).reverse().join('/')}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onStartWorkout(student)}
              className="py-2.5 px-3 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-bold transition-all shadow-[0_4px_15px_rgba(217,4,41,0.25)] flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Iniciar Treino</span>
            </button>

            <button
              onClick={() => onViewStudent(student)}
              className="py-2.5 px-3 rounded-xl bg-[#050505] hover:bg-[#18181B] border border-[#27272a] text-xs font-bold text-[#4B5563] hover:text-white transition-colors flex items-center justify-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              <span>Ver Aluno</span>
            </button>
          </div>

        </div>
      ) : (
        /* Empty schedule state */
        <div className="text-center py-4 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#050505] border border-[#27272a] mx-auto flex items-center justify-center text-[#71717A]">
            <Clock className="w-5 h-5 opacity-90" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Nenhum atendimento agendado</p>
            <p className="text-[11px] text-[#71717A]">Sua agenda está livre no momento</p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              onClick={onStartAdHocWorkout}
              className="py-2 px-3 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Play className="w-3 h-3 fill-white" />
              <span>Iniciar Treino Avulso</span>
            </button>
            <button
              onClick={onOpenSchedule}
              className="py-2 px-3 rounded-xl bg-[#050505] hover:bg-[#18181B] border border-[#27272a] text-[#4B5563] hover:text-white text-xs font-bold transition-colors"
            >
              Ver Agenda
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
