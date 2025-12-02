import { supabase } from './supabase';
import { Model, Product, MediaItem } from '../types';
import { fetchUserPurchases } from './marketplace';

export type MediaItemWithAccess = MediaItem & {
  accessStatus: 'unlocked' | 'locked' | 'free';
};

/**
 * Busca uma modelo pelo seu username.
 */
export const fetchModelByUsername = async (username: string): Promise<Model | null> => {
  const { data, error } = await supabase
    .from('models')
    .select('*')
    .eq('username', username)
    .single();

  if (error) {
    console.error('Error fetching model by username:', error);
    return null;
  }
  return data;
};

/**
 * Busca os produtos de uma modelo específica.
 */
export const fetchProductsForModel = async (modelId: string): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('model_id', modelId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products for model:', error);
    return [];
  }
  return data;
};

/**
 * Busca as mídias de uma modelo e determina o status de acesso para o usuário atual.
 */
export const fetchMediaForModel = async (modelId: string, isBaseContent: boolean): Promise<MediaItemWithAccess[]> => {
  const { data: media, error: mediaError } = await supabase
    .from('media_items')
    .select('*')
    .eq('model_id', modelId)
    .order('created_at', { ascending: false });

  if (mediaError) {
    console.error('Error fetching media for model:', mediaError);
    return [];
  }

  // Se for o conteúdo base (Carolina), tudo está desbloqueado por padrão.
  if (isBaseContent) {
    return media.map(item => ({ ...item, accessStatus: 'unlocked' }));
  }

  // Para outras modelos, verificamos as compras.
  const userPurchases = await fetchUserPurchases();
  const purchasedProductIds = new Set(userPurchases.map(p => p.product_id));

  const modelProducts = await fetchProductsForModel(modelId);
  const modelProductIds = new Set(modelProducts.map(p => p.id));

  const hasPurchasedModelAccess = [...purchasedProductIds].some(id => modelProductIds.has(id));

  return media.map(item => {
    let accessStatus: 'unlocked' | 'locked' | 'free' = 'locked';
    if (item.is_free) {
      accessStatus = 'free';
    } else if (hasPurchasedModelAccess) {
      accessStatus = 'unlocked';
    }
    return { ...item, accessStatus };
  });
};