import React from 'react';
import { UserPurchase, Product } from '../types';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { useProtection } from '../hooks/useProtection';

const mockProducts: { [key: string]: Product } = {
  'prod_1': { id: 'prod_1', name: 'Pack "Essencial"', price_cents: 2990, type: 'pack', cover_thumbnail: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop', status: 'active', created_at: '' },
  'prod_2': { id: 'prod_2', name: 'Vídeo "Banho de Espuma"', price_cents: 1490, type: 'single_media', cover_thumbnail: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=200&h=200&fit=crop', status: 'active', created_at: '' },
};

const mockPurchases: UserPurchase[] = [
  { id: 'purch_1', user_id: 'user_123', product_id: 'prod_1', price_paid_cents: 2990, status: 'paid', created_at: '2023-10-26T10:00:00Z' },
  { id: 'purch_2', user_id: 'user_123', product_id: 'prod_2', price_paid_cents: 1490, status: 'paid', created_at: '2023-10-25T15:30:00Z' },
];

// const mockPurchases: UserPurchase[] = []; // Descomente para testar o estado vazio

const PurchaseItem: React.FC<{ purchase: UserPurchase }> = ({ purchase }) => {
  const product = mockProducts[purchase.product_id];
  if (!product) return null;

  return (
    <div className="flex items-center gap-4 bg-privacy-surface p-4 rounded-lg">
      <img src={product.cover_thumbnail} alt={product.name} className="w-16 h-16 object-cover rounded-md flex-shrink-0" />
      <div className="flex-1">
        <h3 className="font-semibold text-privacy-text-primary">{product.name}</h3>
        <p className="text-sm text-privacy-text-secondary">
          Comprado em: {new Date(purchase.created_at).toLocaleDateString('pt-BR')}
        </p>
      </div>
      <span className="text-sm font-semibold text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
        Desbloqueado
      </span>
    </div>
  );
};

export const MyPurchases: React.FC = () => {
  useProtection();

  return (
    <div className="min-h-screen bg-privacy-black text-white pb-24">
      <Header />
      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Minhas Compras</h1>
          <p className="text-sm text-privacy-text-secondary">Todo o conteúdo que você já desbloqueou.</p>
        </div>
        
        {mockPurchases.length > 0 ? (
          <div className="space-y-4">
            {mockPurchases.map(purchase => (
              <PurchaseItem key={purchase.id} purchase={purchase} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-privacy-surface rounded-lg">
            <h2 className="text-lg font-semibold text-privacy-text-primary">Nada por aqui ainda</h2>
            <p className="text-sm text-privacy-text-secondary mt-2">Você ainda não comprou nenhum conteúdo.</p>
          </div>
        )}
      </main>
      <BottomNavigation />
    </div>
  );
};