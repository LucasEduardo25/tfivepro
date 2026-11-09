import fs from 'fs';
const file = 'src/repositories/supabase/SupabaseRepositories.ts';
let code = fs.readFileSync(file, 'utf8');

const oldCreateStr = `  async create(session: WorkoutSession): Promise<WorkoutSession> {
    const { uuid, legacyId } = ensureUUID(session.id);

    let stdUuid = session.studentId;
    if (!isUUID(stdUuid)) {
      const { data } = await fromTable('students').select('id').eq('legacy_id', session.studentId).maybeSingle();
      if (data) stdUuid = data.id;
      else stdUuid = session.studentId; // FIX: Keep original ID, do not invent UUID
    }

    const orgId = resolveOrgId((session as any).organizationId);

    const { data: createdSession, error } = await fromTable('sessions')
      .insert({
        id: uuid,
        legacy_id: legacyId || null,
        organization_id: orgId,
        student_id: stdUuid,
        routine_id: isUUID(session.routineId) ? session.routineId : null,
        workout_id: isUUID(session.workoutId) ? session.workoutId : null,
        student_name_snapshot: session.studentName || 'Aluno',
        routine_title_snapshot: session.routineTitle || 'Treino',
        workout_letter_snapshot: session.workoutLetter || null,
        workout_name_snapshot: session.workoutName || null,
        start_time: session.startTime,
        end_time: session.endTime || null,
        duration_seconds: session.durationSeconds || 0,
        status: session.status || 'completed',
        total_volume: session.totalVolume || 0,
        total_sets: session.totalSets || 0,
        notes: session.notes || null,
        coach_notes: session.coachNotes || null,
        student_rating: session.studentRating || null,
      })
      .select()
      .single();

    if (error) throw error;`;

const newCreateStr = `  async create(session: WorkoutSession): Promise<WorkoutSession> {
    const { uuid, legacyId } = ensureUUID(session.id);

    // Resolve Student
    let stdUuid = session.studentId;
    if (!isUUID(stdUuid)) {
      const { data } = await fromTable('students').select('id').eq('legacy_id', session.studentId).maybeSingle();
      if (data) stdUuid = data.id;
      // If not found, we pass it down. If it's invalid UUID, Supabase will throw, but we have no other choice.
    }

    // Resolve Routine
    let routineUuid = session.routineId;
    if (routineUuid && !isUUID(routineUuid)) {
      const { data } = await fromTable('routines').select('id').eq('legacy_id', routineUuid).maybeSingle();
      if (data) routineUuid = data.id;
      else routineUuid = null;
    }

    // Resolve Workout
    let workoutUuid = session.workoutId;
    if (workoutUuid && !isUUID(workoutUuid)) {
      const { data } = await fromTable('routine_workouts').select('id').eq('legacy_id', workoutUuid).maybeSingle();
      if (data) workoutUuid = data.id;
      else workoutUuid = null;
    }

    // Resolve Cycle and Block if any
    let cycleUuid = session.cycleId;
    if (cycleUuid && !isUUID(cycleUuid)) {
      const { data } = await fromTable('training_cycles').select('id').eq('legacy_id', cycleUuid).maybeSingle();
      if (data) cycleUuid = data.id;
      else cycleUuid = null;
    }

    let blockUuid = session.blockId;
    if (blockUuid && !isUUID(blockUuid)) {
      const { data } = await fromTable('training_blocks').select('id').eq('legacy_id', blockUuid).maybeSingle();
      if (data) blockUuid = data.id;
      else blockUuid = null;
    }

    const orgId = resolveOrgId((session as any).organizationId);

    const { data: createdSession, error } = await fromTable('sessions')
      .insert({
        id: uuid,
        legacy_id: legacyId || null,
        organization_id: orgId,
        student_id: stdUuid,
        routine_id: routineUuid || null,
        workout_id: workoutUuid || null,
        cycle_id: cycleUuid || null,
        block_id: blockUuid || null,
        student_name_snapshot: session.studentName || 'Aluno',
        routine_title_snapshot: session.routineTitle || 'Treino',
        workout_letter_snapshot: session.workoutLetter || null,
        workout_name_snapshot: session.workoutName || null,
        start_time: session.startTime,
        end_time: session.endTime || null,
        duration_seconds: session.durationSeconds || 0,
        status: session.status || 'completed',
        total_volume: session.totalVolume || 0,
        total_sets: session.totalSets || 0,
        notes: session.notes || null,
        coach_notes: session.coachNotes || null,
        student_rating: session.studentRating || null,
      })
      .select()
      .single();

    if (error) {
      console.error("SupabaseSessionRepository.create error inserting session:", error);
      throw error;
    }`;

code = code.replace(oldCreateStr, newCreateStr);
fs.writeFileSync(file, code);
console.log('Fixed create session part 1');
