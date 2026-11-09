import React, { useState, useMemo } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Dumbbell, 
  Check, 
  Clock, 
  Activity, 
  Timer, 
  Scale, 
  Zap, 
  Flame, 
  Copy 
} from 'lucide-react';
import { 
  Exercise, 
  MuscleGroup, 
  RoutineExercise, 
  RoutineWorkout, 
  WorkoutTemplate,
  PrescriptionType
} from '../../types';
import { useApp } from '../../context/AppContext';
import { generateId, normalizeWorkoutTemplate } from '../../db/indexedDB';
import { formatPrescriptionSummary } from '../../utils/calculations';
import { NumberStepper, RestStepper } from '../common/StepperControl';

interface TemplateEditorModalProps {
  templateToEdit?: WorkoutTemplate | null;
  onClose: () => void;
  onSaved: (template: WorkoutTemplate) => void;
}

const COMMON_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const OBJECTIVE_PRESETS = [
  'Hipertrofia Muscular',
  'Hipertrofia ABC',
  'Hipertrofia ABCD',
  'Full Body 3x',
  'Força Máxima & Potência',
  'Emagrecimento & Definição',
  'Adaptação',
  'Membros Inferiores',
  'Superiores / Inferiores',
  'Condicionamento Geral',
  'Longevidade & Autonomia',
  'Personalizado'
];

const LEVEL_PRESETS = [
  'Iniciante',
  'Intermediário',
  'Avançado',
  'Atleta / Performance',
  'Todos os Níveis'
];

const MUSCLE_GROUPS: (MuscleGroup | 'Todos')[] = [
  'Todos',
  'Peitoral',
  'Costas',
  'Quadríceps',
  'Isquiotibiais',
  'Glúteos',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Abdômen / Core',
  'Panturrilha',
  'Funcional & Cardio',
  'Mobilidade',
  'Antebraço'
];

const PRESCRIPTION_TYPES: { id: PrescriptionType; label: string; icon: any; hint: string }[] = [
  { id: 'weight_reps', label: 'Carga + Reps', icon: Dumbbell, hint: 'Musculação tradicional' },
  { id: 'reps', label: 'Apenas Reps', icon: Activity, hint: 'Peso corporal / calistenia' },
  { id: 'isometric', label: 'Isometria', icon: Timer, hint: 'Sustentação por tempo estático' },
  { id: 'duration', label: 'Tempo / Duração', icon: Clock, hint: 'Execução por tempo pré-determinado' },
  { id: 'weight_duration', label: 'Carga + Tempo', icon: Scale, hint: 'Sustentação com carga' },
  { id: 'distance', label: 'Distância', icon: Zap, hint: 'Tiros / corrida por distância' },
  { id: 'duration_distance', label: 'Tempo + Distância', icon: Flame, hint: 'Cardio com tempo e distância' },
  { id: 'cardio', label: 'Cardio / Esteira', icon: Flame, hint: 'Cardio com velocidade e inclinação' }
];

