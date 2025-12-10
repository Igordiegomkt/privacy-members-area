import { supabase } from './supabase';
import { Product, Model, ProductWithModel } from '../types';

export interface UserPurchaseWithProduct {
  id: string;
  user_id: string;
  product_id: string;
  status: 'pending' | 'paid' | 'expired' | 'refunded';
  created_at: string;
  paid_at: string | null;
  amount_cents: number; // Valor do produto no momento da compra
  price_paid_cents: number; // Valor efetivamente pago
  products: (Product & {
    models: Model | null;
  }) | null;
}

export type PixCheckoutData = {
  paymentId: string;
  qrCode: string;
  qrCodeBase64: string;
  expiresAt?: string;
};

const PRODUCT_COLUMNS = 'id, name, description, price_cents, type, status, cover_thumbnail, created_at, model_id, is_base_membership';

export const fetchProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw new Error('Não foi possível buscar os produtos.');
  return data || [];
};

export const fetchProductById = async (id: string): Promise<ProductWithModel | null> => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      ${PRODUCT_COLUMNS},
      models ( id, name, username )
    `)
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') console.error('Error fetching product by ID:', error.message);
  return data as ProductWithModel | null;
};

export const fetchUserPurchases = async (): Promise<UserPurchaseWithProduct[]> => {
  const {
    data: authData,
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authData?.user) {
    console.error('[fetchUserPurchases] No authenticated user', authError);
    return [];
  }

  const user = authData.user;

  const { data, error } = await supabase
    .from('user_purchases')
    .select(
      `
      id,
      user_id,
      product_id,
      status,
      created_at,
      paid_at,
      amount_cents,
      price_paid_cents,
      products (
        id,
        name,
        type,
        price_cents,
        model_id,
        is_base_membership,
        cover_thumbnail,
        status,
        created_at,
        models (
          id,
          name,
          username,
          avatar_url
        )
      )
    `
    )
    .eq('user_id', user.id)
    .eq('status', 'paid')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[fetchUserPurchases] Error:', error);
    return [];
  }

  // 🔧 Normaliza: products -> 1 produto | null, models -> 1 model | null
  const normalized: UserPurchaseWithProduct[] = (data || []).map((row: any) => {
    const rawProducts = row.products;

    // Pega o primeiro produto se for um array, ou o objeto se não for
    const firstProduct = Array.isArray(rawProducts)
      ? rawProducts[0]
      : rawProducts;

    let firstModel: Model | null = null;
    if (firstProduct && firstProduct.models) {
      // Se models for um array (resultado de JOIN), pega o primeiro elemento
      if (Array.isArray(firstProduct.models)) {
        firstModel = firstProduct.models[0] ?? null;
      } else {
        // Se models for um objeto (resultado de single select), usa-o
        firstModel = firstProduct.models as Model;
      }
    }

    const normalizedProduct: (Product & { models: Model | null }) | null =
      firstProduct
        ? {
            id: firstProduct.id,
            name: firstProduct.name,
            type: firstProduct.type,
            price_cents: firstProduct.price_cents,
            model_id: firstProduct.model_id,
            is_base_membership: firstProduct.is_base_membership,
            cover_thumbnail: firstProduct.cover_thumbnail,
            status: firstProduct.status,
            created_at: firstProduct.created_at,
            models: firstModel,
          }
        : null;

    const normalizedRow: UserPurchaseWithProduct = {
      id: row.id,
      user_id: row.user_id,
      product_id: row.product_id,
      status: row.status,
      created_at: row.created_at,
      paid_at: row.paid_at,
      amount_cents: row.amount_cents ?? 0,
      price_paid_cents: row.price_paid_cents ?? 0,
      products: normalizedProduct,
    };

    return normalizedRow;
  });

  return normalized;
};

export const hasUserPurchasedProduct = (
  purchases: UserPurchaseWithProduct[],
  productId?: string | null
): boolean => {
  if (!productId) return false;
  // Verifica se existe uma compra com status 'paid' para o produto
  return purchases.some(p => p.product_id === productId && p.status === 'paid');
};

export const createCheckoutSession = async (productId: string): Promise<PixCheckoutData> => {
  console.log('[createCheckoutSession] Invoking Edge Function with productId:', productId);
  
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { productId },
  });

  if (error) {
    console.error('[createCheckoutSession] Error from Edge Function invocation:', error);
    // O erro pode vir com um objeto 'context' com mais detalhes
    const errorMessage = (error as any).context?.error_description || error.message;
    throw new Error(errorMessage || 'Erro ao iniciar pagamento Pix');
  }

  if (data.error) {
    console.error('[createCheckoutSession] Business logic error from Edge Function:', data.error);
    throw new Error(data.error);
  }

  console.log('[createCheckoutSession] Response data:', data);
  return data as PixCheckoutData;
};