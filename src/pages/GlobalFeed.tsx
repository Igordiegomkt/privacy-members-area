import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { PostCard } from '../components/PostCard';
import { VideoPlayerModal } from '../components/VideoPlayerModal';
import { MediaModal } from '../components/MediaModal';
import { MediaItemWithAccess } from '../lib/models';
import { fetchGlobalFeedItems, GlobalFeedItem } from '../lib/feedGlobal';

export const GlobalFeed: React.FC = () => {
  const [feedItems, setFeedItems] = useState<GlobalFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openVideo, setOpenVideo] = useState<MediaItemWithAccess | null>(null);
  const [openImage, setOpenImage] = useState<MediaItemWithAccess | null>(null);
  const navigate = useNavigate();

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

  const handleLockedClick = (media: MediaItemWithAccess) => {
    if (media.model?.username) {
      navigate(`/modelo/${media.model.username}`);
    }
  };

  return (
    <div className="min-h-screen bg-privacy-black text-white pb-24">
      <Header />
      <main className="mx-auto w-full max-w-md px-2 py-6 sm:px-0">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">Feed</h1>
          <p className="text-sm text-privacy-text-secondary">Novos conteúdos e sugestões para você.</p>
        </div>

        {loading && <div className="text-center py-10">Carregando...</div>}
        {error && <div className="text-center py-10 text-red-400">{error}</div>}
        
        {!loading && !error && feedItems.length === 0 && (
          <div className="text-center py-10 text-privacy-text-secondary">
            <p>Seu feed está vazio. Explore a seção "Em alta"!</p>
          </div>
        )}

        <div className="flex flex-col items-center">
          {feedItems.map(item => (
            <PostCard
              key={item.media.id}
              media={item.media}
              onLockedClick={() => handleLockedClick(item.media)}
              onOpenVideo={() => setOpenVideo(item.media)}
              onOpenImage={() => setOpenImage(item.media)}
            />
          ))}
        </div>
      </main>
      <VideoPlayerModal media={openVideo} isOpen={!!openVideo} onClose={() => setOpenVideo(null)} />
      <MediaModal media={openImage} isOpen={!!openImage} onClose={() => setOpenImage(null)} />
      <BottomNavigation />
    </div>
  );
};