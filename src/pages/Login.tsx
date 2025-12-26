import * as React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { saveUTMsToLocalStorage } from '../utils/utmParser';
import { registerFirstAccess } from '../lib/accessLogger';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';
import { ensureWelcomePurchaseForCarolina } from '../lib/welcomePurchase';
import { AuthApiError } from '@supabase/supabase-js'; // Importando AuthApiError

const FIXED_PASSWORD = '12345678'; // Senha fixa para todos os usuários

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

  useEffect(() => {
    // Pré-preencher com dados do validador de link, se existirem
    const storedName = localStorage.getItem('link_validator_name');
    const storedEmail = localStorage.getItem('link_validator_email');
    
    // Prioridade: 1. URL (prefillEmail/Name) > 2. localStorage (link_validator) > 3. State inicial
    if (prefillEmail) {
        setEmail(prefillEmail);
    } else if (storedEmail) {
        setEmail(storedEmail);
    }
    
    if (prefillName) {
        setName(prefillName);
    } else if (storedName) {
        setName(storedName);
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

    if (!email.trim()) {
      setError('Por favor, informe seu e-mail.');
      return;
    }

    if (!isAdult) {
      setError('Você precisa confirmar que é maior de 18 anos.');
      return;
    }
    
    setIsLoading(true);

    // --- Lógica para pular a compra de boas-vindas se vier de link ---
    const skipWelcomePurchase = sessionStorage.getItem('skip_welcome_purchase') === '1';
    if (skipWelcomePurchase) {
        sessionStorage.removeItem('skip_welcome_purchase');
        console.log("[Login] Skipping welcome purchase due to skip_welcome_purchase flag.");
    }
    // -----------------------------------------------------------------

    try {
      let user;
      
      // 1. Tenta fazer login
      let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: FIXED_PASSWORD,
      });

      // 2. Se falhar por credenciais inválidas ou usuário não encontrado, tenta criar
      if (signInError) {
        const isAuthError = signInError instanceof AuthApiError;
        const isUserNotFound = isAuthError && (signInError.message.includes('Invalid login credentials') || signInError.message.includes('User not found'));

        if (isUserNotFound) {
          
          // Prepara metadados para o perfil
          const [firstName, ...lastNameParts] = name.trim().split(' ');
          const lastName = lastNameParts.join(' ') || null;

          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password: FIXED_PASSWORD,
            options: {
              data: {
                first_name: firstName || null,
                last_name: lastName,
              },
            },
          });

          if (signUpError) {
            // Se o erro for que o usuário já existe (o que pode acontecer se o email não estiver confirmado),
            // tentamos o login novamente. Se for outro erro, lançamos.
            if (!signUpError.message.includes('User already exists')) {
                throw signUpError;
            }
          }

          // 3. Tenta login novamente após o cadastro (ou se já existia)
          ({ data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password: FIXED_PASSWORD,
          }));
        }
      }
      
      if (signInError) {
        // Se o erro for 'Email not confirmed', o usuário precisa desabilitar a confirmação no painel Supabase.
        if (signInError.message.includes('Email not confirmed')) {
            setError('Seu e-mail não está confirmado. Por favor, peça ao administrador para desabilitar a confirmação de e-mail no painel do Supabase.');
            setIsLoading(false);
            return;
        }
        throw signInError;
      }
      
      if (!signInData.user) {
        throw new Error('Falha ao obter sessão após autenticação.');
      }
      
      user = signInData.user;
      
      console.log("[Login] logged in", { userId: user.id, email: user.email });
      
      // 4. Pós-login: Garantir compra de boas-vindas e registrar acesso
      
      // O ID do usuário agora é o ID do Supabase Auth
      localStorage.setItem('userName', name.trim() || user.email || 'Usuário');
      localStorage.setItem('userIsAdult', isAdult.toString());
      
      // GARANTIR COMPRA VIP DA CAROLINA (APENAS SE NÃO HOUVER FLAG DE PULAR)
      if (!skipWelcomePurchase) {
        console.log("[Login] calling ensureWelcomePurchaseForCarolina");
        await ensureWelcomePurchaseForCarolina(user.id);
      }
      
      // Registra o primeiro acesso (para fins de analytics/tracking)
      await registerFirstAccess({
        name: name.trim() || user.email || 'Usuário',
        isAdult,
        landingPage: window.location.href,
      });

      // Redireciona para a rota de retorno ou para a raiz.
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