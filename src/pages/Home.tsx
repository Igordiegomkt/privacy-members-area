import React, { useEffect, useMemo, useState } from 'react';
import { Header } from '../components/Header';
import { useProtection } from '../hooks/useProtection';
import { registerAuthenticatedPageAccess } from '../lib/accessLogger';

interface CreatorHighlight {
  id: string;
  name: string;
  username: string;
  avatar: string;
  badge?: string;
  isOnline?: boolean;
  tag?: string;
}

interface DiscoveryCard {
  id: string;
  title: string;
  description: string;
  image: string;
  tag: string;
}

interface BottomNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  isActive?: boolean;
}

type FeedFilter = 'all' | 'photos' | 'videos' | 'paid';

interface FeedItem {
  id: string;
  creator: string;
  username: string;
  avatar: string;
  mediaUrl: string;
  type: 'photo' | 'video';
  likes: string;
  comments: string;
  timestamp: string;
  description: string;
  isPaid?: boolean;
}

const privacyWeekCreators: CreatorHighlight[] = [
  {
    id: 'denise',
    name: 'Denise Rocha',
    username: '@deniserocha',
    avatar: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?w=400&h=400&fit=crop',
    badge: '🔥',
    isOnline: true,
  },
  {
    id: 'levadaa',
    name: 'Levadaa',
    username: '@levadaa',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop',
    badge: 'VIP',
  },
  {
    id: 'naih',
    name: 'Naih',
    username: '@naihpriv',
    avatar: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=400&h=400&fit=crop',
  },
  {
    id: 'karol',
    name: 'Karol',
    username: '@karolpvt',
    avatar: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?w=401&h=500&fit=crop',
    badge: 'Novo',
  },
];

const topCreators: CreatorHighlight[] = [
  {
    id: 'alice',
    name: 'Alice Moraes',
    username: '@alicevip',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&h=500&fit=crop',
    tag: 'Top 1',
  },
  {
    id: 'bella',
    name: 'Bella Castro',
    username: '@bellacastro',
    avatar: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=500&fit=crop',
    tag: 'Live',
    isOnline: true,
  },
  {
    id: 'mia',
    name: 'Mia Fernandes',
    username: '@miafernandes',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=401&h=400&fit=crop',
  },
  {
    id: 'sofia',
    name: 'Sofia Dias',
    username: '@sofiadias',
    avatar: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?w=401&h=401&fit=crop',
    tag: 'Promo',
  },
];

const discoveryCards: DiscoveryCard[] = [
  {
    id: 'black-friday',
    title: 'Black Friday VIP',
    description: 'Planos com 50% OFF por tempo limitado',
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&h=400&fit=crop',
    tag: 'Promoção',
  },
  {
    id: 'new-creators',
    title: 'Novas criadoras',
    description: 'Perfis selecionados para você acompanhar',
    image: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?w=600&h=400&fit=crop',
    tag: 'Descubra',
  },
];

const bottomNavItems: BottomNavItem[] = [
  {
    id: 'mural',
    label: 'Mural',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 7l9-4 9 4-9 4-9-4zm0 0v10l9 4 9-4V7"
        />
      </svg>
    ),
  },
  {
    id: 'feed',
    label: 'Feed',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
      </svg>
    ),
  },
  {
    id: 'trending',
    label: 'Em alta',
    isActive: true,
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
  },
  {
    id: 'chat',
    label: 'Chat',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 8h10M7 12h6m5 8l-4-4H7a4 4 0 01-4-4V7a4 4 0 014-4h10a4 4 0 014 4v5"
        />
      </svg>
    ),
  },
  {
    id: 'menu',
    label: 'Menu',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v.01M12 12v.01M12 18v.01M12 6a1 1 0 110-2 1 1 0 010 2z" />
      </svg>
    ),
  },
];

