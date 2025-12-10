import * as React from 'react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { PostCard } from '../components/PostCard';
import { MediaItemWithAccess } from '../lib/models';
import { fetchGlobalFeedItemsPage, GlobalFeedItem } from '../lib/feedGlobal';
import { MediaViewerFullscreen } from '../components/MediaViewerFullscreen';
import { useCheckout } from '../contexts/CheckoutContext';
import { trackAddToCart } from '../lib/tracking'; // Importando tracking

const PAGE_SIZE = 10;

export const GlobalFeed: React.FC = () => {
  const [feedItems, setFeedItems] = useState<GlobalFeedItem[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMediaIndex, setOpenMediaIndex] = useState<number | null>(null);
  const navigate = useNavigate();
  const { openCheckoutForProduct } = useCheckout();
  
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadPage = useCallback(async (nextPage: number) => {
    if (loading || !hasMore) return;
    
    // Se for a primeira página, mostramos o loading principal
    if (nextPage === 0) setLoading(true);
    
    setError(null);

    try {
      const { items: newItems, hasMore: nextHasMore } = await fetchGlobalFeedItemsPage({ 
        page: nextPage,
        pageSize: PAGE_SIZE
      });
      
      setFeedItems(prev => nextPage === 0 ? newItems : [...prev, ...newItems]);
      setPage(nextPage);
      setHasMore(nextHasMore);
      
      if (nextPage === 0 && newItems.length === 0) {
        setHasMore(false); // Não tentar carregar mais se a primeira página for vazia
      }
      
    } catch (e) {
      setError('Não foi possível carregar o feed.');
      setHasMore(false); // Parar de tentar carregar em caso de erro
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore]);

  // 1. Carregamento inicial
  useEffect(() => {
    loadPage(0);
  }, [loadPage]);

  // 2. Intersection Observer para scroll infinito
  useEffect(() => {
    if (!sentinelRef.current || loading || !hasMore) return;

    const observer = new IntersectionObserver(entries => {
      const [entry] = entries;
      if (entry.isIntersecting && !loading && hasMore) {
        loadPage(page + 1);
      }
    }, {
      root: null,
      rootMargin: '0px 0px 300px 0px', // Começa a carregar 300px antes do fim
      threshold: 0.1,
    });

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [page, hasMore, loading, loadPage]);


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

        {loading && feedItems.length === 0 && <div className="text-center py-10">Carregando...</div>}
        {error && <div className="text-center py-10 text-red-400">{error}</div>}
        
        {!loading && !error && feedItems.length === 0 && (
          <div className="text-center py-10 text-privacy-text-secondary">
            <p>Ainda não há conteúdos no feed.</p>
            <p className="text-sm mt-1">Explore a seção "Em alta"!</p>
          </div>
        )}

        <div className="flex flex-col items-center">
          {feedItems.map((item, index) => (
            <PostCard
              key={item.media.id}
              media={{...item.media, model: item.model}}
              priceCents={item.model.mainProductPriceCents}
              onLockedClick={() => handleLockedClick(item)}
              onOpenVideo={() => handleOpenMedia(index)}
              onOpenImage={() => handleOpenMedia(index)}
            />
          ))}
        </div>
        
        {/* Sentinela para Scroll Infinito - Renderiza apenas se houver mais itens */}
        {hasMore && <div ref={sentinelRef} className="h-10" />}
        
        {loading && feedItems.length > 0 && (
            <p className="text-center text-xs text-privacy-text-secondary py-2">Carregando mais posts...</p>
        )}
        {!hasMore && feedItems.length > 0 && (
          <p className="text-center text-xs text-privacy-text-secondary py-2">Você já viu tudo por enquanto 👀</p>
        )}
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