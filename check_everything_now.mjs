import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fkypxitgnfqbfplxokve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjE0ODksImV4cCI6MjA3NjE5NzQ4OX0.Swk4AqJrRBNnEIdSGS3QjfU-okNKN2LGSL43Ha1h4Cc'
);

console.log('\n🔍 CHECKING ALL USERS IN DATABASE...\n');

const { data: users, error } = await supabase
  .from('users')
  .select('id, name, role, is_admin, cohost_rate, parent_cohost_id, parent_user_id')
  .order('name');

if (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

console.log(`📊 Total users in database: ${users.length}\n`);

const admins = users.filter(u => u.is_admin || u.role === 'admin');
const clients = users.filter(u => u.role === 'client');
const cohosts = users.filter(u => u.role === 'cohost');
const subclients = users.filter(u => u.role === 'subclient');
const nullRoles = users.filter(u => !u.role);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📈 ROLE DISTRIBUTION:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`👑 Admins: ${admins.length}`);
console.log(`👥 Clients: ${clients.length}`);
console.log(`🤝 Cohosts: ${cohosts.length}`);
console.log(`📎 Subclients: ${subclients.length}`);
console.log(`⚠️  NULL roles: ${nullRoles.length}\n`);

if (admins.length > 0) {
  console.log('👑 ADMINS:');
  admins.forEach(u => console.log(`  ✓ ${u.name}`));
  console.log('');
}

if (clients.length > 0) {
  console.log(`👥 CLIENTS (Total: ${clients.length}):`);
  clients.forEach(u => {
    console.log(`  ✓ ${u.name}`);
  });
  console.log('');
}

if (cohosts.length > 0) {
  console.log('🤝 COHOSTS:');
  cohosts.forEach(u => console.log(`  ✓ ${u.name} - Rate: Rs ${u.cohost_rate || 0}`));
  console.log('');
}

if (subclients.length > 0) {
  console.log('📎 SUBCLIENTS:');
  subclients.forEach(u => console.log(`  ✓ ${u.name}`));
  console.log('');
}

if (nullRoles.length > 0) {
  console.log('⚠️  USERS WITH NULL ROLE:');
  nullRoles.forEach(u => console.log(`  ⚠️  ${u.name} - NEEDS FIX`));
  console.log('');
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 CHECKING SPECIFIC CLIENTS:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const checkNames = ['Aakash', 'Vinod', 'Vijay', 'Junaid', 'Blax', 'Dollard'];

for (const name of checkNames) {
  const user = users.find(u => u.name.toLowerCase().includes(name.toLowerCase()));
  if (user) {
    console.log(`✓ ${user.name}: Found - Role: ${user.role || 'NULL'}, Admin: ${user.is_admin}`);
  } else {
    console.log(`✗ ${name}: NOT FOUND IN DATABASE`);
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (nullRoles.length > 0) {
  console.log('⚠️  PROBLEM DETECTED!');
  console.log(`   ${nullRoles.length} users have NULL role - they need to be restored`);
  console.log('   Open: http://localhost:5173/emergency-restore-clients.html\n');
} else if (clients.length < 10) {
  console.log('⚠️  WARNING!');
  console.log(`   Only ${clients.length} clients found - this seems too low`);
  console.log('   Open: http://localhost:5173/emergency-restore-clients.html\n');
} else {
  console.log('✅ Database looks healthy!');
  console.log(`   ${clients.length} clients are properly set\n`);
}
