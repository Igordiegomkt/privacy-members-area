import React from 'react';
import { BottomNavigation } from '../components/BottomNavigation';
import { Profile } from './Profile';

export const Feed: React.FC = () => {
  return (
    <>
      <Profile />
      <BottomNavigation />
    </>
  );
};

