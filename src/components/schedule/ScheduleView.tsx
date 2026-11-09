import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Play, 
  Trash2, 
  Repeat, 
  Copy, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Dumbbell, 
  SlidersHorizontal, 
  CalendarDays,
  ChevronDown,
  Filter,
  User
} from 'lucide-react';
import { ScheduleAppointment, Student, WorkoutRoutine, RoutineWorkout } from '../../types';
import { useApp } from '../../context/AppContext';
import { StudentAvatar } from '../common/StudentAvatar';
import { 
  getMondayOfWeek, 
  getWeekDates, 
  parseISODate, 
  formatDateToISO, 
  addDaysToDate 
} from '../../utils/recurrenceEngine';
import { NewAppointmentModal } from './NewAppointmentModal';
import { RecurringPromptModal, RecurringActionScope } from './RecurringPromptModal';
import { CopyWeekModal } from './CopyWeekModal';
import { ScheduleRecurrencesManagerModal } from './ScheduleRecurrencesManagerModal';
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

interface ScheduleViewProps {
  onStartWorkout: (student: Student, routine?: WorkoutRoutine, workout?: RoutineWorkout | string) => void;
  onSelectStudent: (student: Student) => void;
}

type ScheduleSortOption = 'time_asc' | 'time_desc' | 'name_asc';

