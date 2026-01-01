import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY;

console.log('Using Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBucket() {
  try {
    console.log('\n📦 Checking storage buckets...\n');

    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error('❌ Error listing buckets:', error);
      return;
    }

    console.log('✅ Available buckets:', buckets?.map(b => b.name).join(', '));

    const meetingBucket = buckets?.find(b => b.name === 'meeting-screenshots');

    if (!meetingBucket) {
      console.log('\n⚠️  meeting-screenshots bucket NOT found!');
      console.log('🔧 Creating bucket...\n');

      const { data, error: createError } = await supabase.storage.createBucket('meeting-screenshots', {
        public: true,
        fileSizeLimit: 5242880,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
      });

      if (createError) {
        console.error('❌ Error creating bucket:', createError);
      } else {
        console.log('✅ Bucket created successfully!');
      }
    } else {
      console.log('\n✅ meeting-screenshots bucket exists!');
      console.log('   Public:', meetingBucket.public);
      console.log('   File size limit:', meetingBucket.file_size_limit);
    }

    // Test upload
    console.log('\n🧪 Testing screenshot upload...\n');
    const testFile = Buffer.from('test');
    const testFileName = `test_${Date.now()}.txt`;

    const { error: uploadError } = await supabase.storage
      .from('meeting-screenshots')
      .upload(testFileName, testFile);

    if (uploadError) {
      console.error('❌ Test upload failed:', uploadError);
    } else {
      console.log('✅ Test upload successful!');

      // Clean up test file
      await supabase.storage
        .from('meeting-screenshots')
        .remove([testFileName]);

      console.log('✅ Test cleanup complete!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkBucket();
