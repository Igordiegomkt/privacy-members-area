import * as React from 'react';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Model, Product } from '../types';
import { fetchModelByUsername, fetchMediaForModel, fetchProductsForModel, MediaItemWithAccess } from '../lib/models';
import { UserPurchaseWithProduct } from '../lib/marketplace';
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

const formatPrice = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Helper function para padronizar a fonte da imagem do produto
const getProductImageSrc = (product: Product, modelCoverUrl?: string | null): string => {
  return (
    product.cover_thumbnail ??
    modelCoverUrl ??
    '/video-fallback.svg' // Usando o fallback genérico existente
  );
};

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
    
    const productImageSrc = getProductImageSrc(product, modelCoverUrl);

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

export const ModelProfile: React.FC = () => {
    useProtection();
    const { username } = useParams<{ username: string }>();
    const navigate = useNavigate();
    const { openCheckoutForProduct } = useCheckout();
    const [model, setModel] = useState<Model | null>(null);
    const [media, setMedia] = useState<MediaItemWithAccess[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [openMediaIndex, setOpenMediaIndex] = useState<number | null>(null);
    const [hasAccess, setHasAccess] = useState(false);
    const { purchases } = usePurchases();

    useEffect(() => {
        if (!username) { setLoading(false); return; }
        const loadProfileData = async () => {
            setLoading(true);
            const fetchedModel = await fetchModelByUsername(username);
            if (fetchedModel) {
                setModel(fetchedModel);
                const [fetchedMedia, fetchedProducts] = await Promise.all([
                    fetchMediaForModel(fetchedModel.id),
                    fetchProductsForModel(fetchedModel.id)
                ]);
                
                setMedia(fetchedMedia);
                setProducts(fetchedProducts);

                const modelProductIds = new Set(fetchedProducts.map(p => p.id));
                const userHasAnyProduct = purchases.some((p: UserPurchaseWithProduct) => modelProductIds.has(p.product_id));
                const isCarolinaWelcome = fetchedModel.username === 'carolina-andrade' && localStorage.getItem('welcomePurchaseCarolina') === 'true';
                setHasAccess(userHasAnyProduct || isCarolinaWelcome);
            }
            setLoading(false);
        };
        loadProfileData();
    }, [username, purchases]);

    const mainProduct = products.find(p => p.is_base_membership) || products[0];

    const handleLockedClick = () => {
        if (mainProduct) {
            openCheckoutForProduct(mainProduct.id);
        } else {
            // Se não houver produto base, redireciona para a loja
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

    if (loading) return <div className="min-h-screen bg-privacy-black flex items-center justify-center text-white">Carregando perfil...</div>;
    if (!model) return <div className="min-h-screen bg-privacy-black flex items-center justify-center text-white">Modelo não encontrada.</div>;

    const stats = {
        posts: media.length,
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
                        {model.cover_url && <img src={model.cover_url} alt={`${model.name} cover`} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex flex-col items-center -mt-12 sm:-mt-16">
                        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-privacy-black overflow-hidden bg-privacy-surface">
                            {model.avatar_url && <img src={model.avatar_url} alt={model.name} className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex items-center gap-1.5 mt-2">
                            <h1 className="text-xl sm:text-2xl font-bold text-white">{model.name}</h1>
                            {model.is_verified && <span className="inline-flex items-center justify-center rounded-full bg-blue-500 w-4 h-4 text-[10px] text-white">✓</span>}
                        </div>
                        <p className="text-sm text-privacy-text-secondary">@{model.username}</p>
                        {model.bio && <p className="mt-3 px-6 text-center text-sm text-privacy-text-secondary max-w-lg">{model.bio}</p>}
                        
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
                                <CheckCircle size={16} /> Acesso VIP de {model.name} liberado!
                            </p>
                        ) : (
                            <>
                                <p className="font-semibold text-primary">
                                    Desbloqueie o conteúdo exclusivo de {model.name}.
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
                        <MediaGrid media={media} onLockedClick={handleLockedClick} />
                    </TabsContent>
                    <TabsContent value="feed" className="mt-6 px-2 sm:px-0">
                        {feedMedia.length === 0 ? (
                            <p className="text-center text-privacy-text-secondary py-10">Ainda não há posts no feed desta modelo.</p>
                        ) : (
                            <div className="flex flex-col items-center">
                                {feedMedia.map((item, index) => (
                                    <PostCard
                                        key={item.id}
                                        media={{...item, model: model}}
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
                                        modelName={model.name}
                                        isFirst={index === 0}
                                        modelCoverUrl={model.cover_url}
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