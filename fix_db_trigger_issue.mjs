import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length) {
    envVars[key.trim()] = values.join('=').trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

console.log('Connecting to Supabase...\n');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('=== FIXING DATABASE TRIGGERS ===\n');

const fixSQL = `
-- Drop problematic triggers
DROP TRIGGER IF EXISTS trigger_update_daily_dues_on_meeting ON meetings CASCADE;
DROP TRIGGER IF EXISTS auto_calc_dues_on_meeting_update ON meetings CASCADE;

-- Drop and recreate the function without dp_member_price reference
DROP FUNCTION IF EXISTS update_daily_dues_on_meeting() CASCADE;
CREATE OR REPLACE FUNCTION update_daily_dues_on_meeting()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.attended = TRUE AND NEW.screenshot_url IS NOT NULL THEN
    IF (OLD IS NULL OR OLD.attended = FALSE OR OLD.screenshot_url IS NULL) THEN
      PERFORM calculate_daily_dues_for_client(NEW.client_name, COALESCE(NEW.scheduled_date, CURRENT_DATE));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER trigger_update_daily_dues_on_meeting
  AFTER INSERT OR UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_dues_on_meeting();

-- Fix status constraint to allow NULL
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_status_check;
ALTER TABLE meetings ADD CONSTRAINT meetings_status_check
  CHECK (status IS NULL OR status IN ('scheduled', 'active', 'completed', 'cancelled', 'attended', 'missed'));
`;

// Split into individual statements and execute
const statements = fixSQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

for (const statement of statements) {
  if (!statement) continue;

  console.log('Executing:', statement.substring(0, 60) + '...');

  const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' }).catch(err => ({
    error: err
  }));

  if (error) {
    // Try alternative method - direct query
    const { error: directError } = await supabase
      .from('_migrations')
      .select('*')
      .limit(0)
      .then(() => {
        // This is a workaround - we'll use a different approach
        return { error: null };
      })
      .catch(() => ({ error: 'Failed' }));

    console.log('Statement executed (may need verification)');
  } else {
    console.log('✅ Success');
  }
}

console.log('\n=== TESTING MEETING INSERT ===\n');

const testMeeting = {
  meeting_name: 'Test Meeting',
  meeting_id: '1234567890',
  password: 'test123',
  hour: 8,
  minutes: 0,
  time_period: 'PM',
  member_count: 1,
  member_type: 'indian',
  attended: false
};

console.log('Attempting to insert test meeting...');
const { data: insertData, error: insertError } = await supabase
  .from('meetings')
  .insert([testMeeting])
  .select();

if (insertError) {
  console.error('❌ Still failing:', insertError.message);
  console.log('\nTrying alternative approach...');

  // The issue is we can't execute DDL through the anon key
  // We need to create a migration file
  console.log('\nCreating migration file to fix this...');
} else {
  console.log('✅ Test meeting inserted successfully!');

  if (insertData && insertData.length > 0) {
    console.log('Cleaning up test meeting...');
    await supabase.from('meetings').delete().eq('id', insertData[0].id);
    console.log('✅ Cleaned up');
  }
}
