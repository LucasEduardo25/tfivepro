/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TFIVE PRO — DATA HEALTH CHECK & INTEGRITY DIAGNOSTIC UTILITY
 * Utilitário de auditoria READ-ONLY para validação de consistência relacional
 * dos dados operacionais antes da migração para o PostgreSQL.
 */

import { getAllFromStore } from '../db/indexedDB';
import { 
  Student, 
  WorkoutSession, 
  WorkoutRoutine, 
  PhysicalAssessment, 
  ScheduleAppointment, 
  ScheduleRecurrence, 
  Exercise,
  TrainingMemory
} from '../types';
import { TrainingCycle } from '../types/trainingCycle';
import { Proposal } from '../types/proposal';
import { ActivePlan } from '../types/activePlan';

export interface IntegrityIssue {
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  category: string;
  store: string;
  itemId: string;
  description: string;
  details?: Record<string, unknown>;
}

export interface StoreCounts {
  students: number;
  exercises: number;
  routines: number;
  sessions: number;
  assessments: number;
  scheduleAppointments: number;
  scheduleRecurrences: number;
  trainingCycles: number;
  trainingMemories: number;
  proposals: number;
  activePlans: number;
}

export interface DataHealthReport {
  timestamp: string;
  totalRecordsChecked: number;
  counts: StoreCounts;
  integrityScore: number; // 0 a 100%
  issuesFound: number;
  criticalIssues: number;
  warnings: number;
  issues: IntegrityIssue[];
  summary: {
    orphanedSessions: number;
    orphanedWorkouts: number;
    invalidExerciseRefs: number;
    duplicateIds: number;
    invalidDates: number;
    orphanedSchedules: number;
    orphanedCycles: number;
  };
}

