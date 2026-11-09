import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Plus, 
  Info, 
  Dumbbell, 
  X, Trash2, 
  Check, 
  ChevronRight, 
  Flame,
  SlidersHorizontal,
  Layers,
  Sparkles
} from 'lucide-react';
import { useEffect } from 'react';
import { Exercise, MuscleGroup } from '../../types';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../db/indexedDB';
import { 
  SearchBar, 
  FilterChip, 
  SortMenu, 
  ActiveFilters, 
  EmptyFilterState, 
  FilterDrawer,
  ActiveFilterItem,
  SortOption
} from '../common/search';
import { searchInFields } from '../../utils/searchAndFilter';

type ExerciseSortOption = 'name_asc' | 'name_desc' | 'muscle_asc';

const EXERCISE_SORT_OPTIONS: SortOption<ExerciseSortOption>[] = [
  { value: 'name_asc', label: 'Nome (A → Z)', shortLabel: 'A → Z' },
  { value: 'name_desc', label: 'Nome (Z → A)', shortLabel: 'Z → A' },
  { value: 'muscle_asc', label: 'Grupo Muscular', shortLabel: 'Músculo' }
];

const MUSCLE_GROUPS: string[] = [
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
  'Antebraço'
];

const EQUIPMENT_OPTIONS = [
  'Todos',
  'Barra',
  'Halteres',
  'Máquina',
  'Polia',
  'Peso Corporal',
  'Elástico',
  'Outros'
];

