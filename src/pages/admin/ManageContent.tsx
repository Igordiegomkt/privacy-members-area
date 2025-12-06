import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MediaItem, Model, Product } from '../../types';

export const ManageContent: React.FC = () => {
    const { id: modelId } = useParams<{ id: string }>();
    const [model, setModel] = useState<Model | null>(null);
    const [modelProducts, setModelProducts] = useState<Product[]>([]);
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Form States
    const [manualUrl, setManualUrl] = useState('');
    const [manualType, setManualType] = useState<'image' | 'video'>('image');
    const [manualIsFree, setManualIsFree] = useState(false);
    const [manualProductId, setManualProductId] = useState<string>('');
    
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
            supabase.from('media_items').select('*').eq('model_id', modelId).order('created_at', { ascending: false }),
            supabase.from('products').select('*').eq('model_id', modelId),
        ]);
        if (modelRes.data) setModel(modelRes.data);
        if (mediaRes.data) setMediaItems(mediaRes.data);
        if (productsRes.data) setModelProducts(productsRes.data);
        setLoading(false);
    }, [modelId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const generateAndSaveMetadata = async (newMedia: { id: string, type: 'image' | 'video' }[]) => {
        if (!model) return;
        try {
            const { data, error } = await supabase.functions.invoke('gemini-media-metadata', {
                body: {
                    modelName: model.name,
                    modelUsername: model.username, // Adicionando username para o prompt
                    items: newMedia.map(m => ({ mediaId: m.id, type: m.type, context: '' }))
                }
            });
            if (error) throw error;
            
            const updates = data.results
                .filter((r: any) => r.title || r.description)
                .map((r: any) => ({
                    id: r.mediaId,
                    title: r.title,
                    description: r.description
                }));

            if (updates.length > 0) {
                const { error: updateError } = await supabase.from('media_items').upsert(updates);
                if (updateError) console.error("Error updating metadata:", updateError);
                else console.log("Metadata generated and saved for", updates.length, "items.");
            }
        } catch (e) {
            console.error("Failed to generate AI metadata:", e);
        }
    };

    const linkMediaToProduct = async (mediaIds: string[], productId: string) => {
        if (!productId) return;
        const links = mediaIds.map(media_id => ({ product_id: productId, media_id }));
        const { error } = await supabase.from('product_media').insert(links);
        if (error) throw new Error(`Erro ao vincular mídia ao produto: ${error.message}`);
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            const { data, error } = await supabase.from('media_items').insert({
                model_id: modelId,
                url: manualUrl,
                thumbnail: manualUrl,
                type: manualType,
                is_free: manualIsFree,
            }).select('id, type').single();

            if (error) throw error;
            if (data && manualProductId) await linkMediaToProduct([data.id], manualProductId);
            
            alert('Conteúdo adicionado!');
            setManualUrl('');
            fetchData();
            generateAndSaveMetadata([data]);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleBatchSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            const newItems = Array.from({ length: batchCount }, (_, i) => ({
                model_id: modelId,
                type: batchType,
                url: `${batchBaseUrl}${i + 1}${batchExtension}`,
                thumbnail: `${batchBaseUrl}${i + 1}${batchExtension}`,
                is_free: false,
            }));
            
            const { data, error } = await supabase.from('media_items').insert(newItems).select('id, type');
            if (error) throw error;

            if (data && batchProductId) await linkMediaToProduct(data.map(item => item.id), batchProductId);

            alert(`${batchCount} conteúdos adicionados em lote!`);
            fetchData();
            generateAndSaveMetadata(data);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleSelectionChange = (id: string, checked: boolean) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (checked) newSet.add(id);
            else newSet.delete(id);
            return newSet;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        setSelectedIds(checked ? new Set(mediaItems.map(item => item.id)) : new Set());
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        if (window.confirm(`Tem certeza que deseja excluir ${selectedIds.size} mídias?`)) {
            const { error } = await supabase.from('media_items').delete().in('id', Array.from(selectedIds));
            if (error) setError(error.message);
            else {
                alert('Mídias excluídas.');
                fetchData();
                setSelectedIds(new Set());
            }
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
                    <select value={manualType} onChange={e => setManualType(e.target.value as 'image' | 'video')} className={inputStyle}>
                        <option value="image">Imagem</option>
                        <option value="video">Vídeo</option>
                    </select>
                    <select value={manualProductId} onChange={e => setManualProductId(e.target.value)} className={inputStyle}>
                        <option value="">Vincular a um produto (Opcional)</option>
                        {modelProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <label className="flex items-center gap-2 text-white"><input type="checkbox" checked={manualIsFree} onChange={e => setManualIsFree(e.target.checked)} /> Gratuito?</label>
                    <button type="submit" className="bg-primary text-black font-bold py-2 px-4 rounded w-full">Adicionar</button>
                </form>

                <form onSubmit={handleBatchSubmit} className="bg-privacy-surface p-6 rounded-lg space-y-4">
                    <h2 className="text-xl font-bold text-white">Gerar em Lote (R2)</h2>
                    <input value={batchBaseUrl} onChange={e => setBatchBaseUrl(e.target.value)} placeholder="URL Base (ex: .../foto/foto)" className={inputStyle} required />
                    <input type="number" value={batchCount} onChange={e => setBatchCount(parseInt(e.target.value))} placeholder="Quantidade" className={inputStyle} min="1" required />
                    <select value={batchType} onChange={e => setBatchType(e.target.value as 'image' | 'video')} className={inputStyle}>
                        <option value="image">Imagem</option>
                        <option value="video">Vídeo</option>
                    </select>
                    <input value={batchExtension} onChange={e => setBatchExtension(e.target.value)} placeholder="Extensão (ex: .png)" className={inputStyle} required />
                    <select value={batchProductId} onChange={e => setBatchProductId(e.target.value)} className={inputStyle}>
                        <option value="">Vincular a um produto (Opcional)</option>
                        {modelProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <button type="submit" className="bg-primary text-black font-bold py-2 px-4 rounded w-full">Gerar em Lote</button>
                </form>
            </div>

            <div className="mt-8 bg-privacy-surface p-6 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Conteúdos Cadastrados ({mediaItems.length})</h2>
                    <button onClick={handleDeleteSelected} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50" disabled={selectedIds.size === 0}>
                        Excluir Selecionados ({selectedIds.size})
                    </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm text-left text-privacy-text-secondary">
                        <thead className="text-xs uppercase bg-privacy-border sticky top-0">
                            <tr>
                                <th className="px-4 py-2 w-10"><input type="checkbox" onChange={e => handleSelectAll(e.target.checked)} checked={selectedIds.size === mediaItems.length && mediaItems.length > 0} /></th>
                                <th className="px-4 py-2">URL</th>
                                <th className="px-4 py-2">Tipo</th>
                                <th className="px-4 py-2">Gratuito</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mediaItems.map(item => (
                                <tr key={item.id} className="border-b border-privacy-border">
                                    <td className="px-4 py-2"><input type="checkbox" checked={selectedIds.has(item.id)} onChange={e => handleSelectionChange(item.id, e.target.checked)} /></td>
                                    <td className="px-4 py-2 truncate max-w-xs">{item.url}</td>
                                    <td className="px-4 py-2">{item.type}</td>
                                    <td className="px-4 py-2">{item.is_free ? 'Sim' : 'Não'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
             <Link to="/admin/modelos" className="text-primary mt-4 inline-block">Voltar para Modelos</Link>
        </div>
    );
};