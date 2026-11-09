import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  X, 
  Plus, 
  Minus,
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Dumbbell, 
  Check, 
  AlertCircle,
  Clock,
  Flame,
  Target,
  Sparkles,
  Copy,
  Layers,
  ArrowLeft,
  ArrowRight,
  Eye,
  Info,
  Archive,
  Timer,
  Zap,
  Activity,
  Split,
  Ungroup,
  Scale,
  BookmarkPlus,
  BookOpen,
  PanelRightClose,
  PanelRightOpen,
  Wifi,
  CloudCheck,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';
import { 
  Exercise, 
  MuscleGroup, 
  RoutineExercise, 
  RoutineWorkout, 
  Student, 
  WorkoutRoutine,
  PrescriptionType,
  ExerciseGroupType,
  WorkoutTemplate
} from '../../types';
import { useApp } from '../../context/AppContext';
import { generateId, normalizeWorkoutRoutine } from '../../db/indexedDB';
import { formatPrescriptionSummary } from '../../utils/calculations';
import { ExerciseBankPanel } from './ExerciseBankPanel';
import { WorkoutExerciseCard } from './WorkoutExerciseCard';
import { StudentExerciseHistoryModal } from './StudentExerciseHistoryModal';
import { ReplaceExerciseModal } from './ReplaceExerciseModal';
import { TemplateSelectorModal } from '../templates/TemplateSelectorModal';
import { SaveRoutineAsTemplateModal } from '../templates/SaveRoutineAsTemplateModal';

interface RoutineEditorModalProps {
  student: Student;
  routineToEdit?: WorkoutRoutine | null;
  onClose: () => void;
  onSaved: (routine: WorkoutRoutine) => void;
}

const COMMON_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

const OBJECTIVE_PRESETS = [
  'Hipertrofia Muscular',
  'Força Máxima & Potência',
  'Emagrecimento & Definição',
  'Longevidade & Autonomia Funcional',
  'Condicionamento Geral',
  'Reabilitação & Postura',
  'Personalizado'
];

