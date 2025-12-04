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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[create-checkout] Function invoked.");

    // 1. Validate essential environment variables
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SITE_URL = Deno.env.get("SITE_URL");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SITE_URL) {
      return createErrorResponse(
        "Internal server configuration error: Missing required environment variables.",
        500,
      );
    }
    console.log("[create-checkout] Environment variables loaded.");

    // 2. Create Supabase admin client
    const supabaseAdmin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 3. Find the active payment provider
    const { data: activeProvider, error: providerError } = await supabaseAdmin
      .from("payment_providers_config")
      .select("*")
      .eq("is_active", true)
      .single();

    if (providerError || !activeProvider) {
      return createErrorResponse("No active payment provider found.", 503, providerError);
    }
    console.log("[create-checkout] Active provider found:", activeProvider.provider);

    // 4. Handle Mercado Pago specific logic
    if (activeProvider.provider !== "mercado_pago") {
      return createErrorResponse("Unsupported payment provider.", 400, { provider: activeProvider.provider });
    }

    const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!MERCADO_PAGO_ACCESS_TOKEN) {
      return createErrorResponse("Mercado Pago access token is not configured.", 500);
    }
    console.log("[create-checkout] Mercado Pago access token loaded.");

    // 5. Authenticate the user making the request
    const supabaseClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } },
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return createErrorResponse("User not authenticated.", 401, userError);
    }
    console.log("[create-checkout] User authenticated:", user.id);

    // 6. Validate the request body and the product
    const { productId } = await req.json();
    console.log("[create-checkout] Requested productId:", productId);
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
    if (product.status !== 'active') {
      return createErrorResponse("This product is no longer available.", 400);
    }
    if (!product.price_cents || product.price_cents <= 0) {
      return createErrorResponse("Product has an invalid price.", 400, { price: product.price_cents });
    }
    console.log("[create-checkout] Product validated:", { name: product.name, price: product.price_cents });

    // 7. Create the payment preference in Mercado Pago
    const preferencePayload = {
      items: [{
        title: product.name,
        quantity: 1,
        unit_price: product.price_cents / 100,
        currency_id: "BRL",
      }],
      back_urls: {
        success: `${SITE_URL}/compra-sucesso?product_id=${productId}`,
        failure: `${SITE_URL}/compra-falhou?product_id=${productId}`,
        pending: `${SITE_URL}/produto/${productId}`,
      },
      notification_url: `${SUPABASE_URL}/functions/v1/payment-webhook`,
      external_reference: `${user.id}|${productId}`,
    };

    console.log("[create-checkout] Creating Mercado Pago preference...");
    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preferencePayload),
    });

    const responseData = await mpResponse.json();
    console.log(`[create-checkout] Mercado Pago API response status: ${mpResponse.status}`);

    if (!mpResponse.ok) {
      return createErrorResponse("Mercado Pago API error.", 502, responseData);
    }

    const checkoutUrl = responseData.init_point;
    console.log("[create-checkout] Checkout URL created successfully:", checkoutUrl);

    // 8. Return the checkout URL to the frontend
    return new Response(
      JSON.stringify({ checkoutUrl }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );

  } catch (error: unknown) {
    const err = error as Error;
    return createErrorResponse("Unexpected server error.", 500, err.message);
  }
});