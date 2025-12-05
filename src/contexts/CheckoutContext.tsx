import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { createCheckoutSession, PixCheckoutData, fetchProductById } from '../lib/marketplace';
import { Product } from '../types';
import { supabase } from '../lib/supabase';
import { usePurchases } from './PurchaseContext';
import { useNavigate } from 'react-router-dom';

interface CheckoutContextType {
  openCheckoutModal: (productId: string) => void;
}

const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined);

const PixModalContent: React.FC<{ pixData: PixCheckoutData | null }> = ({ pixData }) => {
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

export const CheckoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [pixData, setPixData] = useState<PixCheckoutData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { hasPurchase } = usePurchases();
  const navigate = useNavigate();

  const openCheckoutModal = useCallback(async (productId: string) => {
    setIsOpen(true);
    setError(null);
    setPixData(null);
    setProduct(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão inválida. Por favor, faça login novamente.");

      const fetchedProduct = await fetchProductById(productId);
      if (!fetchedProduct) throw new Error("Produto não encontrado.");
      setProduct(fetchedProduct);

      const pixCheckoutData = await createCheckoutSession(productId);
      setPixData(pixCheckoutData);
    } catch (err: any) {
      setError(err.message ?? 'Não foi possível iniciar a compra.');
    }
  }, []);

  useEffect(() => {
    if (product && hasPurchase(product.id)) {
      setIsOpen(false);
      navigate(`/minhas-compras?highlight=${product.id}`);
    }
  }, [hasPurchase, product, navigate]);

  return (
    <CheckoutContext.Provider value={{ openCheckoutModal }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {product ? `Desbloquear: ${product.name}` : 'Pague com Pix'}
            </DialogTitle>
          </DialogHeader>
          {error ? (
            <p className="text-red-400 text-center p-4">{error}</p>
          ) : (
            <PixModalContent pixData={pixData} />
          )}
        </DialogContent>
      </Dialog>
    </CheckoutContext.Provider>
  );
};

export const useCheckout = () => {
  const context = useContext(CheckoutContext);
  if (context === undefined) {
    throw new Error('useCheckout must be used within a CheckoutProvider');
  }
  return context;
};