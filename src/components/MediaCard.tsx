import React, { useRef } from 'react';
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

  const posterSrc = media.thumbnail || '/video-fallback.svg';

  const startPreview = () => {
    if (!isVideo || isLocked) return;
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.playsInline = true;
    v.play().catch(() => {});
  };

  const stopPreview = () => {
    if (!isVideo || isLocked) return;
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
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
      <div className={`w-full h-full transition-transform duration-300 ${isLocked ? 'blur-md brightness-50 scale-105' : 'group-hover:scale-105'}`}>
        {isVideo ? (
          <video
            ref={videoRef}
            src={media.url}
            poster={posterSrc}
            className="w-full h-full object-cover"
            preload="metadata"
            playsInline
            loop
          />
        ) : (
          <img
            src={posterSrc}
            alt={media.title || 'Conteúdo'}
            className="w-full h-full object-cover"
            loading="lazy"
            draggable={false}
          />
        )}
      </div>

      {/* badge foto/vídeo */}
      <div className="absolute bottom-2 left-2 flex items-center gap-2 text-xs text-white/90">
        <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5">
          {isVideo ? <Video size={12} /> : <Camera size={12} />}
          {isVideo ? 'Vídeo' : 'Foto'}
        </span>
      </div>

      {/* overlay de bloqueado */}
      {isLocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-center px-3 z-10">
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