import fs from 'fs';
const file = 'src/services/liveWorkoutSupabaseService.ts';
let code = fs.readFileSync(file, 'utf8');

const replacement = `
export const isUUID = (str?: string | null): boolean => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

export async function persistLiveWorkoutStateToSupabase(
  state: ActiveWorkoutState
): Promise<LiveWorkoutSaveResult> {
  // Se o backend configurado não for Supabase, não processa neste canal
  if (DATA_BACKEND !== 'supabase' || !isSupabaseConfigured()) {
    return {
      success: true,
      message: 'Modo local/firebase ativo',
    };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      success: false,
      error: 'Não foi possível salvar. Verifique sua conexão.',
      canRetry: true,
    };
  }

  try {
    const orgId = CANONICAL_ORGANIZATION_ID;

    // Resolving IDs to UUIDs
    let stdUuid = state.studentId;
    if (!isUUID(stdUuid)) {
      const { data } = await supabase.from('students').select('id').eq('legacy_id', state.studentId).maybeSingle();
      if (data) stdUuid = data.id;
    }

    let routineUuid = state.routineId;
    if (routineUuid && !isUUID(routineUuid)) {
      const { data } = await supabase.from('routines').select('id').eq('legacy_id', routineUuid).maybeSingle();
      if (data) routineUuid = data.id;
      else routineUuid = null;
    }

    let workoutUuid = state.workoutId;
    if (workoutUuid && !isUUID(workoutUuid)) {
      const { data } = await supabase.from('routine_workouts').select('id').eq('legacy_id', workoutUuid).maybeSingle();
      if (data) workoutUuid = data.id;
      else workoutUuid = null;
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

    if (error) {
      console.error('[LiveWorkout Supabase Error]:', error);
      return {
        success: false,
        error: 'Não foi possível salvar. Verifique sua conexão.',
        canRetry: true,
      };
    }

    return {
      success: true,
      message: 'Série salva',
    };
  } catch (err: any) {
    console.error('[LiveWorkout Network Error]:', err);
    return {
      success: false,
      error: 'Não foi possível salvar. Verifique sua conexão.',
      canRetry: true,
    };
  }
}
`;

code = code.replace(
  /export async function persistLiveWorkoutStateToSupabase\([\s\S]*?\}\n\}\n/g,
  replacement.trim() + '\n\n'
);

fs.writeFileSync(file, code);
