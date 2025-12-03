import { supabase } from './supabase';
import { Product, UserPurchase } from '../types';

export type UserPurchaseWithProduct = UserPurchase & {
  product: Product | null;
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_purchases')
    .select(`*, products (${PRODUCT_COLUMNS})`)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Não foi possível buscar as compras do usuário.');
  
  return (data || []).map(p => ({ ...p, product: p.products as Product | null }));
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

/**
 * Chama a Edge Function para criar uma sessão de checkout no Mercado Pago.
 * @param productId O ID do produto a ser comprado.
 * @returns A URL de checkout para redirecionar o usuário.
 */
export const createCheckoutSession = async (productId: string): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { productId },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data.checkoutUrl;
};