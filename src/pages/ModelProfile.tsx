import * as React from 'react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Product, Model } from '../types';
import { fetchModelByUsername, fetchProductsForModel, fetchMediaForModelPage, MediaItemWithAccess, fetchModelMediaCounts } from '../lib/models';
import { UserPurchaseWithProduct, getProductImageSrc } from '../lib/marketplace';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { MediaGrid } from '../components/MediaGrid';
import { PostCard } from '../components/PostCard';
import { MediaViewerFullscreen } from '../components/MediaViewerFullscreen';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useProtection } from '../hooks/useProtection';
import { ArrowLeft, MessageCircle, Gift, CheckCircle } from 'lucide-react';
import { usePurchases } from '../contexts/PurchaseContext';
import { useCheckout } from '../contexts/CheckoutContext';
import { trackViewContent, trackAddToCart } from '../lib/tracking'; // Importando trackAddToCart
import { feedCache } from '../lib/feedCache'; // Importando cache

const formatPrice = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface ProductCardProps {
    product: Product;
    isPurchased: boolean;
    modelName: string;
    isFirst: boolean;
    modelCoverUrl?: string | null;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, isPurchased, modelName, isFirst, modelCoverUrl }: ProductCardProps) => {
    const navigate = useNavigate();
    const { openCheckoutForProduct } = useCheckout();

    const handleCtaClick = () => {
        if (isPurchased) {
            // Se já comprou, navega para o detalhe do produto
            navigate(`/produto/${product.id}`);
        } else {
            // Se não comprou, abre o modal de checkout
            openCheckoutForProduct(product.id);
        }
    };
    
    const productImageSrc = getProductImageSrc(product, { cover_url: modelCoverUrl });

    return (
        <div className="bg-privacy-surface rounded-lg overflow-hidden group flex flex-col">
            <div className="relative aspect-square cursor-pointer" onClick={() => navigate(`/produto/${product.id}`)}>
                <img 
                    src={productImageSrc}
                    alt={product.name} 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                />
                {isFirst && !isPurchased && (
                    <div className="absolute top-2 left-2 bg-primary text-privacy-black rounded-full px-2 py-1 text-xs font-bold">
                        🔥 Mais vendido de {modelName.split(' ')[0]}
                    </div>
                )}
                {isPurchased && (
                    <div className="absolute top-2 left-2 bg-green-500 text-white rounded-full px-2 py-1 text-xs font-bold">
                        ✔ Já é seu
                    </div>
                )}
            </div>
            <div className="p-4 flex flex-col flex-1">
                <h3 className="font-semibold text-privacy-text-primary truncate flex-1">{product.name}</h3>
                <p className="text-lg font-bold text-primary mt-1">{formatPrice(product.price_cents)}</p>
                <button
                    onClick={handleCtaClick}
                    className={`w-full mt-3 text-sm font-semibold py-2 rounded-lg transition-colors ${
                        isPurchased
                            ? 'bg-privacy-border text-privacy-text-primary hover:bg-privacy-border/70'
                            : 'bg-primary text-privacy-black hover:opacity-90'
                    }`}
                >
                    {isPurchased ? 'Ver conteúdo' : 'Desbloquear agora'}
                </button>
            </div>
        </div>
    );
};

const PAGE_SIZE = 10;

