// ⚠️ ZONA CRÍTICA DO SISTEMA DE PAGAMENTO
// - Não alterar estrutura da resposta (ok, pixCopiaCola, qrCodeUrl, productName, modelName, amountCents)
// - Não alterar a função openCheckoutForProduct (ela é o único ponto de entrada para create-checkout)
// Qualquer mudança aqui exige:
// 1) Rodar checklist de compras end-to-end
// 2) Conferir Minhas Compras + Admin Dashboard

import * as React from 'react';
import { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

type CheckoutState = {
  isOpen: boolean;
  loading: boolean;
  productId: string | null;
  pixCopiaCola?: string;
  pixQrCodeUrl?: string;
  amountCents?: number;
  productName?: string;
  modelName?: string | null;
  error?: string | null;
};

type CheckoutContextValue = {
  state: CheckoutState;
  openCheckoutForProduct: (productId: string) => void;
  closeCheckout: () => void;
};

const CheckoutContext = createContext<CheckoutContextValue | undefined>(undefined);

export const CheckoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<CheckoutState>({
    isOpen: false,
    loading: false,
    productId: null,
  });

  const closeCheckout = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
      error: null,
    }));
  }, []);

  const openCheckoutForProduct = useCallback((productId: string) => {
    setState({
      isOpen: true,
      loading: true,
      productId,
      pixCopiaCola: undefined,
      pixQrCodeUrl: undefined,
      amountCents: undefined,
      productName: undefined,
      modelName: undefined,
      error: null,
    });

    supabase.functions
      .invoke('create-checkout', {
        body: { productId },
      })
      .then(({ data, error }) => {
        if (error) {
          console.error('[CheckoutContext] invoke error', error);
          setState(prev => ({
            ...prev,
            loading: false,
            error: error.message || 'Erro ao iniciar pagamento PIX.',
          }));
          return;
        }

        if (!data) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: 'Resposta vazia do servidor de pagamento.',
          }));
          return;
        }

        if (data.ok === false) {
          let errorMessage = data.message || 'Erro ao criar cobrança PIX.';
          
          // Tratamento de erros de autenticação específicos
          if (data.code === 'MISSING_TOKEN' || data.code === 'INVALID_USER') {
            errorMessage = 'Sua sessão expirou ou não foi possível identificar seu usuário. Faça login novamente e tente comprar de novo.';
          }

          setState(prev => ({
            ...prev,
            loading: false,
            error: errorMessage,
          }));
          return;
        }

        setState(prev => ({
          ...prev,
          loading: false,
          pixCopiaCola: data.pixCopiaCola,
          pixQrCodeUrl: data.qrCodeUrl,
          amountCents: data.amountCents,
          productName: data.productName,
          modelName: data.modelName ?? null,
        }));
      })
      .catch(err => {
        console.error('[CheckoutContext] unexpected error', err);
        setState(prev => ({
          ...prev,
          loading: false,
          error: err?.message || 'Erro inesperado ao criar o checkout PIX.',
        }));
      });
  }, []);

  return (
    <CheckoutContext.Provider value={{ state, openCheckoutForProduct, closeCheckout }}>
      {children}
    </CheckoutContext.Provider>
  );
};

export const useCheckout = (): CheckoutContextValue => {
  const ctx = useContext(CheckoutContext);
  if (!ctx) {
    throw new Error('useCheckout deve ser usado dentro de CheckoutProvider');
  }
  return ctx;
};