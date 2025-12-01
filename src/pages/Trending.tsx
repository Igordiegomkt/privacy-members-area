import React, { useEffect } from 'react';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { useProtection } from '../hooks/useProtection';

interface Creator {
  id: string;
  name: string;
  username: string;
  avatar: string;
  thumbnail: string;
  price: string;
  contentCount: number;
  isOnline?: boolean;
  badge?: string;
}

const creators: Creator[] = [
  {
    id: 'denise',
    name: 'Denise Rocha',
    username: '@deniserocha',
    avatar: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?w=400&h=400&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&h=800&fit=crop',
    price: 'R$ 29,90',
    contentCount: 150,
    isOnline: true,
    badge: '🔥',
  },
  {
    id: 'levadaa',
    name: 'Levadaa',
    username: '@levadaa',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?w=600&h=800&fit=crop',
    price: 'R$ 24,90',
    contentCount: 98,
    badge: 'VIP',
  },
  {
    id: 'naih',
    name: 'Naih',
    username: '@naihpriv',
    avatar: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=400&h=400&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1519183071298-a2962be90b8e?w=600&h=800&fit=crop',
    price: 'R$ 19,90',
    contentCount: 76,
    isOnline: true,
  },
  {
    id: 'karol',
    name: 'Karol',
    username: '@karolpvt',
    avatar: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?w=401&h=500&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&h=800&fit=crop',
    price: 'R$ 34,90',
    contentCount: 203,
    badge: 'Novo',
  },
  {
    id: 'alice',
    name: 'Alice Moraes',
    username: '@alicevip',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&h=500&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=600&h=800&fit=crop',
    price: 'R$ 27,90',
    contentCount: 134,
    isOnline: true,
  },
  {
    id: 'bella',
    name: 'Bella Castro',
    username: '@bellacastro',
    avatar: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=500&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop',
    price: 'R$ 22,90',
    contentCount: 89,
    badge: 'Live',
  },
];

const CreatorCard: React.FC<{ creator: Creator }> = ({ creator }) => (
  <div className="relative rounded-2xl bg-dark-lighter/50 overflow-hidden">
    <div className="relative">
      <img
        src={creator.thumbnail}
        alt={creator.name}
        className="w-full h-64 object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      
      {creator.isOnline && (
        <span className="absolute top-3 left-3 h-3 w-3 rounded-full bg-green-400 shadow-lg border-2 border-dark" />
      )}
      
      {creator.badge && (
        <span className="absolute top-3 right-3 rounded-full bg-primary px-2 py-1 text-xs font-semibold text-white">
          {creator.badge}
        </span>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="text-lg font-bold text-white">{creator.name}</h3>
        <p className="text-sm text-gray-300">{creator.username}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-gray-400">{creator.contentCount} conteúdos</span>
          <span className="text-lg font-bold text-primary">{creator.price}</span>
        </div>
      </div>
    </div>

    <div className="p-4">
      <button className="w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-dark hover:bg-primary-dark transition">
        Ver conteúdos
      </button>
    </div>
  </div>
);

export const Trending: React.FC = () => {
  useProtection();

  useEffect(() => {
    // A chamada de registro foi removida daqui
  }, []);

  return (
    <div className="min-h-screen bg-dark text-white pb-24">
      <Header />

      <main className="mx-auto w-full max-w-md px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Em alta</h1>
          <p className="text-sm text-gray-400">Descubra criadoras e conteúdos exclusivos</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {creators.map((creator) => (
            <CreatorCard key={creator.id} creator={creator} />
          ))}
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};