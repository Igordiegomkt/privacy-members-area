import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Product } from '../types';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';

// Mock data - em um cenário real, viria de um contexto ou API
const mockProducts: Product[] = [
    { id: 'prod_1', name: 'Pack "Essencial"', description: 'Uma coleção com 20 fotos e 5 vídeos exclusivos. O melhor começo para conhecer meu conteúdo.', price_cents: 2990, type: 'pack', cover_thumbnail: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&h=800&fit=crop', status: 'active', created_at: new Date().toISOString() },
    { id: 'prod_2', name: 'Vídeo "Banho de Espuma"', description: 'Um vídeo de 10 minutos com uma performance sensual e provocante. Conteúdo explícito.', price_cents: 1490, type: 'single_media', cover_thumbnail: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=800&h=800&fit=crop', status: 'active', created_at: new Date().toISOString() },
    { id: 'prod_3', name: 'Assinatura VIP Mensal', description: 'Acesso total a todo o meu conteúdo, incluindo postagens diárias, vídeos semanais e chat exclusivo.', price_cents: 4990, type: 'subscription', cover_thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=800&fit=crop', status: 'active', created_at: new Date().toISOString() },
    { id: 'prod_4', name: 'Pack "Verão Quente"', description: '30 fotos na praia e 10 vídeos exclusivos gravados durante o verão. O calor vai subir!', price_cents: 3990, type: 'pack', cover_thumbnail: 'https://images.unsplash.com/photo-1519183071298-a2962be90b8e?w=800&h=800&fit=crop', status: 'active', created_at: new Date().toISOString() },
];

const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const product = mockProducts.find(p => p.id === id);

  if (!product) {
    return (
      <div className="min-h-screen bg-privacy-black text-white flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-2xl font-bold mb-2">Produto não encontrado</h1>
          <p className="text-privacy-text-secondary mb-4">O item que você está procurando não existe ou foi removido.</p>
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
              <button 
                onClick={() => alert('TODO: Implementar fluxo de compra')}
                className="w-full mt-4 bg-primary hover:opacity-90 text-privacy-black font-semibold py-3 rounded-lg transition-opacity"
              >
                Desbloquear Acesso
              </button>
            </div>
          </div>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
};