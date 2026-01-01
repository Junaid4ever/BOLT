#!/usr/bin/env node
import { readFileSync } from 'fs';

console.log('\n' + '='.repeat(70));
console.log('🚀 DEPLOYING EDGE FUNCTION VIA MANAGEMENT API');
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

// Read the edge function code
const functionCode = readFileSync('supabase/functions/apply-all-fixes/index.ts', 'utf-8');

// Extract project reference
const projectRef = envVars.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.log('❌ Could not extract project reference from SUPABASE_URL\n');
  process.exit(1);
}

console.log('📍 Project Reference:', projectRef);
console.log('🔧 Function Name: apply-all-fixes');
console.log('\n⚠️  Note: Deploying via Management API requires an access token\n');

// Check if we have a service role key or access token
if (!envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
  console.log('❌ SUPABASE_SERVICE_ROLE_KEY not configured in .env\n');
  console.log('📝 MANUAL DEPLOYMENT REQUIRED:\n');
  console.log('Option 1 - Via Supabase Dashboard (EASIEST):');
  console.log('   1. Visit: https://supabase.com/dashboard/project/' + projectRef + '/functions');
  console.log('   2. Click "New Function" or "+ New"');
  console.log('   3. Name: apply-all-fixes');
  console.log('   4. Copy the entire code from:');
  console.log('      supabase/functions/apply-all-fixes/index.ts');
  console.log('   5. Click "Deploy"\n');

  console.log('Option 2 - Via CLI:');
  console.log('   1. Run: npx supabase login');
  console.log('   2. Run: npx supabase link --project-ref ' + projectRef);
  console.log('   3. Run: npx supabase functions deploy apply-all-fixes --no-verify-jwt\n');

  console.log('Option 3 - Set Service Role Key:');
  console.log('   1. Get your service role key from Supabase dashboard');
  console.log('   2. Update SUPABASE_SERVICE_ROLE_KEY in .env file');
  console.log('   3. Run this script again\n');

  console.log('='.repeat(70));
  console.log('\n💡 After deployment, run: node call_apply_all_fixes.mjs\n');
  process.exit(1);
}

// If we have the service role key, try to use Supabase Management API
console.log('🔐 Service role key found, attempting deployment...\n');
console.log('⚠️  Note: This requires Supabase Management API access\n');

try {
  // The Management API endpoint
  const managementUrl = `https://api.supabase.com/v1/projects/${projectRef}/functions`;

  const response = await fetch(managementUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${envVars.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      slug: 'apply-all-fixes',
      name: 'apply-all-fixes',
      body: functionCode,
      verify_jwt: false
    })
  });

  if (response.ok) {
    console.log('✅ Edge function deployed successfully!\n');
    console.log('='.repeat(70));
    console.log('\n💡 Next step: Run the migration');
    console.log('   node call_apply_all_fixes.mjs\n');
  } else {
    const error = await response.text();
    console.log('❌ Deployment via API failed:', response.status);
    console.log('Error:', error);
    console.log('\n📝 Please use manual deployment (see options above)\n');
  }
} catch (error) {
  console.log('❌ Error during deployment:', error.message);
  console.log('\n📝 Please use manual deployment (see options above)\n');
}

console.log('='.repeat(70) + '\n');
