/**
 * TFIVE PRO — SERVIÇO DE AUTORIDADE E VALIDAÇÃO DE TREINOS AO VIVO
 * 
 * Regras Mandatórias:
 * 1. Supabase é a SOURCE OF TRUTH quando DATA_BACKEND === 'supabase'.
 * 2. Nenhuma sessão é restaurada apenas por existir no IndexedDB, localStorage, cache ou memória.
 * 3. Validação estrita do aluno: o student_id DEVE existir na lista de alunos ativos da organização.
 * 4. Validação estrita de finalização: se sessions indicar 'completed', 'cancelled' ou endTime !== null, NUNCA restaurar.
 * 5. Timer derivado do started_at real — sem dependência de setIntervals em background.
 * 6. Modo Duplo limitado estritamente a 2 alunos reais e distintos.
 */

import { ActiveWorkoutState, Student, WorkoutSession } from '../types';
import { validateAndSanitizeActiveWorkout } from '../db/indexedDB';

export interface ResolveLiveWorkoutsParams {
  dataBackend: string;
  remoteWorkouts: ActiveWorkoutState[];
  localWorkouts: ActiveWorkoutState[];
  students: Student[];
  sessions: WorkoutSession[];
  onPruneOrphanedLocalSession?: (sessionId: string) => void;
}

export interface StudentValidationResult {
  valid: boolean;
  student?: Student;
  reason?: string;
}

/**
 * Valida se o aluno da sessão é real, ativo e pertence à organização atual.
 */
export function validateLiveWorkoutStudent(
  workout: ActiveWorkoutState,
  students: Student[]
): StudentValidationResult {
  if (!workout || !workout.studentId || typeof workout.studentId !== 'string' || !workout.studentId.trim()) {
    return { valid: false, reason: 'studentId ausente ou inválido' };
  }

  const student = students.find(
    s => s.id === workout.studentId || (s as any).legacy_id === workout.studentId
  );

  if (!student) {
    return { valid: false, reason: `Aluno '${workout.studentId}' não encontrado na lista de alunos da organização` };
  }

  if (student.status !== 'active') {
    return { valid: false, reason: `Aluno '${student.name}' está inativo/arquivado (status: ${student.status})` };
  }

  return { valid: true, student };
}

/**
 * Verifica se uma sessão já foi concluída, descartada ou finalizada em qualquer registro.
 */
