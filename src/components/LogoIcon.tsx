import React from 'react';

export const LogoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    className={className}
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
  >
    <path d="M14.3,2.2 C13.5,2.5 13.3,3.5 13.6,4.3 C15.1,7.8 13.8,11.9 10.4,14.8 C7.1,17.6 5.1,22 6.3,22 C7.2,22 9.6,18.6 13.1,15.7 C16.5,12.8 18.5,8.2 17.2,4.5 C16.9,3.5 17.2,2.5 18,2.2 C18.8,1.9 19.8,2.2 20.1,3 C21.8,6.9 19.9,12.2 15.9,15.9 C11.9,19.6 8.2,22 7.5,22 C5,22 2.9,16.1 5.9,11.4 C8.9,6.7 12.9,3.9 14.6,3.1 C15.4,2.7 15.1,1.8 14.3,2.2 Z"/>
  </svg>
);