export const RoutineEditorModal: React.FC<RoutineEditorModalProps> = ({
  student,
  routineToEdit,
  onClose,
  onSaved
}) => {
  const { exerciseCatalog: exercises, saveRoutine, sessions, workoutTemplates, syncStatus } = useApp();

  // Initial normalized routine state
  const initialNormalized = useMemo(() => {
    if (routineToEdit) {
      return normalizeWorkoutRoutine(routineToEdit);
    }
    const newRoutineId = generateId('routine');
    return {
      id: newRoutineId,
      studentId: student.id,
      title: 'Rotina de Treinamento',
      name: 'Rotina de Treinamento',
      objective: student.goal || 'Hipertrofia Muscular',
      description: '',
      notes: '',
      status: 'active' as const,
      isArchived: false,
      version: 1,
      workouts: [
        {
          id: generateId('rw'),
          routineId: newRoutineId,
          letter: 'A',
          name: 'Treino A',
          description: '',
          order: 1,
          exercises: []
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }, [routineToEdit, student.id, student.goal]);

  // Routine Meta State
  const [title, setTitle] = useState<string>(initialNormalized.title);
  const [objective, setObjective] = useState<string>(initialNormalized.objective || 'Hipertrofia Muscular');
  const [notes, setNotes] = useState<string>(initialNormalized.notes || initialNormalized.description || '');
  const [isArchived, setIsArchived] = useState<boolean>(Boolean(initialNormalized.isArchived));

  // Workouts State (Array of RoutineWorkout inside this routine)
  const [workouts, setWorkouts] = useState<RoutineWorkout[]>(
    JSON.parse(JSON.stringify(initialNormalized.workouts))
  );

  // Active workout selection ('overview' or workout.id)
  const [activeTab, setActiveTab] = useState<string>(workouts[0]?.id || 'overview');

  // Exercise Side Panel visibility (in landscape) & drawer (in portrait/mobile)
  const [isBankPanelOpen, setIsBankPanelOpen] = useState<boolean>(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  // Substitution state
  const [replaceTargetExercise, setReplaceTargetExercise] = useState<RoutineExercise | null>(null);
  const [candidateReplacementExercise, setCandidateReplacementExercise] = useState<Exercise | null>(null);

  // History modal state
  const [historyModalData, setHistoryModalData] = useState<{ exerciseName: string; history: any } | null>(null);

  // Template Modals state
  const [showTemplateSelector, setShowTemplateSelector] = useState<boolean>(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState<boolean>(false);

  // Drag and Drop state
  const [draggedExerciseId, setDraggedExerciseId] = useState<string | null>(null);

  // UI / Validation State
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatusText, setSaveStatusText] = useState<'saved' | 'saving' | 'offline'>('saved');

  // Active Workout Object
  const currentWorkout = useMemo(() => {
    return workouts.find(w => w.id === activeTab) || workouts[0] || null;
  }, [workouts, activeTab]);

  const currentWorkoutIndex = useMemo(() => {
    return workouts.findIndex(w => w.id === activeTab);
  }, [workouts, activeTab]);

  // Grouped structure calculation
  const groupedStructure = useMemo(() => {
    if (!currentWorkout) return [];
    
    interface UIBlock {
      type: 'standalone' | 'group';
      groupId?: string;
      groupType?: ExerciseGroupType;
      groupName?: string;
      groupRounds?: number;
      restBetweenExercises?: number;
      restAfterRound?: number;
      exercises: RoutineExercise[];
    }

    const blocks: UIBlock[] = [];
    const processedGroupIds = new Set<string>();

    for (let i = 0; i < currentWorkout.exercises.length; i++) {
      const ex = currentWorkout.exercises[i];
      if (ex.groupId && (ex.groupType === 'bi_set' || ex.groupType === 'tri_set' || ex.groupType === 'circuit')) {
        if (!processedGroupIds.has(ex.groupId)) {
          processedGroupIds.add(ex.groupId);
          const members = currentWorkout.exercises.filter(e => e.groupId === ex.groupId);
          blocks.push({
            type: 'group',
            groupId: ex.groupId,
            groupType: ex.groupType,
            groupName: ex.groupName || (ex.groupType === 'bi_set' ? 'BI-SET' : ex.groupType === 'tri_set' ? 'TRI-SET' : 'CIRCUITO'),
            groupRounds: ex.groupRounds || ex.targetSets || 3,
            restBetweenExercises: ex.restBetweenExercises ?? 0,
            restAfterRound: ex.restAfterRound ?? ex.restSeconds ?? 60,
            exercises: members
          });
        }
      } else {
        blocks.push({
          type: 'standalone',
          exercises: [ex]
        });
      }
    }

    return blocks;
  }, [currentWorkout]);

  // Add new workout tab
  const handleAddWorkout = () => {
    const nextOrder = workouts.length + 1;
    const letter = COMMON_LETTERS[(nextOrder - 1) % COMMON_LETTERS.length] || `W${nextOrder}`;
    const newW: RoutineWorkout = {
      id: generateId('rw'),
      routineId: initialNormalized.id,
      letter,
      name: `Treino ${letter}`,
      description: '',
      order: nextOrder,
      exercises: []
    };
    setWorkouts(prev => [...prev, newW]);
    setActiveTab(newW.id);
  };

  // Remove a workout tab
  const handleRemoveWorkout = (workoutId: string) => {
    if (workouts.length <= 1) {
      setValidationError('A rotina deve conter pelo menos um treino.');
      return;
    }
    const filtered = workouts.filter(w => w.id !== workoutId);
    setWorkouts(filtered);
    if (activeTab === workoutId) {
      setActiveTab(filtered[0]?.id || 'overview');
    }
  };

  // Duplicate a workout inside routine
  const handleDuplicateWorkout = (workoutId: string) => {
    const target = workouts.find(w => w.id === workoutId);
    if (!target) return;

    const nextOrder = workouts.length + 1;
    const letter = COMMON_LETTERS[(nextOrder - 1) % COMMON_LETTERS.length] || `W${nextOrder}`;
    
    // Remap group IDs so duplicate has fresh isolated groups
    const groupIdMap = new Map<string, string>();

    const duplicatedExercises: RoutineExercise[] = target.exercises.map(ex => {
      let newGroupId = ex.groupId;
      if (ex.groupId) {
        if (!groupIdMap.has(ex.groupId)) {
          groupIdMap.set(ex.groupId, generateId('grp'));
        }
        newGroupId = groupIdMap.get(ex.groupId);
      }
      return {
        ...ex,
        id: generateId('re'),
        groupId: newGroupId
      };
    });

    const newW: RoutineWorkout = {
      id: generateId('rw'),
      routineId: initialNormalized.id,
      letter,
      name: `${target.name} (Cópia)`,
      description: target.description,
      order: nextOrder,
      exercises: duplicatedExercises
    };

    setWorkouts(prev => [...prev, newW]);
    setActiveTab(newW.id);
  };

  // Move workout left / right
  const handleMoveWorkout = (index: number, direction: 'left' | 'right') => {
    if (direction === 'left' && index === 0) return;
    if (direction === 'right' && index === workouts.length - 1) return;

    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    const list = [...workouts];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const reordered = list.map((w, idx) => ({ ...w, order: idx + 1 }));
    setWorkouts(reordered);
  };

  // Update workout metadata
  const handleUpdateCurrentWorkoutMeta = (updates: Partial<RoutineWorkout>) => {
    if (!currentWorkout) return;
    setWorkouts(prev => prev.map(w => w.id === currentWorkout.id ? { ...w, ...updates } : w));
  };

  // Add exercise to current active workout
  const handleAddExerciseToCurrentWorkout = (catalogEx: Exercise, targetGroupId?: string | null) => {
    if (!currentWorkout) return;

    // Detect default prescription type from catalog
    const rawType = catalogEx.recordType || 'weight_reps';
    let prescriptionType: PrescriptionType = 'weight_reps';
    if (rawType === 'isometry_time' || rawType === 'isometric') prescriptionType = 'isometric';
    else if (rawType === 'duration_time' || rawType === 'duration') prescriptionType = 'duration';
    else if (rawType === 'distance_cardio' || rawType === 'distance') prescriptionType = 'distance';
    else if (rawType === 'bodyweight_reps' || rawType === 'reps') prescriptionType = 'reps';
    else if (rawType === 'cardio') prescriptionType = 'cardio';

    // If targetGroupId is specified, adopt group settings
    const existingGroupEx = targetGroupId 
      ? currentWorkout.exercises.find(e => e.groupId === targetGroupId)
      : null;

    const newRoutineEx: RoutineExercise = {
      id: generateId('re'),
      exerciseId: catalogEx.id,
      exerciseName: catalogEx.name,
      muscleGroup: catalogEx.muscleGroup,
      order: currentWorkout.exercises.length + 1,
      prescriptionType,
      targetSets: existingGroupEx ? existingGroupEx.targetSets : 3,
      targetRepsMin: 10,
      targetRepsMax: 12,
      targetDurationSeconds: prescriptionType === 'isometric' || prescriptionType === 'duration' ? 30 : undefined,
      durationUnit: 'seconds',
      targetDistance: prescriptionType === 'distance' ? 200 : undefined,
      distanceUnit: 'meters',
      targetRPE: 8,
      restSeconds: catalogEx.defaultRestSeconds || 60,
      notes: '',
      recordType: prescriptionType,
      functionalTags: catalogEx.functionalTags,
      groupId: existingGroupEx ? existingGroupEx.groupId : undefined,
      groupType: existingGroupEx ? existingGroupEx.groupType : undefined,
      groupName: existingGroupEx ? existingGroupEx.groupName : undefined,
      groupRounds: existingGroupEx ? existingGroupEx.groupRounds : undefined,
      restBetweenExercises: existingGroupEx ? existingGroupEx.restBetweenExercises : undefined,
      restAfterRound: existingGroupEx ? existingGroupEx.restAfterRound : undefined
    };

    setWorkouts(prev => prev.map(w => {
      if (w.id === currentWorkout.id) {
        return {
          ...w,
          exercises: [...w.exercises, newRoutineEx]
        };
      }
      return w;
    }));

    setValidationError(null);
  };

  // Remove exercise from current workout
  const handleRemoveExercise = (exerciseId: string) => {
    if (!currentWorkout) return;
    setWorkouts(prev => prev.map(w => {
      if (w.id === currentWorkout.id) {
        const filtered = w.exercises.filter(e => e.id !== exerciseId);
        return {
          ...w,
          exercises: filtered.map((e, idx) => ({ ...e, order: idx + 1 }))
        };
      }
      return w;
    }));
  };

  // Duplicate single exercise inside current workout
  const handleDuplicateExercise = (exerciseId: string) => {
    if (!currentWorkout) return;
    const targetIdx = currentWorkout.exercises.findIndex(e => e.id === exerciseId);
    if (targetIdx === -1) return;

    const source = currentWorkout.exercises[targetIdx];
    const clone: RoutineExercise = {
      ...source,
      id: generateId('re'),
      exerciseName: `${source.exerciseName}`,
      order: targetIdx + 2
    };

    const list = [...currentWorkout.exercises];
    list.splice(targetIdx + 1, 0, clone);

    const reordered = list.map((e, idx) => ({ ...e, order: idx + 1 }));
    setWorkouts(prev => prev.map(w => w.id === currentWorkout.id ? { ...w, exercises: reordered } : w));
  };

  // Move exercise up/down
  const handleMoveExercise = (exerciseId: string, direction: 'up' | 'down') => {
    if (!currentWorkout) return;
    const index = currentWorkout.exercises.findIndex(e => e.id === exerciseId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === currentWorkout.exercises.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const list = [...currentWorkout.exercises];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const reordered = list.map((e, idx) => ({ ...e, order: idx + 1 }));

    setWorkouts(prev => prev.map(w => {
      if (w.id === currentWorkout.id) {
        return { ...w, exercises: reordered };
      }
      return w;
    }));
  };

  // Drag and Drop reordering
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedExerciseId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, overId: string) => {
    e.preventDefault();
    if (!draggedExerciseId || draggedExerciseId === overId || !currentWorkout) return;

    const fromIdx = currentWorkout.exercises.findIndex(e => e.id === draggedExerciseId);
    const toIdx = currentWorkout.exercises.findIndex(e => e.id === overId);
    if (fromIdx === -1 || toIdx === -1) return;

    const list = [...currentWorkout.exercises];
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);

    const reordered = list.map((e, idx) => ({ ...e, order: idx + 1 }));
    setWorkouts(prev => prev.map(w => w.id === currentWorkout.id ? { ...w, exercises: reordered } : w));
  };

  const handleDragEnd = () => {
    setDraggedExerciseId(null);
  };

  // Update specific exercise property
  const handleUpdateExerciseProp = <K extends keyof RoutineExercise>(
    exerciseId: string,
    field: K,
    value: RoutineExercise[K]
  ) => {
    if (!currentWorkout) return;
    setWorkouts(prev => prev.map(w => {
      if (w.id === currentWorkout.id) {
        return {
          ...w,
          exercises: w.exercises.map(ex => {
            if (ex.id === exerciseId) {
              const updated = { ...ex, [field]: value };
              if (field === 'targetSets' && ex.groupId) {
                updated.groupRounds = value as number;
              }
              return updated;
            }
            if (field === 'targetSets' && ex.groupId && ex.groupId === w.exercises.find(e => e.id === exerciseId)?.groupId) {
              return { ...ex, targetSets: value as number, groupRounds: value as number };
            }
            return ex;
          })
        };
      }
      return w;
    }));
  };

  // Group Management
  const handleCreateGroup = (type: ExerciseGroupType) => {
    if (!currentWorkout) return;
    const newGroupId = generateId('grp');
    // Open bank panel in drawer if on small screen
    setIsBankPanelOpen(true);
    setIsMobileDrawerOpen(true);
  };

  const handleMakeBiSetWithNext = (exerciseIndex: number) => {
    if (!currentWorkout || exerciseIndex >= currentWorkout.exercises.length - 1) return;
    const ex1 = currentWorkout.exercises[exerciseIndex];
    const newGroupId = generateId('grp');
    const rounds = ex1.targetSets || 3;

    setWorkouts(prev => prev.map(w => {
      if (w.id === currentWorkout.id) {
        return {
          ...w,
          exercises: w.exercises.map((e, idx) => {
            if (idx === exerciseIndex || idx === exerciseIndex + 1) {
              return {
                ...e,
                groupId: newGroupId,
                groupType: 'bi_set',
                groupName: 'BI-SET',
                groupRounds: rounds,
                targetSets: rounds,
                restBetweenExercises: 0,
                restAfterRound: 60
              };
            }
            return e;
          })
        };
      }
      return w;
    }));
  };

  const handleDissolveGroup = (groupId: string) => {
    if (!currentWorkout) return;
    setWorkouts(prev => prev.map(w => {
      if (w.id === currentWorkout.id) {
        return {
          ...w,
          exercises: w.exercises.map(e => {
            if (e.groupId === groupId) {
              return {
                ...e,
                groupId: undefined,
                groupType: undefined,
                groupName: undefined,
                groupRounds: undefined,
                restBetweenExercises: undefined,
                restAfterRound: undefined
              };
            }
            return e;
          })
        };
      }
      return w;
    }));
  };

  const handleUpdateGroupProps = (
    groupId: string, 
    updates: { 
      groupName?: string; 
      groupRounds?: number; 
      restBetweenExercises?: number; 
      restAfterRound?: number;
      groupType?: ExerciseGroupType;
    }
  ) => {
    if (!currentWorkout) return;
    setWorkouts(prev => prev.map(w => {
      if (w.id === currentWorkout.id) {
        return {
          ...w,
          exercises: w.exercises.map(e => {
            if (e.groupId === groupId) {
              return {
                ...e,
                ...updates,
                targetSets: updates.groupRounds !== undefined ? updates.groupRounds : e.targetSets
              };
            }
            return e;
          })
        };
      }
      return w;
    }));
  };

  const handleMoveGroupBlock = (groupId: string, direction: 'up' | 'down') => {
    if (!currentWorkout) return;
    const groupIndices: number[] = [];
    currentWorkout.exercises.forEach((e, idx) => {
      if (e.groupId === groupId) groupIndices.push(idx);
    });

    if (groupIndices.length === 0) return;
    const firstIdx = groupIndices[0];
    const lastIdx = groupIndices[groupIndices.length - 1];

    if (direction === 'up' && firstIdx === 0) return;
    if (direction === 'down' && lastIdx === currentWorkout.exercises.length - 1) return;

    const list = [...currentWorkout.exercises];
    if (direction === 'up') {
      const itemAbove = list[firstIdx - 1];
      list.splice(firstIdx - 1, 1);
      list.splice(lastIdx, 0, itemAbove);
    } else {
      const itemBelow = list[lastIdx + 1];
      list.splice(lastIdx + 1, 1);
      list.splice(firstIdx, 0, itemBelow);
    }

    const reordered = list.map((e, idx) => ({ ...e, order: idx + 1 }));
    setWorkouts(prev => prev.map(w => w.id === currentWorkout.id ? { ...w, exercises: reordered } : w));
  };

  // Substitution flow
  const handleInitiateReplace = (exercise: RoutineExercise) => {
    setReplaceTargetExercise(exercise);
    setIsBankPanelOpen(true);
    setIsMobileDrawerOpen(true);
  };

  const handleSelectReplacementFromBank = (candidate: Exercise) => {
    if (!replaceTargetExercise) return;
    setCandidateReplacementExercise(candidate);
  };

  const handleConfirmReplacement = (keepPrescription: boolean) => {
    if (!replaceTargetExercise || !candidateReplacementExercise || !currentWorkout) return;

    const rawType = candidateReplacementExercise.recordType || 'weight_reps';
    let newPrescriptionType: PrescriptionType = 'weight_reps';
    if (rawType === 'isometry_time' || rawType === 'isometric') newPrescriptionType = 'isometric';
    else if (rawType === 'duration_time' || rawType === 'duration') newPrescriptionType = 'duration';
    else if (rawType === 'distance_cardio' || rawType === 'distance') newPrescriptionType = 'distance';
    else if (rawType === 'bodyweight_reps' || rawType === 'reps') newPrescriptionType = 'reps';
    else if (rawType === 'cardio') newPrescriptionType = 'cardio';

    setWorkouts(prev => prev.map(w => {
      if (w.id === currentWorkout.id) {
        return {
          ...w,
          exercises: w.exercises.map(ex => {
            if (ex.id === replaceTargetExercise.id) {
              if (keepPrescription) {
                return {
                  ...ex,
                  exerciseId: candidateReplacementExercise.id,
                  exerciseName: candidateReplacementExercise.name,
                  muscleGroup: candidateReplacementExercise.muscleGroup,
                  functionalTags: candidateReplacementExercise.functionalTags,
                  // Prescription fields preserved
                  lastSuggestedLoad: undefined // DO NOT copy historical load of a different exercise
                };
              } else {
                return {
                  id: ex.id,
                  exerciseId: candidateReplacementExercise.id,
                  exerciseName: candidateReplacementExercise.name,
                  muscleGroup: candidateReplacementExercise.muscleGroup,
                  order: ex.order,
                  prescriptionType: newPrescriptionType,
                  targetSets: 3,
                  targetRepsMin: 10,
                  targetRepsMax: 12,
                  restSeconds: candidateReplacementExercise.defaultRestSeconds || 60,
                  targetRPE: 8,
                  functionalTags: candidateReplacementExercise.functionalTags,
                  groupId: ex.groupId,
                  groupType: ex.groupType,
                  groupName: ex.groupName,
                  groupRounds: ex.groupRounds
                };
              }
            }
            return ex;
          })
        };
      }
      return w;
    }));

    // Reset substitution state
    setReplaceTargetExercise(null);
    setCandidateReplacementExercise(null);
    setIsMobileDrawerOpen(false);
  };

  // Load from template
  const handleTemplateApplied = (appliedRoutine: WorkoutRoutine) => {
    if (!appliedRoutine) return;
    setTitle(appliedRoutine.title || appliedRoutine.name || title);
    setObjective(appliedRoutine.objective || objective);
    setNotes(appliedRoutine.notes || appliedRoutine.description || '');
    if (appliedRoutine.workouts && appliedRoutine.workouts.length > 0) {
      setWorkouts(JSON.parse(JSON.stringify(appliedRoutine.workouts)));
      setActiveTab(appliedRoutine.workouts[0]?.id || 'overview');
    }
  };

  // Save entire Routine
  const handleSaveAll = async () => {
    if (!title.trim()) {
      setValidationError('Informe o nome da rotina (ex: Hipertrofia ABC).');
      return;
    }

    if (workouts.length === 0) {
      setValidationError('A rotina deve conter pelo menos 1 treino.');
      return;
    }

    const hasAtLeastOneExercise = workouts.some(w => w.exercises.length > 0);
    if (!hasAtLeastOneExercise) {
      setValidationError('Adicione pelo menos 1 exercício em um dos treinos da rotina.');
      return;
    }

    setIsSaving(true);
    setValidationError(null);
    setSaveStatusText('saving');

    try {
      const routineId = routineToEdit?.id || initialNormalized.id;
      const normalizedWorkouts: RoutineWorkout[] = workouts.map((w, wIdx) => ({
        ...w,
        routineId,
        letter: w.letter.trim().toUpperCase() || String.fromCharCode(65 + (wIdx % 26)),
        name: w.name.trim() || `Treino ${w.letter}`,
        order: wIdx + 1,
        exercises: w.exercises.map((ex, exIdx) => ({
          ...ex,
          order: exIdx + 1
        }))
      }));

      const routineToSave: WorkoutRoutine = {
        id: routineId,
        studentId: student.id,
        title: title.trim(),
        name: title.trim(),
        objective: objective.trim(),
        description: notes.trim(),
        notes: notes.trim(),
        status: isArchived ? 'archived' : 'active',
        isArchived,
        version: (routineToEdit?.version || 0) + 1,
        workouts: normalizedWorkouts,
        createdAt: routineToEdit?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await saveRoutine(routineToSave);
      setSaveStatusText('saved');
      onSaved(routineToSave);
      onClose();
    } catch (err) {
      console.error('Error saving routine:', err);
      setValidationError('Erro ao salvar rotina. Verifique os dados e tente novamente.');
      setSaveStatusText('offline');
    } finally {
      setIsSaving(false);
    }
  };

  const totalExercisesInRoutine = workouts.reduce((sum, w) => sum + w.exercises.length, 0);

  // Current routine object for template saving
  const currentRoutineForTemplate: WorkoutRoutine = useMemo(() => ({
    id: routineToEdit?.id || initialNormalized.id,
    studentId: student.id,
    title: title.trim() || 'Modelo de Treino',
    name: title.trim() || 'Modelo de Treino',
    objective: objective.trim(),
    description: notes.trim(),
    notes: notes.trim(),
    status: 'active',
    isArchived: false,
    version: 1,
    workouts: workouts,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }), [routineToEdit, initialNormalized.id, student.id, title, objective, notes, workouts]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-0 sm:p-2 md:p-3 overflow-hidden animate-in fade-in duration-200">
      
      {/* WORKSPACE CONTAINER */}
      <div className="bg-white border border-[#E5E7EB] sm:rounded-3xl w-full h-full sm:h-[96vh] sm:max-h-[96vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* ========================================================
            TOP WORKSPACE HEADER (TFIVE PRO)
           ======================================================== */}
        <div className="px-3.5 sm:px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between bg-white shrink-0 gap-3">
          
          {/* Left: Routine info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-[#374151]/15 border border-[#E5E7EB] flex items-center justify-center text-[#374151] shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#374151]">
                  {routineToEdit ? 'Prescrição de Treino' : 'Novo Criador de Treinos'}
                </span>
                <span className="text-xs text-[#4B5563]">•</span>
                <span className="text-xs text-[#4B5563] truncate font-bold">
                  {student.name}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[#1F2937] tracking-tight truncate">
                {title || 'Rotina de Treinamento'}
              </h2>
            </div>
          </div>

          {/* Center: Save State Indicator */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E5E7EB] text-[11px] font-mono-nums font-bold">
              {saveStatusText === 'saving' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-amber-400">SALVANDO...</span>
                </>
              ) : saveStatusText === 'saved' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-emerald-400">SALVO LOCALMENTE</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#71717A]" />
                  <span className="text-[#4B5563]">OFFLINE</span>
                </>
              )}
            </div>
          </div>

          {/* Right: Template actions & Close */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Usar Modelo */}
            <button
              type="button"
              onClick={() => setShowTemplateSelector(true)}
              className="hidden sm:flex px-3 py-1.5 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#4B5563] hover:text-[#111827] border border-[#E5E7EB] text-xs font-bold items-center gap-1.5 transition-all"
              title="Carregar de um modelo pré-configurado"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#374151]" />
              <span>Usar Modelo</span>
            </button>

            {/* Salvar como Modelo */}
            <button
              type="button"
              onClick={() => setShowSaveTemplateModal(true)}
              className="hidden lg:flex px-3 py-1.5 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#4B5563] hover:text-[#111827] border border-[#E5E7EB] text-xs font-bold items-center gap-1.5 transition-all"
              title="Salvar esta rotina como modelo na biblioteca"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-amber-500" />
              <span>Salvar Modelo</span>
            </button>

            {/* Toggle Exercise Bank Panel (Landscape/Desktop) */}
            <button
              type="button"
              onClick={() => setIsBankPanelOpen(!isBankPanelOpen)}
              className="hidden lg:flex p-2 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#4B5563] hover:text-[#111827] border border-[#E5E7EB] transition-colors"
              title={isBankPanelOpen ? 'Recolher banco de exercícios' : 'Expandir banco de exercícios'}
            >
              {isBankPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4 text-[#374151]" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#27272A]/70 hover:bg-[#27272A] text-[#4B5563] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* ========================================================
            PORTRAIT / MOBILE TOP BAR: A/B/C/D QUICK TABS
           ======================================================== */}
        <div className="lg:hidden px-3 py-2 bg-[#F8F9FA] border-b border-[#E5E7EB] flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
          {workouts.map((w, idx) => {
            const isActive = activeTab === w.id;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => setActiveTab(w.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'bg-[#374151] text-white shadow-sm'
                    : 'bg-white text-[#4B5563] border border-[#E5E7EB]'
                }`}
              >
                <span className="font-mono-nums">{w.letter || String.fromCharCode(65 + idx)}</span>
                <span className="text-[10px] font-normal opacity-80 truncate max-w-[100px]">{w.name}</span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                  isActive ? 'bg-black/30 text-white' : 'bg-white text-[#4B5563]'
                }`}>
                  {w.exercises.length}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleAddWorkout}
            className="px-2.5 py-1.5 rounded-xl bg-white text-[#374151] border border-dashed border-[#374151]/40 text-xs font-bold flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Treino</span>
          </button>
        </div>

        {/* ========================================================
            3-COLUMN WORKSPACE (TABLET LANDSCAPE & DESKTOP)
           ======================================================== */}
        <div className="flex-1 flex flex-row min-h-0 overflow-hidden relative">
          
          {/* ========================================================
              COLUMN 1: TREINOS (A, B, C, D...) & ROTINA META (250px-280px)
             ======================================================== */}
          <div className="hidden lg:flex w-64 xl:w-72 bg-[#F8F9FA] border-r border-[#E5E7EB] p-4 flex-col justify-between overflow-y-auto shrink-0 gap-4">
            
            <div className="space-y-4">
              
              {/* Validation Alert */}
              {validationError && (
                <div className="p-3 rounded-2xl bg-[#374151]/15 border border-[#374151]/40 flex items-center gap-2 text-xs text-white">
                  <AlertCircle className="w-4 h-4 text-[#374151] shrink-0" />
                  <span className="text-[11px] leading-tight">{validationError}</span>
                </div>
              )}

              {/* Routine Meta Information */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#4B5563] flex items-center gap-1">
                    <Target className="w-3 h-3 text-[#374151]" />
                    <span>Objetivo</span>
                  </span>
                  
                  <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-[#4B5563] hover:text-white">
                    <input
                      type="checkbox"
                      checked={isArchived}
                      onChange={e => setIsArchived(e.target.checked)}
                      className="rounded border-[#E5E7EB] bg-white text-[#374151] focus:ring-0 text-[10px]"
                    />
                    <span className={isArchived ? 'text-amber-400 font-bold' : ''}>
                      {isArchived ? 'Arquivada' : 'Ativa'}
                    </span>
                  </label>
                </div>

                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Nome da Rotina (ex: Hipertrofia ABC)"
                  className="w-full bg-white border border-[#E5E7EB] focus:border-[#374151] rounded-xl px-2.5 py-1.5 text-xs text-[#1F2937] font-bold placeholder-[#9CA3AF] focus:outline-none"
                />

                <input
                  type="text"
                  value={objective}
                  onChange={e => setObjective(e.target.value)}
                  list="objective-presets-desktop"
                  placeholder="Objetivo principal..."
                  className="w-full bg-white border border-[#E5E7EB] focus:border-[#374151] rounded-xl px-2.5 py-1.5 text-[11px] text-[#1F2937] font-bold placeholder-[#9CA3AF] focus:outline-none"
                />
                <datalist id="objective-presets-desktop">
                  {OBJECTIVE_PRESETS.map(obj => (
                    <option key={obj} value={obj} />
                  ))}
                </datalist>
              </div>

              {/* Workouts Navigation Column (A, B, C, D) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#4B5563]">
                    Treinos ({workouts.length})
                  </span>
                  <span className="text-[10px] font-mono-nums text-[#4B5563]">
                    {totalExercisesInRoutine} ex
                  </span>
                </div>

                {/* Workout Tabs List */}
                <div className="space-y-1.5">
                  {workouts.map((w, idx) => {
                    const isActive = activeTab === w.id;
                    return (
                      <div
                        key={w.id}
                        onClick={() => setActiveTab(w.id)}
                        className={`p-2.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-2.5 group select-none ${
                          isActive
                            ? 'bg-[#374151] border-[#374151] text-white shadow-md shadow-xs font-bold'
                            : 'bg-white hover:bg-[#F9FAFB] border-[#E5E7EB] hover:border-[#D1D5DB] text-[#4B5563] hover:text-[#111827]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-6 h-6 rounded-lg font-mono-nums font-black text-xs flex items-center justify-center shrink-0 ${
                            isActive ? 'bg-black/30 text-white' : 'bg-white text-[#374151]'
                          }`}>
                            {w.letter || String.fromCharCode(65 + idx)}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs truncate font-bold leading-tight">
                              {w.name || `Treino ${w.letter}`}
                            </p>
                            <p className={`text-[10px] truncate ${isActive ? 'text-white/80' : 'text-[#4B5563]'}`}>
                              {w.exercises.length} {w.exercises.length === 1 ? 'exercício' : 'exercícios'}
                            </p>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isActive ? 'bg-white text-black' : 'bg-white text-[#4B5563]'
                        }`}>
                          {w.exercises.length}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Add Workout Button */}
                <button
                  type="button"
                  onClick={handleAddWorkout}
                  className="w-full py-2.5 rounded-2xl bg-white hover:bg-[#F9FAFB] text-[#374151] hover:text-[#111827] border border-dashed border-[#374151]/40 hover:border-[#374151] text-xs font-bold flex items-center justify-center gap-1.5 transition-all mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Novo Treino</span>
                </button>
              </div>

            </div>

            {/* Overview / All Workouts button */}
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`w-full py-2 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                activeTab === 'overview'
                  ? 'bg-[#1F2937] text-white border-[#1F2937] shadow-sm'
                  : 'bg-white hover:bg-[#F3F4F6] text-[#4B5563] hover:text-[#1F2937] border-[#E5E7EB]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Visão Geral da Rotina</span>
            </button>

          </div>

          {/* ========================================================
              COLUMN 2: TREINO SELECIONADO & PRESCRIÇÃO (FLEX-1)
             ======================================================== */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 bg-white min-w-0">
            
            {/* TAB CONTENT: VISÃO GERAL */}
            {activeTab === 'overview' && (
              <div className="bg-white border border-[#E5E7EB] rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#374151]" />
                    <span>Estrutura Completa da Rotina</span>
                  </h3>
                  <span className="text-xs text-[#4B5563]">
                    {workouts.length} {workouts.length === 1 ? 'treino' : 'treinos'} • {totalExercisesInRoutine} exercícios prescritos
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-2">
                  {workouts.map((w) => (
                    <div 
                      key={w.id} 
                      className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-[#374151]/50 transition-all cursor-pointer group"
                      onClick={() => setActiveTab(w.id)}
                    >
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-[#374151]/20 text-[#374151] font-black text-xs flex items-center justify-center">
                              {w.letter}
                            </span>
                            <span className="text-xs font-bold text-white group-hover:text-[#374151] transition-colors">
                              {w.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#4B5563]">
                            {w.exercises.length} ex
                          </span>
                        </div>

                        {w.exercises.length > 0 ? (
                          <div className="space-y-1.5 pt-2">
                            {w.exercises.slice(0, 6).map((ex, exIdx) => (
                              <div key={ex.id || exIdx} className="flex items-center justify-between text-[11px] text-[#4B5563]">
                                <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                                  {ex.groupId && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#374151] shrink-0" />
                                  )}
                                  <span className="truncate">{ex.exerciseName}</span>
                                </div>
                                <span className="font-mono-nums text-[#4B5563] text-[10px] shrink-0">
                                  {formatPrescriptionSummary(ex)}
                                </span>
                              </div>
                            ))}
                            {w.exercises.length > 6 && (
                              <p className="text-[10px] text-[#4B5563] italic">
                                + {w.exercises.length - 6} outros exercícios...
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-[#4B5563] italic py-3 text-center">
                            Nenhum exercício prescrito
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTab(w.id);
                        }}
                        className="w-full py-1.5 rounded-xl bg-white group-hover:bg-[#374151] text-[#4B5563] group-hover:text-white text-[11px] font-bold transition-all text-center"
                      >
                        Editar Treino {w.letter}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: ACTIVE WORKOUT EDITOR */}
            {activeTab !== 'overview' && currentWorkout && (
              <div className="space-y-4">
                
                {/* Workout Sub-Header (Letter, Name, Actions) */}
                <div className="bg-white border border-[#E5E7EB] rounded-3xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-1 items-center gap-3 min-w-0">
                    
                    {/* Letter Selector */}
                    <div className="w-12 shrink-0">
                      <label className="block text-[10px] font-bold uppercase text-[#4B5563] mb-1">
                        Letra
                      </label>
                      <input
                        type="text"
                        value={currentWorkout.letter}
                        maxLength={2}
                        onChange={e => handleUpdateCurrentWorkoutMeta({ letter: e.target.value.toUpperCase() })}
                        className="w-full bg-white border border-[#E5E7EB] focus:border-[#374151] rounded-xl py-1.5 text-center text-sm font-black text-[#374151] uppercase focus:outline-none"
                      />
                    </div>

                    {/* Workout Name */}
                    <div className="flex-1 min-w-0">
                      <label className="block text-[10px] font-bold uppercase text-[#4B5563] mb-1">
                        Nome / Foco do Treino
                      </label>
                      <input
                        type="text"
                        value={currentWorkout.name}
                        onChange={e => handleUpdateCurrentWorkoutMeta({ name: e.target.value })}
                        placeholder="Ex: Peito + Tríceps, Pernas Completo, Costas & Bíceps..."
                        className="w-full bg-white border border-[#E5E7EB] focus:border-[#374151] rounded-xl px-3 py-1.5 text-xs font-bold text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Workout Actions (Duplicate, Reorder, Delete) */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveWorkout(currentWorkoutIndex, 'left')}
                      disabled={currentWorkoutIndex === 0}
                      className="p-2 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#4B5563] hover:text-[#1F2937] disabled:opacity-80 border border-[#E5E7EB] transition-colors"
                      title="Mover treino para a esquerda"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMoveWorkout(currentWorkoutIndex, 'right')}
                      disabled={currentWorkoutIndex === workouts.length - 1}
                      className="p-2 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#4B5563] hover:text-[#1F2937] disabled:opacity-80 border border-[#E5E7EB] transition-colors"
                      title="Mover treino para a direita"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDuplicateWorkout(currentWorkout.id)}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#4B5563] hover:text-[#111827] border border-[#E5E7EB] text-xs font-bold flex items-center gap-1.5 transition-colors"
                      title="Duplicar este treino"
                    >
                      <Copy className="w-3.5 h-3.5 text-[#374151]" />
                      <span>Duplicar</span>
                    </button>

                    {workouts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveWorkout(currentWorkout.id)}
                        className="p-2 rounded-xl bg-white hover:bg-rose-50 border border-[#E5E7EB] hover:border-rose-200 text-[#4B5563] hover:text-rose-600 transition-colors"
                        title="Excluir este treino"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Add Bar & Bi-Set creator */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white/60 border border-[#E5E7EB] rounded-2xl p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                      Prescrição no Treino {currentWorkout.letter}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white text-[10px] font-bold text-[#374151] border border-[#E5E7EB]">
                      {currentWorkout.exercises.length} {currentWorkout.exercises.length === 1 ? 'exercício' : 'exercícios'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Quick Group Creator Buttons */}
                    <button
                      type="button"
                      onClick={() => handleCreateGroup('bi_set')}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#4B5563] hover:text-[#111827] border border-[#E5E7EB] text-xs font-bold flex items-center gap-1.5 transition-all"
                      title="Criar Bloco Bi-Set"
                    >
                      <Split className="w-3.5 h-3.5 text-[#374151]" />
                      <span>+ Bi-Set</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCreateGroup('tri_set')}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#4B5563] hover:text-[#111827] border border-[#E5E7EB] text-xs font-bold flex items-center gap-1.5 transition-all"
                      title="Criar Bloco Tri-Set"
                    >
                      <Layers className="w-3.5 h-3.5 text-amber-500" />
                      <span>+ Tri-Set</span>
                    </button>

                    {/* Standard Add Exercise Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsBankPanelOpen(true);
                        setIsMobileDrawerOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Adicionar Exercício</span>
                    </button>
                  </div>
                </div>

                {/* Exercises List for Current Workout */}
                <div className="space-y-3">
                  {currentWorkout.exercises.length === 0 ? (
                    <div className="p-8 sm:p-12 rounded-3xl bg-white border-2 border-dashed border-[#E5E7EB] text-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-[#E5E7EB] flex items-center justify-center mx-auto text-[#4B5563]">
                        <Dumbbell className="w-6 h-6 opacity-90" />
                      </div>
                      <h4 className="text-sm font-bold text-white">
                        Treino {currentWorkout.letter} está vazio
                      </h4>
                      <p className="text-xs text-[#4B5563] max-w-sm mx-auto">
                        Selecione exercícios no banco ao lado ou clique abaixo para prescrever o primeiro exercício.
                      </p>
                      <div className="flex justify-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsBankPanelOpen(true);
                            setIsMobileDrawerOpen(true);
                          }}
                          className="px-4 py-2 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-bold inline-flex items-center gap-2 transition-all shadow-md shadow-xs"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Adicionar Exercício</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {groupedStructure.map((block, blockIdx) => {
                        if (block.type === 'group' && block.groupId) {
                          // ==========================================
                          // RENDER GROUPED BLOCK (BI-SET / TRI-SET / CIRCUIT)
                          // ==========================================
                          const isBiSet = block.groupType === 'bi_set';
                          const isTriSet = block.groupType === 'tri_set';
                          const accentColor = isBiSet ? '#374151' : (isTriSet ? '#F59E0B' : '#FB923C');
                          const badgeLabel = block.groupName || (isBiSet ? 'BI-SET' : (isTriSet ? 'TRI-SET' : 'CIRCUITO'));

                          return (
                            <div 
                              key={block.groupId}
                              className="bg-[#F8F9FA] border-2 border-dashed rounded-3xl p-3.5 sm:p-4 space-y-3 relative transition-all"
                              style={{ borderColor: `${accentColor}55` }}
                            >
                              {/* Group Header Controls */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#E5E7EB]">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <span 
                                    className="px-2.5 py-0.5 rounded-lg text-[10px] font-black tracking-wider uppercase text-white flex items-center gap-1 shadow-sm"
                                    style={{ backgroundColor: accentColor }}
                                  >
                                    <Split className="w-3 h-3" />
                                    <span>{badgeLabel}</span>
                                  </span>

                                  {/* Rounds Stepper Control */}
                                  <div className="flex items-center bg-white border border-[#E5E7EB] rounded-xl p-1 shadow-inner">
                                    <span className="text-[10px] font-bold text-[#4B5563] uppercase px-1.5">Rodadas:</span>
                                    <button
                                      type="button"
                                      disabled={(block.groupRounds || 3) <= 1}
                                      onClick={() => handleUpdateGroupProps(block.groupId!, { groupRounds: Math.max(1, (block.groupRounds || 3) - 1) })}
                                      aria-label="Diminuir rodadas"
                                      className="w-7 h-7 rounded-lg bg-white hover:bg-[#F3F4F6] active:bg-[#374151]/20 disabled:opacity-80 disabled:cursor-not-allowed text-[#1F2937] hover:text-[#1F2937] flex items-center justify-center transition-all border border-[#E5E7EB]/70 shrink-0"
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      value={block.groupRounds || 3}
                                      onChange={e => {
                                        const val = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
                                        if (!isNaN(val)) {
                                          handleUpdateGroupProps(block.groupId!, { groupRounds: Math.max(1, Math.min(20, val)) });
                                        }
                                      }}
                                      onFocus={e => e.target.select()}
                                      className="w-9 bg-transparent text-center font-black font-mono-nums text-[#1F2937] text-sm focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <button
                                      type="button"
                                      disabled={(block.groupRounds || 3) >= 20}
                                      onClick={() => handleUpdateGroupProps(block.groupId!, { groupRounds: Math.min(20, (block.groupRounds || 3) + 1) })}
                                      aria-label="Aumentar rodadas"
                                      className="w-7 h-7 rounded-lg bg-white hover:bg-[#F3F4F6] active:bg-[#374151]/20 disabled:opacity-80 disabled:cursor-not-allowed text-[#1F2937] hover:text-[#1F2937] flex items-center justify-center transition-all border border-[#E5E7EB]/70 shrink-0"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {/* Rest Between Exercises */}
                                  <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] px-2 py-1 rounded-xl text-xs">
                                    <span className="text-[10px] font-bold text-[#4B5563] uppercase">Troca:</span>
                                    <select
                                      value={block.restBetweenExercises ?? 0}
                                      onChange={e => handleUpdateGroupProps(block.groupId!, { restBetweenExercises: parseInt(e.target.value) || 0 })}
                                      className="bg-transparent font-bold text-[#1F2937] text-xs focus:outline-none"
                                    >
                                      <option value="0" className="bg-[#18181B] text-white">0s (direto)</option>
                                      <option value="10" className="bg-[#18181B] text-white">10s</option>
                                      <option value="15" className="bg-[#18181B] text-white">15s</option>
                                      <option value="30" className="bg-[#18181B] text-white">30s</option>
                                    </select>
                                  </div>

                                  {/* Rest After Round */}
                                  <div className="flex items-center bg-white border border-[#E5E7EB] rounded-xl p-1 shadow-inner">
                                    <span className="text-[10px] font-bold text-[#4B5563] uppercase px-1.5">Descanso:</span>
                                    <button
                                      type="button"
                                      disabled={(block.restAfterRound ?? 60) <= 0}
                                      onClick={() => handleUpdateGroupProps(block.groupId!, { restAfterRound: Math.max(0, (block.restAfterRound ?? 60) - 15) })}
                                      className="h-7 px-2 rounded-lg bg-white hover:bg-[#F3F4F6] active:bg-[#374151]/20 disabled:opacity-80 disabled:cursor-not-allowed text-[#1F2937] hover:text-[#1F2937] text-xs font-bold font-mono-nums flex items-center justify-center gap-0.5 transition-all border border-[#E5E7EB]/70 shrink-0"
                                    >
                                      <Minus className="w-3 h-3" />
                                      <span>15s</span>
                                    </button>
                                    <span className="px-2 font-mono-nums font-black text-xs text-[#1F2937] min-w-[38px] text-center">
                                      {block.restAfterRound ?? 60}s
                                    </span>
                                    <button
                                      type="button"
                                      disabled={(block.restAfterRound ?? 60) >= 600}
                                      onClick={() => handleUpdateGroupProps(block.groupId!, { restAfterRound: Math.min(600, (block.restAfterRound ?? 60) + 15) })}
                                      className="h-7 px-2 rounded-lg bg-white hover:bg-[#F3F4F6] active:bg-[#374151]/20 disabled:opacity-80 disabled:cursor-not-allowed text-[#1F2937] hover:text-[#1F2937] text-xs font-bold font-mono-nums flex items-center justify-center gap-0.5 transition-all border border-[#E5E7EB]/70 shrink-0"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>15s</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Group Block Actions */}
                                <div className="flex items-center gap-1.5 self-end sm:self-center">
                                  <button
                                    type="button"
                                    onClick={() => handleMoveGroupBlock(block.groupId!, 'up')}
                                    className="p-1.5 rounded-lg bg-white hover:bg-[#F3F4F6] text-[#4B5563] hover:text-[#1F2937] border border-[#E5E7EB]"
                                    title="Mover bloco para cima"
                                  >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMoveGroupBlock(block.groupId!, 'down')}
                                    className="p-1.5 rounded-lg bg-white hover:bg-[#F3F4F6] text-[#4B5563] hover:text-[#1F2937] border border-[#E5E7EB]"
                                    title="Mover bloco para baixo"
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Dissolve Group */}
                                  <button
                                    type="button"
                                    onClick={() => handleDissolveGroup(block.groupId!)}
                                    className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#27272A] text-[#4B5563] hover:text-amber-400 border border-[#E5E7EB] text-[11px] font-bold flex items-center gap-1 transition-colors"
                                    title="Desfazer agrupamento (mantém os exercícios)"
                                  >
                                    <Ungroup className="w-3.5 h-3.5" />
                                    <span>Desfazer</span>
                                  </button>
                                </div>
                              </div>

                              {/* Group Member Exercises */}
                              <div className="space-y-2 pl-2 sm:pl-3 border-l-2" style={{ borderColor: accentColor }}>
                                {block.exercises.map((item, memberIdx) => {
                                  const memberLetter = `${currentWorkout.letter}${memberIdx + 1}`;
                                  return (
                                    <WorkoutExerciseCard
                                      key={item.id}
                                      exercise={item}
                                      badgeIndexLabel={memberLetter}
                                      isInsideGroup={true}
                                      totalExercisesInWorkout={currentWorkout.exercises.length}
                                      student={student}
                                      sessions={sessions}
                                      onUpdateProp={(field, val) => handleUpdateExerciseProp(item.id, field, val)}
                                      onMoveUp={() => handleMoveExercise(item.id, 'up')}
                                      onMoveDown={() => handleMoveExercise(item.id, 'down')}
                                      onRemove={() => handleRemoveExercise(item.id)}
                                      onDuplicate={() => handleDuplicateExercise(item.id)}
                                      onReplace={() => handleInitiateReplace(item)}
                                      onOpenHistory={(exName, hist) => setHistoryModalData({ exerciseName: exName, history: hist })}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          );
                        } else {
                          // ==========================================
                          // RENDER STANDALONE EXERCISE CARD
                          // ==========================================
                          const item = block.exercises[0];
                          const itemIdx = currentWorkout.exercises.findIndex(e => e.id === item.id);
                          return (
                            <WorkoutExerciseCard
                              key={item.id}
                              exercise={item}
                              badgeIndexLabel={String(itemIdx + 1)}
                              isInsideGroup={false}
                              standaloneIdx={itemIdx}
                              totalExercisesInWorkout={currentWorkout.exercises.length}
                              student={student}
                              sessions={sessions}
                              onUpdateProp={(field, val) => handleUpdateExerciseProp(item.id, field, val)}
                              onMoveUp={() => handleMoveExercise(item.id, 'up')}
                              onMoveDown={() => handleMoveExercise(item.id, 'down')}
                              onRemove={() => handleRemoveExercise(item.id)}
                              onDuplicate={() => handleDuplicateExercise(item.id)}
                              onReplace={() => handleInitiateReplace(item)}
                              onMakeBiSetWithNext={() => handleMakeBiSetWithNext(itemIdx)}
                              onOpenHistory={(exName, hist) => setHistoryModalData({ exerciseName: exName, history: hist })}
                              onDragStart={handleDragStart}
                              onDragOver={handleDragOver}
                              onDragEnd={handleDragEnd}
                              isDragging={draggedExerciseId === item.id}
                            />
                          );
                        }
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>

          {/* ========================================================
              COLUMN 3: BANCO DE EXERCÍCIOS LATERAL (TABLET LANDSCAPE)
             ======================================================== */}
          {isBankPanelOpen && (
            <div className="hidden lg:flex w-80 xl:w-96 border-l border-[#E5E7EB] shrink-0 h-full overflow-hidden">
              <ExerciseBankPanel
                exercises={exercises}
                student={student}
                sessions={sessions}
                currentWorkoutLetter={currentWorkout?.letter || 'A'}
                onAddExercise={ex => handleAddExerciseToCurrentWorkout(ex)}
                isReplaceMode={Boolean(replaceTargetExercise)}
                replaceTargetName={replaceTargetExercise?.exerciseName}
                onSelectForReplace={handleSelectReplacementFromBank}
                onCancelReplace={() => setReplaceTargetExercise(null)}
              />
            </div>
          )}

        </div>

        {/* ========================================================
            BOTTOM FOOTER / PERSISTENCE & ACTIONS
           ======================================================== */}
        <div className="p-3 sm:p-4 border-t border-[#E5E7EB] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[#4B5563] flex items-center gap-2">
            <span>
              Total: <strong className="text-white">{workouts.length} treinos</strong> ({workouts.map(w => w.letter).join(' • ')})
            </span>
            <span className="text-[#4B5563]">•</span>
            <span>
              <strong className="text-white">{totalExercisesInRoutine} exercícios</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-2xl border border-[#E5E7EB] text-xs font-bold text-[#4B5563] hover:text-white transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAll}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-2xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-xs disabled:opacity-80 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Salvar Rotina Completa</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================
          PORTRAIT / MOBILE OVERLAY DRAWER FOR EXERCISE BANK
         ======================================================== */}
      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex justify-end animate-in fade-in duration-150">
          <div className="w-full max-w-md h-full bg-[#F8F9FA] shadow-2xl border-l border-[#E5E7EB] flex flex-col animate-in slide-in-from-right duration-200">
            <ExerciseBankPanel
              exercises={exercises}
              student={student}
              sessions={sessions}
              currentWorkoutLetter={currentWorkout?.letter || 'A'}
              onAddExercise={ex => handleAddExerciseToCurrentWorkout(ex)}
              isReplaceMode={Boolean(replaceTargetExercise)}
              replaceTargetName={replaceTargetExercise?.exerciseName}
              onSelectForReplace={handleSelectReplacementFromBank}
              onCancelReplace={() => {
                setReplaceTargetExercise(null);
                setIsMobileDrawerOpen(false);
              }}
              onClose={() => setIsMobileDrawerOpen(false)}
              isDrawer={true}
            />
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: STUDENT REAL EXERCISE HISTORY
         ======================================================== */}
      {historyModalData && (
        <StudentExerciseHistoryModal
          exerciseName={historyModalData.exerciseName}
          studentName={student.name}
          history={historyModalData.history}
          onClose={() => setHistoryModalData(null)}
        />
      )}

      {/* ========================================================
          MODAL: REPLACE EXERCISE CONFIRMATION
         ======================================================== */}
      {replaceTargetExercise && candidateReplacementExercise && (
        <ReplaceExerciseModal
          currentExercise={replaceTargetExercise}
          newExercise={candidateReplacementExercise}
          onConfirm={handleConfirmReplacement}
          onCancel={() => {
            setCandidateReplacementExercise(null);
          }}
        />
      )}

      {/* ========================================================
          MODAL: TEMPLATE SELECTOR (APPLY TEMPLATE)
         ======================================================== */}
      {showTemplateSelector && (
        <TemplateSelectorModal
          student={student}
          onClose={() => setShowTemplateSelector(false)}
          onCreateFromScratch={() => setShowTemplateSelector(false)}
          onTemplateApplied={handleTemplateApplied}
        />
      )}

      {/* ========================================================
          MODAL: SAVE ROUTINE AS TEMPLATE
         ======================================================== */}
      {showSaveTemplateModal && (
        <SaveRoutineAsTemplateModal
          routine={currentRoutineForTemplate}
          onClose={() => setShowSaveTemplateModal(false)}
        />
      )}

    </div>
  );
};
