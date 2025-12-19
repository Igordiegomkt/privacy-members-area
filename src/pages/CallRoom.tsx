import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, X } from 'lucide-react';

const VIDEO_URL =
  "https://pub-c12d59796a5544b38ff738ca3ca53d5d.r2.dev/chamadadevideo/VIDEO-CHAMADA1.mp4";

export const CallRoom: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [ended, setEnded] = useState(false);
  const [started, setStarted] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  
  // Camera preview states for the small window
  const [cameraOk, setCameraOk] = useState(true);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const url = useMemo(() => VIDEO_URL, []);

  useEffect(() => {
    // Detecta iOS para usar pseudo-fullscreen
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);
  }, []);

  // 1. Lógica de Fullscreen
  const requestNativeFullscreen = async () => {
    const el = containerRef.current as any;
    if (!el) return;
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      else if (el.mozRequestFullScreen) await el.mozRequestFullScreen();
      else if (el.msRequestFullscreen) await el.msRequestFullscreen();
    } catch {
      // se falhar, segue sem fullscreen
    }
  };

  const exitFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;

    // Remove pseudo-fullscreen class
    if (el.classList.contains("pseudo-fullscreen-active")) {
      el.classList.remove("pseudo-fullscreen-active");
      return;
    }

    const d: any = document;
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (d.webkitExitFullscreen) await d.webkitExitFullscreen();
      else if (d.mozCancelFullScreen) await d.mozCancelFullScreen();
      else if (d.msExitFullscreen) await d.msExitFullscreen();
    } catch {}
  };

  // 2. Iniciar reprodução e fullscreen
  const startVideo = async () => {
    const v = videoRef.current;
    if (!v) return;

    setEnded(false);
    setLoading(true);
    setStarted(true); // Marca como iniciado para esconder o botão

    v.src = url;
    v.load();

    v.oncanplaythrough = async () => {
      setLoading(false);
      try {
        await v.play(); // muted por atributo
        if (isIOS) containerRef.current?.classList.add("pseudo-fullscreen-active");
        else await requestNativeFullscreen();
      } catch {
        // se bloquear, o vídeo não inicia, mas o usuário já interagiu.
        setLoading(false);
      }
    };

    v.onerror = () => {
      setLoading(false);
    };
  };

  // 3. Listener para o evento 'ended'
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onEnded = () => {
      setEnded(true);
      void exitFullscreen();
      window.setTimeout(() => navigate("/", { replace: true }), 1700);
    };

    v.addEventListener("ended", onEnded);
    return () => v.removeEventListener("ended", onEnded);
  }, [navigate]);
  
  // 4. Preview da Câmera (pequeno no canto)
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        cameraStreamRef.current = stream;
        if (previewVideoRef.current) previewVideoRef.current.srcObject = stream;
        setCameraOk(true);
      } catch {
        setCameraOk(false);
      }
    })();

    return () => {
      const stream = cameraStreamRef.current;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
      if (previewVideoRef.current) previewVideoRef.current.srcObject = null;
    };
  }, []);


  return (
    <div className="w-full min-h-[100dvh] bg-black flex items-center justify-center">
      <div 
        ref={containerRef} 
        className="relative w-full max-w-[900px] h-[100dvh] bg-black overflow-hidden"
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 px-4 py-3 bg-black/60 text-center text-white/90 text-[13px]">
          MeuPrivacy • Acesso privado
        </div>

        {/* Video */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover sm:object-cover max-sm:object-contain"
          playsInline
          preload="metadata"
          muted
          onContextMenu={(e) => e.preventDefault()}
        >
          Seu navegador não suporta vídeo.
        </video>

        {/* Loader */}
        {loading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center">
            <div className="h-14 w-14 rounded-full border-4 border-white/20 border-t-white animate-spin" />
          </div>
        )}

        {/* Start button */}
        {!started && !ended && (
          <button
            onClick={startVideo}
            className="absolute z-30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#FF5F00] text-white font-extrabold px-7 py-3 rounded-full shadow-[0_12px_35px_rgba(255,95,0,0.25)] active:scale-[0.99]"
          >
            Iniciar
          </button>
        )}

        {/* Ended overlay */}
        {ended && (
          <div className="absolute inset-0 z-30 flex items-center justify-center">
            <div className="px-5 py-3 rounded-2xl bg-black/70 text-white font-bold">
              Encerrado
            </div>
          </div>
        )}

        {/* Exit button (visível apenas após iniciar ou se estiver no modo fullscreen) */}
        {started && !ended && (
            <button
              onClick={exitFullscreen}
              className="absolute z-40 top-3 right-3 px-3 py-2 rounded-xl bg-black/60 text-white text-[13px]"
            >
              Sair
            </button>
        )}
        
        {/* Camera preview (canto superior direito, abaixo do header) */}
        <div className="absolute right-4 top-14 w-[86px] h-[112px] rounded-xl border-2 border-white/70 overflow-hidden bg-[#111] z-40">
          {cameraOk ? (
            <>
              <video
                ref={previewVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-md bg-black/60 px-2 py-[2px] text-[11px]">
                Você
              </div>
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.9)]" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-center text-[11px] text-white/80 px-2">
              Câmera<br />indisponível
            </div>
          )}
        </div>

        {/* pseudo-fullscreen css */}
        <style>{`
          .pseudo-fullscreen-active{
            position:fixed !important;
            top:0; left:0;
            width:100vw !important;
            height:100dvh !important;
            max-width:100vw !important;
            z-index:9999 !important;
          }
        `}</style>
      </div>
    </div>
  );
};