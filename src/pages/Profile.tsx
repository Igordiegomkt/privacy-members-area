import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '../components/Header';
import { Avatar } from '../components/Avatar';
import { BioCard } from '../components/BioCard';
import { MediaGrid } from '../components/MediaGrid';
import { MediaModal } from '../components/MediaModal';
import { CreatorProfile } from '../types';
import { generateAllMedia } from '../config/media';
import { useProtection } from '../hooks/useProtection';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { MediaItemWithAccess } from '../lib/models';

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
  useProtection();

  const [selectedMedia, setSelectedMedia] = useState<MediaItemWithAccess | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [media, setMedia] = useState<MediaItemWithAccess[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<'all' | 'photos' | 'videos' | 'paid'>('all');
  const allMediaItems = useRef<MediaItemWithAccess[]>([]);
  const filteredMedia = useRef<MediaItemWithAccess[]>([]);

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    const allMedia = generateAllMedia().map(item => ({
      ...item,
      accessStatus: 'unlocked' as const,
    }));
    allMediaItems.current = allMedia;
    filteredMedia.current = allMedia;
    setMedia(allMedia.slice(0, ITEMS_PER_PAGE));
  }, []);

  useEffect(() => {
    let filtered: MediaItemWithAccess[] = [];
    switch (activeFilter) {
      case 'photos':
        filtered = allMediaItems.current.filter(m => m.type === 'image');
        break;
      case 'videos':
        filtered = allMediaItems.current.filter(m => m.type === 'video');
        break;
      case 'paid':
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

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 300) {
        loadMoreMedia();
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMoreMedia]);

  const handleMediaClick = (mediaItem: MediaItemWithAccess) => {
    setSelectedMedia(mediaItem);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const totalMedia = filteredMedia.current.length;
  const totalPhotos = allMediaItems.current.filter(m => m.type === 'image').length;
  const totalVideos = allMediaItems.current.filter(m => m.type === 'video').length;

  return (
    <div className="min-h-screen bg-privacy-black">
      <Header />
      
      <main className="max-w-4xl mx-auto pb-8">
        <div className="w-full pt-4 sm:pt-6 pb-4">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 px-4 sm:px-6">
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <Avatar src={profileData.avatar} alt={profileData.name} size="xl" />
            </div>
            <div className="flex-1 w-full sm:w-auto">
              <BioCard profile={profileData} />
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 mb-4">
          <div className="flex justify-between items-center text-sm text-privacy-text-secondary mb-3">
            <span>{profileData.stats.posts.toLocaleString()} Postagens</span>
            <span>{totalMedia} Mídias</span>
          </div>
          
          <Tabs defaultValue="all" onValueChange={(value) => setActiveFilter(value as any)}>
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="photos">Fotos ({totalPhotos})</TabsTrigger>
              <TabsTrigger value="videos">Vídeos ({totalVideos})</TabsTrigger>
              <TabsTrigger value="paid">Pagos</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <MediaGrid media={media} onMediaClick={handleMediaClick} />

        {isLoading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        )}

        {!hasMore && media.length > 0 && (
          <div className="text-center py-8 text-privacy-text-secondary text-sm">
            Todos os conteúdos foram carregados
          </div>
        )}
      </main>

      <MediaModal media={selectedMedia} isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
};