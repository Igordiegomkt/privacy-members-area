import React from 'react';
import { MediaItem } from './MediaItem';
import { MediaItemWithAccess } from '../lib/models';

interface MediaGridProps {
  media: MediaItemWithAccess[];
  onMediaClick: (media: MediaItemWithAccess) => void;
}

export const MediaGrid: React.FC<MediaGridProps> = ({ media, onMediaClick }) => {
  if (media.length === 0) {
    return (
      <div className="w-full px-4 py-12 text-center text-gray-400">
        <p>Nenhum conteúdo disponível ainda.</p>
      </div>
    );
  }

  return (
    <div className="w-full px-2 sm:px-4 pb-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {media.map((item) => (
          <MediaItem
            key={item.id}
            media={item}
            onClick={() => onMediaClick(item)}
          />
        ))}
      </div>
    </div>
  );
};