import React, { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { useProtection } from '../hooks/useProtection';
import { fetchUserPurchases, UserPurchaseWithProduct } from '../lib/marketplace';

const PurchaseItem: React.FC<{ purchase: UserPurchaseWithProduct; isHighlighted: boolean }> = ({ purchase, isHighlighted }) => {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const product = purchase.product;

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);

  if (!product) return null; // Não renderiza nada se o produto não existir mais

  const model = product.model;
  const handleNavigate = () => {
    if (model) {
      navigate(`/modelo/${model.username}`);
    }
  };

  return (
    <div
      ref={cardRef}
      className={`bg-privacy-surface p-4 rounded-lg transition-all duration-500 ${isHighlighted ? 'ring-2 ring-primary shadow-lg shadow-primary/20' : ''}`}
    >
      <div className="flex items-start gap-4">
        <img src={product.cover_thumbnail || model?.avatar_url} alt={product.name} className="w-24 h-24 object-cover rounded-md flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-privacy-text-primary text-lg">{product.name}</h3>
          {model && <p className="text-sm text-privacy-text-secondary mt-1">Conteúdo de {model.name}</p>}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs font-semibold bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
              ✔ Já é seu
            </span>
          </div>
        </div>
      </div>
      <button
        onClick={handleNavigate}
        className="w-full mt-4 bg-primary hover:opacity-90 text-privacy-black font-semibold py-2 rounded-lg transition-opacity"
      >
        Ver conteúdo
      </button>
    </div>
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
        <Link to="/loja" className="mt-4 inline-block bg-primary text-privacy-black font-semibold py-2 px-6 rounded-lg">
          Explorar a Loja
        </Link>
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