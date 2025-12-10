import * as React from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { ProductWithModel } from '../types'; // Importando ProductWithModel
import { fetchProductById } from '../lib/marketplace';
import { supabase } from '../lib/supabase';

const PurchaseSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const productId = searchParams.get('product_id');
  const [product, setProduct] = useState<ProductWithModel | null>(null); // Usando ProductWithModel
  const [modelUsername, setModelUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      // fetchProductById já retorna ProductWithModel (com models.username)
      const fetchedProduct = await fetchProductById(productId);
      setProduct(fetchedProduct);

      if (fetchedProduct?.models?.username) {
        setModelUsername(fetchedProduct.models.username);
      } else if (fetchedProduct?.model_id) {
        // Fallback para buscar username se o JOIN falhar (embora o JOIN deva funcionar agora)
        const { data: model } = await supabase
          .from('models')
          .select('username')
          .eq('id', fetchedProduct.model_id)
          .single();
        if (model) {
          setModelUsername(model.username);
        }
      }
      setLoading(false);
    };

    loadData();
  }, [productId]);

  const handleGoToContent = () => {
    if (modelUsername) {
      navigate(`/modelo/${modelUsername}`);
    } else {
      navigate('/minhas-compras');
    }
  };

  return (
    <div className="min-h-screen bg-privacy-black text-white flex items-center justify-center text-center px-4">
      {loading ? (
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      ) : product ? (
        <div>
          <h1 className="text-3xl font-bold text-green-400 mb-4">Pagamento Aprovado!</h1>
          <p className="text-lg text-privacy-text-secondary mb-2">Seu acesso para o conteúdo</p>
          <p className="text-xl font-semibold text-white mb-8">"{product.name}"</p>
          <p className="text-lg text-privacy-text-secondary mb-8">foi liberado com sucesso.</p>
          <div className="space-y-4">
            <button
              onClick={handleGoToContent}
              className="w-full max-w-xs bg-primary hover:opacity-90 text-privacy-black font-semibold py-3 rounded-lg transition-opacity"
            >
              Ir para o conteúdo
            </button>
            <Link to="/minhas-compras" className="block text-sm text-privacy-text-secondary hover:text-white">
              Ver todas as minhas compras
            </Link>
          </div>
        </div>
      ) : (
        <div>
          <h1 className="text-3xl font-bold text-green-400 mb-4">Compra Realizada!</h1>
          <p className="text-lg text-privacy-text-secondary mb-8">Seu novo conteúdo já está disponível.</p>
          <Link to="/minhas-compras" className="w-full max-w-xs inline-block bg-primary hover:opacity-90 text-privacy-black font-semibold py-3 rounded-lg transition-opacity">
            Ver minhas compras
          </Link>
        </div>
      )}
    </div>
  );
};

export default PurchaseSuccess;