export const ModelProfile: React.FC = () => {
    useProtection();
    const { username } = useParams<{ username: string }>();
    const navigate = useNavigate();
    const { openCheckoutForProduct } = useCheckout();
    
    // Estados de Carregamento e Dados do Perfil
    const [model, setModel] = useState<Model | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [hasAccess, setHasAccess] = useState(false);
    const [mediaCounts, setMediaCounts] = useState<{ totalPosts: number; totalPhotos: number; totalVideos: number } | null>(null);
    
    // --- ESTADOS DO MURAL (ALINHADOS COM GLOBAL FEED) ---
    const [muralItems, setMuralItems] = useState<MediaItemWithAccess[]>([]);
    const [muralPage, setMuralPage] = useState(0);
    const [muralHasMore, setMuralHasMore] = useState(true);
    const [muralInitialLoading, setMuralInitialLoading] = useState(true);
    const [muralPageLoading, setMuralPageLoading] = useState(false);
    const [muralError, setMuralError] = useState<string | null>(null);
    // ----------------------------------------------------
    
    const [openMediaIndex, setOpenMediaIndex] = useState<number | null>(null);
    const { purchases } = usePurchases();
    
    const muralSentinelRef = useRef<HTMLDivElement | null>(null);
    
    // Refs para acessar o estado mais recente dentro do useCallback e IntersectionObserver
    const muralPageRef = useRef(muralPage);
    const muralHasMoreRef = useRef(muralHasMore);
    const muralPageLoadingRef = useRef(muralPageLoading);
    const muralItemsRef = useRef(muralItems);

    useEffect(() => {
        muralPageRef.current = muralPage;
        muralHasMoreRef.current = muralHasMore;
        muralPageLoadingRef.current = muralPageLoading;
        muralItemsRef.current = muralItems;
    }, [muralPage, muralHasMore, muralPageLoading, muralItems]);


    // Function to load media page (Memoized)
    const loadMuralPage = useCallback(async (nextPage: number) => {
        if (!model?.id) return;

        const isFirstPage = nextPage === 0;
        
        // Prevenção de chamadas duplicadas (usando refs para o estado mais recente)
        if (!isFirstPage && (muralPageLoadingRef.current || !muralHasMoreRef.current)) return;
        
        if (isFirstPage) {
            setMuralInitialLoading(true);
        } else {
            setMuralPageLoading(true);
        }

        setMuralError(null);

        try {
            console.log('[MODEL FEED] loadMuralPage called', { nextPage, modelId: model.id });
            
            const { items: newItems, hasMore: nextHasMore } = await fetchMediaForModelPage({
                modelId: model.id,
                page: nextPage,
                pageSize: PAGE_SIZE,
            });
            
            console.log('[MODEL FEED] loadMuralPage result', {
                nextPage,
                received: newItems.length,
                nextHasMore,
            });
            
            setMuralItems(prev => isFirstPage ? newItems : [...prev, ...newItems]);
            setMuralPage(nextPage);
            setMuralHasMore(nextHasMore);
            
            // Atualizar cache após o carregamento bem-sucedido
            feedCache.model[model.id] = {
                items: isFirstPage ? newItems : [...muralItemsRef.current, ...newItems],
                hasMore: nextHasMore,
                lastPage: nextPage,
            };
            
        } catch (e) {
            console.error("Error loading media page:", e);
            setMuralError('Erro ao carregar o mural.');
            setMuralHasMore(false); // Parar de tentar carregar em caso de erro
        } finally {
            if (isFirstPage) {
                setMuralInitialLoading(false);
            } else {
                setMuralPageLoading(false);
            }
        }
    }, [model?.id]); // Dependências ajustadas para apenas model.id

    // 1. Efeito para carregar o PERFIL (Model + Products + Counts)
    useEffect(() => {
        console.log('[MODEL PROFILE] useEffect loadModel start', { username });
        if (!username) { 
            setProfileLoading(false); 
            return; 
        }
        
        const loadProfileData = async () => {
            setProfileLoading(true); 
            setProfileError(null);
            
            try {
                const fetchedModel = await fetchModelByUsername(username);
                
                if (!fetchedModel) {
                    setProfileError('Modelo não encontrada.');
                    setModel(null);
                    setProfileLoading(false);
                    return;
                }
                
                setModel(fetchedModel);
                
                trackViewContent({
                    content_type: 'model_profile',
                    content_ids: [fetchedModel.id],
                    model_id: fetchedModel.id
                });

                // Fetch products once (not paginated)
                const fetchedProducts = await fetchProductsForModel(fetchedModel.id);
                setProducts(fetchedProducts);
                
                // Fetch total counts
                const counts = await fetchModelMediaCounts(fetchedModel.id);
                setMediaCounts(counts);

                const modelProductIds = new Set(fetchedProducts.map(p => p.id));
                const userHasAnyProduct = purchases.some((p: UserPurchaseWithProduct) => modelProductIds.has(p.product_id));
                const isCarolinaWelcome = fetchedModel.username === 'carolina-andrade' && localStorage.getItem('welcomePurchaseCarolina') === 'true';
                setHasAccess(userHasAnyProduct || isCarolinaWelcome);
                
                console.log('[MODEL PROFILE] useEffect loadModel done', { modelId: fetchedModel.id });
                
                // --- CARREGAMENTO INICIAL DO MURAL (PÁGINA 0) ---
                const cached = feedCache.model[fetchedModel.id];
                if (cached && cached.items.length > 0) {
                    console.log('[MODEL PROFILE] Loading mural from cache.');
                    setMuralItems(cached.items);
                    setMuralHasMore(cached.hasMore);
                    setMuralPage(cached.lastPage);
                    setMuralInitialLoading(false);
                } else {
                    // Se não houver cache, carrega a primeira página
                    // Chamamos loadMuralPage(0) no próximo useEffect para garantir que 'model' esteja definido
                }

            } catch (e) {
                console.error('[MODEL PROFILE] loadProfileData error:', e);
                setProfileError('Erro ao carregar dados do perfil.');
                setModel(null);
                setMuralInitialLoading(false);
            } finally {
                setProfileLoading(false);
            }
        };
        
        // Reset media state when profile changes
        setMuralItems([]);
        setMuralPage(0);
        setMuralHasMore(true);
        setMuralInitialLoading(true); 
        setMuralPageLoading(false);
        
        loadProfileData();
    }, [username, purchases]); // loadMuralPage removido daqui

    // 2. Efeito para carregar a primeira página do mural (após o modelo ser carregado)
    useEffect(() => {
        if (model?.id && muralInitialLoading && muralItems.length === 0) {
            // Se o modelo foi carregado e o mural ainda está no estado inicial (sem cache), carrega a página 0
            loadMuralPage(0);
        }
    }, [model?.id, muralInitialLoading, muralItems.length, loadMuralPage]);


    // 3. Intersection Observer for infinite scroll (Mural)
    useEffect(() => {
        if (!muralSentinelRef.current || muralInitialLoading) return;

        const observer = new IntersectionObserver(entries => {
            const [entry] = entries;
            // Usamos refs para acessar o estado mais recente
            if (entry.isIntersecting && !muralPageLoadingRef.current && muralHasMoreRef.current) {
                loadMuralPage(muralPageRef.current + 1);
            }
        }, {
            root: null,
            rootMargin: '0px 0px 300px 0px',
            threshold: 0.1,
        });

        observer.observe(muralSentinelRef.current);

        return () => observer.disconnect();
    }, [muralInitialLoading, loadMuralPage]);


    const mainProduct = products.find(p => p.is_base_membership) || products[0];

    const handleLockedClick = () => {
        if (mainProduct) {
            trackAddToCart({
                content_ids: [mainProduct.id],
                value: mainProduct.price_cents / 100,
                currency: 'BRL',
                model_id: model?.id
            });
            
            openCheckoutForProduct(mainProduct.id);
        } else {
            navigate('/loja');
        }
    };
    
    const handleOpenMedia = (index: number) => {
        const mediaItem = muralItems[index];
        if (mediaItem.accessStatus === 'locked') {
            handleLockedClick();
            return;
        }
        // Filter unlocked media for the viewer
        const unlockedMedia = muralItems.filter(m => m.accessStatus !== 'locked');
        
        // Find index in the unlocked list
        const unlockedIndex = unlockedMedia.findIndex(m => m.id === mediaItem.id);
        if (unlockedIndex !== -1) {
            setOpenMediaIndex(unlockedIndex);
        }
    };

    // Tratamento de estados de carregamento e erro do Perfil
    if (profileLoading) {
        return (
            <div className="min-h-screen bg-privacy-black flex items-center justify-center text-white">
                <p className="text-sm text-privacy-text-secondary">Carregando perfil...</p>
            </div>
        );
    }

    if (profileError || !model) {
        return (
            <div className="min-h-screen bg-privacy-black flex items-center justify-center text-white">
                <p className="text-sm text-red-400">{profileError || 'Modelo não encontrada.'}</p>
            </div>
        );
    }

    // Garantimos que model é Model aqui
    const currentModel = model as Model;

    // Usando os contadores totais (fix)
    const stats = mediaCounts || { totalPosts: 0, totalPhotos: 0, totalVideos: 0 };
    
    // Media for Feed/Viewer (only unlocked/free)
    const feedMedia = muralItems.filter(m => m.accessStatus === 'free' || m.accessStatus === 'unlocked');
    const unlockedMedia = muralItems.filter(m => m.accessStatus !== 'locked');
    
    const purchasedProductIds = new Set(purchases.map((p: UserPurchaseWithProduct) => p.product_id));
    

    return (
        <div className="min-h-screen bg-privacy-black text-white pb-24">
            <Header />
            <main className="max-w-4xl mx-auto">
                <button onClick={() => navigate(-1)} className="absolute top-5 left-4 z-50 text-white bg-black/30 rounded-full p-2 hover:bg-black/50">
                    <ArrowLeft size={20} />
                </button>
                
                <div className="relative w-full">
                    <div className="h-40 sm:h-56 w-full overflow-hidden bg-privacy-surface">
                        {currentModel.cover_url && <img src={currentModel.cover_url} alt={`${currentModel.name} cover`} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex flex-col items-center -mt-12 sm:-mt-16">
                        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-privacy-black overflow-hidden bg-privacy-surface">
                            {currentModel.avatar_url && <img src={currentModel.avatar_url} alt={currentModel.name} className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex items-center gap-1.5 mt-2">
                            <h1 className="text-xl sm:text-2xl font-bold text-white">{currentModel.name}</h1>
                            {currentModel.is_verified && <span className="inline-flex items-center justify-center rounded-full bg-blue-500 w-4 h-4 text-[10px] text-white">✓</span>}
                        </div>
                        <p className="text-sm text-privacy-text-secondary">@{currentModel.username}</p>
                        {currentModel.bio && <p className="mt-3 px-6 text-center text-sm text-privacy-text-secondary max-w-lg">{currentModel.bio}</p>}
                        
                        <div className="mt-4 flex items-center justify-center gap-4">
                            <button className="bg-privacy-surface border border-privacy-border rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2"><MessageCircle size={16}/> Chat</button>
                            <button className="bg-privacy-surface border border-privacy-border rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2"><Gift size={16}/> Mimo</button>
                        </div>

                        <div className="mt-4 flex items-center justify-center gap-6 text-sm text-privacy-text-secondary">
                            <span><strong className="text-white">{stats.totalPosts}</strong> posts</span>
                            <span><strong className="text-white">{stats.totalPhotos}</strong> fotos</span>
                            <span><strong className="text-white">{stats.totalVideos}</strong> vídeos</span>
                        </div>
                    </div>
                </div>

                {/* CTA Principal VIP (Requirement 9B) */}
                {mainProduct && (
                  <div className="px-4 sm:px-6 my-6">
                    <div className={`rounded-lg p-4 text-sm flex flex-col sm:flex-row items-center justify-between gap-3 ${hasAccess ? 'bg-green-500/10 border border-green-500/30' : 'bg-primary/10 border border-primary/30'}`}>
                      <div className="text-center sm:text-left">
                        {hasAccess ? (
                            <p className="font-semibold text-green-400 flex items-center gap-2">
                                <CheckCircle size={16} /> Acesso VIP de {currentModel.name} liberado!
                            </p>
                        ) : (
                            <>
                                <p className="font-semibold text-primary">
                                    Desbloqueie o conteúdo exclusivo de {currentModel.name}.
                                </p>
                                <p className="text-privacy-text-secondary mt-1">
                                    Acesso VIP por{' '}
                                    <span className="text-primary font-semibold">
                                        {formatPrice(mainProduct.price_cents)}
                                    </span>
                                </p>
                            </>
                        )}
                      </div>

                      {!hasAccess && (
                        <button
                          onClick={handleLockedClick}
                          className="w-full sm:w-auto bg-primary text-privacy-black font-semibold py-2 px-4 rounded-lg hover:opacity-90"
                        >
                          🔓 Desbloquear VIP agora
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Se não houver produto base, mas houver outros produtos, mostra o banner genérico */}
                {!hasAccess && !mainProduct && products.length > 0 && (
                    <div className="px-4 sm:px-6 my-6">
                        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                            <p className="font-semibold text-primary">
                                Conteúdo exclusivo. Explore a loja para desbloquear!
                            </p>
                            <button
                                onClick={() => navigate('/loja')}
                                className="w-full sm:w-auto bg-primary text-privacy-black font-semibold py-2 px-4 rounded-lg hover:opacity-90"
                            >
                                🛒 Ver Produtos
                            </button>
                        </div>
                    </div>
                )}


                <Tabs defaultValue="mural" className="w-full mt-6">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="mural">Mural</TabsTrigger>
                        <TabsTrigger value="feed">Feed</TabsTrigger>
                        <TabsTrigger value="loja">Loja</TabsTrigger>
                    </TabsList>
                    <TabsContent value="mural" className="mt-6">
                        {muralError && (
                            <p className="text-sm text-red-400 text-center mt-4">
                                {muralError}
                            </p>
                        )}
                        {muralInitialLoading && muralItems.length === 0 && !muralError ? (
                            <p className="text-sm text-privacy-text-secondary text-center mt-4">
                                Carregando mural...
                            </p>
                        ) : muralItems.length === 0 && !muralError ? (
                            <p className="text-center text-privacy-text-secondary py-10">
                                Esta modelo ainda não postou nenhum conteúdo no mural.
                            </p>
                        ) : (
                            <>
                                <MediaGrid media={muralItems} onLockedClick={handleLockedClick} />
                                
                                {/* Sentinela para Scroll Infinito do Mural */}
                                {muralHasMore && <div ref={muralSentinelRef} className="h-10" />}
                                
                                {muralPageLoading && muralItems.length > 0 && (
                                    <p className="text-center text-xs text-privacy-text-secondary py-2">Carregando mais do mural...</p>
                                )}
                                {!muralHasMore && muralItems.length > 0 && (
                                    <p className="text-center text-xs text-privacy-text-secondary py-2">Você já viu todo o mural 👀</p>
                                )}
                            </>
                        )}
                    </TabsContent>
                    <TabsContent value="feed" className="mt-6 px-2 sm:px-0">
                        {feedMedia.length === 0 && !muralLoading ? (
                            <p className="text-center text-privacy-text-secondary py-10">Ainda não há posts no feed desta modelo.</p>
                        ) : (
                            <div className="flex flex-col items-center">
                                {feedMedia.map((item, index) => (
                                    <PostCard
                                        key={item.id}
                                        media={{...item, model: currentModel}}
                                        priceCents={mainProduct?.price_cents || 0}
                                        onLockedClick={handleLockedClick}
                                        onOpenVideo={() => handleOpenMedia(index)}
                                        onOpenImage={() => handleOpenMedia(index)}
                                    />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                    <TabsContent value="loja" className="mt-6 px-4">
                        {products.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {products.map((p, index) => (
                                    <ProductCard 
                                        key={p.id} 
                                        product={p} 
                                        isPurchased={purchasedProductIds.has(p.id) || !!p.is_base_membership}
                                        modelName={currentModel.name}
                                        isFirst={index === 0}
                                        modelCoverUrl={currentModel.cover_url}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-privacy-text-secondary py-10">Nenhum produto na loja desta modelo.</p>
                        )}
                    </TabsContent>
                </Tabs>
            </main>
            
            {openMediaIndex !== null && unlockedMedia.length > 0 && (
                <MediaViewerFullscreen 
                    mediaList={unlockedMedia} 
                    initialIndex={openMediaIndex} 
                    isOpen={openMediaIndex !== null} 
                    onClose={() => setOpenMediaIndex(null)} 
                />
            )}
            
            <BottomNavigation />
        </div>
    );
};