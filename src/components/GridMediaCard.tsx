import * as React from 'react';
import { useRef, useState } from 'react';
import { MediaItemWithAccess } from '../lib/models';
import { Lock, Video, Camera } from 'lucide-react';

interface GridMediaCardProps {
  media: MediaItemWithAccess;
  onLockedClick?: () => void;
  onMediaClick: () => void; // Unified click handler
}

export const GridMediaCard: React.FC<GridMediaCardProps> = ({
  media,
  onLockedClick,
  onMediaClick,
}: GridMediaCardProps) => {
  const isVideo = media.type === 'video';
  const isLocked = media.accessStatus === 'locked';
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [thumbError, setThumbError] = useState(false);

  const posterSrc = thumbError || !media.thumbnail ? '/video-fallback.svg' : media.thumbnail;

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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) return onLockedClick?.();
    return onMediaClick();
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
      <img
        src={posterSrc}
        alt={media.title || 'Conteúdo'}
        className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${
          isLocked ? 'blur-xl brightness-25 scale-105' : ''
        } ${isPreviewing ? 'opacity-0' : 'opacity-100'}`}
        loading="lazy"
        draggable={false}
        onError={() => setThumbError(true)}
      />

      {isVideo && !isLocked && (
        <video
          ref={videoRef}
          src={media.url}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isPreviewing ? 'opacity-100' : 'opacity-0'
          }`}
          preload="none"
          playsInline
          muted
          loop
        />
      )}

      <div className="absolute bottom-2 left-2 flex items-center gap-2 text-xs text-white/90 z-10">
        <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5">
          {isVideo ? <Video size={12} /> : <Camera size={12} />}
          {isVideo ? 'Vídeo' : 'Foto'}
        </span>
      </div>

      {isLocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-center px-3 z-20">
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