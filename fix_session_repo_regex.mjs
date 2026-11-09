import fs from 'fs';
const file = 'src/repositories/supabase/SupabaseRepositories.ts';
let code = fs.readFileSync(file, 'utf8');

const regexCreate = /async create\(session: WorkoutSession\): Promise<WorkoutSession> \{[\s\S]*?\.single\(\);\s+if \(error\) throw error;/g;

const newCreateStr = `async create(session: WorkoutSession): Promise<WorkoutSession> {
    const { uuid, legacyId } = ensureUUID(session.id);

    // Resolve Student
    let stdUuid = session.studentId;
    if (!isUUID(stdUuid)) {
      const { data } = await fromTable('students').select('id').eq('legacy_id', session.studentId).maybeSingle();
      if (data) stdUuid = data.id;
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

code = code.replace(regexCreate, newCreateStr);

const regexSets = /const setsPayload = session\.sets\.map\(\(st, idx\) => \{[\s\S]*?if \(setsErr\) throw setsErr;/g;

const newSetsStr = `const validSets = session.sets.filter(st => (st as any).resolvedExId);
      if (validSets.length > 0) {
        const setsPayload = validSets.map((st, idx) => {
          const { uuid: stUuid, legacyId: stLeg } = ensureUUID(st.id);
          return {
            id: stUuid,
            legacy_id: stLeg || null,
            session_id: createdSession.id,
            exercise_id: (st as any).resolvedExId,
            set_number: st.setNumber ?? idx + 1,
            target_reps: st.targetReps || null,
            actual_reps: st.actualReps || 0,
            weight_kg: st.weightKg || null,
            rpe: st.rpe || null,
            is_pr: st.isPR || false,
            pr_types: st.prTypes || [],
            is_warmup: st.isWarmup || false,
            is_drop_set: st.isDropSet || false,
          };
        });

        const { error: setsErr } = await fromTable('session_sets').insert(setsPayload);
        if (setsErr) {
          console.error("SupabaseSessionRepository.create error inserting session_sets:", setsErr);
          throw setsErr;
        }
      }`;

code = code.replace(regexSets, newSetsStr);

fs.writeFileSync(file, code);
console.log('Fixed create session with Regex');
