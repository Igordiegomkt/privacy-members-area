// ZONA CRÍTICA – WEBHOOK DE PAGAMENTO
// NÃO ALTERE ESSA FUNÇÃO SEM TER CERTEZA DO IMPACTO NO FLUXO DE PAGAMENTO.
// Ela é responsável por:
// - Receber o webhook do Mercado Pago
// - Buscar os dados do pagamento
// - Atualizar user_purchases de 'pending' → 'paid' (ou 'expired' / 'refunded')

// @ts-ignore: Deno-specific import
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore: Supabase client for Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const MP_ACCESS_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[payment-webhook] Missing SUPABASE env vars");
}
if (!MP_ACCESS_TOKEN) {
  console.error("[payment-webhook] Missing MERCADO_PAGO_ACCESS_TOKEN");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

serve(async (req: Request) => {
  // CORS pré-flight
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
    const rawBody = await req.text();
    let body: any = {};
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch (_err) {
      console.warn("[payment-webhook] Failed to parse JSON body. Using raw text.");
      body = rawBody;
    }

    // Mercado Pago envia geralmente: { data: { id: "PAYMENT_ID" }, type: "payment" }
    const paymentId = body?.data?.id ?? body?.id;
    if (!paymentId) {
      console.error("[payment-webhook] Missing payment id in webhook body:", body);
      return new Response(
        JSON.stringify({
          ok: false,
          code: "MISSING_PAYMENT_ID",
          message: "Pagamento sem ID no webhook.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!MP_ACCESS_TOKEN) {
      return new Response(
        JSON.stringify({
          ok: false,
          code: "MISSING_MP_ACCESS_TOKEN",
          message: "MERCADO_PAGO_ACCESS_TOKEN não configurado.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Busca detalhes do pagamento no Mercado Pago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
    });

    if (!mpRes.ok) {
      const errJson = await mpRes.json().catch(() => ({}));
      console.error("[payment-webhook] Failed to fetch payment from MP:", mpRes.status, errJson);

      return new Response(
        JSON.stringify({
          ok: false,
          code: "MP_FETCH_ERROR",
          message: "Erro ao buscar pagamento no Mercado Pago.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const payment = await mpRes.json();
    const status: string | undefined = payment?.status;
    const externalReference: string | undefined = payment?.external_reference;

    if (!externalReference) {
      console.error("[payment-webhook] Missing external_reference in payment:", payment);
      return new Response(
        JSON.stringify({
          ok: false,
          code: "MISSING_EXTERNAL_REFERENCE",
          message: "Pagamento sem external_reference.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Padrão que combinamos na create-checkout: "userId|productId"
    const [userId, productId] = externalReference.split("|");

    if (!userId || !productId) {
      console.error("[payment-webhook] Invalid external_reference format:", externalReference);
      return new Response(
        JSON.stringify({
          ok: false,
          code: "INVALID_EXTERNAL_REFERENCE",
          message: "Formato inválido de external_reference.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Atualiza a linha de user_purchases de acordo com o status
    if (status === "approved") {
      const { error } = await supabase
        .from("user_purchases")
        .update({
          status: "paid",
          payment_provider: "mercado_pago",
          payment_data: payment,
          paid_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("product_id", productId)
        .eq("status", "pending");

      if (error) {
        console.error("[payment-webhook] Error updating purchase to paid:", error);
        return new Response(
          JSON.stringify({
            ok: false,
            code: "DB_UPDATE_ERROR",
            message: error.message,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      console.log("[payment-webhook] Purchase updated to paid:", { userId, productId, paymentId });

      return new Response(
        JSON.stringify({
          ok: true,
          code: "PAYMENT_CONFIRMED",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Outros status – marca como expirado ou reembolsado
    if (status === "rejected" || status === "cancelled" || status === "expired" || status === "refunded") {
      const newStatus =
        status === "refunded"
          ? "refunded"
          : "expired";

      const { error } = await supabase
        .from("user_purchases")
        .update({
          status: newStatus,
          payment_provider: "mercado_pago",
          payment_data: payment,
        })
        .eq("user_id", userId)
        .eq("product_id", productId)
        .eq("status", "pending");

      if (error) {
        console.error("[payment-webhook] Error updating purchase to non-approved status:", error);
      }

      return new Response(
        JSON.stringify({
          ok: true,
          code: "PAYMENT_NOT_APPROVED",
          status,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Status que não tratamos explicitamente → só logamos
    console.log("[payment-webhook] Ignoring payment with status:", status, {
      userId,
      productId,
      paymentId,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        code: "PAYMENT_IGNORED",
        status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    console.error("[payment-webhook] Unexpected error:", err);
    return new Response(
      JSON.stringify({
        ok: false,
        code: "UNEXPECTED_ERROR",
        message: err?.message || "Erro desconhecido no webhook.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});