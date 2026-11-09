import React from 'react';
import { 
  Calendar, 
  Clock, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  RotateCcw,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { ScheduleAppointment, Student, ActiveWorkoutState } from '../../types';
import { StudentAvatar } from '../common/StudentAvatar';

interface TodayScheduleListProps {
  appointments: ScheduleAppointment[];
  students: Student[];
  activeWorkouts: ActiveWorkoutState[];
  selectedAppointmentId: string | null;
  nextAppointmentId: string | null;
  onSelectAppointment: (appointment: ScheduleAppointment) => void;
  onQuickStartWorkout: (student: Student) => void;
  onResumeWorkout: (student: Student) => void;
}

export const TodayScheduleList: React.FC<TodayScheduleListProps> = ({
  appointments,
  students,
  activeWorkouts,
  selectedAppointmentId,
  nextAppointmentId,
  onSelectAppointment,
  onQuickStartWorkout,
  onResumeWorkout
}) => {
  const studentsMap = new Map<string, Student>(students.map(s => [s.id, s]));
  const activeStudentIds = new Set(activeWorkouts.map(w => w.studentId));

  const renderStatusBadge = (
    appt: ScheduleAppointment,
    isNext: boolean,
    isActiveTraining: boolean
  ) => {
    if (isActiveTraining) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#374151] text-white flex items-center gap-1 shadow-[0_0_10px_rgba(217,4,41,0.4)] animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          <span>Em Atendimento</span>
        </span>
      );
    }

    if (appt.status === 'completed') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#18181B] border border-[#27272a] text-[#4B5563] flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>Concluído</span>
        </span>
      );
    }

    if (appt.status === 'cancelled') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#18181B] border border-[#27272a] text-[#71717A] flex items-center gap-1">
          <XCircle className="w-3 h-3 text-[#71717A]" />
          <span>Cancelado</span>
        </span>
      );
    }

    if (appt.status === 'missed') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F3F4F6] border border-[#E5E7EB] text-[#374151] flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-[#374151]" />
          <span>Ausente</span>
        </span>
      );
    }

    if (isNext) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#F3F4F6] border border-[#374151] text-[#374151] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#374151]" />
          <span>Próximo</span>
        </span>
      );
    }

    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#18181B] border border-[#27272a] text-[#4B5563]">
        Agendado
      </span>
    );
  };

  return (
    <div className="space-y-2">
      {appointments.map(appt => {
        const student = studentsMap.get(appt.studentId);
        const isSelected = appt.id === selectedAppointmentId;
        const isNext = appt.id === nextAppointmentId;
        const isActiveTraining = activeStudentIds.has(appt.studentId);
        const isCompleted = appt.status === 'completed';

        return (
          <div
            key={appt.id}
            onClick={() => onSelectAppointment(appt)}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 min-h-[56px] ${
              isSelected
                ? 'bg-[#18181B] border-[#374151] shadow-md ring-1 ring-[#374151]/50'
                : 'bg-[#050505] border-[#27272a] hover:border-[#3f3f46]'
            }`}
          >
            {/* Time & Duration */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 text-center shrink-0">
                <span className="font-mono font-black text-sm text-white block">
                  {appt.time}
                </span>
                <span className="text-[10px] text-[#71717A] block font-mono">
                  {appt.durationMinutes || 60}m
                </span>
              </div>

              {/* Avatar and Student Info */}
              {student ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  <StudentAvatar student={student} size="sm" />
                  <div className="min-w-0">
                    <p className={`text-xs font-bold truncate ${
                      isSelected ? 'text-white' : 'text-zinc-200'
                    }`}>
                      {student.name}
                    </p>
                    <p className="text-[10px] text-[#71717A] truncate">
                      {appt.routineTitle || student.goal || 'Treino'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{appt.studentName}</p>
                  <p className="text-[10px] text-[#71717A] truncate">{appt.routineTitle || 'Treino'}</p>
                </div>
              )}
            </div>

            {/* Status & Quick Action Button */}
            <div className="flex items-center gap-2 shrink-0">
              {renderStatusBadge(appt, isNext, isActiveTraining)}

              {isActiveTraining && student && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResumeWorkout(student);
                  }}
                  className="p-2 rounded-lg bg-[#374151] hover:bg-[#1F2937] text-white transition-colors"
                  title="Retomar Treino Ativo"
                >
                  <RotateCcw className="w-3.5 h-3.5 fill-white" />
                </button>
              )}

              {!isActiveTraining && !isCompleted && student && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectAppointment(appt);
                  }}
                  className="p-1.5 rounded-lg bg-[#18181B] hover:bg-[#27272a] text-[#4B5563] hover:text-white transition-colors"
                  title="Preparar Atendimento"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
