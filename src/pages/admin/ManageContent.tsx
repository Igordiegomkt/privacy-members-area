import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MediaItem, Model, Product } from '../../types';
import { Check, X, Save, Edit, Trash2, Sparkles } from 'lucide-react';

interface AiResult {
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  tags: string[];
}

const generateMetadata = async (context: string, type: 'image' | 'video'): Promise<AiResult | null> => {
    if (!context.trim()) return null;
    try {
        const { data, error } = await supabase.functions.invoke('ai-generate-content', {
            body: {
                contentType: type === 'video' ? 'feed_caption' : 'media_description',
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

const linkMediaToProduct = async (mediaIds: string[], productId: string) => {
    if (!productId) return;
    const links = mediaIds.map(media_id => ({ product_id: productId, media_id }));
    const { error } = await supabase.from('product_media').insert(links);
    if (error) throw new Error(`Erro ao vincular mídia ao produto: ${error.message}`);
};

// Componente para edição inline
interface MediaItemEditorProps {
    item: MediaItem;
    modelName: string;
    onSave: (id: string, updates: Partial<MediaItem>) => Promise<void>;
    onDelete: (id: string) => void;
    isSelected: boolean;
    onSelect: (id: string, isSelected: boolean) => void;
}

const MediaItemEditor: React.FC<MediaItemEditorProps> = ({ item, modelName, onSave, onDelete, isSelected, onSelect }: MediaItemEditorProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<MediaItem>>({
        title: item.title || '',
        subtitle: item.subtitle || '',
        description: item.description || '',
        cta: item.cta || '',
        tags: item.tags || [],
        is_free: item.is_free,
        url: item.url,
        thumbnail: item.thumbnail,
        type: item.type,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else if (name === 'tags') {
            setFormData(prev => ({ ...prev, tags: value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setError(null);
        try {
            const updates: Partial<MediaItem> = {
                title: formData.title,
                subtitle: formData.subtitle,
                description: formData.description,
                cta: formData.cta,
                tags: formData.tags,
                is_free: formData.is_free,
                url: formData.url,
                thumbnail: formData.thumbnail,
                type: formData.type,
            };
            await onSave(item.id, updates);
            setIsEditing(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const inputStyle = "w-full px-2 py-1 bg-privacy-black border border-privacy-border rounded-md text-privacy-text-primary text-xs focus:outline-none focus:border-primary transition-colors";

    return (
        <tr key={item.id} className="border-b border-privacy-border hover:bg-privacy-border/50">
            <td className="px-4 py-2 w-10">
                <input 
                    type="checkbox" 
                    checked={isSelected} 
                    onChange={(e) => onSelect(item.id, e.target.checked)} 
                />
            </td>
            <td className="px-4 py-2 max-w-xs">
                {error && <p className="text-red-400 text-xs mb-1">{error}</p>}
                {isEditing ? (
                    <div className="space-y-1">
                        <input name="title" value={formData.title || ''} onChange={handleChange} placeholder="Título" className={inputStyle} />
                        <input name="subtitle" value={formData.subtitle || ''} onChange={handleChange} placeholder="Subtítulo" className={inputStyle} />
                        <textarea name="description" value={formData.description || ''} onChange={handleChange} placeholder="Descrição" className={`${inputStyle} h-12 resize-none`} />
                        <input name="cta" value={formData.cta || ''} onChange={handleChange} placeholder="CTA" className={inputStyle} />
                        <input name="tags" value={(formData.tags || []).join(', ')} onChange={handleChange} placeholder="Tags (separadas por vírgula)" className={inputStyle} />
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        <p className="font-medium text-white truncate">{item.title || 'Sem Título'}</p>
                        <p className="text-xs text-primary truncate">{item.subtitle || 'Sem Subtítulo'}</p>
                        <p className="text-xs text-privacy-text-secondary line-clamp-2">{item.description || 'Sem descrição'}</p>
                        <p className="text-xs text-privacy-text-secondary/70 mt-1">CTA: {item.cta || 'N/A'}</p>
                        <p className="text-xs text-privacy-text-secondary/70">Tags: {(item.tags || []).join(', ') || 'N/A'}</p>
                        {item.ai_title && (
                            <div className="flex items-center gap-1 text-[10px] text-green-400 mt-1">
                                <Sparkles className="w-3 h-3" /> Copy IA Gerada
                            </div>
                        )}
                    </div>
                )}
            </td>
            <td className="px-4 py-2 truncate max-w-[150px]">
                {isEditing ? (
                    <input name="url" value={formData.url || ''} onChange={handleChange} placeholder="URL" className={inputStyle} />
                ) : (
                    item.url
                )}
            </td>
            <td className="px-4 py-2 capitalize">
                {isEditing ? (
                    <select name="type" value={formData.type} onChange={handleChange} className={inputStyle}>
                        <option value="image">Imagem</option>
                        <option value="video">Vídeo</option>
                    </select>
                ) : (
                    item.type
                )}
            </td>
            <td className="px-4 py-2">
                {isEditing ? (
                    <input type="checkbox" name="is_free" checked={!!formData.is_free} onChange={handleChange} />
                ) : (
                    item.is_free ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-500" />
                )}
            </td>
            <td className="px-4 py-2 space-y-1">
                {isEditing ? (
                    <button onClick={handleSave} disabled={loading} className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white font-medium py-1 px-2 rounded w-full justify-center">
                        <Save className="w-3 h-3" /> {loading ? 'Salvando...' : 'Salvar'}
                    </button>
                ) : (
                    <button onClick={() => setIsEditing(true)} className="flex items-center gap-1 text-xs bg-primary/20 text-primary hover:bg-primary/40 font-medium py-1 px-2 rounded w-full justify-center">
                        <Edit className="w-3 h-3" /> Editar
                    </button>
                )}
                <button onClick={() => onDelete(item.id)} className="flex items-center gap-1 text-xs bg-red-600/20 text-red-400 hover:bg-red-600/40 font-medium py-1 px-2 rounded w-full justify-center">
                    <Trash2 className="w-3 h-3" /> Excluir
                </button>
            </td>
        </tr>
    );
};


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
    const [manualSubtitle, setManualSubtitle] = useState(''); // Novo
    const [manualDescription, setManualDescription] = useState('');
    const [manualCta, setManualCta] = useState(''); // Novo
    const [manualTags, setManualTags] = useState(''); // Novo
    const [manualContext, setManualContext] = useState(''); // Campo para contexto da IA
    const [isGeneratingManual, setIsGeneratingManual] = useState(false);
    
    // Form States - Batch
    const [batchBaseUrl, setBatchBaseUrl] = useState('');
    const [batchCount, setBatchCount] = useState(1);
    const [batchType, setBatchType] = useState<'image' | 'video'>('image');
    const [batchExtension, setBatchExtension] = useState('.png');
    const [batchProductId, setBatchProductId] = useState<string>('');
    const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);


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

    const handleSelectOne = (id: string, isSelected: boolean) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (isSelected) {
                newSet.add(id);
            } else {
                newSet.delete(id);
            }
            return newSet;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allIds = new Set(mediaItems.map(item => item.id));
            setSelectedIds(allIds);
        } else {
            setSelectedIds(new Set());
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
            setManualSubtitle(result.subtitle);
            setManualDescription(result.description);
            setManualCta(result.cta);
            setManualTags(result.tags.join(', '));
            alert('Metadados gerados com sucesso! Revise e salve.');
        } else {
            alert('Falha ao gerar metadados. Verifique o log do console.');
        }
        setIsGeneratingManual(false);
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        let finalTitle = manualTitle.trim();
        let finalSubtitle = manualSubtitle.trim();
        let finalDescription = manualDescription.trim();
        let finalCta = manualCta.trim();
        let finalTags = manualTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        
        let aiResult: AiResult | null = null;

        // 1. Se o contexto foi fornecido, mas os campos de copy estão vazios, gera automaticamente
        if (manualContext.trim() && (!finalTitle || !finalDescription || !finalSubtitle || !finalCta)) {
            setIsGeneratingManual(true);
            aiResult = await generateMetadata(manualContext, manualType);
            setIsGeneratingManual(false);
            
            if (aiResult) {
                finalTitle = aiResult.title;
                finalSubtitle = aiResult.subtitle;
                finalDescription = aiResult.description;
                finalCta = aiResult.cta;
                finalTags = aiResult.tags;
            } else {
                alert('Falha ao gerar metadados automáticos. Salvando sem copy.');
            }
        }

        try {
            const payload = {
                model_id: modelId,
                url: manualUrl,
                thumbnail: manualUrl,
                type: manualType,
                is_free: manualIsFree,
                title: finalTitle || null,
                subtitle: finalSubtitle || null,
                description: finalDescription || null,
                cta: finalCta || null,
                tags: finalTags.length > 0 ? finalTags : null,
                // Salva a copy gerada pela IA nos campos ai_ para rastreamento
                ai_title: aiResult?.title || null,
                ai_subtitle: aiResult?.subtitle || null,
                ai_description: aiResult?.description || null,
                ai_cta: aiResult?.cta || null,
                ai_tags: aiResult?.tags || null,
            };

            const { data, error } = await supabase.from('media_items').insert(payload).select('id, type').single();

            if (error) throw error;
            if (data && manualProductId) await linkMediaToProduct([data.id], manualProductId);
            
            alert('Conteúdo adicionado!');
            setManualUrl('');
            setManualTitle('');
            setManualSubtitle('');
            setManualDescription('');
            setManualCta('');
            setManualTags('');
            setManualContext('');
            fetchData();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleBatchSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsGeneratingBatch(true);
        
        try {
            const newItemsPayload = Array.from({ length: batchCount }, (_, i) => ({
                model_id: modelId,
                type: batchType,
                url: `${batchBaseUrl}${i + 1}${batchExtension}`,
                thumbnail: `${batchBaseUrl}${i + 1}${batchExtension}`,
                is_free: false,
            }));
            
            // 1. Inserir itens base
            const { data: insertedItems, error: insertError } = await supabase.from('media_items').insert(newItemsPayload).select('id, url, type');
            if (insertError) throw insertError;

            if (insertedItems && insertedItems.length > 0) {
                // 2. Vincular ao produto, se houver
                if (batchProductId) await linkMediaToProduct(insertedItems.map(item => item.id), batchProductId);

                // 3. Gerar metadados para cada item (usando um contexto genérico)
                const modelName = model?.name || 'a modelo';
                const genericContext = `Conteúdo ${batchType} exclusivo de ${modelName}.`;
                
                const updates = insertedItems.map(async (item) => {
                    const result = await generateMetadata(genericContext, item.type as 'image' | 'video');
                    if (result) {
                        return supabase.from('media_items').update({
                            title: result.title,
                            subtitle: result.subtitle,
                            description: result.description,
                            cta: result.cta,
                            tags: result.tags,
                            // Salva a copy gerada pela IA nos campos ai_
                            ai_title: result.title,
                            ai_subtitle: result.subtitle,
                            ai_description: result.description,
                            ai_cta: result.cta,
                            ai_tags: result.tags,
                        }).eq('id', item.id);
                    }
                    return null;
                });
                
                await Promise.all(updates);
            }

            alert(`${batchCount} conteúdos adicionados e copy gerada!`);
            fetchData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsGeneratingBatch(false);
        }
    };

    const handleSaveMediaItem = async (id: string, updates: Partial<MediaItem>) => {
        // Ao salvar manualmente, a copy gerada por IA não é atualizada, apenas os campos principais.
        const { error: updateError } = await supabase
            .from('media_items')
            .update(updates)
            .eq('id', id);
        
        if (updateError) {
            throw new Error(`Falha ao salvar: ${updateError.message}`);
        }
        
        // Atualiza o estado local
        setMediaItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        if (window.confirm(`Tem certeza que deseja excluir ${selectedIds.size} mídias?`)) {
            const { error: deleteError } = await supabase.from('media_items').delete().in('id', Array.from(selectedIds));
            if (deleteError) setError(deleteError.message);
            else {
                alert('Mídias excluídas.');
                fetchData();
                setSelectedIds(new Set());
            }
        }
    };
    
    const handleDeleteSingle = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta mídia?')) {
            const { error: deleteError } = await supabase.from('media_items').delete().eq('id', id);
            if (deleteError) setError(deleteError.message);
            else {
                alert('Mídia excluída.');
                fetchData();
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
                    <h2 className="text-xl font-bold text-white">Cadastro Manual + Copy Automática</h2>
                    
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
                                {isGeneratingManual ? 'Gerando...' : 'Gerar Copy ✨'}
                            </button>
                        </div>
                        <textarea value={manualContext} onChange={e => setManualContext(e.target.value)} placeholder="Ex: na banheira, lingerie preta, sorrindo..." className={`${inputStyle} h-16 resize-none`} />
                    </div>

                    {/* Campos de Copy (Preenchidos pela IA ou manualmente) */}
                    <input value={manualTitle} onChange={e => setManualTitle(e.target.value)} placeholder="Título (Preenchido pela IA)" className={inputStyle} />
                    <input value={manualSubtitle} onChange={e => setManualSubtitle(e.target.value)} placeholder="Subtítulo (Preenchido pela IA)" className={inputStyle} />
                    <textarea value={manualDescription} onChange={e => setManualDescription(e.target.value)} placeholder="Descrição (Preenchida pela IA)" className={`${inputStyle} h-20 resize-none`} />
                    <input value={manualCta} onChange={e => setManualCta(e.target.value)} placeholder="CTA (Preenchido pela IA)" className={inputStyle} />
                    <input value={manualTags} onChange={e => setManualTags(e.target.value)} placeholder="Tags (separadas por vírgula)" className={inputStyle} />


                    <select value={manualProductId} onChange={e => setManualProductId(e.target.value)} className={inputStyle}>
                        <option value="">Vincular a um produto (Opcional)</option>
                        {modelProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    
                    <label className="flex items-center gap-2 text-white"><input type="checkbox" checked={manualIsFree} onChange={e => setManualIsFree(e.target.checked)} /> Gratuito?</label>
                    
                    <button type="submit" disabled={isGeneratingManual} className="bg-primary text-black font-bold py-2 px-4 rounded w-full disabled:opacity-50">Adicionar Conteúdo</button>
                </form>

                <form onSubmit={handleBatchSubmit} className="bg-privacy-surface p-6 rounded-lg space-y-4">
                    <h2 className="text-xl font-bold text-white">Gerar em Lote (R2) + Copy Automática</h2>
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
                    <button type="submit" disabled={isGeneratingBatch} className="bg-primary text-black font-bold py-2 px-4 rounded w-full disabled:opacity-50">
                        {isGeneratingBatch ? 'Gerando Copy em Lote...' : 'Gerar em Lote'}
                    </button>
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
                                <th className="px-4 py-2">Copy (Título, Subtítulo, Descrição, CTA, Tags)</th>
                                <th className="px-4 py-2">URL</th>
                                <th className="px-4 py-2">Tipo</th>
                                <th className="px-4 py-2">Gratuito</th>
                                <th className="px-4 py-2">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mediaItems.map(item => (
                                <MediaItemEditor 
                                    key={item.id} 
                                    item={item} 
                                    modelName={model.name}
                                    onSave={handleSaveMediaItem}
                                    onDelete={handleDeleteSingle}
                                    isSelected={selectedIds.has(item.id)}
                                    onSelect={handleSelectOne}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
             <Link to="/admin/modelos" className="text-primary mt-4 inline-block">Voltar para Modelos</Link>
        </div>
    );
};