export const ExerciseBankView: React.FC = () => {
  const { exerciseCatalog: exercises, saveExercise, deleteExercise } = useApp();
  const [selectedMuscle, setSelectedMuscle] = useState<string>('Todos');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('Todos');
  const [originFilter, setOriginFilter] = useState<'all' | 'custom' | 'standard'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOption, setSortOption] = useState<ExerciseSortOption>('name_asc');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState<boolean>(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [visibleCount, setVisibleCount] = useState(50);

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null);
  const [isDeletingEx, setIsDeletingEx] = useState<boolean>(false);

  // New Custom Exercise state
  const [newEx, setNewEx] = useState<{
    name: string;
    muscleGroup: MuscleGroup;
    equipment: string;
    steps: string;
    tips: string;
    restSeconds: number;
  }>({
    name: '',
    muscleGroup: 'Peitoral',
    equipment: 'Halteres',
    steps: 'Executar com controle mantendo a postura firme.',
    tips: 'Manter escápulas retraídas.',
    restSeconds: 60
  });

  // Filtered & Sorted Exercises
  const filteredExercises = useMemo(() => {
    return exercises.filter(ex => {
      // 1. Muscle filter
      const matchesMuscle = selectedMuscle === 'Todos' || ex.muscleGroup === selectedMuscle;
      if (!matchesMuscle) return false;

      // 2. Equipment filter
      if (selectedEquipment !== 'Todos') {
        const eq = (ex.equipment || '').toLowerCase();
        const target = selectedEquipment.toLowerCase();
        if (target === 'peso corporal') {
          if (!eq.includes('corporal') && !eq.includes('livre') && !eq.includes('bodyweight')) return false;
        } else if (!eq.includes(target)) {
          return false;
        }
      }

      // 3. Origin filter (custom / standard)
      if (originFilter === 'custom' && !ex.isCustom) return false;
      if (originFilter === 'standard' && ex.isCustom) return false;

      // 4. Search query
      const matchesSearch = searchInFields([ex.name, ex.equipment, ex.muscleGroup], searchTerm);
      return matchesSearch;
    }).sort((a, b) => {
      if (sortOption === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortOption === 'name_desc') {
        return b.name.localeCompare(a.name);
      }
      if (sortOption === 'muscle_asc') {
        const mComp = a.muscleGroup.localeCompare(b.muscleGroup);
        if (mComp !== 0) return mComp;
        return a.name.localeCompare(b.name);
      }
      return 0;
    });
  }, [exercises, selectedMuscle, selectedEquipment, originFilter, searchTerm, sortOption]);

  // Active filters list
  useEffect(() => {
    setVisibleCount(50);
  }, [selectedMuscle, selectedEquipment, originFilter, searchTerm, sortOption]);

  const activeFilterItems: ActiveFilterItem[] = useMemo(() => {
    const items: ActiveFilterItem[] = [];
    if (searchTerm.trim()) {
      items.push({ id: 'search', label: 'Busca', valueLabel: `"${searchTerm}"` });
    }
    if (selectedMuscle !== 'Todos') {
      items.push({ id: 'muscle', label: 'Grupo', valueLabel: selectedMuscle });
    }
    if (selectedEquipment !== 'Todos') {
      items.push({ id: 'equipment', label: 'Equipamento', valueLabel: selectedEquipment });
    }
    if (originFilter !== 'all') {
      items.push({ 
        id: 'origin', 
        label: 'Origem', 
        valueLabel: originFilter === 'custom' ? 'Criados por Mim' : 'Padrão TFIVE' 
      });
    }
    return items;
  }, [searchTerm, selectedMuscle, selectedEquipment, originFilter]);

  const handleRemoveFilter = (id: string) => {
    if (id === 'search') setSearchTerm('');
    if (id === 'muscle') setSelectedMuscle('Todos');
    if (id === 'equipment') setSelectedEquipment('Todos');
    if (id === 'origin') setOriginFilter('all');
  };

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setSelectedMuscle('Todos');
    setSelectedEquipment('Todos');
    setOriginFilter('all');
  };

  const handleDeleteExercise = async () => {
    if (!exerciseToDelete) return;
    setIsDeletingEx(true);
    try {
      await deleteExercise(exerciseToDelete.id);
      setSelectedExercise(null);
    } catch (err) {
      console.error('Error deleting exercise:', err);
      alert('Não foi possível excluir. Este exercício pode estar em uso e não pode ser apagado para preservar a integridade do histórico.');
    } finally {
      setIsDeletingEx(false);
      setExerciseToDelete(null);
    }
  };

  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEx.name) return;

    const customExercise: Exercise = {
      id: generateId('exercise'),
      name: newEx.name,
      muscleGroup: newEx.muscleGroup,
      equipment: newEx.equipment,
      executionSteps: newEx.steps.split('\n').filter(s => s.trim().length > 0),
      tips: newEx.tips.split('\n').filter(t => t.trim().length > 0),
      defaultRestSeconds: newEx.restSeconds,
      isCustom: true
    };

    try {
      await saveExercise(customExercise);
      alert('Exercício criado com sucesso!');
      setShowAddModal(false);
      setNewEx({
        name: '',
        muscleGroup: 'Peitoral',
        equipment: 'Halteres',
        steps: 'Executar com controle.',
        tips: '',
        restSeconds: 60
      });
    } catch (err: any) {
      console.error('Erro ao criar exercício:', err);
      alert(`Erro ao criar exercício: ${err.message || 'Verifique o console para mais detalhes.'}`);
    }
  };

  return (
    <div className="space-y-5 pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-[#374151]" />
            <h1 className="text-2xl sm:text-3xl font-black font-display text-white">Banco de Exercícios</h1>
            <span className="px-2.5 py-0.5 rounded-lg bg-[#18181B] border border-[#27272A] text-xs font-bold text-[#4B5563]">
              {exercises.length}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#4B5563]">
            Catálogo completo com biomecânica detalhada, equipamentos e dicas
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white font-bold font-display text-sm sm:text-base tracking-wider transition-all shadow-lg shadow-xs shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          <span>CRIAR EXERCÍCIO</span>
        </button>
      </div>

      {/* Search & Filter Controls Bar */}
      <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-3 sm:p-4 space-y-3">
        
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          {/* Search input */}
          <div className="w-full md:w-80 lg:w-96">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar por nome ou equipamento..."
              size="sm"
            />
          </div>

          {/* Sort & Advanced Filters Button */}
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsFilterDrawerOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                activeFilterItems.some(f => f.id === 'equipment' || f.id === 'origin')
                  ? 'bg-[#F3F4F6] text-[#374151] border-[#D1D5DB]'
                  : 'bg-[#18181B] text-[#4B5563] hover:text-white border-[#27272A]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filtros</span>
              {(selectedEquipment !== 'Todos' || originFilter !== 'all') && (
                <span className="w-2 h-2 rounded-full bg-[#374151]" />
              )}
            </button>

            <SortMenu<ExerciseSortOption>
              options={EXERCISE_SORT_OPTIONS}
              value={sortOption}
              onChange={setSortOption}
              size="sm"
            />
          </div>
        </div>

        {/* Muscle Group Chips Scroll */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin scrollbar-thumb-[#27272A]">
          {MUSCLE_GROUPS.map(group => (
            <FilterChip
              key={group}
              label={group}
              isActive={selectedMuscle === group}
              onClick={() => setSelectedMuscle(group)}
              size="sm"
            />
          ))}
        </div>

        {/* Active Filters Badges */}
        <ActiveFilters
          filters={activeFilterItems}
          onRemove={handleRemoveFilter}
          onClearAll={handleClearAllFilters}
        />
      </div>

      {/* Exercise Cards Grid */}
      {filteredExercises.length > 0 ? (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredExercises.slice(0, visibleCount).map(ex => (
            <div
              key={ex.id}
              onClick={() => setSelectedExercise(ex)}
              className="bg-[#121212] border border-[#27272A] hover:border-[#374151] rounded-2xl p-4 flex flex-col justify-between transition-all cursor-pointer group shadow-sm hover:shadow-lg hover:shadow-xs relative overflow-hidden"
            >
              {ex.isCustom && (
                <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-[#F3F4F6] border border-[#E5E7EB] text-[#374151] text-[9px] font-black uppercase">
                  Personalizado
                </span>
              )}

              <div>
                <div className="flex items-center justify-between gap-2 mb-2 pr-16">
                  <span className="px-2 py-0.5 rounded bg-[#18181B] text-[#374151] text-[10px] font-black uppercase tracking-wider border border-[#27272A]">
                    {ex.muscleGroup}
                  </span>
                  <span className="text-[11px] text-[#4B5563] font-mono-nums">{ex.defaultRestSeconds}s rest</span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-[#1F2937] transition-colors">{ex.name}</h3>
                <p className="text-xs text-[#4B5563] mt-1">{ex.equipment || 'Equipamento livre'}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#27272A] flex items-center justify-between text-xs text-[#4B5563] group-hover:text-white">
                <span>Ver detalhes biomecânicos</span>
                <ChevronRight className="w-4 h-4 text-[#374151]" />
              </div>
            </div>
          ))}
        </div>
        {filteredExercises.length > visibleCount && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => setVisibleCount(prev => prev + 50)}
              className="px-6 py-3 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] rounded-xl text-white font-medium transition-colors"
            >
              Carregar mais exercícios
            </button>
          </div>
        )}
        </>
      ) : (
        <EmptyFilterState
          title="Nenhum exercício encontrado"
          description="Tente ajustar os termos de busca, grupo muscular ou equipamento."
          searchTerm={searchTerm}
          onClearFilters={activeFilterItems.length > 0 ? handleClearAllFilters : undefined}
          actionButton={
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Criar Exercício</span>
            </button>
          }
        />
      )}

      {/* Filter Drawer / Sheet */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        title="Filtrar Catálogo de Exercícios"
        activeCount={
          (selectedEquipment !== 'Todos' ? 1 : 0) + 
          (originFilter !== 'all' ? 1 : 0) + 
          (selectedMuscle !== 'Todos' ? 1 : 0)
        }
        onClearAll={handleClearAllFilters}
      >
        <div className="space-y-5">
          {/* Origin Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
              Origem do Exercício
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'custom', label: 'Meus Criados' },
                { id: 'standard', label: 'Padrão TFIVE' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setOriginFilter(opt.id as typeof originFilter)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold text-center border transition-all ${
                    originFilter === opt.id
                      ? 'bg-[#374151] text-white border-[#374151]'
                      : 'bg-[#18181B] text-[#4B5563] hover:text-white border-[#27272A]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Equipment Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
              Equipamento Necessário
            </label>
            <div className="grid grid-cols-2 gap-2">
              {EQUIPMENT_OPTIONS.map(eq => (
                <button
                  key={eq}
                  type="button"
                  onClick={() => setSelectedEquipment(eq)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold text-left border transition-all flex items-center justify-between ${
                    selectedEquipment === eq
                      ? 'bg-[#374151] text-white border-[#374151]'
                      : 'bg-[#18181B] text-[#4B5563] hover:text-white border-[#27272A]'
                  }`}
                >
                  <span>{eq}</span>
                  {selectedEquipment === eq && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </FilterDrawer>

      {/* Exercise Detail Modal */}
      {selectedExercise && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#27272a] rounded-3xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-bold text-[#374151] uppercase">{selectedExercise.muscleGroup}</span>
                <h3 className="text-2xl font-bold font-display text-white">{selectedExercise.name}</h3>
              </div>
              <button 
                onClick={() => setSelectedExercise(null)}
                className="p-1.5 rounded-lg bg-[#18181B] text-[#4B5563] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-[#18181B] p-3.5 rounded-xl border border-[#27272A]">
                <p className="font-bold text-white mb-1">Equipamento Utilizado</p>
                <p className="text-[#4B5563]">{selectedExercise.equipment}</p>
              </div>

              {selectedExercise.secondaryMuscles && (
                <div className="bg-[#18181B] p-3.5 rounded-xl border border-[#27272A]">
                  <p className="font-bold text-white mb-1">Músculos Secundários / Sinérgicos</p>
                  <p className="text-[#4B5563]">{selectedExercise.secondaryMuscles.join(', ')}</p>
                </div>
              )}

              <div>
                <p className="font-bold text-white mb-2 text-sm">Passo a Passo de Execução</p>
                <ol className="space-y-2 list-decimal list-inside text-[#4B5563]">
                  {selectedExercise.executionSteps.map((step, idx) => (
                    <li key={idx} className="leading-relaxed">{step}</li>
                  ))}
                </ol>
              </div>

              {selectedExercise.tips && selectedExercise.tips.length > 0 && (
                <div className="bg-[#F3F4F6] border border-[#E5E7EB] p-3.5 rounded-xl">
                  <p className="font-bold text-[#374151] mb-1">Dicas de Biomecânica TFIVE</p>
                  <ul className="list-disc list-inside space-y-1 text-white/90">
                    {selectedExercise.tips.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedExercise(null)}
              className="w-full mt-6 py-3 rounded-xl bg-[#374151] text-white font-bold text-sm"
            >
              FECHAR
            </button>
          </div>
        </div>
      )}

      {/* Add Custom Exercise Modal */}
      {exerciseToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir exercício?</h3>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              Tem certeza que deseja excluir <span className="font-bold">{exerciseToDelete.name}</span>? Se ele estiver em uso no histórico, será arquivado para preservar os dados.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setExerciseToDelete(null)}
                className="px-4 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteExercise}
                disabled={isDeletingEx}
                className="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-80 transition-colors flex items-center gap-2"
              >
                {isDeletingEx ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#27272a] rounded-3xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold font-display uppercase text-white">Criar Exercício Personalizado</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg bg-[#18181B] text-[#4B5563] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExercise} className="space-y-4 text-xs">
              <div>
                <label className="block text-white font-bold mb-1">Nome do Exercício</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Supino Inclinado na Máquina Convergente"
                  value={newEx.name}
                  onChange={e => setNewEx({ ...newEx, name: e.target.value })}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl p-3 text-white focus:outline-none focus:border-[#374151]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white font-bold mb-1">Grupo Muscular</label>
                  <select
                    value={newEx.muscleGroup}
                    onChange={e => setNewEx({ ...newEx, muscleGroup: e.target.value as MuscleGroup })}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-xl p-3 text-white focus:outline-none focus:border-[#374151]"
                  >
                    {MUSCLE_GROUPS.filter(g => g !== 'Todos').map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-white font-bold mb-1">Equipamento</label>
                  <input
                    type="text"
                    value={newEx.equipment}
                    onChange={e => setNewEx({ ...newEx, equipment: e.target.value })}
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-xl p-3 text-white focus:outline-none focus:border-[#374151]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white font-bold mb-1">Instruções de Execução (1 por linha)</label>
                <textarea
                  value={newEx.steps}
                  onChange={e => setNewEx({ ...newEx, steps: e.target.value })}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl p-3 text-white focus:outline-none focus:border-[#374151] h-20"
                />
              </div>

              <div>
                <label className="block text-white font-bold mb-1">Dicas Biomecânicas</label>
                <textarea
                  value={newEx.tips}
                  onChange={e => setNewEx({ ...newEx, tips: e.target.value })}
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-xl p-3 text-white focus:outline-none focus:border-[#374151] h-16"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white font-black font-display text-base tracking-wider transition-all shadow-lg shadow-xs"
              >
                SALVAR NO BANCO
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

