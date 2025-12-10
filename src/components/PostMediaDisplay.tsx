import * as React from 'react';
import { useRef, useState } from 'react';
import { MediaItemWithAccess } from '../lib/models';
import { Lock, Video, Camera } from 'lucide-react';

interface PostMediaDisplayProps {
  media: MediaItemWithAccess;
  onLockedClick: () => void;
  onMediaClick: () => void;
  priceCents: number;
}

const formatPrice = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

export const PostMediaDisplay: React.FC<PostMediaDisplayProps> = ({
  media,
  onLockedClick,
  onMediaClick,
  priceCents,
}: PostMediaDisplayProps) => {
  const isVideo = media.type === 'video';
  const isLocked = media.accessStatus === 'locked';
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [thumbError, setThumbError] = useState(false);

  // PosterSrc é usado apenas para o fundo blur ou como poster do vídeo (se thumbnail existir)
  const posterSrc = media.thumbnail || (isVideo ? undefined : media.url);
  const backgroundSrc = posterSrc || '/video-fallback.svg'; // Fallback genérico para o fundo blur

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
    if (isLocked) {
      onLockedClick();
    } else {
      onMediaClick();
    }
  };

  // --- Visual Effect Logic ---
  const renderImageDisplay = () => (
    <div className="relative w-full h-full">
      {/* Fundo espelhado/blur para IMAGENS */}
      <div
        className={`absolute inset-0 bg-center bg-cover blur-lg scale-110 opacity-60 transition-opacity duration-500`}
        style={{ backgroundImage: `url(${backgroundSrc})` }}
      />
      
      {/* Imagem principal (centralizada e contida) */}
      <div className="relative w-full h-full flex items-center justify-center">
        <img
          src={media.url}
          alt={media.title || 'Conteúdo'}
          className={`max-w-full max-h-full object-contain rounded-lg shadow-2xl`}
          loading="lazy"
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          onError={() => setThumbError(true)}
        />
      </div>
    </div>
  );

  const renderVideoDisplay = () => (
    <div className="relative w-full h-full bg-privacy-black">
      {/* Fundo leve de thumbnail (se existir) */}
      {posterSrc && (
        <div
          className={`absolute inset-0 bg-center bg-cover blur-md scale-105 opacity-30`}
          style={{ backgroundImage: `url(${posterSrc})` }}
        />
      )}
      
      {/* Player de preview (sempre renderizado para vídeo) */}
      <video
        ref={videoRef}
        src={media.url}
        poster={posterSrc} // Usa thumbnail real como poster, se existir
        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300`}
        preload="metadata"
        playsInline
        muted
        loop
      />
      
      {/* Ícone de play/tipo */}
      <div className="absolute top-2 left-2 flex items-center gap-2 text-xs text-white/90 z-10">
        <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5">
          <Video size={12} /> Vídeo
        </span>
      </div>
    </div>
  );

  return (
    <div
      className="relative w-full overflow-hidden cursor-pointer aspect-[3/4] bg-privacy-surface"
      onClick={handleClick}
      onMouseEnter={isVideo && !isLocked ? startPreview : undefined}
      onMouseLeave={isVideo && !isLocked ? stopPreview : undefined}
    >
      {isVideo ? renderVideoDisplay() : renderImageDisplay()}

      {/* Overlay de Bloqueio */}
      {isLocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-center px-3 z-20">
          <Lock className="w-8 h-8 text-primary mb-2" />
          <p className="text-sm text-white font-semibold mb-3">
            Conteúdo VIP bloqueado
          </p>
          {priceCents > 0 && (
            <button
              onClick={onLockedClick}
              className="bg-primary text-privacy-black font-semibold text-sm px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
            >
              🔓 Desbloquear por {formatPrice(priceCents)}
            </button>
          )}
        </div>
      )}
    </div>
  );
};