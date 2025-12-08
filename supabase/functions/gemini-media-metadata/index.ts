// @ts-ignore: Ignoring module resolution for Deno-specific URL imports
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore: Ignoring module resolution for Deno-specific URL imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Declare the Deno global to satisfy the TypeScript compiler in a non-Deno environment.
declare const Deno: any;

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = "gemini-1.5-pro";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Cria uma resposta de erro padronizada com status 200 para evitar erros non-2xx no invoke.
 */
const createResponse = (ok: boolean, code: string, message: string, data?: any) => {
  return new Response(
    JSON.stringify({ ok, code, message, ...data }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
};

async function callGeminiForMedia(
  modelName: string,
  modelUsername: string,
  item: any,
): Promise<any> {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const url = `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
  const baseContext = item.context?.trim() || "";
  const mediaLabel = item.type === "video" ? "vídeo" : "foto";

  const prompt = `
Você é um assistente de copywriting para uma plataforma de assinaturas no estilo Privacy.

MODELO:
- Nome: ${modelName}
- Username: @${modelUsername}

MÍDIA:
- Tipo: ${mediaLabel}
- Contexto: "${baseContext}"

TAREFA:
Gere metadados em português do Brasil para essa mídia.

Regras:
- "title": título curto, chamativo, sensual porém elegante (máx. ~60 caracteres).
- "description": 1 a 3 frases descrevendo a cena de forma provocante, sem ser explícita.
- "cta": chamada para ação curta incentivando a desbloquear ou assistir o conteúdo.
- "tags": array de 3 a 7 palavras-chave em minúsculo, sem #, focadas em contexto/tema.

RETORNO:
Responda APENAS em JSON VÁLIDO, no formato:

{
  "title": "...",
  "description": "...",
  "cta": "...",
  "tags": ["tag1", "tag2", "tag3"]
}
`.trim();

  const body = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[gemini-media-metadata] API error:", errorText);
    throw new Error(`Gemini API error (${res.status})`);
  }

  const data = await res.json();
  const rawText =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    data?.candidates?.[0]?.output_text ??
    "";

  if (!rawText) {
    throw new Error("Empty response from Gemini");
  }

  const jsonStart = rawText.indexOf("{");
  const jsonEnd = rawText.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    console.error("[gemini-media-metadata] Raw response:", rawText);
    throw new Error("Could not find JSON block in Gemini response");
  }

  const jsonString = rawText.slice(jsonStart, jsonEnd + 1);

  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    console.error("[gemini-media-metadata] JSON parse error:", e, rawText);
    throw new Error("Invalid JSON from Gemini");
  }

  const title = (parsed.title || "").toString().trim();
  const description = (parsed.description || "").toString().trim();
  const cta = (parsed.cta || "").toString().trim();
  const tags: string[] = Array.isArray(parsed.tags)
    ? parsed.tags.map((t: any) => t.toString().trim()).filter(Boolean)
    : [];

  return {
    mediaId: item.mediaId,
    title,
    description,
    cta,
    tags,
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return createResponse(false, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  try {
    const { modelName, modelUsername, items } = await req.json();

    if (!modelName || !modelUsername || !Array.isArray(items)) {
      return createResponse(false, 'BAD_REQUEST', "Campos obrigatórios: 'modelName', 'modelUsername' e 'items' (array)");
    }

    const incomingItems: any[] = items;
    const results: any[] = [];

    for (const item of incomingItems) {
      try {
        const meta = await callGeminiForMedia(
          modelName,
          modelUsername,
          item,
        );
        results.push(meta);

        const updatePayload: Record<string, unknown> = {
          title: meta.title,
          description: meta.description,
        };

        // Atualiza o Supabase usando o Service Role Key (admin client)
        const { error: updateError } = await supabase
          .from("media_items")
          .update(updatePayload)
          .eq("id", meta.mediaId);

        if (updateError) {
          console.error(
            "[gemini-media-metadata] Supabase update error:",
            updateError,
          );
        }
      } catch (itemErr) {
        console.error(
          `[gemini-media-metadata] Error processing mediaId=${item.mediaId}:`,
          itemErr,
        );
      }
    }

    return createResponse(true, 'SUCCESS', 'Metadata generated and saved.', { results });
  } catch (err) {
    const e = err as Error;
    console.error("[gemini-media-metadata] Error:", e.message);
    return createResponse(false, 'SERVER_ERROR', e.message || 'Erro desconhecido no servidor.');
  }
});