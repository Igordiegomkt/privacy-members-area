import * as React from 'react';
import { useState } from 'react';
import { MediaItemWithAccess } from '../lib/models';
import { GridMediaCard } from './GridMediaCard';
import { MediaViewerFullscreen } from './MediaViewerFullscreen';

interface MediaGridProps {
  media: MediaItemWithAccess[];
  onLockedClick?: (media: MediaItemWithAccess) => void;
}

export const MediaGrid: React.FC<MediaGridProps> = ({ media, onLockedClick }: MediaGridProps) => {
  const [openMediaIndex, setOpenMediaIndex] = useState<number | null>(null);

  const handleMediaClick = (index: number) => {
    setOpenMediaIndex(index);
  };

  if (media.length === 0) {
    return (
      <div className="w-full px-4 py-12 text-center text-gray-400">
        <p>Nenhum conteúdo disponível ainda.</p>
      </div>
    );
  }

  // Filter out locked media for the viewer list, as per typical UX (only view unlocked content)
  const unlockedMedia = media.filter(m => m.accessStatus !== 'locked');
  const initialIndex = openMediaIndex !== null ? unlockedMedia.findIndex(m => m.id === media[openMediaIndex].id) : 0;


  return (
    <>
      <div className="w-full px-2 sm:px-4 pb-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {media.map((item: MediaItemWithAccess, index: number) => (
            <GridMediaCard
              key={item.id}
              media={item}
              onLockedClick={onLockedClick ? () => onLockedClick(item) : undefined}
              onMediaClick={() => handleMediaClick(index)}
            />
          ))}
        </div>
      </div>

      {openMediaIndex !== null && unlockedMedia.length > 0 && (
        <MediaViewerFullscreen
          mediaList={unlockedMedia}
          initialIndex={initialIndex}
          isOpen={openMediaIndex !== null}
          onClose={() => setOpenMediaIndex(null)}
        />
      )}
    </>
  );
};