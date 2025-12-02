import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { useProtection } from '../hooks/useProtection';
import { fetchTrendingModels, ModelWithStats } from '../lib/models';
import { Flame } from 'lucide-react';

const TrendingModelCard: React.FC<{ model: ModelWithStats; rank: number }> = ({ model, rank }) => (
  <Link to={`/modelo/${model.username}`} className="bg-privacy-surface p-4 rounded-lg flex items-center gap-4 hover:bg-privacy-border transition-colors">
    <div className="text-xl font-bold text-privacy-text-secondary w-8 text-center">{rank}</div>
    <img src={model.avatar_url} alt={model.name} className="w-14 h-14 rounded-full object-cover" />
    <div className="flex-1">
      <h3 className="font-semibold text-privacy-text-primary">{model.name}</h3>
      <p className="text-sm text-privacy-text-secondary">@{model.username}</p>
    </div>
    <div className="flex items-center gap-2 text-primary font-semibold">
      <Flame size={18} />
      <span>{model.total_purchases}</span>
    </div>
  </Link>
);

export const TrendingModels: React.FC = () => {
  useProtection();
  const [trendingModels, setTrendingModels] = useState<ModelWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTrending = async () => {
      try {
        setLoading(true);
        setError(null);
        const models = await fetchTrendingModels();
        setTrendingModels(models);
      } catch (e) {
        setError('Não foi possível carregar o ranking.');
      } finally {
        setLoading(false);
      }
    };
    loadTrending();
  }, []);

  return (
    <div className="min-h-screen bg-privacy-black text-white pb-24">
      <Header />
      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">Em Alta</h1>
          <p className="text-sm text-privacy-text-secondary">As criadoras mais populares da plataforma</p>
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
            <TrendingModelCard key={model.id} model={model} rank={index + 1} />
          ))}
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
};