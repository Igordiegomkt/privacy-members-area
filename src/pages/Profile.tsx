import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { Avatar } from '../components/Avatar';
import { BioCard } from '../components/BioCard';
import { MediaGrid } from '../components/MediaGrid';
import { MediaModal } from '../components/MediaModal';
import { CreatorProfile, MediaItem } from '../types';
import { generateAllMedia } from '../config/media';
import { useProtection } from '../hooks/useProtection';

// Dados do perfil
const profileData: CreatorProfile = {
  name: 'Camila Becker',
  username: 'CamilaBecker',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
  bio: 'SÓ ASSINA SE ESTIVER PREPARADO PRA GOZAR.. Morena toda tatuada bem porra louca que ama um ANAL HARD, aquela Putaria mesmo no meu vip sem frescura com mídias atualizadas todos os dias.',
  location: 'Balneário Camboriú - SC',
  stats: {
    posts: 3051,
    followers: 228800,
    following: 150,
  },
};

export const Profile: React.FC = () => {
  // Proteções básicas
  useProtection();

  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<'all' | 'photos' | 'videos' | 'paid'>('all');
  const allMediaItems = useRef<MediaItem[]>([]);
  const filteredMedia = useRef<MediaItem[]>([]);

  const ITEMS_PER_PAGE = 12;

  // Carregar todas as mídias disponíveis e embaralhar
  useEffect(() => {
    const allMedia = generateAllMedia();
    allMediaItems.current = allMedia;
    filteredMedia.current = allMedia;
    
    // Carregar primeiros itens
    const initialMedia = allMedia.slice(0, ITEMS_PER_PAGE);
    setMedia(initialMedia);
  }, []);

  // Filtrar mídias baseado no filtro ativo
  useEffect(() => {
    let filtered: MediaItem[] = [];
    
    switch (activeFilter) {
      case 'photos':
        filtered = allMediaItems.current.filter(m => m.type === 'image');
        break;
      case 'videos':
        filtered = allMediaItems.current.filter(m => m.type === 'video');
        break;
      case 'paid':
        // Por enquanto, todas as mídias são consideradas "pagos"
        filtered = allMediaItems.current;
        break;
      default:
        filtered = allMediaItems.current;
    }
    
    filteredMedia.current = filtered;
    setMedia(filtered.slice(0, ITEMS_PER_PAGE));
    setPage(1);
    setHasMore(filtered.length > ITEMS_PER_PAGE);
  }, [activeFilter]);

  // Função para carregar mais mídias
  const loadMoreMedia = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    
    setTimeout(() => {
      const startIndex = page * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const newMedia = filteredMedia.current.slice(startIndex, endIndex);
      
      if (newMedia.length === 0) {
        setHasMore(false);
      } else {
        setMedia((prev) => [...prev, ...newMedia]);
        setPage((prev) => prev + 1);
      }
      
      setIsLoading(false);
    }, 300);
  }, [isLoading, hasMore, page]);

  // Detectar scroll para carregar mais
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = document.documentElement.scrollTop;
      const clientHeight = document.documentElement.clientHeight;

      if (scrollHeight - scrollTop - clientHeight < 300) {
        loadMoreMedia();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMoreMedia]);

  const handleMediaClick = (media: MediaItem) => {
    setSelectedMedia(media);
  };

  const handleCloseModal = () => {
    setSelectedMedia(null);
  };

  const totalMedia = filteredMedia.current.length;
  const totalPhotos = allMediaItems.current.filter(m => m.type === 'image').length;
  const totalVideos = allMediaItems.current.filter(m => m.type === 'video').length;

  return (
    <div className="min-h-screen bg-dark">
      <Header />
      
      <main className="max-w-4xl mx-auto pb-8">
        {/* Profile Section */}
        <div className="w-full pt-4 sm:pt-6 pb-4">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 px-4 sm:px-6">
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <Avatar 
                src={profileData.avatar} 
                alt={profileData.name}
                size="xl"
              />
            </div>
            
            <div className="flex-1 w-full sm:w-auto">
              <BioCard profile={profileData} />
            </div>
          </div>
        </div>

        {/* Stats Bar e Filter Tabs */}
        <div className="px-4 sm:px-6 mb-4">
          <div className="flex justify-between items-center text-sm text-gray-400 mb-3">
            <span>{profileData.stats.posts.toLocaleString()} Postagens</span>
            <span>{totalMedia} Mídias</span>
          </div>
          
          {/* Filter Tabs */}
          <div className="flex gap-4 sm:gap-6 border-b border-dark-lighter">
            <button 
              onClick={() => setActiveFilter('all')}
              className={`px-2 py-3 font-medium text-sm transition-colors ${
                activeFilter === 'all' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button 
              onClick={() => setActiveFilter('photos')}
              className={`px-2 py-3 font-medium text-sm transition-colors ${
                activeFilter === 'photos' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Fotos ({totalPhotos})
            </button>
            <button 
              onClick={() => setActiveFilter('videos')}
              className={`px-2 py-3 font-medium text-sm transition-colors ${
                activeFilter === 'videos' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Vídeos ({totalVideos})
            </button>
            <button 
              onClick={() => setActiveFilter('paid')}
              className={`px-2 py-3 font-medium text-sm transition-colors ${
                activeFilter === 'paid' 
                  ? 'text-primary border-b-2 border-primary' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Pagos
            </button>
          </div>
        </div>

        {/* Media Grid */}
        <MediaGrid 
          media={media} 
          onMediaClick={handleMediaClick}
        />

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        )}

        {/* End of Content */}
        {!hasMore && media.length > 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Todos os conteúdos foram carregados
          </div>
        )}
      </main>

      {/* Media Modal */}
      <MediaModal 
        media={selectedMedia} 
        onClose={handleCloseModal}
      />

      <BottomNavigation />
    </div>
  );
};