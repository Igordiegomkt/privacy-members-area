import { supabase } from './supabase';
import { UserPurchaseWithProduct, Product, Model } from '../types';

/**
 * Fetches all products available in the marketplace.
 */
export const getProducts = async (): Promise<(Product & { models: Model | null })[]> => {
  if (!supabase) {
    console.error('Supabase client not initialized.');
    return [];
  }

  const { data, error } = await supabase
    .from('products')
    .select('*, models(*)')
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  // Assumindo que models(*) retorna um único objeto ou null
  return (data || []) as (Product & { models: Model | null })[];
};


/**
 * Fetches all purchases made by the current authenticated user.
 * NOTE: This requires the user to be authenticated.
 */
export const getUserPurchases = async (userId: string): Promise<UserPurchaseWithProduct[]> => {
  if (!supabase) {
    console.error('Supabase client not initialized.');
    return [];
  }

  // Query para buscar compras do usuário com detalhes do produto e modelo
  const { data, error } = await supabase
    .from('user_purchases')
    .select(`
      id,
      user_id,
      product_id,
      status,
      created_at,
      amount_cents:price_paid_cents,
      paid_at:created_at,
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
    .eq('user_id', userId)
    .eq('status', 'completed');

  if (error) {
    console.error('Error fetching user purchases:', error);
    return [];
  }

  // Correção do erro de tipagem: usamos 'unknown' como intermediário 
  // para forçar a tipagem complexa retornada pelo Supabase.
  return (data || []) as unknown as UserPurchaseWithProduct[];
};