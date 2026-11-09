const fs = require('fs');
let code = fs.readFileSync('src/repositories/supabase/SupabaseRepositories.ts', 'utf8');

// Fix workout_exercises insert in create
code = code.replace(
  /const exercisesPayload = w\.exercises\.map\(\(ex, exIdx\) => \(\{[\s\S]*?id: generateUUID\(\),/g,
  `const exercisesPayload = w.exercises.map((ex, exIdx) => {\n              const { uuid: exUuid, legacyId: exLeg } = ensureUUID(ex.id);\n              return {\n              id: exUuid,\n              legacy_id: exLeg || null,`
);
// Above regex might be tricky, let's use a simpler replace.
