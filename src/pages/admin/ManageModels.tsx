import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Model } from '../../types';

export const ManageModels: React.FC = () => {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('models').select('*').order('created_at', { ascending: false });
      if (error) {
        setError(error.message);
      } else {
        setModels(data);
      }
      setLoading(false);
    };
    fetchModels();
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Gerenciar Modelos</h1>
        <Link to="/admin/modelos/nova" className="bg-primary hover:opacity-90 text-privacy-black font-semibold py-2 px-4 rounded-lg">
          Nova Modelo
        </Link>
      </div>

      {loading && <p className="text-center text-privacy-text-secondary">Carregando...</p>}
      {error && <p className="text-center text-red-400">{error}</p>}

      {!loading && !error && (
        <div className="bg-privacy-surface rounded-lg shadow-lg overflow-hidden">
          <table className="w-full text-sm text-left text-privacy-text-secondary">
            <thead className="text-xs uppercase bg-privacy-border">
              <tr>
                <th className="px-6 py-3">Nome</th>
                <th className="px-6 py-3">Username</th>
                <th className="px-6 py-3">Criada em</th>
                <th className="px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {models.map(model => (
                <tr key={model.id} className="border-b border-privacy-border hover:bg-privacy-border/50">
                  <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                    <img src={model.avatar_url} alt={model.name} className="w-10 h-10 rounded-full object-cover" />
                    {model.name}
                  </td>
                  <td className="px-6 py-4">@{model.username}</td>
                  <td className="px-6 py-4">{new Date(model.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4 space-x-4">
                    <Link to={`/admin/modelos/${model.id}`} className="font-medium text-primary hover:underline">
                      Editar
                    </Link>
                     <Link to={`/admin/modelos/${model.id}/produtos`} className="font-medium text-blue-400 hover:underline">
                      Produtos
                    </Link>
                     <Link to={`/admin/modelos/${model.id}/conteudos`} className="font-medium text-green-400 hover:underline">
                      Conteúdos
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};