import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
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
import { ModelProfile } from './pages/ModelProfile';
import { GlobalFeed } from './pages/GlobalFeed';
import { TrendingModels } from './pages/TrendingModels';
import { ManageModels } from './pages/admin/ManageModels';
import { ModelForm } from './pages/admin/ModelForm';
import { ManageProducts } from './pages/admin/ManageProducts';
import { ManageContent } from './pages/admin/ManageContent';
import { PaymentSettings } from './pages/admin/PaymentSettings';
import PurchaseSuccess from './pages/PurchaseSuccess';
import PurchaseFailed from './pages/PurchaseFailed';
import { ensureFirstAccess } from './lib/firstAccess';

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
  const navigate = useNavigate();
  const hasChecked = useRef(false);

  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    const checkAccessAndRedirect = async () => {
      try {
        console.log('[RootRedirector] Iniciando verificação de primeiro acesso...');

        const { data, error } = await supabase.auth.getUser();
        console.log('[RootRedirector] getUser result:', { data, error });

        if (error || !data?.user) {
          console.log('[RootRedirector] Sem usuário autenticado, indo para /login');
          navigate('/login', { replace: true });
          return;
        }

        const user = data.user;
        console.log('[RootRedirector] Usuário autenticado:', user.id);

        const { isFirstAccess } = await ensureFirstAccess(supabase, user.id);
        console.log('[RootRedirector] isFirstAccess =', isFirstAccess);

        if (isFirstAccess) {
          console.log('[RootRedirector] Primeiro acesso → /minhas-compras');
          navigate('/minhas-compras', { replace: true });
        } else {
          console.log('[RootRedirector] Acesso recorrente → /feed');
          navigate('/feed', { replace: true });
        }
      } catch (err) {
        console.error('[RootRedirector] Erro ao verificar primeiro acesso:', err);
        // fallback seguro
        navigate('/feed', { replace: true });
      }
    };

    checkAccessAndRedirect();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-privacy-black flex items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
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
          <Route path="/feed" element={<GlobalFeed />} />
          <Route path="/em-alta" element={<TrendingModels />} />
          <Route path="/loja" element={<Marketplace />} />
          <Route path="/produto/:id" element={<ProductDetail />} />
          <Route path="/minhas-compras" element={<MyPurchases />} />
          <Route path="/compra-sucesso" element={<PurchaseSuccess />} />
          <Route path="/compra-falhou" element={<PurchaseFailed />} />
          <Route path="/mural" element={<Home />} />
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

        {/* Redirects & Root */}
        <Route path="/" element={<RootRedirector />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;