import { supabase } from './supabase';
import { Model } from '../types';
import { MediaItemWithAccess } from './models';
import { fetchUserPurchases } from './marketplace';

export interface GlobalFeedItem {
  media: MediaItemWithAccess;
  model: Model;
  mainProductId?: string | null; // Para redirecionar para a compra
}

export const fetchGlobalFeedItems = async (): Promise<GlobalFeedItem[]> => {
  // 1. Identificar modelos que o usuário já tem acesso
  const userPurchases = await fetchUserPurchases();
  const purchasedModelIds = new Set(userPurchases.map(p => p.product?.model_id).filter(Boolean));
  const hasWelcomeCarolina = localStorage.getItem('welcomePurchaseCarolina') === 'true';

  // 2. Buscar todas as mídias com os dados de suas modelos
  const { data: mediaWithModels, error } = await supabase
    .from('media_items')
    .select('*, model:models(*)')
    .order('created_at', { ascending: false })
    .limit(100); // Limitar para performance inicial

  if (error || !mediaWithModels) {
    console.error('Error fetching global feed:', error);
    return [];
  }

  // 3. Mapear para GlobalFeedItem, determinando o status de acesso
  const feedItems = mediaWithModels
    .filter(item => item.model) // Garantir que a mídia tem uma modelo associada
    .map((item): GlobalFeedItem => {
      const media = item as any; // Cast para simplificar o acesso
      const model = media.model as Model;
      
      let accessStatus: 'unlocked' | 'free' | 'locked' = 'locked';
      const isCarolina = model.username === 'carolina-andrade';

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
        model: model,
        mainProductId: null, 
      };
    });

  // Embaralhar para uma experiência mais dinâmica
  return feedItems.sort(() => Math.random() - 0.5);
};