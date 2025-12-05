import React, { useState, useRef } from 'react';
import { MediaItemWithAccess } from '../lib/models';
import { Lock, Camera, Video as VideoIcon } from 'lucide-react';

interface MediaCardProps {
  media: MediaItemWithAccess;
  onClick?: () => void;
  onOpenVideo?: () => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({ media, onClick, onOpenVideo }) => {
  const isVideo = media.type === 'video';
  const isLocked = media.accessStatus === 'locked';
  
  const [thumbError, setThumbError] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoverTimeout = useRef<number | null>(null);

  const posterUrl = !thumbError && media.thumbnail ? media.thumbnail : '/video-fallback.svg';

  const handleMouseEnter = () => {
    if (!isVideo || isLocked) return;
    hoverTimeout.current = setTimeout(() => {
      setIsHovering(true);
      videoRef.current?.play().catch(() => {});
    }, 300); // Delay to avoid accidental plays
  };

  const handleMouseLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    if (!isVideo || isLocked) return;
    setIsHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const handleClick = () => {
    if (isLocked) {
      onClick?.();
      return;
    }
    if (isVideo) {
      onOpenVideo?.();
      return;
    }
    onClick?.();
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl bg-privacy-surface cursor-pointer group aspect-[3/4]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleMouseEnter}
      onTouchEnd={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Thumbnail Image - always present */}
      <img
        src={isVideo ? posterUrl : media.thumbnail || media.url}
        alt={media.title || 'Conteúdo'}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLocked ? 'blur-md grayscale' : ''
        } ${isHovering ? 'opacity-0' : 'opacity-100'}`}
        loading="lazy"
        draggable={false}
        onError={() => setThumbError(true)}
      />

      {/* Video for Preview - positioned behind the thumbnail */}
      {isVideo && !isLocked && (
        <video
          ref={videoRef}
          src={media.url}
          className="absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-300"
          style={{ opacity: isHovering ? 1 : 0 }}
          playsInline
          muted
          loop
        />
      )}

      {/* Badge tipo de mídia */}
      <div className="absolute bottom-2 left-2 flex items-center gap-2 text-xs text-white/90 z-10">
        <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5">
          {isVideo ? <VideoIcon size={12} /> : <Camera size={12} />}
          {isVideo ? 'Vídeo' : 'Foto'}
        </span>
      </div>

      {/* Lock overlay */}
      {isLocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-center px-3 z-10">
          <Lock className="w-8 h-8 text-white/80 mb-2" />
          <p className="text-sm text-white font-semibold">Conteúdo bloqueado</p>
        </div>
      )}
    </div>
  );
};