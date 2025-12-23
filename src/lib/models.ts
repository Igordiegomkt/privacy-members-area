import { supabase } from './supabase';
import { Model, Product, MediaItem, MediaAccessStatus } from '../types';
import { fetchUserPurchases, UserPurchaseWithProduct } from './marketplace';
import { getValidGrant, AccessGrant } from './accessGrant'; // Novo import

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

/**
 * Verifica se o AccessGrant temporário concede acesso a esta mídia.
 */
function checkGrantAccess(media: MediaItem, grant: AccessGrant, productsForModel: Product[]): boolean {
    if (grant.scope === 'global') {
        return true;
    }

    if (grant.scope === 'model' && media.model_id === grant.model_id) {
        return true;
    }

    if (grant.scope === 'product' && grant.product_id) {
        // Verifica se a mídia está vinculada ao produto do grant
        // Nota: Como não temos a relação product_media no objeto media,
        // precisamos de uma forma de verificar se a mídia pertence ao produto.
        // Para simplificar e evitar uma query extra por mídia, vamos assumir
        // que se a mídia pertence à modelo do produto, e o produto é o único
        // produto base, liberamos.
        
        // Alternativa mais robusta (requer query):
        // Se a mídia for de um pack, ela estará em product_media.
        // Se for single_media, o product_id estará na media_items (se implementado).
        
        // Para a implementação mínima, vamos verificar se a mídia está ligando ao produto do grant.
        // Como a tabela media_items não tem product_id, precisamos de uma query.
        // Para evitar N+1 queries, vamos usar uma heurística: se a mídia for da modelo do produto,
        // e o produto for o VIP base, liberamos (já que o VIP libera tudo).
        
        // HEURÍSTICA SIMPLIFICADA: Se o grant é de um produto, e a mídia é da modelo desse produto,
        // e o produto é o VIP base, liberamos.
        const grantedProduct = productsForModel.find(p => p.id === grant.product_id);
        
        if (grantedProduct && grantedProduct.is_base_membership && media.model_id === grantedProduct.model_id) {
            return true;
        }
        
        // Para mídias avulsas/packs, a verificação precisa ser mais precisa.
        // Como a EF validate-access-link não retorna a lista de media_ids,
        // vamos focar apenas no escopo 'global' e 'model' para o override inicial.
        // Se o escopo for 'product', o usuário deve ser redirecionado para a página do produto.
        
        // Para evitar complexidade de DB aqui, vamos considerar que o grant 'product'
        // só libera o acesso se for o produto VIP base da modelo.
        
        // Se o grant for de um produto específico (não VIP base), o acesso à mídia
        // individual não será liberado automaticamente aqui.
        
        // Vamos manter a lógica restrita ao escopo 'global' e 'model' por enquanto,
        // e garantir que o grant 'product' libere o acesso na página do produto.
        
        // Se o grant for de um produto, e a mídia for da modelo desse produto,
        // e o produto for o VIP base, liberamos.
        if (grantedProduct && grantedProduct.is_base_membership && media.model_id === grantedProduct.model_id) {
            return true;
        }
    }

    return false;
}


export function computeMediaAccessStatus(
  media: MediaItem,
  ctx: AccessContext
): MediaAccessStatus {
  
  // 1. Verificar AccessGrant temporário
  const grant = getValidGrant();
  if (grant && checkGrantAccess(media, grant, ctx.productsForModel)) {
      return 'unlocked';
  }
  
  // 2. Verificar acesso gratuito
  if (media.is_free) return 'free';

  // 3. Verificar compras existentes (Lógica original)
  const baseMembership = ctx.productsForModel.find(p => p.is_base_membership);
  const purchasedIds = new Set(ctx.purchases.map(p => p.product_id));

  // Se comprou o produto base (VIP)
  if (baseMembership && purchasedIds.has(baseMembership.id)) {
    return 'unlocked';
  }
  
  // Se comprou qualquer outro produto da modelo (para packs/mídias avulsas)
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
export const fetchMediaForModelPage = async (params: { modelId: string, page: number, pageSize?: number, userId: string }): Promise<{ items: MediaItemWithAccess[], hasMore: boolean }> => {
  const { modelId, page, pageSize = PAGE_SIZE, userId } = params;
  const from = page * pageSize;
  const to = from + pageSize; // Ajuste: Supabase range é inclusivo, mas para simular 'limit' precisamos de +10 itens para saber se há mais.

  console.log('[MODEL PROFILE] fetchMediaForModelPage called', { page, pageSize, modelId });

  try {
    // 1. Fetch context data (model, purchases, products)
    const { data: model, error: modelError } = await supabase.from('models').select('*').eq('id', modelId).single();
    if (modelError || !model) {
      console.error('Error fetching model context:', modelError);
      return { items: [], hasMore: false };
    }

    // 2. Fetch media items paginated (pedindo 1 item a mais para verificar 'hasMore')
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
      .range(from, to); // Pede 11 itens (0-10) se pageSize=10

    if (mediaError) {
      console.error('Error fetching media for model page:', mediaError);
      return { items: [], hasMore: false };
    }

    const rawCount = mediaItems?.length ?? 0;
    
    // 3. Determinar se há mais itens (se o número de itens for maior que o tamanho da página)
    const hasMore = rawCount > pageSize;
    
    // 4. Pegar apenas o tamanho da página (10 itens)
    const itemsToProcess = mediaItems!.slice(0, pageSize);

    // 5. Fetch context data (purchases, products)
    const purchases = await fetchUserPurchases(userId); // Usando o userId
    const productsForModel = await fetchProductsForModel(modelId);
    const accessContext: AccessContext = { purchases, productsForModel, model };

    // 6. Compute access status
    const mediaWithAccess = itemsToProcess.map(media => {
      const rawThumb = media.thumbnail;
      const isVideoThumb =
        typeof rawThumb === 'string' &&
        (rawThumb.endsWith('.mp4') || rawThumb.endsWith('.mov') || rawThumb.endsWith('.webm'));
      
      return {
        ...media,
        thumbnail: !isVideoThumb ? rawThumb : null, // Garante que thumbnail de vídeo não seja usada
        accessStatus: computeMediaAccessStatus(media, accessContext),
        model: model, // Adicionando o objeto Model completo
      };
    });
    
    console.log('[MODEL PROFILE] fetchMediaForModelPage result', {
      page,
      pageSize,
      count: mediaWithAccess.length,
      hasMore: hasMore,
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