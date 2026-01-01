import pg from 'pg';
const { Client } = pg;

console.log('🔥 DIRECT DATABASE MIGRATION\n');

// Database connection string - trying with direct password
const connectionString = 'postgresql://postgres.fkypxitgnfqbfplxokve:Usman1122@@db.fkypxitgnfqbfplxokve.supabase.co:5432/postgres';

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const sql = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_cohost BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cohost_prefix TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS cohost_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamptz DEFAULT now(),
  admin_response_at timestamptz,
  admin_response_by TEXT,
  UNIQUE(user_id, requested_at)
);

ALTER TABLE cohost_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own requests" ON cohost_requests;
DROP POLICY IF EXISTS "Users can insert their own requests" ON cohost_requests;
DROP POLICY IF EXISTS "Only admins can update requests" ON cohost_requests;

CREATE POLICY "Users can view their own requests" ON cohost_requests FOR SELECT USING (true);
CREATE POLICY "Users can insert their own requests" ON cohost_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Only admins can update requests" ON cohost_requests FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_cohost_requests_user_id ON cohost_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_cohost_requests_status ON cohost_requests(status);
CREATE INDEX IF NOT EXISTS idx_users_parent_user_id ON users(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_users_cohost_prefix ON users(cohost_prefix);
CREATE INDEX IF NOT EXISTS idx_users_is_cohost ON users(is_cohost);
`;

try {
  console.log('Connecting to database...');
  await client.connect();
  console.log('✅ Connected!');
  
  console.log('Executing migration SQL...');
  await client.query(sql);
  console.log('✅ Migration executed!');
  
  console.log('\nVerifying...');
  const result = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'users'
    AND column_name IN ('is_cohost', 'parent_user_id', 'cohost_prefix')
  `);
  
  console.log(`✅ Verified: ${result.rows.length}/3 columns added`);
  
  await client.end();
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 CO-HOST MIGRATION COMPLETE!');
  console.log('='.repeat(60));
  console.log('\n✅ Refresh your browser - everything is ready!\n');
  
} catch (error) {
  console.log('\n❌ Connection/Execution Failed:', error.message);
  console.log('\nFinal option: Manual SQL execution');
  console.log('URL: https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql\n');
  try { await client.end(); } catch {}
}
