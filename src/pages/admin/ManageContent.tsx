import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MediaItem, Model } from '../../types';

interface ProductOption {
    id: string;
    name: string;
}

export const ManageContent: React.FC = () => {
    const { id: modelId } = useParams<{ id: string }>();
    const [model, setModel] = useState<Model | null>(null);
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [products, setProducts] = useState<ProductOption[]>([]);
    const [loading, setLoading] = useState(true);

    // Manual Form State
    const [manualUrl, setManualUrl] = useState('');
    const [manualType, setManualType] = useState<'image' | 'video'>('image');
    const [manualIsFree, setManualIsFree] = useState(false);
    const [manualProductId, setManualProductId] = useState<string>('');

    // Batch Form State
    const [batchBaseUrl, setBatchBaseUrl] = useState('');
    const [batchCount, setBatchCount] = useState(1);
    const [batchType, setBatchType] = useState<'image' | 'video'>('image');
    const [batchExtension, setBatchExtension] = useState('.png');
    const [batchProductId, setBatchProductId] = useState<string>('');

    const fetchData = useCallback(async () => {
        if (!modelId) return;
        setLoading(true);
        const [modelRes, mediaRes, productsRes] = await Promise.all([
            supabase.from('models').select('*').eq('id', modelId).single(),
            supabase.from('media_items').select('*').eq('model_id', modelId).order('created_at'),
            supabase.from('products').select('id, name').eq('model_id', modelId)
        ]);
        if (modelRes.data) setModel(modelRes.data);
        if (mediaRes.data) setMediaItems(mediaRes.data);
        if (productsRes.data) setProducts(productsRes.data);
        setLoading(false);
    }, [modelId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await supabase.from('media_items').insert({
            model_id: modelId,
            url: manualUrl,
            thumbnail: manualUrl, // Simple default
            type: manualType,
            is_free: manualIsFree,
            product_id: manualProductId || null,
        });
        if (error) alert(error.message);
        else {
            alert('Conteúdo adicionado!');
            setManualUrl('');
            fetchData();
        }
    };

    const handleBatchSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newItems = Array.from({ length: batchCount }, (_, i) => ({
            model_id: modelId,
            type: batchType,
            url: `${batchBaseUrl}${i + 1}${batchExtension}`,
            thumbnail: `${batchBaseUrl}${i + 1}${batchExtension}`,
            is_free: true,
            product_id: batchProductId || null,
        }));

        const { error } = await supabase.from('media_items').insert(newItems);
        if (error) alert(error.message);
        else {
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
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <form onSubmit={handleManualSubmit} className="bg-privacy-surface p-6 rounded-lg space-y-4">
                    <h2 className="text-xl font-bold text-white">Cadastro Manual</h2>
                    <input value={manualUrl} onChange={e => setManualUrl(e.target.value)} placeholder="URL da Mídia" className={inputStyle} required />
                    <select value={manualType} onChange={e => setManualType(e.target.value as any)} className={inputStyle}>
                        <option value="image">Imagem</option>
                        <option value="video">Vídeo</option>
                    </select>
                    <select value={manualProductId} onChange={e => setManualProductId(e.target.value)} className={inputStyle}>
                        <option value="">Conteúdo Avulso (sem produto)</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
                    <select value={batchProductId} onChange={e => setBatchProductId(e.target.value)} className={inputStyle}>
                        <option value="">Conteúdo Avulso (sem produto)</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
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