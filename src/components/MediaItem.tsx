import React, { useState, useEffect, useRef } from 'react';
import { MediaItemWithAccess } from '../lib/models';

interface MediaItemProps {
  media: MediaItemWithAccess;
  onClick: () => void;
  onLoad?: () => void;
}

export const MediaItem: React.FC<MediaItemProps> = ({ media, onClick, onLoad }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isLocked = media.accessStatus === 'locked';
  const isVideo = media.type === 'video';

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

  const handleMouseEnter = () => {
    if (videoRef.current) videoRef.current.play().catch(() => {});
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-square cursor-pointer group overflow-hidden bg-privacy-surface"
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleMouseEnter}
      onTouchEnd={handleMouseLeave}
    >
      {!isLoaded ? (
        <div className="w-full h-full bg-privacy-surface animate-pulse" />
      ) : isVideo ? (
        <video
          ref={videoRef}
          src={media.url}
          poster={media.thumbnail}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${isLocked ? 'blur-md' : ''}`}
          preload="metadata"
          muted
          loop
          playsInline
          draggable={false}
        />
      ) : (
        <img
          src={media.thumbnail}
          alt={media.title || 'Media thumbnail'}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${isLocked ? 'blur-md' : ''}`}
          loading="lazy"
          draggable={false}
        />
      )}
      
      {isLocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-center p-2">
            <svg className="w-8 h-8 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            <p className="font-semibold text-white text-sm mt-2">Conteúdo Bloqueado</p>
        </div>
      )}

      <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
};