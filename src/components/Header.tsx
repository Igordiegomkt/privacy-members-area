import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';

export function Header(): React.ReactElement {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <header className="sticky top-0 z-40 bg-privacy-surface/80 backdrop-blur-md border-b border-privacy-border">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <Logo />
        
        <div className="flex items-center gap-4">
          <button
            className="text-privacy-text-secondary hover:text-privacy-text-primary transition-colors"
            aria-label="Buscar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </button>
          
          <button
            className="text-privacy-text-secondary hover:text-privacy-text-primary transition-colors relative"
            aria-label="Notificações"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-privacy-surface"></span>
          </button>
          
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-privacy-text-secondary hover:text-privacy-text-primary transition-colors"
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