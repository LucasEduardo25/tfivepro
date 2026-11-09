import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Check, 
  Flame, 
  Plus, 
  Minus, 
  Timer, 
  Trophy, 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  X, 
  Edit2, 
  Trash2, 
  Search, 
  AlertCircle, 
  Dumbbell, 
  Sparkles, 
  Zap, 
  ListOrdered, 
  History, 
  MoreVertical, 
  ArrowRight, 
  CheckCircle2,
  Activity,
  Split,
  RotateCcw,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  ActiveWorkoutState, 
  RoutineExercise, 
  WorkoutSetRecord, 
  Exercise, 
  WorkoutSession, 
  PrescriptionType,
  ExerciseGroupType,
  RoutineWorkout
} from '../../types';
import { 
  formatTimer, 
  formatWeight, 
  calculateEstimated1RM,
  formatDistance,
  formatPrescriptionSummary,
  formatSetMetric
} from '../../utils/calculations';
import { StudentAvatar } from '../common/StudentAvatar';
import { generateId } from '../../db/indexedDB';

interface WorkoutSessionPanelProps {
  workout: ActiveWorkoutState;
  isDualMode: boolean;
  onFinish: (session: WorkoutSession) => void;
  onShowPresentation: (session: WorkoutSession) => void;
  onOpenAddSecondStudent?: () => void;
}

