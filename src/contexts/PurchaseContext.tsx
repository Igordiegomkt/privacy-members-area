import * as React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { fetchUserPurchases, UserPurchaseWithProduct } from '../lib/marketplace';
import { Session } from '@supabase/supabase-js';

interface PurchaseContextType {
  purchases: UserPurchaseWithProduct[];
  isLoading: boolean;
  hasPurchase: (productId: string) => boolean;
}

const PurchaseContext = createContext<PurchaseContextType | undefined>(undefined);

export const PurchaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }: { children: React.ReactNode }) => {
  const [purchases, setPurchases] = useState<UserPurchaseWithProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  const loadPurchases = useCallback(async () => {
    // Don't set loading to true here to avoid UI flashes on re-fetch
    try {
      const userPurchases = await fetchUserPurchases();
      setPurchases(userPurchases);
    } catch (error) {
      console.error("Failed to load purchases:", error);
    } finally {
      setIsLoading(false); // Only set loading false on initial load
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      loadPurchases();

      const channel = supabase
        .channel('user_purchases_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_purchases',
            filter: `user_id=eq.${session.user.id}`,
          },
          (payload) => {
            console.log('Realtime purchase received!', payload);
            loadPurchases(); // Re-fetch all purchases on new insert
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
        // Clear purchases if user logs out
        setPurchases([]);
        setIsLoading(false);
    }
  }, [session, loadPurchases]);

  const hasPurchase = (productId: string): boolean => {
    return purchases.some(p => p.product_id === productId);
  };

  return (
    <PurchaseContext.Provider value={{ purchases, isLoading, hasPurchase }}>
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