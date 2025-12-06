import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Product, Model } from '../types';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { useProtection } from '../hooks/useProtection';
import { fetchProducts } from '../lib/marketplace';
import { supabase } from '../lib/supabase';
import { useCheckout } from '../contexts/CheckoutContext';

const formatPrice = (cents: number) => {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

const ProductCard: React.FC<{ product: Product }> = ({ product }) => (
  <Link to={`/produto/${product.id}`} className="bg-privacy-surface rounded-lg overflow-hidden group">
    <div className="relative aspect-square">
      {product.cover_thumbnail ? (
        <img src={product.cover_thumbnail} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
      ) : (
        <div className="w-full h-full bg-privacy-border flex items-center justify-center">
          <span className="text-xs text-privacy-text-secondary">Sem prévia</span>
        </div>
      )}
      <div className="absolute top-2 left-2 bg-black/50 rounded-full px-2 py-1 text-xs font-semibold text-white capitalize">
        {product.type === 'pack' && 'Pack'}
        {product.type === 'single_media' && 'Conteúdo'}
        {product.type === 'subscription' && 'Assinatura'}
      </div>
    </div>
    <div className="p-4">
      <h3 className="font-semibold text-privacy-text-primary truncate">{product.name}</h3>
      <p className="text-lg font-bold text-primary mt-1">{formatPrice(product.price_cents)}</p>
    </div>
  </Link>
);

interface ModelVipCardProps {
  product: Product & { models: Model | null };
}

const ModelVipCard: React.FC<ModelVipCardProps> = ({ product }) => {
  const { openCheckoutModal } = useCheckout();
  const model = product.models;

  if (!model) return null;

  return (
    <div className="bg-privacy-surface rounded-lg overflow-hidden group flex flex-col">
      <div className="relative aspect-square cursor-pointer" onClick={() => openCheckoutModal(product.id)}>
        <img src={model.avatar_url ?? ''} alt={model.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm text-privacy-text-primary truncate">{model.name}</h3>
        <p className="text-xs text-privacy-text-secondary truncate">@{model.username}</p>
        <p className="text-base font-bold text-primary mt-1">{formatPrice(product.price_cents)}</p>
      </div>
    </div>
  );
};

export const Marketplace: React.FC = () => {
  useProtection();
  const [otherProducts, setOtherProducts] = useState<Product[]>([]);
  const [baseProducts, setBaseProducts] = useState<(Product & { models: Model | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [allProducts, baseProductsRes] = await Promise.all([
          fetchProducts(),
          supabase
            .from('products')
            .select('id, name, price_cents, model_id, is_base_membership, models ( id, name, username, avatar_url )')
            .eq('status', 'active')
            .eq('is_base_membership', true)
        ]);

        if (baseProductsRes.error) throw baseProductsRes.error;

        const baseProductIds = new Set(baseProductsRes.data?.map(p => p.id));
        setBaseProducts(baseProductsRes.data as any || []);
        setOtherProducts(allProducts.filter(p => !p.is_base_membership && !baseProductIds.has(p.id)));

      } catch (e) {
        setError('Não foi possível carregar a loja. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-privacy-black text-white pb-24">
      <Header />
      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Loja de Conteúdos</h1>
          <p className="text-sm text-privacy-text-secondary">Packs exclusivos, conteúdos avulsos e assinaturas VIP.</p>
        </div>

        {loading && <div className="text-center py-16 text-privacy-text-secondary">Carregando ofertas...</div>}
        {error && <div className="text-center py-16 text-red-400">{error}</div>}

        {!loading && !error && (
          <>
            {baseProducts.length > 0 && (
              <section className="mb-10">
                <h2 className="text-xl font-bold mb-4">Modelos VIP</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {baseProducts.map(p => (
                    <ModelVipCard key={p.id} product={p} />
                  ))}
                </div>
              </section>
            )}

            {otherProducts.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-white mb-4">Packs e conteúdos exclusivos</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {otherProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
      <BottomNavigation />
    </div>
  );
};