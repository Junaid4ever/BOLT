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

console.log('🔧 Attempting automatic database fix...\n');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const fixSQL = fs.readFileSync('FIX_MEETING_INSERT.sql', 'utf-8');

// Try different approaches to execute the SQL

// Approach 1: Check if exec_sql function exists
console.log('Approach 1: Trying exec_sql RPC...');
let execData, execError;
try {
  const result = await supabase.rpc('exec_sql', { sql_query: fixSQL });
  execData = result.data;
  execError = result.error;
} catch (err) {
  execError = err;
}

if (!execError) {
  console.log('✅ SUCCESS! Fix applied via exec_sql');
  process.exit(0);
}

console.log('❌ exec_sql not available:', execError?.message || 'Function does not exist');

// Approach 2: Try creating the function first, then calling it
console.log('\nApproach 2: Trying to create and call admin function...');

const createFunctionSQL = `
CREATE OR REPLACE FUNCTION apply_meeting_fix()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DROP TRIGGER IF EXISTS trigger_calculate_dues_on_screenshot ON meetings CASCADE;
  DROP TRIGGER IF EXISTS trigger_update_daily_dues_on_meeting ON meetings CASCADE;
  DROP FUNCTION IF EXISTS calculate_dues_on_screenshot() CASCADE;
  DROP FUNCTION IF EXISTS update_daily_dues_on_meeting() CASCADE;

  CREATE OR REPLACE FUNCTION update_daily_dues_on_meeting()
  RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $inner$
  BEGIN
    IF NEW.screenshot_url IS NOT NULL AND NEW.screenshot_url != '' THEN
      IF NEW.attended = TRUE THEN
        IF (OLD IS NULL OR OLD.screenshot_url IS NULL OR OLD.screenshot_url = '') THEN
          PERFORM calculate_daily_dues_for_client(NEW.client_name, COALESCE(NEW.scheduled_date, CURRENT_DATE));
        END IF;
      END IF;
    END IF;
    RETURN NEW;
  END;
  $inner$;

  CREATE TRIGGER trigger_update_daily_dues_on_meeting
    AFTER INSERT OR UPDATE OF screenshot_url, attended ON meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_dues_on_meeting();

  RETURN 'Fix applied successfully';
END;
$$;
`;

// This won't work with anon key either, but let's try
let createError;
try {
  const result = await supabase.rpc('exec_sql', { sql: createFunctionSQL });
  createError = result.error;
} catch (err) {
  createError = err;
}

if (createError) {
  console.log('❌ Cannot create function:', createError?.message || 'Insufficient permissions');
}

// The reality is we need service role key or manual SQL execution
console.log('\n═══════════════════════════════════════════════════════════');
console.log('⚠️  AUTOMATIC FIX NOT POSSIBLE');
console.log('═══════════════════════════════════════════════════════════');
console.log('\nReason: Database DDL operations require service_role key');
console.log('        which is not configured in .env file');
console.log('\n✅ SOLUTION: Semi-automatic fix is ready!');
console.log('\n📌 START YOUR DEV SERVER:');
console.log('   npm run dev');
console.log('\n📌 THEN OPEN:');
console.log('   http://localhost:5173/auto-fix-meeting-insert.html');
console.log('\n   The page will:');
console.log('   • Auto-copy the fix SQL');
console.log('   • Auto-open Supabase dashboard');
console.log('   • You just paste (Ctrl+V) and click RUN');
console.log('\n✅ Total time: ~10 seconds');
console.log('═══════════════════════════════════════════════════════════\n');
