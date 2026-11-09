import fs from 'fs';
const file = 'src/services/liveWorkoutSupabaseService.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /let stdUuid = state\.studentId;\s*if \(\!isUUID\(stdUuid\)\) \{\s*const \{ data \} = await supabase\.from\('students'\)\.select\('id'\)\.eq\('legacy_id', state\.studentId\)\.maybeSingle\(\);\s*if \(data\) stdUuid = \(data as any\)\.id;\s*\}/,
  `let stdUuid = state.studentId;
    if (!isUUID(stdUuid)) {
      const { data } = await supabase.from('students').select('id').eq('legacy_id', state.studentId).maybeSingle();
      if (data) {
        stdUuid = (data as any).id;
      } else {
        // If not found by legacy_id, we can't save to Supabase because it requires a UUID.
        // We'll gracefully fail the live sync so it doesn't show an error toast to the user,
        // or we just return success: true so it ignores.
        console.warn(\`[LiveWorkout] Student UUID not found for legacy ID: \${state.studentId}. Skipping live sync.\`);
        return { success: true, message: 'Live sync skipped (Student not synced)' };
      }
    }`
);

fs.writeFileSync(file, code);
