import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Model, Product } from '../types';
import { fetchModelByUsername, fetchMediaForModel, fetchProductsForModel, MediaItemWithAccess } from '../lib/models';
import { UserPurchaseWithProduct } from '../lib/marketplace';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { MediaGrid } from '../components/MediaGrid';
import { PostCard } from '../components/PostCard';
import { VideoPlayerModal } from '../components/VideoPlayerModal';
import { MediaModal } from '../components/MediaModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useProtection } from '../hooks/useProtection';
import { ArrowLeft, MessageCircle, Gift } from 'lucide-react';
import { usePurchases } from '../contexts/PurchaseContext';
import { useCheckout } from '../contexts/CheckoutContext';

const formatPrice = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ProductCard: React.FC<{ product: Product; isPurchased: boolean; modelName: string; isFirst: boolean }> = ({ product, isPurchased, modelName, isFirst }) => {
    const navigate = useNavigate();
    return (
        <div className="bg-privacy-surface rounded-lg overflow-hidden group flex flex-col">
            <div className="relative aspect-square cursor-pointer" onClick={() => navigate(`/produto/${product.id}`)}>
                <img src={product.cover_thumbnail} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
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
                    onClick={() => navigate(`/produto/${product.id}`)}
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
    const { openCheckoutModal } = useCheckout();
    const [model, setModel] = useState<Model | null>(null);
    const [media, setMedia] = useState<MediaItemWithAccess[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [openVideo, setOpenVideo] = useState<MediaItemWithAccess | null>(null);
    const [openImage, setOpenImage] = useState<MediaItemWithAccess | null>(null);
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

    const handleLockedClick = () => {
        const mainProduct = products.find(p => p.is_base_membership) || products[0];
        if (mainProduct) {
            openCheckoutModal(mainProduct.id);
        }
    };

    if (loading) return <div className="min-h-screen bg-privacy-black flex items-center justify-center text-white">Carregando perfil...</div>;
    if (!model) return <div className="min-h-screen bg-privacy-black flex items-center justify-center text-white">Modelo não encontrada.</div>;

    const stats = {
        posts: media.length,
        photos: media.filter(m => m.type === 'image').length,
        videos: media.filter(m => m.type === 'video').length,
    };
    const feedMedia = media.filter(m => m.accessStatus === 'free' || m.accessStatus === 'unlocked');
    const purchasedProductIds = new Set(purchases.map((p: UserPurchaseWithProduct) => p.product_id));
    const mainProduct = products.find(p => p.is_base_membership) || products[0];

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

                {!hasAccess && (
                  <div className="px-4 sm:px-6 my-6">
                    <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="text-center sm:text-left">
                        <p className="font-semibold text-primary">
                          Você ainda não tem acesso ao conteúdo exclusivo de {model.name}.
                        </p>
                        <p className="text-privacy-text-secondary mt-1">
                          Desbloqueie vídeos privados, mural VIP e conteúdos completos.
                        </p>
                        {mainProduct && (
                          <p className="text-privacy-text-secondary mt-1">
                            Acesso VIP por{' '}
                            <span className="text-primary font-semibold">
                              {formatPrice(mainProduct.price_cents)}
                            </span>
                          </p>
                        )}
                      </div>

                      {products.length > 0 && (
                        <button
                          onClick={handleLockedClick}
                          className="w-full sm:w-auto bg-primary text-privacy-black font-semibold py-2 px-4 rounded-lg hover:opacity-90"
                        >
                          🔓 Desbloquear conteúdo VIP
                        </button>
                      )}
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
                                {feedMedia.map(item => (
                                    <PostCard
                                        key={item.id}
                                        media={{...item, model: model}}
                                        onLockedClick={handleLockedClick}
                                        onOpenVideo={() => setOpenVideo(item)}
                                        onOpenImage={() => setOpenImage(item)}
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
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-privacy-text-secondary py-10">Nenhum produto na loja desta modelo.</p>
                        )}
                    </TabsContent>
                </Tabs>
            </main>
            <VideoPlayerModal media={openVideo} isOpen={!!openVideo} onClose={() => setOpenVideo(null)} />
            <MediaModal media={openImage} isOpen={!!openImage} onClose={() => setOpenImage(null)} />
            <BottomNavigation />
        </div>
    );
};