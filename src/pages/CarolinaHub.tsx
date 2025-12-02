import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '../components/Header';
import { Avatar } from '../components/Avatar';
import { BioCard } from '../components/BioCard';
import { MediaGrid } from '../components/MediaGrid';
import { MediaModal } from '../components/MediaModal';
import { CreatorProfile } from '../types';
import { generateAllMedia } from '../config/media';
import { useProtection } from '../hooks/useProtection';
import { BottomNavigation } from '../components/BottomNavigation';
import { MediaItemWithAccess } from '../lib/models';

// Dados do perfil de Carolina Andrade
const profileData: CreatorProfile = {
  name: 'Carolina Andrade',
  username: 'carolinaandrade',
  avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop',
  bio: 'Bem-vindo ao meu espaço exclusivo! Aqui você encontrará conteúdos que não ousam aparecer em nenhum outro lugar. Prepare-se para uma experiência única e inesquecível.',
  location: 'São Paulo - SP',
  stats: {
    posts: 1890,
    followers: 450000,
    following: 25,
  },
};

export const CarolinaHub: React.FC = () => {
  useProtection();

  const [selectedMedia, setSelectedMedia] = useState<MediaItemWithAccess | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [media, setMedia] = useState<MediaItemWithAccess[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const allMediaItems = useRef<MediaItemWithAccess[]>([]);

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    const allMedia = generateAllMedia().map(item => ({
      ...item,
      accessStatus: 'unlocked' as const,
    }));
    allMediaItems.current = allMedia;
    setMedia(allMedia.slice(0, ITEMS_PER_PAGE));
  }, []);

  const loadMoreMedia = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
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

  return (
    <div className="min-h-screen bg-privacy-black">
      <Header />
      
      <main className="max-w-4xl mx-auto pb-24">
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
            <h2 className="text-lg font-semibold text-privacy-text-primary mb-2">Bem-vindo ao Conteúdo VIP de Carolina Andrade</h2>
            <p className="text-sm text-privacy-text-secondary mb-4">Explore todas as mídias exclusivas abaixo.</p>
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
      <BottomNavigation />
    </div>
  );
};