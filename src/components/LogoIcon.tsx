import React from 'react';

export const LogoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    className={className}
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
  >
    <path d="M2 21V3h7l3 4.5L15 3h7v18h-5V8l-5 7.5L5 8v13H2z"/>
  </svg>
);