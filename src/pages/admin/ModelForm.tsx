import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Model } from '../../types';

export const ModelForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [model, setModel] = useState<Partial<Model>>({ name: '', username: '', bio: '', avatar_url: '', cover_url: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const isEditing = !!id;

  useEffect(() => {
    if (isEditing) {
      const fetchModel = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('models').select('*').eq('id', id).single();
        
        if (error) {
          setError(`Erro ao carregar modelo: ${error.message}`);
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

  const handleSuggestBio = async () => {
    if (!model.name) {
      alert('Preencha o nome da modelo para gerar uma bio.');
      return;
    }
    setIsSuggesting(true);
    const prompt = `Crie uma bio curta e magnética para o perfil de uma modelo no Privacy chamada ${model.name}. A bio deve ser convidativa, misteriosa e sugerir o tipo de conteúdo exclusivo que ela oferece.`;
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('gemini-generate', { body: { prompt } });
      if (invokeError) throw invokeError;
      if (data.error === 'LIMIT_EXCEEDED') {
        alert('⚠️ O assistente de IA atingiu o limite de uso da conta. Tente novamente mais tarde.');
        return;
      }
      if (data.error) throw new Error(data.error);
      setModel(prev => ({ ...prev, bio: data.generatedText.trim() }));
    } catch (err: any) {
      if (err.message.includes('LIMIT_EXCEEDED')) {
        alert('⚠️ O assistente de IA atingiu o limite de uso da conta. Tente novamente mais tarde.');
      } else {
        alert(`Erro ao sugerir bio: ${err.message}`);
      }
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: submissionError } = isEditing
      ? await supabase.from('models').update(model).eq('id', id)
      : await supabase.from('models').insert(model);

    if (submissionError) {
      setError(`Erro ao salvar: ${submissionError.message}`);
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
      
      <form onSubmit={handleSubmit} className="bg-privacy-surface p-8 rounded-lg space-y-6 max-w-2xl">
        {error && <p className="text-red-400 bg-red-500/10 p-3 rounded-md">{error}</p>}
        
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-privacy-text-secondary mb-2">Nome</label>
          <input type="text" name="name" value={model.name || ''} onChange={handleChange} className={inputStyle} required />
        </div>
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-privacy-text-secondary mb-2">Username (sem @)</label>
          <input type="text" name="username" value={model.username || ''} onChange={handleChange} className={inputStyle} required />
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="bio" className="block text-sm font-medium text-privacy-text-secondary">Bio</label>
            <button type="button" onClick={handleSuggestBio} disabled={isSuggesting} className="text-xs bg-primary/20 text-primary font-semibold px-2 py-1 rounded-md hover:bg-primary/40 disabled:opacity-50">
              {isSuggesting ? 'Gerando...' : 'Sugerir com IA ✨'}
            </button>
          </div>
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