// @ts-ignore: Deno-specific import
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore: Supabase client for Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

declare const Deno: any;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ ok: false, code: "METHOD_NOT_ALLOWED" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    // ranking global de modelos: total de compras pagas
    const { data, error } = await supabase.rpc("get_trending_models_global");

    if (error) {
      console.error("[get-trending-models] RPC error:", error);
      return new Response(
        JSON.stringify({
          ok: false,
          code: "DB_ERROR",
          message: error.message,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        models: data || [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[get-trending-models] Unexpected error:", err);
    return new Response(
      JSON.stringify({
        ok: false,
        code: "UNEXPECTED_ERROR",
        message: err?.message || "Erro inesperado.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});