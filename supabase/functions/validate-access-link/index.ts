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

interface AccessLink {
  id: string;
  token_hash: string;
  scope: 'global' | 'model' | 'product';
  model_id: string | null;
  product_id: string | null;
  expires_at: string | null;
  max_uses: number | null;
  uses: number;
  active: boolean;
}

interface Grant {
  scope: 'global' | 'model' | 'product';
  model_id: string | null;
  product_id: string | null;
  expires_at: string | null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return createResponse(false, { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" });
  }

  try {
    const { token } = await req.json();

    if (typeof token !== 'string' || token.length < 10) {
      return createResponse(false, { code: "INVALID_LINK", message: "Token inválido." });
    }

    // 1. Calcular token_hash
    const tokenHash = createHash("sha256").update(token).toString("hex");

    // 2. Buscar link de acesso
    const { data: link, error: fetchError } = await supabaseAdmin
      .from('access_links')
      .select('*')
      .eq('token_hash', tokenHash)
      .single();

    if (fetchError || !link) {
      console.warn("[validate-access-link] Link not found or DB error:", fetchError?.message);
      return createResponse(false, { code: "INVALID_LINK", message: "Link de acesso não encontrado." });
    }

    const now = new Date();
    const expiresAt = link.expires_at ? new Date(link.expires_at) : null;

    // 3. Validar status
    if (!link.active) {
      return createResponse(false, { code: "INACTIVE_LINK", message: "Link inativo." });
    }

    // 4. Validar expiração
    if (expiresAt && now > expiresAt) {
      return createResponse(false, { code: "EXPIRED_LINK", message: "Link expirado." });
    }

    // 5. Validar limite de usos
    if (link.max_uses !== null && link.uses >= link.max_uses) {
      return createResponse(false, { code: "MAX_USES", message: "Limite de usos atingido." });
    }

    // 6. Incrementar uses (transacionalmente)
    const { error: updateError, count } = await supabaseAdmin
      .from('access_links')
      .update({ uses: link.uses + 1 })
      .eq('id', link.id)
      // Condição de segurança para evitar race condition no max_uses
      .or(
        `max_uses.is.null,uses.lt.${link.max_uses}`
      )
      .select('*', { count: 'exact' });

    if (updateError) {
      console.error("[validate-access-link] Error updating uses:", updateError);
      return createResponse(false, { code: "DB_UPDATE_ERROR", message: "Erro ao registrar uso do link." });
    }
    
    // Se count for 0, significa que a condição de uses < max_uses falhou (race condition)
    if (count === 0 && link.max_uses !== null) {
        return createResponse(false, { code: "MAX_USES", message: "Limite de usos atingido (race condition)." });
    }

    // 7. Retornar o grant
    const grant: Grant = {
      scope: link.scope,
      model_id: link.model_id,
      product_id: link.product_id,
      expires_at: link.expires_at,
    };

    return createResponse(true, { grant });

  } catch (err) {
    const e = err as Error;
    console.error("[validate-access-link] Unexpected Error:", e.message);
    return createResponse(false, { code: "UNEXPECTED_ERROR", message: e.message });
  }
});