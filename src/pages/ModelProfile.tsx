import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Model, Product } from '../types';
import { fetchModelByUsername, fetchMediaForModel, fetchProductsForModel, MediaItemWithAccess } from '../lib/models';
import { fetchUserPurchases, UserPurchaseWithProduct } from '../lib/marketplace';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { Avatar } from '../components/Avatar';
import { MediaGrid } from '../components/MediaGrid';
import { MediaModal } from '../components/MediaModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useProtection } from '../hooks/useProtection';
import { ArrowLeft } from 'lucide-react';

const BASE_MODEL_USERNAME = 'carolina-andrade';

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
    const [model, setModel] = useState<Model | null>(null);
    const [media, setMedia] = useState<MediaItemWithAccess[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [userPurchases, setUserPurchases] = useState<UserPurchaseWithProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMedia, setSelectedMedia] = useState<MediaItemWithAccess | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [hasAccess, setHasAccess] = useState(false);

    useEffect(() => {
        if (!username) {
            setLoading(false);
            return;
        }
        console.log('[ModelProfile] username param =', username);

        const loadProfileData = async () => {
            setLoading(true);
            const fetchedModel = await fetchModelByUsername(username);
            
            if (fetchedModel) {
                setModel(fetchedModel);
                const [purchases, fetchedMedia, fetchedProducts] = await Promise.all([
                    fetchUserPurchases(),
                    fetchMediaForModel(fetchedModel.id, fetchedModel.username === BASE_MODEL_USERNAME),
                    fetchProductsForModel(fetchedModel.id)
                ]);
                
                const modelProductIds = new Set(fetchedProducts.map(p => p.id));
                const userHasAccess = purchases.some(p => modelProductIds.has(p.product_id)) || fetchedModel.username === BASE_MODEL_USERNAME;
                
                setHasAccess(userHasAccess);
                setUserPurchases(purchases);
                setMedia([...fetchedMedia].sort(() => Math.random() - 0.5)); // Shuffle media
                setProducts(fetchedProducts);
            }
            setLoading(false);
        };

        loadProfileData();
    }, [username]);

    const handleMediaClick = (mediaItem: MediaItemWithAccess) => {
        if (mediaItem.accessStatus === 'locked') {
            const mainProduct = products.find(p => p.is_base_membership) || products[0];
            if (mainProduct) {
                navigate(`/produto/${mainProduct.id}`);
            }
        } else {
            setSelectedMedia(mediaItem);
            setIsModalOpen(true);
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-privacy-black flex items-center justify-center text-white">Carregando perfil...</div>;
    }

    if (!model) {
        return <div className="min-h-screen bg-privacy-black flex items-center justify-center text-white">Modelo não encontrada.</div>;
    }

    const stats = {
        posts: media.length,
        photos: media.filter(m => m.type === 'image').length,
        videos: media.filter(m => m.type === 'video').length,
    };
    
    const purchasedProductIds = new Set(userPurchases.map(p => p.product_id));

    return (
        <div className="min-h-screen bg-privacy-black text-white pb-24">
            <Header />
            <main className="max-w-4xl mx-auto">
                <button onClick={() => navigate(-1)} className="absolute top-5 left-4 z-50 text-white bg-black/30 rounded-full p-2 hover:bg-black/50">
                    <ArrowLeft size={20} />
                </button>
                {/* Profile Header */}
                <div className="relative">
                    <div className="h-40 sm:h-56 bg-privacy-surface">
                        {model.cover_url && <img src={model.cover_url} alt={`${model.name}'s cover`} className="w-full h-full object-cover" />}
                    </div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
                        <Avatar src={model.avatar_url || ''} alt={model.name} size="xl" className="border-4 border-privacy-black" />
                    </div>
                </div>

                {/* Bio Section */}
                <div className="pt-20 px-4 text-center">
                    <h1 className="text-2xl font-bold">{model.name}</h1>
                    <p className="text-sm text-privacy-text-secondary">@{model.username}</p>
                    <p className="mt-4 text-sm max-w-xl mx-auto">{model.bio}</p>
                </div>

                {/* Stats */}
                <div className="flex justify-center gap-6 my-6">
                    <div><span className="font-bold">{stats.posts}</span> <span className="text-sm text-privacy-text-secondary">posts</span></div>
                    <div><span className="font-bold">{stats.photos}</span> <span className="text-sm text-privacy-text-secondary">fotos</span></div>
                    <div><span className="font-bold">{stats.videos}</span> <span className="text-sm text-privacy-text-secondary">vídeos</span></div>
                </div>

                {/* Access Banner */}
                {hasAccess && (
                    <div className="px-4 sm:px-6 mb-6">
                        <div className="text-center bg-primary/10 border border-primary/30 rounded-lg p-4 text-sm">
                            <p className="font-semibold text-primary">💎 Você já tem acesso ao conteúdo de {model.name}.</p>
                            <p className="text-privacy-text-secondary mt-1">Aproveite todos os conteúdos liberados no mural e descubra packs extras na aba Loja.</p>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <Tabs defaultValue="mural" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="mural">Mural</TabsTrigger>
                        <TabsTrigger value="feed">Feed</TabsTrigger>
                        <TabsTrigger value="loja">Loja</TabsTrigger>
                    </TabsList>
                    <TabsContent value="mural" className="mt-6">
                        <div className="px-4 sm:px-6 mb-4">
                            <h2 className="text-xl font-bold">Mural VIP</h2>
                            <p className="text-sm text-privacy-text-secondary">Todas as fotos e vídeos exclusivos de {model.name} em um lugar só.</p>
                        </div>
                        <MediaGrid media={media} onMediaClick={handleMediaClick} />
                    </TabsContent>
                    <TabsContent value="feed" className="mt-6 px-4">
                        <p className="text-center text-privacy-text-secondary py-10">O feed em formato de timeline será implementado em breve.</p>
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
            <MediaModal media={selectedMedia} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            <BottomNavigation />
        </div>
    );
};