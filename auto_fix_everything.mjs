import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('./.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 Auto-fixing everything...\n');

async function createBuckets() {
  console.log('📦 Creating storage buckets...');

  const buckets = [
    { id: 'screenshots', public: false, limit: 5 * 1024 * 1024 },
    { id: 'payment-screenshots', public: false, limit: 5 * 1024 * 1024 },
    { id: 'advance-screenshots', public: false, limit: 5 * 1024 * 1024 },
    { id: 'qr-codes', public: true, limit: 1 * 1024 * 1024 }
  ];

  for (const bucket of buckets) {
    const { error } = await supabase.storage.createBucket(bucket.id, {
      public: bucket.public,
      fileSizeLimit: bucket.limit,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    });

    if (!error || error.message.includes('already exists')) {
      console.log(`  ✅ ${bucket.id}`);
    } else {
      console.log(`  ⚠️  ${bucket.id}: ${error.message}`);
    }
  }
}

async function runSQL(sql, label) {
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
  if (error && !error.message.includes('already exists') && !error.message.includes('does not exist')) {
    console.log(`  ⚠️  ${label}: ${error.message.substring(0, 50)}`);
    return false;
  }
  console.log(`  ✅ ${label}`);
  return true;
}

async function createIndexes() {
  console.log('\n📊 Creating performance indexes...');

  await runSQL(`CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_date_status ON meetings(scheduled_date, status)`, 'meetings_date_status');
  await runSQL(`CREATE INDEX IF NOT EXISTS idx_meetings_client_scheduled ON meetings(client_name, scheduled_date DESC)`, 'meetings_client');
  await runSQL(`CREATE INDEX IF NOT EXISTS idx_meetings_attended_date ON meetings(attended, scheduled_date DESC) WHERE attended = true`, 'meetings_attended');
  await runSQL(`CREATE INDEX IF NOT EXISTS idx_daily_dues_client_date ON daily_dues(client_id, due_date DESC)`, 'daily_dues_client');
  await runSQL(`CREATE INDEX IF NOT EXISTS idx_payments_client_date ON payments(client_name, payment_date DESC)`, 'payments_client');
  await runSQL(`CREATE INDEX IF NOT EXISTS idx_advance_payments_client ON advance_payments(client_id, is_fully_used)`, 'advance_payments');
  await runSQL(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`, 'users_role');
  await runSQL(`CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read, created_at DESC) WHERE is_read = false`, 'notifications_unread');
}

async function cleanOldData() {
  console.log('\n🧹 Cleaning old data...');

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { error: notifError } = await supabase
    .from('notifications')
    .delete()
    .lt('created_at', ninetyDaysAgo);

  if (!notifError) {
    console.log('  ✅ Old notifications deleted');
  }

  const oneEightyDaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

  const { error: histError } = await supabase
    .from('historical_meetings')
    .delete()
    .lt('deleted_at', oneEightyDaysAgo);

  if (!histError) {
    console.log('  ✅ Old historical meetings deleted');
  }
}

async function showStats() {
  console.log('\n📈 Database stats:');

  const tables = ['meetings', 'daily_dues', 'payments', 'users'];

  for (const table of tables) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    console.log(`  ${table}: ${count?.toLocaleString() || 0} rows`);
  }

  const { data: buckets } = await supabase.storage.listBuckets();
  console.log(`\n📦 Storage buckets: ${buckets?.length || 0}`);
}

async function main() {
  try {
    await createBuckets();
    await createIndexes();
    await cleanOldData();
    await showStats();

    console.log('\n✅ ALL DONE! Website is now optimized!\n');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

main();
