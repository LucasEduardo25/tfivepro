import { 
  ScheduleAppointment, 
  ScheduleRecurrence, 
  WeekdayNumber, 
  WeekdayScheduleConfig,
  RecurrencePeriodType,
  Student,
  WorkoutRoutine
} from '../types';
import { generateId } from '../db/indexedDB';

export interface WeekdayDefinition {
  day: WeekdayNumber;
  code: string;
  shortLabel: string;
  fullLabel: string;
}

export const WEEKDAYS_ORDERED: WeekdayDefinition[] = [
  { day: 1, code: 'SEG', shortLabel: 'Seg', fullLabel: 'Segunda-feira' },
  { day: 2, code: 'TER', shortLabel: 'Ter', fullLabel: 'Terça-feira' },
  { day: 3, code: 'QUA', shortLabel: 'Qua', fullLabel: 'Quarta-feira' },
  { day: 4, code: 'QUI', shortLabel: 'Qui', fullLabel: 'Quinta-feira' },
  { day: 5, code: 'SEX', shortLabel: 'Sex', fullLabel: 'Sexta-feira' },
  { day: 6, code: 'SÁB', shortLabel: 'Sáb', fullLabel: 'Sábado' },
  { day: 0, code: 'DOM', shortLabel: 'Dom', fullLabel: 'Domingo' }
];

export const PRESET_OPTIONS = [
  { id: '2x', label: '2x por semana', weekdays: [1, 3] as WeekdayNumber[], description: 'Seg / Qua' },
  { id: '3x', label: '3x por semana', weekdays: [1, 3, 5] as WeekdayNumber[], description: 'Seg / Qua / Sex' },
  { id: '5x', label: '5x por semana', weekdays: [1, 2, 3, 4, 5] as WeekdayNumber[], description: 'Segunda a Sexta' },
  { id: 'custom', label: 'Personalizado', weekdays: [] as WeekdayNumber[], description: 'Escolha os dias' }
];

/**
 * Parses YYYY-MM-DD string into a safe local Date object at noon (12:00)
 * to avoid daylight saving and timezone boundary shifts.
 */
export function parseISODate(dateStr: string): Date {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);
  return new Date(year, month, day, 12, 0, 0, 0);
}

/**
 * Formats a Date object to YYYY-MM-DD string using local calendar numbers.
 */
export function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns weekday number (0=DOM, 1=SEG, ..., 6=SÁB)
 */
export function getWeekdayNumber(date: Date | string): WeekdayNumber {
  const d = typeof date === 'string' ? parseISODate(date) : date;
  return d.getDay() as WeekdayNumber;
}

/**
 * Adds integer number of days to a date
 */
export function addDaysToDate(date: Date | string, days: number): Date {
  const base = typeof date === 'string' ? parseISODate(date) : new Date(date.getTime());
  base.setDate(base.getDate() + days);
  return base;
}

/**
 * Returns Monday of the week for a given date
 */
export function getMondayOfWeek(dateStr: string): string {
  const date = parseISODate(dateStr);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  return formatDateToISO(monday);
}

/**
 * Returns all 7 dates (Mon-Sun) of the week for a given Monday date
 */
export function getWeekDates(mondayStr: string): string[] {
  const monday = parseISODate(mondayStr);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    dates.push(formatDateToISO(current));
  }
  return dates;
}

/**
 * Calculates end date based on period type and start date
 */
export function calculateEndDateFromPeriod(
  startDateStr: string, 
  periodType: RecurrencePeriodType, 
  customEndDate?: string
): string | null {
  if (periodType === 'indefinite') return null;
  if (periodType === 'custom_date') return customEndDate || startDateStr;

  const startDate = parseISODate(startDateStr);

  if (periodType === 'current_week') {
    // End date is Sunday of current week
    const day = startDate.getDay();
    const daysUntilSunday = day === 0 ? 0 : 7 - day;
    const sunday = addDaysToDate(startDate, daysUntilSunday);
    return formatDateToISO(sunday);
  }

  if (periodType === '4_weeks') {
    // 4 weeks (28 days minus 1 from start)
    const endDate = addDaysToDate(startDate, 27);
    return formatDateToISO(endDate);
  }

  if (periodType === '8_weeks') {
    // 8 weeks (56 days minus 1 from start)
    const endDate = addDaysToDate(startDate, 55);
    return formatDateToISO(endDate);
  }

  return null;
}

