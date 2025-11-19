import React, { useEffect } from 'react';
import { MediaItem } from '../types';

interface MediaModalProps {
  media: MediaItem | null;
  onClose: () => void;
}

export const MediaModal: React.FC<MediaModalProps> = ({ media, onClose }) => {
  useEffect(() => {
    if (media) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [media]);

  if (!media) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-95 p-4"
      onClick={handleBackdropClick}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 text-white hover:text-primary transition-colors"
        aria-label="Fechar"
      >
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center">
        {media.type === 'image' ? (
          <img
            src={media.url}
            alt={media.title || 'Media content'}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
          />
        ) : (
          <video
            src={media.url}
            controls
            autoPlay
            controlsList="nodownload"
            className="max-w-full max-h-[90vh] rounded-lg"
            onContextMenu={(e) => e.preventDefault()}
          >
            Seu navegador não suporta vídeos.
          </video>
        )}
      </div>
    </div>
  );
};

