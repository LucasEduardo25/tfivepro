import React from 'react';
import { 
  Play, 
  Clock, 
  Dumbbell, 
  CheckCircle2, 
  Square, 
  ChevronRight
} from 'lucide-react';
import { ActiveWorkoutState } from '../../types';
import { formatTimer, formatTonnesOrKg } from '../../utils/calculations';
import { StudentAvatar } from '../common/StudentAvatar';

interface ActiveWorkoutsSectionProps {
  activeWorkouts: ActiveWorkoutState[];
  onOpenLiveWorkout: (sessionId?: string) => void;
  onFinishWorkout?: (sessionId: string) => void;
}

export const ActiveWorkoutsSection: React.FC<ActiveWorkoutsSectionProps> = ({
  activeWorkouts,
  onOpenLiveWorkout,
  onFinishWorkout
}) => {
  if (activeWorkouts.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            {activeWorkouts.length === 2 
              ? 'Treinos em Andamento (Modo Duplo)' 
              : 'Treino em Andamento'}
          </h2>
        </div>
        <span className="text-xs font-semibold text-[#4B5563]">
          {activeWorkouts.length} / 2 ativos
        </span>
      </div>

      <div className={`grid gap-4 ${activeWorkouts.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {activeWorkouts.map((workout) => {
          const sessionSets = Array.isArray(workout.session?.sets) ? workout.session.sets : [];
          const completedSets = sessionSets.filter(s => s && !s.isWarmup && s.status === 'completed');
          const lastSet = completedSets[completedSets.length - 1];
          const totalExercises = workout.workoutSnapshot?.exercises?.length ||
            workout.routineSnapshot?.workouts?.[0]?.exercises?.length ||
            workout.routineSnapshot?.exercises?.length || 
            new Set(sessionSets.map(s => s.exerciseId)).size || 1;
          const sessionVolume = completedSets.reduce((acc, s) => acc + ((s.weightKg || 0) * (s.actualReps || 0)), 0);

          return (
            <div
              key={workout.sessionId}
              className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Header: Student and Live Timer */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <StudentAvatar 
                        student={{
                          id: workout.studentId,
                          name: workout.studentName,
                          photo: workout.studentPhoto || '',
                          status: 'active',
                          goal: '',
                          email: '',
                          phone: '',
                          gender: 'male',
                          planName: '',
                          priceMonthly: 0,
                          notes: '',
                          startDate: '',
                          createdAt: '',
                          updatedAt: ''
                        }} 
                        size="md" 
                      />
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </span>
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-[#1F2937] tracking-tight truncate">
                        {workout.studentName}
                      </h3>
                      <p className="text-xs text-[#4B5563] truncate">
                        {workout.routineTitle || 'Treino Personalizado'}
                      </p>
                    </div>
                  </div>

                  {/* Stopwatch Badge */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-bold text-sm tracking-wide shrink-0">
                    <Clock className="w-3.5 h-3.5 text-emerald-600 animate-spin" style={{ animationDuration: '4s' }} />
                    <span>{formatTimer(workout.elapsedSeconds)}</span>
                  </div>
                </div>

                {/* Real-time stats grid */}
                <div className="grid grid-cols-3 gap-2 bg-[#F8F9FA] p-3 rounded-xl border border-[#E5E7EB]">
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-[#4B5563] tracking-wider">
                      Exercícios
                    </span>
                    <span className="text-xs font-bold text-[#1F2937]">
                      {totalExercises} plan.
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-[#4B5563] tracking-wider">
                      Séries
                    </span>
                    <span className="text-xs font-bold text-emerald-700">
                      {completedSets.length} concl.
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-[#4B5563] tracking-wider">
                      Volume
                    </span>
                    <span className="text-xs font-bold text-[#1F2937]">
                      {formatTonnesOrKg(sessionVolume)}
                    </span>
                  </div>
                </div>

                {/* Last completed exercise info */}
                {lastSet ? (
                  <div className="text-xs text-[#4B5563] flex items-center gap-2 bg-[#F3F4F6] px-3 py-2 rounded-lg border border-[#E5E7EB]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      Última série: <strong className="text-[#1F2937]">{lastSet.exerciseName}</strong> ({lastSet.weightKg} kg × {lastSet.actualReps})
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-[#4B5563] flex items-center gap-2 bg-[#F3F4F6] px-3 py-2 rounded-lg border border-[#E5E7EB]">
                    <Dumbbell className="w-3.5 h-3.5 shrink-0 text-[#4B5563]" />
                    <span>Aguardando registro da primeira série...</span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-4 mt-2 border-t border-[#E5E7EB]">
                <button
                  onClick={() => onOpenLiveWorkout(workout.sessionId)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Abrir Painel de Execução</span>
                </button>

                {onFinishWorkout && (
                  <button
                    onClick={() => onFinishWorkout(workout.sessionId)}
                    className="py-2.5 px-3 rounded-xl bg-white hover:bg-[#F3F4F6] border border-[#D1D5DB] text-[#4B5563] hover:text-[#1F2937] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                    title="Concluir treino imediatamente"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Finalizar</span>
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
