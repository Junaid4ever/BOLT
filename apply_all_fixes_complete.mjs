#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

console.log('\n' + '='.repeat(70));
console.log('🚀 COMPLETE FIX APPLICATION SYSTEM');
console.log('='.repeat(70) + '\n');

// Read environment variables
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length) {
    envVars[key.trim()] = values.join('=').trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.log('❌ Missing VITE_SUPABASE_URL in .env\n');
  process.exit(1);
}

if (!supabaseKey || supabaseKey === 'YOUR_SERVICE_ROLE_KEY_HERE') {
  console.log('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env\n');
  console.log('📝 You need the service role key to apply database migrations.\n');
  console.log('TO GET YOUR SERVICE ROLE KEY:');
  console.log('   1. Go to: https://supabase.com/dashboard/project/' +
              supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] + '/settings/api');
  console.log('   2. Copy the "service_role" key (NOT the anon key)');
  console.log('   3. Add to .env file: SUPABASE_SERVICE_ROLE_KEY=your_key_here\n');
  console.log('='.repeat(70));
  console.log('\n📝 ALTERNATIVE: Use Edge Function Approach\n');
  console.log('Since you don\'t have the service role key configured locally,');
  console.log('the best approach is to deploy an edge function that will use');
  console.log('the service role key from Supabase environment:\n');
  console.log('1. The edge function has already been created at:');
  console.log('   supabase/functions/apply-all-fixes/index.ts\n');
  console.log('2. Deploy it via Supabase Dashboard:');
  console.log('   - Go to: https://supabase.com/dashboard/project/' +
              supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] + '/functions');
  console.log('   - Click "Deploy new function"');
  console.log('   - Name: apply-all-fixes');
  console.log('   - Copy/paste code from supabase/functions/apply-all-fixes/index.ts');
  console.log('   - Click "Deploy"\n');
  console.log('3. Then call it:');
  console.log('   node call_apply_all_fixes.mjs\n');
  console.log('='.repeat(70) + '\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('✅ Service role key configured');
console.log('🎯 Target database:', supabaseUrl);
console.log('\n' + '='.repeat(70));
console.log('STEP 1: Creating exec_sql helper function');
console.log('='.repeat(70) + '\n');

// First, create the exec_sql function if it doesn't exist
const createExecSqlFunction = `
CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;
`;

try {
  // We need to execute this directly via REST API since the function doesn't exist yet
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ sql_query: createExecSqlFunction })
  });

  if (response.status === 404) {
    console.log('⚠️  exec_sql function doesn\'t exist yet (expected)\n');
    console.log('💡 Creating it via raw SQL query...\n');

    // Try creating it via the query endpoint
    const queryResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ query: createExecSqlFunction })
    });

    console.log('⚠️  Cannot create exec_sql via REST API\n');
    console.log('📝 This function requires SQL Editor access\n');
  }
} catch (e) {
  console.log('⚠️  Expected error (function doesn\'t exist yet):', e.message.substring(0, 60), '...\n');
}

console.log('='.repeat(70));
console.log('STEP 2: Attempting to apply migration');
console.log('='.repeat(70) + '\n');

// Read the migration SQL
const migrationSQL = readFileSync('supabase/migrations/20251222150000_fix_selected_days_and_status.sql', 'utf-8');

// Remove comments and split into statements
const sqlStatements = migrationSQL
  .split('\n')
  .filter(line => !line.trim().startsWith('--') && !line.trim().startsWith('/*'))
  .join('\n')
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 10);

console.log(`📊 Found ${sqlStatements.length} SQL statements\n`);

// Try to apply each statement
let successCount = 0;
let errorCount = 0;
const results = [];

for (let i = 0; i < sqlStatements.length; i++) {
  const stmt = sqlStatements[i];
  const preview = stmt.substring(0, 80).replace(/\s+/g, ' ');

  console.log(`${i + 1}/${sqlStatements.length} ${preview}...`);

  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: stmt });

    if (error) {
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log(`   ❌ exec_sql not available\n`);
        errorCount++;
        break;
      } else if (error.message.includes('already exists')) {
        console.log(`   ⚠️  Already exists (OK)`);
        successCount++;
      } else {
        console.log(`   ❌ ${error.message.substring(0, 60)}...`);
        errorCount++;
      }
    } else {
      console.log(`   ✅ Success`);
      successCount++;
    }
  } catch (e) {
    console.log(`   ❌ ${e.message.substring(0, 60)}...`);
    errorCount++;
  }
}

console.log('\n' + '='.repeat(70));
console.log('📊 FINAL RESULTS');
console.log('='.repeat(70) + '\n');

if (errorCount === 0 && successCount > 0) {
  console.log('🎉 SUCCESS! All migration fixes applied!\n');
  console.log('✅ Applied fixes:');
  console.log('   1. Status Constraint - Added "not_live" status');
  console.log('   2. ensure_client_recurring_meetings - Checks selected_days');
  console.log('   3. create_todays_recurring_meetings - Respects day selection\n');
} else {
  console.log('⚠️  Could not apply fixes automatically\n');
  console.log('📝 RECOMMENDED SOLUTION: Deploy via Edge Function\n');
  console.log('The edge function approach is more reliable because:');
  console.log('   - It runs with service role privileges in Supabase environment');
  console.log('   - No need to expose service role key locally');
  console.log('   - Can be reused for future migrations\n');
  console.log('STEPS:\n');
  console.log('1. Deploy the edge function:');
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  console.log(`   https://supabase.com/dashboard/project/${projectRef}/functions`);
  console.log('   - Click "New function"');
  console.log('   - Name: apply-all-fixes');
  console.log('   - Copy code from: supabase/functions/apply-all-fixes/index.ts');
  console.log('   - Deploy\n');
  console.log('2. Run the migration:');
  console.log('   node call_apply_all_fixes.mjs\n');
  console.log('   OR\n');
  console.log('📝 ALTERNATIVE: Manual SQL');
  console.log('   1. Go to Supabase SQL Editor');
  console.log('   2. Copy all from: supabase/migrations/20251222150000_fix_selected_days_and_status.sql');
  console.log('   3. Run it\n');
}

console.log('='.repeat(70) + '\n');

process.exit(errorCount === 0 ? 0 : 1);
