import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Model } from '../types';
import { fetchUserPurchases } from '../lib/marketplace';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { Lock } from 'lucide-react';
import { useCheckout } from '../contexts/CheckoutContext';

interface ModelWithAccess extends Model {
  isUnlocked: boolean;
  mainProductId?: string;
  mainProductPriceCents?: number;
}

const ModelCard: React.FC<{ model: ModelWithAccess }> = ({ model }) => {
  const navigate = useNavigate();
  const { openCheckoutModal } = useCheckout();

  const handleCardClick = () => {
    if (!model.isUnlocked && model.mainProductId) {
      openCheckoutModal(model.mainProductId);
    } else {
      navigate(`/modelo/${model.username}`);
    }
  };

  return (
    <div 
      className="relative rounded-lg overflow-hidden group cursor-pointer aspect-[3/4]"
      onClick={handleCardClick}
    >
      <img src={model.avatar_url ?? ''} alt={model.name} className={`w-full h-full object-cover transition-all duration-300 ${!model.isUnlocked ? 'grayscale' : ''}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      
      <div className="absolute bottom-0 left-0 p-4 w-full">
        <h3 className="font-bold text-white text-lg truncate">{model.name}</h3>
        <p className="text-sm text-privacy-text-secondary">@{model.username}</p>
        {model.mainProductPriceCents != null && !model.isUnlocked && (
          <p className="mt-1 text-sm text-primary font-semibold">
            Acesso VIP a partir de{' '}
            {(model.mainProductPriceCents / 100).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </p>
        )}
      </div>

      {!model.isUnlocked && (
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center p-4 text-center">
          <div className="flex items-center gap-1.5 bg-red-500/20 text-red-400 px-2 py-1 rounded-full text-xs font-semibold mb-3">
            <Lock size={14} />
            <span>Bloqueado</span>
          </div>
          <p className="text-white font-semibold mb-2">
            Desbloqueie o VIP da {model.name?.split(' ')[0] ?? 'modelo'}
          </p>

          {model.mainProductId ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openCheckoutModal(model.mainProductId!);
              }}
              className="bg-primary text-privacy-black font-semibold py-2 px-4 rounded-lg text-sm shadow-lg hover:opacity-90 transition"
            >
              🔓 Desbloquear perfil VIP
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/modelo/${model.username}`);
              }}
              className="bg-privacy-surface text-privacy-text-secondary font-semibold py-2 px-4 rounded-lg text-xs shadow hover:bg-privacy-surface/80 transition"
            >
              Ver perfil
            </button>
          )}
        </div>
      )}
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

      const [modelsRes, purchasesRes, productsRes] = await Promise.all([
        supabase.from('models').select('*'),
        fetchUserPurchases(),
        supabase.from('products').select('id, model_id, is_base_membership, price_cents')
      ]);

      if (modelsRes.error) {
        console.error("Erro ao buscar modelos:", modelsRes.error);
        setLoading(false);
        return;
      }

      const products = productsRes.data || [];
      const purchasedModelIds = new Set(purchasesRes.map(p => p.product?.model_id).filter(Boolean));

      const modelsWithAccess = modelsRes.data.map(model => {
        const isCarolina = model.username === 'carolina-andrade';
        const isUnlocked = (isCarolina && hasWelcomeCarolina) || purchasedModelIds.has(model.id);
        
        const modelProducts = products.filter(p => p.model_id === model.id);
        const mainProduct = modelProducts.find(p => p.is_base_membership) || modelProducts[0];

        return { 
          ...model, 
          isUnlocked, 
          mainProductId: mainProduct?.id,
          mainProductPriceCents: mainProduct?.price_cents
        };
      });

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