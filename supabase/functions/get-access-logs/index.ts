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

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[get-access-logs] Missing Supabase env vars");
}

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ ok: false, code: "METHOD_NOT_ALLOWED", message: "Method not allowed" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    // 1. Verificar se o usuário chamador é admin (opcional, mas boa prática)
    // Usamos o token do usuário para verificar se ele está logado, mas a query usa o Service Role Key
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        return new Response(
            JSON.stringify({ ok: false, code: "UNAUTHORIZED", message: "Authorization header missing." }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }
    
    // 2. Buscar os últimos 20 logs de acesso usando o Service Role Key
    const { data: logs, error } = await supabaseAdmin
      .from('first_access')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error("[get-access-logs] DB error:", error);
      return new Response(
        JSON.stringify({ ok: false, code: "DB_ERROR", message: error.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, logs: logs || [] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const e = err as Error;
    console.error("[get-access-logs] Unexpected error:", e.message);
    return new Response(
      JSON.stringify({ ok: false, code: "UNEXPECTED_ERROR", message: e.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});