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

/**
 * Calcula o hash SHA-256 de uma string e retorna o resultado em formato hexadecimal.
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
    const { token, visitor_name, visitor_email, user_id } = await req.json();

    if (typeof token !== 'string' || token.length < 10) {
      return createResponse(false, { code: "INVALID_LINK", message: "Token inválido." });
    }

    // 1. Calcular token_hash
    const tokenHash = await sha256Hex(token);
    const now = new Date().toISOString();
    const userAgent = req.headers.get('user-agent') || null;
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null;


    // 2. Tentar UPDATE atômico (incrementa 'uses' e verifica todas as condições)
    const { data: updatedLink, error: updateError } = await supabaseAdmin
      .from('access_links')
      .update({ 
        uses: supabaseAdmin.rpc('uses') + 1, // Incrementa uses
        last_used_at: now, // Atualiza o último uso
        first_used_at: supabaseAdmin.rpc('coalesce', supabaseAdmin.rpc('first_used_at'), now), // Define o primeiro uso se for NULL
      }) 
      .select('id, scope, model_id, product_id, expires_at, active, max_uses, uses')
      .eq('token_hash', tokenHash)
      .eq('active', true)
      .or('expires_at.is.null,expires_at.gt.now()') // Não expirado
      .or('max_uses.is.null,uses.lt.max_uses') // Não atingiu limite (usa o valor ANTES do incremento)
      .single();

    if (updateError) {
      // Se o erro for de DB, logamos e retornamos erro genérico
      console.error("[validate-access-link] Error during atomic update:", updateError);
      return createResponse(false, { code: "DB_UPDATE_ERROR", message: "Erro ao registrar uso do link." });
    }
    
    // 3. Se o UPDATE retornou um link, o acesso é concedido
    if (updatedLink) {
        const grant: Grant = {
            scope: updatedLink.scope,
            model_id: updatedLink.model_id,
            product_id: updatedLink.product_id,
            expires_at: updatedLink.expires_at,
        };
        
        // 3.1. Registrar a visita (não-atômico, mas importante)
        const { error: visitError } = await supabaseAdmin
            .from('access_link_visits')
            .insert({
                access_link_id: updatedLink.id,
                visitor_name: visitor_name || null,
                visitor_email: visitor_email || null,
                user_id: user_id || null,
                user_agent: userAgent,
                ip: ipAddress,
            });
            
        if (visitError) {
            console.error("[validate-access-link] Error inserting visit log:", visitError);
            // Não é fatal, mas logamos
        }
        
        return createResponse(true, { grant });
    }

    // 4. Se o UPDATE não retornou linha, o link falhou em alguma condição.
    // Fazemos um SELECT simples para determinar o motivo exato (fail-closed).
    const { data: link, error: fetchError } = await supabaseAdmin
      .from('access_links')
      .select('active, expires_at, max_uses, uses')
      .eq('token_hash', tokenHash)
      .single();

    if (fetchError || !link) {
      return createResponse(false, { code: "INVALID_LINK", message: "Link de acesso não encontrado." });
    }

    const expiresAt = link.expires_at ? new Date(link.expires_at) : null;

    if (!link.active) {
      return createResponse(false, { code: "INACTIVE_LINK", message: "Link inativo." });
    }

    if (expiresAt && new Date() > expiresAt) {
      return createResponse(false, { code: "EXPIRED_LINK", message: "Link expirado." });
    }

    // Se o link existe, está ativo, não expirou, mas o UPDATE falhou,
    // significa que a condição 'uses.lt.max_uses' falhou (limite atingido).
    if (link.max_uses !== null && link.uses >= link.max_uses) {
      return createResponse(false, { code: "MAX_USES", message: "Limite de usos atingido." });
    }
    
    // Fallback para erro desconhecido (deve ser raro)
    return createResponse(false, { code: "UNKNOWN_VALIDATION_ERROR", message: "Falha na validação do link." });

  } catch (err) {
    const e = err as Error;
    console.error("[validate-access-link] Unexpected Error:", e.message);
    return createResponse(false, { code: "UNEXPECTED_ERROR", message: e.message });
  }
});