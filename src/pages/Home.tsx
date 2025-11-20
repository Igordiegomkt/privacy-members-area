import React, { useEffect, useMemo, useState } from 'react';
import { Header } from '../components/Header';
import { useProtection } from '../hooks/useProtection';
import { registerAuthenticatedPageAccess } from '../lib/accessLogger';

type ContentFilter = 'posts' | 'media';

interface FeedPost {
  id: string;
  creator: string;
  username: string;
  avatar: string;
  mediaUrl: string;
  type: 'photo' | 'video';
  likes: string;
  comments: string;
  views?: string;
  timestamp: string;
  description: string;
  isPaid?: boolean;
}

const feedPosts: FeedPost[] = [
  {
    id: 'post-1',
    creator: 'Bia',
    username: '@bia',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop',
    mediaUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&h=1000&fit=crop',
    type: 'video',
    likes: '290',
    comments: '50',
    views: '2K',
    timestamp: 'há 2h',
    description: 'Sou virgem de 19 anos, mas morro de vontade de te dar o meu primeiro...',
  },
  {
    id: 'post-2',
    creator: 'Bia',
    username: '@bia',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop',
    mediaUrl: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?w=800&h=1000&fit=crop',
    type: 'photo',
    likes: '290',
    comments: '50',
    views: '2K',
    timestamp: 'há 1h',
    description: 'Mood de hoje 🧡',
  },
  {
    id: 'post-3',
    creator: 'Bia',
    username: '@bia',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop',
    mediaUrl: 'https://images.unsplash.com/photo-1519183071298-a2962be90b8e?w=800&h=1000&fit=crop',
    type: 'photo',
    likes: '290',
    comments: '50',
    views: '2K',
    timestamp: 'há 3h',
    description: 'Esquenta pro Privacy Week 🔥',
    isPaid: true,
  },
  {
    id: 'post-4',
    creator: 'Bia',
    username: '@bia',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop',
    mediaUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&h=1000&fit=crop',
    type: 'photo',
    likes: '290',
    comments: '50',
    views: '2K',
    timestamp: 'há 4h',
    description: 'Selfie do espelho 📸',
  },
  {
    id: 'post-5',
    creator: 'Bia',
    username: '@bia',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop',
    mediaUrl: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=800&h=1000&fit=crop',
    type: 'video',
    likes: '290',
    comments: '50',
    views: '2K',
    timestamp: 'há 5h',
    description: 'Clipe exclusivo só pros assinantes 👀',
    isPaid: true,
  },
  {
    id: 'post-6',
    creator: 'Bia',
    username: '@bia',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop',
    mediaUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=1000&fit=crop',
    type: 'photo',
    likes: '290',
    comments: '50',
    views: '2K',
    timestamp: 'há 6h',
    description: 'Deitada na cama 😴',
  },
];

