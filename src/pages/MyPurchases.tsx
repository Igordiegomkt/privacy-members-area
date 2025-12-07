import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { fetchUserPurchases, UserPurchaseWithProduct } from '../lib/marketplace';

const formatPrice = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

export const MyPurchases: React.FC = () => {
  const [purchases, setPurchases] = useState<UserPurchaseWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchUserPurchases();
      setPurchases(data);
      setLoading(false);
    };
    load();
  }, []);

  // Filtra e agrupa as compras
  const vipPurchases = purchases.filter((p) => {
    const product = p.products;
    return (
      product &&
      (product.is_base_membership ||
        (product.type === 'subscription' && !!product.model_id))
    );
  });

  const packPurchases = purchases.filter(
    (p) => p.products?.type === 'pack'
  );

  const singlePurchases = purchases.filter(
    (p) => p.products?.type === 'single_media'
  );

  const renderVipCard = (p: UserPurchaseWithProduct) => {
    const product = p.products;
    const model = product.models;
    if (!product || !model) return null;

    return (
      <div
        key={p.id}
        className="bg-privacy-surface rounded-lg overflow-hidden flex items-center gap-4 p-3 cursor-pointer hover:bg-privacy-surface/80 transition"
        onClick={() => navigate(`/modelo/${model.username}`)}
      >
        <img
          src={model.avatar_url ?? ''}
          alt={model.name}
          className="w-16 h-16 rounded-full object-cover bg-privacy-border"
        />
        <div className="flex-1">
          <p className="text-sm text-privacy-text-secondary mb-0.5">
            VIP de
          </p>
          <h3 className="font-semibold text-white text-sm">
            {model.name}
          </h3>
          <p className="text-xs text-privacy-text-secondary">
            Desbloqueado em{' '}
            {p.paid_at
              ? new Date(p.paid_at).toLocaleString('pt-BR')
              : new Date(p.created_at).toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-privacy-text-secondary">Valor</p>
          <p className="text-sm font-bold text-primary">
            {formatPrice(p.amount_cents ?? p.products.price_cents)}
          </p>
        </div>
      </div>
    );
  };

  const renderProductCard = (p: UserPurchaseWithProduct) => {
    const product = p.products;
    if (!product) return null;

    return (
      <div
        key={p.id}
        className="bg-privacy-surface rounded-lg overflow-hidden cursor-pointer hover:bg-privacy-surface/80 transition"
        onClick={() => navigate(`/produto/${product.id}`)}
      >
        <div className="relative aspect-[4/3]">
          {product.cover_thumbnail ? (
            <img
              src={product.cover_thumbnail}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-privacy-border flex items-center justify-center text-xs text-privacy-text-secondary">
              Sem prévia
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-sm text-white truncate">
            {product.name}
          </h3>
          <p className="text-xs text-privacy-text-secondary mt-0.5">
            Comprado em{' '}
            {p.paid_at
              ? new Date(p.paid_at).toLocaleString('pt-BR')
              : new Date(p.created_at).toLocaleString('pt-BR')}
          </p>
          <p className="text-sm font-bold text-primary mt-1">
            {formatPrice(p.amount_cents ?? product.price_cents)}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-privacy-black text-white pb-24">
      <Header />
      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        <h1 className="text-2xl font-bold mb-1">Minhas Compras</h1>
        <p className="text-sm text-privacy-text-secondary mb-6">
          Aqui ficam todos os VIPs, packs e conteúdos que você já desbloqueou.
        </p>

        {loading && (
          <div className="text-center py-16 text-privacy-text-secondary">
            Carregando suas compras...
          </div>
        )}

        {!loading && purchases.length === 0 && (
          <div className="text-center py-16 text-privacy-text-secondary">
            Você ainda não desbloqueou nenhum conteúdo.
          </div>
        )}

        {!loading && purchases.length > 0 && (
          <div className="space-y-8">
            {vipPurchases.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3">
                  Perfis VIP de Modelos
                </h2>
                <div className="space-y-3">
                  {vipPurchases.map(renderVipCard)}
                </div>
              </section>
            )}

            {packPurchases.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3">
                  Packs Exclusivos
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {packPurchases.map(renderProductCard)}
                </div>
              </section>
            )}

            {singlePurchases.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3">
                  Conteúdos Avulsos
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {singlePurchases.map(renderProductCard)}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
      <BottomNavigation />
    </div>
  );
};