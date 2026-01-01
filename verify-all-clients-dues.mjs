import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fkypxitgnfqbfplxokve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjE0ODksImV4cCI6MjA3NjE5NzQ4OX0.Swk4AqJrRBNnEIdSGS3QjfU-okNKN2LGSL43Ha1h4Cc'
);

async function verifyAllClientDues() {
  console.log('🔍 Verifying Admin Panel Calculation...\n');

  const today = new Date().toISOString().split('T')[0];

  const { data: allDues } = await supabase
    .from('daily_dues')
    .select('client_name, amount, date')
    .lte('date', today);

  const { data: allPayments } = await supabase
    .from('payments')
    .select('client_name, payment_upto_date')
    .eq('status', 'approved')
    .order('payment_upto_date', { ascending: false });

  const clientLastPaymentMap = new Map();
  allPayments?.forEach(payment => {
    if (!clientLastPaymentMap.has(payment.client_name)) {
      clientLastPaymentMap.set(payment.client_name, payment.payment_upto_date);
    }
  });

  const clientDuesMap = new Map();

  allDues?.forEach(due => {
    const lastPaymentDate = clientLastPaymentMap.get(due.client_name);

    if (!lastPaymentDate || due.date > lastPaymentDate) {
      const current = clientDuesMap.get(due.client_name) || 0;
      clientDuesMap.set(due.client_name, current + Number(due.amount));
    }
  });

  let totalUnpaidDues = 0;
  const duesBreakdown = [];

  clientDuesMap.forEach((balance, clientName) => {
    if (balance > 0) {
      totalUnpaidDues += balance;
      duesBreakdown.push({ clientName, totalDue: balance });
    }
  });

  duesBreakdown.sort((a, b) => b.totalDue - a.totalDue);

  console.log('📊 Net Receivable by Client (Till Today):\n');
  duesBreakdown.forEach((item, idx) => {
    const lastPayment = clientLastPaymentMap.get(item.clientName);
    console.log(`${idx + 1}. ${item.clientName.padEnd(20)} ₹${item.totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}  (Last paid: ${lastPayment || 'Never'})`);
  });

  console.log(`\n💰 Total Net Receivable: ₹${totalUnpaidDues.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

  const vijayDue = duesBreakdown.find(d => d.clientName === 'Vijay');
  if (vijayDue) {
    console.log(`\n${vijayDue.totalDue === 25358.40 ? '✅' : '⚠️'} Vijay: ₹${vijayDue.totalDue.toFixed(2)} ${vijayDue.totalDue === 25358.40 ? '(CORRECT!)' : `(Expected: ₹25,358.40)`}`);
  }
}

verifyAllClientDues().catch(console.error);
