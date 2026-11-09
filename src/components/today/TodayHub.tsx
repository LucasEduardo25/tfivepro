import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Play, 
  RotateCcw, 
  UserPlus, 
  CalendarDays, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Sparkles,
  ChevronRight,
  Flame,
  Dumbbell,
  Layers,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ScheduleAppointment, Student, WorkoutRoutine, RoutineWorkout } from '../../types';
import { 
  getTodayAppointments, 
  getNextAppointment, 
  resolveWorkoutForAppointment 
} from '../../services/todayHubService';
import { TodayScheduleList } from './TodayScheduleList';
import { SessionPreparationView } from './SessionPreparationView';
import { StudentAvatar } from '../common/StudentAvatar';

interface TodayHubProps {
  onStartWorkout: (student: Student, routine?: WorkoutRoutine, workout?: RoutineWorkout) => void;
  onOpenLiveWorkout: () => void;
  onSelectStudent: (student: Student) => void;
  onOpenSchedule: () => void;
}

export const TodayHub: React.FC<TodayHubProps> = ({
  onStartWorkout,
  onOpenLiveWorkout,
  onSelectStudent,
  onOpenSchedule
}) => {
  const {
    students,
    routines,
    sessions,
    schedule,
    activeWorkouts,
    trainingCycles,
    activePlans,
    trainingMemories,
    assessments,
    saveTrainingMemory,
    resolveTrainingMemory
  } = useApp();

  // 1. Get today's appointments in chronological order
  const todaySummary = useMemo(() => {
    return getTodayAppointments(schedule, activeWorkouts);
  }, [schedule, activeWorkouts]);
  const todayAppointments = todaySummary.appointments;

  // 2. Determine next active/upcoming appointment
  const nextAppt = useMemo(() => {
    return getNextAppointment(todayAppointments, activeWorkouts);
  }, [todayAppointments, activeWorkouts]);

  // 3. Current selected appointment for Preparation View
  const [selectedApptId, setSelectedApptId] = useState<string | null>(() => {
    return nextAppt ? nextAppt.id : (todayAppointments[0]?.id || null);
  });

  // Keep selectedAppt valid if list changes
  const selectedAppointment = useMemo(() => {
    if (!todayAppointments || todayAppointments.length === 0) return null;
    return todayAppointments.find(a => a.id === selectedApptId) || nextAppt || todayAppointments[0];
  }, [todayAppointments, selectedApptId, nextAppt]);

  // Resolve student for preparation
  const selectedStudent = useMemo(() => {
    if (!selectedAppointment) return null;
    return students.find(s => s.id === selectedAppointment.studentId) || null;
  }, [selectedAppointment, students]);

  // Operational metrics
  const totalToday = todaySummary.total;
  const completedCount = todaySummary.completed;
  const remainingCount = todaySummary.remaining;
  const inServiceCount = activeWorkouts.length;

  // Formatted date string (e.g., "Terça-feira, 08 de setembro")
  const formattedToday = useMemo(() => {
    return new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long'
    });
  }, []);

  // State for "Iniciar Treino Sem Agendamento" modal
  const [isUnscheduledModalOpen, setIsUnscheduledModalOpen] = useState(false);
  const [unscheduledStudentId, setUnscheduledStudentId] = useState<string>('');
  const [unscheduledWorkoutId, setUnscheduledWorkoutId] = useState<string>('');

  const unscheduledStudent = students.find(s => s.id === unscheduledStudentId);
  const unscheduledRoutines = useMemo(() => {
    if (!unscheduledStudent) return [];
    return routines.filter(r => r.studentId === unscheduledStudent.id && !r.isArchived);
  }, [unscheduledStudent, routines]);

  const activeRoutine = unscheduledRoutines.find(r => r.status === 'active') || unscheduledRoutines[0];

  const handleStartUnscheduled = () => {
    if (!unscheduledStudent) return;
    const routine = activeRoutine;
    let workout: RoutineWorkout | undefined = undefined;
    if (routine && routine.workouts) {
      workout = routine.workouts.find(w => w.id === unscheduledWorkoutId) || routine.workouts[0];
    }
    onStartWorkout(unscheduledStudent, routine, workout);
    setIsUnscheduledModalOpen(false);
    setUnscheduledStudentId('');
    setUnscheduledWorkoutId('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* MASTER OPERATIONAL HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#121212] border border-[#27272a] rounded-2xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="text-xl font-black uppercase tracking-wider text-white">
              Central Hoje
            </h1>
            <span className="text-xs text-[#A1A1AA] uppercase tracking-wider font-bold">
              • Operacional
            </span>
          </div>
          <p className="text-xs text-[#A1A1AA] capitalize">
            {formattedToday}
          </p>
        </div>

        {/* Operational Counters (Strictly useful for the next session) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="px-3 py-2 rounded-xl bg-[#050505] border border-[#27272a] text-center min-w-[70px]">
            <span className="text-[10px] uppercase font-bold text-[#A1A1AA] block">Total</span>
            <span className="text-sm font-black font-mono text-white">{totalToday}</span>
          </div>

          <div className="px-3 py-2 rounded-xl bg-[#050505] border border-[#27272a] text-center min-w-[70px]">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block">Concluídos</span>
            <span className="text-sm font-black font-mono text-emerald-400">{completedCount}</span>
          </div>

          <div className="px-3 py-2 rounded-xl bg-[#050505] border border-[#27272a] text-center min-w-[70px]">
            <span className="text-[10px] uppercase font-bold text-[#A1A1AA] block">Restantes</span>
            <span className="text-sm font-black font-mono text-white">{remainingCount}</span>
          </div>

          {inServiceCount > 0 && (
            <div className="px-3 py-2 rounded-xl bg-[#18181B] border border-emerald-500/40 text-center min-w-[70px]">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">Ativos</span>
              <span className="text-sm font-black font-mono text-white">{inServiceCount}/2</span>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex items-center gap-2 pl-2">
            <button
              type="button"
              onClick={() => setIsUnscheduledModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-[#18181B] hover:bg-[#27272a] border border-[#27272a] text-xs font-bold text-white flex items-center gap-1.5 transition-colors min-h-[44px]"
            >
              <UserPlus className="w-4 h-4 text-zinc-300" />
              <span className="hidden sm:inline">Sem Agendamento</span>
            </button>

            <button
              type="button"
              onClick={onOpenSchedule}
              className="px-3.5 py-2.5 rounded-xl bg-[#050505] hover:bg-[#18181B] border border-[#27272a] text-xs font-bold text-[#A1A1AA] hover:text-white flex items-center gap-1.5 transition-colors min-h-[44px]"
              title="Ver Agenda Completa"
            >
              <CalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline">Agenda</span>
            </button>
          </div>
        </div>
      </div>

      {/* ACTIVE WORKOUTS QUICK BAR (If active sessions exist) */}
      {activeWorkouts.length > 0 && (
        <div className="p-4 rounded-xl bg-[#121212] border border-emerald-500/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                Sessão em Andamento ({activeWorkouts.length}/2)
              </span>
              <p className="text-xs font-bold text-white truncate">
                {activeWorkouts.map(w => w.studentName).join(' • ')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenLiveWorkout}
            className="px-4 py-2 rounded-xl bg-[#1F2937] hover:bg-[#111827] text-xs font-bold text-white flex items-center gap-2 transition-colors min-h-[44px] shrink-0"
          >
            <RotateCcw className="w-4 h-4 fill-white" />
            <span>Acessar Treino ao Vivo</span>
          </button>
        </div>
      )}

      {/* EMPTY STATE IF NO APPOINTMENTS FOR TODAY */}
      {todayAppointments.length === 0 ? (
        <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-10 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-[#18181B] border border-[#27272a] flex items-center justify-center text-[#A1A1AA] mx-auto">
            <Calendar className="w-6 h-6 text-zinc-300" />
          </div>
          <div>
            <h2 className="text-base font-black uppercase tracking-wider text-white">
              Nenhum atendimento agendado para hoje
            </h2>
            <p className="text-xs text-[#A1A1AA] max-w-md mx-auto mt-1">
              Sua agenda está livre para hoje. Você pode agendar novos horários ou iniciar um treino avulso agora mesmo.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsUnscheduledModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-[#1F2937] hover:bg-[#111827] text-white text-xs font-bold flex items-center gap-2 min-h-[44px] transition-colors"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Iniciar Treino Sem Agendamento</span>
            </button>

            <button
              type="button"
              onClick={onOpenSchedule}
              className="px-5 py-2.5 rounded-xl bg-[#18181B] border border-[#27272a] text-[#A1A1AA] hover:text-white text-xs font-bold flex items-center gap-2 min-h-[44px] transition-colors"
            >
              <CalendarDays className="w-4 h-4" />
              <span>Abrir Agenda</span>
            </button>
          </div>
        </div>
      ) : (
        /* TABLET LANDSCAPE & DESKTOP SPLIT LAYOUT (Mobile stacks vertically) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: AGENDA DO DIA (col-span-12 lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  Agenda do Dia ({todayAppointments.length})
                </h3>
              </div>
              <span className="text-[10px] text-[#A1A1AA] uppercase font-bold">
                Cronológico
              </span>
            </div>

            <TodayScheduleList
              appointments={todayAppointments}
              students={students}
              activeWorkouts={activeWorkouts}
              selectedAppointmentId={selectedAppointment?.id || null}
              nextAppointmentId={nextAppt?.id || null}
              onSelectAppointment={(appt) => setSelectedApptId(appt.id)}
              onQuickStartWorkout={(st) => {
                const appt = todayAppointments.find(a => a.studentId === st.id);
                if (appt) setSelectedApptId(appt.id);
              }}
              onResumeWorkout={() => onOpenLiveWorkout()}
            />
          </div>

          {/* RIGHT COLUMN: PREPARAÇÃO DO ATENDIMENTO (col-span-12 lg:col-span-8) */}
          <div className="lg:col-span-8 space-y-4">
            {selectedStudent ? (
              <SessionPreparationView
                appointment={selectedAppointment}
                student={selectedStudent}
                routines={routines}
                sessions={sessions}
                cycles={trainingCycles}
                activeWorkouts={activeWorkouts}
                activePlans={activePlans}
                trainingMemories={trainingMemories}
                assessments={assessments}
                personalRecords={[]}
                onStartWorkout={onStartWorkout}
                onResumeWorkout={() => onOpenLiveWorkout()}
                onViewStudentProfile={onSelectStudent}
                onSaveTrainingMemory={saveTrainingMemory}
                onResolveTrainingMemory={resolveTrainingMemory}
              />
            ) : (
              <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-8 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-[#71717A] mx-auto" />
                <p className="text-sm font-bold text-white">
                  Nenhum aluno selecionado para preparação.
                </p>
                <p className="text-xs text-[#71717A]">
                  Toque em um dos horários da agenda ao lado para preparar o atendimento.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: INICIAR TREINO SEM AGENDAMENTO */}
      {isUnscheduledModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#27272a] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl space-y-4">
            <div className="p-5 border-b border-[#27272a] flex items-center justify-between">
              <h3 className="text-base font-black uppercase tracking-wider text-white">
                Iniciar Treino Sem Agendamento
              </h3>
              <button
                onClick={() => setIsUnscheduledModalOpen(false)}
                className="p-2 rounded-xl bg-[#18181B] hover:bg-[#27272a] text-[#A1A1AA] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Select Student */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#A1A1AA] mb-1.5">
                  Selecione o Aluno
                </label>
                <select
                  value={unscheduledStudentId}
                  onChange={(e) => {
                    setUnscheduledStudentId(e.target.value);
                    setUnscheduledWorkoutId('');
                  }}
                  className="w-full bg-[#18181B] border border-[#27272a] rounded-lg px-3 py-2.5 text-xs text-white focus:border-zinc-500 focus:outline-none"
                >
                  <option value="" className="bg-[#18181B] text-white">Escolha um aluno...</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id} className="bg-[#18181B] text-white">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Workout if student has workouts */}
              {unscheduledStudent && activeRoutine && activeRoutine.workouts && (
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#A1A1AA] mb-1.5">
                    Treino a Executar
                  </label>
                  <select
                    value={unscheduledWorkoutId}
                    onChange={(e) => setUnscheduledWorkoutId(e.target.value)}
                    className="w-full bg-[#18181B] border border-[#27272a] rounded-lg px-3 py-2.5 text-xs text-white focus:border-zinc-500 focus:outline-none"
                  >
                    <option value="" className="bg-[#18181B] text-white">Escolha o treino...</option>
                    {activeRoutine.workouts.map(w => (
                      <option key={w.id} value={w.id} className="bg-[#18181B] text-white">
                        Treino {w.letter} {w.name ? `— ${w.name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#27272a] bg-[#050505] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsUnscheduledModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#18181B] text-xs font-bold text-[#A1A1AA] hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleStartUnscheduled}
                disabled={!unscheduledStudent}
                className="px-5 py-2 rounded-xl bg-[#1F2937] hover:bg-[#111827] disabled:opacity-50 text-xs font-bold text-white flex items-center gap-1.5 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Iniciar Sessão</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
