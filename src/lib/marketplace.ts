import { supabase } from './supabase';
import { Product, UserPurchase } from '../types';

/**
 * Tipo combinado para uma compra que inclui os detalhes do produto associado.
 * O Supabase retorna a tabela joinada como uma propriedade aninhada.
 */
export type UserPurchaseWithProduct = UserPurchase & {
  products: Product | null; // O join pode resultar em nulo se o produto for deletado
};

/**
 * Busca todos os produtos ativos no marketplace, ordenados pelos mais recentes.
 * @returns Uma promessa que resolve para um array de produtos.
 */
export const fetchProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
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
 * @param id O UUID do produto a ser buscado.
 * @returns Uma promessa que resolve para o produto encontrado ou null.
 */
export const fetchProductById = async (id: string): Promise<Product | null> => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    // Um erro 'PGRST116' significa "0 rows", o que é esperado se o ID não existir.
    if (error.code !== 'PGRST116') {
      console.error('Error fetching product by ID:', error.message);
    }
    return null;
  }

  return data;
};

/**
 * Busca todas as compras do usuário atualmente autenticado.
 * Inclui os detalhes do produto comprado através de um join.
 * @returns Uma promessa que resolve para um array de compras com detalhes do produto.
 */
export const fetchUserPurchases = async (): Promise<UserPurchaseWithProduct[]> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Se não houver usuário, não há compras para buscar.
    return [];
  }

  const { data, error } = await supabase
    .from('user_purchases')
    .select('*, products(*)') // Realiza o join com a tabela de produtos
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user purchases:', error.message);
    throw new Error('Não foi possível buscar as compras do usuário.');
  }

  return (data as UserPurchaseWithProduct[]) || [];
};