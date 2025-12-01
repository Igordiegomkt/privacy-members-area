import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

export const ManageUsers: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres.' });
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { email, password },
      });

      if (error) {
        throw new Error(error.message);
      }
      
      if (data.error) {
        throw new Error(data.error);
      }

      setMessage({ type: 'success', text: `Usuário ${data.user.email} criado com sucesso!` });
      setEmail('');
      setPassword('');

    } catch (error: any) {
      setMessage({ type: 'error', text: `Erro ao criar usuário: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Gerenciar Usuários</h1>
      
      <div className="bg-dark-light p-8 rounded-lg shadow-lg max-w-lg">
        <h2 className="text-xl font-bold text-white mb-4">Criar Novo Usuário</h2>
        <form onSubmit={handleCreateUser} className="space-y-6">
          {message && (
            <div className={`px-4 py-3 rounded-lg text-sm ${
              message.type === 'success' 
                ? 'bg-green-500/10 border border-green-500/50 text-green-400' 
                : 'bg-red-500/10 border border-red-500/50 text-red-400'
            }`}>
              {message.text}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email do Novo Usuário
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-dark-lighter border border-dark-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
              placeholder="novo.usuario@email.com"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-dark-lighter border border-dark-lighter rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
              placeholder="••••••••"
              disabled={isLoading}
            />
             <p className="mt-1 text-xs text-gray-500">Mínimo de 6 caracteres.</p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary-dark text-dark font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Criando...' : 'Criar Usuário'}
          </button>
        </form>
      </div>
    </div>
  );
};