// @ts-ignore: This directive is necessary because the local TypeScript compiler
// cannot resolve Deno's URL-based imports, but the Deno runtime can.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: Same reason as above for Deno-specific imports.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Declare the Deno global to satisfy the TypeScript compiler in a non-Deno environment.
declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Creates a standardized JSON error response.
 */
const createErrorResponse = (message: string, status: number, details?: any) => {
  console.error("[create-checkout] Error:", message, details || "");
  return new Response(
    JSON.stringify({ error: message, details }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[create-checkout] PIX checkout function invoked.");

    // 1. Validate essential environment variables
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return createErrorResponse("Internal server configuration error.", 500);
    }
    console.log("[create-checkout] Environment variables loaded.");

    // 2. Create Supabase admin client and find active payment provider
    const supabaseAdmin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: activeProvider, error: providerError } = await supabaseAdmin
      .from("payment_providers_config")
      .select("*")
      .eq("is_active", true)
      .single();

    if (providerError || !activeProvider) {
      return createErrorResponse("No active payment provider found.", 503, providerError);
    }
    console.log("[create-checkout] Active provider found:", activeProvider.provider);

    // 3. Handle Mercado Pago specific logic
    if (activeProvider.provider !== "mercado_pago") {
      return createErrorResponse("Unsupported payment provider.", 400, { provider: activeProvider.provider });
    }

    const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!MERCADO_PAGO_ACCESS_TOKEN) {
      return createErrorResponse("Mercado Pago access token is not configured.", 500);
    }
    console.log("[create-checkout] Mercado Pago access token loaded.");

    // 4. Authenticate the user
    const authHeader = req.headers.get("Authorization")!;
    console.log('[create-checkout] Authorization header received:', authHeader ? 'Bearer ***' : 'none');

    const supabaseClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('[create-checkout] User not authenticated:', userError);
      return createErrorResponse("User not authenticated.", 401, userError);
    }
    console.log("[create-checkout] User authenticated:", user.id);

    // 5. Validate the request body and the product
    const { productId } = await req.json();
    if (!productId) {
      return createErrorResponse("Missing productId in request body.", 400);
    }

    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("name, price_cents, status")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return createErrorResponse("Product not found.", 404, productError);
    }
    if (product.status !== 'active' || !product.price_cents || product.price_cents <= 0) {
      return createErrorResponse("Product is invalid or unavailable.", 400);
    }
    console.log("[create-checkout] Product validated:", { name: product.name, price: product.price_cents });

    // 6. Create the PIX payment using Mercado Pago Payments API
    const paymentPayload = {
      transaction_amount: product.price_cents / 100,
      description: product.name,
      payment_method_id: "pix",
      payer: {
        email: user.email || `user-${user.id}@placeholder.com`,
      },
      external_reference: `${user.id}|${productId}`,
      notification_url: `${SUPABASE_URL}/functions/v1/payment-webhook`,
    };

    console.log("[create-checkout] Creating Mercado Pago PIX payment...");
    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(paymentPayload),
    });

    const paymentData = await mpResponse.json();
    if (!mpResponse.ok) {
      return createErrorResponse("Mercado Pago API error.", mpResponse.status, paymentData);
    }

    const transactionData = paymentData.point_of_interaction?.transaction_data;
    if (!transactionData) {
        return createErrorResponse("Mercado Pago did not return PIX data.", 500, paymentData);
    }

    const pixResponse = {
        paymentId: paymentData.id,
        qrCode: transactionData.qr_code,
        qrCodeBase64: transactionData.qr_code_base64,
        expiresAt: paymentData.date_of_expiration,
    };

    console.log("[create-checkout] PIX data generated successfully for payment ID:", pixResponse.paymentId);

    // 7. Return PIX data to the frontend
    return new Response(JSON.stringify(pixResponse), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const err = error as Error;
    return createErrorResponse("Unexpected server error.", 500, err.message);
  }
});