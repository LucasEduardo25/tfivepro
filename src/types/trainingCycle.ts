export type TrainingCycleStatus = 'planned' | 'current' | 'completed' | 'archived';

export interface BlockRoutineChangeHistory {
  id: string;
  date: string;
  previousRoutineId?: string;
  previousRoutineTitle?: string;
  newRoutineId: string;
  newRoutineTitle: string;
  note?: string;
}

export interface TrainingBlock {
  id: string;
  name: string;
  objective?: string;
  order: number;
  durationWeeks: number;
  routineId?: string;
  routineTitleSnapshot?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  notes?: string;
  routineHistory?: BlockRoutineChangeHistory[];
}

export interface TrainingCycle {
  id: string;
  studentId: string;
  name: string;
  objective?: string;
  startDate: string; // YYYY-MM-DD
  totalWeeks: number;
  reviewDate?: string; // YYYY-MM-DD
  actualEndDate?: string; // YYYY-MM-DD
  status: TrainingCycleStatus;
  blocks: TrainingBlock[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CycleMetrics {
  currentCycleWeek: number;
  totalCycleWeeks: number;
  currentBlock: TrainingBlock | null;
  currentBlockIndex: number;
  currentBlockWeek: number;
  totalBlockWeeks: number;
  percentComplete: number;
  isEndingSoon: boolean;
  daysRemainingInBlock: number;
  reviewStatus: 'none' | 'today' | 'upcoming' | 'overdue';
  reviewDaysRemaining?: number;
  isCompleted: boolean;
  isPlanned: boolean;
}
