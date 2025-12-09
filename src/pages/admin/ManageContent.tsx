import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MediaItem, Model, Product } from '../../types';

interface AiResult {
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  tags: string[];
}

export const ManageContent: React.FC = () => {
    const { id: modelId } = useParams<{ id: string }>();
    const [model, setModel] = useState<Model | null>(null);
    const [modelProducts, setModelProducts] = useState<Product[]>([]);
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Form States - Manual
    const [manualUrl, setManualUrl] = useState('');
    const [manualType, setManualType] = useState<'image' | 'video'>('image');
    const [manualIsFree, setManualIsFree] = useState(false);
    const [manualProductId, setManualProductId] = useState<string>('');
    const [manualTitle, setManualTitle] = useState('');
    const [manualDescription, setManualDescription] = useState('');
    const [manualContext, setManualContext] = useState(''); // Campo para contexto da IA
    const [isGeneratingManual, setIsGeneratingManual] = useState(false);
    
    // Form States - Batch
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

    const generateMetadata = async (context: string, type: 'image' | 'video'): Promise<AiResult | null> => {
        if (!context.trim()) return null;
        try {
            const { data, error } = await supabase.functions.invoke('ai-generate-content', {
                body: {
                    contentType: 'media_description',
                    context: context,
                    language: 'pt-BR',
                }
            });
            if (error) throw error;
            if (data.ok === false) throw new Error(data.message || 'Erro na IA.');
            
            return data.data as AiResult;
        } catch (e) {
            console.error("Failed to generate AI metadata:", e);
            return null;
        }
    };

    const handleGenerateManualMetadata = async () => {
        if (!manualContext.trim()) {
            alert('Forneça um contexto para a IA.');
            return;
        }
        setIsGeneratingManual(true);
        const result = await generateMetadata(manualContext, manualType);
        if (result) {
            setManualTitle(result.title);
            setManualDescription(result.description);
            alert('Metadados gerados com sucesso! Revise e salve.');
        } else {
            alert('Falha ao gerar metadados. Verifique o log do console.');
        }
        setIsGeneratingManual(false);
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
                title: manualTitle.trim() || null,
                description: manualDescription.trim() || null,
            }).select('id, type').single();

            if (error) throw error;
            if (data && manualProductId) await linkMediaToProduct([data.id], manualProductId);
            
            alert('Conteúdo adicionado!');
            setManualUrl('');
            setManualTitle('');
            setManualDescription('');
            setManualContext('');
            fetchData();
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

            // Geração de metadados em lote (sem contexto, apenas para preencher)
            // Nota: A Edge Function gemini-media-metadata foi removida, mas a lógica de preenchimento de title/description via IA é importante.
            // Como não temos contexto para o lote, vamos pular a chamada de IA aqui por enquanto, focando apenas no cadastro.
            // Se o admin quiser metadados, ele deve usar o cadastro manual ou a ferramenta de IA.

            alert(`${batchCount} conteúdos adicionados em lote!`);
            fetchData();
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

                    {/* Campo de Contexto para IA */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-privacy-text-secondary">Contexto para IA (Opcional)</label>
                            <button 
                                type="button" 
                                onClick={handleGenerateManualMetadata} 
                                disabled={isGeneratingManual || !manualContext.trim()}
                                className="text-xs bg-primary/20 text-primary font-semibold px-2 py-1 rounded-md hover:bg-primary/40 disabled:opacity-50"
                            >
                                {isGeneratingManual ? 'Gerando...' : 'Gerar Título/Desc. ✨'}
                            </button>
                        </div>
                        <textarea value={manualContext} onChange={e => setManualContext(e.target.value)} placeholder="Ex: na banheira, lingerie preta, sorrindo..." className={`${inputStyle} h-16 resize-none`} />
                    </div>

                    {/* Campos de Título e Descrição (Preenchidos pela IA ou manualmente) */}
                    <input value={manualTitle} onChange={e => setManualTitle(e.target.value)} placeholder="Título (Preenchido pela IA)" className={inputStyle} />
                    <textarea value={manualDescription} onChange={e => setManualDescription(e.target.value)} placeholder="Descrição (Preenchida pela IA)" className={`${inputStyle} h-20 resize-none`} />

                    <select value={manualProductId} onChange={e => setManualProductId(e.target.value)} className={inputStyle}>
                        <option value="">Vincular a um produto (Opcional)</option>
                        {modelProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    
                    <label className="flex items-center gap-2 text-white"><input type="checkbox" checked={manualIsFree} onChange={e => setManualIsFree(e.target.checked)} /> Gratuito?</label>
                    
                    <button type="submit" className="bg-primary text-black font-bold py-2 px-4 rounded w-full">Adicionar Conteúdo</button>
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
                                <th className="px-4 py-2">Título/Descrição</th>
                                <th className="px-4 py-2">URL</th>
                                <th className="px-4 py-2">Tipo</th>
                                <th className="px-4 py-2">Gratuito</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mediaItems.map(item => (
                                <tr key={item.id} className="border-b border-privacy-border">
                                    <td className="px-4 py-2"><input type="checkbox" checked={selectedIds.has(item.id)} onChange={e => handleSelectionChange(item.id, e.target.checked)} /></td>
                                    <td className="px-4 py-2 max-w-xs">
                                        <p className="font-medium text-white truncate">{item.title || 'Sem Título'}</p>
                                        <p className="text-xs text-privacy-text-secondary truncate">{item.description || 'Sem descrição'}</p>
                                    </td>
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