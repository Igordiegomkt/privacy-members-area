import * as React from 'react';
import { useEffect, useState } from 'react';
import { Product, Model } from '../types';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { useProtection } from '../hooks/useProtection';
import { fetchProducts, UserPurchaseWithProduct, fetchUserPurchases, hasUserPurchasedProduct, getProductImageSrc } from '../lib/marketplace';
import { supabase } from '../lib/supabase';
import { useCheckout } from '../contexts/CheckoutContext';
import { useNavigate } from 'react-router-dom';
import { trackAddToCart } from '../lib/tracking'; // Importando tracking
import { useAuth } from '../contexts/AuthContext'; // Importando useAuth

const formatPrice = (cents: number) => {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

interface ProductCardProps {
  product: Product;
  isPurchased: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, isPurchased }: ProductCardProps) => {
  const { openCheckoutForProduct } = useCheckout();
  const navigate = useNavigate();

  const handleCtaClick = () => {
    if (isPurchased) {
      navigate(`/produto/${product.id}`);
    } else {
      // ADDTOCART
      trackAddToCart({
        content_ids: [product.id],
        value: product.price_cents / 100,
        currency: 'BRL',
        model_id: product.model_id
      });
      openCheckoutForProduct(product.id);
    }
  };
  
  // Usando o helper. Como não temos o objeto model aqui, o fallback será o padrão.
  const imageSrc = getProductImageSrc(product, null); 

  return (
    <div className="bg-privacy-surface rounded-lg overflow-hidden group flex flex-col">
      <div className="relative aspect-square">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-privacy-border flex items-center justify-center">
            <span className="text-xs text-privacy-text-secondary">Sem prévia</span>
          </div>
        )}
        <div className="absolute top-2 left-2 bg-black/50 rounded-full px-2 py-1 text-[10px] font-semibold text-white capitalize">
          {product.type === 'pack' && 'Pack'}
          {product.type === 'single_media' && 'Conteúdo'}
          {product.type === 'subscription' && 'Assinatura'}
        </div>
        {isPurchased && (
          <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full px-2 py-1 text-[10px] font-bold">
            ✔ Comprado
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <h3 className="font-semibold text-privacy-text-primary text-sm line-clamp-2">
          {product.name}
        </h3>
        <p className="text-sm font-bold text-primary">
          {formatPrice(product.price_cents)}
        </p>
        <button
          onClick={handleCtaClick}
          className={`mt-auto w-full text-xs font-semibold py-1.5 rounded-lg transition-opacity ${
            isPurchased
              ? 'bg-privacy-border text-privacy-text-primary hover:bg-privacy-border/70'
              : 'bg-primary text-privacy-black hover:opacity-90'
          }`}
        >
          {isPurchased ? 'Ver Detalhes' : 'Comprar agora via PIX'}
        </button>
      </div>
    </div>
  );
};

interface ModelVipCardProps {
  product: Product & { models: Model | null };
  isPurchased: boolean;
}

const ModelVipCard: React.FC<ModelVipCardProps> = ({ product, isPurchased }: ModelVipCardProps) => {
  const { openCheckoutForProduct } = useCheckout();
  const navigate = useNavigate();
  const model = product.models;

  if (!model) return null;

  const handleCtaClick = () => {
    if (isPurchased) {
      navigate(`/modelo/${model.username}`);
    } else {
      // ADDTOCART
      trackAddToCart({
        content_ids: [product.id],
        value: product.price_cents / 100,
        currency: 'BRL',
        model_id: product.model_id
      });
      openCheckoutForProduct(product.id);
    }
  };
  
  // Usando a função helper para garantir a fonte de verdade
  const imageSrc = getProductImageSrc(product, model);

  return (
    <div className="bg-privacy-surface rounded-lg overflow-hidden group flex flex-col">
      <div className="relative aspect-square">
        <img src={imageSrc} alt={model.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        {isPurchased && (
          <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full px-2 py-1 text-[10px] font-bold">
            ✔ VIP Ativo
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <h3 className="font-semibold text-sm text-privacy-text-primary truncate">
          {model.name}
        </h3>
        <p className="text-xs text-privacy-text-secondary truncate">
          @{model.username}
        </p>
        <p className="text-sm font-bold text-primary">
          {formatPrice(product.price_cents)}
        </p>
        <button
          onClick={handleCtaClick}
          className={`mt-auto w-full text-xs font-semibold py-1.5 rounded-lg transition-opacity ${
            isPurchased
              ? 'bg-privacy-border text-privacy-text-primary hover:bg-privacy-border/70'
              : 'bg-primary text-privacy-black hover:opacity-90'
          }`}
        >
          {isPurchased ? 'Acessar Perfil VIP' : 'Desbloquear VIP via PIX'}
        </button>
      </div>
    </div>
  );
};

export const Marketplace: React.FC = () => {
  useProtection();
  const { user, isLoading: isLoadingAuth } = useAuth();
  const [otherProducts, setOtherProducts] = useState<Product[]>([]);
  const [baseProducts, setBaseProducts] = useState<(Product & { models: Model | null })[]>([]);
  const [purchases, setPurchases] = useState<UserPurchaseWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoadingAuth || !user?.id) {
        if (!isLoadingAuth) setLoading(false);
        return;
    }
    
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [allProducts, baseProductsRes, paidPurchases] = await Promise.all([
          fetchProducts(),
          supabase
            .from('products')
            .select('id, name, price_cents, model_id, is_base_membership, cover_thumbnail, models ( id, name, username, avatar_url, cover_url )') // Adicionado cover_url da modelo
            .eq('status', 'active')
            .eq('is_base_membership', true),
          fetchUserPurchases(user.id), // Corrigido: Passando userId
        ]);

        if (baseProductsRes.error) throw baseProductsRes.error;

        setPurchases(paidPurchases);
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
  }, [user?.id, isLoadingAuth]);

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
                    <ModelVipCard 
                      key={p.id} 
                      product={p} 
                      isPurchased={hasUserPurchasedProduct(purchases, p.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {otherProducts.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-white mb-4">Packs e conteúdos exclusivos</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {otherProducts.map((product) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      isPurchased={hasUserPurchasedProduct(purchases, product.id)}
                    />
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