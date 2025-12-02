import React from 'react';
import { LogoIcon } from './LogoIcon';

interface LogoProps {
  className?: string;
  iconSize?: string;
  textSize?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  iconSize = 'w-7 h-7', 
  textSize = 'text-2xl' 
}) => {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <LogoIcon className={`${iconSize} text-privacy-orange`} />
      <h1 className={`${textSize} font-bold tracking-tighter text-privacy-text-primary`}>
        eu Privacy
      </h1>
    </div>
  );
};