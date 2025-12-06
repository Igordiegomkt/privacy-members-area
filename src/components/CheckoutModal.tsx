import React from 'react';
import { useCheckout } from '../contexts/CheckoutContext';
import { X, Clipboard, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const formatPrice = (cents?: number) =>
  cents != null
    ? (cents / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })
    : '';

export const CheckoutModal: React.FC = () => {
  const { state, closeCheckout } = useCheckout();
  const navigate = useNavigate();
  const { isOpen, loading, pixCopiaCola, pixQrCodeUrl, amountCents, productName, modelName, error } = state;

  const handleCopy = () => {
    if (!pixCopiaCola) return;
    navigator.clipboard.writeText(pixCopiaCola).catch(() => {});
  };

  const handleGoToPurchases = () => {
    closeCheckout();
    navigate('/minhas-compras');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md bg-privacy-surface rounded-2xl p-5 relative shadow-xl border border-privacy-border">
        <button
          onClick={closeCheckout}
          className="absolute top-3 right-3 text-privacy-text-secondary hover:text-white"
        >
          <X size={18} />
        </button>

        <h2 className="text-xl font-bold text-white mb-1">Pagamento via PIX</h2>
        <p className="text-xs text-privacy-text-secondary mb-4">
          Escaneie o QR Code ou use o código copia e cola para concluir o pagamento.
        </p>

        {loading && (
          <div className="py-10 text-center text-privacy-text-secondary">
            Gerando cobrança PIX...
          </div>
        )}

        {!loading && error && (
          <div className="py-6">
            <p className="text-sm text-red-400 mb-3">{error}</p>
            <button
              onClick={closeCheckout}
              className="w-full mt-2 bg-privacy-border text-white font-semibold py-2 rounded-lg"
            >
              Fechar
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="mb-4">
              {productName && (
                <p className="text-sm text-privacy-text-primary">
                  Produto:{' '}
                  <span className="font-semibold text-white">
                    {productName}
                  </span>
                </p>
              )}
              {modelName && (
                <p className="text-xs text-privacy-text-secondary">
                  Modelo: {modelName}
                </p>
              )}
              {amountCents != null && (
                <p className="text-sm text-primary font-semibold mt-1">
                  Valor: {formatPrice(amountCents)}
                </p>
              )}
            </div>

            <div className="flex flex-col items-center gap-3 mb-4">
              {pixQrCodeUrl && (
                <div className="bg-white p-3 rounded-lg">
                  <img
                    src={pixQrCodeUrl}
                    alt="QR Code PIX"
                    className="w-48 h-48 object-contain"
                  />
                </div>
              )}
              {pixCopiaCola && (
                <div className="w-full">
                  <label className="text-xs text-privacy-text-secondary mb-1 block">
                    Código PIX (copia e cola)
                  </label>
                  <div className="flex items-center gap-2">
                    <textarea
                      className="flex-1 bg-black/40 border border-privacy-border rounded-lg text-xs text-privacy-text-primary p-2 resize-none h-16"
                      value={pixCopiaCola}
                      readOnly
                    />
                    <button
                      onClick={handleCopy}
                      className="flex-shrink-0 bg-primary text-privacy-black text-xs font-semibold px-3 py-2 rounded-lg hover:opacity-90"
                    >
                      <Clipboard size={14} className="inline mr-1" />
                      Copiar
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <button
                onClick={handleGoToPurchases}
                className="w-full bg-green-500 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-green-500/90"
              >
                <CheckCircle2 size={16} />
                Já paguei, ir para Minhas Compras
              </button>
              <button
                onClick={closeCheckout}
                className="w-full bg-privacy-border text-white font-semibold py-2 rounded-lg"
              >
                Fechar
              </button>
            </div>

            <p className="text-[10px] text-privacy-text-secondary mt-3 text-center">
              Assim que o pagamento for confirmado, seu acesso aparecerá em&nbsp;
              <span className="text-primary font-semibold">Minhas Compras</span>.
            </p>
          </>
        )}
      </div>
    </div>
  );
};