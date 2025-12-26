import * as React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { fetchUserPurchases, UserPurchaseWithProduct } from '../lib/marketplace';
import { trackPurchase } from '../lib/tracking';
import { useAuth } from './AuthContext'; // Importando useAuth

interface PurchaseContextType {
  purchases: UserPurchaseWithProduct[];
  isLoading: boolean;
  hasPurchase: (productId: string) => boolean;
}

const PurchaseContext = createContext<PurchaseContextType | undefined>(undefined);

export const PurchaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }: { children: React.ReactNode }) => {
  const { session, user, isLoading: isLoadingAuth } = useAuth(); // Usando useAuth
  const [purchases, setPurchases] = useState<UserPurchaseWithProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPurchases = useCallback(async (userId: string) => {
    // Não setamos loading para true aqui para evitar flashes de UI em re-fetch
    try {
      const userPurchases = await fetchUserPurchases(userId); // Passando userId
      setPurchases(userPurchases);
      
      // --- LÓGICA DE RASTREAMENTO PURCHASE (DEDUPLICADA) ---
      userPurchases.forEach(p => {
        if (p.status === 'paid' && p.products) {
            const purchaseId = p.id;
            const productId = p.product_id;
            const priceCents = p.price_paid_cents;
            
            // FASE 5: Adicionar filtro para ignorar compras de links externos (GRANT)
            if (p.payment_provider === 'external_link' || p.payment_provider === 'whatsapp_welcome') {
                // console.log(`[Tracking] Ignorando purchase para link externo/welcome: ${purchaseId}`);
                return; 
            }
            
            // Usamos o ID da compra (user_purchases.id) para garantir unicidade
            const storageKey = `purchased-sent-${purchaseId}`; 

            if (!localStorage.getItem(storageKey)) {
                trackPurchase({
                    content_ids: [productId],
                    value: priceCents / 100,
                    currency: 'BRL',
                    eventID: `purchase-${purchaseId}`
                });
                localStorage.setItem(storageKey, '1');
            }
        }
      });
      // -----------------------------------------------------

    } catch (error) {
      console.error("Failed to load purchases:", error);
    } finally {
      // Apenas setamos isLoading false na primeira vez que o Auth termina de carregar
      if (!isLoadingAuth) {
        setIsLoading(false);
      }
    }
  }, [isLoadingAuth]);

  useEffect(() => {
    if (user?.id) {
      loadPurchases(user.id);

      const channel = supabase
        .channel('user_purchases_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_purchases',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Realtime purchase received!', payload);
            loadPurchases(user.id); // Re-fetch all purchases on new insert
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else if (!isLoadingAuth) {
        // Clear purchases if user logs out or is not logged in after auth loads
        setPurchases([]);
        setIsLoading(false);
    }
  }, [user?.id, isLoadingAuth, loadPurchases]);

  const hasPurchase = (productId: string): boolean => {
    return purchases.some(p => p.product_id === productId);
  };

  return (
    <PurchaseContext.Provider value={{ purchases, isLoading: isLoadingAuth || isLoading, hasPurchase }}>
      {children}
    </PurchaseContext.Provider>
  );
};

export const usePurchases = () => {
  const context = useContext(PurchaseContext);
  if (context === undefined) {
    throw new Error('usePurchases must be used within a PurchaseProvider');
  }
  return context;
};