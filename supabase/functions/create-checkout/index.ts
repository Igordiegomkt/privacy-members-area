// @ts-ignore: Ignoring module resolution for Deno-specific URL imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore: Ignoring module resolution for Deno-specific URL imports
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Declare the Deno global to satisfy the TypeScript compiler
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to create a JSON error response
const createErrorResponse = (message: string, status: number, details?: any) => {
  console.error(`[create-checkout] Error: ${message}`, details || '');
  return new Response(JSON.stringify({ error: message, details }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
};

serve(async (req: Request) => {
  console.log('[create-checkout] Function invoked.');
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Check for required environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const SITE_URL = Deno.env.get('SITE_URL');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SITE_URL) {
      return createErrorResponse('Internal server configuration error: Missing required environment variables.', 500);
    }
    console.log('[create-checkout] Core environment variables loaded.');

    // 2. Create Supabase Admin Client
    const supabaseAdmin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    console.log('[create-checkout] Supabase admin client created.');

    // 3. Find the active payment provider
    const { data: activeProvider, error: providerError } = await supabaseAdmin
      .from('payment_providers_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (providerError || !activeProvider) {
      return createErrorResponse('No active payment provider found.', 503, providerError);
    }
    console.log(`[create-checkout] Active payment provider found: ${activeProvider.provider}`);

    // 4. Handle Mercado Pago logic
    if (activeProvider.provider === 'mercado_pago') {
      const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
      if (!MERCADO_PAGO_ACCESS_TOKEN) {
        return createErrorResponse('Mercado Pago access token is not configured.', 500);
      }
      console.log('[create-checkout] Mercado Pago access token loaded.');

      // 5. Authenticate the user
      const supabaseClient = createClient(
        SUPABASE_URL,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
      );
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        return createErrorResponse("User not authenticated.", 401);
      }
      console.log(`[create-checkout] User authenticated: ${user.id}`);

      // 6. Get and validate product
      const { productId } = await req.json();
      console.log(`[create-checkout] Received request for productId: ${productId}`);
      if (!productId) {
        return createErrorResponse("Product ID is required.", 400);
      }

      const { data: product, error: productError } = await supabaseClient
        .from('products')
        .select('name, price_cents, status')
        .eq('id', productId)
        .single();

      if (productError || !product) {
        return createErrorResponse("Product not found or invalid.", 404, productError);
      }
      if (product.status !== 'active') {
        return createErrorResponse("This product is no longer available.", 400);
      }
      console.log(`[create-checkout] Product found: ${product.name}, Price: ${product.price_cents / 100} BRL`);

      // 7. Create Mercado Pago preference
      const preference = {
        items: [{
          title: product.name,
          quantity: 1,
          unit_price: product.price_cents / 100,
          currency_id: 'BRL',
        }],
        back_urls: {
          success: `${SITE_URL}/compra-sucesso?product_id=${productId}`,
          failure: `${SITE_URL}/compra-falhou?product_id=${productId}`,
          pending: `${SITE_URL}/produto/${productId}`,
        },
        notification_url: `${SUPABASE_URL}/functions/v1/payment-webhook`,
        external_reference: `${user.id}|${productId}`,
      };
      console.log('[create-checkout] Creating Mercado Pago preference with payload:', preference);

      const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(preference),
      });

      const responseBodyText = await mpResponse.text();
      console.log(`[create-checkout] Mercado Pago API response status: ${mpResponse.status}`);
      console.log(`[create-checkout] Mercado Pago API response body: ${responseBodyText}`);

      if (!mpResponse.ok) {
        return createErrorResponse("Failed to create Mercado Pago preference.", mpResponse.status, JSON.parse(responseBodyText));
      }

      const data = JSON.parse(responseBodyText);
      console.log(`[create-checkout] Successfully created checkout URL: ${data.init_point}`);
      
      return new Response(JSON.stringify({ checkoutUrl: data.init_point }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return createErrorResponse(`Payment provider '${activeProvider.provider}' is not supported.`, 501);

  } catch (error) {
    const err = error as Error;
    return createErrorResponse(err.message, 500, err);
  }
});