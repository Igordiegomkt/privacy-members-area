import { supabase } from './supabase';
import { Model } from '../types';
import { MediaItemWithAccess } from './models';
import { fetchUserPurchases } from './marketplace';

export interface GlobalFeedItem {
  media: MediaItemWithAccess;
  model: Model & { mainProductPriceCents?: number }; // Added price here
  mainProductId?: string | null; // For redirection to purchase
}

export const fetchGlobalFeedItems = async (): Promise<GlobalFeedItem[]> => {
  // 1. Identificar modelos que o usuário já tem acesso
  const userPurchases = await fetchUserPurchases();
  const purchasedModelIds = new Set(userPurchases.map(p => p.products?.model_id).filter(Boolean));
  const hasWelcomeCarolina = localStorage.getItem('welcomePurchaseCarolina') === 'true';

  // 2. Buscar todas as mídias com os dados de suas modelos e produtos base
  const { data: mediaWithModels, error } = await supabase
    .from('media_items')
    .select(`
      *, 
      model:models(*),
      ai_title,
      ai_subtitle,
      ai_description,
      ai_cta,
      ai_tags,
      products ( id, is_base_membership, price_cents )
    `) // Incluindo todos os campos de copy e IA + produtos
    .order('created_at', { ascending: false })
    .limit(100); // Limitar para performance inicial

  if (error || !mediaWithModels) {
    console.error('Error fetching global feed:', error);
    return [];
  }

  // Map to store model prices to avoid re-calculating
  const modelPriceMap = new Map<string, { price: number, productId: string }>();

  // 3. Mapear para GlobalFeedItem, determinando o status de acesso
  const feedItems = mediaWithModels
    .filter(item => item.model) // Garantir que a mídia tem uma modelo associada
    .map((item): GlobalFeedItem => {
      const media = item as any; // Cast para simplificar o acesso
      const model = media.model as Model;
      const products = media.products || [];
      
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
              // Garantindo que productId é string antes de setar no Map
              modelPriceMap.set(model.id, { price: mainProductPriceCents, productId: mainProductId as string });
          }
      } else {
          const cached = modelPriceMap.get(model.id)!;
          mainProductPriceCents = cached.price;
          mainProductId = cached.productId;
      }


      if (media.is_free) {
        accessStatus = 'free';
      } else if ((isCarolina && hasWelcomeCarolina) || purchasedModelIds.has(model.id)) {
        accessStatus = 'unlocked';
      }

      return {
        media: {
          ...media,
          accessStatus,
        },
        model: {
            ...model,
            mainProductPriceCents, // Attach price to model object
        },
        mainProductId, 
      };
    });

  // Embaralhar para uma experiência mais dinâmica
  return feedItems.sort(() => Math.random() - 0.5);
};