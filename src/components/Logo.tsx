import * as React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
  textSize?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  textSize = 'text-2xl' 
}: LogoProps) => {
  return (
    <Link to="/" className={`flex items-center ${className}`}>
      <h1 className={`${textSize} font-bold tracking-tighter text-privacy-text-primary`}>
        <span className="text-primary">M</span>eu Privacy
      </h1>
    </Link>
  );
};