import React, { useState, useEffect, useRef } from 'react';
import { MediaItemWithAccess } from '../lib/models';

interface MediaItemProps {
  media: MediaItemWithAccess;
  onClick: () => void;
  onLoad?: () => void;
}

export const MediaItem: React.FC<MediaItemProps> = ({ media, onClick, onLoad }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isLocked = media.accessStatus === 'locked';
  const isVideo = media.type === 'video';

  // IntersectionObserver para lazy loading
  useEffect(() => {
    if (!containerRef.current || isLoaded) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsLoaded(true);
          if (onLoad) onLoad();
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isLoaded, onLoad]);

  // Efeito para tocar o vídeo quando a prévia é ativada
  useEffect(() => {
    if (isPreviewing && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [isPreviewing]);

  const startPreview = () => !isLocked && setIsPreviewing(true);
  const stopPreview = () => !isLocked && setIsPreviewing(false);

  const posterUrl = media.thumbnail || '/fallback-poster.jpg';

  const renderContent = () => {
    if (!isLoaded) {
      return <div className="w-full h-full bg-privacy-surface animate-pulse" />;
    }

    if (!isVideo) {
      return (
        <img
          src={media.thumbnail}
          alt={media.title || 'Media thumbnail'}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${isLocked ? 'blur-md' : ''}`}
          loading="lazy"
          draggable={false}
        />
      );
    }

    // É um vídeo: renderiza <video> ou <img> condicionalmente
    if (isPreviewing) {
      return (
        <video
          ref={videoRef}
          src={media.url}
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          draggable={false}
        />
      );
    } else {
      return (
        <>
          <img
            src={posterUrl}
            alt="Video poster"
            className={`w-full h-full object-cover ${isLocked ? 'blur-md' : ''}`}
            loading="lazy"
          />
          {!isLocked && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <svg className="w-10 h-10 text-white/90" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            </div>
          )}
        </>
      );
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-square cursor-pointer group overflow-hidden bg-privacy-surface"
      onClick={onClick}
      onMouseEnter={startPreview}
      onMouseLeave={stopPreview}
      onTouchStart={startPreview}
      onTouchEnd={stopPreview}
    >
      {renderContent()}
      {isLocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-center p-2 z-10">
          <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          <p className="font-semibold text-white text-sm mt-2">Conteúdo Bloqueado</p>
        </div>
      )}
    </div>
  );
};