import * as React from 'react';
import { CreatorProfile } from '../types';

interface BioCardProps {
  profile: CreatorProfile;
}

export const BioCard: React.FC<BioCardProps> = ({ profile }: BioCardProps) => {
  return (
    <div className="w-full">
      {/* Nome e Username */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl sm:text-2xl font-bold text-privacy-text-primary">{profile.name}</h1>
          <span className="text-primary text-lg sm:text-xl">✓</span>
        </div>
        <span className="text-privacy-text-secondary text-sm">@{profile.username}</span>
      </div>

      {/* Stats - Layout horizontal compacto */}
      <div className="flex gap-4 sm:gap-6 mb-4 text-sm">
        <div className="flex flex-col sm:flex-row sm:gap-1">
          <span className="font-semibold text-privacy-text-primary">{profile.stats.posts.toLocaleString()}</span>
          <span className="text-privacy-text-secondary text-xs sm:text-sm">postagens</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:gap-1">
          <span className="font-semibold text-privacy-text-primary">{profile.stats.followers.toLocaleString()}</span>
          <span className="text-privacy-text-secondary text-xs sm:text-sm">seguidores</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:gap-1">
          <span className="font-semibold text-privacy-text-primary">{profile.stats.following.toLocaleString()}</span>
          <span className="text-privacy-text-secondary text-xs sm:text-sm">seguindo</span>
        </div>
      </div>

      {/* Bio */}
      <div className="mb-3">
        <p className="text-sm sm:text-base text-privacy-text-secondary leading-relaxed">
          {profile.bio}
        </p>
        <button className="text-sm text-privacy-text-secondary hover:text-privacy-text-primary mt-1">
          Ler mais
        </button>
      </div>

      {/* Location */}
      {profile.location && (
        <div className="flex items-center gap-2 text-sm text-privacy-text-secondary">
          <svg 
            className="w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
            />
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
            />
          </svg>
          <span>{profile.location}</span>
        </div>
      )}
    </div>
  );
};