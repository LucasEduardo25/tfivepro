import fs from 'fs';
const file = 'src/repositories/supabase/SupabaseRepositories.ts';
let code = fs.readFileSync(file, 'utf8');

const oldSetsStr = `      const setsPayload = session.sets.map((st, idx) => {
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
      if (setsErr) throw setsErr;`;

const newSetsStr = `      const validSets = session.sets.filter(st => (st as any).resolvedExId);
      
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

code = code.replace(oldSetsStr, newSetsStr);
fs.writeFileSync(file, code);
console.log('Fixed create session part 2');
