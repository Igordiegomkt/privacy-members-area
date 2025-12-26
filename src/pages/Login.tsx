import * as React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { saveUTMsToLocalStorage } from '../utils/utmParser';
import { registerFirstAccess } from '../lib/accessLogger';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';
// Removendo AuthApiError, pois usaremos a Edge Function

const FIXED_PASSWORD = '12345678'; // Senha fixa para todos os usuários

// Helper para normalizar o email
const normalizeEmail = (email: string): string => {
    return email.trim().toLowerCase();
};

export const Login: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isAdult, setIsAdult] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo'); // Captura o parâmetro returnTo
  const prefillEmail = searchParams.get('prefillEmail'); // Novo: Email para pré-preenchimento
  const prefillName = searchParams.get('prefillName'); // Novo: Nome para pré-preenchimento
  const [pendingGrantEmail, setPendingGrantEmail] = useState<string | null>(null);

  useEffect(() => {
    // Pré-preencher com dados do validador de link, se existirem
    const storedName = localStorage.getItem('link_validator_name');
    const storedEmail = localStorage.getItem('link_validator_email');
    
    // 1. Verificar se há um GRANT pendente no sessionStorage
    const pendingGrantRaw = sessionStorage.getItem('access_link_pending');
    if (pendingGrantRaw) {
        try {
            const pendingGrant = JSON.parse(pendingGrantRaw);
            const normalizedPendingEmail = normalizeEmail(pendingGrant.visitor_email);
            setPendingGrantEmail(normalizedPendingEmail);
            setEmail(normalizedPendingEmail); // Pré-preenche com o email do link
            setName(pendingGrant.visitor_name || '');
        } catch (e) {
            sessionStorage.removeItem('access_link_pending');
        }
    } else {
        // 2. Prioridade: URL > localStorage > State inicial
        if (prefillEmail) {
            setEmail(normalizeEmail(prefillEmail));
        } else if (storedEmail) {
            setEmail(normalizeEmail(storedEmail));
        }
        
        if (prefillName) {
            setName(prefillName);
        } else if (storedName) {
            setName(storedName);
        }
    }
    
    // Verifica se já existe uma sessão Supabase ativa
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Se já estiver logado, redireciona para returnTo ou para a Home
        navigate(returnTo || '/', { replace: true });
        return;
      }
      saveUTMsToLocalStorage();
    });
  }, [navigate, returnTo, prefillEmail, prefillName]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      setError('Por favor, informe seu e-mail.');
      return;
    }

    if (!isAdult) {
      setError('Você precisa confirmar que é maior de 18 anos.');
      return;
    }
    
    setIsLoading(true);

    try {
      // Prepara metadados para o perfil (usado na criação)
      const [firstName, ...lastNameParts] = name.trim().split(' ');
      const lastName = lastNameParts.join(' ') || null;
      
      // 1. Chama a Edge Function para criar ou logar o usuário
      const { data, error: invokeError } = await supabase.functions.invoke('create-user-and-login', {
        body: {
          email: normalizedEmail,
          password: FIXED_PASSWORD,
          userData: {
            first_name: firstName || null,
            last_name: lastName,
          },
        },
      });

      if (invokeError) {
        console.error('[Login] Edge Function invoke error:', invokeError);
        throw new Error(invokeError.message || 'Erro de comunicação com o servidor.');
      }
      
      if (!data || data.ok === false) {
        console.error('[Login] Edge Function logic error:', data);
        throw new Error(data?.message || 'Falha ao autenticar. Tente novamente.');
      }
      
      const { user, session } = data;

      if (!user || !session) {
        throw new Error('Falha ao obter sessão após autenticação.');
      }
      
      console.log("[Login] logged in", { userId: user.id, email: user.email });
      
      // 2. Pós-login: Registrar acesso
      
      // O ID do usuário agora é o ID do Supabase Auth
      localStorage.setItem('userName', name.trim() || user.email || 'Usuário');
      localStorage.setItem('userIsAdult', isAdult.toString());
      
      // Registra o primeiro acesso (para fins de analytics/tracking)
      await registerFirstAccess({
        name: name.trim() || user.email || 'Usuário',
        isAdult,
        landingPage: window.location.href,
      });

      // 3. Redireciona para a rota de retorno ou para a raiz.
      navigate(returnTo || '/', { replace: true });

    } catch (err: any) {
      console.error('Falha crítica no processo de autenticação:', err);
      setError(err.message || 'Ocorreu um erro inesperado. Tente novamente.');
      setIsLoading(false);
    }
  };

  const inputStyle = "w-full px-4 py-3 bg-privacy-surface border border-privacy-border rounded-lg text-privacy-text-primary placeholder-privacy-text-secondary focus:outline-none focus:border-primary transition-colors";

  return (
    <div className="min-h-screen bg-privacy-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Logo textSize="text-4xl" />
          <p className="text-privacy-text-secondary mt-2">Acesse com seu e-mail</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          {pendingGrantEmail && (
            <div className="bg-blue-500/10 border border-blue-500/50 text-blue-400 px-4 py-3 rounded-lg text-sm">
                <p className="font-semibold">Acesso VIP Pendente!</p>
                <p className="text-xs mt-1">Use este email para entrar na conta correta e liberar seu acesso permanente.</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-privacy-text-secondary mb-2 text-left">
              Email *
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputStyle}
              placeholder="seuemail@exemplo.com"
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-privacy-text-secondary mb-2 text-left">
              Nome
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputStyle}
              placeholder="Seu nome (opcional)"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isAdult}
                onChange={(e) => setIsAdult(e.target.checked)}
                className="w-5 h-5 bg-privacy-surface border-privacy-border rounded text-primary focus:ring-primary focus:ring-offset-privacy-black"
                disabled={isLoading}
              />
              <span className="text-sm text-privacy-text-secondary">
                Confirmo que sou maior de 18 anos.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading || !isAdult || !email.trim()}
            className="w-full bg-primary hover:opacity-90 text-privacy-black font-semibold py-3 rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Acessando...' : 'Entrar'}
          </button>
          
          <p className="text-xs text-privacy-text-secondary text-center pt-1">
            Lembre que esse email será utilizado sempre que for fazer login.
          </p>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-privacy-text-secondary">
            Ao continuar, você concorda com nossos Termos e Política de Privacidade.
          </p>
        </div>
      </div>
    </div>
  );
};