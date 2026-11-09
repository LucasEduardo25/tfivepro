import { Pool } from 'pg';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
async function run() {
  const client = await pool.connect();
  const total = await client.query('SELECT COUNT(*) FROM exercises');
  const archived = await client.query('SELECT COUNT(*) FROM exercises WHERE is_archived = true');
  const custom = await client.query('SELECT COUNT(*) FROM exercises WHERE is_custom = true AND is_archived = false');
  console.log('TOTAL:', total.rows[0].count);
  console.log('ARCHIVED:', archived.rows[0].count);
  console.log('CUSTOM_ACTIVE:', custom.rows[0].count);
  process.exit(0);
}
run();
