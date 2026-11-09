import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // 1. Raw count
    const { count: totalCount, error: countErr } = await supabase.from('exercises').select('*', { count: 'exact', head: true });
    console.log("Raw count:", totalCount);

    // 2. Fetch using repository equivalent
    const { data, error } = await supabase.from('exercises').select('*').limit(5000).order('name');
    console.log("Data length:", data?.length);
    
    if (data?.length > 0) {
        // filter logic simulation
        console.log("First item:", data[0]);
    }
}

run();
