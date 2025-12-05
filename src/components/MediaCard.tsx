import React, { useState } from 'react';
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

  const posterUrl = !thumbError && media.thumbnail ? media.thumbnail : '/video-fallback.svg';

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
      onClick={handleClick}
    >
      <img
        src={isVideo ? posterUrl : media.thumbnail || media.url}
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
          {isVideo ? <VideoIcon size={12} /> : <Camera size={12} />}
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
  );
};