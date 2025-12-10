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
  console.error("[register-access] Missing Supabase env vars");
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
    const payload = await req.json();

    if (!payload || !payload.name || !payload.ip_address) {
        return new Response(
            JSON.stringify({ ok: false, code: "BAD_REQUEST", message: "Payload incompleto." }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }
    
    // Inserir o payload na tabela first_access usando o Service Role Key
    const { data, error } = await supabaseAdmin
      .from('first_access')
      .insert([payload])
      .select('id')
      .single();

    if (error) {
      console.error("[register-access] DB error:", error);
      return new Response(
        JSON.stringify({ ok: false, code: "DB_ERROR", message: error.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, accessId: data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const e = err as Error;
    console.error("[register-access] Unexpected error:", e.message);
    return new Response(
      JSON.stringify({ ok: false, code: "UNEXPECTED_ERROR", message: e.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});