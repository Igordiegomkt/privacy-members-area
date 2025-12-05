import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Product } from '../types';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { fetchProductById, hasUserPurchased, createCheckoutSession, PixCheckoutData } from '../lib/marketplace';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { supabase } from '../lib/supabase';
import { ArrowLeft } from 'lucide-react';

const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const PixModal: React.FC<{ pixData: PixCheckoutData | null }> = ({ pixData }) => {
  const [copied, setCopied] = useState(false);

  if (!pixData) {
    return <div className="text-center p-8 text-privacy-text-secondary">Gerando Pix...</div>;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixData.qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Erro ao copiar código Pix:", err);
      alert("Não foi possível copiar o código.");
    }
  };

  return (
    <div className="space-y-4 text-white">
      <p className="text-sm text-privacy-text-secondary">
        Escaneie o QRCode abaixo no app do seu banco ou use o código Pix copia e cola.
      </p>
      <div className="flex justify-center p-2 bg-white rounded-lg">
        <img
          src={`data:image/png;base64,${pixData.qrCodeBase64}`}
          alt="QR Code Pix"
          className="w-48 h-48"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-privacy-text-secondary">Código Pix (copia e cola)</label>
        <div className="flex items-center gap-2">
          <textarea
            readOnly
            value={pixData.qrCode}
            className="flex-1 text-xs bg-privacy-black border border-privacy-border rounded-md p-2 text-privacy-text-secondary resize-none h-24"
          />
          <button
            onClick={handleCopy}
            className="px-3 py-2 text-xs bg-primary text-privacy-black font-semibold rounded-md hover:opacity-90 transition-opacity"
          >
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>
      <p className="text-xs text-privacy-text-secondary text-center pt-2">
        Após o pagamento, seu acesso será liberado automaticamente. Você pode fechar esta janela.
      </p>
    </div>
  );
};

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPurchased, setIsPurchased] = useState(false);
  
  const [pixData, setPixData] = useState<PixCheckoutData | null>(null);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [isAwaitingPurchase, setIsAwaitingPurchase] = useState(false);
  const pollingRef = useRef<number | null>(null);

  const checkPurchaseStatus = async () => {
    if (!id) return;
    const purchased = await hasUserPurchased(id);
    if (purchased) {
      setIsPurchased(true);
    }
  };

  useEffect(() => {
    if (isAwaitingPurchase && !isPurchased) {
      pollingRef.current = setInterval(checkPurchaseStatus, 5000); // Poll every 5 seconds
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [isAwaitingPurchase, isPurchased, id]);

  useEffect(() => {
    if (isPurchased && isAwaitingPurchase) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      setIsAwaitingPurchase(false);
      setIsPixModalOpen(false);
      navigate(`/minhas-compras?highlight=${id}`);
    }
  }, [isPurchased, isAwaitingPurchase, id, navigate]);

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
          await checkPurchaseStatus();
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

      const pixCheckoutData = await createCheckoutSession(id);
      setPixData(pixCheckoutData);
      setIsPixModalOpen(true);
      setIsAwaitingPurchase(true);
    } catch (err: any) {
      setPurchaseError(err.message ?? 'Não foi possível iniciar a compra. Tente novamente.');
    } finally {
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
    <>
      <div className="min-h-screen bg-privacy-black text-white pb-24">
        <Header />
        <main className="mx-auto w-full max-w-2xl px-4 py-6 relative">
          <button onClick={() => navigate(-1)} className="absolute top-5 left-4 z-10 text-white bg-black/30 rounded-full p-2 hover:bg-black/50 md:hidden">
              <ArrowLeft size={20} />
          </button>
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
                    {purchaseLoading ? 'Gerando Pix...' : 'Desbloquear com Pix'}
                  </button>
                )}
                {purchaseError && <p className="text-red-400 text-sm mt-2 text-center">{purchaseError}</p>}
              </div>
            </div>
          </div>
        </main>
        <BottomNavigation />
      </div>

      <Dialog open={isPixModalOpen} onOpenChange={setIsPixModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pague com Pix para liberar seu acesso</DialogTitle>
          </DialogHeader>
          <PixModal pixData={pixData} />
        </DialogContent>
      </Dialog>
    </>
  );
};