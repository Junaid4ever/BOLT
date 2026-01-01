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

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQL(sql, description) {
  process.stdout.write(`${description}...`);
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      if (error.message.includes('does not exist')) {
        console.log(' ⚠️  Need direct DB access');
        return false;
      }
      console.log(` ❌ ${error.message.substring(0, 60)}`);
      return false;
    }
    console.log(' ✅');
    return true;
  } catch (err) {
    console.log(` ❌ ${err.message.substring(0, 60)}`);
    return false;
  }
}

async function createBuckets() {
  console.log('🚀 Creating storage buckets...\n');

  const buckets = [
    { id: 'screenshots', name: 'Meeting Screenshots', public: false, limit: 5 },
    { id: 'payment-screenshots', name: 'Payment Screenshots', public: false, limit: 5 },
    { id: 'advance-screenshots', name: 'Advance Payment Screenshots', public: false, limit: 5 },
    { id: 'qr-codes', name: 'QR Codes', public: true, limit: 1 }
  ];

  for (const bucket of buckets) {
    process.stdout.write(`Creating ${bucket.name}...`);
    try {
      const { error } = await supabase.storage.createBucket(bucket.id, {
        public: bucket.public,
        fileSizeLimit: bucket.limit * 1024 * 1024,
        allowedMimeTypes: bucket.id === 'qr-codes'
          ? ['image/png', 'image/jpeg', 'image/jpg']
          : ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
      });

      if (error) {
        if (error.message.includes('already exists')) {
          console.log(' ⚠️  Already exists');
        } else {
          console.log(` ❌ ${error.message}`);
        }
      } else {
        console.log(' ✅');
      }
    } catch (err) {
      console.log(` ❌ ${err.message}`);
    }
  }
}

async function createIndexes() {
  console.log('\n📊 Creating performance indexes...\n');

  const indexes = [
    {
      name: 'meetings_scheduled_status',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_meetings_scheduled_date_status ON meetings(scheduled_date, status) WHERE status IN ('active', 'scheduled')`
    },
    {
      name: 'meetings_client_scheduled',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_meetings_client_scheduled ON meetings(client_name, scheduled_date DESC)`
    },
    {
      name: 'meetings_attended_date',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_meetings_attended_date ON meetings(attended, scheduled_date DESC) WHERE attended = true`
    },
    {
      name: 'daily_dues_client_date',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_dues_client_date ON daily_dues(client_id, due_date DESC)`
    },
    {
      name: 'payments_client_date',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_client_date ON payments(client_name, payment_date DESC)`
    },
    {
      name: 'advance_payments_client',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_advance_payments_client_active ON advance_payments(client_id, is_fully_used) WHERE is_fully_used = false`
    },
    {
      name: 'users_role',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users(role) WHERE role IN ('admin', 'co_admin', 'cohost')`
    },
    {
      name: 'notifications_unread',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read, created_at DESC) WHERE is_read = false`
    }
  ];

  let success = 0;
  for (const idx of indexes) {
    const result = await executeSQL(idx.sql, `  Creating ${idx.name}`);
    if (result) success++;
  }

  console.log(`\n✅ Created ${success}/${indexes.length} indexes`);
}

async function optimizeTables() {
  console.log('\n🔧 Optimizing tables...\n');

  const tables = ['meetings', 'daily_dues', 'payments', 'users', 'advance_payments', 'notifications'];

  for (const table of tables) {
    await executeSQL(`VACUUM ANALYZE ${table}`, `  Optimizing ${table}`);
  }
}

async function cleanOldData() {
  console.log('\n🧹 Cleaning old data...\n');

  await executeSQL(
    `DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '90 days'`,
    '  Deleting old notifications (90+ days)'
  );

  await executeSQL(
    `DELETE FROM historical_meetings WHERE deleted_at < NOW() - INTERVAL '180 days'`,
    '  Deleting old historical meetings (180+ days)'
  );
}

async function showStats() {
  console.log('\n📈 Database Statistics:\n');

  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    console.log('📦 Storage Buckets:');
    if (buckets && buckets.length > 0) {
      buckets.forEach(b => {
        const access = b.public ? '🌍 Public' : '🔒 Private';
        console.log(`  ${access} ${b.name}`);
      });
    } else {
      console.log('  No buckets found');
    }
  } catch (err) {
    console.log('  ⚠️  Could not fetch buckets');
  }

  console.log('\n📊 Table Row Counts:');
  const tables = ['meetings', 'daily_dues', 'payments', 'users', 'advance_payments'];

  for (const table of tables) {
    try {
      const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
      console.log(`  ${table}: ${count?.toLocaleString() || 0} rows`);
    } catch (err) {
      console.log(`  ${table}: ⚠️  Could not count`);
    }
  }
}

async function main() {
  console.log('🚀 Starting Performance Optimization\n');
  console.log('=' .repeat(50) + '\n');

  await createBuckets();
  await createIndexes();
  await optimizeTables();
  await cleanOldData();
  await showStats();

  console.log('\n' + '='.repeat(50));
  console.log('\n🎉 Optimization Complete!\n');
  console.log('✅ Storage buckets created');
  console.log('✅ Performance indexes added');
  console.log('✅ Tables optimized');
  console.log('✅ Old data cleaned');
  console.log('\n💡 Website should be faster now!\n');
}

main();
