import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { useCheckout } from '../contexts/CheckoutContext';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, ArrowRight, X } from 'lucide-react';

const formatPrice = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Constantes para o polling
const POLLING_INTERVAL = 3000; // 3 segundos
const MAX_POLLING_TIME = 60000; // 60 segundos

export const UpsellCallScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openCheckoutForProduct } = useCheckout();
  
  const [callProduct, setCallProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPurchased, setIsPurchased] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pollingTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef(Date.now());

  // 1. Busca o produto [CALL]
  useEffect(() => {
    const fetchCallProduct = async () => {
      setLoading(true);
      try {
        // Busca o produto cujo nome começa com [CALL]
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
        // Não é um erro fatal, apenas não mostra o preview
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  // 3. Lógica de Polling para detecção de compra
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
        console.log('[Upsell] Purchase confirmed! Redirecting...');
        setIsPurchased(true);
        clearInterval(pollingTimerRef.current!);
        pollingTimerRef.current = null;
        navigate('/chamada/sala', { replace: true });
    }
  }, [navigate]);

  // 4. Inicia/Para o Polling
  useEffect(() => {
    if (callProduct && user?.id && !isPurchased && !pollingTimerRef.current) {
        // Verifica imediatamente
        checkPurchaseStatus(callProduct.id, user.id);
        
        // Inicia o polling
        pollingTimerRef.current = setInterval(() => {
            checkPurchaseStatus(callProduct.id, user.id);
        }, POLLING_INTERVAL) as unknown as number;
        
        startTimeRef.current = Date.now();
    }
    
    return () => {
        if (pollingTimerRef.current) {
            clearInterval(pollingTimerRef.current);
            pollingTimerRef.current = null;
        }
    };
  }, [callProduct, user?.id, isPurchased, checkPurchaseStatus]);


  const handleCtaClick = () => {
    if (!callProduct) {
        setError('Produto indisponível.');
        return;
    }
    // Rastreamento AddToCart (opcional, mas boa prática)
    // trackAddToCart({ ... }); 
    
    // Inicia o fluxo de checkout PIX
    openCheckoutForProduct(callProduct.id);
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