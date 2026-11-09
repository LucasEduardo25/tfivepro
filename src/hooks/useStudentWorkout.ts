import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ActiveWorkoutState, 
  WorkoutSession, 
  Student, 
  WorkoutRoutine, 
  RoutineWorkout,
  WorkoutSetRecord
} from '../types';
import { DATA_BACKEND } from '../utils/constants';
import { generateId } from '../utils/idGenerator';
import { normalizeWorkoutRoutine } from '../db/indexedDB';
import { getSessionRepository, getRoutineRepository, getTrainingCycleRepository } from '../repositories/repositoryConfig';
import { 
  fetchLiveWorkoutsFromSupabase, 
  persistLiveWorkoutStateToSupabase, 
  removeLiveWorkoutStateFromSupabase 
} from '../services/liveWorkoutSupabaseService';
import { computeCycleMetrics } from '../utils/cycleCalculations';

export function useStudentWorkout(studentId: string) {
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing active workout on mount
  useEffect(() => {
    async function load() {
      if (!studentId) return;
      try {
        setIsLoading(true);
        if (DATA_BACKEND === 'supabase') {
          const liveWorkouts = await fetchLiveWorkoutsFromSupabase();
          const studentWorkout = liveWorkouts.find(w => w.studentId === studentId);
          if (studentWorkout) {
            setActiveWorkout(studentWorkout);
          }
        }
      } catch (err) {
        console.error('Failed to load active workout', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [studentId]);

  // Master Timer Loop
  useEffect(() => {
    if (!activeWorkout) return;
    
    const interval = setInterval(() => {
      setActiveWorkout(prev => {
        if (!prev) return null;
        
        const now = Date.now();
        let updated = { ...prev };
        let hasChanges = false;
        
        // Update elapsed time
        if (!prev.isPaused) {
          const expectedElapsed = Math.floor((now - prev.startedAtTimestamp - prev.totalPausedMs) / 1000);
          if (expectedElapsed !== prev.elapsedSeconds && expectedElapsed >= 0) {
            updated.elapsedSeconds = expectedElapsed;
            hasChanges = true;
          }
        }
        
        // Update rest timer
        if (prev.isRestActive && prev.restTargetTimestamp) {
          const remaining = Math.max(0, Math.ceil((prev.restTargetTimestamp - now) / 1000));
          if (remaining !== prev.restTimerSeconds) {
            updated.restTimerSeconds = remaining;
            hasChanges = true;
            
            if (remaining === 0) {
              updated.isRestActive = false;
              updated.restTargetTimestamp = null;
            }
          }
        }
        
        return hasChanges ? updated : prev;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [activeWorkout?.sessionId]); // Depend only on session existence, not entire object

  // Sync to backend debounced
  const syncTimer = useRef<any>(null);
  const syncToSupabase = useCallback((state: ActiveWorkoutState) => {
    if (DATA_BACKEND !== 'supabase') return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      persistLiveWorkoutStateToSupabase(state).catch(err => 
        console.error('Failed to sync student live workout to Supabase', err)
      );
    }, 2000); // 2s debounce
  }, []);

  const startWorkout = async (student: Student, routine?: WorkoutRoutine, workout?: RoutineWorkout | string) => {
    // 1. Resolve active training cycle and block context
    const cycles = await getTrainingCycleRepository().getByStudentId(student.id);
    const studentActiveCycle = cycles.find(c => c.status === 'current');
    
    let activeBlock = undefined;
    if (studentActiveCycle && studentActiveCycle.blocks && studentActiveCycle.blocks.length > 0) {
      try {
        const cycleMetrics = computeCycleMetrics(studentActiveCycle);
        activeBlock = cycleMetrics.currentBlock || studentActiveCycle.blocks[0];
      } catch {
        activeBlock = studentActiveCycle.blocks[0];
      }
    }

    // 2. Resolve routine
    let rawRoutine = routine;
    if (!rawRoutine) {
      const allRoutines = await getRoutineRepository().getByStudentId(student.id);
      if (activeBlock?.routineId) {
        rawRoutine = allRoutines.find(r => r.id === activeBlock?.routineId);
      }
      if (!rawRoutine) {
        rawRoutine = allRoutines.find(r => r.status === 'active') || allRoutines[0];
      }
    }
    
    let normalizedRoutine = rawRoutine ? normalizeWorkoutRoutine(rawRoutine) : undefined;
    let targetWorkout: RoutineWorkout | undefined = undefined;
    if (typeof workout === 'object' && workout !== null) {
      targetWorkout = workout;
    } else if (typeof workout === 'string' && normalizedRoutine) {
      targetWorkout = normalizedRoutine.workouts.find(w => w.id === workout);
    }

    if (!targetWorkout && normalizedRoutine && normalizedRoutine.workouts.length > 0) {
      const pastSessions = await getSessionRepository().getByStudentId(student.id);
      const routinePast = pastSessions
        .filter(s => s.routineId === normalizedRoutine?.id && s.status === 'completed')
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        
      if (routinePast.length > 0) {
        const lastSession = routinePast[0];
        const lastIdx = normalizedRoutine.workouts.findIndex(w => 
          w.id === lastSession.workoutId || 
          w.letter === lastSession.workoutLetter
        );
        const nextIdx = lastIdx >= 0 ? (lastIdx + 1) % normalizedRoutine.workouts.length : 0;
        targetWorkout = normalizedRoutine.workouts[nextIdx];
      } else {
        targetWorkout = normalizedRoutine.workouts[0];
      }
    }

    const sessionId = generateId('session');
    const routineSnapshot = normalizedRoutine ? JSON.parse(JSON.stringify(normalizedRoutine)) : undefined;
    const workoutSnapshot = targetWorkout ? JSON.parse(JSON.stringify(targetWorkout)) : undefined;
    
    const routineTitle = normalizedRoutine?.title || 'Treino Personalizado';
    const workoutLetter = targetWorkout?.letter || 'A';
    const workoutName = targetWorkout?.name || (normalizedRoutine ? `Treino ${workoutLetter}` : 'Treino Personalizado');
    
    const newSession: WorkoutSession = {
      id: sessionId,
      studentId: student.id,
      studentName: student.name,
      studentPhoto: student.photo,
      routineId: normalizedRoutine?.id,
      routineTitle,
      routineName: routineTitle,
      workoutId: targetWorkout?.id,
      workoutLetter: targetWorkout?.letter,
      workoutName,
      cycleId: studentActiveCycle?.id,
      cycleNameSnapshot: studentActiveCycle?.name,
      blockId: activeBlock?.id,
      blockNameSnapshot: activeBlock?.name,
      routineSnapshot,
      workoutSnapshot,
      startTime: new Date().toISOString(),
      durationSeconds: 0,
      status: 'in_progress',
      totalVolume: 0,
      totalSets: 0,
      sets: [],
      prsAchieved: []
    };
    
    const now = Date.now();
    const initialState: ActiveWorkoutState = {
      sessionId,
      studentId: student.id,
      studentName: student.name,
      studentPhoto: student.photo,
      routineId: normalizedRoutine?.id,
      routineTitle,
      routineName: routineTitle,
      workoutId: targetWorkout?.id,
      workoutLetter: targetWorkout?.letter,
      workoutName,
      cycleId: studentActiveCycle?.id,
      cycleNameSnapshot: studentActiveCycle?.name,
      blockId: activeBlock?.id,
      blockNameSnapshot: activeBlock?.name,
      routineSnapshot,
      workoutSnapshot,
      session: newSession,
      currentExerciseIndex: 0,
      currentSetIndex: 1,
      startedAtTimestamp: now,
      pausedAtTimestamp: null,
      totalPausedMs: 0,
      elapsedSeconds: 0,
      isPaused: false,
      restTargetTimestamp: null,
      restTimerSeconds: 0,
      isRestActive: false,
      activeRestTotal: 60,
      skippedExercises: []
    };
    
    setActiveWorkout(initialState);
    if (DATA_BACKEND === 'supabase') {
      await persistLiveWorkoutStateToSupabase(initialState);
    }
    
    return sessionId;
  };

  const recordSet = async (newSet: WorkoutSetRecord) => {
    setActiveWorkout(prev => {
      if (!prev) return prev;
      
      const newTotalVolume = prev.session.totalVolume + ((newSet.weightKg || 0) * (newSet.actualReps || 0));
      const newTotalSets = prev.session.sets.filter(s => s.status === 'completed').length + (newSet.status === 'completed' ? 1 : 0);
      
      const nextState = {
        ...prev,
        session: {
          ...prev.session,
          sets: [...prev.session.sets, newSet],
          totalVolume: newTotalVolume,
          totalSets: newTotalSets,
          updatedAt: new Date().toISOString()
        }
      };
      
      syncToSupabase(nextState);
      return nextState;
    });
  };

  const updateRecordedSet = async (setId: string, updated: Partial<WorkoutSetRecord>) => {
    setActiveWorkout(prev => {
      if (!prev) return prev;
      
      const updatedSets = prev.session.sets.map(s => s.id === setId ? { ...s, ...updated } : s);
      const newTotalVolume = updatedSets.reduce((sum, s) => {
        if (s.status === 'skipped') return sum;
        return sum + ((s.weightKg || 0) * (s.actualReps || 0));
      }, 0);
      const newTotalSets = updatedSets.filter(s => s.status === 'completed').length;
      
      const nextState = {
        ...prev,
        session: {
          ...prev.session,
          sets: updatedSets,
          totalVolume: newTotalVolume,
          totalSets: newTotalSets,
          updatedAt: new Date().toISOString()
        }
      };
      
      syncToSupabase(nextState);
      return nextState;
    });
  };

  const deleteRecordedSet = async (setId: string) => {
    setActiveWorkout(prev => {
      if (!prev) return prev;
      
      const updatedSets = prev.session.sets.filter(s => s.id !== setId);
      const newTotalVolume = updatedSets.reduce((sum, s) => {
        if (s.status === 'skipped') return sum;
        return sum + ((s.weightKg || 0) * (s.actualReps || 0));
      }, 0);
      const newTotalSets = updatedSets.filter(s => s.status === 'completed').length;
      
      const nextState = {
        ...prev,
        session: {
          ...prev.session,
          sets: updatedSets,
          totalVolume: newTotalVolume,
          totalSets: newTotalSets,
          updatedAt: new Date().toISOString()
        }
      };
      
      syncToSupabase(nextState);
      return nextState;
    });
  };

  const startRestTimer = (seconds: number) => {
    setActiveWorkout(prev => {
      if (!prev) return prev;
      const nextState = {
        ...prev,
        isRestActive: true,
        restTargetTimestamp: Date.now() + (seconds * 1000),
        activeRestTotal: seconds,
        restTimerSeconds: seconds
      };
      syncToSupabase(nextState);
      return nextState;
    });
  };

  const stopRestTimer = () => {
    setActiveWorkout(prev => {
      if (!prev) return prev;
      const nextState = {
        ...prev,
        isRestActive: false,
        restTargetTimestamp: null,
        restTimerSeconds: 0
      };
      syncToSupabase(nextState);
      return nextState;
    });
  };

  const addRestTime = (seconds: number) => {
    setActiveWorkout(prev => {
      if (!prev) return prev;
      const nextState = {
        ...prev,
        isRestActive: true,
        restTargetTimestamp: (prev.restTargetTimestamp || Date.now()) + (seconds * 1000),
        activeRestTotal: prev.activeRestTotal + seconds,
        restTimerSeconds: prev.restTimerSeconds + seconds
      };
      syncToSupabase(nextState);
      return nextState;
    });
  };

  const updateWorkoutState = (updates: Partial<ActiveWorkoutState>) => {
    setActiveWorkout(prev => {
      if (!prev) return prev;
      const nextState = { ...prev, ...updates };
      syncToSupabase(nextState);
      return nextState;
    });
  };

  const finishWorkout = async () => {
    if (!activeWorkout) return null;
    
    const completedSession: WorkoutSession = {
      ...activeWorkout.session,
      workoutId: activeWorkout.workoutId || activeWorkout.session.workoutId,
      workoutLetter: activeWorkout.workoutLetter || activeWorkout.session.workoutLetter,
      workoutName: activeWorkout.workoutName || activeWorkout.session.workoutName,
      routineSnapshot: activeWorkout.routineSnapshot || activeWorkout.session.routineSnapshot,
      workoutSnapshot: activeWorkout.workoutSnapshot || activeWorkout.session.workoutSnapshot,
      endTime: new Date().toISOString(),
      durationSeconds: activeWorkout.elapsedSeconds,
      status: 'completed',
      updatedAt: new Date().toISOString()
    };
    
    if (DATA_BACKEND === 'supabase') {
      await getSessionRepository().create(completedSession);
      await removeLiveWorkoutStateFromSupabase(activeWorkout.sessionId);
    }
    
    setActiveWorkout(null);
    return completedSession;
  };

  const cancelWorkout = async () => {
    if (!activeWorkout) return;
    if (DATA_BACKEND === 'supabase') {
      await removeLiveWorkoutStateFromSupabase(activeWorkout.sessionId);
    }
    setActiveWorkout(null);
  };

  return {
    activeWorkout,
    isLoading,
    startWorkout,
    recordSet,
    updateRecordedSet,
    deleteRecordedSet,
    startRestTimer,
    stopRestTimer,
    addRestTime,
    updateWorkoutState,
    finishWorkout,
    cancelWorkout
  };
}
