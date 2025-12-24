// @ts-ignore: Deno-specific import
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore: Supabase client for Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
// @ts-ignore: Deno-specific import
import { createHash } from "https://deno.land/std@0.224.0/crypto/mod.ts";

declare const Deno: any;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const createResponse = (ok: boolean, data: any) => {
  return new Response(
    JSON.stringify({ ok, ...data }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
};

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[validate-access-link] Missing Supabase env vars");
}

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

interface Grant {
  scope: 'global' | 'model' | 'product';
  model_id: string | null;
  product_id: string | null;
  expires_at: string | null;
}

/**
 * Calcula o hash SHA-256 de uma string e retorna o resultado em formato hexadecimal (lowercase).
 */
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}


serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return createResponse(false, { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" });
  }

  try {
    const { token: rawToken, visitor_name, visitor_email, user_id } = await req.json();

    if (typeof rawToken !== 'string' || rawToken.length < 10) {
      return createResponse(false, { code: "INVALID_LINK", message: "Token inválido." });
    }
    
    // 1. Normalização do Token
    const token = rawToken.trim();

    // 2. Calcular token_hash (SHA-256 Hex Lowercase)
    const tokenHash = await sha256Hex(token);
    
    // 3. Obter dados do visitante e IP
    const userAgent = req.headers.get('user-agent') || null;
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null;

    // 4. Chamar a RPC para validação e consumo atômico
    // Usamos parâmetros nomeados para evitar problemas de ordem
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('consume_access_link', {
        p_token_hash: tokenHash,
        p_visitor_name: visitor_name || null,
        p_visitor_email: visitor_email || null,
        p_user_id: user_id || null,
        p_user_agent: userAgent,
        p_ip: ipAddress,
    });

    if (rpcError) {
      console.error("[validate-access-link] RPC Error:", rpcError);
      // Retorna erro RPC_ERROR com a mensagem limpa
      return createResponse(false, { code: "RPC_ERROR", message: rpcError.message });
    }
    
    const result = rpcData?.[0];

    if (!result || result.ok === false) {
        // Retorna o código de erro exato da RPC
        const code = result?.code || 'UNKNOWN_VALIDATION_ERROR';
        const message = result?.message || 'Falha na validação do link.';
        return createResponse(false, { code, message });
    }

    // 5. Sucesso: Retorna o grant
    const grant: Grant = {
        scope: result.scope as 'global' | 'model' | 'product',
        model_id: result.model_id,
        product_id: result.product_id,
        expires_at: result.expires_at,
    };
    
    return createResponse(true, { grant });

  } catch (err) {
    const e = err as Error;
    console.error("[validate-access-link] Unexpected Error:", e.message);
    return createResponse(false, { code: "UNEXPECTED_ERROR", message: e.message });
  }
});