/**
 * Generates deterministic appointment ID for a recurrence occurrence
 */
export function generateDeterministicAppointmentId(recurrenceId: string, dateStr: string): string {
  return `rec_${recurrenceId}_${dateStr}`;
}

export interface OccurrencePreviewItem {
  date: string;
  weekdayLabel: string;
  formattedDate: string;
  time: string;
  durationMinutes: number;
  routineTitle: string;
  routineId?: string;
  existingCountAtTime: number;
  conflictingStudents: string[];
  isSameStudentConflict: boolean;
}

/**
 * Computes exact list of occurrences and conflict analysis before saving
 */
export function previewRecurrenceOccurrences(
  recurrence: Partial<ScheduleRecurrence> & {
    studentId: string;
    studentName: string;
    startDate: string;
    weekdays: WeekdayNumber[];
    defaultTime: string;
    weekdayConfigs: WeekdayScheduleConfig[];
    periodType: RecurrencePeriodType;
    endDate?: string | null;
  },
  existingAppointments: ScheduleAppointment[],
  options?: { maxHorizonWeeks?: number }
): {
  occurrences: OccurrencePreviewItem[];
  totalCount: number;
  hasConflicts: boolean;
  duplicateConflictCount: number;
  doubleBookingCount: number;
} {
  const maxWeeks = options?.maxHorizonWeeks || (recurrence.periodType === 'indefinite' ? 12 : 26);
  const start = parseISODate(recurrence.startDate);
  
  let end: Date;
  if (recurrence.endDate) {
    end = parseISODate(recurrence.endDate);
  } else {
    // Horizon limit for preview or indefinite
    end = addDaysToDate(start, maxWeeks * 7);
  }

  const occurrences: OccurrencePreviewItem[] = [];
  let duplicateConflictCount = 0;
  let doubleBookingCount = 0;

  const weekdays = Array.isArray(recurrence.weekdays) ? recurrence.weekdays : [];
  const weekdayConfigs = Array.isArray(recurrence.weekdayConfigs) ? recurrence.weekdayConfigs : [];

  // Iterate day by day from start to end
  const current = new Date(start);
  while (current <= end) {
    const currentWeekday = current.getDay() as WeekdayNumber;
    const dateStr = formatDateToISO(current);

    if (weekdays.includes(currentWeekday)) {
      // Check pause
      let isPaused = false;
      if (recurrence.pausedFrom && recurrence.pausedUntil) {
        if (dateStr >= recurrence.pausedFrom && dateStr <= recurrence.pausedUntil) {
          isPaused = true;
        }
      }

      if (!isPaused) {
        const config = weekdayConfigs.find(c => c.weekday === currentWeekday);
        const time = (recurrence.useDifferentTimes && config?.time) ? config.time : (recurrence.defaultTime || '07:00');
        const durationMinutes = (config?.durationMinutes) || (recurrence.defaultDurationMinutes || 60);
        const routineTitle = (recurrence.useDifferentRoutines && config?.routineTitle) 
          ? config.routineTitle 
          : (recurrence.defaultRoutineTitle || 'Treino Presencial');
        const routineId = (recurrence.useDifferentRoutines && config?.routineId)
          ? config.routineId
          : recurrence.defaultRoutineId;
        const workoutId = (recurrence.useDifferentRoutines && config?.workoutId)
          ? config.workoutId
          : recurrence.defaultWorkoutId;
        const workoutLetter = (recurrence.useDifferentRoutines && config?.workoutLetter)
          ? config.workoutLetter
          : recurrence.defaultWorkoutLetter;
        const workoutTitle = (recurrence.useDifferentRoutines && config?.workoutTitle)
          ? config.workoutTitle
          : recurrence.defaultWorkoutTitle;

        // Check conflicts in existing schedule
        const atSameTime = existingAppointments.filter(a => 
          a.date === dateStr && 
          a.time === time && 
          a.status !== 'cancelled' &&
          a.id !== generateDeterministicAppointmentId(recurrence.id || '', dateStr)
        );

        const isSameStudentConflict = atSameTime.some(a => a.studentId === recurrence.studentId);
        const conflictingStudents = atSameTime.map(a => a.studentName);

        if (isSameStudentConflict) duplicateConflictCount++;
        if (atSameTime.length > 0 && !isSameStudentConflict) doubleBookingCount++;

        const weekdayDef = WEEKDAYS_ORDERED.find(w => w.day === currentWeekday);
        const formattedDate = current.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit'
        });

        occurrences.push({
          date: dateStr,
          weekdayLabel: weekdayDef?.code || 'DIA',
          formattedDate,
          time,
          durationMinutes,
          routineTitle,
          routineId,
          existingCountAtTime: atSameTime.length,
          conflictingStudents,
          isSameStudentConflict
        });
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return {
    occurrences,
    totalCount: occurrences.length,
    hasConflicts: duplicateConflictCount > 0 || doubleBookingCount > 0,
    duplicateConflictCount,
    doubleBookingCount
  };
}

/**
 * Materializes ScheduleAppointment objects from a recurrence rule
 */
export function materializeAppointmentsFromRecurrence(
  recurrence: ScheduleRecurrence,
  options?: { horizonWeeks?: number; fromDate?: string; toDate?: string }
): ScheduleAppointment[] {
  if (recurrence.status === 'ended') return [];

  const horizon = options?.horizonWeeks || (recurrence.periodType === 'indefinite' ? 12 : 26);
  const startDateStr = options?.fromDate && options.fromDate > recurrence.startDate 
    ? options.fromDate 
    : recurrence.startDate;
  
  const start = parseISODate(startDateStr);
  
  let end: Date;
  if (options?.toDate) {
    end = parseISODate(options.toDate);
  } else if (recurrence.endDate) {
    end = parseISODate(recurrence.endDate);
  } else {
    end = addDaysToDate(parseISODate(recurrence.startDate), horizon * 7);
  }

  const appointments: ScheduleAppointment[] = [];
  const current = new Date(start);
  const weekdays = Array.isArray(recurrence.weekdays) ? recurrence.weekdays : [];
  const weekdayConfigs = Array.isArray(recurrence.weekdayConfigs) ? recurrence.weekdayConfigs : [];

  while (current <= end) {
    const currentWeekday = current.getDay() as WeekdayNumber;
    const dateStr = formatDateToISO(current);

    if (weekdays.includes(currentWeekday)) {
      // Check pause
      let isPaused = false;
      if (recurrence.status === 'paused') {
        isPaused = true;
      } else if (recurrence.pausedFrom && recurrence.pausedUntil) {
        if (dateStr >= recurrence.pausedFrom && dateStr <= recurrence.pausedUntil) {
          isPaused = true;
        }
      }

      if (!isPaused) {
        const config = weekdayConfigs.find(c => c.weekday === currentWeekday);
        const time = (recurrence.useDifferentTimes && config?.time) ? config.time : recurrence.defaultTime;
        const durationMinutes = (config?.durationMinutes) || recurrence.defaultDurationMinutes || 60;
        const routineTitle = (recurrence.useDifferentRoutines && config?.routineTitle)
          ? config.routineTitle
          : (recurrence.defaultRoutineTitle || 'Treino Presencial');
        const routineId = (recurrence.useDifferentRoutines && config?.routineId)
          ? config.routineId
          : recurrence.defaultRoutineId;
        const workoutId = (recurrence.useDifferentRoutines && config?.workoutId)
          ? config.workoutId
          : recurrence.defaultWorkoutId;
        const workoutLetter = (recurrence.useDifferentRoutines && config?.workoutLetter)
          ? config.workoutLetter
          : recurrence.defaultWorkoutLetter;
        const workoutTitle = (recurrence.useDifferentRoutines && config?.workoutTitle)
          ? config.workoutTitle
          : recurrence.defaultWorkoutTitle;

        const appt: ScheduleAppointment = {
          id: generateDeterministicAppointmentId(recurrence.id, dateStr),
          studentId: recurrence.studentId,
          studentName: recurrence.studentName,
          studentPhoto: recurrence.studentPhoto,
          routineId,
          routineTitle,
          workoutId,
          workoutLetter,
          workoutTitle,
          date: dateStr,
          time,
          durationMinutes,
          status: 'scheduled',
          recurrenceId: recurrence.id,
          notes: recurrence.notes
        };

        appointments.push(appt);
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return appointments;
}
