import { TrainingCycle, TrainingBlock, CycleMetrics, BlockRoutineChangeHistory } from '../types/trainingCycle';
import { generateId } from '../db/indexedDB';

export type { CycleMetrics, BlockRoutineChangeHistory };

/**
 * Parses YYYY-MM-DD string into a Date object at local midnight (avoids UTC timezone shift bugs)
 */
export function parseIsoDateOnly(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month, day, 0, 0, 0, 0);
    }
  }
  const fallback = new Date(dateStr);
  fallback.setHours(0, 0, 0, 0);
  return fallback;
}

/**
 * Formats a Date object to YYYY-MM-DD
 */
export function formatToIsoDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats YYYY-MM-DD or ISO string into DD/MM/YYYY
 */
export function formatDateBr(dateStr?: string): string {
  if (!dateStr) return '-';
  const cleanStr = dateStr.split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Formats YYYY-MM-DD into DD/MM
 */
export function formatDateShortBr(dateStr?: string): string {
  if (!dateStr) return '-';
  const cleanStr = dateStr.split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}

/**
 * Adds days to a Date object without mutating original
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

export const addDaysToDate = addDays;
export const formatIsoDateOnly = formatToIsoDateOnly;

export const DEFAULT_CYCLE_OBJECTIVES: string[] = [
  'Hipertrofia',
  'Força',
  'Emagrecimento',
  'Reabilitação',
  'Condicionamento',
  'Adaptação Anatômica',
  'Resistência Muscular',
  'Potência'
];

export function createDefaultTrainingBlock(
  order: number,
  name: string = `Bloco ${order}`,
  durationWeeks: number = 4,
  routineId?: string,
  routineTitleSnapshot?: string
): TrainingBlock {
  return {
    id: generateId('tblk'),
    order,
    name,
    objective: '',
    durationWeeks,
    startDate: '',
    endDate: '',
    routineId,
    routineTitleSnapshot,
    notes: '',
    routineHistory: []
  };
}

export function recalculateBlockDates(
  blocks: TrainingBlock[],
  startDate: string
): TrainingBlock[] {
  return calculateBlockDates(startDate, blocks);
}

/**
 * Calculates start and end dates for a sequential list of blocks based on cycle startDate.
 * Block 1 starts on cycle.startDate.
 * Block N ends (durationWeeks * 7 - 1) days after its startDate.
 * Block N+1 starts 1 day after Block N ends.
 */
export function calculateBlockDates(
  cycleStartDate: string,
  rawBlocks: Array<Partial<TrainingBlock> & { durationWeeks: number; name: string }>
): TrainingBlock[] {
  let currentStart = parseIsoDateOnly(cycleStartDate);

  return rawBlocks.map((b, idx) => {
    const weeks = Math.max(1, b.durationWeeks || 4);
    const durationDays = weeks * 7;
    const startIso = formatToIsoDateOnly(currentStart);
    const end = addDays(currentStart, durationDays - 1);
    const endIso = formatToIsoDateOnly(end);

    // Next block starts the day after this block ends
    currentStart = addDays(end, 1);

    return {
      id: b.id || generateId('tblk'),
      name: b.name || `Bloco ${idx + 1}`,
      objective: b.objective || '',
      order: idx + 1,
      durationWeeks: weeks,
      routineId: b.routineId,
      routineTitleSnapshot: b.routineTitleSnapshot,
      startDate: startIso,
      endDate: endIso,
      notes: b.notes || '',
      routineHistory: b.routineHistory || []
    };
  });
}

/**
 * Recalculates entire cycle dates and total weeks.
 */
export function recalculateCycleDates(cycle: TrainingCycle): TrainingCycle {
  const updatedBlocks = calculateBlockDates(cycle.startDate, cycle.blocks);
  const totalWeeks = updatedBlocks.reduce((acc, b) => acc + (b.durationWeeks || 0), 0);

  // If reviewDate is unset, default to the last block's end date or current block's end date
  let reviewDate = cycle.reviewDate;
  if (!reviewDate && updatedBlocks.length > 0) {
    reviewDate = updatedBlocks[0].endDate;
  }

  return {
    ...cycle,
    totalWeeks,
    blocks: updatedBlocks,
    reviewDate,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Computes live metrics for a cycle: current week, current block, block week, review status, percent complete
 */
export function computeCycleMetrics(cycle: TrainingCycle, referenceDate: Date = new Date()): CycleMetrics {
  const today = new Date(referenceDate.getTime());
  today.setHours(0, 0, 0, 0);

  const totalCycleWeeks = Math.max(1, cycle.totalWeeks || cycle.blocks.reduce((acc, b) => acc + b.durationWeeks, 0));
  const cycleStart = parseIsoDateOnly(cycle.startDate);

  // Status checks
  const isCompleted = cycle.status === 'completed';
  const isPlanned = cycle.status === 'planned';

  const diffMsFromStart = today.getTime() - cycleStart.getTime();
  const diffDaysFromStart = Math.floor(diffMsFromStart / (1000 * 60 * 60 * 24));

  // Determine current cycle week (1-indexed, bounded between 1 and totalCycleWeeks)
  let currentCycleWeek = 1;
  if (diffDaysFromStart > 0) {
    currentCycleWeek = Math.min(totalCycleWeeks, Math.floor(diffDaysFromStart / 7) + 1);
  }

  // Find current active block
  let currentBlock: TrainingBlock | null = null;
  let currentBlockIndex = -1;

  if (cycle.blocks.length > 0) {
    // Check if today falls into any block
    for (let i = 0; i < cycle.blocks.length; i++) {
      const blk = cycle.blocks[i];
      const bStart = parseIsoDateOnly(blk.startDate);
      const bEnd = parseIsoDateOnly(blk.endDate);
      // End date is inclusive
      bEnd.setHours(23, 59, 59, 999);

      if (today >= bStart && today <= bEnd) {
        currentBlock = blk;
        currentBlockIndex = i;
        break;
      }
    }

    // If today is before first block, pick first block
    if (!currentBlock && today < parseIsoDateOnly(cycle.blocks[0].startDate)) {
      currentBlock = cycle.blocks[0];
      currentBlockIndex = 0;
    }

    // If today is after all blocks, pick the last block
    if (!currentBlock) {
      currentBlock = cycle.blocks[cycle.blocks.length - 1];
      currentBlockIndex = cycle.blocks.length - 1;
    }
  }

  // Calculate week within current block
  let currentBlockWeek = 1;
  let totalBlockWeeks = currentBlock ? currentBlock.durationWeeks : 1;
  let daysRemainingInBlock = 0;
  let isEndingSoon = false;

  if (currentBlock) {
    const bStart = parseIsoDateOnly(currentBlock.startDate);
    const bEnd = parseIsoDateOnly(currentBlock.endDate);
    const diffBlockDays = Math.floor((today.getTime() - bStart.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffBlockDays > 0) {
      currentBlockWeek = Math.max(1, Math.min(totalBlockWeeks, Math.floor(diffBlockDays / 7) + 1));
    } else {
      currentBlockWeek = 1;
    }

    const remainingMs = bEnd.getTime() - today.getTime();
    daysRemainingInBlock = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
    // Ending soon if <= 7 days remaining or on last week of block
    isEndingSoon = daysRemainingInBlock <= 7;
  }

  // Overall period progress percentage: based on weeks or days elapsed
  let percentComplete = 0;
  if (isCompleted) {
    percentComplete = 100;
  } else if (isPlanned) {
    percentComplete = 0;
  } else {
    // Current cycle progress
    const totalDays = totalCycleWeeks * 7;
    const elapsedDays = Math.max(0, Math.min(totalDays, diffDaysFromStart + 1));
    percentComplete = Math.round((elapsedDays / totalDays) * 100);
  }

  // Review status
  let reviewStatus: 'none' | 'today' | 'upcoming' | 'overdue' = 'none';
  let reviewDaysRemaining: number | undefined = undefined;

  const targetReviewDateStr = cycle.reviewDate || currentBlock?.endDate;
  if (targetReviewDateStr) {
    const revDate = parseIsoDateOnly(targetReviewDateStr);
    const diffRevDays = Math.ceil((revDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    reviewDaysRemaining = diffRevDays;

    if (diffRevDays === 0) {
      reviewStatus = 'today';
    } else if (diffRevDays > 0 && diffRevDays <= 7) {
      reviewStatus = 'upcoming';
    } else if (diffRevDays < 0) {
      reviewStatus = 'overdue';
    }
  }

  return {
    currentCycleWeek,
    totalCycleWeeks,
    currentBlock,
    currentBlockIndex,
    currentBlockWeek,
    totalBlockWeeks,
    percentComplete,
    isEndingSoon,
    daysRemainingInBlock,
    reviewStatus,
    reviewDaysRemaining,
    isCompleted,
    isPlanned
  };
}

/**
 * Extends a block duration by N weeks, preserving history and recalculating subsequent block dates.
 */
export function extendBlockDuration(
  cycle: TrainingCycle,
  blockId: string,
  additionalWeeks: number
): TrainingCycle {
  const blockIdx = cycle.blocks.findIndex(b => b.id === blockId);
  if (blockIdx === -1 || additionalWeeks <= 0) return cycle;

  const updatedBlocks = [...cycle.blocks];
  const targetBlock = { ...updatedBlocks[blockIdx] };
  targetBlock.durationWeeks += additionalWeeks;
  updatedBlocks[blockIdx] = targetBlock;

  // Recalculate dates starting from cycle.startDate
  const recalculatedBlocks = calculateBlockDates(cycle.startDate, updatedBlocks);
  const totalWeeks = recalculatedBlocks.reduce((acc, b) => acc + b.durationWeeks, 0);

  // If review date was targetBlock.endDate, suggest extending it too
  let updatedReviewDate = cycle.reviewDate;
  if (cycle.reviewDate === targetBlock.endDate) {
    updatedReviewDate = recalculatedBlocks[blockIdx].endDate;
  }

  return {
    ...cycle,
    totalWeeks,
    blocks: recalculatedBlocks,
    reviewDate: updatedReviewDate,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Records a routine change during a block, appending to routineHistory without losing previous data.
 */
export function recordBlockRoutineChange(
  cycle: TrainingCycle,
  blockId: string,
  newRoutineId: string,
  newRoutineTitle: string,
  note?: string
): TrainingCycle {
  const updatedBlocks = cycle.blocks.map(b => {
    if (b.id !== blockId) return b;

    const historyEntry: BlockRoutineChangeHistory = {
      id: generateId('rhist'),
      date: new Date().toISOString(),
      previousRoutineId: b.routineId,
      previousRoutineTitle: b.routineTitleSnapshot || 'Rotina Anterior',
      newRoutineId,
      newRoutineTitle,
      note: note || 'Alteração de rotina durante o bloco'
    };

    const updatedHistory = [...(b.routineHistory || []), historyEntry];

    return {
      ...b,
      routineId: newRoutineId,
      routineTitleSnapshot: newRoutineTitle,
      routineHistory: updatedHistory
    };
  });

  return {
    ...cycle,
    blocks: updatedBlocks,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Duplicates a cycle structure for reuse.
 * Creates brand new IDs, sets status to 'planned', preserves block names, durations, objectives,
 * and clears old executed histories / sessions.
 */
export function duplicateCycle(cycle: TrainingCycle, newStartDate?: string): TrainingCycle {
  const now = new Date();
  const start = newStartDate || formatToIsoDateOnly(now);
  const newCycleId = generateId('cycle');

  const rawBlocks = cycle.blocks.map(b => ({
    id: generateId('tblk'),
    name: b.name,
    objective: b.objective || '',
    durationWeeks: b.durationWeeks,
    routineId: b.routineId,
    routineTitleSnapshot: b.routineTitleSnapshot,
    notes: b.notes || '',
    routineHistory: []
  }));

  const calculatedBlocks = calculateBlockDates(start, rawBlocks);
  const totalWeeks = calculatedBlocks.reduce((acc, b) => acc + b.durationWeeks, 0);

  return {
    id: newCycleId,
    studentId: cycle.studentId,
    name: `${cycle.name} (Cópia)`,
    objective: cycle.objective || '',
    startDate: start,
    totalWeeks,
    reviewDate: calculatedBlocks[0]?.endDate,
    status: 'planned',
    blocks: calculatedBlocks,
    notes: cycle.notes || '',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
}

/**
 * Normalizes a cycle object loaded from IndexedDB or backup to ensure structural stability
 */
export function normalizeTrainingCycle(raw: any): TrainingCycle {
  if (!raw || typeof raw !== 'object') {
    const cycleId = generateId('cycle');
    const today = formatToIsoDateOnly(new Date());
    const defaultBlocks = calculateBlockDates(today, [
      { name: 'Adaptação', durationWeeks: 4 },
      { name: 'Hipertrofia', durationWeeks: 4 },
      { name: 'Progressão', durationWeeks: 4 }
    ]);
    return {
      id: cycleId,
      studentId: '',
      name: 'Ciclo de Treinamento',
      startDate: today,
      totalWeeks: 12,
      status: 'planned',
      blocks: defaultBlocks,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  const cycleId = raw.id || generateId('cycle');
  const studentId = raw.studentId || '';
  const name = raw.name || 'Ciclo de Treinamento';
  const objective = raw.objective || '';
  const startDate = raw.startDate || formatToIsoDateOnly(new Date());
  const status = ['planned', 'current', 'completed', 'archived'].includes(raw.status)
    ? raw.status
    : (raw.status === 'active' ? 'current' : 'planned');

  const rawBlocks = Array.isArray(raw.blocks) ? raw.blocks : [];
  const blocks: TrainingBlock[] = rawBlocks.map((b: any, idx: number) => ({
    id: b.id || generateId('tblk'),
    name: b.name || `Bloco ${idx + 1}`,
    objective: b.objective || '',
    order: typeof b.order === 'number' ? b.order : idx + 1,
    durationWeeks: typeof b.durationWeeks === 'number' ? b.durationWeeks : 4,
    routineId: b.routineId || undefined,
    routineTitleSnapshot: b.routineTitleSnapshot || undefined,
    startDate: b.startDate || startDate,
    endDate: b.endDate || startDate,
    notes: b.notes || '',
    routineHistory: Array.isArray(b.routineHistory) ? b.routineHistory : []
  }));

  const totalWeeks = typeof raw.totalWeeks === 'number' 
    ? raw.totalWeeks 
    : blocks.reduce((acc, b) => acc + (b.durationWeeks || 0), 0);

  return {
    id: cycleId,
    studentId,
    name,
    objective,
    startDate,
    totalWeeks: Math.max(1, totalWeeks),
    reviewDate: raw.reviewDate || (blocks[0]?.endDate),
    status,
    blocks,
    notes: raw.notes || '',
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString()
  };
}
