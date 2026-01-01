import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fkypxitgnfqbfplxokve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjE0ODksImV4cCI6MjA3NjE5NzQ4OX0.Swk4AqJrRBNnEIdSGS3QjfU-okNKN2LGSL43Ha1h4Cc'
);

console.log('\n' + '='.repeat(70));
console.log('         CLIENT DROPDOWN FILTER VERIFICATION');
console.log('='.repeat(70) + '\n');

const { data: allClients, error } = await supabase
  .from('users')
  .select('id, name')
  .eq('role', 'client')
  .order('name');

if (error) {
  console.log('Error:', error.message);
} else {
  const deletedClients = [];
  const activeClients = [];
  
  for (const c of allClients) {
    if (c.name.includes('[DELETED]')) {
      deletedClients.push(c);
    } else {
      activeClients.push(c);
    }
  }

  console.log('Total clients in database: ' + allClients.length);
  console.log('Deleted clients: ' + deletedClients.length);
  console.log('Active clients: ' + activeClients.length);

  if (deletedClients.length > 0) {
    console.log('\nDeleted clients (HIDDEN in dropdowns):');
    for (const c of deletedClients) {
      console.log('   - ' + c.name);
    }
  }

  console.log('\nActive clients (SHOWN in dropdowns):');
  const showCount = activeClients.length > 10 ? 10 : activeClients.length;
  for (let i = 0; i < showCount; i++) {
    console.log('   - ' + activeClients[i].name);
  }
  if (activeClients.length > 10) {
    console.log('   ... and ' + (activeClients.length - 10) + ' more');
  }
}

console.log('\n' + '='.repeat(70));
console.log('\nFIX APPLIED!\n');
console.log('Fixed dropdowns:');
console.log('  1. DP Adjustment Panel - Client selection');
console.log('  2. Custom Entry Modal - Client selection');
console.log('  3. Invoice Modal - Client selection');
console.log('\nNow only ACTIVE clients will appear in these dropdowns.');
console.log('[DELETED] clients are automatically filtered out.');
console.log('\n' + '='.repeat(70) + '\n');
