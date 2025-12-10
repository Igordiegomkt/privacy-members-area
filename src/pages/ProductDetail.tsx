import * as React from 'react';
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Product, Model } from '../types';
import { fetchProductById, fetchUserPurchases, hasUserPurchasedProduct } from '../lib/marketplace';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { supabase } from '../lib/supabase';
import { ArrowLeft } from 'lucide-react';
import { usePurchases } from '../contexts/PurchaseContext';
import { useCheckout } from '../contexts/CheckoutContext';

const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Helper function para padronizar a fonte da imagem do produto
const getProductImageSrc = (product: Product, model?: Model | null): string => {
  return (
    product.cover_thumbnail ??
    model?.cover_url ??
    '/video-fallback.svg' // Usando o fallback genérico existente
  );
};

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { openCheckoutForProduct } = useCheckout();
  const [product, setProduct] = useState<Product | null>(null);
  const [model, setModel] = useState<Model | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Usando usePurchases para reatividade em tempo real
  const { purchases, isLoading: isLoadingPurchases } = usePurchases();
  const isPurchased = id ? hasUserPurchasedProduct(purchases, id) : false;
  
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('ID do produto não fornecido.');
      return;
    }

    const loadProductData = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedProduct = await fetchProductById(id);
        setProduct(fetchedProduct);

        if (fetchedProduct?.model_id) {
            const { data: fetchedModel } = await supabase
                .from('models')
                .select('*')
                .eq('id', fetchedProduct.model_id)
                .single();
            setModel(fetchedModel);
        }
      } catch (e) {
        setError('Não foi possível carregar o produto.');
      } finally {
        setLoading(false);
      }
    };

    loadProductData();
  }, [id]);

  const handlePurchase = async () => {
    if (!product || !id) return;
    setPurchaseError(null);
    setPurchaseLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão inválida. Por favor, faça login novamente.");

      // Chama o modal centralizado do CheckoutContext
      openCheckoutForProduct(id);
      
    } catch (err: any) {
      setPurchaseError(err.message ?? 'Não foi possível iniciar a compra. Tente novamente.');
    } finally {
      // O loading é gerenciado pelo CheckoutContext, mas mantemos o local para o botão
      setPurchaseLoading(false); 
    }
  };

  if (loading || isLoadingPurchases) {
    return (
      <div className="min-h-screen bg-privacy-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-privacy-black text-white flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-2xl font-bold mb-2">{error ? 'Ocorreu um erro' : 'Produto não encontrado'}</h1>
          <p className="text-privacy-text-secondary mb-4">
            {error || 'O item que você está procurando não existe ou foi removido.'}
          </p>
          <Link to="/loja" className="bg-primary text-privacy-black font-semibold py-2 px-6 rounded-lg">
            Voltar para a Loja
          </Link>
        </main>
        <BottomNavigation />
      </div>
    );
  }
  
  const productImageSrc = getProductImageSrc(product, product.is_base_membership ? model : null);

  return (
    <div className="min-h-screen bg-privacy-black text-white pb-24">
      <Header />
      <main className="mx-auto w-full max-w-2xl px-4 py-6 relative">
        <button onClick={() => navigate(-1)} className="absolute top-5 left-4 z-10 text-white bg-black/30 rounded-full p-2 hover:bg-black/50 md:hidden">
            <ArrowLeft size={20} />
        </button>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <img src={productImageSrc} alt={product.name} className="w-full aspect-square object-cover rounded-lg" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-primary font-semibold capitalize">
              {product.type === 'pack' && 'Pack de Mídias'}
              {product.type === 'single_media' && 'Conteúdo Avulso'}
              {product.type === 'subscription' && 'Assinatura'}
            </span>
            <h1 className="text-3xl font-bold text-white mt-2">{product.name}</h1>
            <p className="text-privacy-text-secondary mt-4 flex-1">{product.description}</p>
            <div className="mt-6">
              <p className="text-3xl font-bold text-primary">{formatPrice(product.price_cents)}</p>
              
              {isPurchased ? (
                <>
                  <div className="w-full mt-4 bg-green-500/20 text-green-400 font-semibold py-3 rounded-lg text-center">
                    ✅ Conteúdo desbloqueado!
                  </div>
                  {product.is_base_membership && model?.username && (
                    <button 
                      onClick={() => navigate(`/modelo/${model.username}`)}
                      className="w-full mt-2 bg-primary hover:opacity-90 text-privacy-black font-semibold py-3 rounded-lg transition-opacity"
                    >
                      Ir para o Perfil VIP
                    </button>
                  )}
                </>
              ) : (
                <button 
                  onClick={handlePurchase}
                  disabled={purchaseLoading}
                  className="w-full mt-4 bg-primary hover:opacity-90 text-privacy-black font-semibold py-3 rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-wait"
                >
                  {purchaseLoading ? 'Gerando Pix...' : 'Desbloquear com Pix'}
                </button>
              )}
              {purchaseError && <p className="text-red-400 text-sm mt-2 text-center">{purchaseError}</p>}
            </div>
          </div>
        </div>
        
        {/* TODO: Adicionar a listagem de mídias do pack aqui se isPurchased for true */}
        {isPurchased && (
            <div className="mt-10">
                <h2 className="text-xl font-bold mb-4">Conteúdo do Pack</h2>
                <p className="text-privacy-text-secondary">A listagem das mídias deste pack será exibida aqui.</p>
            </div>
        )}
      </main>
      <BottomNavigation />
    </div>
  );
};