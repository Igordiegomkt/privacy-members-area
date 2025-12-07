// @ts-ignore: Deno-specific import
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Declaramos Deno pra não quebrar no TypeScript fora do Deno
declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-signature",
};

const MP_ACCESS_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Cliente Supabase no Deno (service role)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[payment-webhook] Supabase env vars missing");
}

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

// Tipo básico do payment que vamos consumir do MP
interface MercadoPagoPayment {
  id: string;
  status: string;
  status_detail: string;
  transaction_amount: number;
  external_reference: string | null;
  date_approved: string | null;
  payer: {
    email?: string;
    id?: string;
  };
}

async function fetchPaymentFromMP(paymentId: string): Promise<MercadoPagoPayment | null> {
  if (!MP_ACCESS_TOKEN) {
    console.error("[payment-webhook] Missing MERCADO_PAGO_ACCESS_TOKEN");
    return null;
  }

  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    console.error("[payment-webhook] Failed to fetch payment from MP:", res.status);
    return null;
  }

  const data = await res.json();
  return data as MercadoPagoPayment;
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    const body = await req.json().catch(() => null);

    // Webhooks do MP normalmente vêm como:
    // { "type": "payment", "data": { "id": "123456789" }, ... }
    const type = body?.type ?? body?.topic;
    const paymentId = body?.data?.id ?? body?.data?.payment?.id;

    if (!type || type !== "payment") {
      console.log("[payment-webhook] Ignored event type:", type);
      return new Response(
        JSON.stringify({ ok: true, ignored: true }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!paymentId) {
      console.error("[payment-webhook] Missing payment id in webhook body");
      return new Response(
        JSON.stringify({
          ok: false,
          code: "BAD_REQUEST",
          message: "Missing payment id",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const payment = await fetchPaymentFromMP(paymentId.toString());
    if (!payment) {
      return new Response(
        JSON.stringify({
          ok: false,
          code: "MP_FETCH_ERROR",
          message: "Could not fetch payment details from MercadoPago",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("[payment-webhook] Payment fetched:", payment.id, payment.status);

    const isApproved = payment.status === "approved";
    if (!isApproved) {
      // Se não está aprovado, podemos só marcar como "pending"/"failed" se quiser
      return new Response(
        JSON.stringify({
          ok: true,
          processed: true,
          status: payment.status,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const externalRef = payment.external_reference;
    if (!externalRef) {
      console.error("[payment-webhook] Payment without external_reference");
      return new Response(
        JSON.stringify({
          ok: false,
          code: "MISSING_EXTERNAL_REFERENCE",
          message: "Payment has no external_reference",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // O padrão que combinamos: userId|productId
    const [userId, productId] = externalRef.split("|");
    if (!userId || !productId) {
      console.error("[payment-webhook] Invalid external_reference format:", externalRef);
      return new Response(
        JSON.stringify({
          ok: false,
          code: "INVALID_EXTERNAL_REFERENCE",
          message: "Invalid external_reference format",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Atualiza a compra como "paid"
    const { error: updateError } = await supabaseAdmin
      .from("user_purchases")
      .update({
        status: "paid",
        paid_at: payment.date_approved ?? new Date().toISOString(),
        mp_payment_id: payment.id,
        mp_status: payment.status,
        mp_status_detail: payment.status_detail,
        amount_cents: Math.round(payment.transaction_amount * 100),
      })
      .eq("user_id", userId)
      .eq("product_id", productId)
      .eq("status", "pending");

    if (updateError) {
      console.error("[payment-webhook] Error updating user_purchases:", updateError);
      return new Response(
        JSON.stringify({
          ok: false,
          code: "DB_UPDATE_ERROR",
          message: updateError.message,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        processed: true,
        userId,
        productId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const e = err as Error;
    console.error("[payment-webhook] Unexpected error:", e.message);

    return new Response(
      JSON.stringify({
        ok: false,
        code: "UNEXPECTED_ERROR",
        message: e.message ?? "Unknown error",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});