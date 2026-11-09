/**
 * TFIVE PRO — SERVIÇO DE TREINO AO VIVO ONLINE-FIRST (SUPABASE)
 * Responsável pela persistência direta de active_workouts no Supabase.
 *
 * Em conformidade estrita com as regras do Fresh Start:
 * - Grava séries e snapshots diretamente na tabela active_workouts.
 * - Confirmação explícita de gravação ("Série salva").
 * - Detecção de falha de conexão com feedback real ("Não foi possível salvar. Verifique sua conexão.")
 *   e suporte a retry interativo.
 * - Eliminação de persistência silenciosa ou duplicada quando em modo Supabase.
 */

import { ActiveWorkoutState } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { DATA_BACKEND } from '../utils/constants';
import { resolveOrgId, ensureUUID } from '../repositories/supabase/SupabaseRepositories';
import { isUUID, resolveStudentUuid } from '../utils/supabaseHelpers';

export interface LiveWorkoutSaveResult {
  success: boolean;
  message?: string;
  error?: string;
  canRetry?: boolean;
}

/**
 * Salva o estado do treino ativo diretamente no Supabase com validação estrita
 * de chaves estrangeiras e diagnóstico completo de erro.
 */
export async function persistLiveWorkoutStateToSupabase(
  state: ActiveWorkoutState
): Promise<LiveWorkoutSaveResult> {
  // Se o backend configurado não for Supabase, não processa neste canal
  if (DATA_BACKEND !== 'supabase' || !isSupabaseConfigured()) {
    return {
      success: true,
      message: 'Modo local ativo',
    };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      success: false,
      error: 'Não foi possível salvar online. Salvo no dispositivo.',
      canRetry: true,
    };
  }

  try {
    const orgId = resolveOrgId(state.organizationId || (state as any).session?.organizationId);

    // Resolving student UUID using the unified helper
    const stdUuid = await resolveStudentUuid(state.studentId);

    if (!stdUuid) {
      // Se o aluno ainda não foi persistido no Supabase (existe localmente),
      // não tentamos inserir com student_id inválido (evita FK error 23503).
      console.warn(`[LiveWorkout] Aluno '${state.studentId}' não encontrado no Supabase. Treino preservado apenas localmente.`);
      return { success: false, error: 'Aluno não sincronizado. Não foi possível espelhar treino.' };
    }

    // Resolving routine UUID (chave estrangeira nullable)
    let routineUuid: string | null = null;
    if (state.routineId) {
      if (isUUID(state.routineId)) {
        const { data: rData } = await (supabase.from('routines') as any)
          .select('id')
          .eq('id', state.routineId)
          .maybeSingle();
        if (rData) routineUuid = rData.id;
      }
      if (!routineUuid) {
        const { data: rLegData } = await (supabase.from('routines') as any)
          .select('id')
          .eq('legacy_id', state.routineId)
          .maybeSingle();
        if (rLegData) routineUuid = rLegData.id;
      }
    }

    // Resolving workout UUID (chave estrangeira nullable)
    let workoutUuid: string | null = null;
    if (state.workoutId) {
      if (isUUID(state.workoutId)) {
        const { data: wData } = await (supabase.from('routine_workouts') as any)
          .select('id')
          .eq('id', state.workoutId)
          .maybeSingle();
        if (wData) workoutUuid = wData.id;
      }
      if (!workoutUuid) {
        const { data: wLegData } = await (supabase.from('routine_workouts') as any)
          .select('id')
          .eq('legacy_id', state.workoutId)
          .maybeSingle();
        if (wLegData) workoutUuid = wLegData.id;
      }
    }

    const payload = {
      session_id: state.sessionId,
      organization_id: orgId,
      student_id: stdUuid,
      routine_id: routineUuid || null,
      workout_id: workoutUuid || null,
      state_snapshot: state,
      started_at: new Date(state.startedAtTimestamp || Date.now()).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await (supabase.from('active_workouts') as any)
      .upsert(payload, { onConflict: 'session_id' });

    // Espelha a sessão ativa em andamento na tabela sessions (status 'in_progress')
    try {
      let { uuid: sessUuid, legacyId: sessLegacyId } = ensureUUID(state.sessionId);
      if (sessLegacyId) {
        const { data: existing } = await (supabase.from('sessions') as any).select('id').eq('legacy_id', sessLegacyId).maybeSingle();
        if (existing?.id) {
          sessUuid = existing.id;
        }
      }
      await (supabase.from('sessions') as any).upsert({
        id: sessUuid,
        legacy_id: sessLegacyId || null,
        organization_id: orgId,
        student_id: stdUuid,
        routine_id: routineUuid || null,
        workout_id: workoutUuid || null,
        cycle_id: state.cycleId ? ensureUUID(state.cycleId).uuid : null,
        block_id: state.blockId ? ensureUUID(state.blockId).uuid : null,
        student_name_snapshot: state.studentName || 'Aluno',
        routine_title_snapshot: state.routineTitle || 'Treino',
        workout_letter_snapshot: state.workoutLetter || null,
        workout_name_snapshot: state.workoutName || null,
        cycle_name_snapshot: state.cycleNameSnapshot || null,
        block_name_snapshot: state.blockNameSnapshot || null,
        start_time: new Date(state.startedAtTimestamp || Date.now()).toISOString(),
        end_time: null,
        duration_seconds: state.elapsedSeconds || 0,
        status: 'in_progress',
        total_volume: state.session?.totalVolume || 0,
        total_sets: state.session?.sets?.length || 0,
        notes: state.session?.notes || null,
        coach_notes: state.session?.coachNotes || null,
        routine_snapshot: state.routineSnapshot || null,
        workout_snapshot: state.workoutSnapshot || null,
      }, { onConflict: 'id' });
    } catch (sessErr) {
      console.warn('[LiveWorkout] Aviso ao espelhar status in_progress em sessions:', sessErr);
    }

    if (error) {
      console.error('[LiveWorkout Supabase Error]:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      // Se o erro for de RLS (42501), Foreign Key (23503), Duplicata (23505) ou tabela remota ausente (42P01),
      // não exibimos alerta destrutivo na tela porque o treino já está 100% persistido e íntegro em IndexedDB
      if (
        error.code === '42501' ||
        error.code === 'PGRST116' ||
        error.code === 'PGRST204' ||
        error.code === '23503' ||
        error.code === '23505' ||
        error.code === '42P01'
      ) {
        console.warn(`[LiveWorkout] Supabase (${error.code}) active_workouts sync falhou: ${error.message}. Estado preservado localmente.`);
        return {
          success: false,
          error: 'Falha de permissão ou infraestrutura no servidor. Treino preservado localmente.',
          canRetry: true
        };
      }

      return {
        success: false,
        error: 'Não foi possível sincronizar online. Salvo no dispositivo.',
        canRetry: true,
      };
    }

    return {
      success: true,
      message: 'Série salva',
    };
  } catch (err: any) {
    console.error('[LiveWorkout Network Error]:', {
      message: err?.message,
      name: err?.name,
      stack: err?.stack,
    });
    return {
      success: false,
      error: 'Não foi possível sincronizar online. Salvo no dispositivo.',
      canRetry: true,
    };
  }
}

/**
 * Remove o estado do treino ativo do Supabase quando a sessão for finalizada ou descartada.
 */
export async function removeLiveWorkoutStateFromSupabase(
  sessionId: string,
  markCancelled = false
): Promise<boolean> {
  if (DATA_BACKEND !== 'supabase' || !isSupabaseConfigured()) {
    return true;
  }

  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await (supabase.from('active_workouts') as any)
      .delete()
      .eq('session_id', sessionId);

    if (markCancelled) {
      try {
        const { uuid: sessUuid } = ensureUUID(sessionId);
        await (supabase.from('sessions') as any)
          .update({ status: 'cancelled' })
          .eq('id', sessUuid);
      } catch (cancelErr) {
        console.warn('[LiveWorkout] Aviso ao atualizar sessão descartada para cancelled:', cancelErr);
      }
    }

    if (error) {
      console.warn('[LiveWorkout Remove Error]:', error);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[LiveWorkout Remove Network Error]:', err);
    return false;
  }
}

/**
 * Recupera os treinos em andamento diretamente do Supabase com validação estrita.
 * - Checa existência e status ativo do aluno em public.students.
 * - Checa se a sessão já foi finalizada em public.sessions (status completed/cancelled ou end_time).
 * - Checa started_at válido.
 * - Retorna no máximo 2 sessões ativas e com alunos distintos.
 */
/**
 * Versão estrita: retorna `null` quando NÃO foi possível consultar o Supabase
 * (rede caiu, tablet acabou de acordar, erro de query). `[]` significa que a consulta
 * funcionou e realmente não há treino ativo. Quem chama NUNCA deve apagar treino local
 * quando receber `null`.
 */
export async function fetchLiveWorkoutsFromSupabaseStrict(): Promise<ActiveWorkoutState[] | null> {
  if (DATA_BACKEND !== 'supabase' || !isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const orgId = resolveOrgId();
    let query = (supabase.from('active_workouts') as any)
      .select('session_id, student_id, organization_id, routine_id, workout_id, state_snapshot, started_at, updated_at')
      .order('started_at', { ascending: true })
      .limit(5);

    if (orgId) {
      query = query.eq('organization_id', orgId);
    }

    const { data: activeRows, error } = await query;

    if (error) {
      console.warn('[LiveWorkout Fetch Error]:', error);
      return null;
    }
    if (!activeRows || activeRows.length === 0) {
      return [];
    }

    const validWorkouts: ActiveWorkoutState[] = [];
    const seenStudentIds = new Set<string>();

    for (const row of activeRows) {
      const sessionId = row.session_id;
      const studentId = row.student_id;
      if (!sessionId || !studentId) continue;

      // 1. Valida se o aluno existe em public.students e se está com status 'active'
      try {
        let stdQuery = (supabase.from('students') as any)
          .select('id, name, photo_url, status, organization_id');

        if (isUUID(studentId)) {
          stdQuery = stdQuery.eq('id', studentId);
        } else {
          stdQuery = stdQuery.eq('legacy_id', studentId);
        }

        if (orgId) {
          stdQuery = stdQuery.eq('organization_id', orgId);
        }

        const { data: studentData, error: stdErr } = await stdQuery.maybeSingle();
        if (stdErr) {
          console.warn('[LiveWorkout] Falha ao validar aluno (provável rede). Abortando poda.', stdErr);
          return null;
        }
        if (!studentData || studentData.status !== 'active') {
          console.warn(`[LiveWorkout] Sessão '${sessionId}' rejeitada: aluno '${studentId}' inexistente ou inativo no Supabase.`);
          continue;
        }

        // 2. Valida se a sessão já consta como finalizada na tabela sessions
        const { uuid: sessUuid, legacyId: sessLegacyId } = ensureUUID(sessionId);
        let sessQuery = (supabase.from('sessions') as any)
          .select('id, status, end_time, duration_seconds');

        if (sessLegacyId) {
          sessQuery = sessQuery.or(`id.eq.${sessUuid},legacy_id.eq.${sessLegacyId}`);
        } else {
          sessQuery = sessQuery.eq('id', sessUuid);
        }

        const { data: sessData, error: sessErr } = await sessQuery.maybeSingle();
        if (!sessErr && sessData) {
          if (sessData.status === 'completed' || sessData.status === 'cancelled' || Boolean(sessData.end_time)) {
            console.warn(`[LiveWorkout] Sessão '${sessionId}' rejeitada: já finalizada em sessions (${sessData.status}).`);
            continue;
          }
        }

        // 3. Extrai o snapshot
        const rawSnapshot = (row.state_snapshot || {}) as ActiveWorkoutState;
        if (!rawSnapshot || typeof rawSnapshot !== 'object') continue;

        // Sobrescreve com IDs autoritativos
        rawSnapshot.sessionId = sessionId;
        rawSnapshot.studentId = studentData.id;
        rawSnapshot.studentName = studentData.name || rawSnapshot.studentName || 'Aluno';
        if (studentData.photo_url) {
          rawSnapshot.studentPhoto = studentData.photo_url;
        }

        // Valida started_at
        const startedAt = row.started_at ? new Date(row.started_at).getTime() : rawSnapshot.startedAtTimestamp;
        if (!startedAt || isNaN(startedAt) || startedAt <= 0) {
          console.warn(`[LiveWorkout] Sessão '${sessionId}' rejeitada: started_at inválido.`);
          continue;
        }
        rawSnapshot.startedAtTimestamp = startedAt;

        // Se o snapshot tiver session, valida status
        if (rawSnapshot.session) {
          if (rawSnapshot.session.status === 'completed' || rawSnapshot.session.status === 'cancelled' || Boolean(rawSnapshot.session.endTime)) {
            console.warn(`[LiveWorkout] Sessão '${sessionId}' rejeitada: snapshot session já finalizado.`);
            continue;
          }
          rawSnapshot.session.id = sessionId;
          rawSnapshot.session.studentId = studentData.id;
          rawSnapshot.session.status = 'in_progress';
          rawSnapshot.session.endTime = undefined;
        }

        // Evita aluno duplicado em modo duplo
        if (seenStudentIds.has(studentData.id)) {
          continue;
        }

        seenStudentIds.add(studentData.id);
        validWorkouts.push(rawSnapshot);

        if (validWorkouts.length >= 2) break;
      } catch (validationErr) {
        console.warn(`[LiveWorkout] Erro validando sessão '${sessionId}':`, validationErr);
        return null;
      }
    }

    return validWorkouts;
  } catch (err) {
    console.warn('[LiveWorkout Fetch Network Error]:', err);
    return null;
  }
}

/** Compatível com chamadas antigas: falha vira lista vazia. */
export async function fetchLiveWorkoutsFromSupabase(): Promise<ActiveWorkoutState[]> {
  return (await fetchLiveWorkoutsFromSupabaseStrict()) ?? [];
}
