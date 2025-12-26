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
  link_type: 'access' | 'grant'; // Adicionado link_type
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
    const body = await req.json();
    const rawToken = body.token;
    const user_id = body.user_id;

    // Compatibilidade de nomes de campos
    const visitor_name = body.visitor_name || body.name || body.nome || null;
    const visitor_email = body.visitor_email || body.email || null;

    if (typeof rawToken !== 'string' || rawToken.length < 10) {
      return createResponse(false, { code: "INVALID_LINK", message: "Token inválido." });
    }
    
    // 1. Validação de Email Obrigatório (Frontend já faz, mas reforçamos)
    if (!visitor_email || typeof visitor_email !== 'string' || !visitor_email.includes('@')) {
        return createResponse(false, { code: "EMAIL_REQUIRED", message: "O email é obrigatório para validar o acesso." });
    }
    
    // 2. Normalização do Token e Hash
    const token = rawToken.trim();
    const tokenHash = await sha256Hex(token);
    
    // 3. Obter dados do visitante e IP
    const userAgent = req.headers.get('user-agent') || null;
    let ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null;
    if (ipAddress && ipAddress.includes(',')) {
        ipAddress = ipAddress.split(',')[0].trim();
    }

    // 4. Buscar o link para determinar o tipo (usando Service Role Key para ignorar RLS)
    const { data: linkData, error: linkError } = await supabaseAdmin
        .from('access_links')
        .select('id, link_type, scope, model_id, product_id, expires_at, max_uses, uses, active')
        .eq('token_hash', tokenHash)
        .single();
        
    if (linkError && linkError.code !== 'PGRST116') {
        console.error("[validate-access-link] DB Link Fetch Error:", linkError);
        return createResponse(false, { code: "DB_ERROR", message: linkError.message });
    }
    
    if (!linkData) {
        return createResponse(false, { code: "INVALID_LINK", message: "Link de acesso não encontrado." });
    }
    
    const linkType = linkData.link_type as 'access' | 'grant';
    
    let rpcName: 'consume_access_link' | 'grant_access_link';
    let rpcPayload: any;
    
    // 5. DECISÃO DE ROTEAMENTO
    if (linkType === 'grant') {
        // 5.1. Roteamento GRANT: Exige user_id e chama grant_access_link
        if (!user_id) {
            return createResponse(false, { code: "LOGIN_REQUIRED", message: "Login é obrigatório para ativar o acesso permanente." });
        }
        rpcName = 'grant_access_link';
        rpcPayload = {
            p_token_hash: tokenHash,
            p_visitor_name: visitor_name,
            p_visitor_email: visitor_email,
            p_user_id: user_id,
            p_user_agent: userAgent,
            p_ip: ipAddress,
        };
    } else {
        // 5.2. Roteamento ACCESS: Comportamento IDÊNTICO ao atual (chama consume_access_link)
        rpcName = 'consume_access_link';
        rpcPayload = {
            p_token_hash: tokenHash,
            p_visitor_name: visitor_name,
            p_visitor_email: visitor_email,
            p_user_id: user_id || null, // user_id é opcional para ACCESS
            p_user_agent: userAgent,
            p_ip: ipAddress,
        };
    }

    // 6. Chamar a RPC
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(rpcName, rpcPayload);

    if (rpcError) {
      console.error(`[validate-access-link] RPC ${rpcName} Error:`, rpcError);
      return createResponse(false, { code: "RPC_ERROR", message: rpcError.message });
    }
    
    const result = rpcData?.[0];

    if (!result || result.ok === false) {
        const code = result?.code || 'UNKNOWN_VALIDATION_ERROR';
        const message = result?.message || 'Falha na validação do link.';
        return createResponse(false, { code, message });
    }

    // 7. Sucesso: Retorna o grant (incluindo link_type)
    const grant: Grant = {
        scope: result.scope as 'global' | 'model' | 'product',
        model_id: result.model_id,
        product_id: result.product_id,
        expires_at: result.expires_at,
        link_type: linkType, // Adicionando o tipo de link
    };
    
    return createResponse(true, { grant });

  } catch (err) {
    const e = err as Error;
    console.error("[validate-access-link] Unexpected Error:", e.message);
    return createResponse(false, { code: "UNEXPECTED_ERROR", message: e.message });
  }
});