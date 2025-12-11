import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { useRealtimeTracker } from '../hooks/useRealtimeTracker';
import { useAuth } from '../contexts/AuthContext'; // Importando useAuth

export const UserLayout: React.FC = () => {
  const { user } = useAuth();
  
  // O nome do usuário para o tracker é o primeiro nome do perfil ou o telefone
  const userNameForTracker = user?.first_name || user?.phone || user?.email || 'Anonymous';

  // This hook will run for any page wrapped by this layout
  useRealtimeTracker(userNameForTracker);

  return <Outlet />;
};