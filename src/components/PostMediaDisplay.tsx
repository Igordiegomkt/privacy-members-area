import * as React from 'react';
import { useRef, useState } from 'react';
import { MediaItemWithAccess } from '../lib/models';
import { Lock, Video, Camera, Play } from 'lucide-react';

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
  const [isHovering, setIsHovering] = useState(false);
  const [hasLoadedVideo, setHasLoadedVideo] = useState(false); // Controla se o elemento <video> foi montado

  // Prioriza thumbnail, depois a URL da mídia (se for imagem), senão o fallback genérico
  const imageSrc = media.thumbnail || (isVideo ? '/video-fallback.svg' : media.url);
  const backgroundSrc = imageSrc;

  const startPreview = () => {
    if (!isVideo || isLocked) return;
    setHasLoadedVideo(true); // Monta o elemento <video>
    setIsHovering(true);
    // O play será chamado no useEffect do elemento <video>
  };

  const stopPreview = () => {
    if (!isVideo || isLocked) return;
    setIsHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    // Não desmonta o vídeo imediatamente para evitar flicker
  };
  
  // Efeito para controlar o play/pause do vídeo
  React.useEffect(() => {
    if (videoRef.current) {
      if (isHovering) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isHovering, hasLoadedVideo]);


  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) {
      onLockedClick();
    } else {
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
      
      {/* Ícone de tipo (apenas se não for vídeo em preview) */}
      {!isLocked && (
        <div className="absolute top-2 left-2 flex items-center gap-2 text-xs text-white/90 z-10">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5">
            {isVideo ? <Video size={12} /> : <Camera size={12} />}
            {isVideo ? 'Vídeo' : 'Foto'}
          </span>
        </div>
      )}
      
      {/* Ícone de Play para vídeos desbloqueados (se não estiver em preview) */}
      {isVideo && !isLocked && !isHovering && (
        <div className="absolute inset-0 flex items-center justify-center">
            <Play size={48} className="text-white/80 drop-shadow-lg" />
        </div>
      )}
    </div>
  );

  // --- Renderização do Vídeo (Apenas no Hover/Preview) ---
  const renderVideoPreview = () => {
    if (!isVideo || isLocked || !hasLoadedVideo) return null;
    
    return (
      <video
        key={media.id}
        ref={videoRef}
        src={media.url}
        poster={imageSrc}
        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${isHovering ? 'opacity-100' : 'opacity-0'}`}
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
      onMouseEnter={startPreview}
      onMouseLeave={stopPreview}
    >
      {/* Renderiza o player de vídeo (escondido) se for vídeo e tiver sido carregado */}
      {renderVideoPreview()}
      
      {/* Renderiza a capa (thumbnail) */}
      <div className={`w-full h-full transition-opacity duration-300 ${isVideo && isHovering ? 'opacity-0' : 'opacity-100'}`}>
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