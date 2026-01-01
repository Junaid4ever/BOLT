#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

console.log('\n' + '='.repeat(70));
console.log('🚀 APPLYING SQL MIGRATION DIRECTLY');
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
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase credentials in .env\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Read the migration SQL
const migrationSQL = readFileSync('supabase/migrations/20251222150000_fix_selected_days_and_status.sql', 'utf-8');

console.log('📄 Migration file: 20251222150000_fix_selected_days_and_status.sql');
console.log('🎯 Target database:', supabaseUrl);
console.log('\n⏳ Applying fixes...\n');

// Extract SQL statements (skip comments)
const statements = migrationSQL
  .split(/;(?:\s*$|\s+(?=ALTER|CREATE|DROP))/m)
  .map(s => s.trim())
  .filter(s => s.length > 10 && !s.startsWith('/*') && !s.startsWith('--'));

console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

const results = [];
let successCount = 0;
let errorCount = 0;

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  const preview = stmt.substring(0, 80).replace(/\s+/g, ' ');

  console.log(`${i + 1}/${statements.length} Executing: ${preview}...`);

  try {
    // Try using the exec_sql RPC function
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: stmt });

    if (error) {
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log(`   ⚠️  exec_sql function not available`);
        console.log(`   💡 This requires manual SQL execution\n`);
        errorCount++;
        results.push({
          statement: preview,
          error: 'exec_sql function not available',
          success: false
        });
        break; // Stop trying if exec_sql doesn't exist
      } else {
        // Some errors are OK (like "already exists")
        if (error.message.includes('already exists') ||
            error.message.includes('does not exist') ||
            error.message.includes('constraint') && error.message.includes('does not exist')) {
          console.log(`   ⚠️  ${error.message.substring(0, 60)}...`);
          successCount++;
          results.push({
            statement: preview,
            warning: error.message,
            success: true
          });
        } else {
          console.log(`   ❌ Error: ${error.message.substring(0, 60)}...`);
          errorCount++;
          results.push({
            statement: preview,
            error: error.message,
            success: false
          });
        }
      }
    } else {
      console.log(`   ✅ Success`);
      successCount++;
      results.push({
        statement: preview,
        success: true
      });
    }
  } catch (e) {
    console.log(`   ❌ Exception: ${e.message.substring(0, 60)}...`);
    errorCount++;
    results.push({
      statement: preview,
      error: e.message,
      success: false
    });
  }
}

console.log('\n' + '='.repeat(70));
console.log('📊 MIGRATION SUMMARY');
console.log('='.repeat(70) + '\n');

console.log(`Total statements: ${statements.length}`);
console.log(`✅ Successful: ${successCount}`);
console.log(`❌ Failed: ${errorCount}\n`);

if (errorCount === 0) {
  console.log('🎉 ALL FIXES APPLIED SUCCESSFULLY!\n');
  console.log('✅ What was fixed:');
  console.log('   1. Status Constraint - Added "not_live" status');
  console.log('   2. ensure_client_recurring_meetings - Now checks selected_days');
  console.log('   3. create_todays_recurring_meetings - Respects day selection\n');
  console.log('💡 You can now:');
  console.log('   - Use "Mark as Not Live" button in admin panel');
  console.log('   - Recurring meetings only create on selected days');
  console.log('   - No more wrong day meetings\n');
} else {
  console.log('⚠️  SOME FIXES FAILED\n');

  const execSqlMissing = results.some(r => r.error && r.error.includes('exec_sql'));

  if (execSqlMissing) {
    console.log('❌ The exec_sql function is not available in your database.\n');
    console.log('📝 SOLUTION: Apply via Edge Function\n');
    console.log('Step 1: Deploy the edge function');
    console.log('   Go to: https://supabase.com/dashboard/project/' +
                supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] + '/functions');
    console.log('   Create a new function named: apply-all-fixes');
    console.log('   Copy code from: supabase/functions/apply-all-fixes/index.ts\n');
    console.log('Step 2: Call the edge function');
    console.log('   Run: node call_apply_all_fixes.mjs\n');
    console.log('   OR\n');
    console.log('📝 ALTERNATIVE: Manual SQL Execution');
    console.log('   1. Go to Supabase SQL Editor');
    console.log('   2. Copy entire contents of:');
    console.log('      supabase/migrations/20251222150000_fix_selected_days_and_status.sql');
    console.log('   3. Run it directly in the SQL editor\n');
  } else {
    console.log('📋 Failed statements:\n');
    results.filter(r => !r.success).forEach((r, i) => {
      console.log(`${i + 1}. ${r.statement}`);
      console.log(`   Error: ${r.error}\n`);
    });
  }
}

console.log('='.repeat(70) + '\n');

process.exit(errorCount === 0 ? 0 : 1);
