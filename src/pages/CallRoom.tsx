import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, X } from 'lucide-react';

// URL do vídeo de conteúdo (MP4 hospedado)
const VIDEO_URL = "https://pub-c12d59796a5544b38ff738ca3ca53d5d.r2.dev/chamadadevideo/VIDEO-CHAMADA1.mp4";

export const CallRoom: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);

  // 1. Lógica de Fullscreen (incluindo pseudo-fullscreen para iOS)
  const enterFullscreen = () => {
    if (!containerRef.current) return;

    const element = containerRef.current;

    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if ((element as any).webkitRequestFullscreen) { // Safari/iOS
      (element as any).webkitRequestFullscreen();
    } else if ((element as any).msRequestFullscreen) { // IE/Edge
      (element as any).msRequestFullscreen();
    }
    
    // Adiciona classe para pseudo-fullscreen em iOS (se o request falhar)
    if (element.classList) {
        element.classList.add('is-fullscreen-fallback');
    }
  };
  
  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }
    
    // Remove classe de pseudo-fullscreen
    if (containerRef.current?.classList) {
        containerRef.current.classList.remove('is-fullscreen-fallback');
    }
  };

  // 2. Iniciar reprodução e fullscreen
  const handleStart = () => {
    if (!videoRef.current) return;
    
    setIsLoadingVideo(true);
    
    // Tenta carregar o vídeo (preload="auto" ajuda, mas o load() garante)
    videoRef.current.load(); 
    
    // Espera o vídeo estar pronto para reprodução
    videoRef.current.oncanplaythrough = () => {
        setIsLoadingVideo(false);
        videoRef.current!.play().catch(err => {
            console.error('Failed to play video:', err);
        });
        enterFullscreen();
        setHasStarted(true);
    };
    
    // Fallback se oncanplaythrough não disparar rapidamente
    setTimeout(() => {
        if (!hasStarted) {
            setIsLoadingVideo(false);
            enterFullscreen();
            setHasStarted(true);
            videoRef.current!.play().catch(() => {});
        }
    }, 3000);
  };
  
  // 3. Lógica de fim de vídeo
  const handleVideoEnded = () => {
    setIsEnded(true);
    exitFullscreen();
    setTimeout(() => {
        navigate('/', { replace: true });
    }, 1500);
  };

  // 4. Adiciona listener para o evento 'ended'
  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.addEventListener('ended', handleVideoEnded);
    }
    return () => {
      if (videoElement) {
        videoElement.removeEventListener('ended', handleVideoEnded);
      }
    };
  }, []);

  // 5. Adiciona CSS para o fallback de fullscreen (necessário para iOS)
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'fullscreen-fallback-style';
    style.innerHTML = `
      .is-fullscreen-fallback {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 9999;
        background-color: black;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.getElementById('fullscreen-fallback-style')?.remove();
    };
  }, []);


  return (
    <div 
        ref={containerRef}
        className="min-h-screen bg-privacy-black text-white flex items-center justify-center relative"
        onContextMenu={(e) => e.preventDefault()} // Bloqueia menu de contexto no container
    >
      
      {/* Header Simples */}
      <div className="absolute top-0 left-0 right-0 text-center pt-4 z-50">
        <p className="text-sm text-privacy-text-secondary">MeuPrivacy • Acesso privado</p>
      </div>

      {/* Botão de Fechar (Apenas se não tiver iniciado) */}
      {!hasStarted && (
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 z-50"
        >
          <X size={24} />
        </button>
      )}

      {/* Player de Vídeo */}
      <div className="relative w-full h-full flex items-center justify-center">
        <video
          ref={videoRef}
          src={VIDEO_URL}
          preload="auto"
          playsInline
          muted
          controlsList="nodownload" // Proteção contra download
          className={`w-full h-full object-contain ${hasStarted ? 'block' : 'hidden'}`}
          onContextMenu={(e) => e.preventDefault()} // Bloqueia menu de contexto no vídeo
        >
          Seu navegador não suporta o vídeo.
        </video>
        
        {/* Overlay de Início */}
        {!hasStarted && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-4">
            <h1 className="text-2xl font-bold mb-8 text-center">
                Pronta para você.
            </h1>
            <button
              onClick={handleStart}
              disabled={isLoadingVideo}
              className="bg-primary hover:opacity-90 text-privacy-black font-bold py-4 px-10 rounded-xl transition-opacity shadow-lg shadow-primary/30 flex items-center gap-2 disabled:opacity-50"
            >
              {isLoadingVideo ? (
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-privacy-black"></div>
              ) : (
                <Play size={24} fill="currentColor" />
              )}
              {isLoadingVideo ? 'Carregando...' : 'Iniciar'}
            </button>
            <p className="text-sm text-privacy-text-secondary mt-4">
                Toque para iniciar a reprodução.
            </p>
          </div>
        )}
        
        {/* Overlay de Fim */}
        {isEnded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-4 z-50">
                <h1 className="text-2xl font-bold text-white mb-4">Chamada Encerrada</h1>
                <p className="text-lg text-privacy-text-secondary">Redirecionando para o início...</p>
            </div>
        )}
      </div>
    </div>
  );
};