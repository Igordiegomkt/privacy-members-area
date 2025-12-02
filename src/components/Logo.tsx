import React from 'react';
import { LogoIcon } from './LogoIcon';

interface LogoProps {
  className?: string;
  iconSize?: string;
  textSize?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = 'text-privacy-text-primary', 
  iconSize = 'w-7 h-7', 
  textSize = 'text-2xl' 
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LogoIcon className={`${iconSize}`} />
      <h1 className={`${textSize} font-bold tracking-tighter`}>
        Meu Privacy
      </h1>
    </div>
  );
};