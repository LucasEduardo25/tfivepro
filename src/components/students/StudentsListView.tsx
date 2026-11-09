import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Play, 
  ChevronRight, 
  Dumbbell,
  Clock,
  Calendar,
  Phone,
  SlidersHorizontal,
  Flame,
  MessageSquare
} from 'lucide-react';
import { Student, WorkoutRoutine, WorkoutSession, ScheduleAppointment } from '../../types';
import { useApp } from '../../context/AppContext';
import { StudentAvatar } from '../common/StudentAvatar';
import { NewStudentModal } from './NewStudentModal';
import { 
  SearchBar, 
  FilterChip, 
  SortMenu, 
  ActiveFilters, 
  EmptyFilterState, 
  ActiveFilterItem,
  SortOption
} from '../common/search';
import { searchInFields, normalizeSearchText } from '../../utils/searchAndFilter';

interface StudentsListViewProps {
  onSelectStudent: (student: Student, initialTab?: string) => void;
  onStartWorkout: (student: Student) => void;
}

interface StudentCardSummary {
  activeRoutine: WorkoutRoutine | null;
  activeRoutineTitle: string;
  lastSession: WorkoutSession | null;
  lastWorkoutDisplay: { text: string; isRecent: boolean };
  nextAppointment: ScheduleAppointment | null;
  nextAppointmentDisplay: { text: string; hasSchedule: boolean };
  isCurrentlyTraining: boolean;
}

type StudentSortOption = 'name_asc' | 'name_desc' | 'last_workout' | 'created_desc';

const STUDENT_SORT_OPTIONS: SortOption<StudentSortOption>[] = [
  { value: 'name_asc', label: 'Nome (A → Z)', shortLabel: 'A → Z' },
  { value: 'name_desc', label: 'Nome (Z → A)', shortLabel: 'Z → A' },
  { value: 'last_workout', label: 'Último Treino Recente', shortLabel: 'Último Treino' },
  { value: 'created_desc', label: 'Recém-Cadastrados', shortLabel: 'Mais Recentes' }
];

function formatLastWorkoutDisplay(session: WorkoutSession | null): { text: string; isRecent: boolean } {
  if (!session) {
    return { text: 'Ainda não treinou', isRecent: false };
  }

  const sessionDate = new Date(session.startTime);
  const now = new Date();
  
  const isToday = sessionDate.toDateString() === now.toDateString();
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = sessionDate.toDateString() === yesterday.toDateString();

  let dayLabel = '';
  if (isToday) {
    dayLabel = 'Hoje';
  } else if (isYesterday) {
    dayLabel = 'Ontem';
  } else {
    const day = sessionDate.getDate().toString().padStart(2, '0');
    const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const month = months[sessionDate.getMonth()];
    dayLabel = `${day} ${month}`;
  }

  let workoutLabel = '';
  if (session.workoutLetter) {
    workoutLabel = `Treino ${session.workoutLetter}`;
  } else if (session.workoutName) {
    workoutLabel = session.workoutName;
  } else if (session.routineTitle) {
    workoutLabel = session.routineTitle;
  } else {
    workoutLabel = 'Treino Concluído';
  }

  return {
    text: `${dayLabel} • ${workoutLabel}`,
    isRecent: isToday || isYesterday
  };
}

function formatNextAppointmentDisplay(appointment: ScheduleAppointment | null): { text: string; hasSchedule: boolean } {
  if (!appointment) {
    return { text: 'Sem agendamento', hasSchedule: false };
  }

  const [year, month, day] = appointment.date.split('-');
  const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const monthIdx = parseInt(month, 10) - 1;
  const formattedDay = `${day} ${months[monthIdx] || ''}`;

  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = appointment.date === todayStr;

  return {
    text: isToday ? `Hoje às ${appointment.time}` : `${formattedDay} às ${appointment.time}`,
    hasSchedule: true
  };
}

