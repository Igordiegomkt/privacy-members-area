// @ts-ignore: Deno-specific import
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

declare const Deno: any;

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
// Use gpt-4o-mini para capacidades de visão
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
    const { contentType, context, imageUrl, language } = await req.json();

    if (!context && !imageUrl) {
      return createResponse(false, { code: 'MISSING_CONTEXT', message: "O contexto ou a URL da imagem é obrigatório." });
    }

    const lang = language || "pt-BR";

    const systemPrompt = `
Você é o AGENTE MESTRE DE COPYWRITING SAFADO do MeuPrivacy.

Seu trabalho é pegar a descrição do admin e/ou a análise visual da imagem e transformar em texto que VENDE desejo no feed.

Sempre gere:

1. "title": título bem curto, direto, que chama atenção na hora (máx. 6–8 palavras).
2. "subtitle": frase de impacto, sensual e provocante, como se a modelo estivesse chamando a pessoa pra ver mais.
3. "description": texto em estilo de legenda de rede social, com 2 a 5 frases curtas, misturando clima íntimo, bastidor e provocação.
4. "cta": chamada pra ação direta, do tipo: "Desbloqueia e vem ver tudo sem censura 😈", "Clica pra ver o que rolou depois 🔥", "Assina e sente de perto essa safadeza 😏".
5. "tags": lista de palavras-chave em minúsculo, sem #, ex: ["banheira", "espuma", "noite", "vip"].

Regras de estilo:

Escreva SEMPRE em ${lang}.

Pode usar emojis, mas no máximo 2 ou 3 por campo.

Nada de palavrões pesados ou descrição gráfica de sexo.

Nada de parecer texto corporativo. Esqueça termos formais.

Fale com a pessoa como se fosse a modelo: tom íntimo, safado e leve.

Não use termos como "conteúdo", "usuário", "plataforma" em excesso.

Nunca diga que você é uma IA.

Nunca explique o que está fazendo.

Se uma imagem for fornecida, use a análise visual para enriquecer a copy, focando em: localização, pose, corpo, roupa, iluminação e mood sensual.

Nunca devolva texto solto: SEMPRE retorne APENAS um JSON válido.

Formato EXATO da resposta (JSON):
{
  "title": "string",
  "subtitle": "string",
  "description": "string",
  "cta": "string",
  "tags": ["tag1", "tag2"]
}
`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    const userContent: any[] = [];

    if (imageUrl) {
        userContent.push({
            type: "image_url",
            image_url: {
                url: imageUrl,
                detail: "low", // Usando low detail para eficiência de custo
            },
        });
    }

    const textPrompt = `
Tipo de conteúdo: ${contentType || 'general'}
Contexto fornecido pelo admin: """${context || 'Nenhum contexto adicional.'}"""
Gere o melhor conteúdo possível seguindo as regras do sistema.
`;
    userContent.push({ type: "text", text: textPrompt });

    messages.push({ role: "user", content: userContent });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.9,
        messages: messages,
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