const feedItems: FeedItem[] = [
  {
    id: 'feed-1',
    creator: 'Denise Rocha',
    username: '@deniserocha',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop',
    mediaUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&h=1000&fit=crop',
    type: 'photo',
    likes: '42,1 mil',
    comments: '1.248',
    timestamp: 'há 2h',
    description: 'Esquenta pro Privacy Week 🔥',
  },
  {
    id: 'feed-2',
    creator: 'Levadaa',
    username: '@levadaa',
    avatar: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?w=200&h=200&fit=crop',
    mediaUrl: 'https://images.unsplash.com/photo-1519183071298-a2962be90b8e?w=800&h=1000&fit=crop',
    type: 'video',
    likes: '31,8 mil',
    comments: '980',
    timestamp: 'há 4h',
    description: 'Clipe exclusivo só pros assinantes 👀',
  },
  {
    id: 'feed-3',
    creator: 'Naih',
    username: '@naihpriv',
    avatar: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=200&h=200&fit=crop',
    mediaUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&h=1000&fit=crop',
    type: 'photo',
    likes: '18,5 mil',
    comments: '543',
    timestamp: 'há 6h',
    description: 'Mood de sexta 🧡',
  },
  {
    id: 'feed-4',
    creator: 'Conteúdo Premium',
    username: '@novidade',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop',
    mediaUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=1000&fit=crop',
    type: 'photo',
    likes: '★ Exclusivo',
    comments: '★ VIP',
    timestamp: 'Conteúdo novo',
    description: 'Desbloqueie pra ver tudo!',
    isPaid: true,
  },
];

const SectionHeader: React.FC<{ title: string; actionLabel?: string }> = ({ title, actionLabel = 'Ver tudo' }) => (
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-xl font-semibold text-white">{title}</h2>
    <button className="text-sm text-primary flex items-center gap-1">
      {actionLabel}
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>
);

const CreatorCard: React.FC<{ creator: CreatorHighlight }> = ({ creator }) => (
  <div className="min-w-[140px] rounded-3xl bg-dark-lighter/70 p-3 mr-4">
    <div className="relative overflow-hidden rounded-2xl">
      <img src={creator.avatar} alt={creator.name} className="h-40 w-full object-cover" loading="lazy" />
      {creator.isOnline && <span className="absolute top-3 left-3 h-2.5 w-2.5 rounded-full bg-green-400 shadow-lg"></span>}
      {creator.badge && (
        <span className="absolute top-3 right-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase text-dark">
          {creator.badge}
        </span>
      )}
    </div>
    <div className="mt-3 space-y-1">
      <p className="text-sm font-semibold text-white">{creator.name}</p>
      <p className="text-xs text-gray-400">{creator.username}</p>
      {creator.tag && <span className="text-[11px] text-primary uppercase font-semibold">{creator.tag}</span>}
    </div>
  </div>
);

const DiscoveryCardComponent: React.FC<{ card: DiscoveryCard }> = ({ card }) => (
  <div className="flex items-center gap-3 rounded-3xl bg-dark-lighter/60 p-3">
    <div className="relative h-16 w-16 overflow-hidden rounded-2xl">
      <img src={card.image} alt={card.title} className="h-full w-full object-cover" loading="lazy" />
      <span className="absolute inset-0 bg-gradient-to-tr from-primary/40 to-transparent" />
    </div>
    <div className="flex-1">
      <span className="text-[11px] uppercase tracking-wide text-primary">{card.tag}</span>
      <p className="text-sm font-semibold text-white">{card.title}</p>
      <p className="text-xs text-gray-400">{card.description}</p>
    </div>
    <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  </div>
);

const HeroBanner: React.FC = () => (
  <section className="relative overflow-hidden rounded-4xl rounded-[32px]">
    <img
      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&h=600&fit=crop"
      alt="Privacy Week"
      className="h-56 w-full object-cover"
      loading="lazy"
    />
    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/80 p-6 flex flex-col justify-end">
      <p className="text-sm uppercase tracking-widest text-white/80">aproveite a</p>
      <h2 className="text-3xl font-bold text-white leading-tight">privacy week</h2>
      <p className="text-sm text-gray-200 mb-4">Assinaturas com experiências exclusivas</p>
      <button className="self-start rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-dark transition hover:bg-white">
        Assinar agora
      </button>
    </div>
  </section>
);

