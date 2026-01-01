import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fkypxitgnfqbfplxokve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjE0ODksImV4cCI6MjA3NjE5NzQ4OX0.Swk4AqJrRBNnEIdSGS3QjfU-okNKN2LGSL43Ha1h4Cc'
);

async function checkVijayFinal() {
  console.log('🔍 Checking Vijay dues...\n');

  const { data: payments } = await supabase
    .from('payments')
    .select('payment_upto_date')
    .eq('client_name', 'Vijay')
    .eq('status', 'approved')
    .order('payment_upto_date', { ascending: false })
    .limit(1);

  const paymentSettledTill = payments && payments.length > 0 ? payments[0].payment_upto_date : null;

  const { data: allDues } = await supabase
    .from('daily_dues')
    .select('date, amount, advance_adjustment, original_amount')
    .eq('client_name', 'Vijay')
    .order('date', { ascending: false });

  const unpaidDues = paymentSettledTill
    ? allDues?.filter(d => d.date > paymentSettledTill) || []
    : allDues || [];

  const totalUnpaid = unpaidDues.reduce((sum, d) => sum + (d.amount || 0), 0);

  console.log(`✅ Last Payment Settled: ${paymentSettledTill || 'None'}`);
  console.log(`📊 Total Unpaid Days: ${unpaidDues.length}`);
  console.log(`💰 Total Unpaid Amount: ₹${totalUnpaid.toFixed(2)}`);
  console.log(`\n${totalUnpaid === 25358.40 ? '✅ CORRECT!' : '❌ MISMATCH - Expected: ₹25,358.40'}`);

  if (unpaidDues.length > 0) {
    console.log('\n📅 Recent Unpaid Dues:');
    unpaidDues.slice(0, 10).forEach(d => {
      console.log(`  ${d.date}: ₹${d.amount}`);
    });
  }
}

checkVijayFinal().catch(console.error);
