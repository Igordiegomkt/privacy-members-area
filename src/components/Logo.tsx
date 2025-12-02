import React from 'react';

interface LogoProps {
  className?: string;
  textSize?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  textSize = 'text-2xl' 
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <h1 className={`${textSize} font-bold tracking-tighter text-privacy-text-primary`}>
        Meu Privacy
      </h1>
    </div>
  );
};