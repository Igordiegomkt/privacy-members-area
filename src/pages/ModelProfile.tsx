import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Model, Product } from '../types';
import { fetchModelByUsername, fetchMediaForModel, fetchProductsForModel, MediaItemWithAccess } from '../lib/models';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { Avatar } from '../components/Avatar';
import { MediaGrid } from '../components/MediaGrid';
import { MediaModal } from '../components/MediaModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useProtection } from '../hooks/useProtection';

const BASE_MODEL_USERNAME = 'carolina-andrade';

const formatPrice = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ProductCard: React.FC<{ product: Product }> = ({ product }) => (
    <div onClick={() => useNavigate()(`/produto/${product.id}`)} className="bg-privacy-surface rounded-lg overflow-hidden group cursor-pointer">
        <div className="relative aspect-square">
            <img src={product.cover_thumbnail} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        </div>
        <div className="p-4">
            <h3 className="font-semibold text-privacy-text-primary truncate">{product.name}</h3>
            <p className="text-lg font-bold text-primary mt-1">{formatPrice(product.price_cents)}</p>
        </div>
    </div>
);

export const ModelProfile: React.FC = () => {
    useProtection();
    const { username } = useParams<{ username: string }>();
    const navigate = useNavigate();
    const [model, setModel] = useState<Model | null>(null);
    const [media, setMedia] = useState<MediaItemWithAccess[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMedia, setSelectedMedia] = useState<MediaItemWithAccess | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (!username) return;

        const loadProfileData = async () => {
            setLoading(true);
            const fetchedModel = await fetchModelByUsername(username);
            if (fetchedModel) {
                setModel(fetchedModel);
                const isBase = fetchedModel.username === BASE_MODEL_USERNAME;
                const [fetchedMedia, fetchedProducts] = await Promise.all([
                    fetchMediaForModel(fetchedModel.id, isBase),
                    fetchProductsForModel(fetchedModel.id)
                ]);
                setMedia(fetchedMedia);
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

    return (
        <div className="min-h-screen bg-privacy-black text-white pb-24">
            <Header />
            <main className="max-w-4xl mx-auto">
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

                {/* Tabs */}
                <Tabs defaultValue="mural" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="mural">Mural</TabsTrigger>
                        <TabsTrigger value="feed">Feed</TabsTrigger>
                        <TabsTrigger value="loja">Loja</TabsTrigger>
                    </TabsList>
                    <TabsContent value="mural" className="mt-4">
                        <MediaGrid media={media} onMediaClick={handleMediaClick} />
                    </TabsContent>
                    <TabsContent value="feed" className="mt-4 px-4">
                        <p className="text-center text-privacy-text-secondary">O feed em formato de timeline será implementado em breve.</p>
                    </TabsContent>
                    <TabsContent value="loja" className="mt-4 px-4">
                        {products.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {products.map(p => <ProductCard key={p.id} product={p} />)}
                            </div>
                        ) : (
                            <p className="text-center text-privacy-text-secondary">Nenhum produto na loja desta modelo.</p>
                        )}
                    </TabsContent>
                </Tabs>
            </main>
            <MediaModal media={selectedMedia} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            <BottomNavigation />
        </div>
    );
};