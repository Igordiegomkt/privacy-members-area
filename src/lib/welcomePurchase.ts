import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Garante que o usuário tenha pelo menos 1 produto da Carolina Andrade
 * marcado como comprado (compra de boas-vindas).
 *
 * Regras:
 * - Procura a modelo "carolina-andrade" na tabela models.
 * - Procura um produto dessa modelo na tabela products (model_id = id da modelo).
 *   Se existir um produto de assinatura base (is_base_membership = true),
 *   prioriza ele. Senão, usa o primeiro produto encontrado.
 * - Cria um registro em user_purchases (user_id, product_id) se ainda não existir.
 *
 * Se der qualquer erro, só loga no console e não quebra o fluxo.
 */
export const ensureWelcomePurchaseForCarolina = async (
  supabase: SupabaseClient,
  userId: string
): Promise<void> => {
  try {
    // console.log('[welcomePurchase] Iniciando para user:', userId); // Removido log verboso

    // 1) Buscar modelo da Carolina
    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('id, username')
      .eq('username', 'carolina-andrade')
      .single();

    if (modelError || !model) {
      console.error('[welcomePurchase] Modelo carolina-andrade não encontrado:', modelError);
      return;
    }

    // console.log('[welcomePurchase] Modelo encontrado:', model.id); // Removido log verboso

    // 2) Buscar produtos dessa modelo
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('model_id', model.id);

    if (productsError || !products || products.length === 0) {
      console.error('[welcomePurchase] Nenhum produto encontrado para a modelo:', productsError);
      return;
    }

    // Tenta pegar um produto marcado como assinatura base; se não tiver, pega o primeiro
    const baseMembership =
      products.find((p: any) => p.is_base_membership === true) ?? products[0];

    // console.log('[welcomePurchase] Produto escolhido para boas-vindas:', baseMembership.id); // Removido log verboso

    // 3) Verificar se já existe compra desse produto para esse usuário
    const { data: existing, error: existingError } = await supabase
      .from('user_purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', baseMembership.id)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('[welcomePurchase] Erro verificando compra existente:', existingError);
      return;
    }

    if (existing) {
      // console.log('[welcomePurchase] Compra de boas-vindas já existe. Nada a fazer.'); // Removido log verboso
      return;
    }

    // 4) Criar a compra de boas-vindas
    const { error: insertError } = await supabase.from('user_purchases').insert({
      user_id: userId,
      product_id: baseMembership.id,
      price_paid_cents: 0,
      status: 'paid',
    });

    if (insertError) {
      console.error('[welcomePurchase] Erro ao criar compra de boas-vindas:', insertError);
      return;
    }

    // console.log('[welcomePurchase] Compra de boas-vindas criada com sucesso!'); // Removido log verboso
  } catch (err) {
    console.error('[welcomePurchase] Erro inesperado:', err);
  }
};