export const StudentsListView: React.FC<StudentsListViewProps> = ({
  onSelectStudent,
  onStartWorkout
}) => {
  const { students, sessions, schedule, routines, activeWorkouts } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'training'>('all');
  const [sortOption, setSortOption] = useState<StudentSortOption>('name_asc');
  const [showNewModal, setShowNewModal] = useState(false);

  // Pre-calculate student summaries for lightning-fast search, filter and sort
  const studentSummariesMap = useMemo(() => {
    const map = new Map<string, StudentCardSummary>();
    const nowStr = new Date().toISOString().split('T')[0];

    students.forEach(student => {
      // 1. Active routine
      const activeRoutine = routines.find(r => r.studentId === student.id) || null;
      let activeRoutineTitle = 'Sem rotina cadastrada';
      if (activeRoutine) {
        activeRoutineTitle = activeRoutine.title;
        if (activeRoutine.workouts && activeRoutine.workouts.length > 0) {
          activeRoutineTitle += ` (${activeRoutine.workouts.length} treinos)`;
        }
      }

      // 2. Last completed session
      const studentSessions = sessions
        .filter(s => s.studentId === student.id && s.status === 'completed')
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      const lastSession = studentSessions.length > 0 ? studentSessions[0] : null;

      // 3. Next appointment (scheduled for today or in the future)
      const studentAppointments = schedule
        .filter(a => a.studentId === student.id && a.status === 'scheduled' && a.date >= nowStr)
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.time.localeCompare(b.time);
        });
      const nextAppointment = studentAppointments.length > 0 ? studentAppointments[0] : null;

      // 4. In active live workout
      const isCurrentlyTraining = activeWorkouts.some(w => w.studentId === student.id);

      map.set(student.id, {
        activeRoutine,
        activeRoutineTitle,
        lastSession,
        lastWorkoutDisplay: formatLastWorkoutDisplay(lastSession),
        nextAppointment,
        nextAppointmentDisplay: formatNextAppointmentDisplay(nextAppointment),
        isCurrentlyTraining
      });
    });

    return map;
  }, [students, sessions, schedule, routines, activeWorkouts]);

  // Filter & Search
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      // Status Filter
      if (statusFilter === 'active' && student.status !== 'active') return false;
      if (statusFilter === 'inactive' && student.status !== 'inactive') return false;
      if (statusFilter === 'training') {
        const sum = studentSummariesMap.get(student.id);
        if (!sum || !sum.isCurrentlyTraining) return false;
      }

      // Search Query
      if (searchTerm.trim()) {
        const summary = studentSummariesMap.get(student.id);
        const matchesNameOrGoal = searchInFields([student.name, student.goal, student.phone, student.planName], searchTerm);
        const matchesRoutine = summary?.activeRoutineTitle 
          ? normalizeSearchText(summary.activeRoutineTitle).includes(normalizeSearchText(searchTerm))
          : false;

        if (!matchesNameOrGoal && !matchesRoutine) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortOption === 'name_asc') {
        return a.name.localeCompare(b.name, 'pt-BR');
      }
      if (sortOption === 'name_desc') {
        return b.name.localeCompare(a.name, 'pt-BR');
      }
      if (sortOption === 'last_workout') {
        const sumA = studentSummariesMap.get(a.id);
        const sumB = studentSummariesMap.get(b.id);
        const timeA = sumA?.lastSession ? new Date(sumA.lastSession.startTime).getTime() : 0;
        const timeB = sumB?.lastSession ? new Date(sumB.lastSession.startTime).getTime() : 0;
        return timeB - timeA;
      }
      if (sortOption === 'created_desc') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      }
      return 0;
    });
  }, [students, searchTerm, statusFilter, sortOption, studentSummariesMap]);

  const activeCount = useMemo(() => students.filter(s => s.status === 'active').length, [students]);
  const inactiveCount = useMemo(() => students.filter(s => s.status === 'inactive').length, [students]);
  const trainingCount = useMemo(() => activeWorkouts.length, [activeWorkouts]);

  // Active filters list
  const activeFilterItems: ActiveFilterItem[] = useMemo(() => {
    const items: ActiveFilterItem[] = [];
    if (searchTerm.trim()) {
      items.push({ id: 'search', label: 'Busca', valueLabel: `"${searchTerm}"` });
    }
    if (statusFilter !== 'all') {
      const labels: Record<string, string> = {
        active: 'Ativos',
        inactive: 'Inativos',
        training: 'Em Treino'
      };
      items.push({ id: 'status', label: 'Status', valueLabel: labels[statusFilter] || statusFilter });
    }
    return items;
  }, [searchTerm, statusFilter]);

  const handleRemoveFilter = (id: string) => {
    if (id === 'search') setSearchTerm('');
    if (id === 'status') setStatusFilter('all');
  };

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  const handleOpenWhatsApp = (phone?: string, name?: string) => {
    if (!phone) return;
    const cleanNumber = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá ${name ? name.split(' ')[0] : ''}, tudo bem? Aqui é o seu Personal.`);
    const url = `https://wa.me/55${cleanNumber.startsWith('55') ? cleanNumber.slice(2) : cleanNumber}?text=${message}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-5 pb-16 max-w-7xl mx-auto">
      
      {/* Header & New Student Action */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-[#374151]" />
            <h1 className="text-xl sm:text-2xl font-bold text-[#1F2937] tracking-tight">
              Alunos & Atletas
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#4B5563]">
            Gerencie fichas, rotinas de treino, avaliações físicas e evolução
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white font-semibold text-xs sm:text-sm tracking-wide transition-colors shadow-xs shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Aluno</span>
        </button>
      </div>

      {/* Filter, Search & Sort Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3 sm:p-4 space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search input */}
          <div className="w-full md:w-80 lg:w-96">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar por nome, objetivo, telefone..."
              size="sm"
            />
          </div>

          {/* Right Controls: Filter Chips + Sort Menu */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
            {/* Status Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              <FilterChip
                label="Todos"
                count={students.length}
                isActive={statusFilter === 'all'}
                onClick={() => setStatusFilter('all')}
                size="sm"
              />
              <FilterChip
                label="Ativos"
                count={activeCount}
                isActive={statusFilter === 'active'}
                onClick={() => setStatusFilter('active')}
                size="sm"
              />
              <FilterChip
                label="Inativos"
                count={inactiveCount}
                isActive={statusFilter === 'inactive'}
                onClick={() => setStatusFilter('inactive')}
                size="sm"
              />
              {trainingCount > 0 && (
                <FilterChip
                  label="Em Treino"
                  count={trainingCount}
                  icon={<Flame className="w-3 h-3 text-emerald-600" />}
                  isActive={statusFilter === 'training'}
                  onClick={() => setStatusFilter('training')}
                  size="sm"
                />
              )}
            </div>

            {/* Sort Menu */}
            <SortMenu<StudentSortOption>
              options={STUDENT_SORT_OPTIONS}
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

      {/* Students Responsive Grid */}
      {filteredStudents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredStudents.map(student => {
            const summary = studentSummariesMap.get(student.id) || {
              activeRoutine: null,
              activeRoutineTitle: 'Sem rotina cadastrada',
              lastSession: null,
              lastWorkoutDisplay: { text: 'Ainda não treinou', isRecent: false },
              nextAppointment: null,
              nextAppointmentDisplay: { text: 'Sem agendamento', hasSchedule: false },
              isCurrentlyTraining: false
            };

            return (
              <div
                key={student.id}
                className="bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-colors shadow-xs relative overflow-hidden"
              >
                {/* Live workout indicator bar */}
                {summary.isCurrentlyTraining && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
                )}

                <div>
                  {/* Card Header: Avatar, Name, Goal, Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div 
                      className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                      onClick={() => onSelectStudent(student)}
                    >
                      <div className="relative shrink-0">
                        <StudentAvatar
                          student={student}
                          size="md"
                        />
                        {summary.isCurrentlyTraining && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full animate-ping" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm sm:text-base font-bold text-[#1F2937] hover:text-[#374151] transition-colors truncate">
                          {student.name}
                        </h3>
                        <p className="text-xs text-[#4B5563] truncate mt-0.5">
                          {student.goal || 'Hipertrofia e Condicionamento'}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {summary.isCurrentlyTraining ? (
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          Em Treino
                        </span>
                      ) : (
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider ${
                          student.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                          {student.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Information Core Card */}
                  <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-3 mb-3 space-y-2.5">
                    
                    {/* 1. Rotina Ativa */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#4B5563] shrink-0">
                        <Dumbbell className="w-3.5 h-3.5 text-[#4B5563]" />
                        <span>Rotina</span>
                      </div>
                      <span 
                        className={`text-xs truncate text-right min-w-0 flex-1 ${
                          summary.activeRoutine ? 'text-[#1F2937] font-semibold' : 'text-[#4B5563] italic'
                        }`}
                        title={summary.activeRoutineTitle}
                      >
                        {summary.activeRoutineTitle}
                      </span>
                    </div>

                    <div className="h-px bg-[#E5E7EB]" />

                    {/* 2. Grid: Último Treino e Próxima Sessão */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Último Treino */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#4B5563] mb-0.5">
                          <Clock className="w-3 h-3 text-[#4B5563]" />
                          <span className="truncate">Último Treino</span>
                        </div>
                        <span 
                          className={`block text-xs truncate ${
                            summary.lastSession ? 'text-[#1F2937] font-medium' : 'text-[#4B5563]'
                          }`}
                          title={summary.lastWorkoutDisplay.text}
                        >
                          {summary.lastWorkoutDisplay.text}
                        </span>
                      </div>

                      {/* Próximo Atendimento */}
                      <div className="min-w-0 border-l border-[#E5E7EB] pl-2.5">
                        <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#4B5563] mb-0.5">
                          <Calendar className="w-3 h-3 text-[#4B5563]" />
                          <span className="truncate">Próximo</span>
                        </div>
                        <span 
                          className={`block text-xs truncate ${
                            summary.nextAppointmentDisplay.hasSchedule ? 'text-emerald-700 font-semibold' : 'text-[#4B5563]'
                          }`}
                          title={summary.nextAppointmentDisplay.text}
                        >
                          {summary.nextAppointmentDisplay.text}
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Metadata Secundária */}
                  {(student.planName || student.phone) && (
                    <div className="flex items-center justify-between text-[11px] text-[#4B5563] px-1 mb-3">
                      <span className="truncate max-w-[65%] font-medium">
                        {student.planName || 'Personal Presencial'}
                      </span>
                      {student.phone && (
                        <span className="text-[#4B5563] font-mono-nums flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#4B5563]" />
                          {student.phone}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Actions Row */}
                <div className="flex items-center gap-2 pt-3 border-t border-[#ECEEF1]">
                  {/* WhatsApp Quick Action (If phone exists) */}
                  {student.phone ? (
                    <button
                      onClick={() => handleOpenWhatsApp(student.phone, student.name)}
                      className="p-2.5 rounded-xl bg-white hover:bg-[#F3F4F6] text-[#374151] hover:text-[#1F2937] border border-[#D1D5DB] transition-colors shrink-0"
                      title="Abrir conversa no WhatsApp"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                    </button>
                  ) : null}

                  {/* Ver Perfil / Ficha */}
                  <button
                    onClick={() => onSelectStudent(student)}
                    className="flex-1 py-2.5 rounded-xl bg-white hover:bg-[#F3F4F6] text-xs font-semibold text-[#374151] hover:text-[#1F2937] transition-colors flex items-center justify-center gap-1 border border-[#D1D5DB]"
                  >
                    <span>Ver Ficha</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#4B5563]" />
                  </button>

                  {/* Iniciar Treino */}
                  <button
                    onClick={() => onStartWorkout(student)}
                    className="flex-1 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-xs font-semibold text-white transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Treinar</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <EmptyFilterState
          title="Nenhum aluno encontrado"
          description={
            students.length === 0
              ? 'Cadastre seu primeiro aluno para prescrever treinos e acompanhar evolução.'
              : 'Nenhum aluno corresponde aos filtros selecionados.'
          }
          searchTerm={searchTerm}
          onClearFilters={
            searchTerm || statusFilter !== 'all'
              ? handleClearAllFilters
              : undefined
          }
        />
      )}

      {showNewModal && (
        <NewStudentModal
          onClose={() => setShowNewModal(false)}
          onStudentCreated={student => onSelectStudent(student)}
        />
      )}

    </div>
  );
};
