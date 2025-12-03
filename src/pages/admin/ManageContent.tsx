import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MediaItem, Model } from '../../types';

export const ManageContent: React.FC = () => {
    const { id: modelId } = useParams<{ id: string }>();
    const [model, setModel] = useState<Model | null>(null);
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form States
    const [manualUrl, setManualUrl] = useState('');
    const [manualType, setManualType] = useState<'image' | 'video'>('image');
    const [manualIsFree, setManualIsFree] = useState(false);
    const [batchBaseUrl, setBatchBaseUrl] = useState('');
    const [batchCount, setBatchCount] = useState(1);
    const [batchType, setBatchType] = useState<'image' | 'video'>('image');
    const [batchExtension, setBatchExtension] = useState('.png');

    const fetchData = useCallback(async () => {
        if (!modelId) return;
        setLoading(true);
        const [modelRes, mediaRes] = await Promise.all([
            supabase.from('models').select('*').eq('id', modelId).single(),
            supabase.from('media_items').select('*').eq('model_id', modelId).order('created_at'),
        ]);
        if (modelRes.data) setModel(modelRes.data);
        if (mediaRes.data) setMediaItems(mediaRes.data);
        setLoading(false);
    }, [modelId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        console.log('[ManageContent] Submitting manual item:', { manualUrl, manualType, manualIsFree });
        const { error } = await supabase.from('media_items').insert({
            model_id: modelId,
            url: manualUrl,
            thumbnail: manualUrl,
            type: manualType,
            is_free: manualIsFree,
        });
        if (error) {
            console.error('[ManageContent] Manual insert error:', error);
            setError(error.message);
        } else {
            alert('Conteúdo adicionado!');
            setManualUrl('');
            fetchData();
        }
    };

    const handleBatchSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const newItems = Array.from({ length: batchCount }, (_, i) => ({
            model_id: modelId,
            type: batchType,
            url: `${batchBaseUrl}${i + 1}${batchExtension}`,
            thumbnail: `${batchBaseUrl}${i + 1}${batchExtension}`,
            is_free: true,
        }));
        console.log(`[ManageContent] Submitting ${newItems.length} batch items.`);
        const { error } = await supabase.from('media_items').insert(newItems);
        if (error) {
            console.error('[ManageContent] Batch insert error:', error);
            setError(error.message);
        } else {
            alert(`${batchCount} conteúdos adicionados em lote!`);
            fetchData();
        }
    };

    if (loading) return <p>Carregando...</p>;
    if (!model) return <p>Modelo não encontrada.</p>;
    
    const inputStyle = "w-full px-4 py-3 bg-privacy-surface border border-privacy-border rounded-lg text-privacy-text-primary placeholder-privacy-text-secondary focus:outline-none focus:border-primary transition-colors";

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-6">Gerenciar Conteúdos de {model.name}</h1>
            {error && <p className="text-red-400 bg-red-500/10 p-3 rounded-md mb-4">{error}</p>}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <form onSubmit={handleManualSubmit} className="bg-privacy-surface p-6 rounded-lg space-y-4">
                    <h2 className="text-xl font-bold text-white">Cadastro Manual</h2>
                    <input value={manualUrl} onChange={e => setManualUrl(e.target.value)} placeholder="URL da Mídia" className={inputStyle} required />
                    <select value={manualType} onChange={e => setManualType(e.target.value as any)} className={inputStyle}>
                        <option value="image">Imagem</option>
                        <option value="video">Vídeo</option>
                    </select>
                    <label className="flex items-center gap-2 text-white"><input type="checkbox" checked={manualIsFree} onChange={e => setManualIsFree(e.target.checked)} /> Gratuito?</label>
                    <button type="submit" className="bg-primary text-black font-bold py-2 px-4 rounded w-full">Adicionar</button>
                </form>

                <form onSubmit={handleBatchSubmit} className="bg-privacy-surface p-6 rounded-lg space-y-4">
                    <h2 className="text-xl font-bold text-white">Gerar em Lote (R2)</h2>
                    <input value={batchBaseUrl} onChange={e => setBatchBaseUrl(e.target.value)} placeholder="URL Base (ex: .../foto/foto)" className={inputStyle} required />
                    <input type="number" value={batchCount} onChange={e => setBatchCount(parseInt(e.target.value))} placeholder="Quantidade" className={inputStyle} min="1" required />
                    <select value={batchType} onChange={e => setBatchType(e.target.value as any)} className={inputStyle}>
                        <option value="image">Imagem</option>
                        <option value="video">Vídeo</option>
                    </select>
                    <input value={batchExtension} onChange={e => setBatchExtension(e.target.value)} placeholder="Extensão (ex: .png)" className={inputStyle} required />
                    <button type="submit" className="bg-primary text-black font-bold py-2 px-4 rounded w-full">Gerar em Lote</button>
                </form>
            </div>

            <div className="mt-8 bg-privacy-surface p-6 rounded-lg">
                <h2 className="text-xl font-bold text-white mb-4">Conteúdos Cadastrados ({mediaItems.length})</h2>
                <ul className="space-y-2 max-h-96 overflow-y-auto">
                    {mediaItems.map(item => (
                        <li key={item.id} className="text-sm text-privacy-text-secondary p-2 bg-privacy-border rounded">{item.url} ({item.type})</li>
                    ))}
                </ul>
            </div>
             <Link to="/admin/modelos" className="text-primary mt-4 inline-block">Voltar para Modelos</Link>
        </div>
    );
}