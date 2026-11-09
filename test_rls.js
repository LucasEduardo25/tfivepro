const { createClient } = require('@supabase/supabase-js');
// I don't have the supabase url and key, so I can't test it directly unless they are in process.env
console.log(process.env.VITE_SUPABASE_URL ? "Has URL" : "No URL");
