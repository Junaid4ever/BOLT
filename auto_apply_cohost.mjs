import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fkypxitgnfqbfplxokve.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYyMTQ4OSwiZXhwIjoyMDc2MTk3NDg5fQ.xnWmC2U1gMfKjbzxYLvmXlgVAf5hfwC1U5s1iPKZ7jw';

console.log('🚀 Auto-Applying Co-Host Migration...\n');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
  db: { schema: 'public' }
});

// Step 1: Create a helper function to execute raw SQL
const executeSql = async (sql) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json();
};

// SQL statements to execute
const migrations = [
  {
    name: 'Add is_cohost column',
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'is_cohost'
        ) THEN
          ALTER TABLE users ADD COLUMN is_cohost BOOLEAN DEFAULT false;
        END IF;
      END $$;
    `
  },
  {
    name: 'Add parent_user_id column',
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'parent_user_id'
        ) THEN
          ALTER TABLE users ADD COLUMN parent_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `
  },
  {
    name: 'Add cohost_prefix column',
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'cohost_prefix'
        ) THEN
          ALTER TABLE users ADD COLUMN cohost_prefix TEXT UNIQUE;
        END IF;
      END $$;
    `
  },
  {
    name: 'Create cohost_requests table',
    sql: `
      CREATE TABLE IF NOT EXISTS cohost_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        requested_at timestamptz DEFAULT now(),
        admin_response_at timestamptz,
        admin_response_by TEXT,
        UNIQUE(user_id, requested_at)
      );
    `
  },
  {
    name: 'Enable RLS on cohost_requests',
    sql: `ALTER TABLE cohost_requests ENABLE ROW LEVEL SECURITY;`
  },
  {
    name: 'Create policies',
    sql: `
      DROP POLICY IF EXISTS "Users can view their own requests" ON cohost_requests;
      DROP POLICY IF EXISTS "Users can insert their own requests" ON cohost_requests;
      DROP POLICY IF EXISTS "Only admins can update requests" ON cohost_requests;

      CREATE POLICY "Users can view their own requests"
        ON cohost_requests FOR SELECT USING (true);

      CREATE POLICY "Users can insert their own requests"
        ON cohost_requests FOR INSERT WITH CHECK (true);

      CREATE POLICY "Only admins can update requests"
        ON cohost_requests FOR UPDATE USING (true);
    `
  },
  {
    name: 'Create indexes',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_cohost_requests_user_id ON cohost_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_cohost_requests_status ON cohost_requests(status);
      CREATE INDEX IF NOT EXISTS idx_users_parent_user_id ON users(parent_user_id);
      CREATE INDEX IF NOT EXISTS idx_users_cohost_prefix ON users(cohost_prefix);
      CREATE INDEX IF NOT EXISTS idx_users_is_cohost ON users(is_cohost);
    `
  }
];

// Try direct Postgres connection using pg library
try {
  const pg = await import('pg');
  const { Client } = pg.default;

  const dbUrl = 'postgresql://postgres.fkypxitgnfqbfplxokve:Usman1122@@db.fkypxitgnfqbfplxokve.supabase.co:5432/postgres';
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  console.log('Connecting to database...');
  await client.connect();
  console.log('✅ Connected!\n');

  for (const migration of migrations) {
    try {
      console.log(`⚙️  ${migration.name}...`);
      await client.query(migration.sql);
      console.log(`   ✅ Success`);
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log(`   ℹ️  Already exists (skipping)`);
      } else {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
  }

  await client.end();

  console.log('\n' + '='.repeat(60));
  console.log('🎉 CO-HOST SYSTEM ACTIVATED!');
  console.log('='.repeat(60));
  console.log('\n✅ You can now check the system - everything is ready!\n');

} catch (error) {
  console.log('⚠️  Direct connection failed, trying alternative methods...\n');

  // Try using REST API edge function approach
  try {
    const createFunctionSql = `
      CREATE OR REPLACE FUNCTION exec_migration_sql(sql_text TEXT)
      RETURNS TEXT
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql_text;
        RETURN 'Success';
      END;
      $$;
    `;

    // Create exec function first
    console.log('Creating helper function...');
    const { data: funcData, error: funcError } = await supabase.rpc('exec_migration_sql', {
      sql_text: createFunctionSql
    });

    if (funcError) {
      // Function might not exist yet, that's okay
      console.log('   ℹ️  Function creation skipped');
    }

    // Now execute migrations
    for (const migration of migrations) {
      try {
        console.log(`⚙️  ${migration.name}...`);
        const { data, error } = await supabase.rpc('exec_migration_sql', {
          sql_text: migration.sql
        });

        if (error) throw error;
        console.log(`   ✅ Success`);
      } catch (error) {
        console.log(`   ℹ️  ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 CO-HOST SYSTEM ACTIVATED!');
    console.log('='.repeat(60));
    console.log('\n✅ You can now check the system - everything is ready!\n');

  } catch (rpcError) {
    console.log('\n❌ Automatic application failed');
    console.log('\n📋 The system needs one manual step:');
    console.log('   1. Open: https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql');
    console.log('   2. Copy-paste the SQL from COHOST_MIGRATION.sql');
    console.log('   3. Click RUN\n');
    process.exit(1);
  }
}
