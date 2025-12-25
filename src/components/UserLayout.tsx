import * as React from 'react';
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useRealtimeTracker } from '../hooks/useRealtimeTracker';
import { useAuth } from '../contexts/AuthContext'; // Importando useAuth
import { getValidGrant, clearGrant } from '../lib/accessGrant'; // Importando helpers de grant
import { registerFirstAccess } from '../lib/accessLogger'; // Importando logger

const ACCESS_LOG_KEY = 'vip_link_access_logged';

export const UserLayout: React.FC = () => {
  const { user } = useAuth();
  
  // O nome do usuário para o tracker é o primeiro nome do perfil ou o email
  const userNameForTracker = user?.first_name || user?.email || 'Anonymous';

  // This hook will run for any page wrapped by this layout
  useRealtimeTracker(userNameForTracker);
  
  // Efeito para registrar o acesso se houver um AccessGrant ativo
  useEffect(() => {
    const grant = getValidGrant();
    
    if (grant && user?.id) {
        // Verifica se já registramos este acesso na sessão
        const logged = sessionStorage.getItem(ACCESS_LOG_KEY);
        
        if (!logged) {
            console.log('[UserLayout] AccessGrant detected. Registering first access via link...');
            
            // Usamos o nome do usuário logado (ou o nome do visitante se estiver no localStorage)
            const name = localStorage.getItem('userName') || user.email || 'Usuário VIP Link';
            const isAdult = localStorage.getItem('userIsAdult') === 'true';
            
            registerFirstAccess({
                name: name,
                isAdult: isAdult,
                landingPage: `${window.location.origin}/acesso-vip-link`, // Marcador de acesso via link
            }).then(() => {
                // Marca como logado para evitar spam na tabela first_access
                sessionStorage.setItem(ACCESS_LOG_KEY, 'true');
                console.log('[UserLayout] Access via link successfully logged.');
            }).catch(err => {
                console.error('[UserLayout] Failed to log access via link:', err);
            });
        }
    } else {
        // Se não houver grant, garante que a flag de log seja limpa para a próxima sessão de link
        sessionStorage.removeItem(ACCESS_LOG_KEY);
    }
  }, [user?.id]);


  return <Outlet />;
};