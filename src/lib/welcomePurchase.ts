import { supabase } from './supabase'; // Importando o cliente Supabase

/**
 * Garante que o usuário tenha pelo menos 1 produto da Carolina Andrade
 * marcado como comprado (compra de boas-vindas).
 *
 * @param userId - O ID do usuário autenticado.
 */
export const ensureWelcomePurchaseForCarolina = async (
  userId: string
): Promise<void> => {
  console.log("[welcomePurchase] start", { userId });
  
  try {
    // 1) Buscar modelo da Carolina
    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('id')
      .eq('username', 'carolina-andrade')
      .single();

    if (modelError || !model) {
      console.error('[welcomePurchase] Modelo carolina-andrade não encontrado:', modelError?.message);
      return;
    }
    
    console.log("[welcomePurchase] Model found:", { modelId: model.id });

    // 2) Buscar o produto de assinatura base (VIP)
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, price_cents')
      .eq('model_id', model.id)
      .eq('is_base_membership', true)
      .eq('status', 'active') // Garantindo que o produto esteja ativo
      .single();

    if (productError || !product) {
      console.error('[welcomePurchase] Produto VIP base da Carolina não encontrado:', productError?.message);
      return;
    }
    
    const productId = product.id;
    const priceCents = product.price_cents;
    console.log("[welcomePurchase] VIP Product found:", { productId, priceCents });


    // 3) Verificar se já existe compra desse produto para esse usuário
    const { data: existing, error: existingError } = await supabase
      .from('user_purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .eq('status', 'paid')
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('[welcomePurchase] Erro verificando compra existente:', existingError.message);
      return;
    }

    if (existing) {
      console.log("[welcomePurchase] purchase already exists", { purchaseId: existing.id });
      return;
    }

    // 4) Criar a compra de boas-vindas (status: paid)
    const { error: insertError } = await supabase.from('user_purchases').insert({
      user_id: userId,
      product_id: productId,
      price_paid_cents: priceCents,
      amount_cents: priceCents,
      status: 'paid',
      payment_provider: 'whatsapp_welcome',
      payment_data: { source: 'whatsapp_migration' },
      paid_at: new Date().toISOString(),
    });

    if (insertError) {
      // Se for unique_violation (o que pode acontecer em condições de corrida), apenas logamos.
      if (insertError.code === '23505') { // PostgreSQL unique_violation code
        console.warn('[welcomePurchase] Unique constraint violation (race condition). Purchase already exists.');
        return;
      }
      console.error('[welcomePurchase] Erro ao criar compra de boas-vindas:', insertError.message);
      return;
    }
    
    console.log(`[welcomePurchase] Compra VIP da Carolina registrada com sucesso para o usuário ${userId}.`);

  } catch (err) {
    const e = err as Error;
    console.error('[welcomePurchase] Erro inesperado no fluxo:', e.message);
  }
};