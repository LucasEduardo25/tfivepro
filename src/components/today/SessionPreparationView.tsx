import React, { useState, useMemo } from 'react';
import { 
  Play, 
  RotateCcw, 
  User, 
  Calendar, 
  Clock, 
  Dumbbell, 
  History, 
  Trophy, 
  AlertCircle, 
  CheckCircle2, 
  Layers, 
  FileText,
  Bell,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { 
  ScheduleAppointment, 
  Student, 
  WorkoutRoutine, 
  RoutineWorkout, 
  WorkoutSession, 
  TrainingCycle, 
  ActiveWorkoutState,
  TrainingMemory,
  ActivePlan,
  PhysicalAssessment,
  PersonalRecord
} from '../../types';
import { StudentAvatar } from '../common/StudentAvatar';
import { 
  resolveWorkoutForAppointment, 
  getLastComparableSession, 
  getExercisesComparisonForWorkout,
  getCurrentStudentCycleSummary,
  getStudentPlanSummary,
  getStudentAssessmentAlert,
  getStudentRecentPRs
} from '../../services/todayHubService';
import { ExerciseComparisonCard } from './ExerciseComparisonCard';
import { TrainingMemorySection } from './TrainingMemorySection';
import { SelectWorkoutModal } from './SelectWorkoutModal';

interface SessionPreparationViewProps {
  appointment?: ScheduleAppointment | null;
  student: Student;
  routines: WorkoutRoutine[];
  sessions: WorkoutSession[];
  cycles: TrainingCycle[];
  activeWorkouts: ActiveWorkoutState[];
  activePlans: ActivePlan[];
  trainingMemories: TrainingMemory[];
  assessments: PhysicalAssessment[];
  personalRecords: PersonalRecord[];
  onStartWorkout: (student: Student, routine?: WorkoutRoutine, workout?: RoutineWorkout) => void;
  onResumeWorkout: (student: Student) => void;
  onViewStudentProfile: (student: Student) => void;
  onSaveTrainingMemory: (memory: TrainingMemory) => Promise<void>;
  onResolveTrainingMemory: (id: string) => Promise<void>;
}

export const SessionPreparationView: React.FC<SessionPreparationViewProps> = ({
  appointment,
  student,
  routines,
  sessions,
  cycles,
  activeWorkouts,
  activePlans,
  trainingMemories,
  assessments,
  personalRecords,
  onStartWorkout,
  onResumeWorkout,
  onViewStudentProfile,
  onSaveTrainingMemory,
  onResolveTrainingMemory
}) => {
  const [isSelectWorkoutModalOpen, setIsSelectWorkoutModalOpen] = useState(false);
  const [manuallySelectedWorkout, setManuallySelectedWorkout] = useState<{
    routine: WorkoutRoutine;
    workout: RoutineWorkout;
  } | null>(null);

  // Check if student is currently in active workout
  const isCurrentActive = activeWorkouts.some(w => w.studentId === student.id);
  const isCapacityFull = activeWorkouts.length >= 2 && !isCurrentActive;

  // 1. Resolve workout for appointment
  const resolvedInfo = useMemo(() => {
    if (manuallySelectedWorkout) {
      const { routine, workout } = manuallySelectedWorkout;
      const title = workout.letter 
        ? `Treino ${workout.letter}${workout.name ? ` — ${workout.name}` : ''}`
        : workout.name || 'Treino Definido';
      return {
        routine,
        workout,
        workoutTitle: title,
        workoutLetter: workout.letter,
        isDefined: true
      };
    }
    return resolveWorkoutForAppointment(appointment, student, routines, cycles);
  }, [appointment, student, routines, cycles, manuallySelectedWorkout]);

  // 2. Active Cycle & Block
  const cycleSummary = useMemo(() => {
    return getCurrentStudentCycleSummary(student.id, cycles);
  }, [student.id, cycles]);

  // 3. Plan summary (strictly no financial values)
  const planInfo = useMemo(() => {
    return getStudentPlanSummary(student.id, activePlans);
  }, [student.id, activePlans]);

  // 4. Last comparable session of same workout
  const lastComparableSession = useMemo(() => {
    return getLastComparableSession(
      student.id,
      resolvedInfo.routine?.id,
      resolvedInfo.workout?.id,
      resolvedInfo.workoutLetter,
      sessions
    );
  }, [student.id, resolvedInfo.routine?.id, resolvedInfo.workout?.id, resolvedInfo.workoutLetter, sessions]);

  // 5. Exercises comparison (prescription vs last real performance by studentId + exerciseId)
  const exerciseComparisons = useMemo(() => {
    return getExercisesComparisonForWorkout(student.id, resolvedInfo.workout, sessions);
  }, [student.id, resolvedInfo.workout, sessions]);

  // 6. Active training memories for this student
  const studentActiveMemories = useMemo(() => {
    return trainingMemories.filter(m => m.studentId === student.id && m.status === 'ACTIVE');
  }, [trainingMemories, student.id]);

  // 7. Assessment alert
  const assessmentAlert = useMemo(() => {
    return getStudentAssessmentAlert(student.id, assessments, appointment ? [appointment] : [], cycleSummary?.reviewDateFormatted);
  }, [student.id, assessments, appointment, cycleSummary?.reviewDateFormatted]);

  // 8. Recent PRs
  const recentPRs = useMemo(() => {
    const exerciseIds = resolvedInfo.workout?.exercises?.map(ex => ex.exerciseId || (ex as any).id || '').filter(Boolean) || [];
    return getStudentRecentPRs(student.id, personalRecords, exerciseIds);
  }, [student.id, personalRecords, resolvedInfo.workout]);

  const handleStart = () => {
    if (isCurrentActive) {
      onResumeWorkout(student);
      return;
    }

    if (!resolvedInfo.isDefined || !resolvedInfo.workout) {
      setIsSelectWorkoutModalOpen(true);
      return;
    }

    // STRICT: Pass exact student, routine, workout
    onStartWorkout(student, resolvedInfo.routine, resolvedInfo.workout);
  };

  const isCompleted = appointment?.status === 'completed';

  return (
    <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-5 shadow-xl space-y-6">
      
      {/* 1. TOP HEADER: Student Profile & Operational Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#27272a]">
        <div className="flex items-center gap-3.5 min-w-0">
          <StudentAvatar student={student} size="lg" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-white truncate">
                {student.name}
              </h2>
              {/* Plan Badge (Discreet, no financial numbers) */}
              {planInfo.exists && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  planInfo.status === 'SUSPENDED'
                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                    : 'bg-[#18181B] border border-[#27272a] text-[#4B5563]'
                }`}>
                  {planInfo.badgeText}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-[#71717A] mt-0.5 flex-wrap">
              {appointment && (
                <span className="flex items-center gap-1 font-mono font-bold text-white">
                  <Clock className="w-3.5 h-3.5 text-[#374151]" />
                  <span>{appointment.time} ({appointment.durationMinutes || 60}m)</span>
                </span>
              )}
              <span>•</span>
              <span className="text-[#4B5563]">{student.goal || 'Treino Personalizado'}</span>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onViewStudentProfile(student)}
            className="px-3.5 py-2.5 rounded-xl bg-[#050505] hover:bg-[#18181B] border border-[#27272a] text-xs font-bold text-[#4B5563] hover:text-white transition-colors flex items-center gap-1.5 min-h-[44px]"
            title="Ver ficha completa do aluno"
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Ver Aluno</span>
          </button>

          {isCurrentActive ? (
            <button
              type="button"
              onClick={() => onResumeWorkout(student)}
              className="px-5 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 min-h-[44px]"
            >
              <RotateCcw className="w-4 h-4 fill-white" />
              <span>Retomar Treino</span>
            </button>
          ) : isCompleted ? (
            <div className="px-4 py-2.5 rounded-xl bg-[#18181B] border border-[#27272a] text-xs font-bold text-white flex items-center gap-2 min-h-[44px]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Atendimento Concluído</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStart}
              disabled={isCapacityFull}
              className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold transition-all flex items-center gap-2 min-h-[44px] ${
                resolvedInfo.isDefined
                  ? 'bg-[#374151] hover:bg-[#1F2937] shadow-md'
                  : 'bg-amber-600 hover:bg-amber-700'
              } disabled:opacity-80`}
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{resolvedInfo.isDefined ? 'Iniciar Treino' : 'Selecionar Treino'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. PLANNED WORKOUT BANNER */}
      <div className="p-4 rounded-xl bg-[#050505] border border-[#27272a] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#71717A]">
            Treino Previsto para Hoje
          </span>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#374151] font-black font-mono text-sm">
              {resolvedInfo.workoutLetter || '?'}
            </div>
            <h3 className={`text-base font-black ${resolvedInfo.isDefined ? 'text-white' : 'text-amber-400'}`}>
              {resolvedInfo.workoutTitle}
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsSelectWorkoutModalOpen(true)}
          className="px-3 py-2 rounded-lg bg-[#18181B] hover:bg-[#27272a] border border-[#27272a] text-xs font-bold text-[#4B5563] hover:text-white transition-colors flex items-center gap-1.5 self-start sm:self-auto min-h-[40px]"
        >
          <Layers className="w-3.5 h-3.5 text-[#374151]" />
          <span>{resolvedInfo.isDefined ? 'Alterar Treino' : 'Selecionar Treino'}</span>
        </button>
      </div>

      {/* 3. CURRENT CYCLE & BLOCK (Real data only) */}
      {cycleSummary && (
        <div className="p-4 rounded-xl bg-[#050505] border border-[#27272a] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#374151]">
              Ciclo Atual
            </span>
            {cycleSummary.reviewDateFormatted && (
              <span className="text-[10px] font-mono text-[#71717A]">
                Próxima revisão: <strong className="text-white">{cycleSummary.reviewDateFormatted}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="text-sm font-bold text-white">
                {cycleSummary.cycleName} {cycleSummary.objective ? `• ${cycleSummary.objective}` : ''}
              </h4>
              <p className="text-xs text-[#4B5563]">
                {cycleSummary.blockName} (Bloco {cycleSummary.blockOrder})
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-[#18181B] border border-[#27272a] text-xs font-mono font-bold text-white">
                Semana do bloco: {cycleSummary.blockWeek}/{cycleSummary.totalBlockWeeks}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-[#18181B] border border-[#27272a] text-xs font-mono font-bold text-[#4B5563]">
                Semana do ciclo: {cycleSummary.cycleWeek}/{cycleSummary.totalCycleWeeks}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. LAST EXECUTION OF THE SAME WORKOUT */}
      {lastComparableSession ? (
        <div className="p-4 rounded-xl bg-[#050505] border border-[#27272a] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-[#374151]" />
              <span>Último {lastComparableSession.workoutLabel}</span>
            </span>
            <span className="text-xs font-mono font-bold text-white">
              {lastComparableSession.dateFormatted}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-[#4B5563] flex-wrap">
            <span>⏱ {lastComparableSession.durationMinutes} min</span>
            <span>🏋️ {lastComparableSession.totalExercises} exercícios</span>
            <span>📊 {lastComparableSession.totalSets} séries</span>
            {lastComparableSession.volumeFormatted && (
              <span className="text-white font-bold">📦 {lastComparableSession.volumeFormatted}</span>
            )}
          </div>

          {lastComparableSession.coachNotes && (
            <div className="pt-2 border-t border-[#18181B]">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#71717A] block mb-0.5">
                Última Observação do Treino
              </span>
              <p className="text-xs text-white italic">
                "{lastComparableSession.coachNotes}"
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-[#050505] border border-[#27272a]/60 text-xs text-[#71717A] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#52525B] shrink-0" />
          <span>Primeira execução registrada deste treino para este aluno.</span>
        </div>
      )}

      {/* 5. ASSESSMENT ALERT (If applicable) */}
      {assessmentAlert.hasAlert && (
        <div className="p-3.5 rounded-xl bg-[#18181B] border border-[#27272a] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#374151]" />
            <div>
              <p className="text-xs font-bold text-white">{assessmentAlert.text}</p>
              {assessmentAlert.subtext && (
                <p className="text-[10px] text-[#4B5563]">{assessmentAlert.subtext}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. LEMBRETES OPERACIONAIS (TrainingMemory) */}
      <TrainingMemorySection
        student={student}
        activeMemories={studentActiveMemories}
        exercisesForContext={resolvedInfo.workout?.exercises}
        onSaveMemory={onSaveTrainingMemory}
        onResolveMemory={onResolveTrainingMemory}
      />

      {/* 7. EXERCISE COMPARISON LIST (Core Operational Feature) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#374151]">
              <Dumbbell className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              Exercícios Previstos vs. Última Carga Real ({exerciseComparisons.length})
            </h3>
          </div>

          <span className="text-[10px] text-[#71717A]">
            Prescrição vs. Execução
          </span>
        </div>

        {exerciseComparisons.length > 0 ? (
          <div className="space-y-3">
            {exerciseComparisons.map(item => (
              <ExerciseComparisonCard key={item.exerciseId} item={item} />
            ))}
          </div>
        ) : (
          <div className="p-6 text-center space-y-2 bg-[#050505] rounded-xl border border-[#27272a]">
            <p className="text-xs font-bold text-white">
              Nenhum exercício carregado para esta sessão.
            </p>
            <p className="text-[11px] text-[#71717A]">
              Selecione ou vincule um treino com exercícios para visualizar a comparação.
            </p>
          </div>
        )}
      </div>

      {/* 8. RECENT PRs (Max 3, real data only) */}
      {recentPRs.length > 0 && (
        <div className="p-4 rounded-xl bg-[#050505] border border-[#27272a] space-y-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-black uppercase tracking-wider text-white">
              Recordes Pessoais Recentes ({recentPRs.length})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            {recentPRs.map((pr, index) => (
              <div
                key={pr.exerciseId ? `${pr.exerciseId}-${index}` : index}
                className="p-2.5 rounded-lg bg-[#121212] border border-[#27272a] space-y-1"
              >
                <p className="text-xs font-bold text-white truncate">{pr.exerciseName}</p>
                <p className="text-xs font-mono font-black text-amber-400">
                  {pr.weightKg} kg × {pr.reps} reps
                </p>
                <p className="text-[9px] text-[#71717A]">
                  {pr.date || '-'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 9. CHECK-IN SLOT (Slot ready for student mode, no fake values) */}
      <div className="p-3.5 rounded-xl bg-[#050505] border border-[#27272a]/40 flex items-center justify-between text-[#71717A] text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#52525B]">
            Check-in do Aluno:
          </span>
          <span className="text-xs text-[#71717A] italic">Sem check-in registrado para hoje</span>
        </div>
        <span className="text-[10px] text-[#52525B]">Modo Aluno</span>
      </div>

      {/* Modal for selecting a workout when undefined */}
      {isSelectWorkoutModalOpen && (
        <SelectWorkoutModal
          student={student}
          appointment={appointment}
          routines={routines}
          onSelectWorkout={(routine, workout) => {
            setManuallySelectedWorkout({ routine, workout });
          }}
          onClose={() => setIsSelectWorkoutModalOpen(false)}
        />
      )}
    </div>
  );
};
