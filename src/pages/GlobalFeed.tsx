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
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMediaIndex, setOpenMediaIndex] = useState<number | null>(null);
  const navigate = useNavigate();
  const { openCheckoutForProduct } = useCheckout();
  
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadPage = useCallback(async (nextPage: number) => {
    const isFirstPage = nextPage === 0;

    if (isFirstPage) {
      if (!isInitialLoading && !hasMore) return;
      setIsInitialLoading(true);
    } else {
      if (isPageLoading || !hasMore) return;
      setIsPageLoading(true);
    }
    
    console.log('[GLOBAL FEED] loadPage called', { nextPage, isInitialLoading, isPageLoading, hasMore });
    setError(null);

    try {
      const { items: newItems, hasMore: nextHasMore } = await fetchGlobalFeedItemsPage({ 
        page: nextPage,
        pageSize: PAGE_SIZE
      });
      
      console.log('[GLOBAL FEED] loadPage result', {
        nextPage,
        received: newItems.length,
        nextHasMore,
      });
      
      if (isFirstPage) {
        setFeedItems(newItems);
      } else {
        setFeedItems(prev => [...prev, ...newItems]);
      }
      
      setPage(nextPage);
      setHasMore(nextHasMore);
      
    } catch (e) {
      console.error('[GLOBAL FEED] loadPage error', e);
      setError('Erro ao carregar o feed.');
      setHasMore(false); // Parar de tentar carregar em caso de erro
    } finally {
      if (isFirstPage) {
        setIsInitialLoading(false);
      } else {
        setIsPageLoading(false);
      }
    }
  }, [isInitialLoading, isPageLoading, hasMore]);

  // 1. Carregamento inicial
  useEffect(() => {
    console.log('[GLOBAL FEED] useEffect initial, calling loadPage(0)');
    loadPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Intersection Observer para scroll infinito
  useEffect(() => {
    // Usamos isPageLoading aqui para evitar chamadas duplicadas
    if (!sentinelRef.current || isInitialLoading || isPageLoading || !hasMore) return;

    const observer = new IntersectionObserver(entries => {
      const [entry] = entries;
      if (entry.isIntersecting && !isPageLoading && hasMore) {
        loadPage(page + 1);
      }
    }, {
      root: null,
      rootMargin: '0px 0px 300px 0px', // Começa a carregar 300px antes do fim
      threshold: 0.1,
    });

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [page, hasMore, isInitialLoading, isPageLoading, loadPage]);


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

  // Tratamento de estados de carregamento e erro
  const renderContent = () => {
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full pt-16">
          <p className="text-sm text-red-400 mb-4">{error}</p>
          <button
            onClick={() => loadPage(0)}
            className="px-4 py-2 rounded bg-primary text-black text-sm font-semibold"
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    if (isInitialLoading && feedItems.length === 0) {
      return <div className="text-center py-10 text-privacy-text-secondary">Carregando...</div>;
    }
    
    if (!isInitialLoading && feedItems.length === 0) {
      return (
        <div className="text-center py-10 text-privacy-text-secondary">
          <p>Ainda não há conteúdos no feed.</p>
          <p className="text-sm mt-1">Explore a seção "Em alta"!</p>
        </div>
      );
    }

    return (
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
        
        {/* Sentinela para Scroll Infinito - Renderiza apenas se houver mais itens */}
        {hasMore && <div ref={sentinelRef} className="h-10" />}
        
        {isPageLoading && (
            <p className="text-center text-xs text-privacy-text-secondary py-2">Carregando mais posts...</p>
        )}
        {!hasMore && feedItems.length > 0 && (
          <p className="text-center text-xs text-privacy-text-secondary py-2">Você já viu tudo por enquanto 👀</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-privacy-black text-white pb-24">
      <Header />
      <main className="mx-auto w-full max-w-md px-2 py-6 sm:px-0">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">Feed</h1>
          <p className="text-sm text-privacy-text-secondary">Novos conteúdos e sugestões para você.</p>
        </div>

        {renderContent()}
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