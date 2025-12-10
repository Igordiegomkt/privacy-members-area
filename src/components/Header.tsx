import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { NotificationBell } from './notifications/NotificationBell'; // Novo import

export function Header(): React.ReactElement {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleNavigateToProduct = (productId: string) => {
    navigate(`/produto/${productId}`);
  };

  return (
    <header className="sticky top-0 z-40 bg-privacy-surface/80 backdrop-blur-md border-b border-privacy-border">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <Logo />
        
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            className="text-privacy-text-secondary hover:text-privacy-text-primary transition-colors p-2 rounded-full hover:bg-privacy-border/40"
            aria-label="Buscar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </button>
          
          {/* Substituindo o ícone de notificação hardcoded pelo componente NotificationBell */}
          <NotificationBell onNavigateToProduct={handleNavigateToProduct} />
          
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-privacy-text-secondary hover:text-privacy-text-primary transition-colors p-2 rounded-full hover:bg-privacy-border/40"
              aria-label="Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-privacy-surface rounded-md shadow-lg py-1 z-50 border border-privacy-border">
                <Link
                  to="/minhas-compras"
                  className="block w-full text-left px-4 py-2 text-sm text-privacy-text-secondary hover:bg-privacy-border hover:text-privacy-text-primary"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Minhas Compras
                </Link>
                <Link
                  to="/admin/login"
                  className="block w-full text-left px-4 py-2 text-sm text-privacy-text-secondary hover:bg-privacy-border hover:text-privacy-text-primary"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Painel Admin
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}