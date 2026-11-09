import React, { useState, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Repeat, 
  AlertTriangle, 
  CheckCircle, 
  User, 
  Dumbbell, 
  Sparkles,
  Info,
  CalendarDays,
  ChevronRight
} from 'lucide-react';
import { 
  Student, 
  WorkoutRoutine, 
  ScheduleAppointment, 
  ScheduleRecurrence, 
  WeekdayNumber,
  WeekdayScheduleConfig,
  RecurrencePeriodType
} from '../../types';
import { useApp } from '../../context/AppContext';
import { 
  WEEKDAYS_ORDERED, 
  PRESET_OPTIONS, 
  previewRecurrenceOccurrences,
  calculateEndDateFromPeriod,
  formatDateToISO,
  parseISODate,
  addDaysToDate
} from '../../utils/recurrenceEngine';
import { generateId } from '../../db/indexedDB';
import { StudentAvatar } from '../common/StudentAvatar';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStudentId?: string;
  initialDate?: string;
  initialTime?: string;
}

export const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({
  isOpen,
  onClose,
  initialStudentId,
  initialDate,
  initialTime = '07:00'
}) => {
  const { 
    students, 
    routines, 
    schedule, 
    saveAppointment, 
    saveScheduleRecurrence 
  } = useApp();

  const todayStr = useMemo(() => formatDateToISO(new Date()), []);
  
  // Tab: 'single' | 'recurring'
  const [mode, setMode] = useState<'single' | 'recurring'>('recurring');

  // Selected Student
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudentId || students[0]?.id || ''
  );

  const selectedStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId) || students[0];
  }, [students, selectedStudentId]);

  // Student's routines
  const studentRoutines = useMemo(() => {
    if (!selectedStudent) return [];
    return routines.filter(r => r.studentId === selectedStudent.id);
  }, [routines, selectedStudent]);

  // --- Single Mode State ---
  const [singleDate, setSingleDate] = useState<string>(initialDate || todayStr);
  const [singleTime, setSingleTime] = useState<string>(initialTime);
  const [singleDuration, setSingleDuration] = useState<number>(60);
  const [singleRoutineId, setSingleRoutineId] = useState<string>('');
  const [singleRoutineTitle, setSingleRoutineTitle] = useState<string>('Treino Presencial');
  const [singleNotes, setSingleNotes] = useState<string>('');

  // --- Recurring Mode State ---
  const [startDate, setStartDate] = useState<string>(initialDate || todayStr);
  const [periodType, setPeriodType] = useState<RecurrencePeriodType>('4_weeks');
  const [customEndDate, setCustomEndDate] = useState<string>(
    formatDateToISO(addDaysToDate(initialDate || todayStr, 28))
  );

  const [selectedWeekdays, setSelectedWeekdays] = useState<WeekdayNumber[]>([1, 3, 5]); // Seg, Qua, Sex
  const [defaultTime, setDefaultTime] = useState<string>(initialTime);
  const [useDifferentTimes, setUseDifferentTimes] = useState<boolean>(false);
  const [useDifferentRoutines, setUseDifferentRoutines] = useState<boolean>(false);
  const [defaultDuration, setDefaultDuration] = useState<number>(60);
  const [defaultRoutineId, setDefaultRoutineId] = useState<string>('');
  const [defaultRoutineTitle, setDefaultRoutineTitle] = useState<string>('Treino Presencial');
  const [recurrenceNotes, setRecurrenceNotes] = useState<string>('');

  // Per-weekday configs (e.g. Seg 07:00 / Treino A, Qua 08:00 / Treino B)
  const [weekdayConfigs, setWeekdayConfigs] = useState<Record<number, WeekdayScheduleConfig>>({
    1: { weekday: 1, time: '07:00', routineTitle: 'Treino A', routineId: '' },
    2: { weekday: 2, time: '07:00', routineTitle: 'Treino B', routineId: '' },
    3: { weekday: 3, time: '07:00', routineTitle: 'Treino B', routineId: '' },
    4: { weekday: 4, time: '07:00', routineTitle: 'Treino C', routineId: '' },
    5: { weekday: 5, time: '07:00', routineTitle: 'Treino C', routineId: '' },
    6: { weekday: 6, time: '08:00', routineTitle: 'Treino Especial', routineId: '' },
    0: { weekday: 0, time: '09:00', routineTitle: 'Treino Domingo', routineId: '' }
  });

  const [showPreviewList, setShowPreviewList] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Compute calculated end date
  const calculatedEndDate = useMemo(() => {
    return calculateEndDateFromPeriod(startDate, periodType, customEndDate);
  }, [startDate, periodType, customEndDate]);

  // Transform weekday configs into array
  const formattedWeekdayConfigs = useMemo(() => {
    return selectedWeekdays.map(day => {
      const cfg = weekdayConfigs[day];
      return {
        weekday: day,
        time: useDifferentTimes && cfg ? cfg.time : defaultTime,
        durationMinutes: defaultDuration,
        routineId: useDifferentRoutines && cfg ? cfg.routineId : defaultRoutineId,
        routineTitle: useDifferentRoutines && cfg ? (cfg.routineTitle || 'Treino Presencial') : (defaultRoutineTitle || 'Treino Presencial')
      };
    });
  }, [selectedWeekdays, weekdayConfigs, useDifferentTimes, useDifferentRoutines, defaultTime, defaultDuration, defaultRoutineId, defaultRoutineTitle]);

  // Preview Occurrences and Conflicts
  const previewData = useMemo(() => {
    if (!selectedStudent) return { occurrences: [], totalCount: 0, hasConflicts: false, duplicateConflictCount: 0, doubleBookingCount: 0 };
    return previewRecurrenceOccurrences({
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      startDate,
      endDate: calculatedEndDate,
      periodType,
      weekdays: selectedWeekdays,
      defaultTime,
      useDifferentTimes,
      useDifferentRoutines,
      defaultDurationMinutes: defaultDuration,
      defaultRoutineId,
      defaultRoutineTitle,
      weekdayConfigs: formattedWeekdayConfigs
    }, schedule);
  }, [selectedStudent, startDate, calculatedEndDate, periodType, selectedWeekdays, defaultTime, useDifferentTimes, useDifferentRoutines, defaultDuration, defaultRoutineId, defaultRoutineTitle, formattedWeekdayConfigs, schedule]);

  // Single appointment conflict check
  const singleAppointmentConflicts = useMemo(() => {
    if (mode !== 'single') return { duplicate: false, concurrentCount: 0, concurrentNames: [] as string[] };
    const atSameTime = schedule.filter(a => 
      a.date === singleDate && 
      a.time === singleTime && 
      a.status !== 'cancelled'
    );
    const duplicate = atSameTime.some(a => a.studentId === selectedStudentId);
    const concurrent = atSameTime.filter(a => a.studentId !== selectedStudentId);
    return {
      duplicate,
      concurrentCount: concurrent.length,
      concurrentNames: concurrent.map(c => c.studentName)
    };
  }, [mode, singleDate, singleTime, selectedStudentId, schedule]);

  // Toggle Weekday Selection
  const toggleWeekday = (day: WeekdayNumber) => {
    if (selectedWeekdays.includes(day)) {
      if (selectedWeekdays.length === 1) return; // Must have at least 1 day
      setSelectedWeekdays(prev => prev.filter(d => d !== day));
    } else {
      setSelectedWeekdays(prev => [...prev, day].sort((a, b) => a - b));
    }
  };

  // Apply Preset
  const handleApplyPreset = (presetDays: WeekdayNumber[]) => {
    if (presetDays.length > 0) {
      setSelectedWeekdays(presetDays);
    }
  };

  // Update specific weekday config
  const updateWeekdayConfig = (day: WeekdayNumber, patch: Partial<WeekdayScheduleConfig>) => {
    setWeekdayConfigs(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        ...patch
      }
    }));
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      alert('Selecione um aluno primeiro.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'single') {
        const appointment: ScheduleAppointment = {
          id: generateId('schedule'),
          studentId: selectedStudent.id,
          studentName: selectedStudent.name,
          studentPhoto: selectedStudent.photo,
          routineId: singleRoutineId || undefined,
          routineTitle: singleRoutineTitle || 'Treino Presencial',
          date: singleDate,
          time: singleTime,
          durationMinutes: singleDuration,
          status: 'scheduled',
          notes: singleNotes
        };
        await saveAppointment(appointment);
      } else {
        // Recurring mode
        if (selectedWeekdays.length === 0) {
          alert('Selecione ao menos um dia da semana.');
          setIsSubmitting(false);
          return;
        }

        const recurrenceId = generateId('rec');
        const recurrence: ScheduleRecurrence = {
          id: recurrenceId,
          studentId: selectedStudent.id,
          studentName: selectedStudent.name,
          studentPhoto: selectedStudent.photo,
          startDate,
          endDate: calculatedEndDate,
          periodType,
          weekdays: selectedWeekdays,
          defaultTime,
          useDifferentTimes,
          useDifferentRoutines,
          weekdayConfigs: formattedWeekdayConfigs,
          defaultDurationMinutes: defaultDuration,
          defaultRoutineId: defaultRoutineId || undefined,
          defaultRoutineTitle: defaultRoutineTitle || 'Treino Presencial',
          notes: recurrenceNotes,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await saveScheduleRecurrence(recurrence);
      }
      onClose();
    } catch (err) {
      console.error('Error creating appointment/recurrence:', err);
      alert('Erro ao salvar agendamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-[#27272a] rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#E5E7EB] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#374151]/15 border border-[#374151]/30 flex items-center justify-center text-[#374151]">
              {mode === 'recurring' ? <Repeat className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-display uppercase text-[#1F2937] tracking-wide">
                {mode === 'recurring' ? 'Agendamento Recorrente' : 'Novo Atendimento'}
              </h2>
              <p className="text-xs text-[#4B5563]">
                {mode === 'recurring' 
                  ? 'Configure uma vez e gere a rotina semanal de treinos automaticamente' 
                  : 'Agende uma sessão única no calendário'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#F8F9FA] text-[#4B5563] hover:text-[#1F2937] hover:bg-[#E5E7EB] border border-[#E5E7EB] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Mode Selector (Single vs Recurring) */}
          <div className="bg-[#F8F9FA] p-1.5 rounded-2xl border border-[#E5E7EB] grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('recurring')}
              className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                mode === 'recurring'
                  ? 'bg-[#374151] text-white shadow-lg shadow-xs'
                  : 'text-[#4B5563] hover:text-[#1F2937]'
              }`}
            >
              <Repeat className="w-4 h-4" />
              <span>Atendimento Recorrente (Semanal)</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('single')}
              className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                mode === 'single'
                  ? 'bg-[#374151] text-white shadow-lg shadow-xs'
                  : 'text-[#4B5563] hover:text-[#1F2937]'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Atendimento Único</span>
            </button>
          </div>

          {/* Student Selector */}
          <div>
            <label className="block text-[#1F2937] font-bold mb-2 flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#374151]" />
              <span>Aluno</span>
            </label>

            {students.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#F8F9FA] border border-[#E5E7EB] text-center text-[#4B5563]">
                Nenhum aluno cadastrado. Cadastre um aluno primeiro.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {students.map(s => {
                  const isSelected = s.id === selectedStudentId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedStudentId(s.id);
                        // reset routine selection
                        setSingleRoutineId('');
                        setDefaultRoutineId('');
                      }}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                        isSelected
                          ? 'bg-[#374151] border-[#374151] text-white'
                          : 'bg-[#F8F9FA] border-[#E5E7EB] text-[#4B5563] hover:text-[#1F2937] hover:border-[#3f3f46]'
                      }`}
                    >
                      <StudentAvatar name={s.name} photo={s.photo} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className={`font-bold truncate text-xs ${isSelected ? 'text-white' : 'text-[#1F2937]'}`}>
                          {s.name}
                        </p>
                        <p className={`text-[11px] truncate ${isSelected ? 'text-zinc-200' : 'text-[#4B5563]'}`}>{s.goal || 'Objetivo Geral'}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ================= RECURRING MODE FIELDS ================= */}
          {mode === 'recurring' && (
            <div className="space-y-6 pt-2">
              
              {/* Presets Shortcuts */}
              <div>
                <label className="block text-[#1F2937] font-bold mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#374151]" />
                  <span>Frequência Semanal</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  {PRESET_OPTIONS.map(preset => {
                    const isActive = preset.weekdays.length > 0 && 
                      preset.weekdays.length === selectedWeekdays.length &&
                      preset.weekdays.every(d => selectedWeekdays.includes(d));

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPreset(preset.weekdays)}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          isActive
                            ? 'bg-[#374151] border-[#374151] text-white font-bold'
                            : 'bg-[#F8F9FA] border-[#E5E7EB] text-[#4B5563] hover:text-[#1F2937]'
                        }`}
                      >
                        <span className="block font-bold text-xs">{preset.label}</span>
                        <span className={`block text-[10px] mt-0.5 ${isActive ? 'text-zinc-200' : 'text-[#4B5563]'}`}>{preset.description}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Day-by-Day Selector Pills */}
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS_ORDERED.map(w => {
                    const isSelected = selectedWeekdays.includes(w.day);
                    return (
                      <button
                        key={w.day}
                        type="button"
                        onClick={() => toggleWeekday(w.day)}
                        className={`flex-1 min-w-[50px] py-2.5 px-2 rounded-xl font-bold font-display text-xs tracking-wider transition-all border ${
                          isSelected
                            ? 'bg-[#374151] text-white border-[#374151] shadow-md shadow-xs'
                            : 'bg-[#F8F9FA] text-[#4B5563] border-[#E5E7EB] hover:text-[#1F2937]'
                        }`}
                      >
                        {w.code}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Start Date & Period Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#1F2937] font-bold mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#374151]" />
                    <span>A Partir de (Data Inicial)</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-3 text-[#1F2937] focus:outline-none focus:border-[#374151] text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[#1F2937] font-bold mb-1.5 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-[#374151]" />
                    <span>Período da Recorrência</span>
                  </label>
                  <select
                    value={periodType}
                    onChange={e => setPeriodType(e.target.value as RecurrencePeriodType)}
                    className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-3 text-[#1F2937] focus:outline-none focus:border-[#374151] text-xs font-bold"
                  >
                    <option value="current_week" className="bg-white text-[#1F2937]">Esta semana (restante)</option>
                    <option value="4_weeks" className="bg-white text-[#1F2937]">Próximas 4 semanas (Padrão)</option>
                    <option value="8_weeks" className="bg-white text-[#1F2937]">Próximas 8 semanas</option>
                    <option value="custom_date" className="bg-white text-[#1F2937]">Até uma data específica</option>
                    <option value="indefinite" className="bg-white text-[#1F2937]">Sem data final (Regra Contínua)</option>
                  </select>
                </div>
              </div>

              {/* Custom End Date Field */}
              {periodType === 'custom_date' && (
                <div>
                  <label className="block text-[#1F2937] font-bold mb-1.5">Data Final</label>
                  <input
                    type="date"
                    min={startDate}
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-3 text-[#1F2937] focus:outline-none focus:border-[#374151] text-xs font-bold"
                  />
                </div>
              )}

              {/* Time Configuration */}
              <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[#1F2937] font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#374151]" />
                    <span>Horários de Atendimento</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useDifferentTimes}
                      onChange={e => setUseDifferentTimes(e.target.checked)}
                      className="rounded bg-[#27272A] border-[#D1D5DB] text-[#374151] focus:ring-[#374151]"
                    />
                    <span className="text-[11px] text-[#4B5563] font-bold">Horários diferentes por dia</span>
                  </label>
                </div>

                {!useDifferentTimes ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="block text-[11px] text-[#4B5563] mb-1 font-bold">Horário Padrão</span>
                      <input
                        type="time"
                        required
                        value={defaultTime}
                        onChange={e => setDefaultTime(e.target.value)}
                        className="w-full bg-white border border-[#E5E7EB] rounded-xl p-2.5 text-[#1F2937] text-xs font-bold focus:outline-none focus:border-[#374151]"
                      />
                    </div>

                    <div>
                      <span className="block text-[11px] text-[#4B5563] mb-1 font-bold">Duração da Sessão</span>
                      <select
                        value={defaultDuration}
                        onChange={e => setDefaultDuration(Number(e.target.value))}
                        className="w-full bg-white border border-[#E5E7EB] rounded-xl p-2.5 text-[#1F2937] text-xs font-bold focus:outline-none focus:border-[#374151]"
                      >
                        <option value={30} className="bg-white text-[#1F2937]">30 minutos</option>
                        <option value={45} className="bg-white text-[#1F2937]">45 minutos</option>
                        <option value={60} className="bg-white text-[#1F2937]">60 minutos (1h)</option>
                        <option value={75} className="bg-white text-[#1F2937]">75 minutos</option>
                        <option value={90} className="bg-white text-[#1F2937]">90 minutos (1h30)</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {selectedWeekdays.map(day => {
                      const wDef = WEEKDAYS_ORDERED.find(w => w.day === day);
                      const currentCfg = weekdayConfigs[day] || { time: defaultTime };
                      return (
                        <div key={day} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#E5E7EB]">
                          <span className="font-bold text-[#1F2937] uppercase text-xs">{wDef?.fullLabel}</span>
                          <input
                            type="time"
                            value={currentCfg.time || defaultTime}
                            onChange={e => updateWeekdayConfig(day, { time: e.target.value })}
                            className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-lg px-2.5 py-1 text-[#1F2937] text-xs font-bold focus:outline-none focus:border-[#374151]"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Routine & Workout Configuration */}
              <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[#1F2937] font-bold flex items-center gap-1.5">
                    <Dumbbell className="w-3.5 h-3.5 text-[#374151]" />
                    <span>Rotinas & Treinos Vinculados</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useDifferentRoutines}
                      onChange={e => setUseDifferentRoutines(e.target.checked)}
                      className="rounded bg-[#27272A] border-[#D1D5DB] text-[#374151] focus:ring-[#374151]"
                    />
                    <span className="text-[11px] text-[#4B5563] font-bold">Rotinas diferentes por dia (Ex: A/B/C)</span>
                  </label>
                </div>

                {!useDifferentRoutines ? (
                  <div>
                    <span className="block text-[11px] text-[#4B5563] mb-1 font-bold">Rotina Padrão</span>
                    {studentRoutines.length > 0 ? (
                      <select
                        value={defaultRoutineId}
                        onChange={e => {
                          const rId = e.target.value;
                          setDefaultRoutineId(rId);
                          const found = studentRoutines.find(r => r.id === rId);
                          setDefaultRoutineTitle(found ? found.name : 'Treino Presencial');
                        }}
                        className="w-full bg-white border border-[#E5E7EB] rounded-xl p-2.5 text-[#1F2937] text-xs font-bold focus:outline-none focus:border-[#374151]"
                      >
                        <option value="" className="bg-white text-[#1F2937]">Treino Presencial Geral (Sem rotina pré-selecionada)</option>
                        {studentRoutines.map(r => (
                          <option key={r.id} value={r.id} className="bg-white text-[#1F2937]">{r.name || r.title} ({(r.workouts?.reduce((acc, w) => acc + (w.exercises?.length || 0), 0) || r.exercises?.length || 0)} exercícios)</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={defaultRoutineTitle}
                        onChange={e => setDefaultRoutineTitle(e.target.value)}
                        placeholder="Ex: Treino Presencial, Musculação..."
                        className="w-full bg-white border border-[#E5E7EB] rounded-xl p-2.5 text-[#1F2937] text-xs font-bold focus:outline-none focus:border-[#374151]"
                      />
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    {selectedWeekdays.map(day => {
                      const wDef = WEEKDAYS_ORDERED.find(w => w.day === day);
                      const currentCfg = weekdayConfigs[day] || { weekday: day, time: defaultTime };
                      return (
                        <div key={day} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-[#E5E7EB]">
                          <span className="font-bold text-[#1F2937] uppercase text-xs sm:w-1/3">{wDef?.fullLabel}</span>
                          
                          {studentRoutines.length > 0 ? (
                            <select
                              value={currentCfg.routineId || ''}
                              onChange={e => {
                                const rId = e.target.value;
                                const found = studentRoutines.find(r => r.id === rId);
                                updateWeekdayConfig(day, {
                                  routineId: rId,
                                  routineTitle: found ? found.name : (currentCfg.routineTitle || 'Treino Presencial')
                                });
                              }}
                              className="flex-1 bg-[#F8F9FA] border border-[#E5E7EB] rounded-lg px-2.5 py-1 text-[#1F2937] text-xs font-bold focus:outline-none focus:border-[#374151]"
                            >
                              <option value="" className="bg-white text-[#1F2937]">Treino Livre / {wDef?.code}</option>
                              {studentRoutines.map(r => (
                                <option key={r.id} value={r.id} className="bg-white text-[#1F2937]">{r.name}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={currentCfg.routineTitle || `Treino ${wDef?.code}`}
                              onChange={e => updateWeekdayConfig(day, { routineTitle: e.target.value })}
                              className="flex-1 bg-[#F8F9FA] border border-[#E5E7EB] rounded-lg px-2.5 py-1 text-[#1F2937] text-xs font-bold focus:outline-none focus:border-[#374151]"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[#1F2937] font-bold mb-1">Observações da Recorrência</label>
                <input
                  type="text"
                  placeholder="Ex: Aluno treina na primeira esteira, focar em pernas..."
                  value={recurrenceNotes}
                  onChange={e => setRecurrenceNotes(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-3 text-[#1F2937] focus:outline-none focus:border-[#374151] text-xs"
                />
              </div>

              {/* Live Preview & Conflict Summary Bar */}
              <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#16a34a]" />
                    <span className="font-bold text-[#1F2937] text-xs">
                      {previewData.totalCount} atendimentos calculados
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPreviewList(!showPreviewList)}
                    className="text-[#374151] font-bold text-xs hover:underline flex items-center gap-1"
                  >
                    <span>{showPreviewList ? 'Ocultar Detalhes' : 'Ver Lista de Datas'}</span>
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showPreviewList ? 'rotate-90' : ''}`} />
                  </button>
                </div>

                {/* Conflict Warnings */}
                {previewData.duplicateConflictCount > 0 && (
                  <div className="p-3 rounded-xl bg-[#374151]/15 border border-[#374151]/40 flex items-start gap-2.5 text-[#374151]">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs">Conflito de duplicidade detectado</p>
                      <p className="text-[11px] opacity-90">
                        {selectedStudent?.name} já possui agendamentos no mesmo horário em {previewData.duplicateConflictCount} data(s). Os agendamentos existentes serão preservados sem duplicar.
                      </p>
                    </div>
                  </div>
                )}

                {previewData.doubleBookingCount > 0 && (
                  <div className="p-3 rounded-xl bg-[#eab308]/15 border border-[#eab308]/40 flex items-start gap-2.5 text-[#eab308]">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs">Atenção: Horário com outro aluno agendado (Treino Duplo)</p>
                      <p className="text-[11px] opacity-90">
                        Em {previewData.doubleBookingCount} ocorrência(s), outro aluno já está agendado neste horário. O TFIVE PRO suporta até 2 alunos simultâneos.
                      </p>
                    </div>
                  </div>
                )}

                {/* Dropdown preview list */}
                {showPreviewList && (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pt-2 border-t border-[#E5E7EB]">
                    {previewData.occurrences.map((item, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-white text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#374151] w-8">{item.weekdayLabel}</span>
                          <span className="text-[#1F2937] font-medium">{item.formattedDate}</span>
                          <span className="text-[#4B5563] font-mono-nums">às {item.time}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-[#4B5563] truncate max-w-[120px]">{item.routineTitle}</span>
                          {item.existingCountAtTime > 0 && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              item.isSameStudentConflict 
                                ? 'bg-[#F3F4F6] text-[#374151]' 
                                : 'bg-[#eab308]/20 text-[#eab308]'
                            }`}>
                              {item.isSameStudentConflict ? 'Já existe' : `Duplo (${item.conflictingStudents.join(', ')})`}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ================= SINGLE MODE FIELDS ================= */}
          {mode === 'single' && (
            <div className="space-y-4 pt-2">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#1F2937] font-bold mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={singleDate}
                    onChange={e => setSingleDate(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-3 text-[#1F2937] text-xs font-bold focus:outline-none focus:border-[#374151]"
                  />
                </div>

                <div>
                  <label className="block text-[#1F2937] font-bold mb-1">Horário</label>
                  <input
                    type="time"
                    required
                    value={singleTime}
                    onChange={e => setSingleTime(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-3 text-[#1F2937] text-xs font-bold focus:outline-none focus:border-[#374151]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#1F2937] font-bold mb-1">Duração</label>
                  <select
                    value={singleDuration}
                    onChange={e => setSingleDuration(Number(e.target.value))}
                    className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-3 text-[#1F2937] text-xs font-bold focus:outline-none focus:border-[#374151]"
                  >
                    <option value={30} className="bg-white text-[#1F2937]">30 minutos</option>
                    <option value={45} className="bg-white text-[#1F2937]">45 minutos</option>
                    <option value={60} className="bg-white text-[#1F2937]">60 minutos (1h)</option>
                    <option value={75} className="bg-white text-[#1F2937]">75 minutos</option>
                    <option value={90} className="bg-white text-[#1F2937]">90 minutos (1h30)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#1F2937] font-bold mb-1">Rotina de Treino</label>
                  {studentRoutines.length > 0 ? (
                    <select
                      value={singleRoutineId}
                      onChange={e => {
                        const rId = e.target.value;
                        setSingleRoutineId(rId);
                        const found = studentRoutines.find(r => r.id === rId);
                        setSingleRoutineTitle(found ? found.name : 'Treino Presencial');
                      }}
                      className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-3 text-[#1F2937] text-xs font-bold focus:outline-none focus:border-[#374151]"
                    >
                      <option value="" className="bg-white text-[#1F2937]">Treino Presencial Geral</option>
                      {studentRoutines.map(r => (
                        <option key={r.id} value={r.id} className="bg-white text-[#1F2937]">{r.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={singleRoutineTitle}
                      onChange={e => setSingleRoutineTitle(e.target.value)}
                      placeholder="Ex: Treino A, Musculação..."
                      className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-3 text-[#1F2937] text-xs font-bold focus:outline-none focus:border-[#374151]"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[#1F2937] font-bold mb-1">Observações da Sessão</label>
                <input
                  type="text"
                  placeholder="Ex: Foco em progressão de carga no leg press..."
                  value={singleNotes}
                  onChange={e => setSingleNotes(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-3 text-[#1F2937] focus:outline-none focus:border-[#374151] text-xs"
                />
              </div>

              {/* Single Mode Conflict Badge */}
              {singleAppointmentConflicts.duplicate && (
                <div className="p-3 rounded-xl bg-[#374151]/15 border border-[#374151]/40 flex items-start gap-2.5 text-[#374151]">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold">
                    {selectedStudent?.name} já tem uma sessão agendada exatamente neste mesmo horário!
                  </p>
                </div>
              )}

              {singleAppointmentConflicts.concurrentCount > 0 && !singleAppointmentConflicts.duplicate && (
                <div className="p-3 rounded-xl bg-[#eab308]/15 border border-[#eab308]/40 flex items-start gap-2.5 text-[#eab308]">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold">
                    Treino Duplo: {singleAppointmentConflicts.concurrentNames.join(', ')} também estará agendado neste horário.
                  </p>
                </div>
              )}

            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#E5E7EB] flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#F8F9FA] hover:bg-[#E5E7EB] text-[#4B5563] hover:text-[#1F2937] font-bold transition-all text-xs"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting || students.length === 0}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#374151] hover:bg-[#1F2937] disabled:opacity-80 text-white font-bold font-display text-sm tracking-wider transition-all shadow-lg shadow-xs flex items-center justify-center gap-2"
            >
              {mode === 'recurring' ? (
                <>
                  <Repeat className="w-4 h-4 text-white" />
                  <span>SALVAR ROTINA RECORRENTE</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-white" />
                  <span>CONFIRMAR AGENDAMENTO</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
