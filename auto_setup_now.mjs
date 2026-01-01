const supabaseUrl = 'https://fkypxitgnfqbfplxokve.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjE0ODksImV4cCI6MjA3NjE5NzQ4OX0.Swk4AqJrRBNnEIdSGS3QjfU-okNKN2LGSL43Ha1h4Cc';

console.log('\n🚀 AUTO SETUP: Co-Host System\n');
console.log('⏳ Calling Edge Function...\n');

try {
  const response = await fetch(`${supabaseUrl}/functions/v1/apply-cohost-migration`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    }
  });

  const result = await response.json();

  if (result.success) {
    console.log('✅ SUCCESS! Co-Host System is now active!\n');
    console.log('📊 Response:', JSON.stringify(result, null, 2));
    console.log('\n' + '='.repeat(60));
    console.log('🎉 YOU CAN NOW USE THE CO-HOST FEATURE!');
    console.log('='.repeat(60));
    console.log('\n✅ Refresh your browser and check it out!\n');
  } else {
    console.log('⚠️  Edge function responded but migration failed\n');
    console.log('📊 Response:', JSON.stringify(result, null, 2));
    console.log('\n' + '─'.repeat(60));
    console.log('📋 ALTERNATIVE: Run this SQL manually');
    console.log('─'.repeat(60));
    console.log(`
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_cohost BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cohost_prefix TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS cohost_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at timestamptz DEFAULT now(),
  admin_response_at timestamptz,
  admin_response_by TEXT
);

ALTER TABLE cohost_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view requests" ON cohost_requests FOR SELECT USING (true);
CREATE POLICY "Users can insert requests" ON cohost_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update requests" ON cohost_requests FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_cohost_requests_user_id ON cohost_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_users_cohost_prefix ON users(cohost_prefix);
    `);
    console.log('─'.repeat(60));
    console.log('\n📍 Paste at: https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql\n');
  }
} catch (error) {
  console.log('❌ Connection Error:', error.message);
  console.log('\n🔧 The edge function might not be deployed yet.');
  console.log('\n📋 Please run this SQL manually:');
  console.log('─'.repeat(60));
  console.log(`
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_cohost BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cohost_prefix TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS cohost_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at timestamptz DEFAULT now(),
  admin_response_at timestamptz,
  admin_response_by TEXT
);

ALTER TABLE cohost_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view requests" ON cohost_requests FOR SELECT USING (true);
CREATE POLICY "Users can insert requests" ON cohost_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update requests" ON cohost_requests FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_cohost_requests_user_id ON cohost_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_users_cohost_prefix ON users(cohost_prefix);
  `);
  console.log('─'.repeat(60));
  console.log('\n📍 Paste at: https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql\n');
}
