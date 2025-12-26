import * as React from 'react';
import { useEffect, useRef } from 'react';
import { MediaItemWithAccess } from '../lib/models';
import { PostMediaDisplay } from './PostMediaDisplay';
import { PostHeader } from './PostHeader';
import { ShowMoreText } from './ShowMoreText';
import { trackViewContent } from '../lib/tracking'; // Importando tracking

interface PostCardProps {
  media: MediaItemWithAccess;
  onLockedClick: () => void;
  onOpenVideo: () => void;
  onOpenImage: () => void;
  priceCents?: number; // Price of the product required to unlock
}

export const PostCard: React.FC<PostCardProps> = ({
  media,
  onLockedClick,
  onOpenVideo,
  onOpenImage,
  priceCents = 0,
}: PostCardProps) => {
  const model = media.model;
  const cardRef = useRef<HTMLElement>(null);
  const hasTrackedView = useRef(false);
  
  if (!model) return null;

  const title = media.ai_title || media.title;
  const subtitle = media.ai_subtitle || media.subtitle;
  const description = media.ai_description || media.description;
  const cta = media.ai_cta || media.cta;
  
  const isLocked = media.accessStatus === 'locked';

  const handleMediaClick = media.type === 'video' ? onOpenVideo : onOpenImage;

  // Rastreamento ViewContent quando o post entra na viewport
  useEffect(() => {
    if (!cardRef.current || hasTrackedView.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTrackedView.current) {
          trackViewContent({
            content_type: 'media_item',
            content_ids: [media.id],
            model_id: media.model_id ?? undefined, // Corrigido: null -> undefined
          });
          hasTrackedView.current = true;
          observer.unobserve(entry.target);
        }
      },
      {
        root: null, // viewport
        rootMargin: '0px 0px -100px 0px', // 100px antes de sair da tela
        threshold: 0.1,
      }
    );

    observer.observe(cardRef.current);

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, [media.id, media.model_id]);


  return (
    <article ref={cardRef} className="w-full max-w-xl mx-auto bg-privacy-surface rounded-2xl overflow-hidden mb-4 border border-privacy-border">
      
      {/* 1. HEADER */}
      <PostHeader model={model} createdAt={media.created_at || new Date().toISOString()} />

      <div className="px-2 pb-2">
        {/* 2. TÍTULO (Acima da Mídia) */}
        {title && (
          <p className="font-bold text-white text-lg px-2 pt-2 pb-1">
            {title}
          </p>
        )}

        {/* 3. MÍDIA (PostMediaDisplay) */}
        <PostMediaDisplay
          media={media}
          onLockedClick={onLockedClick}
          onMediaClick={handleMediaClick}
          priceCents={priceCents}
        />
      </div>

      <footer className="px-4 pb-3 text-sm">
        {/* 4. CORPO (Abaixo da Mídia) */}
        
        {subtitle && (
          <p className="text-primary font-medium mb-1">{subtitle}</p>
        )}
        
        {/* Descrição Recolhida (Requirement 8) */}
        {description && (
          <ShowMoreText text={description} maxLines={3} className="text-privacy-text-secondary" />
        )}

        {/* CTA (Texto) - Apenas se Locked (Requirement 3) */}
        {isLocked && cta && (
          <p className="text-primary font-semibold pt-1 text-sm">
            {cta}
          </p>
        )}

        {/* Tags */}
        {media.tags && media.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {media.tags.map((tag, index) => (
              <span key={index} className="text-xs text-privacy-text-secondary/70">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </footer>
    </article>
  );
};