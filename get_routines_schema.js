import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const res = await supabase.rpc('execute_sql', { sql_statement: "SELECT constraint_name, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'routines'::regclass;" });
    console.log(res);
}
run();
