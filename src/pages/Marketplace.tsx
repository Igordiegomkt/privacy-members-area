import React from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../types';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { useProtection } from '../hooks/useProtection';

const mockProducts: Product[] = [
  {
    id: 'prod_1',
    name: 'Pack "Essencial"',
    description: 'Uma coleção com 20 fotos e 5 vídeos exclusivos. O melhor começo para conhecer meu conteúdo.',
    price_cents: 2990,
    type: 'pack',
    cover_thumbnail: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&h=500&fit=crop',
    status: 'active',
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod_2',
    name: 'Vídeo "Banho de Espuma"',
    description: 'Um vídeo de 10 minutos com uma performance sensual e provocante. Conteúdo explícito.',
    price_cents: 1490,
    type: 'single_media',
    cover_thumbnail: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=500&h=500&fit=crop',
    status: 'active',
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod_3',
    name: 'Assinatura VIP Mensal',
    description: 'Acesso total a todo o meu conteúdo, incluindo postagens diárias, vídeos semanais e chat exclusivo.',
    price_cents: 4990,
    type: 'subscription',
    cover_thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=500&fit=crop',
    status: 'active',
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod_4',
    name: 'Pack "Verão Quente"',
    description: '30 fotos na praia e 10 vídeos exclusivos gravados durante o verão. O calor vai subir!',
    price_cents: 3990,
    type: 'pack',
    cover_thumbnail: 'https://images.unsplash.com/photo-1519183071298-a2962be90b8e?w=500&h=500&fit=crop',
    status: 'active',
    created_at: new Date().toISOString(),
  },
];

const formatPrice = (cents: number) => {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

const ProductCard: React.FC<{ product: Product }> = ({ product }) => (
  <Link to={`/produto/${product.id}`} className="bg-privacy-surface rounded-lg overflow-hidden group">
    <div className="relative aspect-square">
      {product.cover_thumbnail ? (
        <img src={product.cover_thumbnail} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
      ) : (
        <div className="w-full h-full bg-privacy-border flex items-center justify-center">
          <span className="text-xs text-privacy-text-secondary">Sem prévia</span>
        </div>
      )}
      <div className="absolute top-2 left-2 bg-black/50 rounded-full px-2 py-1 text-xs font-semibold text-white capitalize">
        {product.type === 'pack' && 'Pack'}
        {product.type === 'single_media' && 'Conteúdo'}
        {product.type === 'subscription' && 'Assinatura'}
      </div>
    </div>
    <div className="p-4">
      <h3 className="font-semibold text-privacy-text-primary truncate">{product.name}</h3>
      <p className="text-lg font-bold text-primary mt-1">{formatPrice(product.price_cents)}</p>
    </div>
  </Link>
);

export const Marketplace: React.FC = () => {
  useProtection();

  return (
    <div className="min-h-screen bg-privacy-black text-white pb-24">
      <Header />
      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Loja de Conteúdos</h1>
          <p className="text-sm text-privacy-text-secondary">Packs exclusivos, conteúdos avulsos e assinaturas VIP.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {mockProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
};