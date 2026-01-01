import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

console.log('\n🔍 CHECKING COHOST CLIENT ISSUE...\n');

// Step 1: Check Vinod's details
console.log('1️⃣ Checking Vinod (Cohost with prefix V)...');
const { data: vinod } = await supabase
  .from('users')
  .select('id, name, email, cohost_prefix, is_cohost')
  .eq('cohost_prefix', 'V')
  .eq('is_cohost', true)
  .maybeSingle();

if (!vinod) {
  console.log('❌ NO COHOST WITH PREFIX V FOUND!');
  process.exit(1);
}

console.log('✅ Vinod found:', {
  id: vinod.id,
  name: vinod.name,
  prefix: vinod.cohost_prefix
});

// Step 2: Check V- prefix clients
console.log('\n2️⃣ Checking all V- prefix clients...');
const { data: vClients } = await supabase
  .from('users')
  .select('id, name, email, parent_user_id, role')
  .or('email.ilike.V-%,name.ilike.V-%')
  .eq('role', 'client');

console.log(`Found ${vClients?.length || 0} clients with V- prefix:`);
vClients?.forEach(client => {
  console.log(`  - ${client.name} (${client.email})`);
  console.log(`    parent_user_id: ${client.parent_user_id || 'NULL ❌'}`);
  console.log(`    Should be: ${vinod.id}`);
  console.log(`    Status: ${client.parent_user_id === vinod.id ? '✅ CORRECT' : '❌ WRONG'}`);
});

// Step 3: Fix it!
console.log('\n3️⃣ Fixing parent_user_id for all V- clients...');
const { data: updated, error: updateError } = await supabase
  .from('users')
  .update({ parent_user_id: vinod.id })
  .or('email.ilike.V-%,name.ilike.V-%')
  .eq('role', 'client')
  .select();

if (updateError) {
  console.log('❌ Update error:', updateError);
} else {
  console.log(`✅ Updated ${updated?.length || 0} clients`);
}

// Step 4: Verify
console.log('\n4️⃣ Verifying fix...');
const { data: verifyClients } = await supabase
  .from('users')
  .select('id, name, email, parent_user_id')
  .eq('parent_user_id', vinod.id)
  .eq('role', 'client');

console.log(`\n✅ Vinod now has ${verifyClients?.length || 0} clients:`);
verifyClients?.forEach(client => {
  console.log(`  ✓ ${client.name} (${client.email})`);
});

// Step 5: Check payment methods
console.log('\n5️⃣ Checking payment methods...');
const { data: paymentMethods } = await supabase
  .from('payment_methods')
  .select('*')
  .eq('cohost_user_id', vinod.id);

console.log('Payment methods:', paymentMethods);

console.log('\n✅ DONE! Refresh your browser now.\n');
