import { supabase } from '../lib/supabase';

const BUCKET_NAME = 'meeting-screenshots';

export async function ensureBucketExists() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);

  if (!bucketExists) {
    await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 5242880,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    });
  }
}

export async function uploadScreenshot(file: File, meetingId: string): Promise<string | null> {
  try {
    await ensureBucketExists();

    const timestamp = Date.now();
    const fileName = `${meetingId}_${timestamp}.${file.name.split('.').pop()}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Screenshot upload failed:', error);
    return null;
  }
}

export async function deleteScreenshot(url: string): Promise<boolean> {
  try {
    const fileName = url.split('/').pop();
    if (!fileName) return false;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([fileName]);

    return !error;
  } catch (error) {
    console.error('Screenshot deletion failed:', error);
    return false;
  }
}

export function getScreenshotUrl(url: string): string {
  if (url.startsWith('data:') || url.startsWith('http')) {
    return url;
  }

  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(url);

  return data.publicUrl;
}
