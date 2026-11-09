import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
    .from('routines')
    .select('*, routine_workouts(*, workout_exercises(*, exercises(id, legacy_id, name, muscle_group)))')
    .limit(1);

  if (error) {
    console.error("ERROR loading routines:", error);
  } else {
    console.log("SUCCESS loading routines. Count:", data.length);
  }
}

test();
