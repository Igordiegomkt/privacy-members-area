import React, { useState, useEffect, useRef } from 'react';
import { MediaItemWithAccess } from '../lib/models';

interface MediaItemProps {
  media: MediaItemWithAccess;
  onClick: () => void;
  onLoad?: () => void;
}

export const MediaItem: React.FC<MediaItemProps> = ({ media, onClick, onLoad }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isLocked = media.accessStatus === 'locked';

  useEffect(() => {
    if (!containerRef.current || isLoaded) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsLoaded(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isLoaded]);

  return (
    <div
      ref={containerRef}
      className="relative aspect-square cursor-pointer group overflow-hidden bg-privacy-surface"
      onClick={onClick}
    >
      {hasError ? (
        <div className="w-full h-full flex items-center justify-center text-privacy-text-secondary text-xs p-2">
          Erro ao carregar
        </div>
      ) : (
        <>
          {isLoaded ? (
            <img
              src={media.thumbnail}
              alt={media.title || 'Media thumbnail'}
              className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${isLocked ? 'blur-md' : ''}`}
              onLoad={onLoad}
              onError={() => setHasError(true)}
              loading="lazy"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-privacy-surface animate-pulse" />
          )}
          
          {media.type === 'video' && isLoaded && !isLocked && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 pointer-events-none">
              <div className="bg-black bg-opacity-50 rounded-full p-2">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-privacy-text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}

          {isLocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-center p-2">
                <p className="font-semibold text-white text-lg">🔒 Conteúdo Premium</p>
                <p className="text-xs text-privacy-text-secondary mt-1">Desbloqueie esse pack na Loja.</p>
            </div>
          )}

          <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" />
        </>
      )}
    </div>
  );
};