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

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

console.log('🚀 Fixing everything automatically...\n');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createBuckets() {
  console.log('📦 Creating storage buckets...');

  const buckets = [
    { id: 'screenshots', public: false },
    { id: 'payment-screenshots', public: false },
    { id: 'advance-screenshots', public: false },
    { id: 'qr-codes', public: true }
  ];

  for (const bucket of buckets) {
    try {
      const { data, error } = await supabase.storage.createBucket(bucket.id, {
        public: bucket.public,
        fileSizeLimit: 5242880
      });

      await sleep(500);

      if (error) {
        if (error.message.includes('already exists')) {
          console.log(`  ✅ ${bucket.id} (already exists)`);
        } else {
          console.log(`  ⚠️  ${bucket.id}: ${error.message.substring(0, 50)}`);
        }
      } else {
        console.log(`  ✅ ${bucket.id} created`);
      }
    } catch (err) {
      console.log(`  ⚠️  ${bucket.id}: ${err.message.substring(0, 50)}`);
    }
  }
}

async function cleanOldData() {
  console.log('\n🧹 Cleaning old data...');

  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const { error: notifError, count } = await supabase
      .from('notifications')
      .delete({ count: 'exact' })
      .lt('created_at', ninetyDaysAgo);

    if (!notifError) {
      console.log(`  ✅ Deleted ${count || 0} old notifications`);
    } else {
      console.log(`  ⚠️  Notifications: ${notifError.message.substring(0, 50)}`);
    }

    await sleep(500);

    const oneEightyDaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

    const { error: histError, count: histCount } = await supabase
      .from('historical_meetings')
      .delete({ count: 'exact' })
      .lt('deleted_at', oneEightyDaysAgo);

    if (!histError) {
      console.log(`  ✅ Deleted ${histCount || 0} old historical meetings`);
    } else {
      console.log(`  ⚠️  Historical: ${histError.message.substring(0, 50)}`);
    }
  } catch (err) {
    console.log(`  ⚠️  Cleanup error: ${err.message.substring(0, 50)}`);
  }
}

async function showStats() {
  console.log('\n📈 Database statistics:');

  const tables = ['meetings', 'daily_dues', 'payments', 'users', 'advance_payments'];

  for (const table of tables) {
    try {
      const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
      console.log(`  ${table}: ${count?.toLocaleString() || 0} rows`);
      await sleep(300);
    } catch (err) {
      console.log(`  ${table}: error counting`);
    }
  }

  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    console.log(`\n📦 Storage buckets (${buckets?.length || 0} total):`);
    buckets?.forEach(b => {
      console.log(`  ${b.public ? '🌍' : '🔒'} ${b.name}`);
    });
  } catch (err) {
    console.log('  ⚠️  Could not list buckets');
  }
}

async function main() {
  try {
    await createBuckets();
    await cleanOldData();
    await showStats();

    console.log('\n' + '='.repeat(50));
    console.log('\n✅ DONE! Basic optimizations applied.');
    console.log('\n⚠️  NOTE: Performance indexes need to be created');
    console.log('in Supabase SQL Editor. Run this:\n');
    console.log('CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_date_status');
    console.log('  ON meetings(scheduled_date, status);');
    console.log('CREATE INDEX IF NOT EXISTS idx_meetings_client_scheduled');
    console.log('  ON meetings(client_name, scheduled_date DESC);');
    console.log('CREATE INDEX IF NOT EXISTS idx_daily_dues_client_date');
    console.log('  ON daily_dues(client_id, due_date DESC);');
    console.log('CREATE INDEX IF NOT EXISTS idx_payments_client_date');
    console.log('  ON payments(client_name, payment_date DESC);');
    console.log('\n' + '='.repeat(50) + '\n');
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
  }
}

main();