const SCHEDULE_SORT_OPTIONS: SortOption<ScheduleSortOption>[] = [
  { value: 'time_asc', label: 'Horário (Mais Cedo → Mais Tarde)', shortLabel: 'Horário ↑' },
  { value: 'time_desc', label: 'Horário (Mais Tarde → Mais Cedo)', shortLabel: 'Horário ↓' },
  { value: 'name_asc', label: 'Nome do Aluno (A → Z)', shortLabel: 'Aluno A-Z' }
];

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  onStartWorkout,
  onSelectStudent
}) => {
  const { 
    schedule, 
    students, 
    routines, 
    scheduleRecurrences, 
    saveAppointment, 
    deleteAppointment, 
    deleteScheduleRecurrence, 
    ensureRecurrenceHorizon 
  } = useApp();

  const todayStr = useMemo(() => formatDateToISO(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'missed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [sortOption, setSortOption] = useState<ScheduleSortOption>('time_asc');

  // Modals state
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [showCopyWeekModal, setShowCopyWeekModal] = useState<boolean>(false);
  const [showRecurrencesModal, setShowRecurrencesModal] = useState<boolean>(false);
  
  // Recurring prompt state
  const [promptAppointment, setPromptAppointment] = useState<ScheduleAppointment | null>(null);
  const [promptAction, setPromptAction] = useState<'edit' | 'delete'>('delete');

  // Initial modal params for quick add on specific date/time
  const [modalInitialDate, setModalInitialDate] = useState<string>(todayStr);
  const [modalInitialTime, setModalInitialTime] = useState<string>('07:00');

  // Trigger horizon generation when date moves forward
  useEffect(() => {
    ensureRecurrenceHorizon(selectedDate);
  }, [selectedDate, ensureRecurrenceHorizon]);

  // Date Navigation Helpers
  const handlePrevDate = () => {
    if (viewMode === 'day') {
      const d = parseISODate(selectedDate);
      setSelectedDate(formatDateToISO(addDaysToDate(d, -1)));
    } else if (viewMode === 'week') {
      const d = parseISODate(selectedDate);
      setSelectedDate(formatDateToISO(addDaysToDate(d, -7)));
    } else if (viewMode === 'month') {
      const d = parseISODate(selectedDate);
      d.setMonth(d.getMonth() - 1);
      setSelectedDate(formatDateToISO(d));
    }
  };

  const handleNextDate = () => {
    if (viewMode === 'day') {
      const d = parseISODate(selectedDate);
      setSelectedDate(formatDateToISO(addDaysToDate(d, 1)));
    } else if (viewMode === 'week') {
      const d = parseISODate(selectedDate);
      setSelectedDate(formatDateToISO(addDaysToDate(d, 7)));
    } else if (viewMode === 'month') {
      const d = parseISODate(selectedDate);
      d.setMonth(d.getMonth() + 1);
      setSelectedDate(formatDateToISO(d));
    }
  };

  const handleGoToday = () => {
    setSelectedDate(todayStr);
  };

  // Helper matching function
  const matchAppointment = (a: ScheduleAppointment) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (selectedStudentId !== 'all' && a.studentId !== selectedStudentId) return false;
    if (!searchInFields([a.studentName, a.routineTitle, a.notes, a.workoutLetter], searchQuery)) return false;
    return true;
  };

  const sortAppointments = (list: ScheduleAppointment[]) => {
    return [...list].sort((a, b) => {
      if (sortOption === 'time_asc') return a.time.localeCompare(b.time);
      if (sortOption === 'time_desc') return b.time.localeCompare(a.time);
      if (sortOption === 'name_asc') return a.studentName.localeCompare(b.studentName);
      return 0;
    });
  };

  // Day View Appointments
  const dayAppointments = useMemo(() => {
    const raw = schedule.filter(a => a.date === selectedDate && matchAppointment(a));
    return sortAppointments(raw);
  }, [schedule, selectedDate, statusFilter, selectedStudentId, searchQuery, sortOption]);

  // Week View Data
  const currentMonday = useMemo(() => getMondayOfWeek(selectedDate), [selectedDate]);
  const currentWeekDates = useMemo(() => getWeekDates(currentMonday), [currentMonday]);

  const weekAppointmentsByDate = useMemo(() => {
    const map: Record<string, ScheduleAppointment[]> = {};
    currentWeekDates.forEach(d => { map[d] = []; });
    
    schedule.forEach(a => {
      if (map[a.date] && matchAppointment(a)) {
        map[a.date].push(a);
      }
    });

    Object.keys(map).forEach(d => {
      map[d] = sortAppointments(map[d]);
    });

    return map;
  }, [schedule, currentWeekDates, statusFilter, selectedStudentId, searchQuery, sortOption]);

  // Month View Data
  const monthInfo = useMemo(() => {
    const [year, month] = selectedDate.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const totalDays = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: { dateStr: string; dayNumber: number; isCurrentMonth: boolean; isToday: boolean }[] = [];

    const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
    const padCount = (startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1);
    for (let i = padCount - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 2, prevMonthLastDay - i);
      const dateStr = formatDateToISO(prevDate);
      days.push({
        dateStr,
        dayNumber: prevMonthLastDay - i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr
      });
    }

    for (let day = 1; day <= totalDays; day++) {
      const curDate = new Date(year, month - 1, day);
      const dateStr = formatDateToISO(curDate);
      days.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dateStr === todayStr
      });
    }

    // Complete the final calendar row so the month grid always has full weeks.
    const remaining = (7 - (days.length % 7)) % 7;
    if (remaining > 0) {
      for (let day = 1; day <= remaining; day++) {
        const nextDate = new Date(year, month, day);
        const dateStr = formatDateToISO(nextDate);
        days.push({
          dateStr,
          dayNumber: day,
          isCurrentMonth: false,
          isToday: dateStr === todayStr
        });
      }
    }

    return {
      year,
      month,
      monthName: firstDay.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      days
    };
  }, [selectedDate, todayStr]);

  // Active filters list
  const activeFilterItems: ActiveFilterItem[] = useMemo(() => {
    const items: ActiveFilterItem[] = [];
    if (searchQuery.trim()) {
      items.push({ id: 'search', label: 'Busca', valueLabel: `"${searchQuery}"` });
    }
    if (statusFilter !== 'all') {
      const labels: Record<string, string> = {
        scheduled: 'Agendados',
        completed: 'Concluídos',
        missed: 'Faltas'
      };
      items.push({ id: 'status', label: 'Status', valueLabel: labels[statusFilter] || statusFilter });
    }
    if (selectedStudentId !== 'all') {
      const st = students.find(s => s.id === selectedStudentId);
      items.push({ id: 'student', label: 'Aluno', valueLabel: st?.name || 'Aluno Selecionado' });
    }
    return items;
  }, [searchQuery, statusFilter, selectedStudentId, students]);

  const handleRemoveFilter = (id: string) => {
    if (id === 'search') setSearchQuery('');
    if (id === 'status') setStatusFilter('all');
    if (id === 'student') setSelectedStudentId('all');
  };

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSelectedStudentId('all');
  };

  // Handle appointment deletion
  const handleDeleteClick = (appt: ScheduleAppointment) => {
    if (appt.recurrenceId) {
      setPromptAppointment(appt);
      setPromptAction('delete');
    } else {
      if (window.confirm(`Deseja excluir o agendamento de ${appt.studentName}?`)) {
        deleteAppointment(appt.id);
      }
    }
  };

  // Handle Recurring Scope Confirmation
  const handleRecurringConfirm = async (scope: RecurringActionScope) => {
    if (!promptAppointment) return;
    if (promptAction === 'delete') {
      await deleteScheduleRecurrence(
        promptAppointment.recurrenceId!,
        scope,
        promptAppointment.id,
        promptAppointment.date
      );
    }
    setPromptAppointment(null);
  };

  // Toggle status (scheduled -> completed -> missed -> scheduled)
  const handleCycleStatus = async (appt: ScheduleAppointment) => {
    let nextStatus: ScheduleAppointment['status'] = 'completed';
    if (appt.status === 'scheduled') nextStatus = 'completed';
    else if (appt.status === 'completed') nextStatus = 'missed';
    else if (appt.status === 'missed') nextStatus = 'scheduled';

    const updated: ScheduleAppointment = {
      ...appt,
      status: nextStatus
    };
    await saveAppointment(updated);
  };

  const activeRecurrencesCount = useMemo(() => {
    return scheduleRecurrences.filter(r => r.status === 'active').length;
  }, [scheduleRecurrences]);

  return (
    <div className="space-y-5 pb-20">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-2xl bg-[#374151]/15 border border-[#374151]/30 flex items-center justify-center text-[#374151]">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-bold text-[#1F2937] tracking-tight">
              Agenda & Atendimentos
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#4B5563]">
            Agendamento inteligente com recorrência semanal automática e início instantâneo de treinos
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <details className="relative">
            <summary className="list-none cursor-pointer px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#F8F9FA] border border-[#E5E7EB] text-[#374151] font-bold text-xs flex items-center gap-2 transition-all">
              <CalendarDays className="w-4 h-4" />
              <span>Ferramentas</span>
              {activeRecurrencesCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#374151] text-white text-[10px] font-black">
                  {activeRecurrencesCount}
                </span>
              )}
              <ChevronDown className="w-3.5 h-3.5" />
            </summary>
            <div className="absolute right-0 top-full mt-2 z-20 min-w-52 rounded-xl border border-[#E5E7EB] bg-white p-2 shadow-xl space-y-1">
              <button
                type="button"
                onClick={() => setShowRecurrencesModal(true)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[#F3F4F6] text-xs font-semibold text-[#374151] flex items-center gap-2"
                title="Gerenciar rotinas semanais dos alunos"
              >
                <Repeat className="w-4 h-4" />
                <span>Rotinas Fixas</span>
                {activeRecurrencesCount > 0 && <span className="ml-auto text-[10px] font-bold">{activeRecurrencesCount}</span>}
              </button>
              <button
                type="button"
                onClick={() => setShowCopyWeekModal(true)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[#F3F4F6] text-xs font-semibold text-[#374151] flex items-center gap-2"
                title="Copiar grade semanal para outra semana"
              >
                <Copy className="w-4 h-4" />
                <span>Copiar Semana</span>
              </button>
            </div>
          </details>

          <button
            type="button"
            onClick={() => {
              setModalInitialDate(selectedDate);
              setModalInitialTime('07:00');
              setShowNewModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white font-semibold text-xs tracking-wide transition-all shadow-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>AGENDAR SESSÃO</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Date Navigator & View Switcher */}
      <div className="bg-white border border-[#E5E7EB] p-3.5 sm:p-4 rounded-2xl flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Date Navigator */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-1 bg-[#F8F9FA] p-1 rounded-xl border border-[#E5E7EB]">
            <button
              onClick={handlePrevDate}
              className="p-1.5 rounded-lg hover:bg-[#27272A] text-[#4B5563] hover:text-white transition-colors"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={handleGoToday}
              className="px-3 py-1 rounded-lg text-xs font-bold text-[#374151] hover:text-white hover:bg-[#27272A] transition-colors"
            >
              Hoje
            </button>

            <button
              onClick={handleNextDate}
              className="p-1.5 rounded-lg hover:bg-[#27272A] text-[#4B5563] hover:text-white transition-colors"
              title="Próximo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-[#374151]"
            />
            
            {viewMode === 'day' && (
              <span className="text-xs text-[#4B5563] font-bold hidden sm:inline capitalize">
                {parseISODate(selectedDate).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              </span>
            )}
            {viewMode === 'week' && (
              <span className="text-xs text-[#4B5563] font-bold hidden sm:inline">
                Semana de {parseISODate(currentMonday).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </span>
            )}
          </div>
        </div>

        {/* View Modes (Day / Week / Month) */}
        <div className="flex bg-[#F8F9FA] p-1 rounded-xl border border-[#E5E7EB] text-xs self-end lg:self-auto">
          {[
            { id: 'day', label: 'Dia' },
            { id: 'week', label: 'Semana' },
            { id: 'month', label: 'Mês' }
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setViewMode(m.id as typeof viewMode)}
              className={`px-4 py-1.5 rounded-lg font-bold transition-all ${
                viewMode === m.id ? 'bg-[#374151] text-white shadow-xs' : 'text-[#4B5563] hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Global Search & Filter Bar for Schedule */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3 sm:p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          
          {/* Search Box */}
          <div className="w-full md:w-72 lg:w-80">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Buscar aluno, treino ou nota..."
              size="sm"
            />
          </div>

          {/* Student Filter Dropdown + Status Chips + Sort Menu */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Student Selector */}
            {students.length > 0 && (
              <select
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
                className="bg-[#F8F9FA] border border-[#E5E7EB] text-[#4B5563] hover:text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#374151]"
              >
                <option value="all">Todos os Alunos</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}

            {/* Status Chips */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'scheduled', label: 'Agendados' },
                { id: 'completed', label: 'Concluídos' },
                { id: 'missed', label: 'Faltas' }
              ].map(f => (
                <FilterChip
                  key={f.id}
                  label={f.label}
                  isActive={statusFilter === f.id}
                  onClick={() => setStatusFilter(f.id as typeof statusFilter)}
                  size="sm"
                />
              ))}
            </div>

            {/* Sort Menu */}
            <SortMenu<ScheduleSortOption>
              options={SCHEDULE_SORT_OPTIONS}
              value={sortOption}
              onChange={setSortOption}
              label="Horário"
              size="sm"
            />
          </div>
        </div>

        {/* Active Filters */}
        <ActiveFilters
          filters={activeFilterItems}
          onRemove={handleRemoveFilter}
          onClearAll={handleClearAllFilters}
        />
      </div>

      {/* ======================================================== */}
      {/* 1. DAY VIEW */}
      {/* ======================================================== */}
      {viewMode === 'day' && (
        <div className="space-y-3">
          {dayAppointments.length > 0 ? (
            dayAppointments.map(appt => {
              const student = students.find(s => s.id === appt.studentId);
              const isCompleted = appt.status === 'completed';
              const isMissed = appt.status === 'missed';
              const isRecurring = Boolean(appt.recurrenceId);

              return (
                <div
                  key={appt.id}
                  className={`bg-white border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                    isCompleted 
                      ? 'border-[#16a34a]/30 bg-white/80' 
                      : isMissed 
                        ? 'border-zinc-800 bg-white/50 opacity-90' 
                        : 'border-[#E5E7EB] hover:border-[#374151]/50'
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    
                    {/* Time Badge */}
                    <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl px-3.5 py-2.5 text-center min-w-[76px] shrink-0">
                      <span className="text-sm font-black font-mono-nums text-[#374151] block">
                        {appt.time}
                      </span>
                      <span className="text-[10px] text-[#4B5563] font-semibold">
                        {appt.durationMinutes} min
                      </span>
                    </div>

                    <StudentAvatar
                      name={appt.studentName}
                      photo={appt.studentPhoto || student?.photo}
                      size="md"
                    />

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <button
                          type="button"
                          onClick={() => student && onSelectStudent(student)}
                          className="text-base font-bold text-white hover:text-[#374151] transition-colors truncate text-left"
                        >
                          {appt.studentName}
                        </button>

                        {/* Status Toggle Badge */}
                        <button
                          type="button"
                          onClick={() => handleCycleStatus(appt)}
                          className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                            isCompleted
                              ? 'bg-[#16a34a]/20 text-[#16a34a] border border-[#16a34a]/30 hover:bg-[#16a34a]/30'
                              : isMissed
                                ? 'bg-zinc-800 text-zinc-600 border border-zinc-700 hover:bg-zinc-700'
                                : 'bg-[#F3F4F6] text-[#374151] border border-[#374151]/30 hover:bg-[#374151]/30'
                          }`}
                          title="Clique para alternar status (Agendado / Concluído / Falta)"
                        >
                          {isCompleted ? '✓ Concluído' : isMissed ? '✕ Falta' : '● Agendado'}
                        </button>

                        {/* Recurrence Indicator Badge */}
                        {isRecurring && (
                          <span 
                            className="px-2 py-0.5 rounded-lg bg-[#F8F9FA] border border-[#E5E7EB] text-[9px] font-bold text-[#4B5563] flex items-center gap-1"
                            title="Agendamento gerado por rotina semanal recorrente"
                          >
                            <Repeat className="w-2.5 h-2.5 text-[#374151]" />
                            <span>Recorrente</span>
                            {appt.isException && <span className="text-amber-400">(Ajustado)</span>}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#4B5563] flex items-center gap-1.5">
                        <Dumbbell className="w-3 h-3 text-[#374151]" />
                        <span className="truncate">{appt.routineTitle || 'Treino Presencial'}</span>
                      </p>

                      {appt.notes && (
                        <p className="text-[11px] text-[#4B5563] italic mt-0.5 truncate max-w-md">
                          &quot;{appt.notes}&quot;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center w-full sm:w-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(appt)}
                      className="p-2.5 rounded-xl bg-[#F8F9FA] text-[#4B5563] hover:text-[#374151] border border-[#E5E7EB] transition-colors"
                      title="Excluir ou desmarcar sessão"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (student) {
                          const targetRoutine = routines.find(r => r.id === appt.routineId) || 
                                                routines.find(r => r.studentId === student.id && r.status === 'active') ||
                                                routines.find(r => r.studentId === student.id);
                          onStartWorkout(student, targetRoutine, appt.workoutId || appt.workoutLetter);
                        }
                      }}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white font-bold font-display text-xs tracking-wider transition-all shadow-md shadow-xs flex items-center justify-center gap-2"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>{appt.workoutLetter ? `INICIAR TREINO ${appt.workoutLetter}` : 'INICIAR TREINO'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : activeFilterItems.length > 0 ? (
            <EmptyFilterState
              title="Nenhum atendimento encontrado"
              description="Nenhum agendamento para a data selecionada corresponde aos filtros ou busca."
              searchTerm={searchQuery}
              onClearFilters={handleClearAllFilters}
            />
          ) : (
            <div className="bg-white border border-[#E5E7EB] rounded-3xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F8F9FA] border border-[#E5E7EB] flex items-center justify-center text-[#4B5563] mx-auto">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Nenhum atendimento para esta data</p>
                <p className="text-xs text-[#4B5563] mt-0.5">
                  Agende uma sessão individual ou crie uma rotina recorrente semanal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalInitialDate(selectedDate);
                  setShowNewModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#374151] text-white font-bold text-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Agendar Atendimento</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. WEEK VIEW */}
      {/* ======================================================== */}
      {viewMode === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {currentWeekDates.map(dateStr => {
            const dateObj = parseISODate(dateStr);
            const isToday = dateStr === todayStr;
            const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
            const dayNum = dateObj.getDate();
            const dayList = weekAppointmentsByDate[dateStr] || [];

            return (
              <div
                key={dateStr}
                className={`bg-white border rounded-2xl p-3 flex flex-col min-h-[380px] transition-all ${
                  isToday ? 'border-[#374151]/60 bg-white' : 'border-[#E5E7EB]'
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E5E7EB]">
                  <div>
                    <span className="text-[11px] font-bold text-[#4B5563] uppercase block">
                      {dayName}
                    </span>
                    <span className={`text-base font-black font-display ${
                      isToday ? 'text-[#374151]' : 'text-white'
                    }`}>
                      {dayNum}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setModalInitialDate(dateStr);
                      setModalInitialTime('08:00');
                      setShowNewModal(true);
                    }}
                    className="w-6 h-6 rounded-lg bg-[#F8F9FA] hover:bg-[#374151] text-[#4B5563] hover:text-white flex items-center justify-center transition-colors"
                    title="Adicionar agendamento neste dia"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Day Appointments List */}
                <div className="flex-1 space-y-2 overflow-y-auto max-h-[420px] scrollbar-none">
                  {dayList.length > 0 ? (
                    dayList.map(appt => {
                      const student = students.find(s => s.id === appt.studentId);
                      const isCompleted = appt.status === 'completed';
                      const isMissed = appt.status === 'missed';

                      return (
                        <div
                          key={appt.id}
                          className={`p-2 rounded-xl border text-xs flex flex-col justify-between gap-2 group transition-all ${
                            isCompleted 
                              ? 'bg-[#16a34a]/10 border-[#16a34a]/30' 
                              : isMissed 
                                ? 'bg-zinc-900 border-zinc-800 opacity-90' 
                                : 'bg-[#F8F9FA] border-[#E5E7EB] hover:border-[#374151]/50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono-nums font-bold text-[#374151] text-[11px]">
                                {appt.time}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCycleStatus(appt)}
                                className={`text-[8px] font-black uppercase px-1 py-0.5 rounded ${
                                  isCompleted
                                    ? 'bg-[#16a34a]/20 text-[#16a34a]'
                                    : isMissed
                                      ? 'bg-zinc-800 text-zinc-600'
                                      : 'bg-[#F3F4F6] text-[#374151]'
                                }`}
                              >
                                {isCompleted ? '✓' : isMissed ? '✕' : '●'}
                              </button>
                            </div>

                            <p className="font-bold text-white truncate text-[11px]">
                              {appt.studentName}
                            </p>

                            {appt.workoutLetter && (
                              <p className="text-[10px] text-[#4B5563] flex items-center gap-1 mt-0.5">
                                <Dumbbell className="w-2.5 h-2.5 text-[#374151]" />
                                <span>Treino {appt.workoutLetter}</span>
                              </p>
                            )}
                          </div>

                          {/* Quick Start Action on Hover */}
                          <div className="flex items-center justify-between gap-1 pt-1 border-t border-[#E5E7EB]">
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(appt)}
                              className="text-[#4B5563] hover:text-[#374151] p-1"
                              title="Excluir"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (student) {
                                  const targetRoutine = routines.find(r => r.id === appt.routineId) || 
                                                        routines.find(r => r.studentId === student.id && r.status === 'active') ||
                                                        routines.find(r => r.studentId === student.id);
                                  onStartWorkout(student, targetRoutine, appt.workoutId || appt.workoutLetter);
                                }
                              }}
                              className="px-2 py-1 rounded-lg bg-[#374151] hover:bg-[#1F2937] text-white text-[10px] font-bold flex items-center gap-1"
                            >
                              <Play className="w-2.5 h-2.5 fill-white" />
                              <span>Iniciar</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex items-center justify-center text-center p-4">
                      <span className="text-[11px] text-[#52525B] italic">Sem aulas</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MONTH VIEW */}
      {/* ======================================================== */}
      {viewMode === 'month' && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="text-center font-black font-display text-base text-white capitalize">
            {monthInfo.monthName}
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-[#4B5563] uppercase pb-2 border-b border-[#E5E7EB]">
            <span>Seg</span>
            <span>Ter</span>
            <span>Qua</span>
            <span>Qui</span>
            <span>Sex</span>
            <span>Sáb</span>
            <span>Dom</span>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {monthInfo.days.map((day, idx) => {
              const dayList = schedule.filter(a => a.date === day.dateStr && matchAppointment(a));
              const hasAppointments = dayList.length > 0;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedDate(day.dateStr);
                    setViewMode('day');
                  }}
                  className={`min-h-[70px] sm:min-h-[90px] p-1.5 sm:p-2 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                    day.isCurrentMonth ? 'bg-[#F8F9FA]/70' : 'bg-white opacity-70'
                  } ${
                    day.isToday 
                      ? 'border-[#374151] shadow-md shadow-xs' 
                      : 'border-[#E5E7EB] hover:border-[#6B7280]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${
                      day.isToday ? 'text-[#374151]' : 'text-white'
                    }`}>
                      {day.dayNumber}
                    </span>

                    {hasAppointments && (
                      <span className="w-2 h-2 rounded-full bg-[#374151]" />
                    )}
                  </div>

                  {hasAppointments ? (
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-[#4B5563] line-clamp-1">
                        {dayList.length} {dayList.length === 1 ? 'sessão' : 'sessões'}
                      </div>
                      <div className="hidden sm:block text-[9px] text-white/70 truncate">
                        {dayList[0].studentName}
                      </div>
                    </div>
                  ) : (
                    <div />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALS */}
      {/* ======================================================== */}
      <NewAppointmentModal
        isOpen={showNewModal}
        initialDate={modalInitialDate}
        initialTime={modalInitialTime}
        onClose={() => setShowNewModal(false)}
      />

      <CopyWeekModal
        isOpen={showCopyWeekModal}
        currentDateStr={selectedDate}
        onClose={() => setShowCopyWeekModal(false)}
      />

      <ScheduleRecurrencesManagerModal
        isOpen={showRecurrencesModal}
        onClose={() => setShowRecurrencesModal(false)}
        onOpenNewRecurrence={() => {
          setModalInitialDate(selectedDate);
          setShowNewModal(true);
        }}
      />

      {promptAppointment && (
        <RecurringPromptModal
          isOpen={Boolean(promptAppointment)}
          appointment={promptAppointment}
          actionType={promptAction}
          onConfirm={handleRecurringConfirm}
          onClose={() => setPromptAppointment(null)}
        />
      )}

    </div>
  );
};
