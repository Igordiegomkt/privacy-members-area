import React from 'react';

const PepperIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M14 15.5C14 18 12.5 21.5 9 21.5c-2.5 0-5-2.5-5-5.5C4 13 6 11 6 11s-1.5-2-1.5-3.5C4.5 6 6 4.5 7.5 4.5c1.93 0 3.5 1.57 3.5 3.5 0 1.5-2 3.5-2 3.5s2 2 2 4.5z"/>
    <path d="M15.5 4.5c1.5 0 3 1.5 3 3.5 0 1.5-1.5 3.5-1.5 3.5s2 2 2 4.5c0 3-2.5 5.5-5 5.5-3.5 0-5-3.5-5-6"/>
  </svg>
);

interface LogoProps {
  className?: string;
  iconSize?: string;
  textSize?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = 'text-white', 
  iconSize = 'w-6 h-6', 
  textSize = 'text-xl' 
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <PepperIcon className={`text-primary ${iconSize}`} />
      <h1 className={`${textSize} font-bold`}>
        Meu Pr<span className="text-primary">i</span>vacy
      </h1>
    </div>
  );
};