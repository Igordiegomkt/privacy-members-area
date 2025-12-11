import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase'; // Importando o cliente Supabase

/**
 * Garante que o usuário tenha pelo menos 1 produto da Carolina Andrade
 * marcado como comprado (compra de boas-vindas).
 *
 * Regras:
 * - Procura a modelo "carolina-andrade" na tabela models.
 * - Procura o produto de assinatura base (is_base_membership = true) dessa modelo.
 * - Cria um registro em user_purchases (user_id, product_id) com status 'paid' se ainda não existir.
 *
 * @param userId - O ID do usuário autenticado.
 */
export const ensureWelcomePurchaseForCarolina = async (
  userId: string
): Promise<void> => {
  try {
    // 1) Buscar modelo da Carolina
    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('id')
      .eq('username', 'carolina-andrade')
      .single();

    if (modelError || !model) {
      console.error('[welcomePurchase] Modelo carolina-andrade não encontrado:', modelError);
      return;
    }

    // 2) Buscar o produto de assinatura base (VIP)
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, price_cents')
      .eq('model_id', model.id)
      .eq('is_base_membership', true)
      .single();

    if (productError || !product) {
      console.error('[welcomePurchase] Produto VIP base da Carolina não encontrado:', productError);
      return;
    }
    
    const productId = product.id;
    const priceCents = product.price_cents;

    // 3) Verificar se já existe compra desse produto para esse usuário
    const { data: existing, error: existingError } = await supabase
      .from('user_purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .eq('status', 'paid') // Apenas compras pagas contam
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('[welcomePurchase] Erro verificando compra existente:', existingError);
      return;
    }

    if (existing) {
      // Compra já existe, nada a fazer.
      return;
    }

    // 4) Criar a compra de boas-vindas (status: paid)
    const { error: insertError } = await supabase.from('user_purchases').insert({
      user_id: userId,
      product_id: productId,
      price_paid_cents: priceCents, // Usando o preço real do produto
      amount_cents: priceCents,
      status: 'paid',
      payment_provider: 'whatsapp_welcome', // Nova fonte para rastreamento
      payment_data: { source: 'whatsapp_migration' },
      paid_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('[welcomePurchase] Erro ao criar compra de boas-vindas:', insertError);
      return;
    }
    
    console.log(`[welcomePurchase] Compra VIP da Carolina registrada para o usuário ${userId}.`);

  } catch (err) {
    console.error('[welcomePurchase] Erro inesperado:', err);
  }
};