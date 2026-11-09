import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Check, Timer, ChevronLeft, ChevronRight, 
  Dumbbell, Activity, Calendar, Trophy
} from 'lucide-react';
import { ActiveWorkoutState, WorkoutSession, WorkoutSetRecord } from '../../types';
import { formatTimer } from '../../utils/calculations';
import { generateId } from '../../utils/idGenerator';

interface StudentLiveWorkoutViewProps {
  workoutState: ActiveWorkoutState;
  onRecordSet: (set: WorkoutSetRecord) => Promise<void>;
  onUpdateSet: (setId: string, updated: Partial<WorkoutSetRecord>) => Promise<void>;
  onStartRest: (seconds: number) => void;
  onStopRest: () => void;
  onAddRestTime: (seconds: number) => void;
  onUpdateState: (updates: Partial<ActiveWorkoutState>) => void;
  onFinish: () => Promise<WorkoutSession | null>;
  onCancel: () => Promise<void>;
  onExit: () => void;
}

export const StudentLiveWorkoutView: React.FC<StudentLiveWorkoutViewProps> = ({
  workoutState,
  onRecordSet,
  onUpdateSet,
  onStartRest,
  onStopRest,
  onAddRestTime,
  onUpdateState,
  onFinish,
  onCancel,
  onExit
}) => {
  const { 
    session, 
    currentExerciseIndex, 
    elapsedSeconds, 
    isRestActive, 
    restTimerSeconds, 
    activeRestTotal 
  } = workoutState;
  
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  // Derivar exercícios do snapshot
  const exercises = useMemo(() => {
    if (session.workoutSnapshot) return session.workoutSnapshot.exercises || [];
    if (session.routineSnapshot) {
      const allExercises = [];
      session.routineSnapshot.workouts.forEach(w => {
        if (w.exercises) allExercises.push(...w.exercises);
      });
      return allExercises;
    }
    return [];
  }, [session.workoutSnapshot, session.routineSnapshot]);

  const currentExercise = exercises[currentExerciseIndex];
  
  // Sets gravados para o exercício atual
  const recordedSets = useMemo(() => {
    if (!currentExercise) return [];
    return session.sets.filter(s => s.exerciseId === currentExercise.exerciseId);
  }, [session.sets, currentExercise]);

  const [inputLoad, setInputLoad] = useState<string>('');
  const [inputReps, setInputReps] = useState<string>('');

  // Sincronizar input com as sugestões
  useEffect(() => {
    if (currentExercise) {
      setInputLoad(currentExercise.lastSuggestedLoad?.toString() || (currentExercise as any).targetLoadKg?.toString() || '');
      // Simplificação do targetReps: se for string tipo "8-10", pegue 10. Se for min/max, pegue max
      let defaultReps = '';
      if (currentExercise.targetRepsMax) {
        defaultReps = currentExercise.targetRepsMax.toString();
      } else if (currentExercise.targetRepsMin) {
        defaultReps = currentExercise.targetRepsMin.toString();
      } else if ((currentExercise as any).targetReps) {
        const tr = (currentExercise as any).targetReps;
        if (typeof tr === 'string' && tr.includes('-')) {
          defaultReps = tr.split('-')[1].trim();
        } else {
          defaultReps = tr.toString();
        }
      }
      setInputReps(defaultReps);
    }
  }, [currentExerciseIndex, currentExercise]);

  const handleRecordSet = async () => {
    if (!currentExercise) return;
    
    const setRecord: WorkoutSetRecord = {
      id: generateId('set'),
      sessionId: session.id,
      studentId: session.studentId,
      routineId: session.routineId,
      workoutId: session.workoutId,
      exerciseId: currentExercise.exerciseId,
      exerciseName: currentExercise.exerciseName || (currentExercise as any).name,
      exerciseIndex: currentExerciseIndex,
      muscleGroup: currentExercise.muscleGroup || 'outro',
      setNumber: recordedSets.length + 1,
      targetReps: parseInt(inputReps) || 0,
      actualReps: parseInt(inputReps) || 0,
      weightKg: parseFloat(inputLoad) || 0,
      
      status: 'completed',
      completedAt: new Date().toISOString(),
    };

    await onRecordSet(setRecord);
    
    // Auto-start rest timer
    const restSeconds = currentExercise.restSeconds || 60;
    onStartRest(restSeconds);
  };

  const handlePrevExercise = () => {
    if (currentExerciseIndex > 0) {
      onUpdateState({ currentExerciseIndex: currentExerciseIndex - 1 });
    }
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      onUpdateState({ currentExerciseIndex: currentExerciseIndex + 1 });
    }
  };

  if (!currentExercise) {
    return (
      <div className="fixed inset-0 bg-[#050505] z-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white mb-4">Nenhum exercício encontrado.</p>
          <button onClick={onExit} className="px-4 py-2 bg-[#D90429] text-white font-bold rounded-lg uppercase">Voltar</button>
        </div>
      </div>
    );
  }

  const exName = currentExercise.exerciseName || (currentExercise as any).name || 'Exercício';
  const setsCount = currentExercise.targetSets || (currentExercise as any).sets?.length || 3;
  
  const targetRepsStr = currentExercise.targetRepsMin 
    ? (currentExercise.targetRepsMax && currentExercise.targetRepsMax !== currentExercise.targetRepsMin 
        ? `${currentExercise.targetRepsMin}-${currentExercise.targetRepsMax}` 
        : `${currentExercise.targetRepsMin}`)
    : ((currentExercise as any).targetReps || '10-12');

  const methodStr = (currentExercise as any).method || (currentExercise.groupType ? currentExercise.groupType.replace('_', ' ') : 'Tradicional');
  const restStr = currentExercise.restSeconds ? `${currentExercise.restSeconds}s` : '60s';

  const progressPct = exercises.length > 0 ? ((currentExerciseIndex + 1) / exercises.length) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-[#050505] z-50 flex flex-col sm:max-w-md sm:mx-auto">
      {/* Header */}
      <div className="bg-[#0a0a0a] border-b border-[#27272A] p-4 flex items-center justify-between shadow-lg z-10 sticky top-0">
        <div>
          <h2 className="text-[#D90429] font-black text-sm uppercase tracking-widest">{session.workoutName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Timer className="w-4 h-4 text-[#A1A1AA]" />
            <span className="text-white font-mono font-bold text-lg">{formatTimer(elapsedSeconds)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowConfirmFinish(true)} className="px-4 py-2 bg-[#D90429] text-white text-xs font-black rounded-xl uppercase tracking-wider">
            Finalizar
          </button>
          <button onClick={() => setShowConfirmCancel(true)} className="p-2 bg-[#18181B] text-zinc-400 border border-[#27272A] rounded-xl hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-[#18181B]">
        <div className="h-full bg-[#D90429] transition-all duration-300" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        
        {/* Navigation & Exercise Title */}
        <div className="flex items-center justify-between">
          <button 
            onClick={handlePrevExercise} 
            disabled={currentExerciseIndex === 0}
            className="p-3 bg-[#18181B] border border-[#27272A] rounded-xl disabled:opacity-30 text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center flex-1 px-2">
            <span className="text-[#A1A1AA] text-[10px] font-bold uppercase tracking-widest block mb-1">
              Exercício {currentExerciseIndex + 1} de {exercises.length}
            </span>
            <h1 className="text-xl font-black text-white leading-tight">{exName}</h1>
            {methodStr !== 'Tradicional' && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#D90429]/15 text-[#D90429] uppercase border border-[#D90429]/30">
                {methodStr}
              </span>
            )}
          </div>
          <button 
            onClick={handleNextExercise}
            disabled={currentExerciseIndex === exercises.length - 1}
            className="p-3 bg-[#18181B] border border-[#27272A] rounded-xl disabled:opacity-30 text-white"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Prescription Info */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-3 text-center">
            <span className="text-[#A1A1AA] text-[10px] uppercase font-bold block mb-1">Séries</span>
            <span className="text-lg font-black text-white">{setsCount}</span>
          </div>
          <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-3 text-center">
            <span className="text-[#A1A1AA] text-[10px] uppercase font-bold block mb-1">Reps</span>
            <span className="text-lg font-black text-white">{targetRepsStr}</span>
          </div>
          <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-3 text-center">
            <span className="text-[#A1A1AA] text-[10px] uppercase font-bold block mb-1">Descanso</span>
            <span className="text-lg font-black text-white">{restStr}</span>
          </div>
        </div>

        {(currentExercise.notes || (currentExercise as any).coachNotes) && (
          <div className="bg-[#18181B] border-l-2 border-[#D90429] p-3 rounded-r-xl">
            <p className="text-xs text-zinc-300 leading-relaxed">
              <strong className="text-white block mb-1">Atenção:</strong>
              {currentExercise.notes || (currentExercise as any).coachNotes}
            </p>
          </div>
        )}

        {/* Rest Timer Overlay */}
        {isRestActive && (
          <div className="bg-[#121212] border border-[#D90429]/50 rounded-2xl p-5 text-center shadow-lg shadow-[#D90429]/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-[#D90429]/5 animate-pulse" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider relative z-10">Descanso Ativo</h3>
            <div className="text-5xl font-mono font-black text-[#D90429] my-4 relative z-10">
              {formatTimer(restTimerSeconds)}
            </div>
            <div className="flex gap-2 relative z-10">
              <button 
                onClick={onStopRest}
                className="flex-1 py-3 bg-[#18181B] border border-[#27272A] text-white font-bold rounded-xl text-xs uppercase"
              >
                Pular
              </button>
              <button 
                onClick={() => onAddRestTime(30)}
                className="flex-1 py-3 bg-[#27272A] text-white font-bold rounded-xl text-xs uppercase"
              >
                + 30s
              </button>
            </div>
          </div>
        )}

        {/* Execution Recording */}
        {!isRestActive && (
          <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#D90429]" />
              Série {recordedSets.length + 1} de {setsCount}
            </h3>
            
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-[10px] text-[#A1A1AA] uppercase font-bold mb-1 ml-1">Carga (kg)</label>
                <input 
                  type="number"
                  value={inputLoad}
                  onChange={(e) => setInputLoad(e.target.value)}
                  className="w-full bg-[#050505] border border-[#27272A] rounded-xl px-4 py-3 text-white font-bold text-lg text-center focus:outline-none focus:border-[#D90429]"
                  placeholder="0"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] text-[#A1A1AA] uppercase font-bold mb-1 ml-1">Repetições</label>
                <input 
                  type="number"
                  value={inputReps}
                  onChange={(e) => setInputReps(e.target.value)}
                  className="w-full bg-[#050505] border border-[#27272A] rounded-xl px-4 py-3 text-white font-bold text-lg text-center focus:outline-none focus:border-[#D90429]"
                  placeholder="0"
                />
              </div>
            </div>

            <button 
              onClick={handleRecordSet}
              className="w-full py-4 bg-[#D90429] hover:bg-[#A60321] text-white font-black text-sm uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Concluir Série
            </button>
          </div>
        )}

        {/* History of Sets for current exercise */}
        {recordedSets.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2">Séries Realizadas</h4>
            <div className="space-y-2">
              {recordedSets.map((set, idx) => (
                <div key={set.id} className="flex items-center justify-between p-3 bg-[#18181B] rounded-xl border border-[#27272A]">
                  <span className="text-white font-black text-sm">Série {idx + 1}</span>
                  <div className="text-right">
                    <span className="text-white font-bold">{set.actualReps} reps</span>
                    <span className="text-zinc-500 mx-2">|</span>
                    <span className="text-white font-bold">{set.weightKg} kg</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Confirmação de Finalização */}
      {showConfirmFinish && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#27272A] rounded-3xl w-full max-w-sm p-6 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-wider">Finalizar Treino?</h3>
              <p className="text-sm text-[#A1A1AA] mt-2">
                Duração total: {formatTimer(elapsedSeconds)}<br/>
                Séries concluídas: {session.sets.length}
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirmFinish(false)}
                className="flex-1 py-3 bg-[#18181B] text-white font-bold uppercase text-xs rounded-xl border border-[#27272A]"
              >
                Voltar
              </button>
              <button 
                onClick={async () => {
                  await onFinish();
                  onExit();
                }}
                className="flex-1 py-3 bg-green-600 text-white font-black uppercase text-xs rounded-xl"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmação de Cancelamento */}
      {showConfirmCancel && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#27272A] rounded-3xl w-full max-w-sm p-6 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#D90429]/20 text-[#D90429] flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-wider">Cancelar Treino?</h3>
              <p className="text-sm text-[#A1A1AA] mt-2 leading-relaxed">
                Todos os dados desta sessão serão descartados. Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirmCancel(false)}
                className="flex-1 py-3 bg-[#18181B] text-white font-bold uppercase text-xs rounded-xl border border-[#27272A]"
              >
                Continuar Treino
              </button>
              <button 
                onClick={async () => {
                  await onCancel();
                  onExit();
                }}
                className="flex-1 py-3 bg-[#D90429] text-white font-black uppercase text-xs rounded-xl"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
