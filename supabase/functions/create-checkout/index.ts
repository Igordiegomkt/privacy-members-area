// @ts-ignore: Ignoring module resolution for Deno-specific URL imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore: Ignoring module resolution for Deno-specific URL imports
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Declare the Deno global to satisfy the TypeScript compiler in a non-Deno environment.
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error("Usuário não autenticado.")

    const { productId } = await req.json()
    if (!productId) throw new Error("ID do produto é obrigatório.")

    const { data: product, error: productError } = await supabaseClient
      .from('products')
      .select('name, price_cents, status')
      .eq('id', productId)
      .single()

    if (productError || !product) throw new Error("Produto não encontrado ou inválido.")
    if (product.status !== 'active') throw new Error("Este produto não está mais disponível.")

    const preference = {
      items: [
        {
          title: product.name,
          quantity: 1,
          unit_price: product.price_cents / 100,
          currency_id: 'BRL',
        },
      ],
      back_urls: {
        success: `${Deno.env.get('SITE_URL')}/minhas-compras`,
        failure: `${Deno.env.get('SITE_URL')}/produto/${productId}`,
        pending: `${Deno.env.get('SITE_URL')}/produto/${productId}`,
      },
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook`,
      external_reference: `${user.id}|${productId}`,
    }

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.message || "Erro ao criar preferência de pagamento.")

    return new Response(JSON.stringify({ checkoutUrl: data.init_point }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    const err = error as Error;
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})