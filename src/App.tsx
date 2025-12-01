import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Feed } from './pages/Feed';
import { Trending } from './pages/Trending';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ProtectedRouteAdmin } from './components/admin/ProtectedRouteAdmin';
import { AdminLayout } from './components/admin/AdminLayout';

// Componente de rota protegida para usuários
const ProtectedRouteUser: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* User Routes */}
        <Route path="/login" element={<Login />} />
        <Route
          path="/mural"
          element={
            <ProtectedRouteUser>
              <Home />
            </ProtectedRouteUser>
          }
        />
        <Route
          path="/feed"
          element={
            <ProtectedRouteUser>
              <Feed />
            </ProtectedRouteUser>
          }
        />
        <Route
          path="/trending"
          element={
            <ProtectedRouteUser>
              <Trending />
            </ProtectedRouteUser>
          }
        />
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<ProtectedRouteAdmin />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Route>
        </Route>

        {/* Redirects */}
        <Route path="/home" element={<Navigate to="/mural" replace />} />
        <Route path="/profile" element={<Navigate to="/feed" replace />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;