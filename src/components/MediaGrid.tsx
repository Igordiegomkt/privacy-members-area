import React from 'react';
import { MediaItem as MediaItemType } from '../types';
import { MediaItem } from './MediaItem';

interface MediaGridProps {
  media: MediaItemType[];
  onMediaClick: (media: MediaItemType) => void;
  onMediaLoad?: () => void;
}

export const MediaGrid: React.FC<MediaGridProps> = ({ media, onMediaClick, onMediaLoad }) => {
  if (media.length === 0) {
    return (
      <div className="w-full px-4 py-12 text-center text-gray-400">
        <p>Nenhum conteúdo disponível ainda.</p>
      </div>
    );
  }

  return (
    <div className="w-full px-2 sm:px-4 pb-8">
      <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
        {media.map((item) => (
          <MediaItem
            key={item.id}
            media={item}
            onClick={() => onMediaClick(item)}
            onLoad={onMediaLoad}
          />
        ))}
      </div>
    </div>
  );
};

