import * as React from 'react';
import { MediaItemWithAccess } from '../lib/models';
import { Dialog, DialogContent } from './ui/dialog';

interface MediaModalProps {
  media: MediaItemWithAccess | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MediaModal: React.FC<MediaModalProps> = ({ media, isOpen, onClose }: MediaModalProps) => {
  if (!media) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <div className="relative max-w-full max-h-[90vh] flex items-center justify-center">
          {media.type === 'image' ? (
            <img
              src={media.url}
              alt={media.title || 'Media content'}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          ) : (
            <video
              src={media.url}
              controls
              autoPlay
              controlsList="nodownload"
              className="max-w-full max-h-[90vh] rounded-lg"
              onContextMenu={(e) => e.preventDefault()}
            >
              Seu navegador não suporta vídeos.
            </video>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};