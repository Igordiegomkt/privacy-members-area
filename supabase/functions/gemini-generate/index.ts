// supabase/functions/gemini-generate/index.ts
// Edge Function responsável por chamar o Gemini a partir de um prompt de texto
// Entrada esperada (POST JSON): { "prompt": "..." }
// Saída: { "generatedText": "..." } ou { "error": "..." }

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

// Modelo pode ser ajustado se você quiser outra variante
const GEMINI_MODEL =
  "models/gemini-1.5-pro"; // caminho padrão da API REST Generative Language

async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

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
    const errorText = await res.text();
    console.error("[gemini-generate] API error:", errorText);
    throw new Error(`Gemini API error (${res.status})`);
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
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    } })
  }
  
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'prompt' field" }),
        { status: 400 },
      );
    }

    // Aqui você pode colocar um “system prompt” padrão, se quiser:
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
      { headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Content-Type': 'application/json'
      }, status: 200 },
    );
  } catch (err) {
    const e = err as Error;
    console.error("[gemini-generate] Error:", e.message);
    const status = e.message === "Missing GEMINI_API_KEY" ? 500 : 500;
    return new Response(
      JSON.stringify({ error: e.message }),
      { headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Content-Type': 'application/json'
      }, status },
    );
  }
});