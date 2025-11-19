import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  getCombinedUTMs, 
  getDeviceInfo, 
  getReferrerDomain,
  saveUTMsToLocalStorage 
} from '../utils/utmParser';
import { TrackingScripts } from '../components/TrackingScripts';

export const Login: React.FC = () => {
  const [name, setName] = useState('');
  const [isAdult, setIsAdult] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Capturar UTMs quando o componente carregar
  useEffect(() => {
    saveUTMsToLocalStorage();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Por favor, informe seu nome');
      return;
    }

    if (!isAdult) {
      setError('Você precisa confirmar que é maior de idade para continuar');
      return;
    }

    setIsLoading(true);

    try {
      // Obter informações do navegador
      const userAgent = navigator.userAgent;
      
      // Capturar UTMs
      const utms = getCombinedUTMs();
      
      // Obter informações do dispositivo
      const deviceInfo = getDeviceInfo();
      
      // Obter referrer
      const referrer = document.referrer || null;
      const referrerDomain = getReferrerDomain(referrer);
      
      // Landing page (primeira página acessada)
      const landingPage = window.location.href;
      
      // Tentar obter IP (pode não funcionar em todos os casos, mas tentamos)
      let ipAddress = 'unknown';
      try {
        // Usar um serviço externo para obter o IP (opcional)
        // Em produção, você pode usar uma API server-side para isso
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        ipAddress = data.ip || 'unknown';
      } catch (err) {
        // Se falhar, usar 'unknown'
        console.warn('Não foi possível obter o IP:', err);
      }

      // Tentar registrar o primeiro acesso no Supabase
      let accessId = '';
      if (supabase) {
        try {
          const payload = {
            name: name.trim(),
            is_adult: isAdult,
            ip_address: ipAddress,
            user_agent: userAgent,
            utm_source: utms.utm_source ?? null,
            utm_medium: utms.utm_medium ?? null,
            utm_campaign: utms.utm_campaign ?? null,
            utm_term: utms.utm_term ?? null,
            utm_content: utms.utm_content ?? null,
            referrer: referrer || null,
            referrer_domain: referrerDomain ?? null,
            landing_page: landingPage,
            device_type: deviceInfo.device_type,
            browser: deviceInfo.browser,
            operating_system: deviceInfo.operating_system,
          };

          const { data, error: supabaseError } = await (supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .from('first_access') as any)
            .insert([payload])
            .select('id')
            .maybeSingle();

        if (supabaseError) {
          console.error('Erro ao registrar acesso no Supabase:', supabaseError);
          console.error('Detalhes do erro:', {
            message: supabaseError.message,
            details: supabaseError.details,
            hint: supabaseError.hint,
            code: supabaseError.code
          });
          
          // Se o erro for porque a tabela não existe, continuar mesmo assim
          if (supabaseError.code === '42P01' || supabaseError.message?.includes('does not exist')) {
            console.warn('Tabela first_access não encontrada. Continuando sem registro no banco.');
          } else {
            // Para outros erros, mostrar mensagem mas permitir continuar
            console.warn('Erro ao registrar no Supabase, mas permitindo acesso continuar');
          }
          } else if (data) {
            accessId = (data as { id: string })?.id || '';
            console.log('Acesso registrado com sucesso:', accessId);
          }
        } catch (supabaseErr) {
          console.error('Erro ao conectar com Supabase:', supabaseErr);
          // Continuar mesmo se o Supabase falhar
        }
      } else {
        console.warn('Supabase não configurado. Continuando sem registro no banco.');
      }

      // Salvar informações no localStorage (sempre, mesmo se Supabase falhar)
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userName', name.trim());
      if (accessId) {
        localStorage.setItem('firstAccessId', accessId);
      }

      // Redirecionar para a página de perfil
      navigate('/profile');
    } catch (err) {
      console.error('Erro inesperado:', err);
      // Mesmo com erro, permitir acesso se os dados básicos estão ok
      if (name.trim() && isAdult) {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userName', name.trim());
        navigate('/profile');
      } else {
        setError('Ocorreu um erro inesperado. Tente novamente.');
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <TrackingScripts />
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">
            pr<span className="text-primary">i</span>vacy
          </h1>
          <p className="text-gray-400 text-sm">Área de Membros Exclusiva</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Qual é o seu nome?
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-dark-lighter border border-dark-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
              placeholder="Digite seu nome"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="flex items-start gap-3 p-4 bg-dark-lighter border border-dark-lighter rounded-lg hover:border-primary/50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={isAdult}
                onChange={(e) => setIsAdult(e.target.checked)}
                className="mt-1 w-5 h-5 bg-dark-lighter border-dark-lighter rounded text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                disabled={isLoading}
              />
              <span className="text-sm text-gray-300 flex-1">
                Eu confirmo que sou <strong className="text-white">maior de idade</strong> e tenho pelo menos 18 anos
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading || !isAdult || !name.trim()}
            className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Ao continuar, você concorda com nossos termos de uso e política de privacidade
          </p>
        </div>
      </div>
    </div>
  );
};
