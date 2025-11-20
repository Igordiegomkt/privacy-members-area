import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveUTMsToLocalStorage } from '../utils/utmParser';
import { TrackingScripts } from '../components/TrackingScripts';
import { registerFirstAccess } from '../lib/accessLogger';

export const Login: React.FC = () => {
  const [name, setName] = useState('');
  const [isAdult, setIsAdult] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Verificar se já está autenticado e redirecionar automaticamente
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const userName = localStorage.getItem('userName');
    
    if (isAuthenticated && userName) {
      // Usuário já registrado, redirecionar direto para o perfil
      console.log('Usuário já autenticado, redirecionando...');
      navigate('/profile', { replace: true });
      return;
    }
    
    // Capturar UTMs quando o componente carregar
    saveUTMsToLocalStorage();
  }, [navigate]);

  // Função para validar nome completo (nome e sobrenome)
  const validateFullName = (fullName: string): boolean => {
    const trimmedName = fullName.trim();
    if (!trimmedName) return false;
    
    // Verifica se tem pelo menos 2 palavras (nome e sobrenome)
    const words = trimmedName.split(/\s+/).filter(word => word.length > 0);
    return words.length >= 2;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validar se o nome foi preenchido
    if (!name.trim()) {
      setError('Por favor, informe seu nome');
      alert('⚠️ Por favor, informe seu nome completo (nome e sobrenome)');
      return;
    }

    // Validar se tem nome e sobrenome
    if (!validateFullName(name)) {
      setError('Por favor, informe seu nome completo (nome e sobrenome)');
      alert('⚠️ Por favor, informe seu nome completo com nome e sobrenome.\n\nExemplo: João Silva');
      return;
    }

    if (!isAdult) {
      setError('Você precisa confirmar que é maior de idade para continuar');
      alert('⚠️ Você precisa confirmar que é maior de idade para continuar');
      return;
    }

    setIsLoading(true);

    try {
      const landingPage = window.location.href;
      const trimmedName = name.trim();
      const accessId = await registerFirstAccess({
        name: trimmedName,
        isAdult,
        landingPage,
      });

      // Salvar informações no localStorage (sempre, mesmo se Supabase falhar)
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userName', trimmedName);
      localStorage.setItem('userIsAdult', isAdult ? 'true' : 'false');
      if (accessId) {
        localStorage.setItem('firstAccessId', accessId);
      }

      // Redirecionar para a página de perfil
      navigate('/profile');
    } catch (err) {
      console.error('Erro inesperado:', err);
      // Mesmo com erro, permitir acesso se os dados básicos estão ok
      if (name.trim() && isAdult) {
        const trimmedName = name.trim();
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userName', trimmedName);
        localStorage.setItem('userIsAdult', isAdult ? 'true' : 'false');
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
              Qual é o seu nome completo?
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-dark-lighter border border-dark-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
              placeholder="Ex: João Silva"
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">Informe seu nome e sobrenome</p>
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
