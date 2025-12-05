import React, { useRef, useState } from 'react';
import { MediaItemWithAccess } from '../lib/models';
import { Lock, Video, Camera } from 'lucide-react';

interface MediaCardProps {
  media: MediaItemWithAccess;
  onLockedClick?: () => void;
  onOpenVideo?: () => void;
  onOpenImage?: () => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  media,
  onLockedClick,
  onOpenVideo,
  onOpenImage,
}) => {
  const isVideo = media.type === 'video';
  const isLocked = media.accessStatus === 'locked';
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const posterSrc = media.thumbnail || '/video-fallback.svg';

  const startPreview = () => {
    if (!isVideo || isLocked || !videoRef.current) return;
    setIsPreviewing(true);
    videoRef.current.play().catch(() => {});
  };

  const stopPreview = () => {
    if (!isVideo || isLocked || !videoRef.current) return;
    videoRef.current.pause();
    videoRef.current.currentTime = 0;
    setIsPreviewing(false);
  };

  const handleClick = () => {
    if (isLocked) return onLockedClick?.();
    if (isVideo) return onOpenVideo?.();
    return onOpenImage?.();
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl bg-privacy-surface cursor-pointer group aspect-[3/4]"
      onClick={handleClick}
      onMouseEnter={startPreview}
      onMouseLeave={stopPreview}
      onTouchStart={startPreview}
      onTouchEnd={stopPreview}
    >
      {/* Camada de Imagem (Thumbnail) - Sempre visível por padrão */}
      <img
        src={posterSrc}
        alt={media.title || 'Conteúdo'}
        className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${
          isLocked ? 'blur-md brightness-50 scale-105' : ''
        } ${isPreviewing ? 'opacity-0' : 'opacity-100'}`}
        loading="lazy"
        draggable={false}
      />

      {/* Camada de Vídeo (para preview) - Fica por baixo e só aparece no hover */}
      {isVideo && !isLocked && (
        <video
          ref={videoRef}
          src={media.url}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isPreviewing ? 'opacity-100' : 'opacity-0'
          }`}
          preload="metadata"
          playsInline
          muted
          loop
        />
      )}

      {/* Badge foto/vídeo */}
      <div className="absolute bottom-2 left-2 flex items-center gap-2 text-xs text-white/90 z-10">
        <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5">
          {isVideo ? <Video size={12} /> : <Camera size={12} />}
          {isVideo ? 'Vídeo' : 'Foto'}
        </span>
      </div>

      {/* Overlay de bloqueado */}
      {isLocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-center px-3 z-20">
          <Lock className="w-8 h-8 text-white/80 mb-2" />
          <p className="text-sm text-white font-semibold mb-3">
            Conteúdo bloqueado
          </p>
          {onLockedClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLockedClick();
              }}
              className="bg-primary text-privacy-black font-semibold text-sm px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
            >
              🔓 Desbloquear conteúdo VIP
            </button>
          )}
        </div>
      )}
    </div>
  );
};