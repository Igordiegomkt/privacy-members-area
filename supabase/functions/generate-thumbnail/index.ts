// @ts-ignore: Ignoring module resolution for Deno-specific URL imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: Ignoring module resolution for Deno-specific URL imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore: Ignoring module resolution for Deno-specific URL imports
import { Command } from "https://deno.land/x/command@v0.0.7/mod.ts";

// Declare the Deno global to satisfy the TypeScript compiler in a non-Deno environment.
declare const Deno: any;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STORAGE_BUCKET = "media_items"; // O bucket de storage
const THUMBNAILS_FOLDER = "thumbnails"; // Pasta para salvar as thumbnails
const MEDIA_TABLE = "media_items"; // Tabela de mídias

const log = (message: string) => console.log(`[generate-thumbnail] ${message}`);

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { record } = await req.json();

    if (!record || record.bucket_id !== STORAGE_BUCKET) {
      log(`Ignorando evento para bucket: ${record?.bucket_id}`);
      return new Response("OK", { status: 200 });
    }

    const videoPath = record.name;
    if (!videoPath.match(/\.(mp4|mov|m4v|webm|avi)$/i)) {
      log(`Arquivo não é um vídeo: ${videoPath}`);
      return new Response("Not a video", { status: 200 });
    }
    log(`Processando vídeo: ${videoPath}`);

    // 1. Baixar o vídeo
    const { data: videoBlob, error: downloadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(videoPath);

    if (downloadError) throw new Error(`Falha ao baixar vídeo: ${downloadError.message}`);
    const videoBytes = new Uint8Array(await videoBlob.arrayBuffer());
    const tempVideoPath = `/tmp/${crypto.randomUUID()}.mp4`;
    await Deno.writeFile(tempVideoPath, videoBytes);
    log(`Vídeo salvo temporariamente em: ${tempVideoPath}`);

    // 2. Gerar thumbnail com FFmpeg
    const tempThumbPath = `/tmp/${crypto.randomUUID()}.jpg`;
    const ffmpeg = new Command("ffmpeg", {
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
    const { code, stderr } = await ffmpeg.output();
    if (code !== 0) throw new Error(`Erro FFmpeg: ${new TextDecoder().decode(stderr)}`);
    log(`Thumbnail gerada em: ${tempThumbPath}`);

    // 3. Upload da thumbnail
    const thumbBytes = await Deno.readFile(tempThumbPath);
    const baseName = videoPath.substring(videoPath.lastIndexOf('/') + 1, videoPath.lastIndexOf('.'));
    const thumbStoragePath = `${THUMBNAILS_FOLDER}/${baseName}.jpg`;
    
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(thumbStoragePath, thumbBytes, { contentType: 'image/jpeg', upsert: true });

    if (uploadError) throw new Error(`Falha no upload da thumbnail: ${uploadError.message}`);
    log(`Thumbnail enviada para: ${thumbStoragePath}`);

    // 4. Obter URL pública e atualizar o banco
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(thumbStoragePath);

    const videoPublicUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${videoPath}`;
    
    const { error: updateError } = await supabase
      .from(MEDIA_TABLE)
      .update({ thumbnail: publicUrl })
      .eq("url", videoPublicUrl);

    if (updateError) throw new Error(`Falha ao atualizar tabela de mídias: ${updateError.message}`);
    log(`Tabela '${MEDIA_TABLE}' atualizada com a URL da thumbnail.`);

    // 5. Limpar arquivos temporários
    await Deno.remove(tempVideoPath);
    await Deno.remove(tempThumbPath);

    return new Response(JSON.stringify({ success: true, thumbnail: publicUrl }), { status: 200 });
  } catch (e) {
    const err = e as Error;
    console.error("[generate-thumbnail] Erro:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});