const BottomNavigation: React.FC = () => (
  <nav className="fixed bottom-5 left-1/2 z-50 flex w-[90%] max-w-md -translate-x-1/2 items-center justify-between rounded-full bg-dark-lighter/80 px-6 py-3 backdrop-blur">
    {bottomNavItems.map((item) => (
      <button
        key={item.id}
        className={`flex flex-col items-center gap-1 text-xs ${
          item.isActive ? 'text-white' : 'text-gray-400'
        }`}
      >
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            item.isActive ? 'bg-primary text-white shadow-primary/40 shadow-lg' : ''
          }`}
        >
          {item.icon}
        </span>
        {item.label}
      </button>
    ))}
  </nav>
);

const FeedFilters: React.FC<{
  activeFilter: FeedFilter;
  onChange: (filter: FeedFilter) => void;
}> = ({ activeFilter, onChange }) => {
  const filters: { id: FeedFilter; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'photos', label: 'Fotos' },
    { id: 'videos', label: 'Vídeos' },
    { id: 'paid', label: 'Pagos' },
  ];

  return (
    <div className="flex gap-3 rounded-full bg-dark-lighter/50 p-1">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onChange(filter.id)}
          className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
            activeFilter === filter.id ? 'bg-white text-dark' : 'text-gray-300'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
};

const FeedCard: React.FC<{ item: FeedItem }> = ({ item }) => {
  const isVideo = item.type === 'video';

  return (
    <article className="rounded-3xl bg-dark-lighter/70 p-4 space-y-3">
      <header className="flex items-center gap-3">
        <img src={item.avatar} alt={item.creator} className="h-10 w-10 rounded-full object-cover" loading="lazy" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">{item.creator}</p>
          <p className="text-xs text-gray-400">{item.username}</p>
        </div>
        <span className="text-[11px] text-gray-500">{item.timestamp}</span>
      </header>

      <div className="relative overflow-hidden rounded-3xl">
        <img src={item.mediaUrl} alt={item.description} className={`w-full object-cover ${item.isPaid ? 'blur-xl' : 'h-96'} transition`} loading="lazy" />
        {isVideo && !item.isPaid && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        )}
        {item.isPaid && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11V7a4 4 0 00-8 0v4m15 0H5a1 1 0 00-1 1v7a1 1 0 001 1h14a1 1 0 001-1v-7a1 1 0 00-1-1z" />
              </svg>
            </span>
            <p className="text-sm font-semibold text-white">Conteúdo exclusivo</p>
            <p className="text-xs text-gray-300">Assine para desbloquear</p>
            <button className="rounded-full bg-primary px-4 py-1 text-sm font-semibold text-dark">Ver planos</button>
          </div>
        )}
      </div>

      <p className="text-sm text-white">{item.description}</p>

      {!item.isPaid && (
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{item.likes} curtidas</span>
          <span>{item.comments} comentários</span>
        </div>
      )}
    </article>
  );
};

export const Home: React.FC = () => {
  useProtection();
  const [activeFeedFilter, setActiveFeedFilter] = useState<FeedFilter>('all');

  useEffect(() => {
    registerAuthenticatedPageAccess('home').catch((error) => {
      console.error('Erro ao registrar acesso autenticado (home):', error);
    });
  }, []);

  const filteredFeed = useMemo(() => {
    switch (activeFeedFilter) {
      case 'photos':
        return feedItems.filter((item) => item.type === 'photo' && !item.isPaid);
      case 'videos':
        return feedItems.filter((item) => item.type === 'video' && !item.isPaid);
      case 'paid':
        return feedItems.filter((item) => item.isPaid);
      default:
        return feedItems;
    }
  }, [activeFeedFilter]);

  return (
    <div className="min-h-screen bg-dark text-white pb-28">
      <Header />

      <main className="mx-auto flex w-full max-w-md flex-col gap-10 px-4 py-6 sm:max-w-xl">
        <HeroBanner />

        <section>
          <SectionHeader title="Privacy Week" />
          <div className="flex overflow-x-auto pb-2">
            {privacyWeekCreators.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="Top creators" actionLabel="Ranking" />
          <div className="flex overflow-x-auto pb-2">
            {topCreators.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader title="Descubra mais" actionLabel="Explorar" />
          {discoveryCards.map((card) => (
            <DiscoveryCardComponent key={card.id} card={card} />
          ))}
        </section>

        <section className="space-y-4">
          <SectionHeader title="Feed da comunidade" actionLabel="Ver mais" />
          <FeedFilters activeFilter={activeFeedFilter} onChange={setActiveFeedFilter} />
          <div className="space-y-4">
            {filteredFeed.map((item) => (
              <FeedCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      </main>

      <BottomNavigation />
    </div>
  );
};
