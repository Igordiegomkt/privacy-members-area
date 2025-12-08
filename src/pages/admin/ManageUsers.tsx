import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { User } from '@supabase/supabase-js';

const UserList: React.FC<{ userListKey: number }> = ({ userListKey }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data, error: invokeError } = await supabase.functions.invoke('get-users');
      if (invokeError) throw invokeError;
      
      if (data.ok === false) throw new Error(data.error || 'Erro desconhecido ao listar usuários.');
      
      setUsers(data.users);
    } catch (err: any) {
      setError(`Erro ao buscar usuários: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, userListKey]);

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o usuário ${userEmail}? Esta ação não pode ser desfeita.`)) {
      try {
        const { data, error } = await supabase.functions.invoke('delete-user', {
          body: { userIdToDelete: userId },
        });
        if (error) throw error;
        
        if (data.ok === false) {
          alert(`Erro ao excluir usuário: ${data.error}`);
          return;
        }
        
        alert('Usuário excluído com sucesso.');
        fetchUsers(); // Refresh the list
      } catch (err: any) {
        alert(`Erro ao excluir usuário: ${err.message}`);
      }
    }
  };

  if (loading) {
    return <div className="text-center text-privacy-text-secondary">Carregando usuários...</div>;
  }

  if (error) {
    return <div className="text-center text-red-400">{error}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-privacy-text-secondary">
        <thead className="text-xs text-privacy-text-secondary uppercase bg-privacy-border">
          <tr>
            <th scope="col" className="px-6 py-3">Email</th>
            <th scope="col" className="px-6 py-3">Criado em</th>
            <th scope="col" className="px-6 py-3">Último Login</th>
            <th scope="col" className="px-6 py-3">Ações</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="bg-privacy-surface border-b border-privacy-border hover:bg-privacy-border/50">
              <td className="px-6 py-4 font-medium text-privacy-text-primary whitespace-nowrap">{user.email}</td>
              <td className="px-6 py-4">{new Date(user.created_at).toLocaleDateString('pt-BR')}</td>
              <td className="px-6 py-4">{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('pt-BR') : 'Nunca'}</td>
              <td className="px-6 py-4">
                <button
                  onClick={() => handleDeleteUser(user.id, user.email!)}
                  disabled={currentUser?.id === user.id}
                  className="font-medium text-red-500 hover:text-red-400 disabled:text-privacy-text-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Excluir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};


export const ManageUsers: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userListKey, setUserListKey] = useState(0);

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

      if (error) throw new Error(error.message);
      
      if (data.ok === false) throw new Error(data.error || 'Erro desconhecido ao criar usuário.');

      setMessage({ type: 'success', text: `Usuário ${data.user.email} criado com sucesso!` });
      setEmail('');
      setPassword('');
      setUserListKey(prev => prev + 1);

    } catch (error: any) {
      setMessage({ type: 'error', text: `Erro ao criar usuário: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-privacy-text-primary mb-6">Gerenciar Usuários</h1>
      
      <div className="bg-privacy-surface p-8 rounded-lg shadow-lg max-w-lg mb-8">
        <h2 className="text-xl font-bold text-privacy-text-primary mb-4">Criar Novo Usuário Admin</h2>
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
            <label htmlFor="email" className="block text-sm font-medium text-privacy-text-secondary mb-2">
              Email do Novo Usuário
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-privacy-surface border border-privacy-border rounded-lg text-privacy-text-primary placeholder-privacy-text-secondary focus:outline-none focus:border-primary transition-colors"
              placeholder="novo.usuario@email.com"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-privacy-text-secondary mb-2">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-privacy-surface border border-privacy-border rounded-lg text-privacy-text-primary placeholder-privacy-text-secondary focus:outline-none focus:border-primary transition-colors"
              placeholder="••••••••"
              disabled={isLoading}
            />
             <p className="mt-1 text-xs text-privacy-text-secondary">Mínimo de 6 caracteres.</p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary-dark text-privacy-black font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Criando...' : 'Criar Usuário'}
          </button>
        </form>
      </div>

      <div className="bg-privacy-surface p-8 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold text-privacy-text-primary mb-4">Usuários Admin Existentes</h2>
        <UserList key={userListKey} userListKey={userListKey} />
      </div>
    </div>
  );
};