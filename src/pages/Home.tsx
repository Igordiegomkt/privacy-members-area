import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Model } from '../types';
import { fetchUserPurchases } from '../lib/marketplace';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { Lock, CheckCircle } from 'lucide-react';

interface ModelWithAccess extends Model {
  isUnlocked: boolean;
}

const ModelCard: React.FC<{ model: ModelWithAccess }> = ({ model }) => {
  const navigate = useNavigate();
  return (
    <div 
      className="relative rounded-lg overflow-hidden group cursor-pointer"
      onClick={() => navigate(`/modelo/${model.username}`)}
    >
      <img src={model.avatar_url} alt={model.name} className={`w-full h-full object-cover aspect-[3/4] transition-all duration-300 ${!model.isUnlocked ? 'grayscale group-hover:grayscale-0' : ''}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      
      <div className="absolute bottom-0 left-0 p-4 w-full">
        <h3 className="font-bold text-white text-lg">{model.name}</h3>
        <p className="text-sm text-privacy-text-secondary">@{model.username}</p>
      </div>

      <div className="absolute top-3 right-3">
        {model.isUnlocked ? (
          <div className="flex items-center gap-1.5 bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-semibold">
            <CheckCircle size={14} />
            <span>Liberado</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-red-500/20 text-red-400 px-2 py-1 rounded-full text-xs font-semibold">
            <Lock size={14} />
            <span>Bloqueado</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const Home: React.FC = () => {
  const [models, setModels] = useState<ModelWithAccess[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadModels = async () => {
      setLoading(true);
      
      const hasWelcomeCarolina = localStorage.getItem('welcomePurchaseCarolina') === 'true';

      const [modelsRes, purchasesRes] = await Promise.all([
        supabase.from('models').select('*'),
        fetchUserPurchases()
      ]);

      if (modelsRes.error) {
        console.error("Erro ao buscar modelos:", modelsRes.error);
        setLoading(false);
        return;
      }

      const purchasedModelIds = new Set(purchasesRes.map(p => p.product?.model_id).filter(Boolean));

      const modelsWithAccess = modelsRes.data.map(model => {
        const isCarolina = model.username === 'carolina-andrade';
        const isUnlocked = (isCarolina && hasWelcomeCarolina) || purchasedModelIds.has(model.id);
        return { ...model, isUnlocked };
      });

      // Coloca a Carolina no topo se ela estiver desbloqueada
      modelsWithAccess.sort((a, b) => {
        if (a.isUnlocked && !b.isUnlocked) return -1;
        if (!a.isUnlocked && b.isUnlocked) return 1;
        return 0;
      });

      setModels(modelsWithAccess);
      setLoading(false);
    };

    loadModels();
  }, []);

  return (
    <div className="min-h-screen bg-privacy-black text-white pb-24">
      <Header />
      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Início</h1>
          <p className="text-privacy-text-secondary mt-1">Explore os perfis das modelos.</p>
        </div>

        {loading ? (
          <div className="text-center py-10">Carregando modelos...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {models.map(model => (
              <ModelCard key={model.id} model={model} />
            ))}
          </div>
        )}
      </main>
      <BottomNavigation />
    </div>
  );
};