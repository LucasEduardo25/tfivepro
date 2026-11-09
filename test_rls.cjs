const { createClient } = require('@supabase/supabase-js');
console.log(process.env.VITE_SUPABASE_URL ? "Has URL" : "No URL");
