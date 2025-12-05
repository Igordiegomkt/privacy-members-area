// @ts-ignore: Deno-specific import
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Declare Deno global to satisfy TypeScript compiler in non-Deno environments
declare const Deno: any;

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = "gemini-1.5-pro";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const url = `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({ error: { message: "Failed to parse Gemini error response." } }));
    console.error("[gemini-generate] API error:", JSON.stringify(errorJson, null, 2));
    throw new Error(`Gemini API error (${res.status}): ${errorJson.error.message}`);
  }

  const data = await res.json();

  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    data?.candidates?.[0]?.output_text ??
    "";

  if (!text) {
    throw new Error("Empty response from Gemini");
  }

  return text.trim();
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'prompt' field" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const wrappedPrompt = `
Você é um assistente de copywriting focado em conteúdo sensual, porém elegante,
para uma plataforma de assinaturas no estilo Privacy.
Respeite sempre um tom sexy, mas sem ser explícito demais.

Instruções:
- Escreva em português do Brasil.
- Use emojis com moderação.
- Não mencione que é IA ou modelo de linguagem.

Agora gere o conteúdo a partir deste pedido:

${prompt}
`.trim();

    const generatedText = await callGemini(wrappedPrompt);

    return new Response(
      JSON.stringify({ generatedText }),
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    const e = err as Error;
    console.error("[gemini-generate] Error:", e.message);
    
    if (e.message?.includes("quota") || e.message?.includes("limit")) {
      return new Response(JSON.stringify({
        error: "LIMIT_EXCEEDED",
        message: "Você atingiu o limite de uso da IA. Tente novamente mais tarde."
      }), { status: 429, headers: corsHeaders });
    }

    return new Response(
      JSON.stringify({ error: "GEMINI_API_ERROR", details: e.message }),
      { status: 500, headers: corsHeaders },
    );
  }
});