import { readFileSync } from 'fs';

const projectRef = 'fkypxitgnfqbfplxokve';
const functionName = 'apply-cohost-migration';

console.log('🚀 Deploying migration edge function...\n');

const functionCode = readFileSync(`supabase/functions/${functionName}/index.ts`, 'utf-8');

console.log('📦 Function code loaded');
console.log('⚠️  Note: Deployment requires Supabase access token\n');

console.log('=' .repeat(60));
console.log('DEPLOYMENT NOT POSSIBLE WITHOUT ACCESS TOKEN');
console.log('='.repeat(60));
console.log('\n Instead, running direct SQL execution attempt...\n');

const { createClient } = await import('@supabase/supabase-js');

const supabaseUrl = 'https://fkypxitgnfqbfplxokve.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjE0ODksImV4cCI6MjA3NjE5NzQ4OX0.Swk4AqJrRBNnEIdSGS3QjfU-okNKN2LGSL43Ha1h4Cc';

const supabase = createClient(supabaseUrl, anonKey);

console.log('🔍 Checking current database state...\n');

const { error: cohostPrefixError } = await supabase
  .from('users')
  .select('cohost_prefix')
  .limit(1);

if (cohostPrefixError && cohostPrefixError.message.includes('column')) {
  console.log('❌ cohost_prefix column MISSING - needs migration');
} else {
  console.log('✅ cohost_prefix column EXISTS');
}

const { error: cohostRequestsError } = await supabase
  .from('cohost_requests')
  .select('id')
  .limit(1);

if (cohostRequestsError && cohostRequestsError.message.includes('relation')) {
  console.log('❌ cohost_requests table MISSING - needs migration');
} else {
  console.log('✅ cohost_requests table EXISTS');
}

console.log('\n' + '='.repeat(60));
console.log('SOLUTION');
console.log('='.repeat(60));
console.log('\n1. Open: https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql');
console.log('2. Run this SQL:\n');

console.log(`
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

CREATE POLICY "Users can view their own requests" ON cohost_requests FOR SELECT USING (true);
CREATE POLICY "Users can insert their own requests" ON cohost_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Only admins can update requests" ON cohost_requests FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_cohost_requests_user_id ON cohost_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_cohost_requests_status ON cohost_requests(status);
CREATE INDEX IF NOT EXISTS idx_users_parent_user_id ON users(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_users_cohost_prefix ON users(cohost_prefix);
CREATE INDEX IF NOT EXISTS idx_users_is_cohost ON users(is_cohost);
`);

console.log('\n3. Refresh your browser\n');
console.log('='.repeat(60));
console.log('⚠️  Manual execution is the ONLY way without service role key');
console.log('='.repeat(60) + '\n');
