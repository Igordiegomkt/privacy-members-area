import * as React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { PostCard } from '../components/PostCard';
import { MediaItemWithAccess } from '../lib/models';
import { fetchGlobalFeedItems, GlobalFeedItem } from '../lib/feedGlobal';
import { MediaViewerFullscreen } from '../components/MediaViewerFullscreen';
import { useCheckout } from '../contexts/CheckoutContext';
import { trackAddToCart } from '../lib/tracking'; // Importando tracking

export const GlobalFeed: React.FC = () => {
  const [feedItems, setFeedItems] = useState<GlobalFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMediaIndex, setOpenMediaIndex] = useState<number | null>(null);
  const navigate = useNavigate();
  const { openCheckoutForProduct } = useCheckout();

  useEffect(() => {
    const loadFeed = async () => {
      try {
        setLoading(true);
        setError(null);
        const items = await fetchGlobalFeedItems();
        setFeedItems(items);
      } catch (e) {
        setError('Não foi possível carregar o feed.');
      } finally {
        setLoading(false);
      }
    };
    loadFeed();
  }, []);

  const handleLockedClick = (item: GlobalFeedItem) => {
    // Se o item tem um produto principal, rastreia AddToCart e abre checkout
    if (item.mainProductId && item.model.mainProductPriceCents) {
        trackAddToCart({
            content_ids: [item.mainProductId],
            value: item.model.mainProductPriceCents / 100,
            currency: 'BRL',
            model_id: item.model.id
        });
        openCheckoutForProduct(item.mainProductId);
    } else if (item.model?.username) {
      // Caso contrário, navega para o perfil da modelo
      navigate(`/modelo/${item.model.username}`);
    }
  };
  
  const handleOpenMedia = (index: number) => {
    const mediaItem = feedItems[index].media;
    if (mediaItem.accessStatus === 'locked') {
        // Should not happen if PostCard is implemented correctly, but safety check
        handleLockedClick(feedItems[index]);
        return;
    }
    setOpenMediaIndex(index);
  };
  
  // Filter unlocked media for the viewer
  const unlockedMedia = feedItems
    .filter(item => item.media.accessStatus !== 'locked')
    .map(item => item.media);

  const currentMediaIndexInUnlockedList = openMediaIndex !== null 
    ? unlockedMedia.findIndex(m => m.id === feedItems[openMediaIndex].media.id)
    : 0;

  return (
    <div className="min-h-screen bg-privacy-black text-white pb-24">
      <Header />
      <main className="mx-auto w-full max-w-md px-2 py-6 sm:px-0">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">Feed</h1>
          <p className="text-sm text-privacy-text-secondary">Novos conteúdos e sugestões para você.</p>
        </div>

        {loading && <div className="text-center py-10">Carregando...</div>}
        {error && <div className="text-center py-10 text-red-400">{error}</div>}
        
        {!loading && !error && feedItems.length === 0 && (
          <div className="text-center py-10 text-privacy-text-secondary">
            <p>Seu feed está vazio. Explore a seção "Em alta"!</p>
          </div>
        )}

        <div className="flex flex-col items-center">
          {feedItems.map((item, index) => (
            <PostCard
              key={item.media.id}
              media={{ ...item.media, model: item.model }}
              priceCents={item.model.mainProductPriceCents}
              onLockedClick={() => handleLockedClick(item)}
              onOpenVideo={() => handleOpenMedia(index)}
              onOpenImage={() => handleOpenMedia(index)}
            />
          ))}
        </div>
      </main>
      
      {openMediaIndex !== null && unlockedMedia.length > 0 && (
        <MediaViewerFullscreen 
          mediaList={unlockedMedia} 
          initialIndex={currentMediaIndexInUnlockedList} 
          isOpen={openMediaIndex !== null} 
          onClose={() => setOpenMediaIndex(null)} 
        />
      )}
      
      <BottomNavigation />
    </div>
  );
};