const ProfileHighlight: React.FC = () => (
  <div className="relative mb-6">
    {/* Banner */}
    <div className="relative h-48 w-full overflow-hidden rounded-b-3xl">
      <img
        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&h=400&fit=crop"
        alt="Banner"
        className="h-full w-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
    </div>

    {/* Avatar e Info */}
    <div className="relative -mt-16 px-4">
      <div className="flex items-start gap-4">
        <div className="relative">
          <img
            src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop"
            alt="Bia"
            className="h-24 w-24 rounded-full border-4 border-dark object-cover"
            loading="lazy"
          />
          <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-dark bg-green-400" />
        </div>

        <div className="flex-1 pt-2">
          <h2 className="text-xl font-bold text-white">Bia</h2>
          <p className="text-sm text-gray-400">@biabeeyfree</p>
          <p className="mt-2 text-sm text-gray-300">
            Sou virgem de 19 anos... mas morro de curiosidade desse mundo proibido 🐒 Pra voc
          </p>
          <button className="mt-2 text-sm font-semibold text-primary">Ler mais</button>

          <div className="mt-4 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-gray-300">6</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-gray-300">5</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-sm text-gray-300">1</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="text-sm text-gray-300">10.3</span>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-dark">
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                Mimo
              </span>
            </button>
            <button className="flex-1 rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary">
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Chat
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ContentTabs: React.FC<{
  activeFilter: ContentFilter;
  onChange: (filter: ContentFilter) => void;
  postsCount: number;
  mediaCount: number;
}> = ({ activeFilter, onChange, postsCount, mediaCount }) => (
  <div className="mb-6 flex items-center justify-center gap-8 border-b border-dark-lighter">
    <button
      onClick={() => onChange('posts')}
      className={`flex items-center gap-2 border-b-2 pb-3 transition ${
        activeFilter === 'posts'
          ? 'border-primary text-primary'
          : 'border-transparent text-gray-400'
      }`}
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span className="text-sm font-semibold">{postsCount} Postagens</span>
    </button>
    <button
      onClick={() => onChange('media')}
      className={`flex items-center gap-2 border-b-2 pb-3 transition ${
        activeFilter === 'media'
          ? 'border-primary text-primary'
          : 'border-transparent text-gray-400'
      }`}
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
      <span className="text-sm font-semibold">{mediaCount} Mídias</span>
    </button>
  </div>
);

const FeedPostCard: React.FC<{ post: FeedPost }> = ({ post }) => {
  const isVideo = post.type === 'video';

  return (
    <article className="mb-6 space-y-3">
      {/* Header do Post */}
      <header className="flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img
            src={post.avatar}
            alt={post.creator}
            className="h-10 w-10 rounded-full object-cover"
            loading="lazy"
          />
          <div>
            <p className="text-sm font-semibold text-white">{post.creator}</p>
            <p className="text-xs text-gray-400">{post.username}</p>
          </div>
        </div>
        <span className="text-xs text-gray-500">{post.timestamp}</span>
      </header>

      {/* Mídia */}
      <div className="relative w-full overflow-hidden">
        <img
          src={post.mediaUrl}
          alt={post.description}
          className={`w-full object-cover ${post.isPaid ? 'blur-xl' : ''} transition`}
          style={{ 
            aspectRatio: '9/16',
            maxHeight: '600px',
            objectFit: 'cover',
            display: 'block'
          }}
          loading="lazy"
        />

        {/* Overlay de vídeo */}
        {isVideo && !post.isPaid && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60">
              <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}

        {/* Overlay de conteúdo pago */}
        {post.isPaid && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
              <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-white">Conteúdo exclusivo</p>
            <button className="rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-2 text-sm font-semibold text-white shadow-lg">
              Ver planos
            </button>
          </div>
        )}
      </div>

      {/* Ações e Métricas */}
      <div className="px-4 space-y-2">
        {/* Botões de ação */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="text-white hover:text-red-500 transition">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
            <button className="text-white hover:text-blue-500 transition">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            <button className="text-white hover:text-green-500 transition">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
          <button className="text-white hover:text-yellow-500 transition">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>

        {/* Métricas */}
        {!post.isPaid && (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">{post.likes} curtidas</p>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>{post.comments} comentários</span>
              {post.views && <span>{post.views} views</span>}
            </div>
          </div>
        )}

        {/* Descrição */}
        <div className="space-y-1">
          <p className="text-sm text-white">
            <span className="font-semibold">{post.username}</span> {post.description}
          </p>
        </div>
      </div>
    </article>
  );
};

export const Home: React.FC = () => {
  useProtection();
  const [activeFilter, setActiveFilter] = useState<ContentFilter>('posts');

  useEffect(() => {
    registerAuthenticatedPageAccess('home').catch((error) => {
      console.error('Erro ao registrar acesso autenticado (home):', error);
    });
  }, []);

  const filteredPosts = useMemo(() => {
    if (activeFilter === 'media') {
      return feedPosts.filter((post) => post.type === 'video' || post.type === 'photo');
    }
    return feedPosts;
  }, [activeFilter]);

  const postsCount = feedPosts.length;
  const mediaCount = feedPosts.filter((p) => p.type === 'photo' || p.type === 'video').length;

  return (
    <div className="min-h-screen bg-dark text-white pb-20">
      <Header />

      <main className="mx-auto w-full max-w-md">
        <ProfileHighlight />
        
        <div className="px-4">
          <ContentTabs
            activeFilter={activeFilter}
            onChange={setActiveFilter}
            postsCount={postsCount}
            mediaCount={mediaCount}
          />
        </div>

        <div className="space-y-0">
          {filteredPosts.map((post) => (
            <FeedPostCard key={post.id} post={post} />
          ))}
        </div>
      </main>
    </div>
  );
};
