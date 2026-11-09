import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Play, 
  ChevronRight, 
  Phone, 
  Check, 
  Dumbbell, 
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { Student, WorkoutRoutine, RoutineWorkout } from '../../types';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../db/indexedDB';
import { StudentAvatar } from '../common/StudentAvatar';
import { StudentPhotoPicker } from './StudentPhotoPicker';
import { StudentProfileView } from './StudentProfileView';
import { NewStudentModal } from './NewStudentModal';
import { 
  SearchBar, 
  FilterChip, 
  SortMenu, 
  EmptyFilterState, 
  SortOption 
} from '../common/search';
import { searchInFields } from '../../utils/searchAndFilter';

interface StudentsMasterDetailViewProps {
  selectedStudent: Student | null;
  onSelectStudent: (student: Student | null, initialTab?: string) => void;
  onStartWorkout: (student: Student, routine?: WorkoutRoutine, workout?: RoutineWorkout | string) => void;
  initialProfileTab?: string;
}

type StudentMasterSortOption = 'name_asc' | 'name_desc' | 'created_desc';

const MASTER_SORT_OPTIONS: SortOption<StudentMasterSortOption>[] = [
  { value: 'name_asc', label: 'Nome (A → Z)', shortLabel: 'A → Z' },
  { value: 'name_desc', label: 'Nome (Z → A)', shortLabel: 'Z → A' },
  { value: 'created_desc', label: 'Mais Recentes', shortLabel: 'Recentes' }
];

