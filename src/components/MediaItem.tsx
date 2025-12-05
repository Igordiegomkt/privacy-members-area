import React, { useRef, useState, useEffect } from 'react';
import { MediaItemWithAccess } from '../lib/models';
import { Lock, Camera, Video } from 'lucide-react';

interface MediaItemProps {
  media: MediaItemWithAccess;
  onClick?: () => void;
}

export const MediaItem: React.FC<MediaItemProps> = ({ media, onClick }) => {
  const isVideo = media.type === 'video';
  const isLocked = media.accessStatus === 'locked';

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [thumbError, setThumbError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const openPreview = () => {
    if (isLocked) {
      onClick?.();
      return;
    }
    if (isVideo) {
      setIsPreviewOpen(true);
    } else {
      onClick?.();
    }
  };

  const closePreview = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setIsPreviewOpen(false);
  };

  useEffect(() => {
    if (isPreviewOpen && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [isPreviewOpen]);

  const posterUrl = !thumbError && media.thumbnail
    ? media.thumbnail
    : '/video-fallback.svg';

  return (
    <>
      {/* CARD NO FEED / MURAL – MOBILE FIRST */}
      <div
        className="relative w-full overflow-hidden rounded-xl bg-privacy-surface cursor-pointer group aspect-[3/4]"
        onClick={openPreview}
      >
        <img
          src={posterUrl}
          alt={media.title || 'Conteúdo'}
          className={`w-full h-full object-cover transition-all duration-300 ${
            isLocked ? 'blur-md grayscale' : 'group-hover:scale-105'
          }`}
          loading="lazy"
          draggable={false}
          onError={() => setThumbError(true)}
        />

        <div className="absolute bottom-2 left-2 flex items-center gap-2 text-xs text-white/90">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5">
            {isVideo ? <Video size={12} /> : <Camera size={12} />}
            {isVideo ? 'Vídeo' : 'Foto'}
          </span>
        </div>

        {isLocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-center px-3">
            <Lock className="w-8 h-8 text-white/80 mb-2" />
            <p className="text-sm text-white font-semibold">Conteúdo bloqueado</p>
          </div>
        )}
      </div>

      {/* OVERLAY DO PLAYER DE VÍDEO */}
      {isVideo && !isLocked && isPreviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={closePreview}
        >
          <div
            className="relative w-full max-w-md mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              ref={videoRef}
              src={media.url}
              className="w-full h-auto max-h-[90vh] rounded-lg"
              controls
              autoPlay
              playsInline
              controlsList="nodownload"
            />
            <button
              type="button"
              onClick={closePreview}
              className="absolute -top-2 -right-2 text-white bg-black/50 rounded-full p-2"
              aria-label="Fechar player"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
};