export class DataHealthCheckService {
  /**
   * Executa a auditoria completa de integridade relacional em modo estritamente READ-ONLY.
   */
  async runAudit(): Promise<DataHealthReport> {
    const issues: IntegrityIssue[] = [];

    // Carrega dados de todos os stores
    const [
      students,
      exercises,
      routines,
      sessions,
      assessments,
      appointments,
      recurrences,
      cycles,
      memories,
      proposals,
      activePlans
    ] = await Promise.all([
      getAllFromStore<Student>('students'),
      getAllFromStore<Exercise>('exercises'),
      getAllFromStore<WorkoutRoutine>('routines'),
      getAllFromStore<WorkoutSession>('sessions'),
      getAllFromStore<PhysicalAssessment>('assessments'),
      getAllFromStore<ScheduleAppointment>('schedule'),
      getAllFromStore<ScheduleRecurrence>('schedule_recurrences'),
      getAllFromStore<TrainingCycle>('training_cycles'),
      getAllFromStore<TrainingMemory>('training_memories'),
      getAllFromStore<Proposal>('proposals'),
      getAllFromStore<ActivePlan>('active_plans')
    ]);

    const studentIds = new Set(students.map((s) => s.id));
    const exerciseIds = new Set(exercises.map((e) => e.id));
    const routineIds = new Set(routines.map((r) => r.id));

    // Mapas para detecção de IDs duplicados
    const checkDuplicates = (storeName: string, items: Array<{ id: string }>) => {
      const seen = new Set<string>();
      for (const item of items) {
        if (!item.id) {
          issues.push({
            severity: 'CRITICAL',
            category: 'MISSING_ID',
            store: storeName,
            itemId: 'unknown',
            description: `Registro encontrado sem chave primária 'id' no store ${storeName}.`
          });
        } else if (seen.has(item.id)) {
          issues.push({
            severity: 'CRITICAL',
            category: 'DUPLICATE_ID',
            store: storeName,
            itemId: item.id,
            description: `ID duplicado detectado no store ${storeName}: "${item.id}".`
          });
        } else {
          seen.add(item.id);
        }
      }
    };

    checkDuplicates('students', students);
    checkDuplicates('exercises', exercises);
    checkDuplicates('routines', routines);
    checkDuplicates('sessions', sessions);
    checkDuplicates('assessments', assessments);
    checkDuplicates('schedule', appointments);
    checkDuplicates('schedule_recurrences', recurrences);
    checkDuplicates('training_cycles', cycles);
    checkDuplicates('training_memories', memories);
    checkDuplicates('proposals', proposals);
    checkDuplicates('active_plans', activePlans);

    let orphanedSessionsCount = 0;
    let invalidExerciseRefsCount = 0;
    let invalidDatesCount = 0;
    let orphanedSchedulesCount = 0;
    let orphanedCyclesCount = 0;
    let orphanedWorkoutsCount = 0;

    // 1. Auditoria de Sessões (Sessions)
    for (const session of sessions) {
      if (!session.studentId || !studentIds.has(session.studentId)) {
        orphanedSessionsCount++;
        issues.push({
          severity: 'CRITICAL',
          category: 'ORPHANED_SESSION',
          store: 'sessions',
          itemId: session.id,
          description: `Sessão de treino vinculada a studentId inexistente: "${session.studentId}".`,
          details: { studentNameSnapshot: session.studentName }
        });
      }

      if (session.routineId && !routineIds.has(session.routineId)) {
        issues.push({
          severity: 'WARNING',
          category: 'ORPHANED_ROUTINE_REF',
          store: 'sessions',
          itemId: session.id,
          description: `Sessão referencia rotina que foi arquivada ou removida: "${session.routineId}". Preservado snapshot histórico.`
        });
      }

      // Validação de datas
      if (!session.startTime || isNaN(Date.parse(session.startTime))) {
        invalidDatesCount++;
        issues.push({
          severity: 'WARNING',
          category: 'INVALID_TIMESTAMP',
          store: 'sessions',
          itemId: session.id,
          description: `Sessão com campo startTime inválido: "${session.startTime}".`
        });
      }

      // Validação dos sets da sessão
      if (Array.isArray(session.sets)) {
        for (const set of session.sets) {
          if (set.exerciseId && !exerciseIds.has(set.exerciseId)) {
            invalidExerciseRefsCount++;
            issues.push({
              severity: 'WARNING',
              category: 'UNKNOWN_EXERCISE_ID',
              store: 'sessions',
              itemId: session.id,
              description: `Série do exercício "${set.exerciseName}" referencia exerciseId não cadastrado: "${set.exerciseId}".`
            });
          }
        }
      }
    }

    // 2. Auditoria de Rotinas (Routines)
    for (const routine of routines) {
      if (!routine.studentId || !studentIds.has(routine.studentId)) {
        issues.push({
          severity: 'CRITICAL',
          category: 'ORPHANED_ROUTINE',
          store: 'routines',
          itemId: routine.id,
          description: `Rotina de treino vinculada a studentId inexistente: "${routine.studentId}".`
        });
      }

      if (Array.isArray(routine.workouts)) {
        for (const w of routine.workouts) {
          if (!w.letter || !w.name) {
            orphanedWorkoutsCount++;
            issues.push({
              severity: 'WARNING',
              category: 'MALFORMED_WORKOUT',
              store: 'routines',
              itemId: routine.id,
              description: `Workout da rotina sem letra ou nome preenchido.`
            });
          }
          if (Array.isArray(w.exercises)) {
            for (const ex of w.exercises) {
              if (ex.exerciseId && !exerciseIds.has(ex.exerciseId)) {
                invalidExerciseRefsCount++;
                issues.push({
                  severity: 'INFO',
                  category: 'EXERCISE_REF_NOT_IN_GLOBAL_STORE',
                  store: 'routines',
                  itemId: routine.id,
                  description: `Exercício prescrito "${ex.exerciseName}" com exerciseId "${ex.exerciseId}" pode ser customizado local.`
                });
              }
            }
          }
        }
      }
    }

    // 3. Auditoria de Avaliações Físicas (Assessments)
    for (const assessment of assessments) {
      if (!assessment.studentId || !studentIds.has(assessment.studentId)) {
        issues.push({
          severity: 'CRITICAL',
          category: 'ORPHANED_ASSESSMENT',
          store: 'assessments',
          itemId: assessment.id,
          description: `Avaliação física vinculada a studentId inexistente: "${assessment.studentId}".`
        });
      }
      if (!assessment.date || isNaN(Date.parse(assessment.date))) {
        invalidDatesCount++;
        issues.push({
          severity: 'WARNING',
          category: 'INVALID_DATE',
          store: 'assessments',
          itemId: assessment.id,
          description: `Avaliação física com data inválida: "${assessment.date}".`
        });
      }
    }

    // 4. Auditoria de Agenda (Schedule Appointments & Recurrences)
    for (const apt of appointments) {
      if (!apt.studentId || !studentIds.has(apt.studentId)) {
        orphanedSchedulesCount++;
        issues.push({
          severity: 'WARNING',
          category: 'ORPHANED_APPOINTMENT',
          store: 'schedule',
          itemId: apt.id,
          description: `Agendamento na agenda vinculado a studentId inexistente: "${apt.studentId}".`
        });
      }
    }

    for (const rec of recurrences) {
      if (!rec.studentId || !studentIds.has(rec.studentId)) {
        orphanedSchedulesCount++;
        issues.push({
          severity: 'WARNING',
          category: 'ORPHANED_RECURRENCE',
          store: 'schedule_recurrences',
          itemId: rec.id,
          description: `Regra de recorrência vinculada a studentId inexistente: "${rec.studentId}".`
        });
      }
    }

    // 5. Auditoria de Ciclos de Treinamento (Training Cycles)
    for (const cycle of cycles) {
      if (!cycle.studentId || !studentIds.has(cycle.studentId)) {
        orphanedCyclesCount++;
        issues.push({
          severity: 'CRITICAL',
          category: 'ORPHANED_CYCLE',
          store: 'training_cycles',
          itemId: cycle.id,
          description: `Ciclo de periodização vinculado a studentId inexistente: "${cycle.studentId}".`
        });
      }
    }

    // 6. Auditoria de Training Memories (Central Hoje)
    for (const mem of memories) {
      if (!mem.studentId || !studentIds.has(mem.studentId)) {
        issues.push({
          severity: 'WARNING',
          category: 'ORPHANED_MEMORY',
          store: 'training_memories',
          itemId: mem.id,
          description: `Lembrete técnico vinculado a studentId inexistente: "${mem.studentId}".`
        });
      }
    }

    const counts: StoreCounts = {
      students: students.length,
      exercises: exercises.length,
      routines: routines.length,
      sessions: sessions.length,
      assessments: assessments.length,
      scheduleAppointments: appointments.length,
      scheduleRecurrences: recurrences.length,
      trainingCycles: cycles.length,
      trainingMemories: memories.length,
      proposals: proposals.length,
      activePlans: activePlans.length,
    };

    const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);
    const criticalCount = issues.filter((i) => i.severity === 'CRITICAL').length;
    const warningCount = issues.filter((i) => i.severity === 'WARNING').length;

    // Cálculo do score de integridade (100% menos penalidades proporcionais)
    let score = 100;
    if (totalRecords > 0) {
      const penalty = ((criticalCount * 3) + (warningCount * 0.5)) / totalRecords * 100;
      score = Math.max(0, Math.min(100, Math.round(100 - penalty)));
    }

    return {
      timestamp: new Date().toISOString(),
      totalRecordsChecked: totalRecords,
      counts,
      integrityScore: score,
      issuesFound: issues.length,
      criticalIssues: criticalCount,
      warnings: warningCount,
      issues,
      summary: {
        orphanedSessions: orphanedSessionsCount,
        orphanedWorkouts: orphanedWorkoutsCount,
        invalidExerciseRefs: invalidExerciseRefsCount,
        duplicateIds: issues.filter((i) => i.category === 'DUPLICATE_ID').length,
        invalidDates: invalidDatesCount,
        orphanedSchedules: orphanedSchedulesCount,
        orphanedCycles: orphanedCyclesCount,
      }
    };
  }
}

export const dataHealthCheckService = new DataHealthCheckService();
