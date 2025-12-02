import React from 'react';

const PrivacyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    className={className}
    viewBox="0 0 24 24" 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
  </svg>
);

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
      <PrivacyIcon className={`text-privacy-orange ${iconSize}`} />
      <h1 className={`${textSize} font-bold tracking-tighter`}>
        privacy
      </h1>
    </div>
  );
};