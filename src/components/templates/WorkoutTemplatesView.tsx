import React, { useState, useMemo } from 'react';
import { 
  Dumbbell, 
  Plus, 
  Edit, 
  Trash2, 
  Archive,
  Copy, 
  UserCheck, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Info,
  BookOpen,
  Tag,
  Activity,
  ArrowRight,
  SlidersHorizontal,
  Flame
, FileText } from 'lucide-react';
import { WorkoutTemplate, Student, WorkoutRoutine } from '../../types';
import { useApp } from '../../context/AppContext';
import { TemplateEditorModal } from './TemplateEditorModal';
import { ApplyTemplateModal } from './ApplyTemplateModal';
import { RoutinePDFModal } from '../routines/RoutinePDFModal';
import { formatPrescriptionSummary } from '../../utils/calculations';
import { 
  SearchBar, 
  FilterChip, 
  SortMenu, 
  ActiveFilters, 
  EmptyFilterState, 
  ActiveFilterItem,
  SortOption
} from '../common/search';
import { searchInFields } from '../../utils/searchAndFilter';

interface WorkoutTemplatesViewProps {
  onSelectStudent?: (student: Student, tab?: string) => void;
}

type TemplateSortOption = 'recent' | 'name_asc' | 'name_desc' | 'workouts_desc';

const TEMPLATE_SORT_OPTIONS: SortOption<TemplateSortOption>[] = [
  { value: 'recent', label: 'Modificados Recentemente', shortLabel: 'Recentes' },
  { value: 'name_asc', label: 'Nome (A → Z)', shortLabel: 'A → Z' },
  { value: 'name_desc', label: 'Nome (Z → A)', shortLabel: 'Z → A' },
  { value: 'workouts_desc', label: 'Mais Divisões / Treinos', shortLabel: 'Divisões' }
];

const LEVEL_FILTERS = ['Todos', 'Iniciante', 'Intermediário', 'Avançado', 'Atleta / Performance'];

