import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Feed } from './pages/Feed';
import { Trending } from './pages/Trending';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ProtectedRouteAdmin } from './components/admin/ProtectedRouteAdmin';
import { AdminLayout } from './components/admin/AdminLayout';
import { ResetPassword } from './pages/admin/ResetPassword';
import { supabase } from './lib/supabase';
import { ManageUsers } from './pages/admin/ManageUsers';
import { UserLayout } from './components/UserLayout';

// Componente de rota protegida para usuários
const ProtectedRouteUser: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Componente para lidar com eventos de autenticação
const AuthHandler: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        console.log('Password recovery event detected, navigating to reset page.');
        navigate('/admin/reset-password');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  return null; // Este componente não renderiza nada
};

// Componente para redirecionamento inteligente da raiz
const RootRedirector: React.FC = () => {
  const isAuthCallback = window.location.hash.includes('access_token');

  if (isAuthCallback) {
    return (
      <div className="min-h-screen bg-privacy-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-4 text-privacy-text-secondary">Processando autenticação...</p>
      </div>
    );
  }

  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  return <Navigate to={isAuthenticated ? "/mural" : "/login"} replace />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthHandler />
      <Routes>
        {/* User Routes */}
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRouteUser><UserLayout /></ProtectedRouteUser>}>
          <Route path="/mural" element={<Home />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/trending" element={<Trending />} />
        </Route>
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/reset-password" element={<ResetPassword />} />
        <Route element={<ProtectedRouteAdmin />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<ManageUsers />} />
          </Route>
        </Route>

        {/* Redirects */}
        <Route path="/home" element={<Navigate to="/mural" replace />} />
        <Route path="/profile" element={<Navigate to="/feed" replace />} />
        <Route path="/" element={<RootRedirector />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;