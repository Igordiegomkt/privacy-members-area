// @ts-ignore: Deno-specific import
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

declare const Deno: any;

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Cria uma resposta padronizada com status 200 para evitar erros non-2xx no invoke.
 */
const createResponse = (ok: boolean, data: any) => {
  return new Response(
    JSON.stringify({ ok, ...data }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  if (req.method !== 'POST') {
    return createResponse(false, { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
  }

  if (!OPENAI_API_KEY) {
    return createResponse(false, { code: 'NO_OPENAI_KEY', message: 'OPENAI_API_KEY não configurada.' });
  }

  try {
    const { contentType, context, language } = await req.json();

    if (!context || typeof context !== 'string' || context.trim() === '') {
      return createResponse(false, { code: 'MISSING_CONTEXT', message: "O contexto ou descrição é obrigatório." });
    }

    const lang = language || "pt-BR";

    const systemPrompt = `
Você é o AGENTE MESTRE DE COPYWRITING do MeuPrivacy.

Seu trabalho é transformar qualquer descrição simples fornecida pelo admin
em:

1. TÍTULO curto e persuasivo (máx. 8 palavras)
2. SUBTÍTULO sensual e vendedor (máx. 12 palavras)
3. DESCRIÇÃO em estilo de post de modelo premium, com foco em desejo e curiosidade.
4. CTA forte (ex: "Clique agora para desbloquear", "Veja tudo sem censura", "Assine e veja o restante")
5. TAGS recomendadas (hashtags simples, sem # explícito, ex: ["vip", "exclusive", "banho", "casal"])

Regras:
- Sempre escreva em ${lang}.
- Estilo sensual, mas nunca vulgar explícito (não use palavrões).
- Não fale que é IA.
- Não explique o que está fazendo.
- Nunca devolva texto solto: SEMPRE devolva APENAS um JSON válido.

Formato EXATO de resposta (JSON):
{
  "title": "string",
  "subtitle": "string",
  "description": "string",
  "cta": "string",
  "tags": ["tag1", "tag2"]
}
`;

    const userPrompt = `
Tipo de conteúdo: ${contentType || 'general'}
Contexto fornecido pelo admin: """${context}"""
Gere o melhor conteúdo possível seguindo as regras do sistema.
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.9,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" }, // Solicita JSON
      }),
    });

    const json = await response.json();

    if (!response.ok) {
      const errorMessage = json.error?.message || `OpenAI API error (${response.status})`;
      console.error("[ai-generate-content] API Error:", errorMessage, json);
      return createResponse(false, { 
        code: 'OPENAI_API_ERROR', 
        message: errorMessage,
        details: JSON.stringify(json)
      });
    }

    const raw = json.choices?.[0]?.message?.content ?? "";

    if (!raw) {
      return createResponse(false, { code: 'EMPTY_RESPONSE', message: "A IA retornou uma resposta vazia." });
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(raw);
    } catch (e) {
      console.error("[ai-generate-content] JSON Parse Error:", e, raw);
      return createResponse(false, { code: 'BAD_JSON', message: "A IA retornou um JSON inválido.", raw });
    }

    return createResponse(true, { data: parsedData });

  } catch (err) {
    const e = err as Error;
    console.error("[ai-generate-content] Unexpected Error:", e.message);
    return createResponse(false, { 
      code: 'UNEXPECTED_ERROR', 
      message: e.message || 'Erro inesperado ao gerar conteúdo.' 
    });
  }
});