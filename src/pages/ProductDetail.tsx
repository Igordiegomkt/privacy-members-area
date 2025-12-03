import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Product } from '../types';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { fetchProductById, hasUserPurchased, createCheckoutSession } from '../lib/marketplace';

const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPurchased, setIsPurchased] = useState(false);
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

        if (fetchedProduct) {
          const purchased = await hasUserPurchased(id);
          setIsPurchased(purchased);
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
      const checkoutUrl = await createCheckoutSession(id);
      window.location.href = checkoutUrl;
    } catch (err: any) {
      console.error(err);
      setPurchaseError(err.message ?? 'Não foi possível iniciar a compra. Tente novamente.');
      setPurchaseLoading(false);
    }
  };

  if (loading) {
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

  return (
    <div className="min-h-screen bg-privacy-black text-white pb-24">
      <Header />
      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <img src={product.cover_thumbnail} alt={product.name} className="w-full aspect-square object-cover rounded-lg" />
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
                product.is_base_membership ? (
                  <button 
                    onClick={() => navigate('/modelo/carolina-andrade')}
                    className="w-full mt-4 bg-primary hover:opacity-90 text-privacy-black font-semibold py-3 rounded-lg transition-opacity"
                  >
                    Entrar no VIP
                  </button>
                ) : (
                  <button disabled className="w-full mt-4 bg-green-500/20 text-green-400 font-semibold py-3 rounded-lg cursor-not-allowed">
                    Já comprado
                  </button>
                )
              ) : (
                <button 
                  onClick={handlePurchase}
                  disabled={purchaseLoading}
                  className="w-full mt-4 bg-primary hover:opacity-90 text-privacy-black font-semibold py-3 rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-wait"
                >
                  {purchaseLoading ? 'Processando...' : 'Desbloquear Acesso'}
                </button>
              )}
              {purchaseError && <p className="text-red-400 text-sm mt-2 text-center">{purchaseError}</p>}
            </div>
          </div>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
};