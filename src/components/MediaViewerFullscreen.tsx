import * as React from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { MediaItemWithAccess } from '../lib/models';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { stripTrackingParams } from '../lib/urlUtils'; // Novo import

interface MediaViewerFullscreenProps {
  mediaList: MediaItemWithAccess[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export const MediaViewerFullscreen: React.FC<MediaViewerFullscreenProps> = ({
  mediaList,
  initialIndex,
  isOpen,
  onClose,
}: MediaViewerFullscreenProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const currentMedia = mediaList[currentIndex];

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, mediaList.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < mediaList.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, mediaList.length]);

  if (!isOpen || !currentMedia) return null;

  const isVideo = currentMedia.type === 'video';
  
  // Limpando todas as URLs antes de usar
  const mediaUrl = stripTrackingParams(currentMedia.url);
  const thumbnail = currentMedia.thumbnail ? stripTrackingParams(currentMedia.thumbnail) : null;
  const backgroundSrc = thumbnail || (isVideo ? '/video-fallback.svg' : mediaUrl);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Background Blur Effect */}
      <div
        className={`absolute inset-0 bg-center bg-cover blur-xl scale-110 opacity-30 transition-opacity duration-500`}
        style={{ backgroundImage: `url(${backgroundSrc})` }}
      />

      {/* Content Area */}
      <div
        className="relative w-full h-full flex items-center justify-center"
        onClick={e => e.stopPropagation()}
      >
        {/* Media Display - Aumentando o max-w e max-h para ocupar mais espaço */}
        <div className="relative w-full h-full max-w-xl max-h-[95vh] flex items-center justify-center p-4">
          {isVideo ? (
            <video
              key={currentMedia.id} // Key change forces re-render and re-load
              ref={videoRef}
              src={mediaUrl}
              poster={thumbnail || '/video-fallback.svg'}
              controls
              autoPlay
              playsInline
              controlsList="nodownload"
              // Usando w-full h-full e object-contain para maximizar o tamanho dentro do container
              className="w-full h-full object-contain rounded-lg"
              onContextMenu={(e) => e.preventDefault()}
            >
              Seu navegador não suporta vídeos.
            </video>
          ) : (
            <img
              key={currentMedia.id} // Key change forces re-render
              src={mediaUrl}
              alt={currentMedia.title || 'Media content'}
              // Usando w-full h-full e object-contain para maximizar o tamanho dentro do container
              className="w-full h-full object-contain rounded-lg"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          )}
        </div>

        {/* Navigation Controls */}
        {mediaList.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="absolute left-4 p-3 bg-black/50 rounded-full text-white hover:bg-black/70 transition disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Anterior"
            >
              <ChevronLeft size={32} />
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === mediaList.length - 1}
              className="absolute right-4 p-3 bg-black/50 rounded-full text-white hover:bg-black/70 transition disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Próximo"
            >
              <ChevronRight size={32} />
            </button>
          </>
        )}

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition"
          aria-label="Fechar"
        >
          <X size={24} />
        </button>
      </div>
    </div>
  );
};