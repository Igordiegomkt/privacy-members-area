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
      navigate('/', { replace: true });
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
      // ANÁLISE: O fluxo antigo criava um registro no banco a cada login.
      // O fluxo restaurado agora verifica se já existe um ID de usuário da plataforma.
      // Se não existir, ele cria o registro e salva o ID. Se já existir, ele o reutiliza.
      // Isso garante um identificador estável para todo o tracking.
      let appUserId = localStorage.getItem('appUserId');

      if (!appUserId) {
        console.log('[Login.handleSubmit] Nenhum appUserId encontrado. Registrando novo acesso...');
        const newAccessId = await registerFirstAccess({
          name: name.trim(),
          isAdult,
          landingPage: window.location.href,
        });

        if (newAccessId) {
          appUserId = newAccessId;
          localStorage.setItem('appUserId', appUserId);
          console.log('[Login.handleSubmit] Novo acesso registrado. appUserId salvo:', appUserId);
        } else {
          // Fallback: se o registro falhar, não bloqueamos o usuário, mas o tracking fica limitado.
          console.warn('[Login.handleSubmit] Falha ao obter newAccessId do Supabase.');
        }
      } else {
        console.log('[Login.handleSubmit] appUserId reutilizado do localStorage:', appUserId);
      }

      // LÓGICA DE COMPATIBILIDADE: Mantém os flags antigos para garantir
      // que rotas protegidas e outros componentes não quebrem.
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userName', name.trim());

      // LÓGICA DE BOAS-VINDAS (SINTÉTICA): Conforme o plano, mantemos a flag
      // da Carolina no localStorage, pois o appUserId não é compatível com a
      // tabela de compras reais (user_purchases).
      localStorage.setItem('welcomePurchaseCarolina', 'true');

      // Redireciona para a raiz, onde o RootRedirector cuidará do destino final.
      navigate('/', { replace: true });

    } catch (err) {
      console.error('Falha crítica no processo de login:', err);
      setError('Ocorreu um erro inesperado. Tente novamente.');
      setIsLoading(false);
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