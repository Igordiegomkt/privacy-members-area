import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { useProtection } from '../hooks/useProtection';
import { fetchUserPurchases, UserPurchaseWithProduct } from '../lib/marketplace';

const PurchaseItem: React.FC<{ purchase: UserPurchaseWithProduct; isHighlighted: boolean }> = ({ purchase, isHighlighted }) => {
  const product = purchase.product;

  if (!product) {
    return (
      <div className="flex items-center gap-4 bg-privacy-surface p-4 rounded-lg opacity-60">
        <div className="w-16 h-16 bg-privacy-border rounded-md flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-privacy-text-secondary italic">Produto não está mais disponível</h3>
          <p className="text-sm text-privacy-text-secondary">
            Comprado em: {new Date(purchase.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>
    );
  }

  const model = product.model;
  const linkTo = model ? `/modelo/${model.username}` : `/produto/${product.id}`;

  return (
    <Link 
      to={linkTo} 
      className={`flex items-center gap-4 bg-privacy-surface p-4 rounded-lg hover:bg-privacy-border transition-all duration-300 ${isHighlighted ? 'ring-2 ring-primary shadow-lg' : ''}`}
    >
      <img src={product.cover_thumbnail} alt={product.name} className="w-16 h-16 object-cover rounded-md flex-shrink-0" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-privacy-text-primary">{product.name}</h3>
          {isHighlighted && <span className="text-xs font-semibold bg-primary/20 text-primary px-2 py-1 rounded-full">Novo!</span>}
        </div>
        {model && (
          <div className="flex items-center gap-2 mt-1">
            <img src={model.avatar_url} alt={model.name} className="w-5 h-5 rounded-full object-cover" />
            <span className="text-xs text-privacy-text-secondary">{model.name}</span>
          </div>
        )}
        <p className="text-xs text-privacy-text-secondary mt-2">
          Comprado em: {new Date(purchase.created_at).toLocaleDateString('pt-BR')}
        </p>
      </div>
      <span className="text-sm font-semibold text-green-400 bg-green-500/10 px-2 py-1 rounded-full capitalize">
        {purchase.status === 'paid' ? 'Desbloqueado' : purchase.status}
      </span>
    </Link>
  );
};

const MyPurchasesContent: React.FC = () => {
  const [purchases, setPurchases] = useState<UserPurchaseWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const highlightedProductId = searchParams.get('highlight');

  useEffect(() => {
    const loadPurchases = async () => {
      try {
        setLoading(true);
        setError(null);
        const userPurchases = await fetchUserPurchases();
        setPurchases(userPurchases);
      } catch (e) {
        setError('Não foi possível carregar suas compras.');
      } finally {
        setLoading(false);
      }
    };
    loadPurchases();
  }, []);

  if (loading) {
    return <div className="text-center py-16 text-privacy-text-secondary">Carregando suas compras...</div>;
  }

  if (error) {
    return <div className="text-center py-16 text-red-400">{error}</div>;
  }

  if (purchases.length === 0) {
    return (
      <div className="text-center py-16 bg-privacy-surface rounded-lg">
        <h2 className="text-lg font-semibold text-privacy-text-primary">Nada por aqui ainda</h2>
        <p className="text-sm text-privacy-text-secondary mt-2">Você ainda não comprou nenhum conteúdo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {purchases.map(purchase => (
        <PurchaseItem 
          key={purchase.id} 
          purchase={purchase} 
          isHighlighted={purchase.product_id === highlightedProductId} 
        />
      ))}
    </div>
  );
};

export const MyPurchases: React.FC = () => {
  useProtection();

  return (
    <div className="min-h-screen bg-privacy-black text-white pb-24">
      <Header />
      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Minhas Compras</h1>
          <p className="text-sm text-privacy-text-secondary">Todo o conteúdo que você já desbloqueou.</p>
        </div>
        <MyPurchasesContent />
      </main>
      <BottomNavigation />
    </div>
  );
};