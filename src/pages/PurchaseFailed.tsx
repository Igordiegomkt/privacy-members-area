import * as React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const PurchaseFailed: React.FC = () => {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('product_id');

  return (
    <div className="min-h-screen bg-privacy-black text-white flex items-center justify-center text-center px-4">
      <div>
        <h1 className="text-3xl font-bold text-red-500 mb-4">Pagamento não concluído</h1>
        <p className="text-lg text-privacy-text-secondary mb-8">
          Ocorreu um problema ou o pagamento foi cancelado. Nenhuma cobrança foi feita.
        </p>
        <div className="space-y-4">
          {productId ? (
            <Link 
              to={`/produto/${productId}`} 
              className="w-full max-w-xs inline-block bg-primary hover:opacity-90 text-privacy-black font-semibold py-3 rounded-lg transition-opacity"
            >
              Tentar novamente
            </Link>
          ) : (
            <Link 
              to="/loja" 
              className="w-full max-w-xs inline-block bg-primary hover:opacity-90 text-privacy-black font-semibold py-3 rounded-lg transition-opacity"
            >
              Voltar para a Loja
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseFailed;