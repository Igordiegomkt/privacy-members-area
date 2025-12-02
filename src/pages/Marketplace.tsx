import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Product } from '../types';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { useProtection } from '../hooks/useProtection';
import { fetchProducts } from '../lib/marketplace';

const BASE_PRODUCT_NAME = 'Conteudo Vip Carolina Andrade';

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

const BaseProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const navigate = useNavigate();

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-white mb-4">Seu acesso VIP</h2>
      <div className="bg-privacy-surface rounded-lg p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img src={product.cover_thumbnail} alt={product.name} className="w-16 h-16 object-cover rounded-md flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-privacy-text-primary">{product.name}</h3>
            <p className="text-sm text-privacy-text-secondary mt-1">Você já tem acesso a este conteúdo.</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/carolina')}
          className="w-full sm:w-auto bg-primary hover:opacity-90 text-privacy-black font-semibold py-2 px-6 rounded-lg transition-opacity whitespace-nowrap"
        >
          Entrar no VIP
        </button>
      </div>
    </div>
  );
};

const MarketplaceContent: React.FC = () => {
  const [baseProduct, setBaseProduct] = useState<Product | null>(null);
  const [otherProducts, setOtherProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedProducts = await fetchProducts();
        
        const base = fetchedProducts.find(p => p.name === BASE_PRODUCT_NAME) || null;
        const others = fetchedProducts.filter(p => p.name !== BASE_PRODUCT_NAME);

        setBaseProduct(base);
        setOtherProducts(others);
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

  if (!baseProduct && otherProducts.length === 0) {
    return <div className="text-center py-16 text-privacy-text-secondary">Ainda não há produtos disponíveis.</div>;
  }

  return (
    <>
      {baseProduct && <BaseProductCard product={baseProduct} />}

      {otherProducts.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Conteúdos exclusivos para você</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {otherProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}
    </>
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