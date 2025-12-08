// ⚠️ ZONA CRÍTICA DO SISTEMA DE PAGAMENTO
// - Não alterar estrutura da resposta (ok, pixCopiaCola, qrCodeUrl, productName, modelName, amountCents)
// - Não alterar formato de external_reference (userId|productId)
// - Não remover/alterar upsert em user_purchases (status 'pending')
// Qualquer mudança aqui exige:
// 1) Rodar checklist de compras end-to-end
// 2) Conferir Minhas Compras + Admin Dashboard

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
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
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
    const token = authHeader?.replace('Bearer ', '').trim();

    if (!token) {
      console.error('[create-checkout] MISSING_TOKEN: Authorization header missing or empty.');
      return new Response(
        JSON.stringify({ ok: false, code: 'MISSING_TOKEN', message: 'Sessão inválida ou expirada. Faça login novamente.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Usar o cliente Supabase com o token do usuário para obter a sessão
    const supabaseUserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUserClient.auth.getUser();

    if (userError || !user) {
      console.error('[create-checkout] INVALID_USER:', userError?.message || 'User object is null.');
      return new Response(
        JSON.stringify({ ok: false, code: 'INVALID_USER', message: 'Não foi possível identificar o usuário. Faça login novamente.' }),
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

    // Chave de referência externa e Idempotência
    const externalReference = `${user.id}|${productId}`;
    const idempotencyKey = `${externalReference}-${Date.now()}`; 
    const NOTIFICATION_URL = `${SUPABASE_URL}/functions/v1/payment-webhook`; // Definindo a URL do webhook

    // 2) Registrar intenção de compra (status: pending)
    const { error: upsertError } = await supabaseAdmin
      .from('user_purchases')
      .upsert(
        {
          user_id: user.id,
          product_id: productId,
          status: 'pending',
          amount_cents: amountCents,
          price_paid_cents: amountCents, // Preenchendo NOT NULL
          // Adicionando campos para evitar erros de NOT NULL ou tipagem
          payment_provider: 'mercado_pago',
          payment_data: null,
          paid_at: null,
        },
        {
          onConflict: 'user_id, product_id',
          ignoreDuplicates: false,
        }
      )
      .maybeSingle(); // Usando maybeSingle para ser mais defensivo

    if (upsertError) {
      console.error('[create-checkout] Upsert error:', upsertError);
      return new Response(
        JSON.stringify({ ok: false, code: "PURCHASE_UPSERT_ERROR", message: upsertError.message || 'Erro ao registrar intenção de compra.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 3) Criar cobrança PIX no provedor (Mercado Pago ou outro)
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

    // Chamada a Mercado Pago PIX
    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
        'X-Idempotency-Key': idempotencyKey, // Adicionando a chave de idempotência
      },
      body: JSON.stringify({
        transaction_amount: amountCents / 100,
        description,
        payment_method_id: 'pix',
        payer: {
          email: user.email,
        },
        external_reference: externalReference, // Referência para o webhook
        notification_url: NOTIFICATION_URL, // Usando a URL definida
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