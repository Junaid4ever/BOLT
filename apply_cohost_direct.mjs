import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import pg from 'pg';
const { Client } = pg;

const supabaseUrl = 'https://fkypxitgnfqbfplxokve.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYyMTQ4OSwiZXhwIjoyMDc2MTk3NDg5fQ.xnWmC2U1gMfKjbzxYLvmXlgVAf5hfwC1U5s1iPKZ7jw';

console.log('🚀 Applying Co-Host Migration Directly...\n');

const sql = readFileSync('./COHOST_MIGRATION_SIMPLE.sql', 'utf-8');

// Try method 1: Direct REST API call to Postgres
console.log('Method 1: Trying REST API...');
try {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ query: sql })
  });

  if (response.ok) {
    console.log('✅ Migration applied via REST API!\n');
    process.exit(0);
  }
} catch (e) {
  console.log('❌ REST API method failed\n');
}

// Try method 2: Using Supabase client with RPC
console.log('Method 2: Trying Supabase RPC...');
const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

try {
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (!error) {
    console.log('✅ Migration applied via RPC!\n');
    process.exit(0);
  }
} catch (e) {
  console.log('❌ RPC method failed\n');
}

// Try method 3: Split SQL and execute via REST
console.log('Method 3: Trying split statements via REST...');
const statements = sql.split(';').filter(s => s.trim());

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i].trim();
  if (!stmt) continue;

  try {
    await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: stmt + ';' })
    });
  } catch (e) {
    // Continue on errors
  }
}

// Final verification
console.log('\n🔍 Verifying setup...');
const { error: verifyError } = await supabase.from('cohost_requests').select('id').limit(1);

if (!verifyError) {
  console.log('✅ Migration successful! Co-Host system is ready!\n');
} else {
  console.log('❌ Migration incomplete. Error:', verifyError.message);
  console.log('\n📋 Run this in Supabase SQL Editor:');
  console.log('https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql\n');
  console.log(sql);
}
