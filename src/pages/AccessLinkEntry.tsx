import * as React from 'react';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { validateAccessToken, saveGrant } from '../lib/accessGrant';
import { LinkIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext'; // Importando useAuth

export const AccessLinkEntry: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth(); // Obtém o usuário logado (se houver)
  
  const [status, setStatus] = useState<'initial' | 'loading' | 'success' | 'error'>('initial');
  const [message, setMessage] = useState('Informe seus dados para validar o acesso.');
  const [visitorName, setVisitorName] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  
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
    
    if (!token) {
      setMessage('Link de acesso inválido ou incompleto.');
      setStatus('error');
      setTimeout(() => navigate('/login', { replace: true }), 3000);
      return;
    }
    
    setStatus('loading');
    setMessage('Validando seu link de acesso...');

    // 1. Chamar a EF com dados do visitante
    const grant = await validateAccessToken(token, {
        visitor_name: visitorName,
        visitor_email: visitorEmail,
        user_id: user?.id,
    });

    if (grant) {
      saveGrant(grant);
      setMessage('Acesso liberado com sucesso! Redirecionando para o login...');
      setStatus('success');
      // Redireciona para o login para que o usuário complete a autenticação
      setTimeout(() => navigate('/login', { replace: true }), 1000);
    } else {
      setMessage('O link de acesso é inválido, expirou ou atingiu o limite de usos.');
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
        <p className="text-privacy-text-secondary mb-6">{message}</p>
        
        <form onSubmit={handleValidation} className="space-y-4">
            <div>
                <input
                    type="text"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    className={inputStyle}
                    placeholder="Seu nome (opcional)"
                />
            </div>
            <div>
                <input
                    type="email"
                    value={visitorEmail}
                    onChange={(e) => setVisitorEmail(e.target.value)}
                    className={inputStyle}
                    placeholder="Seu e-mail (opcional)"
                />
            </div>
            <button
                type="submit"
                className="w-full bg-primary hover:opacity-90 text-privacy-black font-semibold py-3 rounded-lg transition-opacity"
            >
                Validar Acesso
            </button>
        </form>
      </div>
    </div>
  );
};