import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, LayoutGrid, Store, Flame } from 'lucide-react';

export const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    {
      id: 'mural',
      label: 'Início',
      icon: <Home size={28} />,
      path: '/', // ✅ Rota corrigida para a Home de Modelos
    },
    {
      id: 'feed',
      label: 'Feed',
      icon: <LayoutGrid size={28} />,
      path: '/feed',
    },
    {
      id: 'loja',
      label: 'Loja',
      icon: <Store size={28} />,
      path: '/loja',
    },
    {
      id: 'trending',
      label: 'Em alta',
      icon: <Flame size={28} />,
      path: '/em-alta',
    },
  ];

  const isActive = (path: string) => {
    // ✅ Lógica de estado ativo corrigida
    // Mantém "Início" ativo na Home de Modelos (/) e em qualquer perfil de modelo (/modelo/*)
    if (path === '/') {
      return location.pathname === '/' || location.pathname.startsWith('/modelo/');
    }
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex w-full items-center justify-around bg-privacy-surface/80 backdrop-blur-md border-t border-privacy-border">
      {navItems.map((item) => {
        const active = isActive(item.path);
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-1 py-2 px-4 transition-colors ${
              active ? 'text-primary' : 'text-privacy-text-secondary hover:text-privacy-text-primary'
            }`}
          >
            {item.icon}
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};