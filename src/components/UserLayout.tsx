import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { useRealtimeTracker } from '../hooks/useRealtimeTracker';
import { Header } from './Header';
import { BottomNavigation } from './BottomNavigation';
import { useProtection } from '../hooks/useProtection'; // Adicionando proteção aqui

export const UserLayout: React.FC = () => {
  // Este hook rastreia a presença do usuário
  useRealtimeTracker();
  // Este hook aplica proteções básicas
  useProtection();

  return (
    <div className="min-h-screen bg-privacy-black text-white pb-24">
      <Header />
      <main className="mx-auto w-full max-w-4xl">
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  );
};