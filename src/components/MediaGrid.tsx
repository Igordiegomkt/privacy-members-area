import React, { useState } from 'react';
import { MediaItemWithAccess } from '../lib/models';
import { MediaCard } from './MediaCard';
import { VideoPlayerModal } from './VideoPlayerModal';
import { MediaModal } from './MediaModal'; // For images

interface MediaGridProps {
  media: MediaItemWithAccess[];
  onLockedClick: (media: MediaItemWithAccess) => void;
}

export const MediaGrid: React.FC<MediaGridProps> = ({ media, onLockedClick }) => {
  const [openVideo, setOpenVideo] = useState<MediaItemWithAccess | null>(null);
  const [openImage, setOpenImage] = useState<MediaItemWithAccess | null>(null);

  if (media.length === 0) {
    return (
      <div className="w-full px-4 py-12 text-center text-gray-400">
        <p>Nenhum conteúdo disponível ainda.</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full px-2 sm:px-4 pb-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {media.map(item => (
            <MediaCard
              key={item.id}
              media={item}
              onClick={() => {
                if (item.accessStatus === 'locked') {
                  onLockedClick(item);
                } else if (item.type === 'image') {
                  setOpenImage(item);
                }
              }}
              onOpenVideo={() => setOpenVideo(item)}
            />
          ))}
        </div>
      </div>

      <VideoPlayerModal
        media={openVideo}
        isOpen={!!openVideo}
        onClose={() => setOpenVideo(null)}
      />
      <MediaModal
        media={openImage}
        isOpen={!!openImage}
        onClose={() => setOpenImage(null)}
      />
    </>
  );
};