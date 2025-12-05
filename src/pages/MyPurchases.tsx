import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fetchUserPurchases } from '../lib/marketplace';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';

type PurchaseItem = any;

export const MyPurchases: React.FC = () => {
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const highlightId = new URLSearchParams(location.search).get('highlight');

  useEffect(() => {
    const loadPurchases = async () => {
      setIsLoading(true);

      let list: PurchaseItem[] = [];

      try {
        // 1) Tenta pegar o usuário do Supabase (caso seja uma compra via Pix normal)
        const { data, error } = await supabase.auth.getUser();

        if (!error && data?.user) {
          const backendPurchases = await fetchUserPurchases();
          if (backendPurchases) {
            list = backendPurchases;
          }
        }
      } catch (err) {
        console.error('[MyPurchases] Erro ao buscar compras no Supabase:', err);
      }

      // 2) Verifica se existe compra de boas-vindas da Carolina via localStorage
      const hasWelcomeCarolina =
        typeof window !== 'undefined' &&
        localStorage.getItem('welcomePurchaseCarolina') === 'true';

      if (hasWelcomeCarolina) {
        const alreadyHasCarolina = list.some((p) => {
          const model =
            (p as any).product?.model ||
            (p as any).model ||
            (p as any).models ||
            (p as any).creator ||
            null;

          const username =
            model?.username ||
            model?.slug ||
            '';

          return username === 'carolina-andrade';
        });

        // Se ainda não existir nenhuma compra da Carolina vinda do back-end,
        // adiciona um card sintético de boas-vindas.
        if (!alreadyHasCarolina) {
          const welcomePurchase: PurchaseItem = {
            id: 'welcome-carolina',
            created_at: new Date().toISOString(),
            isSyntheticWelcome: true,
            product: {
              id: 'welcome-carolina',
              name: 'Conteúdo VIP da Carolina Andrade',
              type: 'welcome',
              price_cents: 0,
              model: {
                id: 'carolina-andrade',
                name: 'Carolina Andrade',
                username: 'carolina-andrade',
                avatar_url: null,
              }
            },
          };

          list = [welcomePurchase, ...list];
        }
      }

      setPurchases(list);
      setIsLoading(false);
    };

    loadPurchases();
  }, []);

  const handleOpenPurchase = (purchase: PurchaseItem) => {
    const model =
      (purchase as any).product?.model ||
      (purchase as any).model ||
      (purchase as any).models ||
      (purchase as any).creator ||
      {};

    const modelUsername = model.username || 'carolina-andrade';

    // Por enquanto, levar sempre para o perfil da modelo.
    navigate(`/modelo/${modelUsername}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-privacy-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const hasPurchases = purchases.length > 0;

  return (
    <div className="min-h-screen bg-privacy-black text-privacy-text-primary pb-20">
      <Header />
      <main className="max-w-5xl mx-auto pt-8 px-4">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Minhas Compras</h1>
        <p className="text-privacy-text-secondary mb-8">
          Todo o conteúdo que você já desbloqueou.
        </p>

        {!hasPurchases && (
          <div className="bg-privacy-surface border border-privacy-border rounded-2xl px-6 py-10 text-center">
            <p className="text-lg font-semibold mb-2">Nada por aqui ainda</p>
            <p className="text-privacy-text-secondary mb-6">
              Você ainda não comprou nenhum conteúdo.
            </p>
            <button
              onClick={() => navigate('/loja')}
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-primary text-privacy-black font-semibold hover:opacity-90 transition-opacity"
            >
              Explorar a Loja
            </button>
          </div>
        )}

        {hasPurchases && (
          <div className="grid gap-4 md:gap-6 md:grid-cols-2">
            {purchases.map((purchase: PurchaseItem) => {
              const product =
                (purchase as any).product ||
                (purchase as any).products ||
                purchase;

              const model =
                (purchase as any).product?.model ||
                (purchase as any).model ||
                (purchase as any).models ||
                (purchase as any).creator ||
                {};

              const isHighlighted = highlightId && highlightId === String(purchase.id);

              const productName = product?.name || 'Conteúdo adquirido';
              const modelName = model?.name || 'Criadora';
              const isWelcome = (purchase as any).isSyntheticWelcome === true;

              return (
                <button
                  key={purchase.id}
                  onClick={() => handleOpenPurchase(purchase)}
                  className={`flex items-center gap-4 bg-privacy-surface border rounded-2xl w-full text-left px-4 py-4 md:px-5 md:py-5 hover:border-primary/70 transition-colors ${
                    isHighlighted ? 'border-primary shadow-lg shadow-primary/20' : 'border-privacy-border'
                  }`}
                >
                  <div className="w-16 h-16 rounded-xl bg-privacy-border flex items-center justify-center overflow-hidden flex-shrink-0">
                    {model?.avatar_url ? (
                      <img
                        src={model.avatar_url}
                        alt={modelName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-semibold">
                        {modelName.charAt(0)}
                      </span>
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-xs uppercase text-primary font-semibold mb-1">
                      {isWelcome ? 'Desbloqueado na entrada' : 'Conteúdo adquirido'}
                    </p>
                    <p className="font-semibold text-sm md:text-base">
                      {productName}
                    </p>
                    <p className="text-xs text-privacy-text-secondary mt-1">
                      por {modelName}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs md:text-sm text-primary font-semibold">
                      Ver conteúdo
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
      <BottomNavigation />
    </div>
  );
};