import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { useCheckout } from '../contexts/CheckoutContext';
import { useAuth } from '../contexts/AuthContext';
import { usePurchases } from '../contexts/PurchaseContext'; // Importado para Preferência A
import { CheckCircle, X } from 'lucide-react';
import { hasUserPurchasedProduct } from '../lib/marketplace'; // Helper para checar compra

const formatPrice = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Constantes para o polling (Fallback B)
const POLLING_INTERVAL = 3000; // 3 segundos
const MAX_POLLING_TIME = 60000; // 60 segundos

export const UpsellCallScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { purchases } = usePurchases(); // Preferência A
  const { openCheckoutForProduct } = useCheckout();
  
  const [callProduct, setCallProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pollingTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef(Date.now());

  // Verifica se o produto [CALL] já foi comprado
  const isPurchased = callProduct ? hasUserPurchasedProduct(purchases, callProduct.id) : false;

  // 1. Busca o produto [CALL]
  useEffect(() => {
    const fetchCallProduct = async () => {
      setLoading(true);
      try {
        // Busca o produto cujo name começa com [CALL]
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .ilike('name', '[CALL]%')
          .eq('status', 'active')
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        
        if (!data) {
            setError('Produto de chamada não encontrado. Verifique o cadastro.');
            setLoading(false);
            return;
        }
        
        setCallProduct(data);
        setLoading(false);
        
      } catch (err: any) {
        console.error('Error fetching call product:', err);
        setError('Erro ao carregar a oferta.');
        setLoading(false);
      }
    };
    fetchCallProduct();
  }, []);
  
  // 2. Inicia o preview da câmera
  useEffect(() => {
    if (!videoRef.current) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn('Câmera indisponível:', err);
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  // 3. Lógica de Polling (Fallback B)
  const checkPurchaseStatus = useCallback(async (productId: string, userId: string) => {
    if (Date.now() - startTimeRef.current > MAX_POLLING_TIME) {
        console.log('[Upsell] Polling time expired.');
        clearInterval(pollingTimerRef.current!);
        pollingTimerRef.current = null;
        return;
    }
    
    const { data, error } = await supabase
        .from('user_purchases')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .eq('status', 'paid')
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('[Upsell] Polling error:', error);
        return;
    }

    if (data) {
        console.log('[Upsell] Purchase confirmed via Polling! Redirecting...');
        clearInterval(pollingTimerRef.current!);
        pollingTimerRef.current = null;
        navigate('/chamada/sala', { replace: true });
    }
  }, [navigate]);

  // 4. Detecção de Compra (Preferência A + Fallback B)
  useEffect(() => {
    if (!callProduct || !user?.id) return;

    // Preferência A: Redirecionamento via PurchaseContext (Realtime)
    if (isPurchased) {
        console.log('[Upsell] Purchase confirmed via Context! Redirecting...');
        // Limpa polling se estiver ativo
        if (pollingTimerRef.current) {
            clearInterval(pollingTimerRef.current);
            pollingTimerRef.current = null;
        }
        navigate('/chamada/sala', { replace: true });
        return;
    }
    
    // Fallback B: Inicia Polling se o produto for o [CALL] e não estiver comprado
    // O polling só deve iniciar APÓS o usuário clicar no CTA e o modal de checkout abrir,
    // mas para garantir que o Realtime não falhe, vamos iniciar o polling se o modal estiver aberto.
    // No entanto, para seguir a regra "iniciar polling somente depois do clique no CTA",
    // vamos deixar o polling ser iniciado apenas dentro do handleCtaClick, se necessário.
    
    // Cleanup do polling no unmount
    return () => {
        if (pollingTimerRef.current) {
            clearInterval(pollingTimerRef.current);
            pollingTimerRef.current = null;
        }
    };
  }, [callProduct, user?.id, isPurchased, navigate, purchases]); // Adicionado purchases como dependência

  const handleCtaClick = () => {
    if (!callProduct || !user?.id) {
        setError('Produto indisponível ou usuário não logado.');
        return;
    }
    
    // 1. Inicia o fluxo de checkout PIX
    openCheckoutForProduct(callProduct.id);
    
    // 2. Inicia o Polling (Fallback B)
    // Se o Realtime do PurchaseContext falhar, o polling garante o redirecionamento.
    if (!pollingTimerRef.current) {
        startTimeRef.current = Date.now();
        pollingTimerRef.current = setInterval(() => {
            checkPurchaseStatus(callProduct.id, user.id);
        }, POLLING_INTERVAL) as unknown as number;
    }
  };
  
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-privacy-black flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !callProduct) {
    return (
      <div className="min-h-screen bg-privacy-black text-white flex flex-col items-center justify-center p-4">
        <p className="text-red-400 mb-4">{error || 'Oferta não encontrada.'}</p>
        <button onClick={() => navigate('/')} className="text-primary hover:underline flex items-center gap-1">
            <X size={16} /> Voltar para o Início
        </button>
      </div>
    );
  }
  
  // Verifica se o modal de checkout está aberto (para desabilitar o CTA)
  const isCheckoutOpen = !!(document.querySelector('.fixed.inset-0.z-\\[999\\]'));

  return (
    <div className="min-h-screen bg-privacy-black text-white flex flex-col items-center justify-between p-4 relative">
      
      {/* Conteúdo Principal */}
      <div className="flex flex-col items-center text-center w-full max-w-md flex-1 justify-center">
        
        {/* Status e Headline */}
        <div className="flex items-center gap-2 text-green-400 mb-4">
          <CheckCircle size={18} />
          <span className="text-sm font-semibold">Tudo pronto.</span>
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-6">
          Meu conteúdo já é seu. Tá te esperando. 👁️🔥
        </h1>
        
        {/* Preview da Câmera */}
        <div className="w-full max-w-xs aspect-square rounded-xl overflow-hidden bg-privacy-surface border-4 border-primary shadow-2xl relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform scale-x-[-1]" // Espelha a imagem
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-xs text-privacy-text-secondary">
            {/* Fallback se a câmera falhar */}
            {!videoRef.current?.srcObject && 'Câmera indisponível'}
          </div>
        </div>
        
        {/* Detalhes do Produto */}
        <div className="mt-6 bg-privacy-surface p-4 rounded-lg w-full max-w-xs border border-privacy-border">
            <p className="text-sm text-privacy-text-secondary">Oferta Exclusiva:</p>
            <p className="text-lg font-bold text-white truncate">{callProduct.name}</p>
            <p className="text-2xl font-bold text-primary mt-1">{formatPrice(callProduct.price_cents)}</p>
        </div>
      </div>
      
      {/* CTA Fixo na parte inferior */}
      <div className="w-full max-w-md mt-8">
        <button
          onClick={handleCtaClick}
          disabled={isPurchased || isCheckoutOpen}
          className="w-full bg-primary hover:opacity-90 text-privacy-black font-bold py-4 rounded-xl transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30"
        >
          {isPurchased ? 'Acesso Liberado! Entrando...' : 'Quero entrar agora'}
        </button>
        <p className="text-center text-xs text-privacy-text-secondary mt-2">
          Pagamento instantâneo • Acesso imediato
        </p>
        
        <button
          onClick={() => navigate('/')}
          className="w-full mt-4 text-sm text-privacy-text-secondary hover:text-white transition-colors flex items-center justify-center gap-1"
        >
          <X size={14} /> Vou deixar passar
        </button>
      </div>
    </div>
  );
};