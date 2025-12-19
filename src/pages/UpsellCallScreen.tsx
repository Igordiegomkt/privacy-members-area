import * as React from 'react';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCheckout } from '../contexts/CheckoutContext';
import { useAuth } from '../contexts/AuthContext';
import { usePurchases } from '../contexts/PurchaseContext';
import { Product } from '../types';
import { hasUserPurchasedProduct } from '../lib/marketplace';
import { CheckCircle } from 'lucide-react';

// Constantes para o polling (Fallback B)
const POLLING_INTERVAL = 3000; // 3 segundos
const MAX_POLLING_TIME = 60000; // 60 segundos

const formatBRLFromCents = (cents: number) => {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const isCallProductName = (name?: string | null) => {
  return (name ?? "").trim().toUpperCase().startsWith("[CALL]");
};

export const UpsellCallScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { purchases } = usePurchases();
  const { openCheckoutForProduct } = useCheckout();

  const [loading, setLoading] = useState(true);
  const [callProduct, setCallProduct] = useState<Product | null>(null);
  const [cameraOk, setCameraOk] = useState(true);

  const [polling, setPolling] = useState(false);
  const pollIntervalRef = useRef<number | null>(null);
  const pollTimeoutRef = useRef<number | null>(null);

  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const productTitle = useMemo(() => {
    const raw = callProduct?.name ?? "";
    return raw.replace(/^\[CALL\]\s*/i, "").trim() || "Acesso privado";
  }, [callProduct]);
  
  const isPurchased = callProduct ? hasUserPurchasedProduct(purchases, callProduct.id) : false;
  const isCheckoutOpen = !!(document.querySelector('.fixed.inset-0.z-\\[999\\]'));


  // --- Lógica de Polling (Fallback B) ---
  const cleanupPolling = useCallback(() => {
    if (pollIntervalRef.current) window.clearInterval(pollIntervalRef.current);
    if (pollTimeoutRef.current) window.clearTimeout(pollTimeoutRef.current);
    pollIntervalRef.current = null;
    pollTimeoutRef.current = null;
    setPolling(false);
  }, []);

  const checkPaidOnce = useCallback(async (productId: string, userId: string) => {
    const { data, error } = await supabase
      .from("user_purchases")
      .select("id")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .eq("status", "paid")
      .limit(1);

    if (!error && (data?.length ?? 0) > 0) {
      cleanupPolling();
      navigate("/chamada/sala", { replace: true });
      return true;
    }
    return false;
  }, [navigate, cleanupPolling]);

  const startPaidPolling = useCallback(async (productId: string) => {
    const userId = user?.id ?? null;
    if (!userId) {
      cleanupPolling();
      return;
    }

    setPolling(true);
    
    // Checagem imediata (para cobrir o tempo entre o clique e o modal)
    if (await checkPaidOnce(productId, userId)) return;

    pollIntervalRef.current = window.setInterval(() => {
      void checkPaidOnce(productId, userId);
    }, POLLING_INTERVAL);

    pollTimeoutRef.current = window.setTimeout(() => {
      cleanupPolling();
    }, MAX_POLLING_TIME);
  }, [user?.id, checkPaidOnce, cleanupPolling]);
  // ---------------------------------------


  // 1. Busca do Produto [CALL]
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id,name,price_cents,status")
          .eq("status", "active");

        if (error) throw error;

        const found = (data as Product[] | null)?.find((p) => isCallProductName(p.name)) ?? null;
        if (!cancelled) setCallProduct(found);
      } catch {
        if (!cancelled) setCallProduct(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Preview da Câmera
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

  // 3. Detecção de Compra (Preferência A: Realtime/Context)
  useEffect(() => {
    if (isPurchased) {
      cleanupPolling();
      navigate("/chamada/sala", { replace: true });
    }
    // Limpa polling no unmount
    return cleanupPolling;
  }, [isPurchased, navigate, cleanupPolling]);


  const handlePrimary = async () => {
    if (!callProduct) return;
    
    // 1. Abre o modal de checkout
    openCheckoutForProduct(callProduct.id);
    
    // 2. Inicia o polling (Fallback B)
    await startPaidPolling(callProduct.id);
  };

  const handleSkip = () => {
    cleanupPolling();
    navigate("/", { replace: true });
  };

  // Se o usuário já comprou, mas o redirecionamento ainda não ocorreu (ex: erro de navegação),
  // mostramos o estado de carregamento para forçar o redirect via useEffect.
  if (loading || isPurchased) {
    return (
      <div className="min-h-screen bg-privacy-black flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-[#0b0b0f] text-white flex items-center justify-center">
      <div className="relative w-full min-h-[100dvh] max-w-xl px-5 py-6 flex flex-col">
        {/* Top info */}
        <div className="flex flex-col items-center pt-4">
          <p className="text-white/70 text-sm tracking-wide">Tudo pronto.</p>

          {/* Avatar placeholder com glow/ping suave */}
          <div className="relative mt-4 mb-4 h-36 w-36 rounded-full bg-[radial-gradient(circle_at_30%_30%,#2a2a2a_0%,#131313_55%,#0b0b0f_100%)] shadow-[0_0_0_5px_rgba(255,255,255,0.06),0_0_0_26px_rgba(255,95,0,0.10)]">
            <span className="absolute inset-0 rounded-full animate-pulse-slow bg-primary/30" />
          </div>

          <h1 className="text-center text-2xl sm:text-3xl font-extrabold leading-tight text-white drop-shadow">
            Meu conteúdo já é seu. Tá te esperando. <span aria-hidden>👁️🔥</span>
          </h1>

          <p className="mt-3 text-white/65 text-sm">Acesso privado • MeuPrivacy</p>

          {/* Offer box */}
          <div className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 p-4">
            {!callProduct ? (
              <p className="text-white/70 text-sm">Acesso indisponível agora.</p>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-white/90 truncate">{productTitle}</p>
                  <p className="text-white/70 text-xs mt-1">Disponível agora</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-white font-extrabold">
                    {formatBRLFromCents(callProduct.price_cents)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="mt-auto flex flex-col items-center gap-2 pb-4">
          <button
            onClick={handlePrimary}
            disabled={!callProduct || isCheckoutOpen}
            className={[
              "mt-3 h-24 w-24 rounded-full font-extrabold",
              "bg-[#FF5F00] shadow-[0_12px_35px_rgba(255,95,0,0.25)]",
              "active:scale-[0.98] transition-transform",
              (!callProduct || isCheckoutOpen) ? "opacity-60 cursor-not-allowed shadow-none" : "cursor-pointer",
            ].join(" ")}
            aria-label="Quero entrar agora"
          >
            <span className="text-3xl" aria-hidden>
              ▶
            </span>
          </button>

          <p className="mt-1 font-extrabold text-base">Quero entrar agora</p>
          <p className="text-white/70 text-xs -mt-1">Pagamento instantâneo • Acesso imediato</p>

          <button
            onClick={handleSkip}
            className="mt-2 text-white/80 font-semibold text-sm underline underline-offset-4"
          >
            Vou deixar passar
          </button>

          <p className="mt-2 text-center text-[11px] leading-snug text-white/55 max-w-[300px]">
            Ao sair desta tela, esse acesso pode não aparecer novamente.
          </p>
        </div>

        {/* Camera preview */}
        <div className="absolute right-4 bottom-28 sm:bottom-32 w-[86px] h-[112px] rounded-xl border-2 border-white/70 overflow-hidden bg-[#111]">
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
      </div>
    </div>
  );
};