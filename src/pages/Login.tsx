import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveUTMsToLocalStorage } from '../utils/utmParser';
import { TrackingScripts } from '../components/TrackingScripts';
import { registerFirstAccess } from '../lib/accessLogger';
import { Logo } from '../components/Logo';

export const Login: React.FC = () => {
  const [name, setName] = useState('');
  const [isAdult, setIsAdult] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (isAuthenticated) {
      // Mantém o comportamento atual para quem já está autenticado
      navigate('/modelo/carolina-andrade', { replace: true });
      return;
    }
    saveUTMsToLocalStorage();
  }, [navigate]);

  const validateFullName = (fullName: string): boolean => {
    const words = fullName.trim().split(/\s+/).filter(word => word.length > 0);
    return words.length >= 2;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateFullName(name)) {
      setError('Por favor, informe seu nome completo (nome e sobrenome).');
      return;
    }

    if (!isAdult) {
      setError('Você precisa confirmar que é maior de idade.');
      return;
    }

    setIsLoading(true);

    try {
      await registerFirstAccess({
        name: name.trim(),
        isAdult,
        landingPage: window.location.href,
      });
    } catch (err) {
      console.error('Falha ao registrar no Supabase, mas continuando:', err);
    } finally {
      // Autenticação "light" que você já usava
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userName', name.trim());

      // 🔥 NOVO: marcar que este usuário ganhou o conteúdo da Carolina
      // Isso será usado em "Minhas Compras" e no perfil dela.
      localStorage.setItem('welcomePurchaseCarolina', 'true');

      // Mantém o fluxo atual: deixa o RootRedirector decidir o destino
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-privacy-black flex items-center justify-center px-4">
      <TrackingScripts />
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Logo textSize="text-4xl" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-privacy-surface border border-privacy-border rounded-lg text-privacy-text-primary placeholder-privacy-text-secondary focus:outline-none focus:border-primary transition-colors"
              placeholder="Nome completo"
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
            disabled={isLoading || !isAdult || !name.trim()}
            className="w-full bg-primary hover:opacity-90 text-privacy-black font-semibold py-3 rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
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