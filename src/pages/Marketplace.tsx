import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../types';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { useProtection } from '../hooks/useProtection';
import { fetchProducts } from '../lib/marketplace';

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

const MarketplaceContent: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedProducts = await fetchProducts();
        setProducts(fetchedProducts);
      } catch (e) {
        setError('Não foi possível carregar a loja. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  if (loading) {
    return <div className="text-center py-16 text-privacy-text-secondary">Carregando ofertas...</div>;
  }

  if (error) {
    return <div className="text-center py-16 text-red-400">{error}</div>;
  }

  if (products.length === 0) {
    return <div className="text-center py-16 text-privacy-text-secondary">Ainda não há produtos disponíveis.</div>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};

export const Marketplace: React.FC = () => {
  useProtection();

  return (
    <div className="min-h-screen bg-privacy-black text-white pb-24">
      <Header />
      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Loja de Conteúdos</h1>
          <p className="text-sm text-privacy-text-secondary">Packs exclusivos, conteúdos avulsos e assinaturas VIP.</p>
        </div>
        <MarketplaceContent />
      </main>
      <BottomNavigation />
    </div>
  );
};