import * as React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Logo } from '../Logo';
import { LayoutDashboard, Users, Settings, LogOut, Image as ImageIcon, Sparkles } from 'lucide-react';

export function Sidebar(): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const navItems = [
    {
      path: '/admin/dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />
    },
    {
      path: '/admin/modelos',
      label: 'Modelos',
      icon: <ImageIcon className="w-5 h-5" />
    },
    {
      path: '/admin/ia',
      label: 'IA Tools',
      icon: <Sparkles className="w-5 h-5" />
    },
    {
      path: '/admin/users',
      label: 'Usuários Admin',
      icon: <Users className="w-5 h-5" />
    },
    {
      path: '/admin/configuracoes',
      label: 'Configurações',
      icon: <Settings className="w-5 h-5" />
    }
  ];

  return (
    <aside className="w-64 bg-privacy-surface flex flex-col p-4">
      <div className="text-center py-4 mb-8">
        <Logo textSize="text-2xl" />
        <span className="text-sm text-privacy-text-secondary">Admin Panel</span>
      </div>
      <nav className="flex-1">
        <ul className="space-y-2">
          {navItems.map(item => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  location.pathname.startsWith(item.path)
                    ? 'text-privacy-text-primary bg-primary/20'
                    : 'text-privacy-text-secondary hover:bg-privacy-border'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-privacy-text-secondary hover:bg-privacy-border rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}