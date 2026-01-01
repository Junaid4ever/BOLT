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

console.log('\n📦 Creating cohost-qr-codes storage bucket...\n');

const { data, error } = await supabase.storage.createBucket('cohost-qr-codes', {
  public: true,
  fileSizeLimit: 5242880,
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
});

if (error) {
  if (error.message.includes('already exists')) {
    console.log('✅ Bucket already exists!\n');
  } else {
    console.log('❌ Error:', error.message);
    console.log('\nManual steps:');
    console.log('1. Go to Supabase Dashboard > Storage');
    console.log('2. Click "New Bucket"');
    console.log('3. Name: cohost-qr-codes');
    console.log('4. Public bucket: YES');
    console.log('5. File size limit: 5MB');
    console.log('6. Allowed MIME types: image/png, image/jpeg, image/jpg, image/webp\n');
  }
} else {
  console.log('✅ Bucket created successfully!');
  console.log('Bucket ID:', data.name);
  console.log('\n');
}
