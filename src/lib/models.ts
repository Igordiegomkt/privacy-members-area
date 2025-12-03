import { supabase } from './supabase';
import { Model, Product, MediaItem } from '../types';
import { fetchUserPurchases } from './marketplace';

export type MediaItemWithAccess = MediaItem & {
  accessStatus: 'unlocked' | 'locked' | 'free';
};

export interface ModelWithStats extends Model {
  total_purchases: number;
}

/**
 * Busca uma modelo pelo seu username.
 */
export const fetchModelByUsername = async (username: string): Promise<Model | null> => {
  console.log('[fetchModelByUsername] Fetching model for username:', username);

  const { data, error } = await supabase
    .from('models')
    .select('*')
    .eq('username', username)
    .single();

  if (error) {
    console.error('[fetchModelByUsername] Supabase error:', error);
    return null;
  }

  console.log('[fetchModelByUsername] Fetched data:', data);
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

/**
 * Busca as modelos mais populares com base no número de compras.
 */
export const fetchTrendingModels = async (): Promise<ModelWithStats[]> => {
  // 1. Buscar todas as compras com o model_id do produto
  const { data: purchases, error: purchaseError } = await supabase
    .from('user_purchases')
    .select('products(model_id)');

  if (purchaseError || !purchases) {
    console.error('Error fetching purchases for trending models:', purchaseError);
    return [];
  }

  // 2. Contar compras por model_id
  const purchaseCounts = new Map<string, number>();
  purchases.forEach(p => {
    const modelId = (p.products as any)?.model_id;
    if (modelId) {
      purchaseCounts.set(modelId, (purchaseCounts.get(modelId) || 0) + 1);
    }
  });

  if (purchaseCounts.size === 0) return [];

  // 3. Buscar os dados das modelos
  const { data: models, error: modelError } = await supabase
    .from('models')
    .select('*')
    .in('id', Array.from(purchaseCounts.keys()));

  if (modelError || !models) {
    console.error('Error fetching models for trending:', modelError);
    return [];
  }

  // 4. Combinar dados e ordenar
  const modelsWithStats: ModelWithStats[] = models.map(model => ({
    ...model,
    total_purchases: purchaseCounts.get(model.id) || 0,
  }));

  return modelsWithStats.sort((a, b) => b.total_purchases - a.total_purchases);
};