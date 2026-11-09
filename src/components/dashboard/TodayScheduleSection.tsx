import React from 'react';
import { Calendar, Clock, Play, ChevronRight, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { ScheduleAppointment, Student } from '../../types';
import { StudentAvatar } from '../common/StudentAvatar';

interface TodayScheduleSectionProps {
  appointments: ScheduleAppointment[];
  students: Student[];
  onStartWorkout: (student: Student) => void;
  onViewStudent: (student: Student) => void;
  onOpenSchedule: () => void;
}

export const TodayScheduleSection: React.FC<TodayScheduleSectionProps> = ({
  appointments,
  students,
  onStartWorkout,
  onViewStudent,
  onOpenSchedule
}) => {
  if (appointments.length === 0) return null;

  const studentsMap = new Map<string, Student>(students.map(s => [s.id, s]));

  const getStatusBadge = (status: ScheduleAppointment['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#18181B] border border-[#27272a] text-[#4B5563] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-white" />
            <span>Concluído</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#18181B] border border-[#27272a] text-[#71717A] flex items-center gap-1">
            <XCircle className="w-3 h-3 text-[#71717A]" />
            <span>Cancelado</span>
          </span>
        );
      case 'missed':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F3F4F6] border border-[#E5E7EB] text-[#374151] flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-[#374151]" />
            <span>Ausente</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F3F4F6] border border-[#E5E7EB] text-white flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#374151]" />
            <span>Agendado</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#374151]">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-xs font-black uppercase tracking-wider text-white">
            Agenda de Hoje ({appointments.length})
          </h2>
        </div>

        <button
          onClick={onOpenSchedule}
          className="text-[11px] font-bold text-[#374151] hover:underline flex items-center gap-1"
        >
          <span>Ver Completa</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Appointment items */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {appointments.map(app => {
          const student = studentsMap.get(app.studentId);
          const isPending = app.status === 'scheduled';

          return (
            <div
              key={app.id}
              className="p-3 rounded-xl bg-[#050505] border border-[#27272a] flex items-center justify-between gap-3 hover:border-[#3f3f46] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Time */}
                <div className="w-12 text-center shrink-0">
                  <span className="font-mono font-black text-xs text-white block">{app.time}</span>
                  <span className="text-[9px] text-[#71717A] block">{app.durationMinutes || 60}m</span>
                </div>

                {/* Avatar & Student Name */}
                {student ? (
                  <div 
                    onClick={() => onViewStudent(student)}
                    className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
                  >
                    <StudentAvatar student={student} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white group-hover:text-[#1F2937] transition-colors truncate">
                        {student.name}
                      </p>
                      <p className="text-[10px] text-[#71717A] truncate">
                        {app.routineTitle || student.goal || 'Treino'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{app.studentName}</p>
                    <p className="text-[10px] text-[#71717A] truncate">{app.routineTitle || 'Treino'}</p>
                  </div>
                )}
              </div>

              {/* Status & Fast Start Action */}
              <div className="flex items-center gap-2 shrink-0">
                {getStatusBadge(app.status)}

                {isPending && student && (
                  <button
                    onClick={() => onStartWorkout(student)}
                    className="p-1.5 rounded-lg bg-[#374151] hover:bg-[#1F2937] text-white transition-colors"
                    title="Iniciar Treino Agora"
                  >
                    <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
