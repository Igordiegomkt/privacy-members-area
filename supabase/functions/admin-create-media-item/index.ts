// @ts-ignore: Deno-specific import
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore: Supabase client for Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

declare const Deno: any;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const createResponse = (ok: boolean, data: any) => {
  return new Response(
    JSON.stringify({ ok, ...data }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
};

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[admin-create-media-item] Missing Supabase env vars");
}

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

interface AiResult {
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  tags: string[];
}

interface MediaPayload {
  file_url: string;
  thumbnail_url: string;
  content_type: 'image' | 'video';
  is_free?: boolean;
  product_id?: string;
  ai: AiResult;
}

interface RequestBody {
  model_id: string;
  media: MediaPayload;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return createResponse(false, { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" });
  }

  try {
    const body: RequestBody = await req.json();
    const { model_id, media } = body;

    if (!model_id || !media || !media.file_url || !media.thumbnail_url || !media.content_type) {
      return createResponse(false, { code: "BAD_REQUEST", message: "Payload incompleto." });
    }

    const { ai } = media;

    // 1. Inserir em media_items (usando Service Role Key para ignorar RLS)
    const mediaItemPayload = {
      model_id: model_id,
      url: media.file_url,
      thumbnail: media.thumbnail_url,
      type: media.content_type,
      is_free: media.is_free ?? false,
      
      // Campos principais preenchidos pela IA
      title: ai.title,
      subtitle: ai.subtitle,
      description: ai.description,
      cta: ai.cta,
      tags: ai.tags,

      // Campos de rastreamento da IA
      ai_title: ai.title,
      ai_subtitle: ai.subtitle,
      ai_description: ai.description,
      ai_cta: ai.cta,
      ai_tags: ai.tags,
    };

    const { data: insertedMedia, error: mediaError } = await supabaseAdmin
      .from('media_items')
      .insert([mediaItemPayload])
      .select('id')
      .single();

    if (mediaError || !insertedMedia) {
      console.error("[admin-create-media-item] Media insert error:", mediaError);
      return createResponse(false, { code: "DB_MEDIA_ERROR", message: mediaError?.message || "Erro ao inserir mídia." });
    }

    const mediaId = insertedMedia.id;

    // 2. Inserir em model_feed e global_feed
    const feedPayload = {
      model_id: model_id,
      media_id: mediaId,
      title: ai.title,
      subtitle: ai.subtitle,
      description: ai.description,
      cta: ai.cta,
      // created_at é default NOW()
    };

    const { error: modelFeedError } = await supabaseAdmin
      .from('model_feed')
      .insert([feedPayload]);

    if (modelFeedError) {
      console.error("[admin-create-media-item] Model Feed insert error:", modelFeedError);
      // Não é fatal, mas deve ser logado
    }

    const { error: globalFeedError } = await supabaseAdmin
      .from('global_feed')
      .insert([feedPayload]);

    if (globalFeedError) {
      console.error("[admin-create-media-item] Global Feed insert error:", globalFeedError);
      // Não é fatal, mas deve ser logado
    }
    
    // 3. Vincular ao produto (se product_id for fornecido)
    if (media.product_id) {
        const { error: productMediaError } = await supabaseAdmin
            .from('product_media')
            .insert([{ product_id: media.product_id, media_id: mediaId }]);
            
        if (productMediaError) {
            console.error("[admin-create-media-item] Product Media link error:", productMediaError);
        }
    }


    return createResponse(true, { media_id: mediaId });

  } catch (err) {
    const e = err as Error;
    console.error("[admin-create-media-item] Unexpected Error:", e.message);
    return createResponse(false, { code: "UNEXPECTED_ERROR", message: e.message });
  }
});