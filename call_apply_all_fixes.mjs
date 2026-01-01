#!/usr/bin/env node
import { readFileSync } from 'fs';

console.log('\n' + '='.repeat(70));
console.log('🚀 APPLYING ALL FIXES VIA EDGE FUNCTION');
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

const url = `${envVars.VITE_SUPABASE_URL}/functions/v1/apply-all-fixes`;

console.log('📍 Endpoint:', url);
console.log('🔐 Using anon key for authentication\n');
console.log('⏳ Executing migration SQL...\n');

try {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${envVars.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();

  console.log('='.repeat(70));
  console.log('\n📊 MIGRATION RESULTS:\n');

  if (data.success) {
    console.log('✅ SUCCESS! All fixes applied successfully!\n');

    if (data.summary) {
      console.log('📈 Summary:');
      console.log(`   Total statements: ${data.summary.total}`);
      console.log(`   ✅ Successful: ${data.summary.successful}`);
      console.log(`   ❌ Failed: ${data.summary.failed}\n`);
    }

    if (data.results && data.results.length > 0) {
      console.log('📋 Detailed Results:\n');
      data.results.forEach((result, i) => {
        const icon = result.success ? '✅' : '❌';
        const status = result.success ? 'SUCCESS' : 'FAILED';
        console.log(`${i + 1}. ${icon} ${status}`);
        console.log(`   Statement: ${result.statement}`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
        console.log();
      });
    }

    console.log('='.repeat(70));
    console.log('\n🎉 FIXES APPLIED:\n');
    console.log('   1. ✅ Status Constraint Updated');
    console.log('      - Added "not_live" status to meetings table');
    console.log('      - Fixes "Mark as Not Live" button error\n');

    console.log('   2. ✅ ensure_client_recurring_meetings Function Fixed');
    console.log('      - Now checks selected_days before creating meetings');
    console.log('      - Only creates on specified days\n');

    console.log('   3. ✅ create_todays_recurring_meetings Function Fixed');
    console.log('      - Midnight auto-creation respects selected_days');
    console.log('      - Prevents wrong day meeting creation\n');

    console.log('='.repeat(70));
    console.log('\n✨ All fixes have been successfully applied to your database!');
    console.log('💡 You can now:');
    console.log('   - Use "Mark as Not Live" button in admin panel');
    console.log('   - Recurring meetings will only be created on selected days');
    console.log('   - No more wrong day meetings like Prashant Blockista issue\n');

  } else {
    console.log('⚠️  Migration completed with errors\n');

    if (data.summary) {
      console.log('📈 Summary:');
      console.log(`   Total statements: ${data.summary.total}`);
      console.log(`   ✅ Successful: ${data.summary.successful}`);
      console.log(`   ❌ Failed: ${data.summary.failed}\n`);
    }

    console.log('❌ Error:', data.error || data.message);

    if (data.results && data.results.length > 0) {
      console.log('\n📋 Detailed Results:\n');
      data.results.forEach((result, i) => {
        const icon = result.success ? '✅' : '❌';
        const status = result.success ? 'SUCCESS' : 'FAILED';
        console.log(`${i + 1}. ${icon} ${status}`);
        console.log(`   Statement: ${result.statement}`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
        console.log();
      });
    }

    console.log('\n💡 Some statements may have failed. Check the errors above.');
    console.log('   If needed, you can manually run the SQL from:');
    console.log('   supabase/migrations/20251222150000_fix_selected_days_and_status.sql\n');
  }

  console.log('='.repeat(70) + '\n');

} catch (error) {
  console.log('❌ ERROR: Failed to call edge function\n');
  console.log('Details:', error.message);
  console.log('\n⚠️  The edge function may not be deployed yet.\n');
  console.log('📝 TO DEPLOY THE EDGE FUNCTION:');
  console.log('   1. Run: node deploy_apply_all_fixes.mjs');
  console.log('   2. Or deploy manually via Supabase Dashboard\n');
  console.log('📝 ALTERNATIVE - RUN SQL MANUALLY:');
  console.log('   1. Go to Supabase SQL Editor');
  console.log('   2. Copy SQL from: supabase/migrations/20251222150000_fix_selected_days_and_status.sql');
  console.log('   3. Run the SQL directly\n');
  console.log('='.repeat(70) + '\n');
}
