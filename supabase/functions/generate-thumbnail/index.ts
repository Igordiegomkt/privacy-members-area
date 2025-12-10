// @ts-ignore: Ignoring module resolution for Deno-specific URL imports
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore: Ignoring module resolution for Deno-specific URL imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Declare the Deno global to satisfy the TypeScript compiler in a non-Deno environment.
declare const Deno: any;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const STORAGE_BUCKET = "media_items";
const THUMBNAILS_FOLDER = "thumbnails";
const MEDIA_TABLE = "media_items";

const log = (msg: string) => console.log(`[generate-thumbnail] ${msg}`);

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { record } = await req.json();

    if (!record || record.bucket_id !== STORAGE_BUCKET) {
      log(`Ignorando evento para bucket ${record?.bucket_id}`);
      return new Response("OK", { status: 200 });
    }

    const videoPath: string = record.name;

    if (!videoPath.match(/\.(mp4|mov|m4v|webm|avi)$/i)) {
      log(`Arquivo não é vídeo: ${videoPath}`);
      return new Response("Not a video", { status: 200 });
    }

    log(`Processando vídeo: ${videoPath}`);

    const { data: videoBlob, error: downloadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(videoPath);

    if (downloadError || !videoBlob) {
      throw new Error(`Falha ao baixar vídeo: ${downloadError?.message}`);
    }

    const videoBytes = new Uint8Array(await videoBlob.arrayBuffer());
    const tempVideoPath = `/tmp/${crypto.randomUUID()}.mp4`;
    await Deno.writeFile(tempVideoPath, videoBytes);
    log(`Vídeo salvo em ${tempVideoPath}`);

    const tempThumbPath = `/tmp/${crypto.randomUUID()}.jpg`;

    const ffmpegCmd = new Deno.Command("ffmpeg", {
      args: [
        "-y",
        "-i", tempVideoPath,
        "-ss", "0.5",
        "-vframes", "1",
        "-vf", "scale=-1:480",
        "-qscale:v", "3",
        tempThumbPath,
      ],
    });

    const { code, stderr } = await ffmpegCmd.output();
    if (code !== 0) {
      const errorText = new TextDecoder().decode(stderr);
      throw new Error(`Erro FFmpeg: ${errorText}`);
    }

    log(`Thumbnail gerada em ${tempThumbPath}`);

    const thumbBytes = await Deno.readFile(tempThumbPath);

    const baseName = videoPath.substring(
      videoPath.lastIndexOf("/") + 1,
      videoPath.lastIndexOf(".")
    );
    const thumbStoragePath = `${THUMBNAILS_FOLDER}/${baseName}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(thumbStoragePath, thumbBytes, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Falha no upload da thumbnail: ${uploadError.message}`);
    }

    log(`Thumbnail enviada para ${thumbStoragePath}`);

    const { data: publicData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(thumbStoragePath);

    const publicUrl = publicData.publicUrl;

    const videoPublicUrl =
      `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${videoPath}`;

    const { error: updateError } = await supabase
      .from(MEDIA_TABLE)
      .update({ thumbnail: publicUrl })
      .eq("url", videoPublicUrl);

    if (updateError) {
      throw new Error(`Erro ao atualizar media_items: ${updateError.message}`);
    }

    log(`Tabela ${MEDIA_TABLE} atualizada para ${videoPublicUrl}`);

    await Deno.remove(tempVideoPath).catch(() => {});
    await Deno.remove(tempThumbPath).catch(() => {});

    return new Response(
      JSON.stringify({ success: true, thumbnail: publicUrl }),
      { status: 200 },
    );
  } catch (err) {
    const e = err as Error;
    console.error("[generate-thumbnail] Erro:", e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});