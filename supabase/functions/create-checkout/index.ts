// @ts-ignore Deno
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
// @ts-ignore Deno
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0';

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN'); // se estiver usando MP

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  },
});

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, message: 'Method not allowed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return new Response(
        JSON.stringify({ ok: false, message: 'Não autenticado.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUserClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUserClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ ok: false, message: 'Usuário inválido.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { productId } = await req.json();

    if (!productId || typeof productId !== 'string') {
      return new Response(
        JSON.stringify({ ok: false, message: "Campo 'productId' é obrigatório." }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 1) Buscar produto + modelo para descrição e valor
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, name, price_cents, type, model_id, models ( name )')
      .eq('id', productId)
      .eq('status', 'active')
      .single();

    if (productError || !product) {
      console.error('[create-checkout] productError', productError);
      return new Response(
        JSON.stringify({ ok: false, message: 'Produto não encontrado ou inativo.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const amountCents = product.price_cents;
    const productName: string = product.name;
    const modelName: string | null = (product as any).models?.name ?? null;

    // Montar descrição amigável
    const typeLabel =
      product.type === 'subscription'
        ? 'Assinatura VIP'
        : product.type === 'pack'
        ? 'Pack de Conteúdo'
        : 'Conteúdo avulso';

    const description = modelName
      ? `${typeLabel} de ${modelName} – ${productName}`
      : `${typeLabel} – ${productName}`;

    // 2) Criar cobrança PIX no provedor (Mercado Pago ou outro)
    if (!MERCADO_PAGO_ACCESS_TOKEN) {
      console.warn('[create-checkout] MERCADO_PAGO_ACCESS_TOKEN não configurado. Retornando mock.');
      const fakePixString = `PIX-MOCK-${productId}-${Date.now()}`;
      const fakeQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        fakePixString,
      )}`;

      return new Response(
        JSON.stringify({
          ok: true,
          pixCopiaCola: fakePixString,
          qrCodeUrl: fakeQrUrl,
          amountCents,
          productName,
          modelName,
          description,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Exemplo de chamada a Mercado Pago PIX (ajuste conforme sua implementação):
    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        transaction_amount: amountCents / 100,
        description,
        payment_method_id: 'pix',
        payer: {
          email: user.email,
        },
        external_reference: `${user.id}|${productId}`, // Adicionando external_reference para o webhook
        notification_url: `${SUPABASE_URL}/functions/v1/payment-webhook`, // URL do webhook
      }),
    });

    const mpJson = await mpRes.json();

    if (!mpRes.ok) {
      console.error('[create-checkout] MP error', mpJson);
      return new Response(
        JSON.stringify({
          ok: false,
          message: mpJson?.message || 'Erro ao criar cobrança PIX.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const pixCopiaCola = mpJson.point_of_interaction?.transaction_data?.qr_code;
    const qrCodeUrl = mpJson.point_of_interaction?.transaction_data?.qr_code_base64
      ? `data:image/png;base64,${mpJson.point_of_interaction.transaction_data.qr_code_base64}`
      : null;

    return new Response(
      JSON.stringify({
        ok: true,
        pixCopiaCola,
        qrCodeUrl,
        amountCents,
        productName,
        modelName,
        description,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const e = err as Error;
    console.error('[create-checkout] Error', e.message);
    return new Response(
      JSON.stringify({
        ok: false,
        message: e.message || 'Erro inesperado ao criar checkout PIX.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});