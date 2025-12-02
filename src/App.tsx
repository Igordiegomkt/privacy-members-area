import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Trending } from './pages/Trending';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ProtectedRouteAdmin } from './components/admin/ProtectedRouteAdmin';
import { AdminLayout } from './components/admin/AdminLayout';
import { ResetPassword } from './pages/admin/ResetPassword';
import { supabase } from './lib/supabase';
import { ManageUsers } from './pages/admin/ManageUsers';
import { UserLayout } from './components/UserLayout';
import { Marketplace } from './pages/Marketplace';
import { ProductDetail } from './pages/ProductDetail';
import { MyPurchases } from './pages/MyPurchases';
import { CarolinaHub } from './pages/CarolinaHub';
import { ModelProfile } from './pages/ModelProfile';
import { GlobalFeed } from './pages/GlobalFeed';
import { TrendingModels } from './pages/TrendingModels';
import { ManageModels } from './pages/admin/ManageModels';
import { ModelForm } from './pages/admin/ModelForm';
import { ManageProducts } from './pages/admin/ManageProducts';
import { ManageContent } from './pages/admin/ManageContent';
import { PaymentSettings } from './pages/admin/PaymentSettings';

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
        navigate('/admin/reset-password');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  return null;
};

// Componente para redirecionamento inteligente da raiz
const RootRedirector: React.FC = () => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  return <Navigate to={isAuthenticated ? "/modelo/carolina-andrade" : "/login"} replace />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthHandler />
      <Routes>
        {/* User Routes */}
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRouteUser><UserLayout /></ProtectedRouteUser>}>
          <Route path="/modelo/:username" element={<ModelProfile />} />
          <Route path="/carolina" element={<CarolinaHub />} />
          <Route path="/mural" element={<Home />} />
          <Route path="/feed" element={<GlobalFeed />} />
          <Route path="/em-alta" element={<TrendingModels />} />
          <Route path="/trending" element={<Trending />} />
          <Route path="/loja" element={<Marketplace />} />
          <Route path="/produto/:id" element={<ProductDetail />} />
          <Route path="/minhas-compras" element={<MyPurchases />} />
        </Route>
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/reset-password" element={<ResetPassword />} />
        <Route element={<ProtectedRouteAdmin />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<ManageUsers />} />
            <Route path="/admin/modelos" element={<ManageModels />} />
            <Route path="/admin/modelos/nova" element={<ModelForm />} />
            <Route path="/admin/modelos/:id" element={<ModelForm />} />
            <Route path="/admin/modelos/:id/produtos" element={<ManageProducts />} />
            <Route path="/admin/modelos/:id/conteudos" element={<ManageContent />} />
            <Route path="/admin/configuracoes" element={<PaymentSettings />} />
          </Route>
        </Route>

        {/* Redirects */}
        <Route path="/home" element={<Navigate to="/modelo/carolina-andrade" replace />} />
        <Route path="/profile" element={<Navigate to="/feed" replace />} />
        <Route path="/" element={<RootRedirector />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;