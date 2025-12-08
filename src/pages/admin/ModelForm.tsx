import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Model } from '../../types';

export const ModelForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [model, setModel] = useState<Partial<Model>>({ name: '', username: '', bio: '', avatar_url: '', cover_url: '' });
  const [basePrice, setBasePrice] = useState<string>('');
  const [baseProductName, setBaseProductName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const isEditing = !!id;

  useEffect(() => {
    const fetchModelData = async () => {
      if (!isEditing) return;
      setLoading(true);
      
      const { data, error } = await supabase.from('models').select('*').eq('id', id).single();
      if (error) {
        setError(`Erro ao carregar modelo: ${error.message}`);
        setLoading(false);
        return;
      }
      if (data) {
        setModel(data);
        const { data: baseProducts } = await supabase
          .from('products')
          .select('*')
          .eq('model_id', id)
          .eq('is_base_membership', true)
          .limit(1);

        if (baseProducts && baseProducts.length > 0) {
          const base = baseProducts[0];
          setBaseProductName(base.name || '');
          setBasePrice((base.price_cents / 100).toFixed(2));
        }
      }
      setLoading(false);
    };
    fetchModelData();
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
      const { data, error: invokeError } = await supabase.functions.invoke('gemini-generate', {
        body: { prompt },
      });

      if (invokeError) {
        console.error('[ModelForm] invoke error', invokeError);
        alert(`Erro na função de IA: ${invokeError.message || 'Falha desconhecida.'}`);
        return;
      }

      if (!data) {
        alert('Resposta vazia da IA.');
        return;
      }

      if (data.ok === false) {
        if (data.code === 'LIMIT_EXCEEDED') {
          alert('⚠️ O assistente de IA atingiu o limite de uso da conta. Tente novamente mais tarde.');
        } else {
          alert(`Erro na IA: ${data.message || data.code || 'Erro desconhecido.'}`);
        }
        return;
      }

      const text = data.generatedText?.toString().trim();
      if (!text) {
        alert('A IA não retornou texto.');
        return;
      }

      setModel(prev => ({ ...prev, bio: text }));
    } catch (err: any) {
      console.error('[ModelForm] unexpected error', err);
      alert(`Erro ao sugerir bio: ${err?.message || 'Falha desconhecida na IA.'}`);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Validação do Preço VIP (Tornando obrigatório)
    const numericPrice = parseFloat(basePrice.replace(',', '.'));
    if (isNaN(numericPrice) || numericPrice <= 0) {
      setError('O preço base do VIP deve ser um valor numérico positivo (ex: 49.90).');
      setLoading(false);
      return;
    }
    
    let modelId = id;
    
    // 2. Salvar/Atualizar Modelo
    if (isEditing) {
      const { error: submissionError } = await supabase.from('models').update(model).eq('id', id);
      if (submissionError) {
        setError(`Erro ao salvar modelo: ${submissionError.message}`);
        setLoading(false);
        return;
      }
    } else {
      const { data: inserted, error: submissionError } = await supabase.from('models').insert(model).select().single();
      if (submissionError) {
        setError(`Erro ao criar modelo: ${submissionError.message}`);
        setLoading(false);
        return;
      }
      modelId = inserted?.id;
    }

    // 3. Gerenciar Produto Base VIP
    if (modelId) {
      const priceCents = Math.round(numericPrice * 100);
      const productName = baseProductName.trim() || `VIP completo de ${model.name || ''}`.trim() || 'VIP da modelo';

      const { data: existingProducts } = await supabase
        .from('products')
        .select('id')
        .eq('model_id', modelId)
        .eq('is_base_membership', true)
        .limit(1);

      const productPayload = {
        model_id: modelId,
        name: productName,
        price_cents: priceCents,
        is_base_membership: true, // Reforçado
        status: 'active', // Reforçado
        type: 'subscription' as const, // Reforçado
      };

      if (existingProducts && existingProducts.length > 0) {
        const { error: updateError } = await supabase
          .from('products')
          .update(productPayload)
          .eq('id', existingProducts[0].id);
        if (updateError) setError(`Erro ao atualizar produto base: ${updateError.message}`);
      } else {
        const { error: insertError } = await supabase.from('products').insert(productPayload);
        if (insertError) setError(`Erro ao criar produto base: ${insertError.message}`);
      }
    }

    if (!error) {
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
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-privacy-text-secondary mb-2">Nome do produto VIP (opcional)</label>
            <input type="text" value={baseProductName} onChange={(e) => setBaseProductName(e.target.value)} placeholder={`Ex: VIP completo de ${model.name || '...'}`} className={inputStyle} />
          </div>
          <div>
            <label className="block text-sm font-medium text-privacy-text-secondary mb-2">Preço base do VIP (R$)</label>
            <input type="number" step="0.01" min="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="Ex: 49.90" className={inputStyle} required />
            <p className="mt-1 text-xs text-privacy-text-secondary">Este valor é obrigatório para o checkout Pix.</p>
          </div>
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