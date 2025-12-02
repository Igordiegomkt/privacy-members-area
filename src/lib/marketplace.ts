import { supabase } from './supabase';
import { Product, UserPurchase } from '../types';

/**
 * Tipo combinado para uma compra que inclui os detalhes do produto associado.
 */
export type UserPurchaseWithProduct = UserPurchase & {
  product: Product | null;
};

/**
 * Busca todos os produtos ativos no marketplace.
 */
export const fetchProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, description, price_cents, type, status, cover_thumbnail, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products:', error.message);
    throw new Error('Não foi possível buscar os produtos.');
  }

  return data || [];
};

/**
 * Busca um único produto pelo seu ID.
 */
export const fetchProductById = async (id: string): Promise<Product | null> => {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, description, price_cents, type, status, cover_thumbnail, created_at')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') { // 'PGRST116' means 0 rows, which is not an error here
      console.error('Error fetching product by ID:', error.message);
    }
    return null;
  }

  return data;
};

/**
 * Busca todas as compras do usuário autenticado, com detalhes do produto.
 */
export const fetchUserPurchases = async (): Promise<UserPurchaseWithProduct[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_purchases')
    .select(`
      id, user_id, product_id, price_paid_cents, status, created_at,
      products (id, name, description, price_cents, type, status, cover_thumbnail, created_at)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user purchases:', error.message);
    throw new Error('Não foi possível buscar as compras do usuário.');
  }

  // Mapeia o retorno para que a propriedade aninhada seja `product` (singular)
  return (data ?? []).map(row => {
    const { products, ...purchaseData } = row;
    // The Supabase join returns `products` which can be an object or an array.
    // We expect a single object for this relationship, so we handle both cases.
    const singleProduct = Array.isArray(products) ? (products[0] ?? null) : (products ?? null);
    return {
      ...purchaseData,
      product: singleProduct,
    };
  }) as UserPurchaseWithProduct[];
};

/**
 * Verifica se o usuário autenticado já comprou um produto específico.
 */
export const hasUserPurchased = async (productId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { count, error } = await supabase
    .from('user_purchases')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .eq('status', 'paid');

  if (error) {
    console.error('Error checking purchase:', error);
    return false;
  }

  return (count ?? 0) > 0;
};

/**
 * Cria um registro de compra "fictícia" para o usuário autenticado.
 */
export const createPurchase = async (productId: string): Promise<UserPurchase> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado.');

  const product = await fetchProductById(productId);
  if (!product) throw new Error('Produto não encontrado.');

  const { data, error } = await supabase
    .from('user_purchases')
    .insert({
      user_id: user.id,
      product_id: productId,
      price_paid_cents: product.price_cents,
      status: 'paid', // Simula um pagamento bem-sucedido
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating purchase:', error);
    throw error;
  }

  return data;
};