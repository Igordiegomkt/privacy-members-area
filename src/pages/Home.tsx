import * as React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Model } from '../types';
import { fetchUserPurchases } from '../lib/marketplace';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { useAuth } from '../contexts/AuthContext'; // Importando useAuth
import { isModelUnlockedByGrant } from '../lib/accessVisual'; // Novo import

interface ModelWithAccess extends Model {
  isUnlocked: boolean;
  mainProductId?: string;
  mainProductPriceCents?: number;
}

const ModelCard: React.FC<{ model: ModelWithAccess }> = ({ model }: { model: ModelWithAccess }) => {
  const navigate = useNavigate();
  
  // Acesso por link ou por compra
  const isUnlockedByGrant = isModelUnlockedByGrant(model.id);
  const isUnlocked = model.isUnlocked || isUnlockedByGrant; // isUnlocked já inclui a compra real

  const formattedPrice =
    model.mainProductPriceCents != null
      ? (model.mainProductPriceCents / 100).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })
      : null;

  return (
    <div className="flex flex-col bg-privacy-surface rounded-lg overflow-hidden">
      <div
        className="relative w-full aspect-[3/4] cursor-pointer"
        onClick={() => navigate(`/modelo/${model.username}`)}
      >
        <img
          src={model.avatar_url ?? ''}
          alt={model.name}
          className={`w-full h-full object-cover transition-all duration-300 ${
            !isUnlocked ? 'grayscale' : ''
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Badge de VIP Ativo (Compra ou Link) */}
        {isUnlocked && (
            <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full px-2 py-1 text-[10px] font-bold">
                ✔ VIP Ativo
            </div>
        )}

        <div className="absolute bottom-2 left-2 right-2">
          <h3 className="font-bold text-white text-sm truncate">{model.name}</h3>
          <p className="text-[11px] text-privacy-text-secondary">@{model.username}</p>
          {formattedPrice && (
            <p className="mt-0.5 text-[11px] text-primary font-semibold">
              VIP a partir de {formattedPrice}
            </p>
          )}
        </div>
      </div>

      {/* CTA fixo embaixo do card */}
      <div className="p-2 border-t border-privacy-border flex flex-col gap-1">
        {isUnlocked && (
          <span className={`text-[11px] flex items-center gap-1 text-green-400`}>
            ✔ Acesso VIP liberado
          </span>
        )}
        <button
          onClick={() => navigate(`/modelo/${model.username}`)}
          className="w-full bg-primary text-privacy-black text-xs font-semibold py-1.5 rounded-lg hover:opacity-90"
        >
          {isUnlocked ? 'Acessar Perfil' : 'Ver perfil da modelo'}
        </button>
      </div>
    </div>
  );
};

export const Home: React.FC = () => {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const [models, setModels] = useState<ModelWithAccess[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoadingAuth || !user?.id) {
        if (!isLoadingAuth) setLoading(false);
        return;
    }
    
    const loadModels = async () => {
      setLoading(true);
      
      const [modelsRes, purchasesRes, productsRes] = await Promise.all([
        supabase.from('models').select('*'),
        fetchUserPurchases(user.id), // Passando userId
        supabase.from('products').select('id, model_id, is_base_membership, price_cents')
      ]);

      if (modelsRes.error) {
        console.error("Erro ao buscar modelos:", modelsRes.error);
        setLoading(false);
        return;
      }

      const products = productsRes.data || [];
      const purchasedModelIds = new Set(purchasesRes.map(p => p.products?.model_id).filter(Boolean));

      const modelsWithAccess = modelsRes.data.map(model => {
        // A lógica de acesso agora é unificada: se comprou qualquer produto da modelo, está desbloqueado.
        const isUnlocked = purchasedModelIds.has(model.id);
        
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
        // Prioriza modelos desbloqueadas (compra ou link)
        const aIsUnlockedByGrant = isModelUnlockedByGrant(a.id);
        const bIsUnlockedByGrant = isModelUnlockedByGrant(b.id);
        
        const aIsFullyUnlocked = a.isUnlocked || aIsUnlockedByGrant;
        const bIsFullyUnlocked = b.isUnlocked || bIsUnlockedByGrant;

        if (aIsFullyUnlocked && !bIsFullyUnlocked) return -1;
        if (!aIsFullyUnlocked && bIsFullyUnlocked) return 1;
        return 0;
      });

      setModels(modelsWithAccess);
      setLoading(false);
    };

    loadModels();
  }, [user?.id, isLoadingAuth]);

  if (isLoadingAuth || loading) {
    return <div className="min-h-screen bg-privacy-black flex items-center justify-center text-white">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-privacy-black text-white pb-24">
      <Header />
      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Início</h1>
          <p className="text-privacy-text-secondary mt-1">Explore os perfis das modelos.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {models.map(model => (
            <ModelCard key={model.id} model={model} />
          ))}
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
};