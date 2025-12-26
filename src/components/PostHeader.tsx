import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical } from 'lucide-react';
import { Model } from '../types';

interface PostHeaderProps {
  model: Model;
  createdAt: string;
}

export const PostHeader: React.FC<PostHeaderProps> = ({ model, createdAt }: PostHeaderProps) => {
  const navigate = useNavigate();

  const handleNavigateToProfile = () => {
    if (model.username) {
      navigate(`/modelo/${model.username}`);
    }
  };

  return (
    <header className="flex items-center justify-between px-3 py-2">
      <div className="flex items-center gap-3 cursor-pointer" onClick={handleNavigateToProfile}>
        <div className="w-10 h-10 rounded-full overflow-hidden bg-privacy-black flex-shrink-0">
          {model.avatar_url && (
            <img
              src={model.avatar_url}
              alt={model.name}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-white hover:text-primary transition-colors">
              {model.name}
            </span>
            {model.is_verified && (
              <span className="inline-flex items-center justify-center rounded-full bg-blue-500 w-3 h-3 text-[8px] text-white">
                ✓
              </span>
            )}
          </div>
          <span className="text-xs text-privacy-text-secondary">
            @{model.username} • {new Date(createdAt).toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>
      <button className="text-privacy-text-secondary hover:text-white p-1 rounded-full transition-colors">
        <MoreVertical size={20} />
      </button>
    </header>
  );
};