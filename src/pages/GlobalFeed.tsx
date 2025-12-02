import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { MediaModal } from '../components/MediaModal';
import { useProtection } from '../hooks/useProtection';
import { fetchGlobalFeedItems, GlobalFeedItem } from '../lib/feedGlobal';
import { MediaItemWithAccess } from '../lib/models';

const GlobalFeedCard: React.FC<{ item: GlobalFeedItem; onMediaClick: (media: MediaItemWithAccess) => void }> = ({ item, onMediaClick }) => {
  const navigate = useNavigate();
  const { media, model } = item;
  const isLocked = media.accessStatus === 'locked';
  const isUnlockedModel = media.accessStatus === 'unlocked';

  const handleCardClick = () => {
    if (isLocked) {
      navigate(`/modelo/${model.username}`);
    } else {
      onMediaClick(media);
    }
  };

  return (
    <article className="mb-6 bg-privacy-surface rounded-2xl overflow-hidden">
      {/* Card Header */}
      <Link to={`/modelo/${model.username}`} className="flex items-center justify-between p-4 hover:bg-privacy-border/50 transition-colors">
        <div className="flex items-center gap-3">
          <img src={model.avatar_url} alt={model.name} className="w-10 h-10 rounded-full object-cover" />
          <div>
            <p className="font-semibold text-sm text-privacy-text-primary">{model.name}</p>
            <p className="text-xs text-privacy-text-secondary">@{model.username}</p>
          </div>
        </div>
        {isUnlockedModel ? (
            <span className="text-xs font-semibold bg-green-500/20 text-green-400 px-2 py-1 rounded-full">✔ Você já tem acesso</span>
        ) : (
            <span className="text-xs font-semibold bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">💘 Sugestão pra você</span>
        )}
      </Link>

      {/* Media Content */}
      <div className="relative cursor-pointer" onClick={handleCardClick}>
        <img
          src={media.thumbnail}
          alt="Feed content"
          className={`w-full h-auto max-h-[70vh] object-contain bg-black ${isLocked ? 'blur-md' : ''}`}
        />
        {isLocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-center p-4">
            <p className="font-semibold text-white text-lg">🔒 Conteúdo Premium</p>
            <p className="text-sm text-privacy-text-secondary mt-1">Toque para ver como desbloquear</p>
          </div>
        )}
      </div>
    </article>
  );
};

export const GlobalFeed: React.FC = () => {
  useProtection();
  const [feedItems, setFeedItems] = useState<GlobalFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaItemWithAccess | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handleMediaClick = (media: MediaItemWithAccess) => {
    setSelectedMedia(media);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-privacy-black text-white pb-24">
      <Header />
      <main className="mx-auto w-full max-w-md px-4 py-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">Feed</h1>
          <p className="text-sm text-privacy-text-secondary">Novos conteúdos das modelos que você já tem acesso e sugestões pra você conhecer outras.</p>
        </div>

        {loading && <div className="text-center py-10">Carregando...</div>}
        {error && <div className="text-center py-10 text-red-400">{error}</div>}
        
        {!loading && !error && feedItems.length === 0 && (
          <div className="text-center py-10 text-privacy-text-secondary">
            <p>Seu feed está vazio por enquanto.</p>
            <p>Explore a seção "Em alta" para descobrir novas criadoras.</p>
          </div>
        )}

        <div className="space-y-4">
          {feedItems.map(item => (
            <GlobalFeedCard key={item.media.id} item={item} onMediaClick={handleMediaClick} />
          ))}
        </div>
      </main>
      <MediaModal media={selectedMedia} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <BottomNavigation />
    </div>
  );
};