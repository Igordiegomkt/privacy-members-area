import * as React from 'react';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { validateAccessToken, saveGrant } from '../lib/accessGrant';
import { LinkIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext'; // Importando useAuth

export const AccessLinkEntry: React.FC = () => {
  const { token: encodedToken } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth(); // Obtém o usuário logado (se houver)
  
  const [status, setStatus] = useState<'initial' | 'loading' | 'success' | 'error'>('initial');
  const [message, setMessage] = useState('Informe seus dados para validar o acesso.');
  const [visitorName, setVisitorName] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const inputStyle = "w-full px-4 py-3 bg-privacy-black border border-privacy-border rounded-lg text-privacy-text-primary placeholder-privacy-text-secondary focus:outline-none focus:border-primary transition-colors";

  useEffect(() => {
    // Se o usuário já estiver logado, preenche os campos
    if (user) {
        setVisitorEmail(user.email || '');
        setVisitorName(user.first_name || '');
    }
  }, [user]);

  const handleValidation = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setValidationError(null);
    
    if (!encodedToken) {
      setMessage('Link de acesso inválido ou incompleto.');
      setStatus('error');
      setTimeout(() => navigate('/login', { replace: true }), 3000);
      return;
    }
    
    // Validação de Email (Obrigatório)
    if (!visitorEmail.trim() || !visitorEmail.includes('@')) {
        setValidationError('O email é obrigatório e deve ser válido.');
        return;
    }
    
    let tokenNormalized: string;
    try {
        // 1. Decode e Normalização
        tokenNormalized = decodeURIComponent(encodedToken).trim();
    } catch (err) {
        console.error('Failed to decode token:', err);
        setMessage('O formato do link é inválido.');
        setStatus('error');
        setTimeout(() => navigate('/login', { replace: true }), 3000);
        return;
    }
    
    setStatus('loading');
    setMessage('Validando seu link de acesso...');

    // 2. Chamar a EF com dados do visitante e token normalizado
    const grantResponse = await validateAccessToken(tokenNormalized, {
        visitor_name: visitorName,
        visitor_email: visitorEmail,
        user_id: user?.id,
    });

    if (grantResponse && grantResponse.ok && grantResponse.grant) {
      saveGrant(grantResponse.grant);
      
      // PARTE A: Persistir Nome e Email no localStorage (para pré-preenchimento no login)
      if (visitorName) localStorage.setItem('link_validator_name', visitorName);
      if (visitorEmail) localStorage.setItem('link_validator_email', visitorEmail);
      
      setMessage('Acesso liberado com sucesso! Redirecionando para o login...');
      setStatus('success');
      // Redireciona para a raiz para forçar o AuthContext a reavaliar a sessão
      setTimeout(() => navigate('/', { replace: true }), 1000);
    } else {
      const code = grantResponse?.code || 'UNKNOWN_ERROR';
      let errorMessage = grantResponse?.message || 'O link de acesso é inválido, expirou ou atingiu o limite de usos.';
      
      if (code === 'INVALID_LINK') errorMessage = 'Link de acesso não encontrado.';
      if (code === 'EXPIRED_LINK') errorMessage = 'Link expirado.';
      if (code === 'MAX_USES') errorMessage = 'Limite de usos atingido.';
      if (code === 'INACTIVE_LINK') errorMessage = 'Link inativo.';
      
      setMessage(errorMessage);
      setStatus('error');
      // Redireciona para o login sem o grant
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    }
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
        
        <form onSubmit={handleValidation} className="space-y-4">
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