import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Dumbbell, 
  Plus, 
  Check, 
  Star, 
  Clock, 
  Filter, 
  X, 
  History,
  Sparkles,
  ChevronRight,
  Flame,
  Layers,
  ArrowRightLeft
} from 'lucide-react';
import { Exercise, MuscleGroup, Student, WorkoutSession } from '../../types';
import { 
  getFavoriteExerciseIds, 
  toggleFavoriteExercise, 
  getRecentExerciseIds,
  recordRecentExercise
} from '../../utils/trainerExercisePreferences';
import { getStudentExerciseHistory } from '../../utils/studentExerciseHistory';

interface ExerciseBankPanelProps {
  exercises: Exercise[];
  student?: Student;
  sessions?: WorkoutSession[];
  currentWorkoutLetter?: string;
  onAddExercise: (exercise: Exercise) => void;
  onSelectForReplace?: (exercise: Exercise) => void;
  replaceTargetName?: string;
  isReplaceMode?: boolean;
  onCancelReplace?: () => void;
  onClose?: () => void;
  isDrawer?: boolean;
}

const MUSCLE_FILTER_OPTIONS: (MuscleGroup | 'Todos')[] = [
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

const EQUIPMENT_FILTER_OPTIONS = [
  'Todos',
  'Barra',
  'Halteres',
  'Máquina',
  'Polia',
  'Peso Corporal',
  'Elástico',
  'Outros'
];

export const ExerciseBankPanel: React.FC<ExerciseBankPanelProps> = ({
  exercises,
  student,
  sessions,
  currentWorkoutLetter = 'A',
  onAddExercise,
  onSelectForReplace,
  replaceTargetName,
  isReplaceMode = false,
  onCancelReplace,
  onClose,
  isDrawer = false
}) => {
  // State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'recent' | 'favorites'>('all');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('Todos');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('Todos');
  const [favoritesList, setFavoritesList] = useState<string[]>([]);
  const [recentsList, setRecentsList] = useState<string[]>([]);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(50);

  // Load preferences from localStorage
  useEffect(() => {
    setFavoritesList(getFavoriteExerciseIds());
    setRecentsList(getRecentExerciseIds());
  }, []);

  const handleToggleFavorite = (e: React.MouseEvent, exerciseId: string) => {
    e.stopPropagation();
    const updated = toggleFavoriteExercise(exerciseId);
    setFavoritesList(updated);
  };

  const handleAdd = (exercise: Exercise) => {
    if (isReplaceMode && onSelectForReplace) {
      onSelectForReplace(exercise);
      return;
    }

    // Trigger visual feedback
    setRecentlyAddedId(exercise.id);
    recordRecentExercise(exercise.id);
    setRecentsList(getRecentExerciseIds());

    onAddExercise(exercise);

    setTimeout(() => {
      setRecentlyAddedId(null);
    }, 900);
  };

  // Filter exercises
  useEffect(() => {
    setVisibleCount(50);
  }, [searchQuery, selectedMuscle, selectedEquipment, activeTab]);

  const filteredExercises = useMemo(() => {
    return exercises.filter(ex => {
      if (ex.isArchived) return false;

      // Tab filter
      if (activeTab === 'favorites') {
        if (!favoritesList.includes(ex.id)) return false;
      } else if (activeTab === 'recent') {
        if (!recentsList.includes(ex.id)) return false;
      }

      // Muscle group filter
      if (selectedMuscle !== 'Todos') {
        if (ex.muscleGroup !== selectedMuscle) return false;
      }

      // Equipment filter
      if (selectedEquipment !== 'Todos') {
        const eq = (ex.equipment || '').toLowerCase();
        const targetEq = selectedEquipment.toLowerCase();
        if (targetEq === 'peso corporal' && (eq.includes('corporal') || eq.includes('livre') || eq.includes('bodyweight'))) {
          // match
        } else if (!eq.includes(targetEq)) {
          return false;
        }
      }

      // Search query (instant search)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const nameNorm = ex.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const muscleNorm = ex.muscleGroup.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const eqNorm = (ex.equipment || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const tagsNorm = (ex.functionalTags || []).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        return nameNorm.includes(q) || muscleNorm.includes(q) || eqNorm.includes(q) || tagsNorm.includes(q);
      }

      return true;
    }).sort((a, b) => {
      // If in recents tab, keep recents ordering
      if (activeTab === 'recent') {
        return recentsList.indexOf(a.id) - recentsList.indexOf(b.id);
      }
      return a.name.localeCompare(b.name);
    });
  }, [exercises, activeTab, favoritesList, recentsList, selectedMuscle, selectedEquipment, searchQuery]);

  return (
    <div className={`flex flex-col h-full bg-white text-[#1F2937] select-none ${
      isDrawer ? 'w-full max-w-md' : 'w-full'
    }`}>
      
      {/* PANEL HEADER */}
      <div className="p-3.5 sm:p-4 border-b border-[#E5E7EB] bg-[#141418] shrink-0 space-y-3">
        
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#374151]/15 border border-[#374151]/30 flex items-center justify-center text-[#374151] shrink-0">
              {isReplaceMode ? <ArrowRightLeft className="w-4 h-4" /> : <Dumbbell className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold font-display uppercase tracking-wider text-[#1F2937] truncate">
                {isReplaceMode ? 'Substituir Exercício' : 'Banco de Exercícios'}
              </h3>
              <p className="text-[10px] text-[#4B5563] truncate">
                {isReplaceMode 
                  ? `Substituindo: ${replaceTargetName || 'Exercício'}` 
                  : `Adicionando ao Treino ${currentWorkoutLetter}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isReplaceMode && onCancelReplace && (
              <button
                type="button"
                onClick={onCancelReplace}
                className="px-2.5 py-1 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-xs font-bold text-[#4B5563] hover:text-[#1F2937] transition-colors"
              >
                Cancelar
              </button>
            )}

            {isDrawer && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-[#27272A]/70 hover:bg-[#27272A] text-[#4B5563] hover:text-[#1F2937] transition-colors"
                title="Fechar banco lateral"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* INSTANT SEARCH INPUT */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#4B5563] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar exercício, grupo ou equipamento..."
            className="w-full bg-[#050505] border border-[#E5E7EB] focus:border-[#374151] rounded-xl pl-9 pr-8 py-2 text-xs font-bold text-[#1F2937] placeholder-[#71717A] focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-[#4B5563] hover:text-[#1F2937]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* CATEGORY TABS (TODOS, RECENTES, FAVORITOS) */}
        <div className="grid grid-cols-3 gap-1 bg-[#050505] p-1 rounded-xl border border-[#E5E7EB]">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-[#F8F9FA] text-[#1F2937] border border-[#E5E7EB] shadow-sm'
                : 'text-[#4B5563] hover:text-[#1F2937]'
            }`}
          >
            <Layers className="w-3 h-3 text-[#374151]" />
            <span>Todos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('recent')}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'recent'
                ? 'bg-[#F8F9FA] text-[#1F2937] border border-[#E5E7EB] shadow-sm'
                : 'text-[#4B5563] hover:text-[#1F2937]'
            }`}
          >
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Recentes</span>
            {recentsList.length > 0 && (
              <span className="text-[9px] font-mono-nums px-1 rounded bg-[#27272A] text-[#4B5563]">
                {recentsList.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('favorites')}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'favorites'
                ? 'bg-[#F8F9FA] text-[#1F2937] border border-[#E5E7EB] shadow-sm'
                : 'text-[#4B5563] hover:text-[#1F2937]'
            }`}
          >
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span>Favoritos</span>
            {favoritesList.length > 0 && (
              <span className="text-[9px] font-mono-nums px-1 rounded bg-[#27272A] text-[#4B5563]">
                {favoritesList.length}
              </span>
            )}
          </button>
        </div>

        {/* QUICK MUSCLE GROUP CHIPS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {MUSCLE_FILTER_OPTIONS.map(mg => {
            const isSelected = selectedMuscle === mg;
            return (
              <button
                key={mg}
                type="button"
                onClick={() => setSelectedMuscle(mg)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all shrink-0 ${
                  isSelected
                    ? 'bg-[#374151] text-white shadow-sm'
                    : 'bg-[#F8F9FA] text-[#4B5563] hover:text-[#1F2937] border border-[#E5E7EB]'
                }`}
              >
                {mg}
              </button>
            );
          })}
        </div>

      </div>

      {/* EXERCISES LIST */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0">
        {filteredExercises.length === 0 ? (
          <div className="py-10 text-center space-y-2 text-[#4B5563] px-4">
            <Dumbbell className="w-7 h-7 mx-auto opacity-70" />
            <p className="text-xs font-bold text-[#4B5563]">
              Nenhum exercício encontrado
            </p>
            <p className="text-[11px]">
              {activeTab === 'favorites'
                ? 'Toque na estrela de qualquer exercício para adicionar aos favoritos.'
                : activeTab === 'recent'
                ? 'Exercícios adicionados recentemente aparecerão aqui.'
                : 'Tente ajustar os termos de busca ou filtros.'}
            </p>
          </div>
        ) : (
          filteredExercises.slice(0, visibleCount).map(ex => {
            const isFav = favoritesList.includes(ex.id);
            const isJustAdded = recentlyAddedId === ex.id;

            // Fetch real student history ONLY if student is provided and has real sessions
            const history = getStudentExerciseHistory(student?.id, ex.id, ex.name, sessions);
            const lastExecutionSummary = history.lastExecution?.bestSetSummary;

            return (
              <div
                key={ex.id}
                onClick={() => handleAdd(ex)}
                className={`w-full p-2.5 sm:p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer group select-none ${
                  isJustAdded
                    ? 'bg-emerald-950/40 border-emerald-500/60 shadow-md shadow-emerald-900/20'
                    : 'bg-[#141418] hover:bg-[#18181C] border-[#E5E7EB] hover:border-[#D1D5DB]'
                }`}
              >
                {/* Exercise Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={e => handleToggleFavorite(e, ex.id)}
                      className="p-1 -ml-1 rounded-lg text-[#4B5563] hover:text-amber-400 transition-colors"
                      title={isFav ? 'Remover dos favoritos' : 'Favoritar exercício'}
                    >
                      <Star className={`w-3.5 h-3.5 ${isFav ? 'text-amber-400 fill-amber-400' : ''}`} />
                    </button>

                    <h4 className="text-xs font-bold text-[#1F2937] group-hover:text-[#374151] transition-colors truncate">
                      {ex.name}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#4B5563] flex-wrap">
                    <span className="font-semibold text-[#374151]">{ex.muscleGroup}</span>
                    {ex.equipment && (
                      <>
                        <span>•</span>
                        <span className="truncate">{ex.equipment}</span>
                      </>
                    )}
                  </div>

                  {/* REAL STUDENT EXECUTION BADGE (ONLY IF REAL DATA EXISTS) */}
                  {history.hasHistory && lastExecutionSummary && (
                    <div className="flex items-center gap-1.5 mt-1.5 pt-1 border-t border-[#E5E7EB]/70 text-[9px] font-mono-nums">
                      <span className="text-[#4B5563]">Última execução:</span>
                      <span className="font-bold text-[#1F2937] bg-[#0A0A0C] px-1.5 py-0.2 rounded border border-[#E5E7EB]">
                        {lastExecutionSummary}
                      </span>
                      {history.lastExecution?.date && (
                        <span className="text-[#4B5563] text-[8px]">
                          ({history.lastExecution.date})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick Add Button / Replace Button */}
                <div className="shrink-0">
                  {isReplaceMode ? (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleAdd(ex);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-[11px] font-bold transition-all shadow-sm"
                    >
                      Substituir
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleAdd(ex);
                      }}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                        isJustAdded
                          ? 'bg-emerald-500 text-[#1F2937] scale-110 shadow-md shadow-emerald-500/30'
                          : 'bg-[#F8F9FA] group-hover:bg-[#374151] text-[#4B5563] group-hover:text-[#1F2937] border border-[#E5E7EB]'
                      }`}
                      title="Adicionar ao treino atual"
                    >
                      {isJustAdded ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        {filteredExercises.length > visibleCount && (
          <div className="flex justify-center p-4">
            <button
              onClick={() => setVisibleCount(prev => prev + 50)}
              className="px-4 py-2 bg-[#27272A] hover:bg-[#374151] rounded-lg text-sm text-gray-300 font-medium transition-colors"
            >
              Carregar mais exercícios
            </button>
          </div>
        )}
      </div>

      {/* PANEL FOOTER */}
      <div className="p-3 border-t border-[#E5E7EB] bg-[#141418] shrink-0 text-center">
        <span className="text-[10px] text-[#4B5563] font-medium">
          {filteredExercises.length} {filteredExercises.length === 1 ? 'exercício disponível' : 'exercícios disponíveis'}
        </span>
      </div>

    </div>
  );
};
