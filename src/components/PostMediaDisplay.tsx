import * as React from 'react';
import { useRef } from 'react';
import { MediaItemWithAccess } from '../lib/models';
import { Lock, Video, Camera, Play } from 'lucide-react';
import { useVideoAutoplay } from '../hooks/useVideoAutoplay'; // Importando o novo hook

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

  // Hook para autoplay
  useVideoAutoplay(videoRef, isVideo, isLocked);

  // Prioriza thumbnail, depois a URL da mídia (se for imagem), senão o fallback genérico
  const imageSrc = media.thumbnail || (isVideo ? '/video-fallback.svg' : media.url);
  const backgroundSrc = imageSrc;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) {
      onLockedClick();
    } else {
      // Quando clica, pausa o autoplay e abre o modal
      if (videoRef.current) {
        videoRef.current.pause();
      }
      onMediaClick();
    }
  };

  // --- Renderização da Capa (Thumbnail) ---
  const renderCover = () => (
    <div className="relative w-full h-full">
      {/* Fundo espelhado/blur */}
      <div
        className={`absolute inset-0 bg-center bg-cover blur-lg scale-110 opacity-60 transition-opacity duration-500`}
        style={{ backgroundImage: `url(${backgroundSrc})` }}
      />
      
      {/* Imagem principal (centralizada e contida) */}
      <div className="relative w-full h-full flex items-center justify-center">
        <img
          src={imageSrc}
          alt={media.title || 'Conteúdo'}
          className={`max-w-full max-h-full object-contain rounded-lg shadow-2xl`}
          loading="lazy"
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
      
      {/* Ícone de tipo */}
      {!isLocked && (
        <div className="absolute top-2 left-2 flex items-center gap-2 text-xs text-white/90 z-10">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5">
            {isVideo ? <Video size={12} /> : <Camera size={12} />}
            {isVideo ? 'Vídeo' : 'Foto'}
          </span>
        </div>
      )}
      
      {/* Ícone de Play para vídeos desbloqueados */}
      {isVideo && !isLocked && (
        <div className="absolute inset-0 flex items-center justify-center">
            <Play size={48} className="text-white/80 drop-shadow-lg" />
        </div>
      )}
    </div>
  );

  // --- Renderização do Vídeo (Autoplay) ---
  const renderVideoAutoplay = () => {
    if (!isVideo || isLocked) return null;
    
    // O vídeo é sempre renderizado para que o IntersectionObserver possa observá-lo.
    // Ele fica por baixo da capa (renderCover) e só aparece quando o autoplay funciona.
    return (
      <video
        key={media.id}
        ref={videoRef}
        src={media.url}
        poster={imageSrc}
        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300`}
        preload="metadata"
        playsInline
        muted
        loop
      />
    );
  };

  return (
    <div
      className="relative w-full overflow-hidden cursor-pointer aspect-[3/4] bg-privacy-surface"
      onClick={handleClick}
    >
      {/* Renderiza o player de vídeo (autoplay) */}
      {renderVideoAutoplay()}
      
      {/* Renderiza a capa (thumbnail) - Fica por cima do vídeo se o vídeo não estiver tocando */}
      {/* Se o vídeo estiver tocando, ele deve aparecer por cima da capa. */}
      {/* Para simplificar, vamos deixar a capa por baixo do vídeo, e o vídeo deve ter object-fit: cover/contain */}
      
      {/* Renderiza a capa (thumbnail) */}
      <div className="w-full h-full">
        {renderCover()}
      </div>

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