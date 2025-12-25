import * as React from 'react';
import { useRef, useState } from 'react';
import { MediaItemWithAccess } from '../lib/models';
import { Lock, Video, Camera } from 'lucide-react';
import { useVideoAutoplay } from '../hooks/useVideoAutoplay'; // Importando o hook
import { isModelUnlockedByGrant } from '../lib/accessVisual';

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
  const [thumbError, setThumbError] = useState(false);
  
  // Se o acesso for concedido por link, tratamos visualmente como desbloqueado
  const isUnlockedByGrant = media.model?.id ? isModelUnlockedByGrant(media.model.id) : false;
  const showLockedOverlay = isLocked && !isUnlockedByGrant;

  // Hook para autoplay
  useVideoAutoplay(videoRef, isVideo, showLockedOverlay);

  // PosterSrc é usado como thumbnail da imagem ou poster do vídeo
  const posterSrc = media.thumbnail || (isVideo ? undefined : media.url);
  const imageSrc = posterSrc || '/video-fallback.svg'; // Fallback para imagem se não houver thumbnail

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showLockedOverlay) return onLockedClick?.();
    
    // Pausa o autoplay antes de abrir o modal
    if (videoRef.current) {
        videoRef.current.pause();
    }
    return onMediaClick();
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl bg-privacy-surface cursor-pointer group aspect-[3/4]"
      onClick={handleClick}
    >
      {/* IMAGEM (ou poster de vídeo) - Z-index 10 */}
      <img
        src={imageSrc}
        alt={media.title || 'Conteúdo'}
        className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 z-10 ${
          showLockedOverlay ? 'blur-xl brightness-25 scale-105' : ''
        }`}
        loading="lazy"
        draggable={false}
        onError={() => setThumbError(true)}
      />
      
      {/* VÍDEO (Autoplay) - Z-index 20 */}
      {isVideo && !showLockedOverlay && (
        <video
          ref={videoRef}
          src={media.url}
          poster={imageSrc}
          className={`absolute inset-0 w-full h-full object-cover z-20`}
          preload="metadata"
          playsInline
          muted
          loop
        />
      )}

      <div className="absolute bottom-2 left-2 flex items-center gap-2 text-xs text-white/90 z-30">
        <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5">
          {isVideo ? <Video size={12} /> : <Camera size={12} />}
          {isVideo ? 'Vídeo' : 'Foto'}
        </span>
      </div>

      {showLockedOverlay && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-center px-3 z-30">
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