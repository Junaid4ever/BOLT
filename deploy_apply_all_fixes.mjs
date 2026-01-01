#!/usr/bin/env node
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

console.log('\n='.repeat(70));
console.log('🚀 DEPLOYING APPLY-ALL-FIXES EDGE FUNCTION');
console.log('='.repeat(70) + '\n');

// Check if supabase CLI is available
try {
  execSync('which supabase', { stdio: 'ignore' });
} catch (e) {
  console.log('⚠️  Supabase CLI not found. Installing via npx...\n');
}

// Read environment variables
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length) {
    envVars[key.trim()] = values.join('=').trim();
  }
});

// Extract project reference from URL
const projectRef = envVars.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.log('❌ Could not extract project reference from SUPABASE_URL\n');
  process.exit(1);
}

console.log(`📍 Project: ${projectRef}`);
console.log(`🔧 Function: apply-all-fixes`);
console.log(`📁 Path: supabase/functions/apply-all-fixes\n`);

try {
  console.log('🚀 Deploying edge function...\n');

  // Deploy the function
  const result = execSync(
    `npx supabase functions deploy apply-all-fixes --project-ref ${projectRef} --no-verify-jwt`,
    {
      encoding: 'utf-8',
      stdio: 'inherit'
    }
  );

  console.log('\n✅ Edge function deployed successfully!\n');
  console.log('='.repeat(70));
  console.log('\n💡 Next step: Run the following command to apply the fixes:');
  console.log('   node call_apply_all_fixes.mjs\n');

} catch (error) {
  console.log('\n⚠️  Deployment failed. This is likely due to missing authentication.\n');
  console.log('📝 MANUAL DEPLOYMENT STEPS:');
  console.log('   1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/functions');
  console.log('   2. Click "Deploy function" or "New function"');
  console.log('   3. Name it: apply-all-fixes');
  console.log('   4. Copy the code from: supabase/functions/apply-all-fixes/index.ts');
  console.log('   5. Deploy from the dashboard\n');
  console.log('   OR');
  console.log('   1. Run: npx supabase login');
  console.log('   2. Run: npx supabase link --project-ref ' + projectRef);
  console.log('   3. Run: npx supabase functions deploy apply-all-fixes --no-verify-jwt\n');
  console.log('='.repeat(70) + '\n');
}