export const WorkoutSessionPanel: React.FC<WorkoutSessionPanelProps> = ({
  workout,
  isDualMode,
  onFinish,
  onShowPresentation,
  onOpenAddSecondStudent
}) => {
  const { 
    updateActiveWorkout, 
    recordSet, 
    updateRecordedSet, 
    deleteRecordedSet, 
    finishWorkout, 
    cancelActiveWorkout, 
    pauseWorkout, 
    resumeWorkout, 
    startRest, 
    skipRest, 
    addRestSeconds, 
    routines, 
    exercises, 
    exerciseCatalog,
    sessions, 
    students, 
    workoutSettings,
    pendingSyncCount
  } = useApp();

  const {
    sessionId,
    studentId,
    studentName,
    studentPhoto,
    session,
    currentExerciseIndex,
    currentSetIndex,
    elapsedSeconds,
    isPaused,
    restTimerSeconds,
    isRestActive
  } = workout;

  const liveStudentPhoto = students.find(s => s.id === studentId)?.photo || studentPhoto;
  const studentFirstName = studentName.split(' ')[0].toUpperCase();

  // Retrieve routine exercises snapshot with strict workout letter/id specificity
  const routine = routines.find(r => r.id === (session.routineId || workout.routineId));
  const routineExercises: RoutineExercise[] = useMemo(() => {
    // 1. Direct workout snapshot from active workout state
    if (workout.workoutSnapshot?.exercises && workout.workoutSnapshot.exercises.length > 0) {
      return workout.workoutSnapshot.exercises;
    }
    // 2. Direct workout snapshot from session
    if (session.workoutSnapshot?.exercises && session.workoutSnapshot.exercises.length > 0) {
      return session.workoutSnapshot.exercises;
    }
    // 3. Match workout by workoutId in routine snapshot or live routine
    const targetWorkoutId = workout.workoutId || session.workoutId;
    if (targetWorkoutId) {
      const snapW = workout.routineSnapshot?.workouts?.find((w: any) => w.id === targetWorkoutId);
      if (snapW?.exercises && snapW.exercises.length > 0) return snapW.exercises;
      const sessSnapW = session.routineSnapshot?.workouts?.find((w: any) => w.id === targetWorkoutId);
      if (sessSnapW?.exercises && sessSnapW.exercises.length > 0) return sessSnapW.exercises;
      const liveW = routine?.workouts?.find((w: any) => w.id === targetWorkoutId);
      if (liveW?.exercises && liveW.exercises.length > 0) return liveW.exercises;
    }
    // 4. Match workout by workoutLetter in routine snapshot or live routine
    const targetWorkoutLetter = (workout.workoutLetter || session.workoutLetter)?.toUpperCase();
    if (targetWorkoutLetter) {
      const snapW = workout.routineSnapshot?.workouts?.find((w: any) => w.letter?.toUpperCase() === targetWorkoutLetter);
      if (snapW?.exercises && snapW.exercises.length > 0) return snapW.exercises;
      const sessSnapW = session.routineSnapshot?.workouts?.find((w: any) => w.letter?.toUpperCase() === targetWorkoutLetter);
      if (sessSnapW?.exercises && sessSnapW.exercises.length > 0) return sessSnapW.exercises;
      const liveW = routine?.workouts?.find((w: any) => w.letter?.toUpperCase() === targetWorkoutLetter);
      if (liveW?.exercises && liveW.exercises.length > 0) return liveW.exercises;
    }
    // 5. Fallback to routine snapshots exercises list
    if (workout.routineSnapshot?.exercises && workout.routineSnapshot.exercises.length > 0) {
      return workout.routineSnapshot.exercises;
    }
    if (session.routineSnapshot?.exercises && session.routineSnapshot.exercises.length > 0) {
      return session.routineSnapshot.exercises;
    }
    if (routine && routine.exercises && routine.exercises.length > 0) {
      return routine.exercises;
    }
    return [
      {
        id: 're-def-1',
        exerciseId: 'ex-001',
        exerciseName: 'Supino Reto com Barra',
        muscleGroup: 'Peitoral',
        targetSets: 4,
        targetRepsMin: 8,
        targetRepsMax: 10,
        targetRPE: 8,
        restSeconds: 90,
        lastSuggestedLoad: 40,
        prescriptionType: 'weight_reps'
      }
    ];
  }, [
    workout.workoutSnapshot, 
    session.workoutSnapshot, 
    workout.workoutId, 
    session.workoutId, 
    workout.workoutLetter, 
    session.workoutLetter, 
    workout.routineSnapshot, 
    session.routineSnapshot, 
    workout.routineId,
    session.routineId,
    routine
  ]);

  const safeExerciseIndex = Math.min(currentExerciseIndex, Math.max(0, routineExercises.length - 1));
  const currentExercise = routineExercises[safeExerciseIndex] || routineExercises[0];
  const fullExerciseDetails = exercises.find(e => e.id === currentExercise?.exerciseId);
  const pType: PrescriptionType = currentExercise?.prescriptionType || 'weight_reps';

  // Compute structured group metadata and individual exercise badge labels (e.g. A1, A2, A3 or 1, 2, 3)
  const exerciseMetaList = useMemo(() => {
    const groupMap = new Map<string, { letter: string; index: number; type: ExerciseGroupType; name?: string; rounds?: number; count: number }>();
    let groupCounter = 0;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    // First pass: identify real groups with > 1 exercises
    const groupCounts: { [key: string]: number } = {};
    routineExercises.forEach(ex => {
      if (ex.groupId) {
        groupCounts[ex.groupId] = (groupCounts[ex.groupId] || 0) + 1;
      }
    });

    routineExercises.forEach(ex => {
      if (ex.groupId && groupCounts[ex.groupId] > 1 && !groupMap.has(ex.groupId)) {
        const letter = alphabet[groupCounter % alphabet.length] || `G${groupCounter + 1}`;
        groupCounter++;
        groupMap.set(ex.groupId, {
          letter,
          index: groupCounter,
          type: ex.groupType || (groupCounts[ex.groupId] === 2 ? 'bi_set' : groupCounts[ex.groupId] === 3 ? 'tri_set' : 'circuit'),
          name: ex.groupName,
          rounds: ex.groupRounds || ex.targetSets || 3,
          count: groupCounts[ex.groupId]
        });
      }
    });

    // Second pass: assign positions and labels
    const groupPositions: { [key: string]: number } = {};
    let standaloneCounter = 0;

    return routineExercises.map((ex, idx) => {
      const isGroup = !!(ex.groupId && groupMap.has(ex.groupId));
      if (isGroup) {
        const grp = groupMap.get(ex.groupId!)!;
        const pos = (groupPositions[ex.groupId!] || 0) + 1;
        groupPositions[ex.groupId!] = pos;
        const badgeLabel = `${grp.letter}${pos}`; // A1, A2, A3
        return {
          exercise: ex,
          index: idx,
          isGrouped: true,
          groupId: ex.groupId!,
          groupLetter: grp.letter,
          groupNumber: grp.index,
          groupType: grp.type,
          groupName: grp.name || (grp.type === 'bi_set' ? `BI-SET ${grp.index}` : grp.type === 'tri_set' ? `TRI-SET ${grp.index}` : `CIRCUITO ${grp.index}`),
          positionInGroup: pos,
          totalInGroup: grp.count,
          badgeLabel,
          targetRounds: ex.targetSets || grp.rounds || 3
        };
      } else {
        standaloneCounter++;
        return {
          exercise: ex,
          index: idx,
          isGrouped: false,
          groupId: undefined,
          groupLetter: undefined,
          groupNumber: undefined,
          groupType: undefined,
          groupName: undefined,
          positionInGroup: undefined,
          totalInGroup: 1,
          badgeLabel: `${standaloneCounter}`,
          targetRounds: ex.targetSets || 4
        };
      }
    });
  }, [routineExercises]);

  const currentMeta = exerciseMetaList[safeExerciseIndex] || exerciseMetaList[0];

  // Group membership detection (Bi-set / Tri-set / Circuito)
  const currentGroupMembers: RoutineExercise[] = useMemo(() => {
    if (!currentExercise?.groupId) return [];
    return routineExercises.filter(e => e.groupId === currentExercise.groupId);
  }, [currentExercise?.groupId, routineExercises]);

  const isGrouped = currentGroupMembers.length > 1;
  const currentGroupType: ExerciseGroupType | undefined = currentExercise?.groupType || currentMeta?.groupType;
  const currentGroupTitle = currentExercise?.groupName || currentMeta?.groupName || (currentGroupType === 'bi_set' ? 'BI-SET' : currentGroupType === 'tri_set' ? 'TRI-SET' : 'CIRCUITO');

  // Student's historical performance specifically for this student + exercise
  const studentPastSessions = useMemo(() => {
    return sessions.filter(s => s.studentId === studentId && s.id !== session.id);
  }, [sessions, studentId, session.id]);

  const historicalData = useMemo(() => {
    if (!currentExercise?.exerciseId) return { bestSet: null, lastSet: null, lastSessionDate: null, lastSessionSets: [], recentSets: [] };
    let bestSet: WorkoutSetRecord | null = null;
    let lastSet: WorkoutSetRecord | null = null;
    let lastSessionDate: string | null = null;
    let lastSessionSets: WorkoutSetRecord[] = [];
    const recentSets: { date: string; sets: WorkoutSetRecord[] }[] = [];

    const sortedPast = [...studentPastSessions].sort(
      (a, b) => new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime()
    );

    for (const s of sortedPast) {
      const matchSets = s.sets.filter(
        st => st.exerciseId === currentExercise.exerciseId && !st.isWarmup && st.status !== 'skipped'
      );
      if (matchSets.length > 0) {
        if (!lastSet) {
          lastSet = matchSets[matchSets.length - 1];
          lastSessionDate = s.startTime || null;
          lastSessionSets = matchSets;
        }
        if (recentSets.length < 5) {
          recentSets.push({
            date: s.startTime || '',
            sets: matchSets
          });
        }
        for (const st of matchSets) {
          if (!bestSet) {
            bestSet = st;
          } else if (st.weightKg > bestSet.weightKg || (st.weightKg === bestSet.weightKg && st.actualReps > bestSet.actualReps)) {
            bestSet = st;
          }
        }
      }
    }
    return { bestSet, lastSet, lastSessionDate, lastSessionSets, recentSets };
  }, [currentExercise?.exerciseId, studentPastSessions]);

  // Operational State & Draft inputs
  const [currentLoad, setCurrentLoad] = useState<number>(workout.draftLoad ?? 40);
  const [currentReps, setCurrentReps] = useState<number>(workout.draftReps ?? 10);
  const [currentDurationSec, setCurrentDurationSec] = useState<number>(30);
  const [currentDistance, setCurrentDistance] = useState<number>(200);
  const [currentDistanceUnit, setCurrentDistanceUnit] = useState<'meters' | 'km'>('meters');
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState<number | undefined>(undefined);
  const [currentInclinePct, setCurrentInclinePct] = useState<number | undefined>(undefined);
  const [currentRPE, setCurrentRPE] = useState<number | null>(workout.draftRPE ?? 8);
  const [setNote, setSetNote] = useState<string>(workout.draftNote ?? '');
  const [showNoteInput, setShowNoteInput] = useState<boolean>(false);

  // Isometric / Duration Active Stopwatch Timer state
  const [isSetTimerRunning, setIsSetTimerRunning] = useState<boolean>(false);
  const [setTimerSeconds, setSetTimerSeconds] = useState<number>(0);
  const setTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Modals and Drawers
  const [showExerciseListDrawer, setShowExerciseListDrawer] = useState<boolean>(false);
  const [showQuickHistoryModal, setShowQuickHistoryModal] = useState<boolean>(false);
  const [showExecutionInfoModal, setShowExecutionInfoModal] = useState<boolean>(false);
  const [showExerciseBankSelector, setShowExerciseBankSelector] = useState<boolean>(false);
  const [isReplacingExercise, setIsReplacingExercise] = useState<boolean>(false);
  const [showOtherRPEModal, setShowOtherRPEModal] = useState<boolean>(false);
  const [showMoreActionsMenu, setShowMoreActionsMenu] = useState<boolean>(false);
  const [showFinishConfirmModal, setShowFinishConfirmModal] = useState<boolean>(false);
  const [showAbandonConfirmModal, setShowAbandonConfirmModal] = useState<boolean>(false);
  const [editingSet, setEditingSet] = useState<WorkoutSetRecord | null>(null);
  const [searchExerciseTerm, setSearchExerciseTerm] = useState<string>('');

  // Discreet PR Toast & Anti-Double-Click Submitting Flag
  const [discreetPRToast, setDiscreetPRToast] = useState<string | null>(null);
  const prToastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isSubmittingSet, setIsSubmittingSet] = useState<boolean>(false);

  // Online-First Live Workout Save Feedback State
  const [saveFeedback, setSaveFeedback] = useState<{ 
    status: 'saved' | 'error'; 
    message: string; 
    retryAction?: () => Promise<boolean>;
  } | null>(null);
  const saveFeedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (prToastTimeoutRef.current) clearTimeout(prToastTimeoutRef.current);
      if (saveFeedbackTimeoutRef.current) clearTimeout(saveFeedbackTimeoutRef.current);
      if (setTimerIntervalRef.current) clearInterval(setTimerIntervalRef.current);
    };
  }, []);

  // Timer effect for set timer (isometric / duration)
  useEffect(() => {
    if (isSetTimerRunning) {
      setTimerIntervalRef.current = setInterval(() => {
        setSetTimerSeconds(prev => {
          const next = prev + 1;
          setCurrentDurationSec(next);
          return next;
        });
      }, 1000);
    } else {
      if (setTimerIntervalRef.current) clearInterval(setTimerIntervalRef.current);
    }
    return () => {
      if (setTimerIntervalRef.current) clearInterval(setTimerIntervalRef.current);
    };
  }, [isSetTimerRunning]);

  // Adjust defaults when exercise changes
  const applyExerciseDefaults = (ex: RoutineExercise) => {
    const type = ex.prescriptionType || 'weight_reps';
    
    // Find last performance for this specific new exercise
    const sortedPast = [...studentPastSessions].sort(
      (a, b) => new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime()
    );
    let matchedLastSet: WorkoutSetRecord | null = null;
    for (const s of sortedPast) {
      const match = s.sets.filter(st => st.exerciseId === ex.exerciseId && !st.isWarmup && st.status !== 'skipped');
      if (match.length > 0) {
        matchedLastSet = match[match.length - 1];
        break;
      }
    }

    if (matchedLastSet && matchedLastSet.weightKg > 0) {
      setCurrentLoad(matchedLastSet.weightKg);
      setCurrentReps(matchedLastSet.actualReps || ex.targetRepsMin || 10);
    } else if (ex.lastSuggestedLoad) {
      setCurrentLoad(ex.lastSuggestedLoad);
      setCurrentReps(ex.targetRepsMin || 10);
    } else {
      setCurrentLoad(type === 'reps' ? 0 : 30);
      setCurrentReps(ex.targetRepsMin || 10);
    }

    if (type === 'isometric' || type === 'duration' || type === 'weight_duration' || type === 'cardio' || type === 'duration_distance') {
      const defaultDuration = ex.targetDurationSeconds || 30;
      setCurrentDurationSec(defaultDuration);
      setSetTimerSeconds(0);
      setIsSetTimerRunning(false);
    }

    if (type === 'distance' || type === 'duration_distance' || type === 'cardio') {
      setCurrentDistance(ex.targetDistance || (ex.distanceUnit === 'km' ? 3 : 200));
      setCurrentDistanceUnit(ex.distanceUnit || 'meters');
      setCurrentSpeedKmh(ex.cardioSpeedKmh);
      setCurrentInclinePct(ex.cardioInclinePct);
    }

    setCurrentRPE(ex.targetRPE || 8);
    setShowNoteInput(false);
    setSetNote('');
  };

  const handleNextExercise = () => {
    if (safeExerciseIndex < routineExercises.length - 1) {
      const nextIndex = safeExerciseIndex + 1;
      const targetEx = routineExercises[nextIndex];
      const compTarget = session.sets.filter(s => s.exerciseId === targetEx?.exerciseId && s.status !== 'skipped').length;
      updateActiveWorkout(sessionId, prev => ({
        ...prev,
        currentExerciseIndex: nextIndex,
        currentSetIndex: compTarget + 1
      }));
      applyExerciseDefaults(routineExercises[nextIndex]);
    }
  };

  const handlePrevExercise = () => {
    if (safeExerciseIndex > 0) {
      const prevIndex = safeExerciseIndex - 1;
      const targetEx = routineExercises[prevIndex];
      const compTarget = session.sets.filter(s => s.exerciseId === targetEx?.exerciseId && s.status !== 'skipped').length;
      updateActiveWorkout(sessionId, prev => ({
        ...prev,
        currentExerciseIndex: prevIndex,
        currentSetIndex: compTarget + 1
      }));
      applyExerciseDefaults(routineExercises[prevIndex]);
    }
  };

  const handleJumpToExercise = (index: number) => {
    if (index >= 0 && index < routineExercises.length) {
      const targetEx = routineExercises[index];
      const compTarget = session.sets.filter(s => s.exerciseId === targetEx?.exerciseId && s.status !== 'skipped').length;
      updateActiveWorkout(sessionId, prev => ({
        ...prev,
        currentExerciseIndex: index,
        currentSetIndex: compTarget + 1
      }));
      applyExerciseDefaults(routineExercises[index]);
      setShowExerciseListDrawer(false);
    }
  };

  // Add an extra set to current exercise or group (SESSION ONLY - never touches original routine)
  const handleAddExtraSet = () => {
    if (!currentExercise) return;
    
    const updatedExercises = routineExercises.map(ex => {
      if (isGrouped && ex.groupId === currentExercise.groupId) {
        const currentTarget = ex.targetSets || 3;
        return {
          ...ex,
          targetSets: currentTarget + 1,
          groupRounds: currentTarget + 1,
          originalPrescriptionSets: ex.originalPrescriptionSets ?? currentTarget
        };
      } else if (!isGrouped && ex.id === currentExercise.id) {
        const currentTarget = ex.targetSets || 4;
        return {
          ...ex,
          targetSets: currentTarget + 1,
          originalPrescriptionSets: ex.originalPrescriptionSets ?? currentTarget
        };
      }
      return ex;
    });

    const updatedWorkoutSnapshot: RoutineWorkout = {
      ...(workout.workoutSnapshot || session.workoutSnapshot || {
        id: workout.workoutId || session.workoutId || generateId('rw'),
        routineId: workout.routineId || session.routineId || '',
        letter: workout.workoutLetter || session.workoutLetter || 'A',
        name: workout.workoutName || session.workoutName || 'Treino do Dia',
        order: 1,
        exercises: []
      }),
      exercises: updatedExercises
    };

    updateActiveWorkout(sessionId, prev => ({
      ...prev,
      workoutSnapshot: updatedWorkoutSnapshot,
      session: {
        ...prev.session,
        workoutSnapshot: updatedWorkoutSnapshot
      }
    }));
  };

  // Remove extra uncompleted set or round (SESSION ONLY)
  const handleRemoveExtraSet = () => {
    if (!currentExercise) return;

    if (isGrouped && currentExercise.groupId) {
      const anyMemberCompletedExtra = currentGroupMembers.some(m => {
        const comp = session.sets.filter(s => s.exerciseId === m.exerciseId && s.status !== 'skipped').length;
        const orig = m.originalPrescriptionSets ?? (m.targetSets || 3);
        return comp > orig;
      });
      if (anyMemberCompletedExtra) return;

      const updatedExercises = routineExercises.map(ex => {
        if (ex.groupId === currentExercise.groupId) {
          const currentTarget = ex.targetSets || 3;
          const original = ex.originalPrescriptionSets ?? currentTarget;
          return {
            ...ex,
            targetSets: Math.max(original, currentTarget - 1),
            groupRounds: Math.max(original, currentTarget - 1)
          };
        }
        return ex;
      });

      const updatedWorkoutSnapshot: RoutineWorkout = {
        ...(workout.workoutSnapshot || session.workoutSnapshot || {
          id: workout.workoutId || session.workoutId || generateId('rw'),
          routineId: workout.routineId || session.routineId || '',
          letter: workout.workoutLetter || session.workoutLetter || 'A',
          name: workout.workoutName || session.workoutName || 'Treino do Dia',
          order: 1,
          exercises: []
        }),
        exercises: updatedExercises
      };

      updateActiveWorkout(sessionId, prev => ({
        ...prev,
        workoutSnapshot: updatedWorkoutSnapshot,
        session: {
          ...prev.session,
          workoutSnapshot: updatedWorkoutSnapshot
        }
      }));
    } else {
      const currentTarget = currentExercise.targetSets || 4;
      const originalPrescription = currentExercise.originalPrescriptionSets ?? currentTarget;
      if (currentTarget <= originalPrescription) return;

      const completedForThis = session.sets.filter(s => s.exerciseId === currentExercise.exerciseId && s.status !== 'skipped').length;
      if (completedForThis >= currentTarget) return;

      const updatedExercises = routineExercises.map(ex => {
        if (ex.id === currentExercise.id) {
          return {
            ...ex,
            targetSets: Math.max(originalPrescription, currentTarget - 1)
          };
        }
        return ex;
      });

      const updatedWorkoutSnapshot: RoutineWorkout = {
        ...(workout.workoutSnapshot || session.workoutSnapshot || {
          id: workout.workoutId || session.workoutId || generateId('rw'),
          routineId: workout.routineId || session.routineId || '',
          letter: workout.workoutLetter || session.workoutLetter || 'A',
          name: workout.workoutName || session.workoutName || 'Treino do Dia',
          order: 1,
          exercises: []
        }),
        exercises: updatedExercises
      };

      updateActiveWorkout(sessionId, prev => ({
        ...prev,
        workoutSnapshot: updatedWorkoutSnapshot,
        session: {
          ...prev.session,
          workoutSnapshot: updatedWorkoutSnapshot
        }
      }));
    }
  };

  // Add or Replace Exercise in current session (Never modifies student's original routine)
  const handleSelectExerciseFromBank = (ex: Exercise) => {
    const rawType = ex.recordType || 'weight_reps';
    let prescriptionType: PrescriptionType = 'weight_reps';
    if (rawType === 'isometry_time' || rawType === 'isometric') prescriptionType = 'isometric';
    else if (rawType === 'duration_time' || rawType === 'duration') prescriptionType = 'duration';
    else if (rawType === 'distance_cardio' || rawType === 'distance') prescriptionType = 'distance';
    else if (rawType === 'bodyweight_reps' || rawType === 'reps') prescriptionType = 'reps';

    if (isReplacingExercise && currentExercise) {
      // REPLACE CURRENT EXERCISE FOR THIS SESSION - PRESERVES GROUP INTEGRITY
      const oldExName = currentExercise.exerciseName;
      const oldExId = currentExercise.exerciseId;

      const replacedRoutineEx: RoutineExercise = {
        ...currentExercise,
        exerciseId: ex.id,
        exerciseName: ex.name,
        muscleGroup: ex.muscleGroup,
        primaryMuscles: ex.primaryMuscles || [ex.muscleGroup],
        secondaryMuscles: ex.secondaryMuscles || [],
        prescriptionType,
        targetSets: currentExercise.targetSets || 4,
        targetRepsMin: 8,
        targetRepsMax: 12,
        targetDurationSeconds: prescriptionType === 'isometric' || prescriptionType === 'duration' ? 30 : undefined,
        targetDistance: prescriptionType === 'distance' ? 200 : undefined,
        targetRPE: 8,
        restSeconds: ex.defaultRestSeconds || currentExercise.restSeconds || 60,
        replacedFromExerciseId: oldExId,
        replacedFromExerciseName: oldExName,
        // Explicitly maintain group parameters
        groupId: currentExercise.groupId,
        groupType: currentExercise.groupType,
        groupName: currentExercise.groupName,
        groupRounds: currentExercise.groupRounds,
        groupOrder: currentExercise.groupOrder,
        restBetweenExercises: currentExercise.restBetweenExercises,
        restAfterRound: currentExercise.restAfterRound
      };

      const updatedExercises = [...routineExercises];
      updatedExercises[safeExerciseIndex] = replacedRoutineEx;

      const updatedWorkoutSnapshot: RoutineWorkout = {
        ...(workout.workoutSnapshot || session.workoutSnapshot || {
          id: workout.workoutId || session.workoutId || generateId('rw'),
          routineId: workout.routineId || session.routineId || '',
          letter: workout.workoutLetter || session.workoutLetter || 'A',
          name: workout.workoutName || session.workoutName || 'Treino do Dia',
          order: 1,
          exercises: []
        }),
        exercises: updatedExercises
      };

      updateActiveWorkout(sessionId, prev => ({
        ...prev,
        workoutSnapshot: updatedWorkoutSnapshot,
        session: {
          ...prev.session,
          workoutSnapshot: updatedWorkoutSnapshot
        }
      }));

      applyExerciseDefaults(replacedRoutineEx);
      setShowExerciseBankSelector(false);
      setIsReplacingExercise(false);
    } else {
      // ADD NEW EXERCISE TO CURRENT SESSION
      const customRoutineEx: RoutineExercise = {
        id: generateId('re'),
        exerciseId: ex.id,
        exerciseName: ex.name,
        muscleGroup: ex.muscleGroup,
        primaryMuscles: ex.primaryMuscles || [ex.muscleGroup],
        secondaryMuscles: ex.secondaryMuscles || [],
        prescriptionType,
        targetSets: 4,
        targetRepsMin: 8,
        targetRepsMax: 12,
        targetDurationSeconds: prescriptionType === 'isometric' || prescriptionType === 'duration' ? 30 : undefined,
        targetDistance: prescriptionType === 'distance' ? 200 : undefined,
        targetRPE: 8,
        restSeconds: ex.defaultRestSeconds || 60,
        isAddedDuringSession: true
      };

      const updatedExercises = [...routineExercises, customRoutineEx];
      const updatedWorkoutSnapshot: RoutineWorkout = {
        ...(workout.workoutSnapshot || session.workoutSnapshot || {
          id: workout.workoutId || session.workoutId || generateId('rw'),
          routineId: workout.routineId || session.routineId || '',
          letter: workout.workoutLetter || session.workoutLetter || 'A',
          name: workout.workoutName || session.workoutName || 'Treino do Dia',
          order: 1,
          exercises: []
        }),
        exercises: updatedExercises
      };

      const newIndex = updatedExercises.length - 1;

      updateActiveWorkout(sessionId, prev => ({
        ...prev,
        currentExerciseIndex: newIndex,
        currentSetIndex: 1,
        workoutSnapshot: updatedWorkoutSnapshot,
        session: {
          ...prev.session,
          workoutSnapshot: updatedWorkoutSnapshot
        }
      }));

      applyExerciseDefaults(customRoutineEx);
      setShowExerciseBankSelector(false);
      setIsReplacingExercise(false);
    }
  };

  // Complete a set (Operational Core)
  const handleCompleteSet = async () => {
    if (isSubmittingSet || !currentExercise) return;
    setIsSubmittingSet(true);

    // Stop set timer if running
    if (isSetTimerRunning) {
      setIsSetTimerRunning(false);
      if (setTimerIntervalRef.current) clearInterval(setTimerIntervalRef.current);
    }

    // Haptic vibration feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(35);
      } catch {
        // ignore
      }
    }

    try {
      const type = currentExercise.prescriptionType || 'weight_reps';
      const bankEx = exercises.find(e => e.id === currentExercise.exerciseId || e.name === currentExercise.exerciseName);
      
      const memberIdx = isGrouped ? currentGroupMembers.findIndex(e => e.id === currentExercise.id) : -1;
      const completedForThis = session.sets.filter(s => s.exerciseId === currentExercise.exerciseId && s.status !== 'skipped').length;
      const setNum = completedForThis + 1;
      const isLastInGroup = isGrouped && memberIdx === currentGroupMembers.length - 1;

      const setRecord: WorkoutSetRecord = {
        id: generateId('wsr'),
        sessionId,
        studentId,
        exerciseId: currentExercise.exerciseId,
        exerciseName: currentExercise.exerciseName,
        muscleGroup: currentExercise.muscleGroup || bankEx?.muscleGroup || 'Peitoral',
        primaryMuscles: currentExercise.primaryMuscles || bankEx?.primaryMuscles,
        secondaryMuscles: currentExercise.secondaryMuscles || bankEx?.secondaryMuscles,
        setNumber: setNum,
        roundNumber: isGrouped ? setNum : undefined,
        groupExerciseOrder: isGrouped ? (memberIdx !== -1 ? memberIdx + 1 : undefined) : undefined,
        prescriptionType: type,
        recordType: type,
        targetReps: currentExercise.targetRepsMax || currentReps,
        actualReps: type === 'weight_reps' || type === 'reps' ? currentReps : 0,
        weightKg: type === 'weight_reps' || type === 'weight_duration' ? currentLoad : 0,
        durationSeconds: (type === 'isometric' || type === 'duration' || type === 'weight_duration' || type === 'cardio' || type === 'duration_distance')
          ? (currentDurationSec || currentExercise.targetDurationSeconds || 30)
          : undefined,
        distanceMeters: (type === 'distance' || type === 'duration_distance' || type === 'cardio')
          ? (currentDistanceUnit === 'km' ? currentDistance * 1000 : currentDistance)
          : undefined,
        distanceUnit: currentDistanceUnit,
        speedKmh: currentSpeedKmh,
        inclinePct: currentInclinePct,
        rpe: currentRPE,
        completedAt: new Date().toISOString(),
        notes: setNote.trim() || undefined,
        status: 'completed',
        groupId: currentExercise.groupId,
        groupType: currentExercise.groupType
      };

      const recordResult = await recordSet(sessionId, setRecord);

      // Feedback online-first de gravação de série (Supabase / Local)
      if (recordResult.saveStatus === 'saved') {
        setSaveFeedback({ status: 'saved', message: 'Série salva' });
        if (saveFeedbackTimeoutRef.current) clearTimeout(saveFeedbackTimeoutRef.current);
        saveFeedbackTimeoutRef.current = setTimeout(() => {
          setSaveFeedback(null);
        }, 2500);
      } else if (recordResult.saveStatus === 'error') {
        setSaveFeedback({
          status: 'error',
          message: recordResult.error || 'Não foi possível salvar. Verifique sua conexão.',
          retryAction: recordResult.retryAction
        });
      }

      // PR notification: clean, discreet inline banner (No confetti/popups)
      if (recordResult.isPR) {
        let prMsg = `Novo Recorde (PR): ${formatSetMetric(setRecord)}`;
        if (type === 'isometric' || type === 'duration') prMsg = `PR de Tempo: ${currentDurationSec}s`;
        else if (type === 'distance') prMsg = `PR de Distância: ${formatDistance(currentDistance, currentDistanceUnit)}`;
        else if (type === 'reps') prMsg = `PR de Repetições: ${currentReps} reps`;
        
        setDiscreetPRToast(prMsg);
        if (prToastTimeoutRef.current) clearTimeout(prToastTimeoutRef.current);
        prToastTimeoutRef.current = setTimeout(() => {
          setDiscreetPRToast(null);
        }, 3000);
      }

      // Rest Timer & Sequence Navigation determination:
      let restDuration = 0;
      let nextExerciseIndexToNavigate = safeExerciseIndex;

      if (isGrouped && currentGroupMembers.length > 1) {
        const targetRounds = currentExercise.targetSets || 3;

        if (!isLastInGroup) {
          // A1 -> A2 or A2 -> A3: Immediate transition within round, no main rest
          const nextMember = currentGroupMembers[memberIdx + 1];
          const globalIdx = routineExercises.findIndex(e => e.id === nextMember.id);
          if (globalIdx !== -1) {
            nextExerciseIndexToNavigate = globalIdx;
          }
          // Short rest between exercises inside round (default 0s)
          restDuration = currentExercise.restBetweenExercises ?? 0;
        } else {
          // Last exercise of group in this round completed (e.g. A2 in Bi-set, A3 in Tri-set)
          const allMembersCompletedAllRounds = currentGroupMembers.every(m => {
            const comp = (m.id === currentExercise.id ? completedForThis + 1 : session.sets.filter(s => s.exerciseId === m.exerciseId && s.status !== 'skipped').length);
            return comp >= (m.targetSets || targetRounds);
          });

          if (!allMembersCompletedAllRounds) {
            // Loop back to A1 for next round
            const firstMember = currentGroupMembers[0];
            const globalIdx = routineExercises.findIndex(e => e.id === firstMember.id);
            if (globalIdx !== -1) {
              nextExerciseIndexToNavigate = globalIdx;
            }
            // Main rest after completing full round of the group
            restDuration = currentExercise.restAfterRound ?? currentExercise.restSeconds ?? 60;
          } else {
            // All rounds of group finished! Advance to next routine exercise / group outside this group
            const lastMemberGlobalIdx = routineExercises.findIndex(e => e.id === currentGroupMembers[currentGroupMembers.length - 1].id);
            const nextRoutineIndex = lastMemberGlobalIdx + 1;

            if (nextRoutineIndex < routineExercises.length) {
              nextExerciseIndexToNavigate = nextRoutineIndex;
              restDuration = currentExercise.restAfterRound ?? currentExercise.restSeconds ?? 60;
            } else {
              // Workout completed
              nextExerciseIndexToNavigate = safeExerciseIndex;
              restDuration = 0;
            }
          }
        }
      } else {
        // Standalone single exercise
        const targetSets = currentExercise.targetSets || 4;
        const isFinished = (completedForThis + 1) >= targetSets;

        if (isFinished && safeExerciseIndex < routineExercises.length - 1) {
          nextExerciseIndexToNavigate = safeExerciseIndex + 1;
          restDuration = currentExercise.restSeconds || 60;
        } else {
          nextExerciseIndexToNavigate = safeExerciseIndex;
          restDuration = currentExercise.restSeconds || 60;
        }
      }

      // Start Rest Timer if duration > 0
      if (restDuration > 0) {
        startRest(sessionId, restDuration);
      }

      // Calculate next set index for target exercise
      const nextTargetEx = routineExercises[nextExerciseIndexToNavigate];
      const compNext = (nextExerciseIndexToNavigate === safeExerciseIndex)
        ? (completedForThis + 1)
        : session.sets.filter(s => s.exerciseId === nextTargetEx?.exerciseId && s.status !== 'skipped').length;
      const nextSetIndexCalculated = compNext + 1;

      updateActiveWorkout(sessionId, prev => ({
        ...prev,
        currentExerciseIndex: nextExerciseIndexToNavigate,
        currentSetIndex: nextSetIndexCalculated
      }));

      if (nextExerciseIndexToNavigate !== safeExerciseIndex) {
        applyExerciseDefaults(routineExercises[nextExerciseIndexToNavigate]);
      }

      setSetNote('');
      setShowNoteInput(false);
      setSetTimerSeconds(0);
    } catch (err) {
      console.error('Error completing set:', err);
    } finally {
      setIsSubmittingSet(false);
    }
  };

  const handleFinishAndOpenSummary = async () => {
    setShowFinishConfirmModal(false);
    const completed = await finishWorkout(sessionId);
    if (completed) {
      onFinish(completed);
    }
  };

  // Completed sets calculations for current exercise
  const completedSetsForCurrentEx = session.sets.filter(
    s => s.exerciseId === currentExercise?.exerciseId
  );

  const totalExerciseVolume = completedSetsForCurrentEx.reduce(
    (sum, s) => {
      const type = s.prescriptionType || 'weight_reps';
      if (type === 'weight_reps') return sum + (s.weightKg * s.actualReps);
      return sum;
    },
    0
  );

  const isExerciseFullyCompleted = currentExercise && completedSetsForCurrentEx.length >= (currentExercise.targetSets || 4);
  const isLastExerciseInRoutine = safeExerciseIndex === routineExercises.length - 1;

  // Global Session Sets Progress
  const totalTargetSetsSession = useMemo(() => {
    return routineExercises.reduce((sum, e) => sum + (e.targetSets || 4), 0);
  }, [routineExercises]);

  const totalCompletedSetsSession = session.sets.filter(s => s.status !== 'skipped').length;
  const totalCompletedExercisesCount = routineExercises.filter(ex => {
    const done = session.sets.filter(s => s.exerciseId === ex.exerciseId && s.status !== 'skipped').length;
    return done >= (ex.targetSets || 4);
  }).length;

  const pendingExercisesCount = routineExercises.length - totalCompletedExercisesCount;
  const sessionProgressPercent = Math.min(100, Math.round((totalCompletedSetsSession / Math.max(1, totalTargetSetsSession)) * 100));

  const filteredExercisesBank = exerciseCatalog.filter(
    e => !e.isArchived && (
      e.name.toLowerCase().includes(searchExerciseTerm.toLowerCase()) ||
      e.muscleGroup.toLowerCase().includes(searchExerciseTerm.toLowerCase())
    )
  );

  const est1RM = calculateEstimated1RM(currentLoad, currentReps);

  // Progression comparison (Last Load vs Today's Draft Load)
  const progressionDiff = useMemo(() => {
    if (!historicalData.lastSet || historicalData.lastSet.weightKg <= 0 || pType !== 'weight_reps') {
      return null;
    }
    const diff = Number((currentLoad - historicalData.lastSet.weightKg).toFixed(1));
    return diff;
  }, [historicalData.lastSet, currentLoad, pType]);

  const formattedLastDate = useMemo(() => {
    if (!historicalData.lastSessionDate) return null;
    const d = new Date(historicalData.lastSessionDate);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase();
  }, [historicalData.lastSessionDate]);

  return (
    <div className={`flex flex-col bg-white border border-[#E5E7EB] rounded-3xl p-3 sm:p-5 shadow-2xl relative transition-all duration-200 ${isDualMode ? 'min-w-0' : 'w-full max-w-7xl mx-auto'}`}>
      
      {/* Online-First Live Workout Save Status Feedback Banner */}
      {saveFeedback && (
        <div className="absolute top-3 left-3 z-30 transition-all duration-300 animate-in fade-in slide-in-from-top-1">
          {saveFeedback.status === 'saved' ? (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs px-3 py-1.5 rounded-xl shadow-md flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="font-bold tracking-wide">{saveFeedback.message}</span>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-300 text-amber-950 text-xs px-3.5 py-2 rounded-xl shadow-lg flex items-center gap-3 pointer-events-auto">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="font-semibold text-[#111827]">{saveFeedback.message}</span>
              </div>
              {saveFeedback.retryAction && (
                <button
                  type="button"
                  onClick={async () => {
                    if (saveFeedback.retryAction) {
                      const retried = await saveFeedback.retryAction();
                      if (retried) {
                        setSaveFeedback({ status: 'saved', message: 'Série salva' });
                        if (saveFeedbackTimeoutRef.current) clearTimeout(saveFeedbackTimeoutRef.current);
                        saveFeedbackTimeoutRef.current = setTimeout(() => {
                          setSaveFeedback(null);
                        }, 2500);
                      }
                    }
                  }}
                  className="px-2.5 py-1 bg-[#1F2937] hover:bg-[#111827] active:scale-95 text-white font-bold rounded-lg transition-all text-[11px] uppercase tracking-wider"
                >
                  Tentar novamente
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Discreet PR Banner (Discreet & Non-blocking) */}
      {discreetPRToast && (
        <div className="absolute top-3 right-3 z-30 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-1">
          <div className="bg-amber-50 border border-amber-300 text-amber-900 text-xs px-3.5 py-2 rounded-xl shadow-lg flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-black uppercase tracking-wider">{discreetPRToast}</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CABEÇALHO DO ATENDIMENTO */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3 mb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <StudentAvatar
            name={studentName}
            photo={liveStudentPhoto}
            size="md"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-[#111827] tracking-wide truncate uppercase">
                {studentFirstName}
              </h2>
              {session.prsAchieved && session.prsAchieved.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black inline-flex items-center gap-1 shrink-0">
                  <Trophy className="w-3 h-3 text-amber-600" />
                  <span>{session.prsAchieved.length} PR</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-[#4B5563] truncate">
              {(workout.workoutLetter || session.workoutLetter) && (
                <span className="px-1.5 py-0.5 rounded bg-[#F3F4F6] text-[#1F2937] text-[10px] font-black uppercase shrink-0 border border-[#E5E7EB]">
                  Treino {workout.workoutLetter || session.workoutLetter}
                </span>
              )}
              <span className="truncate font-semibold text-[#1F2937]">{workout.workoutName || session.workoutName || session.routineTitle || 'Treino do Dia'}</span>
              <span className="text-[#9CA3AF]">•</span>
              <span className="text-[#1F2937] font-mono-nums font-bold shrink-0">
                {totalCompletedSetsSession}/{totalTargetSetsSession} séries
              </span>
            </div>
          </div>
        </div>

        {/* Master Timer + Pause + Actions + Finish Workout */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Local Sync State Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-[11px] font-bold text-[#374151]">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{pendingSyncCount > 0 ? 'Salvo localmente' : 'Salvo'}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-[#111827] font-mono-nums font-black text-sm sm:text-base">
            <Timer className="w-4 h-4 text-[#374151]" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>

          <button
            onClick={() => (isPaused ? resumeWorkout(sessionId) : pauseWorkout(sessionId))}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              isPaused ? 'bg-[#1F2937] text-white shadow-xs' : 'bg-white hover:bg-[#F3F4F6] text-[#1F2937] border border-[#D1D5DB]'
            }`}
            title={isPaused ? 'Continuar treino' : 'Pausar treino'}
          >
            {isPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4 text-[#1F2937]" />}
          </button>

          {/* Secondary Actions Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMoreActionsMenu(!showMoreActionsMenu)}
              className="w-9 h-9 rounded-xl bg-white hover:bg-[#F3F4F6] border border-[#D1D5DB] text-[#1F2937] flex items-center justify-center transition-all shadow-xs"
              title="Mais Opções"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMoreActionsMenu && (
              <div 
                className="absolute right-0 top-11 z-40 bg-white border border-[#E5E7EB] rounded-2xl p-1.5 shadow-2xl min-w-[220px] text-xs space-y-1 animate-in fade-in zoom-in-95"
                onMouseLeave={() => setShowMoreActionsMenu(false)}
              >
                <button
                  onClick={() => {
                    setShowMoreActionsMenu(false);
                    onShowPresentation(session);
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-[#1F2937] hover:bg-[#F3F4F6] flex items-center gap-2 font-bold"
                >
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>Apresentação Aluno</span>
                </button>

                {fullExerciseDetails && (
                  <button
                    onClick={() => {
                      setShowMoreActionsMenu(false);
                      setShowExecutionInfoModal(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-[#1F2937] hover:bg-[#F3F4F6] flex items-center gap-2 font-bold"
                  >
                    <Info className="w-4 h-4 text-blue-600" />
                    <span>Ver Execução & Dicas</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowMoreActionsMenu(false);
                    setShowQuickHistoryModal(true);
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-[#1F2937] hover:bg-[#F3F4F6] flex items-center gap-2 font-bold"
                >
                  <History className="w-4 h-4 text-emerald-600" />
                  <span>Histórico do Exercício</span>
                </button>

                <button
                  onClick={() => {
                    setShowMoreActionsMenu(false);
                    setIsReplacingExercise(true);
                    setShowExerciseBankSelector(true);
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-[#1F2937] hover:bg-[#F3F4F6] flex items-center gap-2 font-bold"
                >
                  <RefreshCw className="w-4 h-4 text-purple-600" />
                  <span>Substituir este Exercício</span>
                </button>

                {!isDualMode && onOpenAddSecondStudent && (
                  <button
                    onClick={() => {
                      setShowMoreActionsMenu(false);
                      onOpenAddSecondStudent();
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-[#1F2937] hover:bg-[#F3F4F6] flex items-center gap-2 font-bold"
                  >
                    <Plus className="w-4 h-4 text-[#374151]" />
                    <span>+ Adicionar 2º Aluno</span>
                  </button>
                )}

                <div className="border-t border-[#E5E7EB] my-1"></div>

                <button
                  onClick={() => {
                    setShowMoreActionsMenu(false);
                    setShowAbandonConfirmModal(true);
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-red-600 hover:bg-red-50 flex items-center gap-2 font-bold"
                >
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>Abandonar Treino</span>
                </button>
              </div>
            )}
          </div>

          {/* Secure Finish Button (Set apart from high-frequency operational controls) */}
          <button
            onClick={() => setShowFinishConfirmModal(true)}
            className="px-3 sm:px-4 py-2 rounded-xl bg-[#1F2937] hover:bg-[#111827] text-white font-bold font-display text-xs sm:text-sm tracking-wider transition-all shadow-md whitespace-nowrap ml-1 active:scale-95"
          >
            FINALIZAR TREINO
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#E5E7EB] h-2 rounded-full mb-3 overflow-hidden">
        <div 
          className="bg-[#1F2937] h-full transition-all duration-300 rounded-full"
          style={{ width: `${sessionProgressPercent}%` }}
        />
      </div>

      {/* ========================================================================= */}
      {/* DESCANSO BANNER (NÃO BLOQUEANTE) */}
      {/* ========================================================================= */}
      {isRestActive && (
        <div className="mb-3 bg-amber-50/70 border-2 border-[#1F2937] rounded-2xl p-3 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-[#1F2937] text-white flex items-center justify-center font-mono-nums font-black text-xl shrink-0 shadow-sm">
              {restTimerSeconds}s
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black uppercase text-[#111827] tracking-wider block">
                DESCANSO ATIVO · {studentFirstName}
              </span>
              <span className="text-xs text-[#374151] truncate block font-medium">
                {isGrouped ? 'Intervalo entre exercícios do bloco' : 'Próxima série pronta · Consulte histórico ou ajuste cargas'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => addRestSeconds(sessionId, -15)}
              className="px-2.5 py-2 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#1F2937] font-bold text-xs border border-[#D1D5DB] transition-all active:scale-95 min-h-[44px] shadow-xs"
              title="Diminuir 15 segundos"
            >
              −15s
            </button>
            <button
              onClick={() => skipRest(sessionId)}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#1F2937] font-black text-xs border border-[#D1D5DB] transition-all active:scale-95 min-h-[44px] shadow-xs"
            >
              PULAR
            </button>
            <button
              onClick={() => addRestSeconds(sessionId, 15)}
              className="px-2.5 py-2 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#1F2937] font-bold text-xs border border-[#D1D5DB] transition-all active:scale-95 min-h-[44px] shadow-xs"
              title="Aumentar 15 segundos"
            >
              +15s
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONSOLE PRINCIPAL — GRID 2 COLUNAS NO TABLET LANDSCAPE / DESKTOP */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* ======================================================================= */}
        {/* COLUNA ESQUERDA: LISTA COMPLETA DE EXERCÍCIOS DA SESSÃO */}
        {/* ======================================================================= */}
        <div className="hidden lg:flex lg:col-span-4 flex-col bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl p-3.5 space-y-3 sticky top-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2.5">
            <div className="flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-[#1F2937]" />
              <span className="text-xs uppercase font-black tracking-wider text-[#111827]">
                EXERCÍCIOS ({routineExercises.length})
              </span>
            </div>
            <span className="text-[11px] font-mono-nums font-bold text-[#4B5563]">
              {totalCompletedExercisesCount}/{routineExercises.length} concluídos
            </span>
          </div>

          {/* Exercise Items List */}
          <div className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {routineExercises.map((ex, idx) => {
              const isSelected = idx === safeExerciseIndex;
              const meta = exerciseMetaList[idx] || { badgeLabel: `${idx + 1}`, isGrouped: false };
              const completedCount = session.sets.filter(s => s.exerciseId === ex.exerciseId && s.status !== 'skipped').length;
              const targetSetsCount = ex.targetSets || 4;
              const isFinished = completedCount >= targetSetsCount;
              const isStarted = completedCount > 0 && !isFinished;

              return (
                <button
                  key={ex.id || `${ex.exerciseId}-${idx}`}
                  type="button"
                  onClick={() => handleJumpToExercise(idx)}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-white border-2 border-[#1F2937] shadow-sm ring-1 ring-[#1F2937]/10'
                      : isFinished
                      ? 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-50'
                      : 'bg-white border-[#E5E7EB] hover:border-[#9CA3AF] text-[#1F2937]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Status Badge: Completed (✓), Current (●), Pending (○) with Badge Label */}
                    <div className={`px-1.5 min-w-[28px] h-6 rounded-lg flex items-center justify-center font-mono-nums font-black text-[11px] shrink-0 ${
                      isFinished
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : isSelected
                        ? 'bg-[#1F2937] text-white'
                        : isStarted
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]'
                    }`}>
                      {isFinished ? '✓' : meta.badgeLabel}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold text-xs truncate block ${
                          isSelected ? 'text-[#111827] font-black' : isFinished ? 'text-emerald-900 font-bold' : 'text-[#1F2937]'
                        }`}>
                          {ex.exerciseName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-[#4B5563] truncate">
                        <span>{ex.muscleGroup}</span>
                        {meta.isGrouped && (
                          <span className="text-amber-600 font-black shrink-0">
                            • {meta.groupType === 'bi_set' ? 'Bi-Set' : meta.groupType === 'tri_set' ? 'Tri-Set' : 'Circuito'}
                          </span>
                        )}
                        {ex.isAddedDuringSession && (
                          <span className="text-[#374151] font-bold shrink-0">• Adicionado</span>
                        )}
                        {ex.replacedFromExerciseName && (
                          <span className="text-purple-700 font-bold shrink-0">• Substituído</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-2">
                    <span className={`text-[11px] font-mono-nums font-bold ${
                      isFinished ? 'text-emerald-700 font-black' : isSelected ? 'text-[#111827] font-black' : 'text-[#6B7280]'
                    }`}>
                      {completedCount}/{targetSetsCount}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Add Exercise to Session Button (Bottom of Left Column) */}
          <button
            onClick={() => {
              setIsReplacingExercise(false);
              setShowExerciseBankSelector(true);
            }}
            className="w-full py-2.5 rounded-xl bg-white hover:bg-[#F3F4F6] border border-[#D1D5DB] text-[#1F2937] font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            <Plus className="w-4 h-4 text-[#1F2937]" />
            <span>+ ADICIONAR EXERCÍCIO</span>
          </button>
        </div>

        {/* ======================================================================= */}
        {/* COLUNA DIREITA: CONSOLE DO EXERCÍCIO ATUAL */}
        {/* ======================================================================= */}
        <div className="lg:col-span-8 flex flex-col space-y-3 min-w-0">
          
          {/* Bi-Set / Tri-Set / Circuit Interactive Queue */}
          {isGrouped && (
            <div className="bg-[#F9FAFB] border-2 border-[#1F2937] rounded-2xl p-3.5 space-y-3 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E7EB] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-[#1F2937] text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                    <Split className="w-3.5 h-3.5 text-white" />
                    <span>{currentGroupTitle}</span>
                  </span>
                  <span className="text-xs font-black text-[#111827] uppercase tracking-wide">
                    RODADA {currentSetIndex} DE {currentExercise.targetSets || 3}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#4B5563]">
                  <span className="bg-white px-2 py-0.5 rounded-lg border border-[#D1D5DB] text-[#374151]">
                    Troca: <strong className="text-[#111827] font-bold">{currentExercise.restBetweenExercises ?? 0}s</strong>
                  </span>
                  <span className="bg-white px-2 py-0.5 rounded-lg border border-[#D1D5DB] text-[#374151]">
                    Descanso Pós-Rodada: <strong className="text-[#111827] font-bold">{currentExercise.restAfterRound ?? currentExercise.restSeconds ?? 60}s</strong>
                  </span>
                </div>
              </div>

              {/* Group Members Navigation Cards */}
              <div className={`grid gap-2 ${currentGroupMembers.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
                {currentGroupMembers.map((gEx, gIdx) => {
                  const isActive = gEx.id === currentExercise.id;
                  const globalIdx = routineExercises.findIndex(e => e.id === gEx.id);
                  const gMeta = exerciseMetaList[globalIdx] || { badgeLabel: `${currentMeta.groupLetter || 'A'}${gIdx + 1}` };
                  const completedCount = session.sets.filter(s => s.exerciseId === gEx.exerciseId && s.status !== 'skipped').length;
                  const targetCount = gEx.targetSets || 3;
                  const isDoneAll = completedCount >= targetCount;
                  const isDoneInCurrentRound = completedCount >= currentSetIndex;

                  return (
                    <button
                      key={gEx.id}
                      type="button"
                      onClick={() => handleJumpToExercise(globalIdx)}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isActive
                          ? 'bg-white border-2 border-[#1F2937] shadow-sm ring-1 ring-[#1F2937]/10'
                          : isDoneAll
                          ? 'bg-emerald-50/70 border-emerald-200 text-[#1F2937] hover:bg-emerald-50'
                          : 'bg-white border-[#E5E7EB] text-[#374151] hover:border-[#9CA3AF]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-6 h-6 rounded-lg text-[11px] font-mono-nums font-black flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-[#1F2937] text-white'
                            : isDoneInCurrentRound
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]'
                        }`}>
                          {isDoneInCurrentRound ? '✓' : gMeta.badgeLabel}
                        </span>
                        <div className="min-w-0">
                          <span className={`text-xs truncate block ${isActive ? 'font-black text-[#111827]' : 'font-bold text-[#1F2937]'}`}>
                            {gEx.exerciseName}
                          </span>
                          <span className="text-[10px] text-[#4B5563] block truncate">
                            {formatPrescriptionSummary(gEx)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-1.5 font-mono-nums text-[11px] font-bold">
                        <span className={isDoneAll ? 'text-emerald-700 font-black' : isActive ? 'text-[#111827] font-black' : 'text-[#6B7280]'}>
                          {completedCount}/{targetCount}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* CARD DO EXERCÍCIO ATUAL */}
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 space-y-3">
            
            {/* Top Navigation & Mobile Selector */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="px-2.5 py-0.5 rounded-lg bg-white border border-[#D1D5DB] text-[#111827] text-[10px] font-black uppercase tracking-wider shrink-0 shadow-xs">
                  {currentExercise?.muscleGroup}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-white border border-[#D1D5DB] text-[#374151] text-[10px] font-bold uppercase shadow-xs">
                  {pType === 'weight_reps' ? 'Carga + Reps' :
                   pType === 'reps' ? 'Apenas Reps' :
                   pType === 'isometric' ? 'Isometria' :
                   pType === 'duration' ? 'Tempo' :
                   pType === 'weight_duration' ? 'Carga + Tempo' :
                   pType === 'distance' ? 'Distância' :
                   pType === 'duration_distance' ? 'Tempo + Distância' : 'Cardio'}
                </span>
                {currentExercise?.isAddedDuringSession && (
                  <span className="px-2 py-0.5 rounded-lg bg-white border border-[#D1D5DB] text-[#1F2937] text-[10px] font-bold uppercase shadow-xs">
                    Adicionado nesta sessão
                  </span>
                )}
                {currentExercise?.replacedFromExerciseName && (
                  <span className="px-2 py-0.5 rounded-lg bg-purple-50 text-purple-900 text-[10px] font-bold border border-purple-200 uppercase truncate max-w-[200px]" title={`Substituiu ${currentExercise.replacedFromExerciseName}`}>
                    Substituiu {currentExercise.replacedFromExerciseName}
                  </span>
                )}
              </div>

              {/* Prev / Next & Mobile Drawer Trigger */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handlePrevExercise}
                  disabled={safeExerciseIndex === 0}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#1F2937] border border-[#D1D5DB] disabled:opacity-30 text-xs font-bold flex items-center gap-1 transition-all min-h-[38px] shadow-xs"
                  title="Exercício Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">ANT</span>
                </button>

                {/* Mobile & Tablet Portrait: Exercise List Button */}
                <button
                  onClick={() => setShowExerciseListDrawer(true)}
                  className="lg:hidden px-3 py-1.5 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#1F2937] border border-[#D1D5DB] text-xs font-bold flex items-center gap-1.5 transition-all min-h-[38px] shadow-xs"
                >
                  <ListOrdered className="w-4 h-4 text-[#1F2937]" />
                  <span className="font-mono-nums font-black">{safeExerciseIndex + 1}/{routineExercises.length}</span>
                </button>

                <button
                  onClick={handleNextExercise}
                  disabled={safeExerciseIndex >= routineExercises.length - 1}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#1F2937] border border-[#D1D5DB] disabled:opacity-30 text-xs font-bold flex items-center gap-1 transition-all min-h-[38px] shadow-xs"
                  title="Próximo Exercício"
                >
                  <span className="hidden sm:inline">PRÓX</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Exercise Main Title & Secondary Info */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-xl sm:text-2xl font-black text-[#111827] tracking-tight uppercase">
                  {currentExercise?.exerciseName}
                </h3>
                {currentExercise?.notes && (
                  <p className="text-xs text-[#4B5563] italic truncate mt-0.5">
                    Obs da rotina: {currentExercise.notes}
                  </p>
                )}
              </div>

              {/* Action Buttons: Execution details & Quick Replace */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    setIsReplacingExercise(true);
                    setShowExerciseBankSelector(true);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#1F2937] border border-[#D1D5DB] text-[11px] font-bold flex items-center gap-1 transition-all shadow-xs"
                  title="Substituir este exercício na sessão atual"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-purple-600" />
                  <span className="hidden sm:inline">Substituir</span>
                </button>

                {fullExerciseDetails && (
                  <button
                    onClick={() => setShowExecutionInfoModal(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#1F2937] border border-[#D1D5DB] text-[11px] font-bold flex items-center gap-1 transition-all shadow-xs"
                  >
                    <Info className="w-3.5 h-3.5 text-blue-600" />
                    <span className="hidden sm:inline">Dicas</span>
                  </button>
                )}
              </div>
            </div>

            {/* PRESCRIÇÃO */}
            <div className="flex items-center justify-between bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-[#4B5563] uppercase font-bold text-[10px]">Prescrição:</span>
                <span className="font-black text-[#111827] font-mono-nums">
                  {formatPrescriptionSummary(currentExercise)}
                </span>
                {currentExercise.restSeconds > 0 && (
                  <span className="text-[#4B5563] text-[11px] font-medium">
                    · {currentExercise.restSeconds}s descanso
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleAddExtraSet}
                  className="px-2 py-0.5 rounded bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#1F2937] text-[10px] font-bold border border-[#D1D5DB] transition-all shadow-xs"
                  title="Adicionar série extra para este exercício na sessão"
                >
                  + SÉRIE
                </button>
                {(currentExercise.targetSets || 4) > (currentExercise.originalPrescriptionSets ?? 4) && (
                  <button
                    onClick={handleRemoveExtraSet}
                    className="px-2 py-0.5 rounded bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#1F2937] text-[10px] font-bold border border-[#D1D5DB] transition-all shadow-xs"
                    title="Remover série extra não realizada"
                  >
                    − SÉRIE
                  </button>
                )}
              </div>
            </div>

            {/* ÚLTIMA EXECUÇÃO REAL (studentId + exerciseId) & HISTÓRICO RÁPIDO */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <History className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-[#4B5563]">
                      ÚLTIMA EXECUÇÃO {formattedLastDate ? `· ${formattedLastDate}` : ''}
                    </span>
                  </div>
                  {historicalData.lastSet ? (
                    <div className="text-xs font-mono-nums font-black text-[#111827] truncate">
                      {historicalData.lastSet.weightKg > 0 ? `${historicalData.lastSet.weightKg} kg · ` : ''}
                      {historicalData.lastSessionSets.length > 0
                        ? historicalData.lastSessionSets.map(st => st.actualReps || st.durationSeconds || 0).join(' / ') + ' reps'
                        : `${historicalData.lastSet.actualReps} reps`}
                    </div>
                  ) : (
                    <div className="text-xs text-[#6B7280] italic font-medium">
                      SEM HISTÓRICO ANTERIOR
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowQuickHistoryModal(true)}
                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#F3F4F6] text-[#1F2937] hover:text-[#111827] border border-[#D1D5DB] text-[11px] font-black uppercase tracking-wider shrink-0 transition-all shadow-xs"
              >
                VER HISTÓRICO
              </button>
            </div>

            {/* PROGRESSÃO OBJETIVA (Sem IA) */}
            {progressionDiff !== null && historicalData.lastSet && (
              <div className="bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2 flex items-center justify-between text-xs shadow-xs">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-[#1F2937]" />
                  <span className="text-[10px] uppercase font-bold text-[#4B5563]">PROGRESSÃO:</span>
                  <span className="text-[#4B5563]">
                    Última: <strong className="text-[#111827] font-mono-nums">{historicalData.lastSet.weightKg} kg</strong>
                  </span>
                  <span className="text-[#9CA3AF]">→</span>
                  <span className="text-[#111827]">
                    Hoje: <strong className="font-mono-nums font-black text-[#111827]">{currentLoad} kg</strong>
                  </span>
                </div>

                <div>
                  {progressionDiff > 0 ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono-nums font-black text-[11px]">
                      +{progressionDiff} kg
                    </span>
                  ) : progressionDiff === 0 ? (
                    <span className="px-2 py-0.5 rounded bg-[#F3F4F6] text-[#4B5563] font-bold text-[10px] uppercase border border-[#E5E7EB]">
                      Mesma Carga
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-[#F3F4F6] text-[#1F2937] font-mono-nums font-bold text-[11px] border border-[#E5E7EB]">
                      {progressionDiff} kg
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* SÉRIE ATUAL / RODADA STEPPER */}
            <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-black tracking-wider text-[#111827]">
                  {isGrouped 
                    ? `RODADA ${currentSetIndex} DE ${currentExercise?.targetSets || 3}`
                    : `SÉRIE ${currentSetIndex} DE ${currentExercise?.targetSets || 4}`}
                </span>
                {isGrouped && (
                  <span className="text-[10px] text-amber-900 font-bold bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                    {currentMeta.badgeLabel}
                  </span>
                )}
              </div>

              {/* Stepper Buttons for navigating sets / rounds */}
              <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                {Array.from({ length: Math.max(currentExercise?.targetSets || (isGrouped ? 3 : 4), completedSetsForCurrentEx.length) }).map((_, idx) => {
                  const setNum = idx + 1;
                  const completedSet = completedSetsForCurrentEx.find(s => s.setNumber === setNum);
                  const isCurrent = currentSetIndex === setNum && !completedSet;
                  const isCompleted = !!completedSet;

                  return (
                    <button
                      key={setNum}
                      onClick={() => {
                        if (completedSet) {
                          setEditingSet(completedSet);
                        } else {
                          updateActiveWorkout(sessionId, prev => ({
                            ...prev,
                            currentSetIndex: setNum
                          }));
                        }
                      }}
                      className={`w-7 h-7 rounded-lg text-xs font-mono-nums font-black flex items-center justify-center transition-all ${
                        isCurrent
                          ? 'bg-[#1F2937] text-white ring-2 ring-[#1F2937] shadow-xs'
                          : isCompleted
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-white text-[#4B5563] border border-[#D1D5DB] hover:border-[#9CA3AF]'
                      }`}
                      title={isCompleted ? `Série ${setNum}: ${formatSetMetric(completedSet)} (Clique para editar)` : `Série ${setNum}`}
                    >
                      {isCompleted ? '✓' : setNum}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Feedback if Exercise is Fully Completed */}
          {isExerciseFullyCompleted && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in shadow-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-black uppercase text-emerald-950 block truncate">
                    {currentExercise.exerciseName} Concluído!
                  </span>
                  <span className="text-[11px] text-emerald-800 block font-mono-nums font-bold">
                    {completedSetsForCurrentEx.length} séries concluídas com sucesso
                  </span>
                </div>
              </div>

              <button
                onClick={isLastExerciseInRoutine ? () => setShowFinishConfirmModal(true) : handleNextExercise}
                className="px-4 py-2.5 rounded-xl bg-[#1F2937] hover:bg-[#111827] text-white font-black font-display text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shrink-0 active:scale-95 min-h-[44px]"
              >
                <span>{isLastExerciseInRoutine ? 'FINALIZAR TREINO' : 'PRÓXIMO EXERCÍCIO'}</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          )}

          {/* ===================================================================== */}
          {/* CONTROLES TOUCH DE CARGA & REPETIÇÕES (>= 44px) */}
          {/* ===================================================================== */}
          {pType === 'weight_reps' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* CARGA (KG) */}
              <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-black tracking-wider text-[#374151] flex items-center gap-1.5">
                    <Dumbbell className="w-4 h-4 text-[#1F2937]" />
                    CARGA (KG)
                  </span>
                  <span className="text-[11px] text-[#4B5563] font-mono-nums font-bold">
                    1RM est: ~{est1RM} kg
                  </span>
                </div>

                {/* Main Large Touch Controls for Load */}
                <div className="flex items-center justify-center gap-2 my-1">
                  <button
                    type="button"
                    onClick={() => setCurrentLoad(prev => Math.max(0, Number((prev - 2.5).toFixed(1))))}
                    className="w-12 h-12 rounded-2xl bg-white hover:bg-[#F3F4F6] text-[#111827] font-black text-2xl flex items-center justify-center shrink-0 border border-[#D1D5DB] active:scale-95 transition-all min-w-[44px] min-h-[44px] shadow-xs"
                  >
                    −
                  </button>

                  <div className="flex items-baseline justify-center gap-1 bg-white border-2 border-[#D1D5DB] focus-within:border-[#1F2937] rounded-2xl px-4 py-2 flex-1 max-w-[200px] shadow-xs">
                    <input
                      type="number"
                      step="0.5"
                      inputMode="decimal"
                      value={currentLoad || ''}
                      onChange={e => setCurrentLoad(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full text-center bg-transparent text-3xl sm:text-4xl font-black font-mono-nums text-[#111827] focus:outline-none tracking-tight"
                      placeholder="0"
                    />
                    <span className="text-sm font-black font-display text-[#4B5563]">KG</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentLoad(prev => Math.max(0, Number((prev + 2.5).toFixed(1))))}
                    className="w-12 h-12 rounded-2xl bg-white hover:bg-[#F3F4F6] text-[#111827] font-black text-2xl flex items-center justify-center shrink-0 border border-[#D1D5DB] active:scale-95 transition-all min-w-[44px] min-h-[44px] shadow-xs"
                  >
                    +
                  </button>
                </div>

                {/* Quick Step Buttons */}
                <div className="grid grid-cols-6 gap-1">
                  {[-5, -2.5, -1, 1, 2.5, 5].map(delta => (
                    <button
                      key={delta}
                      type="button"
                      onClick={() => setCurrentLoad(prev => Math.max(0, Number((prev + delta).toFixed(1))))}
                      className="py-2 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#111827] font-mono-nums font-black text-xs border border-[#D1D5DB] active:scale-95 min-h-[40px] shadow-xs"
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </button>
                  ))}
                </div>

                {/* Quick Use Last Weight Button */}
                {historicalData?.lastSet && historicalData.lastSet.weightKg > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (historicalData.lastSet) {
                        setCurrentLoad(historicalData.lastSet.weightKg);
                        setCurrentReps(historicalData.lastSet.actualReps || currentReps);
                      }
                    }}
                    className="w-full py-1.5 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#1F2937] hover:text-[#111827] text-[11px] font-bold border border-[#D1D5DB] transition-all shadow-xs"
                  >
                    Usar Carga Anterior: {historicalData.lastSet.weightKg} kg
                  </button>
                )}
              </div>

              {/* REPETIÇÕES */}
              <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-black tracking-wider text-[#374151] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    REPETIÇÕES
                  </span>
                  <span className="text-[11px] text-[#4B5563] font-bold">
                    Meta: {currentExercise?.targetRepsMin || 8}–{currentExercise?.targetRepsMax || 12}
                  </span>
                </div>

                {/* Main Large Touch Controls for Reps */}
                <div className="flex items-center justify-center gap-2 my-1">
                  <button
                    type="button"
                    onClick={() => setCurrentReps(prev => Math.max(1, prev - 1))}
                    className="w-12 h-12 rounded-2xl bg-white hover:bg-[#F3F4F6] text-[#111827] font-black text-2xl flex items-center justify-center shrink-0 border border-[#D1D5DB] active:scale-95 transition-all min-w-[44px] min-h-[44px] shadow-xs"
                  >
                    −
                  </button>

                  <div className="flex items-baseline justify-center gap-1 bg-white border-2 border-[#D1D5DB] focus-within:border-[#1F2937] rounded-2xl px-4 py-2 flex-1 max-w-[200px] shadow-xs">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={currentReps || ''}
                      onChange={e => setCurrentReps(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full text-center bg-transparent text-3xl sm:text-4xl font-black font-mono-nums text-[#111827] focus:outline-none tracking-tight"
                      placeholder="10"
                    />
                    <span className="text-sm font-black font-display text-[#4B5563]">REPS</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentReps(prev => prev + 1)}
                    className="w-12 h-12 rounded-2xl bg-white hover:bg-[#F3F4F6] text-[#111827] font-black text-2xl flex items-center justify-center shrink-0 border border-[#D1D5DB] active:scale-95 transition-all min-w-[44px] min-h-[44px] shadow-xs"
                  >
                    +
                  </button>
                </div>

                {/* Quick Reps Presets */}
                <div className="grid grid-cols-5 gap-1">
                  {[6, 8, 10, 12, 15].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setCurrentReps(r)}
                      className={`py-2 rounded-xl font-mono-nums font-black text-xs transition-all active:scale-95 min-h-[40px] shadow-xs ${
                        currentReps === r
                          ? 'bg-[#1F2937] text-white shadow-sm'
                          : 'bg-white hover:bg-[#F3F4F6] text-[#111827] border border-[#D1D5DB]'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {/* RPE & Quick Note row */}
                {renderRpeAndNoteRow()}
              </div>
            </div>
          )}

          {/* APENAS REPETIÇÕES (Peso Corporal) */}
          {pType === 'reps' && (
            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-black tracking-wider text-[#374151] flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#1F2937]" />
                  REPETIÇÕES (PESO CORPORAL)
                </span>
                <span className="text-xs text-[#4B5563] font-mono-nums font-bold">
                  Meta: {currentExercise?.targetRepsMin || 10}–{currentExercise?.targetRepsMax || 15} reps
                </span>
              </div>

              <div className="flex items-center justify-center gap-4 my-2">
                <button
                  type="button"
                  onClick={() => setCurrentReps(prev => Math.max(1, prev - 1))}
                  className="w-14 h-14 rounded-2xl bg-white hover:bg-[#F3F4F6] text-[#111827] font-black text-2xl flex items-center justify-center shrink-0 border border-[#D1D5DB] active:scale-95 transition-all min-w-[48px] min-h-[48px] shadow-xs"
                >
                  −
                </button>

                <div className="bg-white border-2 border-[#D1D5DB] focus-within:border-[#1F2937] rounded-2xl px-6 py-3 w-40 text-center shadow-xs">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={currentReps || ''}
                    onChange={e => setCurrentReps(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-center bg-transparent text-4xl sm:text-5xl font-black font-mono-nums text-[#111827] focus:outline-none tracking-tight"
                    placeholder="10"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentReps(prev => prev + 1)}
                  className="w-14 h-14 rounded-2xl bg-white hover:bg-[#F3F4F6] text-[#111827] font-black text-2xl flex items-center justify-center shrink-0 border border-[#D1D5DB] active:scale-95 transition-all min-w-[48px] min-h-[48px] shadow-xs"
                >
                  +
                </button>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {[8, 10, 12, 15, 20, 25].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setCurrentReps(r)}
                    className={`py-2 rounded-xl font-mono-nums font-black text-sm transition-all active:scale-95 min-h-[44px] shadow-xs ${
                      currentReps === r
                        ? 'bg-[#1F2937] text-white'
                        : 'bg-white hover:bg-[#F3F4F6] text-[#111827] border border-[#D1D5DB]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {renderRpeAndNoteRow()}
            </div>
          )}

          {/* ISOMETRIA & TEMPO (Stopwatch Integrado) */}
          {(pType === 'isometric' || pType === 'duration' || pType === 'weight_duration') && (
            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-black tracking-wider text-[#374151] flex items-center gap-1.5">
                  <Timer className="w-4 h-4 text-[#1F2937]" />
                  {pType === 'isometric' ? 'ISOMETRIA / TEMPO ESTÁTICO' : 'TEMPO DE EXECUÇÃO'}
                </span>
                <span className="text-xs text-[#4B5563] font-mono-nums font-bold">
                  Meta: {currentExercise?.targetDurationSeconds || 30}s
                </span>
              </div>

              {pType === 'weight_duration' && (
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 flex items-center justify-between shadow-xs">
                  <span className="text-xs font-bold text-[#374151] uppercase">Carga Utilizada (kg):</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      value={currentLoad || ''}
                      onChange={e => setCurrentLoad(parseFloat(e.target.value) || 0)}
                      className="w-24 bg-white border border-[#D1D5DB] rounded-lg px-3 py-1.5 text-center font-black text-[#111827]"
                      placeholder="0"
                    />
                    <span className="text-xs font-bold text-[#4B5563]">KG</span>
                  </div>
                </div>
              )}

              {/* Stopwatch Display */}
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-[#E5E7EB] shadow-xs">
                <div className="text-5xl sm:text-6xl font-mono-nums font-black text-[#111827] tracking-tight mb-3">
                  {isSetTimerRunning ? `${setTimerSeconds}s` : `${currentDurationSec}s`}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSetTimerRunning(!isSetTimerRunning)}
                    className={`px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95 min-h-[44px] ${
                      isSetTimerRunning 
                        ? 'bg-amber-500 hover:bg-amber-600 text-black' 
                        : 'bg-[#1F2937] hover:bg-[#111827] text-white'
                    }`}
                  >
                    {isSetTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                    <span>{isSetTimerRunning ? 'Pausar Tempo' : 'Iniciar Contagem'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSetTimerRunning(false);
                      setSetTimerSeconds(0);
                      setCurrentDurationSec(currentExercise.targetDurationSeconds || 30);
                    }}
                    className="p-3 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#1F2937] border border-[#D1D5DB] min-h-[44px] shadow-xs"
                    title="Reiniciar tempo"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick Adjustment Buttons */}
              <div className="grid grid-cols-6 gap-2">
                {[-10, -5, -1, 1, 5, 10].map(delta => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => setCurrentDurationSec(prev => Math.max(1, prev + delta))}
                    className="py-2.5 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#111827] font-mono-nums font-black text-xs border border-[#D1D5DB] active:scale-95 min-h-[44px] shadow-xs"
                  >
                    {delta > 0 ? `+${delta}s` : `${delta}s`}
                  </button>
                ))}
              </div>

              {renderRpeAndNoteRow()}
            </div>
          )}

          {/* DISTÂNCIA & CARDIO */}
          {(pType === 'distance' || pType === 'duration_distance' || pType === 'cardio') && (
            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-black tracking-wider text-[#374151] flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-[#1F2937]" />
                  {pType === 'cardio' ? 'CARDIO / ESTEIRA' : 'DISTÂNCIA & METAS'}
                </span>
                <span className="text-xs text-[#4B5563] font-mono-nums font-bold">
                  Meta: {formatPrescriptionSummary(currentExercise)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 space-y-2 shadow-xs">
                  <label className="block text-[10px] font-bold uppercase text-[#4B5563]">
                    Distância Realizada
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={currentDistanceUnit === 'km' ? '0.1' : '10'}
                      value={currentDistance || ''}
                      onChange={e => setCurrentDistance(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-[#D1D5DB] rounded-xl px-3 py-2 text-xl font-mono-nums font-black text-[#111827] text-center min-h-[44px]"
                    />
                    <button
                      type="button"
                      onClick={() => setCurrentDistanceUnit(currentDistanceUnit === 'meters' ? 'km' : 'meters')}
                      className="px-3 py-2 rounded-xl bg-[#1F2937] text-white font-bold text-xs uppercase shrink-0 min-h-[44px]"
                    >
                      {currentDistanceUnit === 'km' ? 'KM' : 'M'}
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 space-y-2 shadow-xs">
                  <label className="block text-[10px] font-bold uppercase text-[#4B5563]">
                    Tempo de Execução (Segundos)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={currentDurationSec || ''}
                      onChange={e => setCurrentDurationSec(parseInt(e.target.value) || 0)}
                      className="w-full bg-white border border-[#D1D5DB] rounded-xl px-3 py-2 text-xl font-mono-nums font-black text-[#111827] text-center min-h-[44px]"
                    />
                    <span className="text-xs font-bold text-[#4B5563] shrink-0">
                      {currentDurationSec >= 60 ? `~${Math.round(currentDurationSec / 60)}min` : `${currentDurationSec}s`}
                    </span>
                  </div>
                </div>

                {pType === 'cardio' && (
                  <>
                    <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 space-y-1 shadow-xs">
                      <label className="block text-[10px] font-bold uppercase text-[#4B5563]">
                        Velocidade (km/h)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={currentSpeedKmh ?? ''}
                        onChange={e => setCurrentSpeedKmh(e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="Ex: 9.0"
                        className="w-full bg-white border border-[#D1D5DB] rounded-xl px-3 py-2 text-center font-black text-[#111827] text-sm"
                      />
                    </div>

                    <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 space-y-1 shadow-xs">
                      <label className="block text-[10px] font-bold uppercase text-[#4B5563]">
                        Inclinação (%)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={currentInclinePct ?? ''}
                        onChange={e => setCurrentInclinePct(e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="Ex: 2.0"
                        className="w-full bg-white border border-[#D1D5DB] rounded-xl px-3 py-2 text-center font-black text-[#111827] text-sm"
                      />
                    </div>
                  </>
                )}
              </div>

              {renderRpeAndNoteRow()}
            </div>
          )}

          {/* Quick Notes Input Drawer / Inline Field */}
          {showNoteInput && (
            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl p-3.5 space-y-2 animate-in fade-in shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-[#374151]">
                  Observação da Série
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  {['MANTER CARGA', 'AUMENTAR PRÓXIMA', 'REDUZIR CARGA', 'REVER EXECUÇÃO', 'Drop-set', 'Falha'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSetNote(prev => prev ? `${prev} · ${tag}` : tag)}
                      className="px-2 py-0.5 rounded-md bg-white hover:bg-[#F3F4F6] text-[10px] font-bold text-[#1F2937] border border-[#D1D5DB] shadow-xs"
                    >
                      +{tag}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={setNote}
                onChange={e => setSetNote(e.target.value)}
                placeholder="Ex: Manter 80 kg, pegada aberta, falha na 9ª..."
                className="w-full bg-white border border-[#D1D5DB] rounded-xl p-3 text-xs text-[#111827] placeholder-[#6B7280] focus:outline-none focus:border-[#1F2937] shadow-xs"
              />
            </div>
          )}

          {/* ===================================================================== */}
          {/* BOTÃO OPERACIONAL PRINCIPAL: CONCLUIR SÉRIE */}
          {/* ===================================================================== */}
          <button
            onClick={handleCompleteSet}
            disabled={isSubmittingSet}
            className="w-full py-4 sm:py-5 rounded-2xl bg-[#1F2937] hover:bg-[#111827] text-white font-black font-display text-base sm:text-lg uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-80 disabled:cursor-not-allowed min-h-[52px]"
          >
            <Check className="w-6 h-6 stroke-[3]" />
            <span>
              {isGrouped 
                ? `CONCLUIR SÉRIE (${currentMeta.badgeLabel} · RODADA ${currentSetIndex})`
                : `CONCLUIR SÉRIE ${currentSetIndex}`}
            </span>
          </button>

          {/* ===================================================================== */}
          {/* SÉRIES CONCLUÍDAS DO EXERCÍCIO ATUAL */}
          {/* ===================================================================== */}
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
              <span className="text-[11px] uppercase font-black text-[#111827] tracking-wider">
                SÉRIES CONCLUÍDAS ({completedSetsForCurrentEx.length}/{currentExercise?.targetSets || (isGrouped ? 3 : 4)})
              </span>
              {pType === 'weight_reps' && totalExerciseVolume > 0 && (
                <span className="text-[11px] text-[#4B5563] font-mono-nums">
                  Volume: <strong className="text-[#111827] font-black">{formatWeight(totalExerciseVolume)}</strong>
                </span>
              )}
            </div>

            {completedSetsForCurrentEx.length === 0 ? (
              <p className="text-xs text-[#6B7280] italic py-3 text-center">
                Nenhuma série registrada para este exercício ainda.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {completedSetsForCurrentEx.map((s, idx) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-[#E5E7EB] text-xs shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-mono-nums font-black flex items-center justify-center text-xs border border-emerald-300">
                        {idx + 1}
                      </span>
                      <span className="font-black text-[#111827] font-mono-nums text-sm">
                        {formatSetMetric(s)}
                      </span>
                      {s.rpe && (
                        <span className="px-1.5 py-0.5 rounded bg-[#F3F4F6] text-[#1F2937] text-[10px] font-mono-nums font-bold border border-[#E5E7EB]">
                          RPE {s.rpe}
                        </span>
                      )}
                      {s.notes && (
                        <span className="text-[#4B5563] text-[10px] italic truncate max-w-[140px]">
                          "{s.notes}"
                        </span>
                      )}
                      {s.isPR && (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black flex items-center gap-1">
                          <Trophy className="w-2.5 h-2.5 text-amber-600" /> PR
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditingSet(s)}
                        className="p-1.5 text-[#4B5563] hover:text-[#111827] rounded-lg hover:bg-[#F3F4F6]"
                        title="Editar série"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteRecordedSet(sessionId, s.id)}
                        className="p-1.5 text-[#4B5563] hover:text-red-600 rounded-lg hover:bg-red-50"
                        title="Excluir série"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* DRAWER: LISTA COMPLETA DE EXERCÍCIOS (MOBILE & TABLET PORTRAIT) */}
      {/* ========================================================================= */}
      {showExerciseListDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-5 max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-[#E5E7EB] pb-3">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-5 h-5 text-[#1F2937]" />
                <h3 className="text-base font-black text-[#111827] uppercase">
                  Exercícios da Sessão ({routineExercises.length})
                </h3>
              </div>
              <button onClick={() => setShowExerciseListDrawer(false)} className="p-1 text-[#6B7280] hover:text-[#111827]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {routineExercises.map((ex, idx) => {
                const isSelected = idx === safeExerciseIndex;
                const meta = exerciseMetaList[idx] || { badgeLabel: `${idx + 1}`, isGrouped: false };
                const completedCount = session.sets.filter(s => s.exerciseId === ex.exerciseId && s.status !== 'skipped').length;
                const targetSetsCount = ex.targetSets || (meta.isGrouped ? 3 : 4);
                const isFinished = completedCount >= targetSetsCount;

                return (
                  <button
                    key={ex.id || idx}
                    onClick={() => handleJumpToExercise(idx)}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-white border-2 border-[#1F2937] shadow-sm ring-1 ring-[#1F2937]/10'
                        : isFinished
                        ? 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-50'
                        : 'bg-white border-[#E5E7EB] hover:border-[#9CA3AF]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`px-2 min-w-[32px] h-7 rounded-xl flex items-center justify-center font-mono-nums font-black text-xs shrink-0 ${
                        isFinished 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                          : isSelected 
                          ? 'bg-[#1F2937] text-white' 
                          : 'bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]'
                      }`}>
                        {isFinished ? '✓' : meta.badgeLabel}
                      </div>

                      <div className="min-w-0">
                        <span className="font-black text-[#111827] text-xs sm:text-sm block truncate">
                          {ex.exerciseName}
                        </span>
                        <span className="text-[11px] text-[#4B5563]">
                          {ex.muscleGroup} • {formatPrescriptionSummary(ex)}
                          {meta.isGrouped && (
                            <span className="text-amber-900 font-bold ml-1">
                              • {meta.groupType === 'bi_set' ? 'Bi-Set' : meta.groupType === 'tri_set' ? 'Tri-Set' : 'Circuito'}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-xs font-mono-nums font-bold ${
                        isFinished ? 'text-emerald-700 font-black' : 'text-[#6B7280]'
                      }`}>
                        {completedCount}/{targetSetsCount}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                setShowExerciseListDrawer(false);
                setIsReplacingExercise(false);
                setShowExerciseBankSelector(true);
              }}
              className="w-full mt-4 py-3 rounded-xl bg-white hover:bg-[#F3F4F6] border border-[#D1D5DB] text-[#111827] font-black text-xs flex items-center justify-center gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4 text-[#1F2937]" />
              <span>Adicionar Exercício do Banco</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: HISTÓRICO RÁPIDO DO EXERCÍCIO (DADOS REAIS POR SÉRIE) */}
      {/* ========================================================================= */}
      {showQuickHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-5 max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-3 border-b border-[#E5E7EB] pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-black text-[#111827] uppercase truncate max-w-[280px]">
                    Histórico • {currentExercise?.exerciseName}
                  </h3>
                  <span className="text-[11px] text-[#4B5563]">Aluno: {studentName}</span>
                </div>
              </div>
              <button onClick={() => setShowQuickHistoryModal(false)} className="p-1 text-[#6B7280] hover:text-[#111827]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {historicalData.recentSets.length === 0 ? (
                <div className="text-center py-8 text-[#6B7280]">
                  <p>Nenhum treino anterior registrado para este exercício com este aluno.</p>
                </div>
              ) : (
                historicalData.recentSets.map((sessionLog, sIdx) => (
                  <div key={sIdx} className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl p-3 shadow-xs">
                    <div className="flex items-center justify-between text-[11px] text-[#4B5563] mb-2 pb-1.5 border-b border-[#E5E7EB]">
                      <span className="font-black text-[#111827]">
                        {new Date(sessionLog.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {sessionLog.sets.map((st, setIdx) => (
                        <div key={setIdx} className="flex items-center justify-between text-xs font-mono-nums">
                          <span className="text-[#4B5563]">Série {st.setNumber}:</span>
                          <span className="font-black text-[#111827]">{formatSetMetric(st)}</span>
                          {st.rpe ? <span className="text-[#4B5563] font-bold">@ RPE {st.rpe}</span> : <span />}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowQuickHistoryModal(false)}
              className="w-full mt-4 py-2.5 bg-[#1F2937] hover:bg-[#111827] text-white font-black text-xs rounded-xl shadow-xs"
            >
              Fechar Histórico
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VER EXECUÇÃO E DICAS TÉCNICAS */}
      {/* ========================================================================= */}
      {showExecutionInfoModal && fullExerciseDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-[#E5E7EB] pb-3">
              <div>
                <h3 className="text-base font-black text-[#111827] uppercase">{fullExerciseDetails.name}</h3>
                <span className="text-xs text-[#4B5563] font-bold">{fullExerciseDetails.muscleGroup} • {fullExerciseDetails.equipment}</span>
              </div>
              <button onClick={() => setShowExecutionInfoModal(false)} className="p-1 text-[#6B7280] hover:text-[#111827]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-[#374151]">
              <div>
                <span className="font-black text-[#111827] uppercase block mb-1">Execução Passo a Passo:</span>
                <ol className="list-decimal pl-4 space-y-1.5 text-[#1F2937]">
                  {fullExerciseDetails.executionSteps.map((step, idx) => (
                    <li key={idx} className="leading-relaxed">{step}</li>
                  ))}
                </ol>
              </div>

              {fullExerciseDetails.tips && fullExerciseDetails.tips.length > 0 && (
                <div>
                  <span className="font-black text-[#111827] uppercase block mb-1">Dicas Técnicas & Cuidados:</span>
                  <ul className="list-disc pl-4 space-y-1 text-[#1F2937]">
                    {fullExerciseDetails.tips.map((tip, idx) => (
                      <li key={idx} className="leading-relaxed">{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowExecutionInfoModal(false)}
              className="w-full mt-6 py-3 bg-[#1F2937] hover:bg-[#111827] text-white text-xs font-black rounded-xl uppercase tracking-wider shadow-xs"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SELETOR DE RPE */}
      {/* ========================================================================= */}
      {showOtherRPEModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-5 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between mb-3 border-b border-[#E5E7EB] pb-2">
              <h3 className="text-sm font-black text-[#111827] uppercase">Escala de Esforço (RPE)</h3>
              <button onClick={() => setShowOtherRPEModal(false)} className="p-1 text-[#6B7280] hover:text-[#111827]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 text-xs">
              {[
                { val: 10, label: 'Esforço Máximo (Falha total)' },
                { val: 9.5, label: 'Quase Máximo (0-1 rep restante)' },
                { val: 9, label: 'Muito Pesado (1 rep restante)' },
                { val: 8.5, label: 'Pesado+ (1-2 reps)' },
                { val: 8, label: 'Pesado (2 reps restantes)' },
                { val: 7.5, label: 'Moderado Alto (2-3 reps)' },
                { val: 7, label: 'Moderado (3 reps restantes)' },
                { val: 6, label: 'Leve / Aquecimento (4+ reps)' },
                { val: 0, label: 'Sem RPE / Não Informado' }
              ].map(item => (
                <button
                  key={item.val}
                  onClick={() => {
                    setCurrentRPE(item.val === 0 ? null : item.val);
                    setShowOtherRPEModal(false);
                  }}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                    (item.val === 0 && currentRPE === null) || currentRPE === item.val
                      ? 'bg-[#1F2937] text-white border-[#1F2937]'
                      : 'bg-white border-[#D1D5DB] text-[#111827] hover:bg-[#F3F4F6]'
                  }`}
                >
                  <span className="font-black text-xs">{item.val > 0 ? `RPE ${item.val}` : 'Nenhum'}</span>
                  <span className={`text-[10px] truncate max-w-[200px] ${
                    (item.val === 0 && currentRPE === null) || currentRPE === item.val
                      ? 'text-[#E5E7EB]'
                      : 'text-[#4B5563]'
                  }`}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIÇÃO RÁPIDA DE SÉRIE CONCLUÍDA */}
      {/* ========================================================================= */}
      {editingSet && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-5 max-w-xs w-full shadow-2xl">
            <h3 className="text-sm font-black text-[#111827] uppercase mb-3">
              Editar Série {editingSet.setNumber}
            </h3>
            <div className="space-y-3 mb-4 text-xs">
              {(editingSet.prescriptionType === 'weight_reps' || editingSet.prescriptionType === 'weight_duration') && (
                <div>
                  <label className="block text-[#374151] font-bold mb-1">Carga (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingSet.weightKg}
                    onChange={e => setEditingSet({ ...editingSet, weightKg: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-[#D1D5DB] rounded-xl p-2.5 text-[#111827] font-mono-nums font-black text-base shadow-xs"
                  />
                </div>
              )}
              {(editingSet.prescriptionType === 'weight_reps' || editingSet.prescriptionType === 'reps') && (
                <div>
                  <label className="block text-[#374151] font-bold mb-1">Repetições</label>
                  <input
                    type="number"
                    value={editingSet.actualReps}
                    onChange={e => setEditingSet({ ...editingSet, actualReps: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-[#D1D5DB] rounded-xl p-2.5 text-[#111827] font-mono-nums font-black text-base shadow-xs"
                  />
                </div>
              )}
              {(editingSet.prescriptionType === 'isometric' || editingSet.prescriptionType === 'duration' || editingSet.prescriptionType === 'weight_duration') && (
                <div>
                  <label className="block text-[#374151] font-bold mb-1">Duração (segundos)</label>
                  <input
                    type="number"
                    value={editingSet.durationSeconds || 0}
                    onChange={e => setEditingSet({ ...editingSet, durationSeconds: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-[#D1D5DB] rounded-xl p-2.5 text-[#111827] font-mono-nums font-black text-base shadow-xs"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingSet(null)}
                className="flex-1 py-2.5 bg-white hover:bg-[#F3F4F6] text-[#1F2937] border border-[#D1D5DB] text-xs font-bold rounded-xl shadow-xs"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await updateRecordedSet(sessionId, editingSet.id, {
                    weightKg: editingSet.weightKg,
                    actualReps: editingSet.actualReps,
                    durationSeconds: editingSet.durationSeconds
                  });
                  setEditingSet(null);
                }}
                className="flex-1 py-2.5 bg-[#1F2937] hover:bg-[#111827] text-white text-xs font-black rounded-xl uppercase shadow-xs"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL / DRAWER: BANCO DE EXERCÍCIOS (ADICIONAR OU SUBSTITUIR NA SESSÃO) */}
      {/* ========================================================================= */}
      {showExerciseBankSelector && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-5 max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-black text-[#111827] uppercase">
                  {isReplacingExercise ? 'Substituir Exercício Atual' : 'Adicionar Exercício à Sessão'}
                </h3>
                <span className="text-[11px] text-[#4B5563]">
                  {isReplacingExercise ? `Substituindo: ${currentExercise?.exerciseName}` : 'Adiciona apenas a esta sessão ativa'}
                </span>
              </div>
              <button 
                onClick={() => {
                  setShowExerciseBankSelector(false);
                  setIsReplacingExercise(false);
                }} 
                className="p-1 text-[#6B7280] hover:text-[#111827]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative mb-3">
              <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por nome ou grupo muscular..."
                value={searchExerciseTerm}
                onChange={e => setSearchExerciseTerm(e.target.value)}
                className="w-full bg-white border border-[#D1D5DB] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#111827] placeholder-[#6B7280] focus:outline-none focus:border-[#1F2937] shadow-xs"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredExercisesBank.slice(0, 40).map(ex => (
                <button
                  key={ex.id}
                  onClick={() => handleSelectExerciseFromBank(ex)}
                  className="w-full text-left p-3 rounded-xl bg-white hover:bg-[#F3F4F6] flex items-center justify-between border border-[#E5E7EB] hover:border-[#1F2937]/40 transition-all text-xs shadow-xs"
                >
                  <div className="min-w-0">
                    <span className="font-black text-[#111827] block truncate">{ex.name}</span>
                    <span className="text-[10px] text-[#4B5563]">{ex.muscleGroup} • {ex.equipment}</span>
                  </div>
                  {isReplacingExercise ? (
                    <RefreshCw className="w-4 h-4 text-purple-600 shrink-0 ml-2" />
                  ) : (
                    <Plus className="w-4 h-4 text-[#1F2937] shrink-0 ml-2" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRMAR FINALIZAÇÃO DE TREINO (COM CHECAGEM DE PENDENTES) */}
      {/* ========================================================================= */}
      {showFinishConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 max-w-md w-full text-center shadow-2xl">
            <Flame className="w-12 h-12 text-[#1F2937] mx-auto mb-3" />
            <h3 className="text-xl font-black uppercase text-[#111827] mb-2">
              Finalizar Treino de {studentFirstName}?
            </h3>
            
            {pendingExercisesCount > 0 ? (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 mb-5 text-left text-xs text-amber-900">
                <span className="font-black text-amber-950 block mb-1">Atenção: Treino Incompleto</span>
                <span>Ainda existem <strong>{pendingExercisesCount} exercícios</strong> pendentes nesta sessão. Deseja finalizar mesmo assim?</span>
              </div>
            ) : (
              <p className="text-xs text-[#4B5563] mb-6 leading-relaxed">
                Esta sessão será salva no histórico com <strong>{session.sets.length} séries registradas</strong> e duração de <strong>{formatTimer(elapsedSeconds)}</strong>.
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowFinishConfirmModal(false)}
                className="flex-1 py-3 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#1F2937] border border-[#D1D5DB] text-xs font-bold shadow-xs"
              >
                Continuar Treino
              </button>
              <button
                onClick={handleFinishAndOpenSummary}
                className="flex-1 py-3 rounded-xl bg-[#1F2937] hover:bg-[#111827] text-white text-xs font-black uppercase tracking-wider shadow-md"
              >
                {pendingExercisesCount > 0 ? 'Finalizar Mesmo Assim' : 'Sim, Finalizar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRMAR ABANDONO */}
      {/* ========================================================================= */}
      {showAbandonConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 max-w-md w-full text-center shadow-2xl">
            <AlertCircle className="w-12 h-12 text-[#1F2937] mx-auto mb-3" />
            <h3 className="text-xl font-black uppercase text-[#111827] mb-2">
              Abandonar Treino de {studentFirstName}?
            </h3>
            <p className="text-xs text-[#4B5563] mb-6 leading-relaxed">
              Atenção: Se você cancelar este treino agora, esta sessão ativa será descartada.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAbandonConfirmModal(false)}
                className="flex-1 py-3 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#1F2937] border border-[#D1D5DB] text-xs font-bold shadow-xs"
              >
                Voltar ao Treino
              </button>
              <button
                onClick={async () => {
                  setShowAbandonConfirmModal(false);
                  await cancelActiveWorkout(sessionId);
                }}
                className="flex-1 py-3 rounded-xl bg-[#1F2937] hover:bg-[#111827] text-white text-xs font-black uppercase shadow-xs"
              >
                Sim, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  // Reusable RPE and Quick Note Trigger
  function renderRpeAndNoteRow() {
    return (
      <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-bold text-[#374151] shrink-0">RPE:</span>
          <div className="flex items-center gap-1 overflow-x-auto">
            {[6, 7, 8, 9, 10].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setCurrentRPE(currentRPE === val ? null : val)}
                className={`w-7 h-7 rounded-lg text-[11px] font-black font-mono-nums transition-all ${
                  currentRPE === val
                    ? 'bg-[#1F2937] text-white shadow-xs'
                    : 'bg-white hover:bg-[#F3F4F6] text-[#1F2937] border border-[#D1D5DB]'
                }`}
              >
                {val}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowOtherRPEModal(true)}
              className="px-2 py-1 rounded-lg bg-white hover:bg-[#F3F4F6] text-[#1F2937] border border-[#D1D5DB] text-[10px] font-bold shadow-xs"
            >
              {currentRPE && currentRPE < 6 ? currentRPE : 'Outro'}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowNoteInput(!showNoteInput)}
          className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition-all ${
            setNote.trim().length > 0
              ? 'bg-[#1F2937] border-[#1F2937] text-white shadow-xs'
              : 'bg-white border-[#D1D5DB] text-[#1F2937] hover:bg-[#F3F4F6]'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>{setNote.trim().length > 0 ? 'Nota ✓' : '+ Nota'}</span>
        </button>
      </div>
    );
  }
};
