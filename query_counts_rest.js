const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

async function fetchCount(filters = "") {
  const req = await fetch(`${url}/rest/v1/exercises?select=id${filters}`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  const data = await req.json();
  return data.length;
}

async function run() {
  const total = await fetchCount();
  const archived = await fetchCount('&is_archived=eq.true');
  const custom = await fetchCount('&is_custom=eq.true&is_archived=eq.false');
  console.log('TOTAL:', total);
  console.log('ARCHIVED:', archived);
  console.log('CUSTOM_ACTIVE:', custom);
}
run();
