import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

// Extract connection details from Supabase URL
const supabaseUrl = envVars.VITE_SUPABASE_URL;
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

console.log('Checking if trigger exists in database...\n');
console.log('Note: Need direct database access to check triggers.');
console.log('The Supabase client API cannot query pg_trigger directly.\n');

console.log('Alternative: Check if migration has been applied...\n');

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);

// Try to check if the function exists by calling it directly
console.log('Attempting to manually test the trigger logic...\n');

async function testTriggerLogic() {
  // Find JUNAID
  const { data: users } = await supabase
    .from('users')
    .select('id, name, parent_user_id')
    .eq('name', 'JUNAID')
    .single();

  if (!users) {
    console.log('Could not find JUNAID');
    return;
  }

  console.log('JUNAID details:');
  console.log(`  id: ${users.id}`);
  console.log(`  parent_user_id: ${users.parent_user_id}`);

  console.log('\nThe trigger SHOULD:');
  console.log('  1. Run BEFORE INSERT on meetings');
  console.log('  2. When cohost_id IS NULL');
  console.log('  3. Look up parent_user_id from users table based on client_id');
  console.log('  4. Set NEW.cohost_id to that parent_user_id');

  console.log('\n\nPossible reasons trigger is not working:');
  console.log('  1. Trigger was not created (migration not run)');
  console.log('  2. Trigger is disabled');
  console.log('  3. Trigger condition (WHEN NEW.cohost_id IS NULL) not met');
  console.log('  4. Function set_meeting_cohost_id() does not exist or has errors');

  console.log('\n\nRecommendation:');
  console.log('  Run the migration file: supabase/migrations/20251221100000_fix_subclient_system.sql');
  console.log('  Or manually execute in Supabase SQL Editor:');
  console.log(`
CREATE OR REPLACE FUNCTION set_meeting_cohost_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the parent_user_id of the client creating the meeting
  SELECT parent_user_id INTO NEW.cohost_id
  FROM users
  WHERE id = NEW.client_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_meeting_cohost_id ON meetings;

CREATE TRIGGER trigger_set_meeting_cohost_id
  BEFORE INSERT ON meetings
  FOR EACH ROW
  WHEN (NEW.cohost_id IS NULL)
  EXECUTE FUNCTION set_meeting_cohost_id();
  `);
}

testTriggerLogic().catch(console.error);
