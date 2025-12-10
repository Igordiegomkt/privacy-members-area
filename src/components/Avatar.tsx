import * as React from 'react';

interface AvatarProps {
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32',
};

export const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  alt, 
  size = 'md',
  className = '' 
}: AvatarProps) => {
  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full rounded-full object-cover border-2 border-privacy-border"
      />
    </div>
  );
};