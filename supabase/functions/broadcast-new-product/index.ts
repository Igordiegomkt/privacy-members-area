// @ts-ignore
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

declare const Deno: any;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY"); // Adicionado

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[broadcast-new-product] Missing Supabase env vars");
}

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

interface BroadcastBody {
  productId?: string;
}

interface Profile {
  id: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        ok: false,
        code: "METHOD_NOT_ALLOWED",
        message: "Method not allowed",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    // --- VALIDAÇÃO DE ADMIN ---
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({
          ok: false,
          code: "NO_AUTH",
          message: "Token ausente."
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!SUPABASE_ANON_KEY) {
      console.error("[broadcast-new-product] Missing SUPABASE_ANON_KEY env var");
      return new Response(
        JSON.stringify({
          ok: false,
          code: "SERVER_MISCONFIG",
          message: "Configuração do servidor incompleta.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Client representando o usuário chamador (com o token do header)
    const supabaseUser = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Buscar perfil do usuário e verificar se é admin
    const { data: profile, error: profileError } = await supabaseUser
      .from("profiles")
      .select("role")
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      console.error("[broadcast-new-product] Forbidden - not admin:", profileError);
      return new Response(
        JSON.stringify({
          ok: false,
          code: "FORBIDDEN",
          message: "Apenas administradores podem disparar notificações.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    // --- FIM DA VALIDAÇÃO DE ADMIN ---

    const body = (await req.json()) as BroadcastBody;

    if (!body.productId) {
      return new Response(
        JSON.stringify({
          ok: false,
          code: "BAD_REQUEST",
          message: "productId é obrigatório.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const productId = body.productId;

    // 1) Buscar produto e modelo (USANDO supabaseAdmin)
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, name, type, description, price_cents, models ( name )")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      console.error("[broadcast-new-product] productError:", productError);
      return new Response(
        JSON.stringify({
          ok: false,
          code: "PRODUCT_NOT_FOUND",
          message: "Produto não encontrado.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    
    const modelName = (product as any).models?.name;

    const price =
      typeof product.price_cents === "number"
        ? product.price_cents / 100
        : null;

    const typeLabel =
      product.type === 'subscription'
        ? 'Assinatura VIP'
        : product.type === 'pack'
        ? 'Pack de Conteúdo'
        : 'Conteúdo avulso';

    const title = modelName 
        ? `${modelName} lançou um novo ${typeLabel}!`
        : `Novo ${typeLabel} disponível!`;
        
    const bodyText = price
      ? `Confira o novo produto: ${product.name} por R$ ${price.toFixed(2)}.`
      : `Confira o novo produto: ${product.name} disponível na plataforma.`;

    // 2) Criar notification (USANDO supabaseAdmin)
    const { data: notification, error: notificationError } = await supabaseAdmin
      .from("notifications")
      .insert([
        {
          title,
          body: bodyText,
          product_id: product.id,
        },
      ])
      .select("id")
      .single();

    if (notificationError || !notification) {
      console.error(
        "[broadcast-new-product] notificationError:",
        notificationError,
      );
      return new Response(
        JSON.stringify({
          ok: false,
          code: "NOTIFICATION_INSERT_ERROR",
          message: notificationError?.message || "Erro ao criar notificação.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const notificationId = notification.id as string;

    // 3) Buscar todos os usuários (USANDO supabaseAdmin)
    const { data: users, error: usersError } = await supabaseAdmin
      .from("profiles")
      .select("id");

    if (usersError || !users) {
      console.error("[broadcast-new-product] usersError:", usersError);
      // Não é um erro fatal, a notificação global foi criada.
    }

    // 4) Criar user_notifications em batch (USANDO supabaseAdmin)
    const userNotificationsPayload = (users as Profile[] || []).map((u: Profile) => ({
      user_id: u.id,
      notification_id: notificationId,
      is_read: false,
    }));

    if (userNotificationsPayload.length > 0) {
      const { error: userNotifError } = await supabaseAdmin
        .from("user_notifications")
        .insert(userNotificationsPayload);

      if (userNotifError) {
        console.error(
          "[broadcast-new-product] user_notifications insert error:",
          userNotifError,
        );
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        notificationId,
        createdUserNotifications: userNotificationsPayload.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const e = err as Error;
    console.error("[broadcast-new-product] unexpected error:", e.message);
    return new Response(
      JSON.stringify({
        ok: false,
        code: "UNEXPECTED_ERROR",
        message: e.message,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});