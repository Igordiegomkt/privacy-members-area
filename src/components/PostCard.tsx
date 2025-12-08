import * as React from 'react';
import { MediaItemWithAccess } from '../lib/models';
import { MediaCard } from './MediaCard';

interface PostCardProps {
  media: MediaItemWithAccess;
  onLockedClick: () => void;
  onOpenVideo: () => void;
  onOpenImage: () => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  media,
  onLockedClick,
  onOpenVideo,
  onOpenImage,
}: PostCardProps) => {
  const model = media.model;

  return (
    <article className="w-full max-w-xl mx-auto bg-privacy-surface rounded-2xl overflow-hidden mb-4">
      {model && (
        <header className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-privacy-black">
            {model.avatar_url && (
              <img
                src={model.avatar_url}
                alt={model.name}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">{model.name}</span>
            <span className="text-xs text-privacy-text-secondary">há pouco</span>
          </div>
        </header>
      )}

      <div className="px-2 pb-2">
        <MediaCard
          media={media}
          onLockedClick={onLockedClick}
          onOpenVideo={onOpenVideo}
          onOpenImage={onOpenImage}
        />
      </div>

      <footer className="px-4 pb-3 text-sm text-privacy-text-secondary">
        {media.accessStatus === 'locked' ? (
          <p>Desbloqueie o conteúdo completo desta criadora para ver.</p>
        ) : (
          <p>{media.description || `Conteúdo exclusivo de ${model?.name}.`}</p>
        )}
      </footer>
    </article>
  );
};