export const StudentsMasterDetailView: React.FC<StudentsMasterDetailViewProps> = ({
  selectedStudent,
  onSelectStudent,
  onStartWorkout,
  initialProfileTab = 'summary'
}) => {
  const { students, saveStudent } = useApp();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortOption, setSortOption] = useState<StudentMasterSortOption>('name_asc');
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [currentProfileTab, setCurrentProfileTab] = useState<string>(initialProfileTab);

  // Filter students based on search and status
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = searchInFields(
        [student.name, student.goal, student.phone, student.email, student.planName],
        searchTerm
      );
      const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      if (sortOption === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortOption === 'name_desc') {
        return b.name.localeCompare(a.name);
      }
      if (sortOption === 'created_desc') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      }
      return 0;
    });
  }, [students, searchTerm, statusFilter, sortOption]);

  // Keep selected student synced if list updates
  const activeSelectedStudent = useMemo(() => {
    if (!selectedStudent) return null;
    return students.find(s => s.id === selectedStudent.id) || selectedStudent;
  }, [students, selectedStudent]);

  // Auto-select first student on tablet/desktop landscape if none selected and students exist
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768 && !selectedStudent && students.length > 0) {
      onSelectStudent(students[0]);
    }
  }, [students, selectedStudent, onSelectStudent]);

  return (
    <div className="w-full">
      
      {/* Tablet-First Master-Detail Grid */}
      <div className="flex flex-col md:flex-row gap-4 lg:gap-6 min-h-[calc(100vh-140px)]">
        
        {/* ========================================================
            MASTER COLUMN: LISTA DE ALUNOS (Left side on Tablet)
           ======================================================== */}
        <div 
          className={`w-full md:w-[320px] lg:w-[380px] shrink-0 flex flex-col bg-[#0E0E11] border border-[#27272A] rounded-2xl md:rounded-3xl p-3.5 sm:p-4 shadow-xl ${
            activeSelectedStudent ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Top Master Header & Actions */}
          <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-[#27272A]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#F3F4F6] text-[#374151]">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black font-display uppercase tracking-wider text-white">
                  Alunos ({students.length})
                </h2>
                <p className="text-[10px] text-[#4B5563]">Selecione para gerenciar</p>
              </div>
            </div>

            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all shadow-md shadow-xs"
              title="Cadastrar Novo Aluno"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="mb-2.5">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar aluno ou objetivo..."
              size="sm"
            />
          </div>

          {/* Status Filter Chips + Sort */}
          <div className="flex items-center justify-between gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-none">
            <div className="flex items-center gap-1">
              <FilterChip
                label="Todos"
                count={students.length}
                isActive={statusFilter === 'all'}
                onClick={() => setStatusFilter('all')}
                size="sm"
              />
              <FilterChip
                label="Ativos"
                count={students.filter(s => s.status === 'active').length}
                isActive={statusFilter === 'active'}
                onClick={() => setStatusFilter('active')}
                size="sm"
              />
              <FilterChip
                label="Inativos"
                count={students.filter(s => s.status === 'inactive').length}
                isActive={statusFilter === 'inactive'}
                onClick={() => setStatusFilter('inactive')}
                size="sm"
              />
            </div>

            <SortMenu<StudentMasterSortOption>
              options={MASTER_SORT_OPTIONS}
              value={sortOption}
              onChange={setSortOption}
              label=""
              size="sm"
            />
          </div>

          {/* Scrollable Students List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
            {filteredStudents.length > 0 ? (
              filteredStudents.map(student => {
                const isSelected = activeSelectedStudent?.id === student.id;
                return (
                  <div
                    key={student.id}
                    onClick={() => onSelectStudent(student)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 group relative select-none ${
                      isSelected
                        ? 'bg-[#18181B] border-[#374151] shadow-lg shadow-xs'
                        : 'bg-[#121214] border-[#27272A] hover:border-zinc-700 hover:bg-[#18181B]'
                    }`}
                  >
                    {/* Left active vertical indicator */}
                    {isSelected && (
                      <span className="absolute left-0 top-3 bottom-3 w-1 bg-[#374151] rounded-r" />
                    )}

                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pl-1">
                      <StudentAvatar
                        name={student.name}
                        photo={student.photo}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className={`text-xs font-bold truncate ${
                            isSelected ? 'text-white font-black' : 'text-zinc-200 group-hover:text-white'
                          }`}>
                            {student.name}
                          </h3>
                        </div>
                        <p className="text-[10px] text-[#4B5563] truncate mt-0.5">
                          {student.goal || 'Hipertrofia'}
                        </p>
                      </div>
                    </div>

                    {/* Right side status badge and quick training trigger */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        student.status === 'active' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-[#27272A] text-[#71717A]'
                      }`}>
                        {student.status === 'active' ? 'Ativo' : 'Inat'}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartWorkout(student);
                        }}
                        className="p-2 rounded-xl bg-[#F3F4F6] hover:bg-[#1F2937] text-[#374151] hover:text-white border border-[#E5E7EB] hover:border-[#374151] transition-all"
                        title="Iniciar Treino Rápido"
                      >
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyFilterState
                title="Nenhum aluno encontrado"
                description="Tente ajustar sua busca ou status."
                searchTerm={searchTerm}
                onClearFilters={
                  searchTerm || statusFilter !== 'all'
                    ? () => {
                        setSearchTerm('');
                        setStatusFilter('all');
                      }
                    : undefined
                }
              />
            )}
          </div>
        </div>

        {/* ========================================================
            DETAIL COLUMN: PERFIL COMPLETO DO ALUNO SELECIONADO
           ======================================================== */}
        <div 
          className={`flex-1 flex flex-col min-w-0 ${
            !activeSelectedStudent ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeSelectedStudent ? (
            <div className="w-full">
              {/* Back to list button on mobile */}
              <div className="md:hidden mb-3">
                <button
                  onClick={() => onSelectStudent(null)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#18181B] border border-[#27272A] text-xs font-bold text-[#4B5563] hover:text-white transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar para Lista de Alunos</span>
                </button>
              </div>

              {/* Full Profile View */}
              <StudentProfileView
                student={activeSelectedStudent}
                initialTab={currentProfileTab}
                onBack={() => onSelectStudent(null)}
                onStartWorkout={onStartWorkout}
              />
            </div>
          ) : (
            <div className="hidden md:flex flex-col items-center justify-center h-full min-h-[500px] bg-[#0E0E11] border border-dashed border-[#27272A] rounded-3xl p-8 text-center text-[#71717A]">
              <div className="w-16 h-16 rounded-3xl bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#374151] mb-4 shadow-xl">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black font-display text-white mb-2 uppercase tracking-wide">
                Nenhum Aluno Selecionado
              </h3>
              <p className="text-xs text-[#4B5563] max-w-sm mb-6">
                Selecione um atleta na coluna à esquerda para ver seu resumo, rotinas, avaliações físicas e evolução em tempo real.
              </p>
              <button
                onClick={() => setShowNewModal(true)}
                className="px-5 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-xs font-black font-display uppercase tracking-wider transition-all shadow-lg shadow-xs flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Aluno</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* New Student Modal */}
      {showNewModal && (
        <NewStudentModal
          onClose={() => setShowNewModal(false)}
          onStudentCreated={(createdStudent) => {
            setShowNewModal(false);
            onSelectStudent(createdStudent);
          }}
        />
      )}

    </div>
  );
};
