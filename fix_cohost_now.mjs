import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY
);

console.log('\n🔍 FIXING COHOST CLIENT ISSUE...\n');

async function main() {
  // Step 1: Find Vinod
  console.log('1️⃣ Finding Vinod (Cohost with prefix V)...');
  const { data: vinod, error: vinodError } = await supabase
    .from('users')
    .select('id, name, email, cohost_prefix, is_cohost')
    .eq('cohost_prefix', 'V')
    .eq('is_cohost', true)
    .maybeSingle();

  if (vinodError) {
    console.log('❌ Error:', vinodError.message);
    return;
  }

  if (!vinod) {
    console.log('❌ NO COHOST WITH PREFIX V FOUND!');
    console.log('\n📋 All cohosts:');
    const { data: allCohosts } = await supabase
      .from('users')
      .select('id, name, email, cohost_prefix, is_cohost')
      .eq('is_cohost', true);
    console.log(allCohosts);
    return;
  }

  console.log('✅ Found:', vinod.name, '(ID:', vinod.id + ')');

  // Step 2: Check V- clients
  console.log('\n2️⃣ Checking V- prefix clients...');
  const { data: vClients } = await supabase
    .from('users')
    .select('id, name, email, parent_user_id, role')
    .eq('role', 'client')
    .ilike('email', 'V-%');

  console.log(`Found ${vClients?.length || 0} clients:`);
  vClients?.forEach(client => {
    const isCorrect = client.parent_user_id === vinod.id;
    console.log(`  ${isCorrect ? '✅' : '❌'} ${client.name} (${client.email})`);
    console.log(`     parent_user_id: ${client.parent_user_id || 'NULL'}`);
  });

  // Step 3: Fix ALL V- clients
  console.log('\n3️⃣ Fixing parent_user_id...');
  const { data: updated, error: updateError } = await supabase
    .from('users')
    .update({ parent_user_id: vinod.id })
    .eq('role', 'client')
    .ilike('email', 'V-%')
    .select();

  if (updateError) {
    console.log('❌ Error:', updateError.message);
    return;
  }

  console.log(`✅ Updated ${updated?.length || 0} clients to Vinod's account`);

  // Step 4: Verify
  console.log('\n4️⃣ Final verification...');
  const { data: finalCheck } = await supabase
    .from('users')
    .select('id, name, email, parent_user_id')
    .eq('parent_user_id', vinod.id)
    .eq('role', 'client');

  console.log(`\n✅ Vinod now has ${finalCheck?.length || 0} clients:`);
  finalCheck?.forEach(client => {
    console.log(`  ✓ ${client.name} (${client.email})`);
  });

  // Step 5: Check all clients without parent (still showing in admin)
  console.log('\n5️⃣ Checking orphan clients (showing in admin)...');
  const { data: orphans } = await supabase
    .from('users')
    .select('id, name, email, parent_user_id')
    .eq('role', 'client')
    .is('parent_user_id', null);

  if (orphans && orphans.length > 0) {
    console.log(`⚠️  ${orphans.length} clients still have NULL parent_user_id:`);
    orphans.forEach(client => {
      console.log(`  - ${client.name} (${client.email})`);
    });
  } else {
    console.log('✅ No orphan clients found');
  }

  console.log('\n✅ DONE! Hard refresh browser: Ctrl + Shift + R\n');
}

main().catch(console.error);
