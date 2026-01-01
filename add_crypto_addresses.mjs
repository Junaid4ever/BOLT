import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY
);

console.log('\n🔧 Adding BEP20 and TRC20 address columns...\n');

const { data, error } = await supabase.rpc('exec_sql', {
  sql: `
    ALTER TABLE payment_methods
    ADD COLUMN IF NOT EXISTS bep20_address text,
    ADD COLUMN IF NOT EXISTS trc20_address text;
  `
});

if (error) {
  console.log('❌ Error:', error.message);
  console.log('\nTrying alternative method...\n');

  const sql = `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payment_methods' AND column_name = 'bep20_address'
      ) THEN
        ALTER TABLE payment_methods ADD COLUMN bep20_address text;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payment_methods' AND column_name = 'trc20_address'
      ) THEN
        ALTER TABLE payment_methods ADD COLUMN trc20_address text;
      END IF;
    END $$;
  `;

  console.log('SQL to execute manually in Supabase SQL Editor:\n');
  console.log(sql);
} else {
  console.log('✅ Columns added successfully!\n');
}