export function isSessionFinalized(
  sessionId: string,
  sessions: WorkoutSession[],
  workoutSession?: WorkoutSession | null
): boolean {
  if (!sessionId) return true;

  // 1. Checa na lista histórica de sessões (Supabase ou local)
  const existingInHistory = sessions.find(
    s => s.id === sessionId || (s as any).legacy_id === sessionId
  );

  if (existingInHistory) {
    if (
      existingInHistory.status === 'completed' ||
      existingInHistory.status === 'cancelled' ||
      Boolean(existingInHistory.endTime)
    ) {
      return true;
    }
  }

  // 2. Checa no snapshot da própria sessão ativa
  if (workoutSession) {
    if (
      workoutSession.status === 'completed' ||
      workoutSession.status === 'cancelled' ||
      Boolean(workoutSession.endTime)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Resolve e valida autoritativamente os treinos ao vivo a serem exibidos na aplicação.
 * Garante que:
 * - Em modo Supabase, NUNCA se adiciona sessão que só exista em IndexedDB.
 * - Sessões locais órfãs ou finalizadas são podadas.
 * - Modo duplo só exibe alunos reais e distintos.
 */
export function resolveAuthoritativeActiveWorkouts(
  params: ResolveLiveWorkoutsParams
): ActiveWorkoutState[] {
  const {
    dataBackend,
    remoteWorkouts = [],
    localWorkouts = [],
    students = [],
    sessions = [],
    onPruneOrphanedLocalSession,
  } = params;

  const now = Date.now();
  const isSupabase = dataBackend === 'supabase';

  let rawCandidates: ActiveWorkoutState[] = [];

  if (isSupabase) {
    // =========================================================================
    // REGRA SUPABASE: Supabase é a autoridade absoluta.
    // O array base provém EXCLUSIVAMENTE dos treinos ativos retornados pelo Supabase.
    // =========================================================================
    rawCandidates = [...remoteWorkouts];

    // Identifica e poda qualquer sessão do IndexedDB que não exista no Supabase
    if (localWorkouts && localWorkouts.length > 0) {
      const remoteSessionIds = new Set(remoteWorkouts.map(w => w.sessionId));
      localWorkouts.forEach(localW => {
        if (!remoteSessionIds.has(localW.sessionId)) {
          console.info(`[Authority] Sessão local '${localW.sessionId}' não existe como ativa no Supabase. Poda acionada.`);
          if (onPruneOrphanedLocalSession) {
            onPruneOrphanedLocalSession(localW.sessionId);
          }
        }
      });
    }

    // Permite que o estado local APENAS complemente séries mais recentes da MESMA session.id
    rawCandidates = rawCandidates.map(remoteW => {
      const matchingLocal = localWorkouts.find(l => l.sessionId === remoteW.sessionId);
      if (!matchingLocal) return remoteW;

      // Se a cópia local da MESMA session.id tiver mais séries registradas, mescla os sets
      const localSetsCount = matchingLocal.session?.sets?.length || 0;
      const remoteSetsCount = remoteW.session?.sets?.length || 0;

      if (localSetsCount > remoteSetsCount) {
        return {
          ...remoteW,
          session: {
            ...remoteW.session,
            sets: matchingLocal.session.sets,
            totalVolume: matchingLocal.session.totalVolume,
            totalSets: matchingLocal.session.totalSets,
            prsAchieved: matchingLocal.session.prsAchieved || remoteW.session?.prsAchieved || [],
          },
          currentExerciseIndex: matchingLocal.currentExerciseIndex ?? remoteW.currentExerciseIndex,
          currentSetIndex: matchingLocal.currentSetIndex ?? remoteW.currentSetIndex,
          skippedExercises: matchingLocal.skippedExercises || remoteW.skippedExercises,
        };
      }

      return remoteW;
    });
  } else {
    // =========================================================================
    // MODO LOCAL / OFFLINE (IndexedDB):
    // Os candidatos vêm do IndexedDB, mas submetidos às mesmas validações estritas.
    // =========================================================================
    rawCandidates = [...localWorkouts];
  }

  // ===========================================================================
  // VALIDAÇÃO E SANITIZAÇÃO INDIVIDUAL DE CADA SESSÃO CANDIDATA
  // ===========================================================================
  const validatedList: ActiveWorkoutState[] = [];
  const seenSessionIds = new Set<string>();
  const seenStudentIds = new Set<string>();

  for (const candidate of rawCandidates) {
    if (!candidate || !candidate.sessionId || typeof candidate.sessionId !== 'string') {
      continue;
    }

    // 1. Deduplicação por session_id
    if (seenSessionIds.has(candidate.sessionId)) {
      continue;
    }

    // 2. Validação estrita do aluno contra public.students
    const studentCheck = validateLiveWorkoutStudent(candidate, students);
    if (!studentCheck.valid || !studentCheck.student) {
      console.warn(`[Authority] Sessão '${candidate.sessionId}' descartada: ${studentCheck.reason}`);
      if (onPruneOrphanedLocalSession) {
        onPruneOrphanedLocalSession(candidate.sessionId);
      }
      continue;
    }

    const verifiedStudent = studentCheck.student;

    // 3. Deduplicação por student_id (um aluno nunca pode ter 2 treinos ativos)
    if (seenStudentIds.has(verifiedStudent.id)) {
      console.warn(`[Authority] Aluno '${verifiedStudent.name}' já possui outra sessão ativa na fila.`);
      continue;
    }

    // 4. Validação de finalização (status completed, cancelled ou endTime)
    if (isSessionFinalized(candidate.sessionId, sessions, candidate.session)) {
      console.warn(`[Authority] Sessão '${candidate.sessionId}' já está finalizada ou cancelada.`);
      if (onPruneOrphanedLocalSession) {
        onPruneOrphanedLocalSession(candidate.sessionId);
      }
      continue;
    }

    // 5. Validação e cálculo rigoroso do started_at
    let startedAt = candidate.startedAtTimestamp;
    if (!startedAt || typeof startedAt !== 'number' || isNaN(startedAt) || startedAt <= 0) {
      if (candidate.session?.startTime) {
        const parsed = new Date(candidate.session.startTime).getTime();
        if (!isNaN(parsed) && parsed > 0) {
          startedAt = parsed;
        }
      }
    }

    if (!startedAt || typeof startedAt !== 'number' || isNaN(startedAt) || startedAt <= 0) {
      console.warn(`[Authority] Sessão '${candidate.sessionId}' descartada: started_at inválido.`);
      if (onPruneOrphanedLocalSession) {
        onPruneOrphanedLocalSession(candidate.sessionId);
      }
      continue;
    }

    // 6. Sanitização estrutural do snapshot
    const sanitized = validateAndSanitizeActiveWorkout({
      ...candidate,
      studentId: verifiedStudent.id,
      studentName: verifiedStudent.name,
      studentPhoto: verifiedStudent.photo,
      startedAtTimestamp: startedAt,
    });

    if (!sanitized) {
      console.warn(`[Authority] Sessão '${candidate.sessionId}' falhou na validação estrutural.`);
      if (onPruneOrphanedLocalSession) {
        onPruneOrphanedLocalSession(candidate.sessionId);
      }
      continue;
    }

    // 7. Cálculo do Cronômetro derivado do started_at real
    let calculatedElapsed = sanitized.elapsedSeconds || 0;
    if (sanitized.startedAtTimestamp) {
      if (sanitized.isPaused && sanitized.pausedAtTimestamp) {
        calculatedElapsed = Math.max(
          0,
          Math.floor(
            (sanitized.pausedAtTimestamp - sanitized.startedAtTimestamp - (sanitized.totalPausedMs || 0)) / 1000
          )
        );
      } else if (!sanitized.isPaused) {
        calculatedElapsed = Math.max(
          0,
          Math.floor(
            (now - sanitized.startedAtTimestamp - (sanitized.totalPausedMs || 0)) / 1000
          )
        );
      }
    }
    sanitized.elapsedSeconds = calculatedElapsed;

    // 8. Cálculo do timer de descanso baseado em restTargetTimestamp
    if (sanitized.isRestActive && sanitized.restTargetTimestamp) {
      const remaining = Math.ceil((sanitized.restTargetTimestamp - now) / 1000);
      if (remaining > 0) {
        sanitized.restTimerSeconds = remaining;
        sanitized.isRestActive = true;
      } else {
        sanitized.restTimerSeconds = 0;
        sanitized.isRestActive = false;
      }
    } else {
      sanitized.restTimerSeconds = 0;
      sanitized.isRestActive = false;
    }

    // 9. Garante que a sessão em andamento está marcada como 'in_progress'
    if (sanitized.session) {
      sanitized.session.status = 'in_progress';
      sanitized.session.endTime = undefined;
      sanitized.session.durationSeconds = calculatedElapsed;
    }

    seenSessionIds.add(sanitized.sessionId);
    seenStudentIds.add(verifiedStudent.id);
    validatedList.push(sanitized);

    // Limite rígido de 2 alunos (Modo Duplo)
    if (validatedList.length >= 2) {
      break;
    }
  }

  return validatedList;
}
