import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Model } from '../../types';

export const ModelForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [model, setModel] = useState<Partial<Model>>({ name: '', username: '', bio: '', avatar_url: '', cover_url: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = !!id;

  useEffect(() => {
    if (isEditing) {
      const fetchModel = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('models').select('*').eq('id', id).single();
        if (error) {
          setError(error.message);
        } else if (data) {
          setModel(data);
        }
        setLoading(false);
      };
      fetchModel();
    }
  }, [id, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setModel(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = isEditing
      ? await supabase.from('models').update(model).eq('id', id)
      : await supabase.from('models').insert(model);

    if (error) {
      setError(error.message);
    } else {
      alert(`Modelo ${isEditing ? 'atualizada' : 'criada'} com sucesso!`);
      navigate('/admin/modelos');
    }
    setLoading(false);
  };

  const inputStyle = "w-full px-4 py-3 bg-privacy-surface border border-privacy-border rounded-lg text-privacy-text-primary placeholder-privacy-text-secondary focus:outline-none focus:border-primary transition-colors";

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">{isEditing ? 'Editar Modelo' : 'Nova Modelo'}</h1>
      
      {isEditing && (
        <div className="flex gap-4 mb-6">
            <Link to={`/admin/modelos/${id}/produtos`} className="bg-privacy-border hover:bg-primary/20 text-white font-semibold py-2 px-4 rounded-lg">
                Gerenciar Produtos
            </Link>
            <Link to={`/admin/modelos/${id}/conteudos`} className="bg-privacy-border hover:bg-primary/20 text-white font-semibold py-2 px-4 rounded-lg">
                Gerenciar Conteúdos
            </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-privacy-surface p-8 rounded-lg space-y-6 max-w-2xl">
        {error && <p className="text-red-400">{error}</p>}
        
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-privacy-text-secondary mb-2">Nome</label>
          <input type="text" name="name" value={model.name || ''} onChange={handleChange} className={inputStyle} required />
        </div>
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-privacy-text-secondary mb-2">Username (sem @)</label>
          <input type="text" name="username" value={model.username || ''} onChange={handleChange} className={inputStyle} required />
        </div>
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-privacy-text-secondary mb-2">Bio</label>
          <textarea name="bio" value={model.bio || ''} onChange={handleChange} className={inputStyle} rows={4}></textarea>
        </div>
        <div>
          <label htmlFor="avatar_url" className="block text-sm font-medium text-privacy-text-secondary mb-2">URL do Avatar</label>
          <input type="url" name="avatar_url" value={model.avatar_url || ''} onChange={handleChange} className={inputStyle} />
        </div>
        <div>
          <label htmlFor="cover_url" className="block text-sm font-medium text-privacy-text-secondary mb-2">URL da Capa (Cover)</label>
          <input type="url" name="cover_url" value={model.cover_url || ''} onChange={handleChange} className={inputStyle} />
        </div>

        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => navigate('/admin/modelos')} className="bg-privacy-border hover:opacity-80 text-white font-semibold py-2 px-6 rounded-lg">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="bg-primary hover:opacity-90 text-privacy-black font-semibold py-2 px-6 rounded-lg disabled:opacity-50">
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
};