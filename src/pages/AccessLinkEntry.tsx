import * as React from 'react';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { validateAccessToken, saveGrant } from '../lib/accessGrant';
import { LinkIcon } from 'lucide-react';

export const AccessLinkEntry: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Validando seu link de acesso...');

  useEffect(() => {
    if (!token) {
      setMessage('Link de acesso inválido ou incompleto.');
      setStatus('error');
      // Redireciona após um pequeno atraso
      setTimeout(() => navigate('/'), 3000);
      return;
    }

    const processToken = async () => {
      const grant = await validateAccessToken(token);

      if (grant) {
        saveGrant(grant);
        setMessage('Acesso liberado com sucesso! Redirecionando...');
        setStatus('success');
        // Redireciona para a home após salvar o grant
        setTimeout(() => navigate('/', { replace: true }), 1000);
      } else {
        setMessage('O link de acesso é inválido, expirou ou atingiu o limite de usos.');
        setStatus('error');
        // Redireciona para a home sem o grant
        setTimeout(() => navigate('/'), 3000);
      }
    };

    processToken();
  }, [token, navigate]);

  const statusClasses = {
    loading: 'text-primary',
    success: 'text-green-400',
    error: 'text-red-400',
  };

  return (
    <div className="min-h-screen bg-privacy-black text-white flex items-center justify-center text-center px-4">
      <div className="w-full max-w-sm bg-privacy-surface p-8 rounded-lg shadow-lg">
        <LinkIcon className={`w-12 h-12 mx-auto mb-4 ${statusClasses[status]}`} />
        <h1 className="text-2xl font-bold mb-2">Acesso por Link</h1>
        <p className="text-privacy-text-secondary">{message}</p>
        {status === 'loading' && (
          <div className="mt-6 animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
        )}
      </div>
    </div>
  );
};