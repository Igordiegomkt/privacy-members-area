import React, { useState, useEffect, useRef } from 'react';
import { MediaItem as MediaItemType } from '../types';

interface MediaItemProps {
  media: MediaItemType;
  onClick: () => void;
  onLoad?: () => void;
}

export const MediaItem: React.FC<MediaItemProps> = ({ media, onClick, onLoad }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer para lazy loading
  useEffect(() => {
    if (!containerRef.current || isLoaded) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLoaded) {
            setIsLoaded(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px', // Começar a carregar 100px antes de aparecer
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [isLoaded]);

  const handleImageLoad = () => {
    if (onLoad) {
      onLoad();
    }
  };

  const handleImageError = () => {
    setHasError(true);
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-square cursor-pointer group overflow-hidden bg-privacy-surface"
      onClick={onClick}
    >
      {hasError ? (
        <div className="w-full h-full flex items-center justify-center bg-privacy-surface text-privacy-text-secondary text-xs p-2">
          Erro ao carregar
        </div>
      ) : (
        <>
          {isLoaded ? (
            <img
              ref={imgRef}
              src={media.thumbnail}
              alt={media.title || 'Media thumbnail'}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="lazy"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-privacy-surface animate-pulse" />
          )}
          
          {media.type === 'video' && isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 pointer-events-none">
              <div className="bg-black bg-opacity-50 rounded-full p-2">
                <svg
                  className="w-6 h-6 sm:w-8 sm:h-8 text-privacy-text-primary"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}

          <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" />
        </>
      )}
    </div>
  );
};