export const WorkoutTemplatesView: React.FC<WorkoutTemplatesViewProps> = ({
  onSelectStudent
}) => {
  const { 
    workoutTemplates, 
    deleteWorkoutTemplate, 
    archiveWorkoutTemplate,
    duplicateWorkoutTemplate 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('Todos');
  const [sortOption, setSortOption] = useState<TemplateSortOption>('recent');
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [applyingTemplate, setApplyingTemplate] = useState<WorkoutTemplate | null>(null);
  const [selectedTemplateForPDF, setSelectedTemplateForPDF] = useState<WorkoutTemplate | null>(null);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [activeWorkoutTabByTemplate, setActiveWorkoutTabByTemplate] = useState<Record<string, string>>({});

  // Filtered & Sorted Templates
  const filteredTemplates = useMemo(() => {
    return workoutTemplates.filter(t => {
      const matchesSearch = searchInFields([t.name, t.objective, t.description], searchQuery);
      const matchesLevel = selectedLevelFilter === 'Todos' || t.level === selectedLevelFilter;
      return matchesSearch && matchesLevel;
    }).sort((a, b) => {
      if (sortOption === 'recent') {
        return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
      }
      if (sortOption === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortOption === 'name_desc') {
        return b.name.localeCompare(a.name);
      }
      if (sortOption === 'workouts_desc') {
        return (b.workouts?.length || 0) - (a.workouts?.length || 0);
      }
      return 0;
    });
  }, [workoutTemplates, searchQuery, selectedLevelFilter, sortOption]);

  // Active filters list
  const activeFilterItems: ActiveFilterItem[] = useMemo(() => {
    const items: ActiveFilterItem[] = [];
    if (searchQuery.trim()) {
      items.push({ id: 'search', label: 'Busca', valueLabel: `"${searchQuery}"` });
    }
    if (selectedLevelFilter !== 'Todos') {
      items.push({ id: 'level', label: 'Nível', valueLabel: selectedLevelFilter });
    }
    return items;
  }, [searchQuery, selectedLevelFilter]);

  const handleRemoveFilter = (id: string) => {
    if (id === 'search') setSearchQuery('');
    if (id === 'level') setSelectedLevelFilter('Todos');
  };

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSelectedLevelFilter('Todos');
  };

  const handleDuplicate = async (template: WorkoutTemplate) => {
    try {
      await duplicateWorkoutTemplate(template);
    } catch (err) {
      console.error('Erro ao duplicar modelo:', err);
      alert('Erro ao duplicar modelo.');
    }
  };

  const handleArchive = async (template: WorkoutTemplate) => {
    if (window.confirm(`Deseja arquivar o modelo "${template.name}"? Ele será ocultado da lista ativa.`)) {
      try {
        await archiveWorkoutTemplate(template.id);
      } catch (err) {
        console.error('Erro ao arquivar modelo:', err);
        alert('Erro ao arquivar modelo.');
      }
    }
  };

  const handleDelete = async (template: WorkoutTemplate) => {
    if (window.confirm(`Tem certeza que deseja excluir o modelo "${template.name}"? Esta ação não pode ser desfeita.`)) {
      try {
        await deleteWorkoutTemplate(template.id);
      } catch (err) {
        console.error('Erro ao excluir modelo:', err);
        alert('Erro ao excluir modelo.');
      }
    }
  };

  const handleTemplateApplied = (student: Student) => {
    if (onSelectStudent) {
      onSelectStudent(student, 'routines');
    }
  };

  return (
    <div className="space-y-5 pb-16">
      
      {/* Top Header Banner */}
      <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] text-[#374151]">
              <Layers className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black font-display uppercase tracking-wide text-white">
              Modelos de Treino
            </h1>
            <span className="px-2.5 py-1 rounded-lg bg-[#18181B] border border-[#27272A] text-xs font-bold text-[#4B5563]">
              {workoutTemplates.length} {workoutTemplates.length === 1 ? 'modelo' : 'modelos'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#4B5563] mt-1">
            Biblioteca de rotinas base e templates prontos para aplicar rapidamente a qualquer aluno.
          </p>
        </div>

        <button
          onClick={() => setIsCreatingNew(true)}
          className="px-5 py-3 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all shadow-lg shadow-xs flex items-center justify-center gap-2 self-start md:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>NOVO MODELO</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#121212] border border-[#27272A] rounded-2xl p-3 sm:p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="w-full md:w-80 lg:w-96">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Buscar por nome, objetivo ou descrição..."
              size="sm"
            />
          </div>

          {/* Level Filters + Sort Menu */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {LEVEL_FILTERS.map(lvl => (
                <FilterChip
                  key={lvl}
                  label={lvl}
                  isActive={selectedLevelFilter === lvl}
                  onClick={() => setSelectedLevelFilter(lvl)}
                  size="sm"
                />
              ))}
            </div>

            <SortMenu<TemplateSortOption>
              options={TEMPLATE_SORT_OPTIONS}
              value={sortOption}
              onChange={setSortOption}
              label="Ordenar"
              size="sm"
            />
          </div>
        </div>

        {/* Active Filters Badges */}
        <ActiveFilters
          filters={activeFilterItems}
          onRemove={handleRemoveFilter}
          onClearAll={handleClearAllFilters}
        />
      </div>

      {/* Templates List / Grid */}
      {workoutTemplates.length === 0 ? (
        /* Empty State */
        <div className="bg-[#121212] border-2 border-dashed border-[#27272A] rounded-3xl p-10 sm:p-16 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#18181B] border border-white/5 flex items-center justify-center text-[#374151]">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="max-w-md space-y-1.5">
            <h3 className="text-lg font-bold text-white">Nenhum modelo de treino cadastrado</h3>
            <p className="text-xs text-[#4B5563]">
              Sua biblioteca de modelos está vazia. Crie templates reutilizáveis (como Hipertrofia ABC, Full Body 3x, etc.) ou salve uma rotina diretamente da aba de qualquer aluno.
            </p>
          </div>
          <button
            onClick={() => setIsCreatingNew(true)}
            className="mt-2 px-6 py-3 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all shadow-lg shadow-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>CRIAR PRIMEIRO MODELO</span>
          </button>
        </div>
      ) : filteredTemplates.length === 0 ? (
        /* Search Not Found State */
        <EmptyFilterState
          title="Nenhum modelo encontrado"
          description="Nenhum modelo corresponde aos filtros ou termos pesquisados."
          searchTerm={searchQuery}
          onClearFilters={handleClearAllFilters}
        />
      ) : (
        /* Templates Grid: 1 col on mobile, 2 col on tablet, 3 col on large screens */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTemplates.map(template => {
            const workoutsCount = template.workouts?.length || 0;
            const totalExercises = template.workouts?.reduce((s, w) => s + (w.exercises?.length || 0), 0) || 0;
            const isExpanded = expandedTemplateId === template.id;
            const selectedWorkoutId = activeWorkoutTabByTemplate[template.id] || template.workouts[0]?.id;
            const selectedWorkout = template.workouts.find(w => w.id === selectedWorkoutId) || template.workouts[0];

            return (
              <div
                key={template.id}
                className="bg-[#121212] border border-[#27272A] hover:border-[#3F3F46] rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all space-y-4 group"
              >
                {/* Card Header */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        {template.level && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#18181B] text-[#4B5563] border border-[#27272A]">
                            {template.level}
                          </span>
                        )}
                        {template.objective && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]">
                            {template.objective}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-black font-display uppercase tracking-wide text-white group-hover:text-[#1F2937] transition-colors">
                        {template.name}
                      </h3>
                    </div>

                    {/* Actions Menu */}
                    <details className="relative shrink-0">
                      <summary className="list-none cursor-pointer p-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] border border-[#27272A] transition-all text-xs font-semibold">
                        <span className="sr-only">Ações do modelo</span>
                        <MoreHorizontal className="w-4 h-4" />
                      </summary>
                      <div className="absolute right-0 top-full mt-2 z-20 min-w-44 rounded-xl border border-[#3F3F46] bg-[#18181B] p-1.5 shadow-xl space-y-1">
                        <button onClick={() => setSelectedTemplateForPDF(template)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#27272A] text-xs text-white flex items-center gap-2" title="Gerar PDF"><FileText className="w-4 h-4" />Gerar PDF</button>
                        <button onClick={() => handleDuplicate(template)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#27272A] text-xs text-white flex items-center gap-2" title="Duplicar modelo"><Copy className="w-4 h-4" />Duplicar</button>
                        <button onClick={() => setEditingTemplate(template)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#27272A] text-xs text-white flex items-center gap-2" title="Editar modelo"><Edit className="w-4 h-4" />Editar</button>
                        <button onClick={() => handleArchive(template)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#27272A] text-xs text-white flex items-center gap-2" title="Arquivar modelo"><Archive className="w-4 h-4" />Arquivar</button>
                        <button onClick={() => handleDelete(template)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-950/50 text-xs text-red-300 flex items-center gap-2" title="Excluir modelo permanentemente"><Trash2 className="w-4 h-4" />Excluir permanentemente</button>
                      </div>
                    </details>
                  </div>

                  {/* Description */}
                  {template.description && (
                    <p className="text-xs text-[#4B5563] mt-2 line-clamp-2 leading-relaxed">
                      {template.description}
                    </p>
                  )}

                  {/* Summary Badges */}
                  <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[#27272A] text-xs text-[#4B5563]">
                    <div className="flex items-center gap-1.5 font-bold text-white">
                      <Layers className="w-3.5 h-3.5 text-[#374151]" />
                      <span>{workoutsCount} {workoutsCount === 1 ? 'treino' : 'treinos'}</span>
                    </div>
                    <span className="text-[#27272A]">•</span>
                    <div className="flex items-center gap-1.5">
                      <Dumbbell className="w-3.5 h-3.5 text-[#71717A]" />
                      <span>{totalExercises} {totalExercises === 1 ? 'exercício' : 'exercícios'}</span>
                    </div>
                  </div>
                </div>

                {/* Expanded Workout Breakdown */}
                {isExpanded && template.workouts && template.workouts.length > 0 && (
                  <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-3.5 space-y-3">
                    {/* Workout tabs selector */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-[#27272A]">
                      {template.workouts.map(w => {
                        const isTabActive = (activeWorkoutTabByTemplate[template.id] || template.workouts[0]?.id) === w.id;
                        return (
                          <button
                            key={w.id}
                            onClick={() => setActiveWorkoutTabByTemplate(prev => ({ ...prev, [template.id]: w.id }))}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                              isTabActive
                                ? 'bg-[#374151] text-white shadow-sm'
                                : 'text-[#4B5563] hover:text-white'
                            }`}
                          >
                            {w.name} ({w.exercises?.length || 0})
                          </button>
                        );
                      })}
                    </div>

                    {/* Selected Workout Exercise list preview */}
                    {selectedWorkout && selectedWorkout.exercises && selectedWorkout.exercises.length > 0 ? (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {selectedWorkout.exercises.map((ex, exIdx) => (
                          <div
                            key={ex.id || exIdx}
                            className="bg-[#121212] border border-[#27272A] rounded-lg px-2.5 py-1.5 flex items-center justify-between text-xs gap-2"
                          >
                            <div className="min-w-0 flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-[#18181B] text-[10px] font-bold text-[#4B5563] flex items-center justify-center shrink-0 border border-[#27272A]">
                                {ex.order ?? exIdx + 1}
                              </span>
                              <span className="text-white font-medium truncate">{ex.exerciseName}</span>
                            </div>
                            <span className="text-[11px] text-[#4B5563] font-mono-nums shrink-0">
                              {formatPrescriptionSummary(ex)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#71717A] italic py-2 text-center">Nenhum exercício neste treino</p>
                    )}
                  </div>
                )}

                {/* Footer Controls */}
                <div className="pt-2 border-t border-[#27272A] flex items-center justify-between gap-2">
                  <button
                    onClick={() => setExpandedTemplateId(isExpanded ? null : template.id)}
                    className="text-xs font-bold text-[#4B5563] hover:text-white flex items-center gap-1 transition-colors px-1 py-2"
                  >
                    <span>{isExpanded ? 'Ocultar detalhes' : 'Ver exercícios'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => setApplyingTemplate(template)}
                    className="px-4 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all shadow-md shadow-xs flex items-center gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Aplicar a Aluno</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT TEMPLATE MODAL */}
      {(isCreatingNew || editingTemplate) && (
        <TemplateEditorModal
          templateToEdit={editingTemplate}
          onClose={() => {
            setIsCreatingNew(false);
            setEditingTemplate(null);
          }}
          onSaved={() => {
            setIsCreatingNew(false);
            setEditingTemplate(null);
          }}
        />
      )}

            {/* PDF MODAL */}
      {selectedTemplateForPDF && (
        <RoutinePDFModal
          sourceType="template"
          template={selectedTemplateForPDF}
          onClose={() => setSelectedTemplateForPDF(null)}
        />
      )}
      
      {/* APPLY TEMPLATE TO STUDENT MODAL */}
      {applyingTemplate && (
        <ApplyTemplateModal
          template={applyingTemplate}
          onClose={() => setApplyingTemplate(null)}
          onApplied={(student) => {
            setApplyingTemplate(null);
            handleTemplateApplied(student);
          }}
        />
      )}

    </div>
  );
};
