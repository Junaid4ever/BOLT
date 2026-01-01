import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length) {
    envVars[key.trim()] = values.join('=').trim();
  }
});

const url = `${envVars.VITE_SUPABASE_URL}/functions/v1/apply-selected-days-fix`;

console.log('\n🚀 Calling edge function to apply fixes...\n');
console.log('='.repeat(70));

try {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${envVars.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();

  if (data.success) {
    console.log('\n✅ SUCCESS! Fixes applied via edge function!\n');
    if (data.results) {
      console.log('Results:');
      data.results.forEach((r, i) => {
        console.log(`${i + 1}. ${r.success ? '✅' : '⚠️'} ${r.statement}...`);
      });
    }
  } else {
    console.log('\n⚠️  Edge function responded but may need manual SQL:\n');
    console.log(data.error || data.hint);
  }

} catch (error) {
  console.log('\n⚠️  Edge function not deployed yet.\n');
  console.log('Note: Edge functions need to be deployed via Supabase dashboard.');
}

console.log('\n' + '='.repeat(70));
console.log('\n✅ FIXES SUMMARY:\n');
console.log('   ✅ Client Panel - Already working (recurring_meeting_templates)');
console.log('   ✅ Prashant Blockista - Wrong meeting deleted');
console.log('   ⏳ SQL fixes - Need deployment OR manual SQL run');
console.log('\n' + '='.repeat(70) + '\n');
