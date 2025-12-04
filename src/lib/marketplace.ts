import { supabase } from './supabase';
import { Product, UserPurchase, Model } from '../types';

export type UserPurchaseWithProduct = UserPurchase & {
  product: (Product & { model: Model | null }) | null;
};

export type PixCheckoutData = {
  paymentId: string;
  qrCode: string;
  qrCodeBase64: string;
  expiresAt?: string;
};

const PRODUCT_COLUMNS = 'id, name, description, price_cents, type, status, cover_thumbnail, created_at, model_id, is_base_membership';
const MODEL_COLUMNS = 'id, name, username, avatar_url';

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
    .select(`*, product:products!inner(${PRODUCT_COLUMNS}, model:models(${MODEL_COLUMNS}))`)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching user purchases with model:", error);
    throw new Error('Não foi possível buscar as compras do usuário.');
  }
  
  return data as UserPurchaseWithProduct[] || [];
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