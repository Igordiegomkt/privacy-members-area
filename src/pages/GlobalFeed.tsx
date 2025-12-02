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

  const handleCardClick = () => {
    if (isLocked) {
      // Redireciona para o perfil da modelo se o conteúdo estiver bloqueado
      navigate(`/modelo/${model.username}`);
    } else {
      onMediaClick(media);
    }
  };

  return (
    <article className="mb-6 bg-privacy-surface rounded-2xl overflow-hidden">
      {/* Card Header */}
      <Link to={`/modelo/${model.username}`} className="flex items-center gap-3 p-4 hover:bg-privacy-border/50 transition-colors">
        <img src={model.avatar_url} alt={model.name} className="w-10 h-10 rounded-full object-cover" />
        <div>
          <p className="font-semibold text-sm text-privacy-text-primary">{model.name}</p>
          <p className="text-xs text-privacy-text-secondary">@{model.username}</p>
        </div>
      </Link>

      {/* Media Content */}
      <div className="relative cursor-pointer" onClick={handleCardClick}>
        <img
          src={media.thumbnail}
          alt="Feed content"
          className={`w-full h-auto max-h-[70vh] object-contain ${isLocked ? 'blur-md' : ''}`}
        />
        {isLocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-center p-4">
            <svg className="w-12 h-12 text-white mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            <p className="font-semibold text-white">Conteúdo exclusivo</p>
            <p className="text-sm text-privacy-text-secondary mt-1">Assine para ver o conteúdo de {model.name}</p>
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
          <p className="text-sm text-privacy-text-secondary">Novidades e recomendações para você</p>
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