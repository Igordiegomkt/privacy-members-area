import React from 'react';
import { Outlet } from 'react-router-dom';
import { useRealtimeTracker } from '../hooks/useRealtimeTracker';

export const UserLayout: React.FC = () => {
  // This hook will run for any page wrapped by this layout
  useRealtimeTracker();

  return <Outlet />;
};