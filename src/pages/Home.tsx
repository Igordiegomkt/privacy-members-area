import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '../components/Header';
import { Avatar } from '../components/Avatar';
import { BioCard } from '../components/BioCard';
import { MediaGrid } from '../components/MediaGrid';
import { MediaModal } from '../components/MediaModal';
import { CreatorProfile, MediaItem } from '../types';
import { generateAllMedia } from '../config/media';
import { useProtection } from '../hooks/useProtection';

// Dados mockados do perfil
const mockProfile: CreatorProfile = {
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

export const Home: React.FC = () => {
  // Proteções básicas
  useProtection();

  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  const allMediaItems = useRef<MediaItem[]>([]);

  // Carregar todas as mídias disponíveis e embaralhar
  useEffect(() => {
    const allMedia = generateAllMedia();
    allMediaItems.current = allMedia;
    
    // Carregar primeiros itens
    const initialMedia = allMedia.slice(0, ITEMS_PER_PAGE);
    setMedia(initialMedia);
  }, []);

  // Função para carregar mais mídias
  const loadMoreMedia = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    
    // Simular delay de API
    setTimeout(() => {
      const startIndex = page * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const newMedia = allMediaItems.current.slice(startIndex, endIndex);
      
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

      // Carregar quando estiver a 300px do final
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

  // Calcular total de mídias
  const totalMedia = allMediaItems.current.length;

  return (
    <div className="min-h-screen bg-dark">
      <Header />
      
      <main className="max-w-4xl mx-auto pb-8">
        {/* Profile Section - Layout similar ao Privacy */}
        <div className="w-full pt-4 sm:pt-6 pb-4">
          {/* Avatar e Info lado a lado em desktop */}
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 px-4 sm:px-6">
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <Avatar 
                src={mockProfile.avatar} 
                alt={mockProfile.name}
                size="xl"
              />
            </div>
            
            <div className="flex-1 w-full sm:w-auto">
              <BioCard profile={mockProfile} />
            </div>
          </div>
        </div>

        {/* Stats Bar e Filter Tabs */}
        <div className="px-4 sm:px-6 mb-4">
          <div className="flex justify-between items-center text-sm text-gray-400 mb-3">
            <span>{mockProfile.stats.posts.toLocaleString()} Postagens</span>
            <span>{totalMedia} Mídias</span>
          </div>
          
          {/* Filter Tabs */}
          <div className="flex gap-4 sm:gap-6 border-b border-dark-lighter">
            <button className="px-2 py-3 text-primary border-b-2 border-primary font-medium text-sm">
              Todos
            </button>
            <button className="px-2 py-3 text-gray-400 hover:text-white transition-colors text-sm">
              Fotos
            </button>
            <button className="px-2 py-3 text-gray-400 hover:text-white transition-colors text-sm">
              Vídeos
            </button>
            <button className="px-2 py-3 text-gray-400 hover:text-white transition-colors text-sm">
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
    </div>
  );
};
