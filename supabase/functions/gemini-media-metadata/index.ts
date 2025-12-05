// @ts-ignore: Deno-specific import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: Deno-specific import
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";
// @ts-ignore: Deno-specific import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getApiKey() {
  let apiKey = Deno.env.get("GEMINI_API_KEY");
  if (apiKey) return apiKey;
  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data } = await supabaseAdmin.from('settings').select('value').eq('key', 'GEMINI_API_KEY').single();
  return data?.value || null;
}

const generatePrompt = (modelName: string, type: 'image' | 'video', context: string) => {
  const base = `Para uma mídia de uma modelo de conteúdo adulto chamada ${modelName}, gere um JSON com "title" e "description". O tom deve ser sensual e provocante, no estilo da plataforma Privacy.`;
  const typeHint = type === 'image' ? 'A mídia é uma foto.' : 'A mídia é um vídeo.';
  const contextHint = context ? `Contexto adicional: ${context}` : '';
  return `${base} ${typeHint} ${contextHint} O título deve ser curto e magnético. A descrição deve ter 1-2 frases que despertem curiosidade.`;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const API_KEY = await getApiKey();
  if (!API_KEY) return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { modelName, items } = await req.json();
    if (!modelName || !items || !Array.isArray(items)) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const results = [];
    for (const item of items) {
      try {
        const prompt = generatePrompt(modelName, item.type, item.context);
        const result = await model.generateContent(prompt);
        const text = await result.response.text();
        const generated = JSON.parse(text.replace(/```json|```/g, '').trim());
        results.push({ mediaId: item.mediaId, ...generated });
      } catch (e) {
        console.error(`Failed to process media ${item.mediaId}:`, e);
        results.push({ mediaId: item.mediaId, title: null, description: null, error: e.message });
      }
    }

    return new Response(JSON.stringify({ results }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});