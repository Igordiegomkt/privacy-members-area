import React from 'react';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { useProtection } from '../hooks/useProtection';

interface Creator {
  id: string;
  name: string;
  username: string;
  avatar: string;
  thumbnail: string;
  isOnline?: boolean;
  rank: number;
}

const creators: Creator[] = [
  {
    id: 'denise',
    name: 'Denise Rocha',
    username: '@deniserocha',
    avatar: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?w=400&h=400&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&h=800&fit=crop',
    isOnline: true,
    rank: 1,
  },
  {
    id: 'levadaa',
    name: 'Levadaa',
    username: '@levadaa',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?w=600&h=800&fit=crop',
    rank: 2,
  },
  {
    id: 'naih',
    name: 'Naih',
    username: '@naihpriv',
    avatar: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=400&h=400&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1519183071298-a2962be90b8e?w=600&h=800&fit=crop',
    isOnline: true,
    rank: 3,
  },
  {
    id: 'karol',
    name: 'Karol',
    username: '@karolpvt',
    avatar: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?w=401&h=500&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&h=800&fit=crop',
    rank: 4,
  },
  {
    id: 'alice',
    name: 'Alice Moraes',
    username: '@alicevip',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&h=500&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=600&h=800&fit=crop',
    isOnline: true,
    rank: 5,
  },
  {
    id: 'bella',
    name: 'Bella Castro',
    username: '@bellacastro',
    avatar: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=500&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop',
    rank: 6,
  },
];

const CreatorCard: React.FC<{ creator: Creator }> = ({ creator }) => (
  <div className="relative rounded-xl overflow-hidden group cursor-pointer">
    <img
      src={creator.thumbnail}
      alt={creator.name}
      className="w-full h-full object-cover aspect-[9/12] transition-transform duration-300 group-hover:scale-105"
      loading="lazy"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
    
    <div className="absolute top-2 left-2 bg-black/50 rounded-full px-2 py-1 text-xs font-bold text-white">
      {creator.rank}º
    </div>

    <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
      <div className="flex items-center gap-2">
        <div className="relative">
          <img
            src={creator.avatar}
            alt={creator.name}
            className="w-8 h-8 rounded-full object-cover border-2 border-privacy-orange"
          />
          {creator.isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-privacy-online rounded-full border border-black" />
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold leading-tight">{creator.name}</h3>
          <p className="text-xs text-privacy-text-secondary leading-tight">{creator.username}</p>
        </div>
      </div>
    </div>
  </div>
);

export const Trending: React.FC = () => {
  useProtection();

  return (
    <div className="min-h-screen bg-privacy-black text-white pb-24">
      <Header />

      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Top Criadores</h1>
          <p className="text-sm text-privacy-text-secondary">Os perfis mais populares da plataforma</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {creators.map((creator) => (
            <CreatorCard key={creator.id} creator={creator} />
          ))}
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};