import { supabase } from './supabase';
import { Product, Model } from '../types';

export interface UserPurchaseWithProduct {
  id: string;
  user_id: string;
  product_id: string;
  status: 'pending' | 'paid' | 'expired' | 'refunded';
  created_at: string;
  paid_at: string | null;
  amount_cents: number | null;
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

export const fetchProductById = async (id: string): Promise<Product | null> => {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') console.error('Error fetching product by ID:', error.message);
  return data || null;
};

export const fetchUserPurchases = async (): Promise<UserPurchaseWithProduct[]> => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('[fetchUserPurchases] Error getting session:', sessionError);
    return [];
  }

  const user = sessionData?.session?.user;
  if (!user) {
    console.warn('[fetchUserPurchases] No logged user, returning empty list.');
    return [];
  }

  const { data, error } = await supabase
    .from('user_purchases')
    .select(`
      id,
      user_id,
      product_id,
      status,
      created_at,
      paid_at,
      amount_cents,
      products (
        id,
        name,
        type,
        price_cents,
        model_id,
        is_base_membership,
        cover_thumbnail,
        models (
          id,
          name,
          username,
          avatar_url
        )
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'paid')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[fetchUserPurchases] Supabase error:', error);
    return [];
  }

  return (data || []) as unknown as UserPurchaseWithProduct[];
};

export const hasUserPurchased = async (productId: string): Promise<boolean> => {
  const product = await fetchProductById(productId);
  if (!product) return false;
  if (product.is_base_membership) return true;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { count } = await supabase
    .from('user_purchases')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .eq('status', 'paid');

  return (count ?? 0) > 0;
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