export const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({
  templateToEdit,
  onClose,
  onSaved
}) => {
  const { exerciseCatalog: exercises, saveWorkoutTemplate, saveExercise } = useApp();

  const initialNormalized = useMemo(() => {
    if (templateToEdit) {
      return normalizeWorkoutTemplate(templateToEdit);
    }
    const newId = generateId('template');
    return {
      id: newId,
      name: '',
      objective: 'Hipertrofia Muscular',
      level: 'Intermediário',
      description: '',
      workouts: [
        {
          id: generateId('tw'),
          routineId: newId,
          letter: 'A',
          name: 'Treino A',
          description: '',
          order: 1,
          exercises: []
        }
      ],
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }, [templateToEdit]);

  const [name, setName] = useState<string>(initialNormalized.name);
  const [objective, setObjective] = useState<string>(initialNormalized.objective || 'Hipertrofia Muscular');
  const [level, setLevel] = useState<string>(initialNormalized.level || 'Intermediário');
  const [description, setDescription] = useState<string>(initialNormalized.description || '');
  const [workouts, setWorkouts] = useState<RoutineWorkout[]>(initialNormalized.workouts);
  const [activeWorkoutId, setActiveWorkoutId] = useState<string>(
    initialNormalized.workouts[0]?.id || ''
  );

  // Exercise Picker Modal State
  const [showExercisePicker, setShowExercisePicker] = useState<boolean>(false);
  const [searchExercise, setSearchExercise] = useState<string>('');
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState<MuscleGroup | 'Todos'>('Todos');
  const [customExerciseName, setCustomExerciseName] = useState<string>('');
  const [customExerciseMuscle, setCustomExerciseMuscle] = useState<MuscleGroup>('Peitoral');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const activeWorkout = useMemo(() => {
    return workouts.find(w => w.id === activeWorkoutId) || workouts[0] || null;
  }, [workouts, activeWorkoutId]);

  // Filtered exercises for the picker
  const filteredExercises = useMemo(() => {
    return exercises.filter(ex => {
      if (ex.isArchived) return false;
      const matchesSearch = !searchExercise.trim() || 
        ex.name.toLowerCase().includes(searchExercise.toLowerCase()) ||
        ex.muscleGroup.toLowerCase().includes(searchExercise.toLowerCase());
      const matchesMuscle = selectedMuscleFilter === 'Todos' || ex.muscleGroup === selectedMuscleFilter;
      return matchesSearch && matchesMuscle;
    });
  }, [exercises, searchExercise, selectedMuscleFilter]);

  // Workout Management
  const handleAddWorkout = () => {
    const nextIdx = workouts.length;
    const nextLetter = COMMON_LETTERS[nextIdx % COMMON_LETTERS.length] || String.fromCharCode(65 + nextIdx);
    const newWorkout: RoutineWorkout = {
      id: generateId('tw'),
      routineId: initialNormalized.id,
      letter: nextLetter,
      name: `Treino ${nextLetter}`,
      description: '',
      order: nextIdx + 1,
      exercises: []
    };
    setWorkouts(prev => [...prev, newWorkout]);
    setActiveWorkoutId(newWorkout.id);
  };

  const handleDuplicateWorkout = (workoutId: string) => {
    const source = workouts.find(w => w.id === workoutId);
    if (!source) return;
    const nextIdx = workouts.length;
    const nextLetter = COMMON_LETTERS[nextIdx % COMMON_LETTERS.length] || String.fromCharCode(65 + nextIdx);
    const duplicated: RoutineWorkout = {
      ...source,
      id: generateId('tw'),
      routineId: initialNormalized.id,
      letter: nextLetter,
      name: `${source.name} (Cópia)`,
      order: nextIdx + 1,
      exercises: source.exercises.map((ex, idx) => ({
        ...ex,
        id: generateId('te'),
        order: idx + 1
      }))
    };
    setWorkouts(prev => [...prev, duplicated]);
    setActiveWorkoutId(duplicated.id);
  };

  const handleDeleteWorkout = (workoutId: string) => {
    if (workouts.length <= 1) {
      alert('O modelo precisa ter pelo menos um treino.');
      return;
    }
    const filtered = workouts.filter(w => w.id !== workoutId);
    setWorkouts(filtered);
    if (activeWorkoutId === workoutId) {
      setActiveWorkoutId(filtered[0]?.id || '');
    }
  };

  const handleUpdateWorkoutMeta = (workoutId: string, updates: Partial<RoutineWorkout>) => {
    setWorkouts(prev => prev.map(w => w.id === workoutId ? { ...w, ...updates } : w));
  };

  // Exercise Management within Active Workout
  const handleAddExerciseToWorkout = (exercise: Exercise) => {
    if (!activeWorkout) return;

    const newRoutineEx: RoutineExercise = {
      id: generateId('te'),
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscleGroup: exercise.muscleGroup,
      order: activeWorkout.exercises.length + 1,
      targetSets: 3,
      targetRepsMin: 10,
      targetRepsMax: 12,
      lastSuggestedLoad: undefined,
      restSeconds: exercise.defaultRestSeconds || 60,
      prescriptionType: 'weight_reps',
      targetRPE: 8,
      notes: ''
    };

    setWorkouts(prev => prev.map(w => {
      if (w.id !== activeWorkout.id) return w;
      return {
        ...w,
        exercises: [...w.exercises, newRoutineEx]
      };
    }));

    setShowExercisePicker(false);
    setSearchExercise('');
  };

  const handleCreateAndAddCustomExercise = async () => {
    if (!customExerciseName.trim()) return;
    const newEx: Exercise = {
      id: generateId('ex'),
      name: customExerciseName.trim(),
      muscleGroup: customExerciseMuscle,
      equipment: 'Geral',
      executionSteps: [],
      defaultRestSeconds: 60,
      notes: '',
      isCustom: true,
      createdAt: new Date().toISOString()
    } as any;
    await saveExercise(newEx);
    handleAddExerciseToWorkout(newEx);
    setCustomExerciseName('');
  };

  const handleUpdateExercise = (exerciseId: string, updates: Partial<RoutineExercise>) => {
    if (!activeWorkout) return;
    setWorkouts(prev => prev.map(w => {
      if (w.id !== activeWorkout.id) return w;
      return {
        ...w,
        exercises: w.exercises.map(ex => ex.id === exerciseId ? { ...ex, ...updates } : ex)
      };
    }));
  };

  const handleDeleteExercise = (exerciseId: string) => {
    if (!activeWorkout) return;
    setWorkouts(prev => prev.map(w => {
      if (w.id !== activeWorkout.id) return w;
      const filtered = w.exercises.filter(ex => ex.id !== exerciseId);
      return {
        ...w,
        exercises: filtered.map((ex, idx) => ({ ...ex, order: idx + 1 }))
      };
    }));
  };

  const handleDuplicateExercise = (exerciseId: string) => {
    if (!activeWorkout) return;
    const idx = activeWorkout.exercises.findIndex(e => e.id === exerciseId);
    if (idx === -1) return;
    const target = activeWorkout.exercises[idx];
    const duplicated: RoutineExercise = {
      ...target,
      id: generateId('te'),
      order: idx + 2
    };
    const newExList = [...activeWorkout.exercises];
    newExList.splice(idx + 1, 0, duplicated);

    setWorkouts(prev => prev.map(w => {
      if (w.id !== activeWorkout.id) return w;
      return {
        ...w,
        exercises: newExList.map((ex, i) => ({ ...ex, order: i + 1 }))
      };
    }));
  };

  const handleMoveExercise = (exerciseId: string, direction: 'up' | 'down') => {
    if (!activeWorkout) return;
    const list = [...activeWorkout.exercises];
    const idx = list.findIndex(e => e.id === exerciseId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === list.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;

    setWorkouts(prev => prev.map(w => {
      if (w.id !== activeWorkout.id) return w;
      return {
        ...w,
        exercises: list.map((ex, i) => ({ ...ex, order: i + 1 }))
      };
    }));
  };

  // Save full Template
  const handleSaveTemplate = async () => {
    if (!name.trim()) {
      alert('Por favor, informe um nome para o modelo de treino.');
      return;
    }
    if (workouts.length === 0) {
      alert('O modelo precisa de pelo menos um treino.');
      return;
    }

    setIsSaving(true);
    try {
      const templateToSave: WorkoutTemplate = {
        id: initialNormalized.id,
        name: name.trim(),
        objective: objective.trim(),
        level: level.trim(),
        description: description.trim(),
        workouts: workouts.map((w, idx) => ({
          ...w,
          routineId: initialNormalized.id,
          order: idx + 1,
          exercises: (w.exercises || []).map((ex, exIdx) => ({
            ...ex,
            order: exIdx + 1
          }))
        })),
        tags: [],
        createdAt: initialNormalized.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await saveWorkoutTemplate(templateToSave);
      onSaved(templateToSave);
      onClose();
    } catch (err) {
      console.error('Erro ao salvar modelo:', err);
      alert('Ocorreu um erro ao salvar o modelo de treino.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-5xl bg-[#121212] border border-[#27272A] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] text-white">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-[#27272A] flex items-center justify-between gap-3 shrink-0 bg-[#0A0A0A] rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] text-[#374151]">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black font-display uppercase tracking-wide">
                {templateToEdit ? 'Editar Modelo de Treino' : 'Novo Modelo de Treino'}
              </h2>
              <p className="text-xs text-[#4B5563]">
                Biblioteca de templates reutilizáveis do TFIVE PRO
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="p-2 rounded-xl text-[#4B5563] hover:text-white hover:bg-[#18181B] transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Section 1: Template Meta Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#18181B] border border-[#27272A] p-4 rounded-2xl">
            {/* Template Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#4B5563] uppercase tracking-wider mb-1.5">
                Nome do Modelo *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Hipertrofia ABC, Full Body 3x, Membros Inferiores..."
                className="w-full bg-[#121212] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-sm text-white font-bold placeholder-[#71717A] focus:outline-none focus:border-[#374151] transition-all"
              />
            </div>

            {/* Objective */}
            <div>
              <label className="block text-xs font-bold text-[#4B5563] uppercase tracking-wider mb-1.5">
                Objetivo
              </label>
              <select
                value={objective}
                onChange={e => setObjective(e.target.value)}
                className="w-full bg-[#121212] border border-[#27272A] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#374151] transition-all"
              >
                {OBJECTIVE_PRESETS.map(obj => (
                  <option key={obj} value={obj}>{obj}</option>
                ))}
              </select>
            </div>

            {/* Level Pills */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#4B5563] uppercase tracking-wider mb-1.5">
                Nível Recomendado
              </label>
              <div className="flex flex-wrap gap-2">
                {LEVEL_PRESETS.map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLevel(lvl)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      level === lvl
                        ? 'bg-[#374151] text-white shadow-sm'
                        : 'bg-[#121212] text-[#4B5563] hover:text-white border border-[#27272A]'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Description / Notes */}
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-[#4B5563] uppercase tracking-wider mb-1.5">
                Orientações / Descrição (Opcional)
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ex: Treinos com foco em intensidade e recuperação de 48h entre sessões..."
                className="w-full bg-[#121212] border border-[#27272A] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#374151] transition-all"
              />
            </div>
          </div>

          {/* Section 2: Workouts Tabs & Exercises */}
          <div className="space-y-4">
            
            {/* Workouts Nav Bar (Treinos A, B, C...) */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
              <div className="flex items-center gap-2">
                {workouts.map((w, idx) => {
                  const isActive = w.id === activeWorkout?.id;
                  return (
                    <div
                      key={w.id}
                      onClick={() => setActiveWorkoutId(w.id)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shrink-0 ${
                        isActive
                          ? 'bg-white text-black font-black shadow-lg shadow-white/10'
                          : 'bg-[#18181B] text-[#4B5563] hover:text-white border border-[#27272A]'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono-nums text-[10px] font-black ${
                        isActive ? 'bg-black text-white' : 'bg-[#27272A] text-[#374151]'
                      }`}>
                        {w.letter || String.fromCharCode(65 + idx)}
                      </span>
                      <span>{w.name}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                        isActive ? 'bg-zinc-200 text-zinc-800' : 'bg-[#27272A] text-[#71717A]'
                      }`}>
                        {w.exercises?.length || 0}
                      </span>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={handleAddWorkout}
                  className="px-3 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-[#374151] border border-[#E5E7EB] hover:border-[#374151] text-xs font-bold flex items-center gap-1.5 transition-all shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Treino</span>
                </button>
              </div>
            </div>

            {/* Active Workout Content */}
            {activeWorkout && (
              <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 sm:p-5 space-y-4">
                
                {/* Active Workout Header Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#27272A] pb-3">
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={activeWorkout.letter}
                      onChange={e => handleUpdateWorkoutMeta(activeWorkout.id, { letter: e.target.value.toUpperCase().slice(0, 2) })}
                      maxLength={2}
                      className="w-10 bg-[#121212] border border-[#27272A] rounded-lg p-2 text-center text-xs font-black text-[#374151] uppercase focus:outline-none focus:border-[#374151]"
                      title="Letra do Treino (A, B, C...)"
                    />
                    <input
                      type="text"
                      value={activeWorkout.name}
                      onChange={e => handleUpdateWorkoutMeta(activeWorkout.id, { name: e.target.value })}
                      placeholder="Nome do Treino (ex: Peito e Tríceps)"
                      className="flex-1 bg-[#121212] border border-[#27272A] rounded-lg px-3 py-2 text-xs font-bold text-white placeholder-[#71717A] focus:outline-none focus:border-[#374151]"
                    />
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleDuplicateWorkout(activeWorkout.id)}
                      className="p-2 rounded-lg bg-[#121212] hover:bg-[#27272A] text-[#4B5563] hover:text-white border border-[#27272A] text-xs transition-all"
                      title="Duplicar este treino"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {workouts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteWorkout(activeWorkout.id)}
                        className="p-2 rounded-lg bg-[#121212] hover:bg-red-500/20 text-[#4B5563] hover:text-red-400 border border-[#27272A] text-xs transition-all"
                        title="Excluir este treino"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Exercises List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#4B5563] uppercase tracking-wider">
                      Exercícios do Treino {activeWorkout.letter} ({activeWorkout.exercises.length})
                    </span>

                    <button
                      type="button"
                      onClick={() => setShowExercisePicker(true)}
                      className="px-3 py-1.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-xs transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Exercício</span>
                    </button>
                  </div>

                  {activeWorkout.exercises.length > 0 ? (
                    <div className="space-y-2.5">
                      {activeWorkout.exercises.map((ex, idx) => (
                        <div
                          key={ex.id}
                          className="bg-[#121212] border border-[#27272A] hover:border-[#3F3F46] rounded-xl p-3 sm:p-4 transition-all space-y-3"
                        >
                          {/* Exercise Top Row */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-6 h-6 rounded-md bg-[#18181B] border border-[#27272A] text-[#374151] font-mono-nums font-black text-xs flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-white truncate">{ex.exerciseName}</h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-[#4B5563]">{ex.muscleGroup}</span>
                                  <span className="text-[10px] text-[#71717A]">•</span>
                                  <span className="text-[10px] text-[#374151] font-bold">
                                    {PRESCRIPTION_TYPES.find(p => p.id === ex.prescriptionType)?.label || 'Carga + Reps'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Move / Duplicate / Delete Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleMoveExercise(ex.id, 'up')}
                                disabled={idx === 0}
                                className="p-1.5 rounded-lg text-[#4B5563] hover:text-white disabled:opacity-80 transition-all"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveExercise(ex.id, 'down')}
                                disabled={idx === activeWorkout.exercises.length - 1}
                                className="p-1.5 rounded-lg text-[#4B5563] hover:text-white disabled:opacity-80 transition-all"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDuplicateExercise(ex.id)}
                                className="p-1.5 rounded-lg text-[#4B5563] hover:text-white transition-all"
                                title="Duplicar exercício"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteExercise(ex.id)}
                                className="p-1.5 rounded-lg text-[#4B5563] hover:text-red-400 transition-all"
                                title="Remover exercício"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Stepper Inputs Row */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-[#18181B] text-xs">
                            {/* Sets */}
                            <div className="bg-[#18181B] p-2 rounded-xl border border-[#27272A]">
                              <span className="text-[10px] text-[#4B5563] uppercase font-bold block mb-1">Séries</span>
                              <NumberStepper
                                value={ex.targetSets || 3}
                                onChange={val => handleUpdateExercise(ex.id, { targetSets: val })}
                                min={1}
                                max={20}
                                size="sm"
                              />
                            </div>

                            {/* Reps Target */}
                            <div className="bg-[#18181B] p-2 rounded-xl border border-[#27272A]">
                              <span className="text-[10px] text-[#4B5563] uppercase font-bold block mb-1">Repetições (Min - Max)</span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={ex.targetRepsMin ?? 10}
                                  onChange={e => handleUpdateExercise(ex.id, { targetRepsMin: parseInt(e.target.value, 10) || 1 })}
                                  className="w-1/2 bg-[#121212] border border-[#27272A] rounded-lg px-2 py-1.5 text-center text-xs font-bold text-white focus:outline-none focus:border-[#374151]"
                                />
                                <span className="text-[#71717A]">-</span>
                                <input
                                  type="number"
                                  value={ex.targetRepsMax ?? 12}
                                  onChange={e => handleUpdateExercise(ex.id, { targetRepsMax: parseInt(e.target.value, 10) || 1 })}
                                  className="w-1/2 bg-[#121212] border border-[#27272A] rounded-lg px-2 py-1.5 text-center text-xs font-bold text-white focus:outline-none focus:border-[#374151]"
                                />
                              </div>
                            </div>

                            {/* Weight Suggestion */}
                            <div className="bg-[#18181B] p-2 rounded-xl border border-[#27272A]">
                              <span className="text-[10px] text-[#4B5563] uppercase font-bold block mb-1">Carga Sugerida (kg)</span>
                              <input
                                type="number"
                                value={ex.lastSuggestedLoad ?? ''}
                                onChange={e => {
                                  const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                  handleUpdateExercise(ex.id, { lastSuggestedLoad: val });
                                }}
                                placeholder="Opcional"
                                className="w-full bg-[#121212] border border-[#27272A] rounded-lg px-2 py-1.5 text-center text-xs font-bold text-white focus:outline-none focus:border-[#374151]"
                              />
                            </div>

                            {/* Rest Seconds */}
                            <div className="bg-[#18181B] p-2 rounded-xl border border-[#27272A]">
                              <span className="text-[10px] text-[#4B5563] uppercase font-bold block mb-1">Descanso</span>
                              <RestStepper
                                value={ex.restSeconds || 60}
                                onChange={val => handleUpdateExercise(ex.id, { restSeconds: val })}
                              />
                            </div>
                          </div>

                          {/* Exercise Notes */}
                          <div>
                            <input
                              type="text"
                              value={ex.notes || ''}
                              onChange={e => handleUpdateExercise(ex.id, { notes: e.target.value })}
                              placeholder="Observações do exercício (ex: cadência 3-0-1, pico de contração de 2s)..."
                              className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-1.5 text-[11px] text-white placeholder-[#71717A] focus:outline-none focus:border-[#374151]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-[#121212] border border-dashed border-[#27272A] rounded-xl space-y-2">
                      <p className="text-xs text-[#4B5563]">Nenhum exercício neste treino ainda.</p>
                      <button
                        type="button"
                        onClick={() => setShowExercisePicker(true)}
                        className="px-4 py-2 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-bold inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar Primeiro Exercício</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#27272A] flex items-center justify-between gap-3 shrink-0 bg-[#0A0A0A] rounded-b-2xl">
          <div className="text-xs text-[#4B5563]">
            {workouts.length} {workouts.length === 1 ? 'Treino' : 'Treinos'} • {workouts.reduce((s, w) => s + w.exercises.length, 0)} Exercícios totais
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-xs font-bold text-[#4B5563] hover:text-white border border-[#27272A] transition-all"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={isSaving || !name.trim()}
              className="px-6 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] disabled:opacity-80 text-xs font-black font-display uppercase tracking-wider text-white shadow-lg shadow-xs transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Modelo'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* EXERCISE PICKER MODAL */}
      {showExercisePicker && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-[#121212] border border-[#27272A] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] text-white">
            
            {/* Picker Header */}
            <div className="p-4 border-b border-[#27272A] flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider">
                Selecionar Exercício para o Treino {activeWorkout?.letter}
              </h3>
              <button
                onClick={() => setShowExercisePicker(false)}
                className="p-1.5 rounded-lg text-[#4B5563] hover:text-white hover:bg-[#18181B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search & Muscle Filters */}
            <div className="p-4 space-y-3 border-b border-[#27272A] bg-[#0A0A0A]">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
                <input
                  type="text"
                  value={searchExercise}
                  onChange={e => setSearchExercise(e.target.value)}
                  placeholder="Buscar exercício por nome..."
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#374151]"
                />
              </div>

              {/* Muscle Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {MUSCLE_GROUPS.map(mg => (
                  <button
                    key={mg}
                    type="button"
                    onClick={() => setSelectedMuscleFilter(mg)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                      selectedMuscleFilter === mg
                        ? 'bg-[#374151] text-white'
                        : 'bg-[#18181B] text-[#4B5563] hover:text-white border border-[#27272A]'
                    }`}
                  >
                    {mg}
                  </button>
                ))}
              </div>
            </div>

            {/* Exercise List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
              {filteredExercises.length > 0 ? (
                filteredExercises.map(ex => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => handleAddExerciseToWorkout(ex)}
                    className="w-full p-3 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] flex items-center justify-between text-left transition-all group"
                  >
                    <div>
                      <h5 className="text-xs font-bold text-white group-hover:text-[#1F2937] transition-colors">{ex.name}</h5>
                      <span className="text-[10px] text-[#4B5563]">{ex.muscleGroup}</span>
                    </div>
                    <Plus className="w-4 h-4 text-[#71717A] group-hover:text-white" />
                  </button>
                ))
              ) : (
                <div className="text-center py-6 space-y-3">
                  <p className="text-xs text-[#4B5563]">Nenhum exercício encontrado com esse termo.</p>
                  
                  {/* Quick Custom Exercise Creation */}
                  <div className="max-w-md mx-auto p-3 bg-[#18181B] border border-[#27272A] rounded-xl space-y-2 text-left">
                    <span className="text-[10px] font-bold text-white uppercase">Criar Exercício Personalizado</span>
                    <input
                      type="text"
                      value={customExerciseName}
                      onChange={e => setCustomExerciseName(e.target.value)}
                      placeholder="Nome do exercício..."
                      className="w-full bg-[#121212] border border-[#27272A] rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                    <div className="flex gap-2">
                      <select
                        value={customExerciseMuscle}
                        onChange={e => setCustomExerciseMuscle(e.target.value as MuscleGroup)}
                        className="flex-1 bg-[#121212] border border-[#27272A] rounded-lg px-2 py-1.5 text-xs text-white"
                      >
                        {MUSCLE_GROUPS.filter(m => m !== 'Todos').map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleCreateAndAddCustomExercise}
                        disabled={!customExerciseName.trim()}
                        className="px-3 py-1.5 bg-[#374151] text-white text-xs font-bold rounded-lg disabled:opacity-80"
                      >
                        Criar & Adicionar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
