import * as React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { validateAccessToken, saveGrant } from '../lib/accessGrant';
import { LinkIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { registerFirstAccess } from '../lib/accessLogger';

// Chave para armazenar dados pendentes de validação GRANT
const PENDING_GRANT_KEY = 'access_link_pending'; // Nome da chave unificada
const ACCESS_LOG_KEY = 'vip_link_access_logged';

interface PendingGrant {
    token: string;
    visitor_name: string;
    visitor_email: string;
}

// Helper para normalizar o email
const normalizeEmail = (email: string): string => {
    return email.trim().toLowerCase();
};

export const AccessLinkEntry: React.FC = () => {
  const { token: encodedToken } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, isLoading: isLoadingAuth } = useAuth();
  
  const [status, setStatus] = useState<'initial' | 'loading' | 'success' | 'error'>('initial');
  const [message, setMessage] = useState('Informe seus dados para validar o acesso.');
  const [visitorName, setVisitorName] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const inputStyle = "w-full px-4 py-3 bg-privacy-black border border-privacy-border rounded-lg text-privacy-text-primary placeholder-privacy-text-secondary focus:outline-none focus:border-primary transition-colors";

  // 1. Lógica de Validação Centralizada
  const handleValidation = useCallback(async (token: string, name: string, email: string, userId: string | undefined) => {
    setValidationError(null);
    setStatus('loading');
    setMessage('Validando seu link de acesso...');
    
    const normalizedEmail = normalizeEmail(email);

    // 2. Chamar a EF com dados do visitante e token normalizado
    const grantResponse = await validateAccessToken(token, {
        visitor_name: name,
        visitor_email: normalizedEmail,
        user_id: userId,
    });

    if (grantResponse && grantResponse.ok && grantResponse.grant) {
      const grant = grantResponse.grant;
      
      // PARTE A: Persistir Nome e Email no localStorage (para pré-preenchimento no login)
      if (name) localStorage.setItem('link_validator_name', name);
      if (normalizedEmail) localStorage.setItem('link_validator_email', normalizedEmail);
      
      // 3. Roteamento baseado no link_type
      if (grant.link_type === 'access') {
        // ACCESS: Salva grant temporário no localStorage
        saveGrant(grant);
        setMessage('Acesso temporário liberado com sucesso! Redirecionando...');
      } else if (grant.link_type === 'grant') {
        // GRANT: A compra permanente foi criada pela RPC grant_access_link.
        setMessage('Acesso permanente liberado com sucesso! Redirecionando...');
      }
      
      setStatus('success');
      
      // Limpa o estado pendente se houver
      sessionStorage.removeItem(PENDING_GRANT_KEY);
      
      // Registra o acesso (para fins de analytics/tracking)
      registerFirstAccess({
        name: name || normalizedEmail || 'Usuário VIP Link',
        isAdult: localStorage.getItem('userIsAdult') === 'true',
        landingPage: `${window.location.origin}/acesso-link-validado`,
      }).catch(err => {
        console.error('[AccessLinkEntry] Failed to log access:', err);
      });
      
      // Redireciona para a raiz para forçar o AuthContext a reavaliar a sessão
      setTimeout(() => navigate('/', { replace: true }), 1000);

    } else {
      const code = grantResponse?.code || 'UNKNOWN_ERROR';
      let errorMessage = grantResponse?.message || 'O link de acesso é inválido, expirou ou atingiu o limite de usos.';
      
      if (code === 'INVALID_LINK') errorMessage = 'Link de acesso não encontrado.';
      if (code === 'EXPIRED_LINK') errorMessage = 'Link expirado.';
      if (code === 'MAX_USES') errorMessage = 'Limite de usos atingido.';
      if (code === 'INACTIVE_LINK') errorMessage = 'Link inativo.';
      if (code === 'EMAIL_REQUIRED') errorMessage = 'O email é obrigatório para validar o acesso.';
      
      // 4. Lógica de Redirecionamento para Login (Apenas para GRANT)
      if (code === 'LOGIN_REQUIRED' && encodedToken) {
          setMessage('Este link exige login para acesso permanente. Redirecionando...');
          setStatus('loading');
          
          // Salva o estado pendente
          const pendingGrant: PendingGrant = {
              token: token,
              visitor_name: name,
              visitor_email: normalizedEmail,
          };
          sessionStorage.setItem(PENDING_GRANT_KEY, JSON.stringify(pendingGrant));
          
          // Redireciona para o login, voltando para esta mesma rota, com prefill
          const prefillParams = new URLSearchParams();
          prefillParams.set('returnTo', `/acesso/${encodedToken}`);
          prefillParams.set('prefillEmail', normalizedEmail);
          if (name) prefillParams.set('prefillName', name);
          
          setTimeout(() => navigate(`/login?${prefillParams.toString()}`, { replace: true }), 500);
          return;
      }
      
      // Se for erro de validação (ex: email required), voltamos ao formulário com a mensagem
      if (code === 'EMAIL_REQUIRED') {
          setValidationError(errorMessage);
          setStatus('initial');
          return;
      }
      
      setMessage(errorMessage);
      setStatus('error');
      // Redireciona para o login sem o grant
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    }
  }, [encodedToken, navigate]);

  // Efeito para pré-preencher e lidar com a retomada pós-login
  useEffect(() => {
    if (isLoadingAuth) return;

    let tokenNormalized: string;
    try {
        if (!encodedToken) throw new Error('Token missing');
        tokenNormalized = decodeURIComponent(encodedToken).trim();
    } catch (err) {
        setMessage('O formato do link é inválido.');
        setStatus('error');
        setTimeout(() => navigate('/login', { replace: true }), 3000);
        return;
    }

    // Tenta carregar o estado pendente
    const pendingGrantRaw = sessionStorage.getItem(PENDING_GRANT_KEY);
    
    // 1. Retomada Pós-Login (Usuário logado E estado pendente)
    if (user?.id && pendingGrantRaw) {
        const pendingGrant: PendingGrant = JSON.parse(pendingGrantRaw);
        
        // Se o token do URL for diferente do token pendente, ignora o pendente
        if (pendingGrant.token !== tokenNormalized) {
            sessionStorage.removeItem(PENDING_GRANT_KEY);
            // Continua para o fluxo normal (2.)
        } else {
            // Auto-submete a validação com o user_id
            setVisitorName(pendingGrant.visitor_name);
            setVisitorEmail(pendingGrant.visitor_email);
            
            // Chama a validação com o user.id
            handleValidation(pendingGrant.token, pendingGrant.visitor_name, pendingGrant.visitor_email, user.id);
            return;
        }
    }
    
    // 2. Fluxo Normal (Usuário logado ou deslogado, sem estado pendente)
    if (status === 'initial') {
        // Pré-preencher com dados do validador de link, se existirem
        const storedName = localStorage.getItem('link_validator_name');
        const storedEmail = localStorage.getItem('link_validator_email');
        
        const initialEmail = user ? normalizeEmail(user.email || storedEmail || '') : normalizeEmail(storedEmail || '');
        const initialName = user ? user.first_name || storedName || '' : storedName || '';
        
        setVisitorEmail(initialEmail);
        setVisitorName(initialName);
        
        // NOVO: Se o usuário está logado e temos um email, tenta validar imediatamente (para links ACCESS ou GRANT que não exigem formulário)
        if (user?.id && initialEmail) {
            // Auto-submete a validação
            handleValidation(tokenNormalized, initialName, initialEmail, user.id);
            return; // Sai do useEffect para evitar renderizar o formulário
        }
    }
    
  }, [encodedToken, user, isLoadingAuth, navigate, handleValidation, status]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!encodedToken) return;
    
    let tokenNormalized: string;
    try {
        tokenNormalized = decodeURIComponent(encodedToken).trim();
    } catch (err) {
        console.error('Failed to decode token:', err);
        setMessage('O formato do link é inválido.');
        setStatus('error');
        return;
    }
    
    const normalizedEmail = normalizeEmail(visitorEmail);
    
    // Validação de Email (Obrigatório no frontend antes de chamar a EF)
    if (!normalizedEmail) {
        setValidationError('O email é obrigatório.');
        return;
    }
    
    // Chama a validação com o user.id se estiver logado, senão undefined
    handleValidation(tokenNormalized, visitorName, normalizedEmail, user?.id);
  };


  const statusClasses = {
    initial: 'text-primary',
    loading: 'text-primary',
    success: 'text-green-400',
    error: 'text-red-400',
  };
  
  // Se o status não for 'initial', mostra o resultado
  if (status !== 'initial') {
      return (
        <div className="min-h-screen bg-privacy-black text-white flex items-center justify-center text-center px-4">
          <div className="w-full max-w-sm bg-privacy-surface p-8 rounded-lg shadow-lg">
            <LinkIcon className={`w-12 h-12 mx-auto mb-4 ${statusClasses[status]}`} />
            <h1 className="text-2xl font-bold mb-2">Acesso por Link</h1>
            <p className="text-privacy-text-secondary">{message}</p>
            {status === 'loading' && (
              <div className="mt-6 animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
            )}
            {status === 'error' && (
                <button 
                    onClick={() => navigate('/login', { replace: true })}
                    className="mt-6 bg-primary text-black font-semibold py-2 px-4 rounded-lg"
                >
                    Ir para o Login
                </button>
            )}
          </div>
        </div>
      );
  }

  // Estado inicial: mostra o formulário
  return (
    <div className="min-h-screen bg-privacy-black flex items-center justify-center text-center px-4">
      <div className="w-full max-w-sm bg-privacy-surface p-8 rounded-lg shadow-lg">
        <LinkIcon className={`w-12 h-12 mx-auto mb-4 ${statusClasses[status]}`} />
        <h1 className="text-2xl font-bold mb-2">Acesso por Link</h1>
        <p className="text-privacy-text-secondary mb-6">Informe seus dados para validar o acesso.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
            {validationError && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm text-left">
                    {validationError}
                </div>
            )}
            <div>
                <label htmlFor="visitorName" className="block text-sm font-medium text-privacy-text-secondary mb-1 text-left">
                    Nome
                </label>
                <input
                    id="visitorName"
                    type="text"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    className={inputStyle}
                    placeholder="Seu nome"
                />
            </div>
            <div>
                <label htmlFor="visitorEmail" className="block text-sm font-medium text-privacy-text-secondary mb-1 text-left">
                    Email *
                </label>
                <input
                    id="visitorEmail"
                    type="email"
                    value={visitorEmail}
                    onChange={(e) => setVisitorEmail(e.target.value)}
                    required
                    className={inputStyle}
                    placeholder="seuemail@exemplo.com"
                />
            </div>
            <button
                type="submit"
                className="w-full bg-primary hover:opacity-90 text-privacy-black font-semibold py-3 rounded-lg transition-opacity"
            >
                Validar Acesso
            </button>
            <p className="text-xs text-privacy-text-secondary text-center pt-1">
                Lembre que esse email será utilizado sempre que for fazer login.
            </p>
        </form>
      </div>
    </div>
  );
};