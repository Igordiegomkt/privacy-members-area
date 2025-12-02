import React from 'react';

export const LogoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    className={className}
    viewBox="0 0 100 50" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Stem (fixed green color) */}
    <path d="M 80 22 C 82 12, 95 10, 98 4 C 94 12, 86 15, 83 23 Z" fill="#4CAF50"/>
    {/* Pepper Body (fixed red color) */}
    <path d="M 83 23 C 60 10, 30 15, 10 30 C 5 34, 2 38, 5 42 C 15 30, 40 20, 80 22 Z" fill="#DC2626"/>
    {/* Highlight (subtle white) */}
    <path d="M 75 22 C 50 18, 30 22, 15 32 C 35 24, 55 20, 75 22 Z" fill="white" fillOpacity="0.3"/>
  </svg>
);