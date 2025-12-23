import { supabase } from './supabase';
import { Model, MediaItem, Product } from '../types'; // Importando Product
import { MediaItemWithAccess, computeMediaAccessStatus, fetchProductsForModel } from './models';
import { fetchUserPurchases } from './marketplace';

export interface GlobalFeedItem {
  media: MediaItemWithAccess;
  model: Model & { mainProductPriceCents?: number }; // Added price here
  mainProductId?: string | null; // For redirection to purchase
}

const PAGE_SIZE = 10;

export const fetchGlobalFeedItemsPage = async (params: { page: number; pageSize?: number; userId: string }): Promise<{ items: GlobalFeedItem[], hasMore: boolean }> => {
  const { page, pageSize = PAGE_SIZE, userId } = params;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  console.log('[GLOBAL FEED] fetchGlobalFeedItemsPage called', { page, pageSize });

  try {
    // 1. Identificar modelos que o usuário já tem acesso (necessário para accessStatus)
    const userPurchases = await fetchUserPurchases(userId); // Usando userId
    
    // Definindo o tipo correto para o cache
    type ModelContextCacheEntry = { 
      products: Product[], 
      mainProductPriceCents: number, 
      mainProductId: string,
    };

    // Map to store model prices and products for access calculation
    const modelContextCache = new Map<string, ModelContextCacheEntry>();

    // 2. Buscar itens do global_feed paginados, fazendo JOIN com media_items e models
    const { data: feedData, error } = await supabase
      .from('global_feed')
      .select(`
        id,
        model_id,
        media_id,
        title,
        subtitle,
        description,
        cta,
        media:media_id (
          *,
          ai_title,
          ai_subtitle,
          ai_description,
          ai_cta,
          ai_tags
        ),
        model:models (
          *,
          products ( id, is_base_membership, price_cents )
        )
      `)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching global feed page:', error);
      console.log('[GLOBAL FEED] fetchGlobalFeedItemsPage result', {
        page,
        pageSize,
        count: 0,
        error: error.message,
      });
      return { items: [], hasMore: false };
    }

    const count = feedData?.length ?? 0;
    
    if (count === 0) {
      console.log('[GLOBAL FEED] fetchGlobalFeedItemsPage result', {
        page,
        pageSize,
        count: 0,
        error: null,
      });
      return { items: [], hasMore: false };
    }

    // 3. Mapear para GlobalFeedItem, determinando o status de acesso
    const feedItems = feedData
      .filter(item => item.media && item.model)
      .map((item: any): GlobalFeedItem => {
        const mediaItem = item.media as unknown as MediaItem;
        const model = item.model as unknown as Model & { products: any[] };
        const rawProducts = model.products || [];
        
        let mainProductPriceCents = 0;
        let mainProductId: string | null = null;
        let productsForModel: Product[] = [];
        
        if (!modelContextCache.has(model.id)) {
            productsForModel = rawProducts.map((p: any) => ({
                id: p.id,
                is_base_membership: p.is_base_membership,
                price_cents: p.price_cents,
                name: '', // Placeholder, not needed for access check
                type: 'subscription', // Placeholder
                status: 'active', // Placeholder
                created_at: new Date().toISOString(), // Placeholder
            }));
            
            const baseProduct = productsForModel.find((p: any) => p.is_base_membership) || productsForModel[0];
            if (baseProduct && baseProduct.id) {
                mainProductPriceCents = baseProduct.price_cents;
                mainProductId = baseProduct.id;
                // Corrigido: Usando ModelContextCacheEntry
                modelContextCache.set(model.id, { 
                    products: productsForModel, 
                    mainProductPriceCents: mainProductPriceCents,
                    mainProductId: mainProductId as string 
                });
            }
        } else {
            const cached = modelContextCache.get(model.id)!;
            // Corrigido: Acessando as propriedades corretas
            mainProductPriceCents = cached.mainProductPriceCents; 
            mainProductId = cached.mainProductId;
            productsForModel = cached.products;
        }

        const accessContext = { purchases: userPurchases, productsForModel, model };
        let accessStatus = computeMediaAccessStatus(mediaItem, accessContext);
        
        // Usar a copy do feed se existir, senão a da mídia
        const finalMedia: MediaItemWithAccess = {
            ...mediaItem,
            title: item.title || mediaItem.title,
            subtitle: item.subtitle || mediaItem.subtitle,
            description: item.description || mediaItem.description,
            cta: item.cta || mediaItem.cta,
            accessStatus,
        };


        return {
          media: finalMedia,
          model: {
              ...model,
              mainProductPriceCents, // Attach price to model object
          },
          mainProductId, 
        };
      });

    // Determine if there are more items to load
    const hasMore = count === pageSize;
    
    console.log('[GLOBAL FEED] fetchGlobalFeedItemsPage result', {
      page,
      pageSize,
      count: count,
      error: null,
    });

    return { items: feedItems, hasMore };
  } catch (e) {
    const error = e as Error;
    console.error('Unexpected error in fetchGlobalFeedItemsPage:', error);
    console.log('[GLOBAL FEED] fetchGlobalFeedItemsPage result', {
      page,
      pageSize,
      count: 0,
      error: error.message,
    });
    return { items: [], hasMore: false };
  }
};