import * as React from 'react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Product, Model } from '../types';
import { fetchModelByUsername, fetchProductsForModel, fetchMediaForModelPage, MediaItemWithAccess } from '../lib/models';
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
    const [model, setModel] = useState<Model | null>(null);
    
    // State for Media Pagination
    const [media, setMedia] = useState<MediaItemWithAccess[]>([]);
    const [mediaPage, setMediaPage] = useState(0);
    const [mediaLoading, setMediaLoading] = useState(true);
    const [mediaHasMore, setMediaHasMore] = useState(true);
    
    const [products, setProducts] = useState<Product[]>([]);
    const [openMediaIndex, setOpenMediaIndex] = useState<number | null>(null);
    const [hasAccess, setHasAccess] = useState(false);
    const { purchases } = usePurchases();
    
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    // Function to load media page
    const loadMediaPage = useCallback(async (nextPage: number, modelId: string) => {
        // Se já estamos carregando ou não há mais, saímos.
        if (mediaLoading || !mediaHasMore) return;
        
        // Apenas mostramos o loading se for a primeira página ou se já houver conteúdo
        if (nextPage === 0) setMediaLoading(true);

        try {
            const { items: newMedia, hasMore: nextHasMore } = await fetchMediaForModelPage({
                modelId,
                page: nextPage,
                pageSize: PAGE_SIZE,
            });
            
            setMedia(prev => nextPage === 0 ? newMedia : [...prev, ...newMedia]);
            setMediaPage(nextPage);
            setMediaHasMore(nextHasMore);
            
            if (nextPage === 0 && newMedia.length === 0) {
                setMediaHasMore(false); // Não tentar carregar mais se a primeira página for vazia
            }
            
        } catch (e) {
            console.error("Error loading media page:", e);
            setMediaHasMore(false); // Parar de tentar carregar em caso de erro
        } finally {
            setMediaLoading(false);
        }
    }, [mediaLoading, mediaHasMore]);


    useEffect(() => {
        if (!username) { setMediaLoading(false); return; }
        
        const loadProfileData = async () => {
            // O loading inicial é para o perfil inteiro (model + produtos)
            setMediaLoading(true); 
            
            const fetchedModel = await fetchModelByUsername(username);
            if (fetchedModel) {
                setModel(fetchedModel);
                
                trackViewContent({
                    content_type: 'model_profile',
                    content_ids: [fetchedModel.id],
                    model_id: fetchedModel.id
                });

                // Fetch products once (not paginated)
                const fetchedProducts = await fetchProductsForModel(fetchedModel.id);
                setProducts(fetchedProducts);

                const modelProductIds = new Set(fetchedProducts.map(p => p.id));
                const userHasAnyProduct = purchases.some((p: UserPurchaseWithProduct) => modelProductIds.has(p.product_id));
                const isCarolinaWelcome = fetchedModel.username === 'carolina-andrade' && localStorage.getItem('welcomePurchaseCarolina') === 'true';
                setHasAccess(userHasAnyProduct || isCarolinaWelcome);
                
                // Start loading the first page of media
                loadMediaPage(0, fetchedModel.id);
            } else {
                setMediaLoading(false);
            }
        };
        
        // Reset state when username changes
        setMedia([]);
        setMediaPage(0);
        setMediaHasMore(true);
        
        loadProfileData();
    }, [username, purchases, loadMediaPage]);
    
    // Intersection Observer for infinite scroll
    useEffect(() => {
        if (!sentinelRef.current || mediaLoading || !mediaHasMore || !model?.id) return;

        const observer = new IntersectionObserver(entries => {
            const [entry] = entries;
            if (entry.isIntersecting && !mediaLoading && mediaHasMore) {
                loadMediaPage(mediaPage + 1, model.id);
            }
        }, {
            root: null,
            rootMargin: '0px 0px 300px 0px',
            threshold: 0.1,
        });

        observer.observe(sentinelRef.current);

        return () => observer.disconnect();
    }, [mediaPage, mediaHasMore, mediaLoading, model?.id, loadMediaPage]);


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
        const mediaItem = media[index];
        if (mediaItem.accessStatus === 'locked') {
            handleLockedClick();
            return;
        }
        // Find index in the unlocked list
        const unlockedIndex = unlockedMedia.findIndex(m => m.id === mediaItem.id);
        if (unlockedIndex !== -1) {
            setOpenMediaIndex(unlockedIndex);
        }
    };

    // Se o modelo não foi encontrado, mostramos a mensagem de erro
    if (!model && !mediaLoading) return <div className="min-h-screen bg-privacy-black flex items-center justify-center text-white">Modelo não encontrada.</div>;
    
    // Se estiver carregando a primeira página, mostramos o loading inicial
    if (mediaLoading && media.length === 0) return <div className="min-h-screen bg-privacy-black flex items-center justify-center text-white">Carregando perfil...</div>;

    // Garantimos que model é Model aqui, pois as verificações acima garantem que não é null
    const currentModel = model as Model;

    const stats = {
        posts: media.length, // Now reflects loaded posts
        photos: media.filter(m => m.type === 'image').length,
        videos: media.filter(m => m.type === 'video').length,
    };
    
    // Media for Feed/Viewer (only unlocked/free)
    const feedMedia = media.filter(m => m.accessStatus === 'free' || m.accessStatus === 'unlocked');
    const unlockedMedia = media.filter(m => m.accessStatus !== 'locked');
    
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
                            <span><strong className="text-white">{stats.posts}</strong> posts</span>
                            <span><strong className="text-white">{stats.photos}</strong> fotos</span>
                            <span><strong className="text-white">{stats.videos}</strong> vídeos</span>
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
                        {media.length === 0 && !mediaLoading ? (
                            <p className="text-center text-privacy-text-secondary py-10">
                                Esta modelo ainda não postou nenhum conteúdo no mural.
                            </p>
                        ) : (
                            <>
                                <MediaGrid media={media} onLockedClick={handleLockedClick} />
                                
                                {/* Sentinela para Scroll Infinito do Mural */}
                                {mediaHasMore && <div ref={sentinelRef} className="h-10" />}
                                
                                {mediaLoading && media.length > 0 && (
                                    <p className="text-center text-xs text-privacy-text-secondary py-2">Carregando mais do mural...</p>
                                )}
                                {!mediaHasMore && media.length > 0 && (
                                    <p className="text-center text-xs text-privacy-text-secondary py-2">Você já viu todo o mural 👀</p>
                                )}
                            </>
                        )}
                    </TabsContent>
                    <TabsContent value="feed" className="mt-6 px-2 sm:px-0">
                        {feedMedia.length === 0 && !mediaLoading ? (
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
                                {/* O sentinela já está no Mural, mas se o feed for muito longo, ele pode não ser suficiente.
                                    Para simplificar, vamos usar o mesmo sentinela, mas o ideal seria um para cada tab.
                                    Como o Mural e o Feed usam a mesma lista 'media', o sentinela no Mural é suficiente.
                                */}
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