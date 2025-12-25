import * as React from 'react';
import { useEffect, useRef } from 'react';
import { MediaItemWithAccess } from '../lib/models';

interface VideoPlayerModalProps {
  media: MediaItemWithAccess | null;
  isOpen: boolean;
  onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ media, isOpen, onClose }: VideoPlayerModalProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.play().catch(() => {});
    } else if (!isOpen && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isOpen]);

  if (!isOpen || !media) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md mx-auto"
        onClick={e => e.stopPropagation()}
      >
        <video
          ref={videoRef}
          src={media.url}
          poster={media.thumbnail || '/video-fallback.svg'}
          className="w-full h-auto max-h-[90vh] rounded-lg"
          controls
          autoPlay
          playsInline
          controlsList="nodownload"
          preload="metadata"
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-2 -right-2 text-white bg-black/50 rounded-full p-2"
          aria-label="Fechar player"
        >
          ✕
        </button>
      </div>
    </div>
  );
};