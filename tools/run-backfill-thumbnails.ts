// To run this script:
// 1. Make sure you have Deno installed (https://deno.land/).
// 2. Create a .env file in this directory with your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
// 3. Run `deno run --allow-env --allow-net run-backfill-thumbnails.ts`

// @ts-ignore: Deno-specific import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import 'https://deno.land/std@0.208.0/dotenv/load.ts';

// Declare Deno global for TypeScript compiler in non-Deno environments
declare const Deno: any;

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file.');
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function backfillThumbnails() {
  console.log('🚀 Starting backfill for video thumbnails...');

  // Find all video media items that don't have a proper thumbnail
  const { data: videos, error } = await supabase
    .from('media_items')
    .select('id, url')
    .eq('type', 'video')
    .or('thumbnail.is.null,thumbnail.like.%/video-fallback.svg');

  if (error) {
    console.error('❌ Error fetching videos:', error.message);
    return;
  }

  if (!videos || videos.length === 0) {
    console.log('✅ No videos found needing thumbnails. All set!');
    return;
  }

  console.log(`🔎 Found ${videos.length} videos to process.`);

  let successCount = 0;
  let errorCount = 0;

  for (const video of videos) {
    try {
      // Extract the storage path from the public URL
      const url = new URL(video.url);
      const path = url.pathname.split('/public/media_items/')[1];

      if (!path) {
        throw new Error(`Could not parse path from URL: ${video.url}`);
      }

      console.log(`- Processing: ${path}`);

      // Manually invoke the Edge Function
      const { error: invokeError } = await supabase.functions.invoke('generate-thumbnail', {
        body: {
          // Mimic the storage object record structure
          record: {
            bucket_id: 'media_items',
            name: path,
          },
        },
      });

      if (invokeError) {
        throw invokeError;
      }

      console.log(`  ✅ Successfully triggered thumbnail generation for ${video.id}`);
      successCount++;
    } catch (err: unknown) {
      console.error(`  ❌ Failed to process video ${video.id}:`, (err as Error).message);
      errorCount++;
    }
  }

  console.log('\n--- 🏁 Backfill Report ---');
  console.log(`Total videos found: ${videos.length}`);
  console.log(`✅ Successfully processed: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log('-------------------------\n');
}

backfillThumbnails();