// @ts-ignore: Ignoring module resolution for Deno-specific URL imports
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore: Ignoring module resolution for Deno-specific URL imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Declare the Deno global to satisfy the TypeScript compiler in a non-Deno environment.
declare const Deno: any;

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = "gemini-1.5-pro";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1";

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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return createResponse(false, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return createResponse(false, 'BAD_REQUEST', "O campo 'prompt' é obrigatório.");
    }

    if (!GEMINI_API_KEY) {
      return createResponse(false, 'NO_GEMINI_KEY', "GEMINI_API_KEY não configurada.");
    }

    const url = `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

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
      console.error("[gemini-generate] API error:", errorText);
      
      // Tenta detectar erro de limite
      if (errorText.includes("API_KEY_INVALID") || errorText.includes("RESOURCE_EXHAUSTED")) {
        return createResponse(false, 'LIMIT_EXCEEDED', 'O assistente de IA atingiu o limite de uso da conta. Tente novamente mais tarde.');
      }

      return createResponse(false, 'GEMINI_API_ERROR', `Erro na API Gemini (${res.status})`);
    }

    const data = await res.json();
    const rawText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      data?.candidates?.[0]?.output_text ??
      "";

    if (!rawText) {
      return createResponse(false, 'EMPTY_RESPONSE', "Resposta vazia da Gemini.");
    }
    
    // Tenta extrair JSON se o modelo retornar texto envolto
    const jsonStart = rawText.indexOf("{");
    const jsonEnd = rawText.lastIndexOf("}");
    let generatedText = rawText;

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        generatedText = rawText.slice(jsonStart, jsonEnd + 1);
    }

    return createResponse(true, 'SUCCESS', 'Conteúdo gerado.', { generatedText });

  } catch (err) {
    const e = err as Error;
    console.error("[gemini-generate] Error:", e.message);
    return createResponse(false, 'SERVER_ERROR', e.message || 'Erro desconhecido no servidor.');
  }
});