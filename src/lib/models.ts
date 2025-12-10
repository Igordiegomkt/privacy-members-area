import { supabase } from './supabase';
import { Model, Product, MediaItem, MediaAccessStatus } from '../types';
import { fetchUserPurchases, UserPurchaseWithProduct } from './marketplace';

export type MediaItemWithAccess = MediaItem & {
  accessStatus: MediaAccessStatus;
  model?: Model;
};

export interface ModelWithStats extends Model {
  total_purchases: number;
}

const BASE_MODEL_USERNAME = 'carolina-andrade';
const PAGE_SIZE = 10; // Define page size here for consistency

interface AccessContext {
  purchases: UserPurchaseWithProduct[];
  productsForModel: Product[];
  model: Model;
}

export function computeMediaAccessStatus(
  media: MediaItem,
  ctx: AccessContext
): MediaAccessStatus {
  if (media.is_free) return 'free';

  const isCarolina = ctx.model.username === BASE_MODEL_USERNAME;
  const hasWelcome = localStorage.getItem('welcomePurchaseCarolina') === 'true';

  if (isCarolina && hasWelcome) return 'unlocked';

  const baseMembership = ctx.productsForModel.find(p => p.is_base_membership);
  const purchasedIds = new Set(ctx.purchases.map(p => p.product_id));

  if (baseMembership && purchasedIds.has(baseMembership.id)) {
    return 'unlocked';
  }
  
  const hasAnyProductFromModel = ctx.productsForModel.some(p => purchasedIds.has(p.id));
  if (hasAnyProductFromModel) return 'unlocked';

  return 'locked';
}

export const fetchModelByUsername = async (username: string): Promise<Model | null> => {
  const { data, error } = await supabase
    .from('models')
    .select('*')
    .eq('username', username)
    .single();

  if (error) {
    console.error('[fetchModelByUsername] Supabase error:', error);
    return null;
  }
  return data;
};

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

export const fetchModelMediaCounts = async (modelId: string): Promise<{ totalPosts: number; totalPhotos: number; totalVideos: number }> => {
  try {
    const [totalRes, photosRes, videosRes] = await Promise.all([
      supabase.from('media_items').select('id', { count: 'exact', head: true }).eq('model_id', modelId),
      supabase.from('media_items').select('id', { count: 'exact', head: true }).eq('model_id', modelId).eq('type', 'image'),
      supabase.from('media_items').select('id', { count: 'exact', head: true }).eq('model_id', modelId).eq('type', 'video'),
    ]);

    return {
      totalPosts: totalRes.count ?? 0,
      totalPhotos: photosRes.count ?? 0,
      totalVideos: videosRes.count ?? 0,
    };
  } catch (error) {
    console.error('Error fetching media counts:', error);
    return { totalPosts: 0, totalPhotos: 0, totalVideos: 0 };
  }
};

// Renomeando e paginando a função de fetch de mídia da modelo
export const fetchMediaForModelPage = async (params: { modelId: string, page: number, pageSize?: number }): Promise<{ items: MediaItemWithAccess[], hasMore: boolean }> => {
  const { modelId, page, pageSize = PAGE_SIZE } = params;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  console.log('[MODEL PROFILE] fetchMediaForModelPage called', { page, pageSize, modelId });

  try {
    // 1. Fetch media items paginated
    const { data: mediaItems, error: mediaError } = await supabase
      .from('media_items')
      .select(`
        *,
        ai_title,
        ai_subtitle,
        ai_description,
        ai_cta,
        ai_tags
      `) // Incluindo todos os campos de copy e IA
      .eq('model_id', modelId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (mediaError) {
      console.error('Error fetching media for model page:', mediaError);
      return { items: [], hasMore: false };
    }

    const count = mediaItems?.length ?? 0;

    if (count === 0) {
      console.log('[MODEL PROFILE] fetchMediaForModelPage result', {
        page,
        pageSize,
        count: 0,
        error: null,
      });
      return { items: [], hasMore: false };
    }

    // 2. Fetch context data (model, purchases, products)
    const { data: model, error: modelError } = await supabase.from('models').select('*').eq('id', modelId).single();
    if (modelError || !model) {
      console.error('Error fetching model context:', modelError);
      return { items: [], hasMore: false };
    }

    const purchases = await fetchUserPurchases();
    const productsForModel = await fetchProductsForModel(modelId);
    const accessContext: AccessContext = { purchases, productsForModel, model };

    // 3. Compute access status
    const mediaWithAccess = mediaItems.map(media => {
      const rawThumb = media.thumbnail;
      const isVideoThumb =
        typeof rawThumb === 'string' &&
        (rawThumb.endsWith('.mp4') || rawThumb.endsWith('.mov') || rawThumb.endsWith('.webm'));
      
      return {
        ...media,
        thumbnail: !isVideoThumb ? rawThumb : null, // Garante que thumbnail de vídeo não seja usada
        accessStatus: computeMediaAccessStatus(media, accessContext),
      };
    });
    
    const hasMore = count === pageSize;
    
    console.log('[MODEL PROFILE] fetchMediaForModelPage result', {
      page,
      pageSize,
      count: count,
      error: null,
    });

    return { items: mediaWithAccess, hasMore };
  } catch (e) {
    const error = e as Error;
    console.error('Unexpected error in fetchMediaForModelPage:', error);
    return { items: [], hasMore: false };
  }
};


export const fetchTrendingModels = async (): Promise<ModelWithStats[]> => {
  const { data, error } = await supabase.functions.invoke('get-trending-models', {
    method: 'GET',
  });

  if (error) {
    console.error('[fetchTrendingModels] invoke error:', error);
    return [];
  }

  if (!data || data.ok === false) {
    console.error('[fetchTrendingModels] payload error:', data);
    return [];
  }

  // A Edge Function retorna um array de objetos que já se encaixam em ModelWithStats
  return (data.models || []) as ModelWithStats[];
};