import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fkypxitgnfqbfplxokve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjE0ODksImV4cCI6MjA3NjE5NzQ4OX0.Swk4AqJrRBNnEIdSGS3QjfU-okNKN2LGSL43Ha1h4Cc'
);

async function fixVijayDues() {
  console.log('🔧 Fixing Vijay dues...');

  // Step 1: Delete all existing dues for Vijay
  console.log('Step 1: Deleting existing dues for Vijay from Oct 1, 2024...');
  const { error: deleteError } = await supabase
    .from('daily_dues')
    .delete()
    .eq('client_name', 'Vijay')
    .gte('date', '2024-10-01');

  if (deleteError) {
    console.error('Error deleting dues:', deleteError);
    return;
  }
  console.log('✅ Deleted old dues');

  // Step 2: Recalculate all dues for Vijay from Oct 1 to today
  console.log('Step 2: Recalculating dues...');

  const startDate = new Date('2024-10-01');
  const endDate = new Date();
  const currentDate = new Date(startDate);

  let processed = 0;
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];

    // Call the calculate_daily_dues_for_client function
    const { error: calcError } = await supabase.rpc('calculate_daily_dues_for_client', {
      p_client_name: 'Vijay',
      p_date: dateStr
    });

    if (calcError) {
      console.error(`Error calculating for ${dateStr}:`, calcError.message);
    } else {
      processed++;
      if (processed % 10 === 0) {
        console.log(`Processed ${processed} days...`);
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log(`✅ Recalculated ${processed} days`);

  // Step 3: Get payment settled date
  console.log('Step 3: Checking payment history...');

  const { data: payments } = await supabase
    .from('payments')
    .select('payment_upto_date')
    .eq('client_name', 'Vijay')
    .eq('status', 'approved')
    .order('payment_upto_date', { ascending: false })
    .limit(1);

  const paymentSettledTill = payments && payments.length > 0 ? payments[0].payment_upto_date : null;

  if (paymentSettledTill) {
    console.log(`✅ Last payment settled till: ${paymentSettledTill}`);
  } else {
    console.log('⚠️ No approved payments found');
  }

  // Step 4: Verify the fix
  console.log('Step 4: Verifying...');

  const { data: allDues, error: allError } = await supabase
    .from('daily_dues')
    .select('date, amount, advance_adjustment')
    .eq('client_name', 'Vijay')
    .order('date', { ascending: false });

  if (allError) {
    console.error('Error fetching dues:', allError);
    return;
  }

  const unpaidDues = paymentSettledTill
    ? allDues?.filter(d => d.date > paymentSettledTill) || []
    : allDues || [];

  const unpaidCount = unpaidDues.length;
  const totalUnpaid = unpaidDues.reduce((sum, d) => sum + (d.amount || 0), 0);

  console.log('\n📊 VERIFICATION RESULTS:');
  console.log(`Unpaid days: ${unpaidCount}`);
  console.log(`Total unpaid due: ₹${totalUnpaid.toFixed(2)}`);
  console.log('\n✅ Vijay dues fixed successfully!');
}

fixVijayDues().catch(console.error);
