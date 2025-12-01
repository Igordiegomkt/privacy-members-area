import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  return (
    <aside className="w-64 bg-dark-light flex flex-col p-4">
      <div className="text-center py-4 mb-8">
        <h1 className="text-2xl font-bold text-white">
          pr<span className="text-primary">i</span>vacy
        </h1>
        <span className="text-sm text-gray-400">Admin Panel</span>
      </div>
      <nav className="flex-1">
        <ul>
          <li>
            <a href="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 text-white bg-primary/20 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              <span>Dashboard</span>
            </a>
          </li>
          {/* Add more navigation links here */}
        </ul>
      </nav>
      <div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-dark-lighter rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
};