import * as React from 'react';
import { useEffect, useRef } from 'react';

/**
 * Hook para reprodução automática de um elemento de vídeo quando ele entra na viewport.
 * @param videoRef Referência ao elemento HTMLVideoElement.
 * @param isVideo Flag para garantir que só funcione em vídeos.
 * @param isLocked Flag para desativar o autoplay se o conteúdo estiver bloqueado.
 */
export const useVideoAutoplay = (
  videoRef: React.RefObject<HTMLVideoElement>,
  isVideo: boolean,
  isLocked: boolean
) => {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!isVideo || isLocked || !videoRef.current) return;

    const videoElement = videoRef.current;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Tenta dar play quando entra na viewport
          videoElement.play().catch(error => {
            // Navegadores podem bloquear autoplay se não for mudo ou se o usuário não interagiu
            console.warn("Autoplay blocked:", error);
          });
        } else {
          // Pausa quando sai da viewport
          videoElement.pause();
          videoElement.currentTime = 0; // Volta para o início
        }
      },
      {
        root: null, // viewport
        rootMargin: '0px',
        threshold: 0.8, // 80% do vídeo visível
      }
    );

    observer.observe(videoElement);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isVideo, isLocked]);
};