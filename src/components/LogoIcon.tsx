import React from 'react';

export const LogoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    className={className}
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
  >
    <path d="M2.5 21V3h4.92L12 10.38 16.58 3H21.5v18h-3.5V6.71l-3.58 6.16-3.5-6.16V21H2.5z"/>
  </svg>
);