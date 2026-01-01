import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fkypxitgnfqbfplxokve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjE0ODksImV4cCI6MjA3NjE5NzQ4OX0.Swk4AqJrRBNnEIdSGS3QjfU-okNKN2LGSL43Ha1h4Cc'
);

console.log('\n=== CURRENT VS REQUIRED BILLING LOGIC ===\n');

const { data: vinod } = await supabase.from('users').select('*').eq('name', 'Vinod').single();
const { data: junaid } = await supabase.from('users').select('*').eq('name', 'JUNAID').single();
const { data: settings } = await supabase.from('settings').select('*').eq('key', 'price_per_member').single();

if (!vinod || !junaid) {
  console.log('❌ Missing Vinod or JUNAID data');
  process.exit(1);
}

const members = 100;
const globalAdminRate = Number(settings?.value) || 50;

console.log('SCENARIO: JUNAID (sub-client under Vinod) - 100 member meeting\n');

console.log('════════════════════════════════════════════════════════');
console.log('❌ CURRENT LOGIC (WRONG):');
console.log('════════════════════════════════════════════════════════');
console.log('  Uses global admin rate: ₹' + globalAdminRate + ' per member');
console.log('  Admin charge to Vinod: ₹' + (globalAdminRate * members));
console.log('  Ignores Vinod.cohost_rate: ₹' + vinod.cohost_rate);
console.log('  Ignores JUNAID.price_per_member: ₹' + junaid.price_per_member);

console.log('\n════════════════════════════════════════════════════════');
console.log('✅ REQUIRED LOGIC (CORRECT):');
console.log('════════════════════════════════════════════════════════');

console.log('\n📱 1. JUNAID Panel (Client View):');
console.log('   Formula: Due = members × client.price_per_member');
console.log('   Due = ' + members + ' × ₹' + junaid.price_per_member + ' = ₹' + (members * junaid.price_per_member));
console.log('   ℹ️  JUNAID sees this amount in his panel');

console.log('\n🤝 2. Vinod Panel (Cohost View):');
console.log('   Formula: Due to Admin = members × cohost.cohost_rate');
console.log('   Due = ' + members + ' × ₹' + vinod.cohost_rate + ' = ₹' + (members * vinod.cohost_rate));
console.log('   ');
console.log('   💰 Profit Calculation:');
console.log('   Profit = (sub-client.rate - cohost.cohost_rate) × members');
console.log('   Profit = (₹' + junaid.price_per_member + ' - ₹' + vinod.cohost_rate + ') × ' + members);
console.log('   Profit = ₹' + ((junaid.price_per_member - vinod.cohost_rate) * members));
console.log('   ℹ️  Vinod owes admin ₹' + (members * vinod.cohost_rate) + ' but earned ₹' + ((junaid.price_per_member - vinod.cohost_rate) * members) + ' profit');

console.log('\n👨‍💼 3. Admin Panel (Admin View):');
console.log('   Formula: Income = members × cohost.cohost_rate');
console.log('   Income = ' + members + ' × ₹' + vinod.cohost_rate + ' = ₹' + (members * vinod.cohost_rate));
console.log('   ');
console.log('   ❌ Should NOT use JUNAID.price_per_member (₹' + junaid.price_per_member + ')');
console.log('   ❌ Should NOT use global admin rate (₹' + globalAdminRate + ')');
console.log('   ✅ MUST use Vinod.cohost_rate (₹' + vinod.cohost_rate + ')');
console.log('   ℹ️  Admin earns ₹' + (members * vinod.cohost_rate) + ' from Vinod regardless of what Vinod charges JUNAID');

console.log('\n════════════════════════════════════════════════════════');
console.log('📊 SUMMARY FOR 100-MEMBER JUNAID MEETING:');
console.log('════════════════════════════════════════════════════════');
console.log('  JUNAID panel shows: ₹' + (members * junaid.price_per_member) + ' due');
console.log('  Vinod panel shows: ₹' + (members * vinod.cohost_rate) + ' due to admin');
console.log('  Vinod profit: ₹' + ((junaid.price_per_member - vinod.cohost_rate) * members));
console.log('  Admin earns: ₹' + (members * vinod.cohost_rate) + ' from Vinod');
console.log('════════════════════════════════════════════════════════\n');
