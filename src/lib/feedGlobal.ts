import { supabase } from './supabase';
import { Model, MediaItem } from '../types';
import { MediaItemWithAccess } from './models';
import { fetchUserPurchases } from './marketplace';

export interface GlobalFeedItem {
  media: MediaItemWithAccess;
  model: Model & { mainProductPriceCents?: number }; // Added price here
  mainProductId?: string | null; // For redirection to purchase
}

const PAGE_SIZE = 10;

export const fetchGlobalFeedItemsPage = async (params: { page: number; pageSize?: number }): Promise<{ items: GlobalFeedItem[], hasMore: boolean }> => {
  const { page, pageSize = PAGE_SIZE } = params;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  console.log('[GLOBAL FEED] fetchGlobalFeedItemsPage called', { page, pageSize });

  try {
    // 1. Identificar modelos que o usuário já tem acesso
    const userPurchases = await fetchUserPurchases();
    const purchasedModelIds = new Set(userPurchases.map(p => p.products?.model_id).filter(Boolean));
    const hasWelcomeCarolina = localStorage.getItem('welcomePurchaseCarolina') === 'true';

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

    // Map to store model prices to avoid re-calculating
    const modelPriceMap = new Map<string, { price: number, productId: string }>();

    // 3. Mapear para GlobalFeedItem, determinando o status de acesso
    const feedItems = feedData
      .filter(item => item.media && item.model) // Garantir que a mídia e a modelo existem
      .map((item: any): GlobalFeedItem => {
        // Usamos 'as unknown as MediaItem' para forçar a tipagem, pois o Supabase retorna o objeto
        // aninhado, mas o TS não consegue inferir o tipo exato do objeto aninhado.
        const mediaItem = item.media as unknown as MediaItem;
        const model = item.model as unknown as Model & { products: any[] };
        const products = model.products || [];
        
        let accessStatus: 'unlocked' | 'free' | 'locked' = 'locked';
        const isCarolina = model.username === 'carolina-andrade';
        
        // Determine main product price and ID for CTA
        let mainProductPriceCents = 0;
        let mainProductId: string | null = null;
        
        if (!modelPriceMap.has(model.id)) {
            const baseProduct = products.find((p: any) => p.is_base_membership) || products[0];
            if (baseProduct && baseProduct.id) {
                mainProductPriceCents = baseProduct.price_cents;
                mainProductId = baseProduct.id;
                modelPriceMap.set(model.id, { price: mainProductPriceCents, productId: mainProductId as string });
            }
        } else {
            const cached = modelPriceMap.get(model.id)!;
            mainProductPriceCents = cached.price;
            mainProductId = cached.productId;
        }

        if (mediaItem.is_free) {
          accessStatus = 'free';
        } else if ((isCarolina && hasWelcomeCarolina) || purchasedModelIds.has(model.id)) {
          accessStatus = 'unlocked';
        }
        
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