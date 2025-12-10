import * as React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { useProtection } from '../hooks/useProtection';
import { fetchTrendingModels, ModelWithStats } from '../lib/models';
import { fetchUserPurchases, UserPurchaseWithProduct } from '../lib/marketplace';

const BASE_MODEL_USERNAME = 'carolina-andrade';

interface TrendingModelCardProps {
    model: ModelWithStats;
    rank: number;
    isVip: boolean;
    isPurchased: boolean;
}

const TrendingModelCard: React.FC<TrendingModelCardProps> = ({ model, rank, isVip, isPurchased }: TrendingModelCardProps) => {
    const navigate = useNavigate();

    const getBadge = () => {
        if (isVip) {
            return <span className="text-xs font-semibold bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">💎 Sua VIP</span>;
        }
        if (isPurchased) {
            return <span className="text-xs font-semibold bg-green-500/20 text-green-400 px-2 py-1 rounded-full">✔ Você já tem conteúdo dela</span>;
        }
        return <span className="text-xs font-semibold bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">💘 Você ainda não conhece</span>;
    };

    return (
        <div className="bg-privacy-surface p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-4 flex-1 w-full">
                <div className="text-xl font-bold text-privacy-text-secondary w-8 text-center">{rank}</div>
                <img src={model.avatar_url ?? ''} alt={model.name} className="w-14 h-14 rounded-full object-cover" />
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-privacy-text-primary">{model.name}</h3>
                        {getBadge()}
                    </div>
                    <p className="text-sm text-privacy-text-secondary">@{model.username}</p>
                    <p className="text-sm text-primary font-semibold mt-1">🔥 {model.total_purchases} compras</p>
                </div>
            </div>
            <button
                onClick={() => navigate(`/modelo/${model.username}`)}
                className="w-full sm:w-auto bg-primary hover:opacity-90 text-privacy-black font-semibold py-2 px-6 rounded-lg transition-opacity whitespace-nowrap"
            >
                Ver perfil
            </button>
        </div>
    );
};

export const TrendingModels: React.FC = () => {
  useProtection();
  const [trendingModels, setTrendingModels] = useState<ModelWithStats[]>([]);
  const [userPurchases, setUserPurchases] = useState<UserPurchaseWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTrending = async () => {
      try {
        setLoading(true);
        setError(null);
        const [models, purchases] = await Promise.all([
            fetchTrendingModels(),
            fetchUserPurchases()
        ]);
        setTrendingModels(models);
        setUserPurchases(purchases);
      } catch (e) {
        setError('Não foi possível carregar o ranking.');
      } finally {
        setLoading(false);
      }
    };
    loadTrending();
  }, []);

  const purchasedModelIds = new Set(userPurchases.map(p => p.products?.model_id).filter(Boolean));

  return (
    <div className="min-h-screen bg-privacy-black text-white pb-24">
      <Header />
      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">Em alta 🔥</h1>
          <p className="text-sm text-privacy-text-secondary">As modelos mais compradas e desejadas do momento.</p>
        </div>

        {loading && <div className="text-center py-10">Carregando ranking...</div>}
        {error && <div className="text-center py-10 text-red-400">{error}</div>}

        {!loading && !error && trendingModels.length === 0 && (
          <div className="text-center py-10 text-privacy-text-secondary">
            <p>O ranking ainda está sendo formado.</p>
            <p>Volte mais tarde!</p>
          </div>
        )}

        <div className="space-y-3">
          {trendingModels.map((model, index) => (
            <TrendingModelCard 
                key={model.id} 
                model={model} 
                rank={index + 1}
                isVip={model.username === BASE_MODEL_USERNAME}
                isPurchased={purchasedModelIds.has(model.id)}
            />
          ))}
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
};