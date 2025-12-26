import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MediaItem, Model, Product } from '../../types';
import { Check, X, Save, Edit, Trash2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { stripTrackingParams } from '../../lib/urlUtils'; // Importando utilitário

interface AiResult {
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  tags: string[];
}

/**
 * Gera metadados de copy usando a IA, com suporte a análise visual e fallback para texto.
 * @param context Contexto textual adicional.
 * @param type Tipo de mídia ('image' ou 'video').
 * @param imageUrl URL da imagem/thumbnail para análise visual (opcional).
 */
const generateMetadata = async (context: string, type: 'image' | 'video', imageUrl?: string): Promise<AiResult | null> => {
    if (!context.trim() && !imageUrl) return null;

    const baseBody = {
        contentType: type === 'video' ? 'feed_caption' : 'media_description',
        context,
        language: 'pt-BR' as const,
    };

    // 1) Tenta com imageUrl (se existir)
    if (imageUrl) {
        try {
            const { data, error } = await supabase.functions.invoke('ai-generate-content', {
                body: {
                    ...baseBody,
                    imageUrl,
                },
            });
            if (error) throw error;
            if (data.ok === false) throw new Error(data.message || 'Erro na IA (visão).');
            return data.data as AiResult;
        } catch (e) {
            console.warn('IA visão falhou, tentando apenas texto...', e);
        }
    }

    // 2) Fallback: só texto (se o contexto existir)
    if (context.trim()) {
        try {
            const { data, error } = await supabase.functions.invoke('ai-generate-content', {
                body: baseBody,
            });
            if (error) throw error;
            if (data.ok === false) throw new Error(data.message || 'Erro na IA (texto).');
            return data.data as AiResult;
        } catch (e) {
            console.error('IA texto também falhou:', e);
            return null;
        }
    }
    
    return null;
};

/**
 * Função para criar o registro completo de mídia e feeds via Service Role Key.
 */
const createMediaItemAndFeeds = async (modelId: string, mediaPayload: {
    file_url: string;
    thumbnail_url: string; // Agora é obrigatório, mas para vídeo pode ser a URL do vídeo ou um fallback
    content_type: 'image' | 'video';
    is_free: boolean;
    product_id?: string;
    ai: AiResult;
}) => {
    const { data, error } = await supabase.functions.invoke('admin-create-media-item', {
        body: {
            model_id: modelId,
            media: {
                file_url: mediaPayload.file_url,
                thumbnail_url: mediaPayload.thumbnail_url,
                content_type: mediaPayload.content_type,
                is_free: mediaPayload.is_free,
                product_id: mediaPayload.product_id,
                ai: mediaPayload.ai,
            }
        }
    });

    if (error) throw error;
    if (data.ok === false) throw new Error(data.message || 'Erro ao criar mídia via Admin EF.');
    
    return data.media_id;
};

// Função para ATUALIZAR registros de feed (usada na edição manual)
const updateFeedRecords = async (mediaId: string, updates: Partial<MediaItem>) => {
    const feedPayload = {
        title: updates.title,
        subtitle: updates.subtitle,
        description: updates.description,
        cta: updates.cta,
    };

    // Update model_feed
    const { error: modelFeedError } = await supabase
        .from('model_feed')
        .update(feedPayload)
        .eq('media_id', mediaId);
    if (modelFeedError) console.error('Erro ao atualizar model_feed:', modelFeedError);

    // Update global_feed
    const { error: globalFeedError } = await supabase
        .from('global_feed')
        .update(feedPayload)
        .eq('media_id', mediaId);
    if (globalFeedError) console.error('Erro ao atualizar global_feed:', globalFeedError);
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
    const [isExpanded, setIsExpanded] = useState(false);
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

    useEffect(() => {
        // Atualiza o formulário quando o item externo muda (ex: após um save em lote)
        setFormData({
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
    }, [item]);

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
            setIsExpanded(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const inputStyle = "w-full px-2 py-1 bg-privacy-black border border-privacy-border rounded-md text-privacy-text-primary text-xs focus:outline-none focus:border-primary transition-colors";
    
    // Sanitiza a URL para exibição
    const cleanUrl = stripTrackingParams(item.url);

    return (
        <>
            <tr key={item.id} className="border-b border-privacy-border hover:bg-privacy-border/50">
                <td className="px-4 py-2 w-10">
                    <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onChange={(e) => onSelect(item.id, e.target.checked)} 
                    />
                </td>
                <td className="px-4 py-2 max-w-xs">
                    <div className="space-y-0.5">
                        <p className="font-medium text-white truncate">{item.title || 'Sem Título'}</p>
                        <p className="text-xs text-primary truncate">{item.subtitle || 'Sem Subtítulo'}</p>
                        <p className="text-xs text-privacy-text-secondary line-clamp-2">{item.description || 'Sem descrição'}</p>
                        {(item.ai_title || item.ai_description) && (
                            <div className="flex items-center gap-1 text-[10px] text-green-400 mt-1">
                                <Sparkles className="w-3 h-3" /> Copy IA Gerada
                            </div>
                        )}
                    </div>
                </td>
                <td className="px-4 py-2 truncate max-w-[150px]">
                    <a href={cleanUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs truncate block">{cleanUrl}</a>
                </td>
                <td className="px-4 py-2 capitalize">
                    {item.type}
                </td>
                <td className="px-4 py-2">
                    {item.is_free ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-red-500" />}
                </td>
                <td className="px-4 py-2 space-y-1">
                    <button 
                        onClick={() => { setIsExpanded(prev => !prev); setIsEditing(true); }} 
                        className="flex items-center gap-1 text-xs bg-primary/20 text-primary hover:bg-primary/40 font-medium py-1 px-2 rounded w-full justify-center"
                    >
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} Editar Copy
                    </button>
                    <button onClick={() => onDelete(item.id)} className="flex items-center gap-1 text-xs bg-red-600/20 text-red-400 hover:bg-red-600/40 font-medium py-1 px-2 rounded w-full justify-center">
                        <Trash2 className="w-3 h-3" /> Excluir
                    </button>
                </td>
            </tr>
            {isExpanded && (
                <tr className="bg-privacy-border/30">
                    <td colSpan={6} className="p-4">
                        <div className="bg-privacy-surface p-4 rounded-lg space-y-3">
                            <div className="flex items-center gap-4 mb-3">
                                <img 
                                    src={item.thumbnail || item.url} 
                                    alt="Thumbnail" 
                                    className="w-20 h-20 object-cover rounded-md border border-privacy-border"
                                />
                                <div className="text-xs">
                                    <p className="font-semibold text-white">Thumbnail usada na IA:</p>
                                    <p className="text-privacy-text-secondary break-all">{stripTrackingParams(item.thumbnail || item.url)}</p>
                                </div>
                            </div>
                            {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-privacy-text-secondary block mb-1">Título</label>
                                    <input name="title" value={formData.title || ''} onChange={handleChange} placeholder="Título" className={inputStyle} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-privacy-text-secondary block mb-1">Subtítulo</label>
                                    <input name="subtitle" value={formData.subtitle || ''} onChange={handleChange} placeholder="Subtítulo" className={inputStyle} />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-privacy-text-secondary block mb-1">Descrição</label>
                                <textarea name="description" value={formData.description || ''} onChange={handleChange} placeholder="Descrição" className={`${inputStyle} h-16 resize-none`} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-privacy-text-secondary block mb-1">CTA</label>
                                    <input name="cta" value={formData.cta || ''} onChange={handleChange} placeholder="CTA" className={inputStyle} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-privacy-text-secondary block mb-1">Tags (separadas por vírgula)</label>
                                    <input name="tags" value={(formData.tags || []).join(', ')} onChange={handleChange} placeholder="Tags" className={inputStyle} />
                                </div>
                            </div>
                            <button onClick={handleSave} disabled={loading} className="flex items-center gap-1 text-sm bg-primary hover:bg-primary-dark text-black font-medium py-2 px-4 rounded disabled:opacity-50">
                                <Save className="w-4 h-4" /> {loading ? 'Salvando...' : 'Salvar texto da mídia'}
                            </button>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
};


export const ManageContent: React.FC = () => {
// ... (restante do componente ManageContent)
// ... (o código abaixo permanece inalterado, exceto pelo import de stripTrackingParams)
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
    const [manualSubtitle, setManualSubtitle] = useState('');
    const [manualDescription, setManualDescription] = useState('');
    const [manualCta, setManualCta] = useState('');
    const [manualTags, setManualTags] = useState('');
    const [manualContext, setManualContext] = useState('');
    const [isGeneratingManual, setIsGeneratingManual] = useState(false);
    const [aiPreview, setAiPreview] = useState<AiResult | null>(null); // Preview da IA
    
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
        const imageUrl = manualType === 'image' ? manualUrl : undefined; // Apenas imagens usam URL para visão
        
        if (!manualContext.trim() && !imageUrl) {
            alert('Forneça um contexto ou a URL da mídia/thumbnail para a IA.');
            return;
        }
        
        setIsGeneratingManual(true);
        setAiPreview(null);
        
        const result = await generateMetadata(manualContext, manualType, imageUrl);
        
        if (result) {
            setAiPreview(result);
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
        
        if (!manualUrl) {
            setError('URL da Mídia é obrigatória.');
            return;
        }
        
        // Thumbnail URL: para imagem é a própria URL, para vídeo é o fallback genérico
        const finalThumbnailUrl = manualType === 'image' ? manualUrl : '/video-fallback.svg';

        let finalTitle = manualTitle.trim();
        let finalSubtitle = manualSubtitle.trim();
        let finalDescription = manualDescription.trim();
        let finalCta = manualCta.trim();
        let finalTags = manualTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        
        let aiResult: AiResult | null = aiPreview; 

        // 1. Se o contexto foi fornecido, mas os campos de copy estão vazios, gera automaticamente
        if (manualContext.trim() && (!finalTitle || !finalDescription || !finalSubtitle || !finalCta)) {
            setIsGeneratingManual(true);
            const imageUrl = manualType === 'image' ? manualUrl : undefined; // Apenas imagens usam URL para visão
            aiResult = await generateMetadata(manualContext, manualType, imageUrl);
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
            // Se a IA falhou, usamos os campos preenchidos manualmente (mesmo que vazios)
            const aiData: AiResult = aiResult || { 
                title: finalTitle, 
                subtitle: finalSubtitle, 
                description: finalDescription, 
                cta: finalCta, 
                tags: finalTags 
            };

            const mediaId = await createMediaItemAndFeeds(modelId!, {
                file_url: manualUrl,
                thumbnail_url: finalThumbnailUrl, // Usando a URL resolvida
                content_type: manualType,
                is_free: manualIsFree,
                product_id: manualProductId || undefined,
                ai: aiData,
            });

            alert(`Conteúdo adicionado com ID: ${mediaId}`);
            
            // Limpar formulário
            setManualUrl('');
            setManualTitle('');
            setManualSubtitle('');
            setManualDescription('');
            setManualCta('');
            setManualTags('');
            setManualContext('');
            setAiPreview(null);
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
            const modelName = model?.name || 'a modelo';
            const genericContext = `Conteúdo ${batchType} exclusivo de ${modelName}.`;
            
            const itemsToInsert = Array.from({ length: batchCount }, (_, i) => {
                const index = i + 1;
                const fileUrl = `${batchBaseUrl}${index}${batchExtension}`;
                // Thumbnail URL: para imagem é a própria URL, para vídeo é o fallback genérico
                const thumbnailUrl = batchType === 'image' ? fileUrl : '/video-fallback.svg'; 
                return { fileUrl, thumbnailUrl, index };
            });
            
            const insertionPromises = itemsToInsert.map(async ({ fileUrl, thumbnailUrl }) => {
                try {
                    // 1) Tenta IA (apenas texto para vídeo, ou imagem para foto)
                    const imageUrlForAi = batchType === 'image' ? thumbnailUrl : undefined;
                    let aiResult = await generateMetadata(genericContext, batchType, imageUrlForAi);

                    // 2) Se mesmo assim não voltar nada, cria uma copy padrão (FALLBACK FINAL)
                    if (!aiResult) {
                        console.warn(`IA falhou para ${fileUrl}. Usando copy padrão.`);
                        aiResult = {
                            title: batchType === 'video' ? 'Vídeo exclusivo 🔥' : 'Conteúdo especial 😈',
                            subtitle: `Conteúdo quente de ${modelName}`,
                            description: genericContext || `Cena especial gravada só para você, clima íntimo e provocante.`,
                            cta: 'Desbloqueie e vem ver tudo sem censura 😈',
                            tags: batchType === 'video'
                                ? ['video', 'vip', 'exclusivo']
                                : ['foto', 'vip', 'hot'],
                        };
                    }

                    // 3) Sempre tentar inserir via Edge Function (admin-create-media-item)
                    const mediaId = await createMediaItemAndFeeds(modelId!, {
                        file_url: fileUrl,
                        thumbnail_url: thumbnailUrl,
                        content_type: batchType,
                        is_free: false,
                        product_id: batchProductId || undefined,
                        ai: aiResult,
                    });

                    return mediaId;
                } catch (e) {
                    console.error(`Erro ao processar ${fileUrl}:`, e);
                    return null;
                }
            });
            
            const results = await Promise.all(insertionPromises);
            const successfulInserts = results.filter(Boolean).length;

            alert(`${successfulInserts} conteúdos adicionados e copy gerada!`);
            fetchData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsGeneratingBatch(false);
        }
    };

    const handleSaveMediaItem = async (id: string, updates: Partial<MediaItem>) => {
        // Ao salvar manualmente, atualizamos os campos principais e, em seguida, os feeds.
        const { error: updateError } = await supabase
            .from('media_items')
            .update(updates)
            .eq('id', id);
        
        if (updateError) {
            throw new Error(`Falha ao salvar: ${updateError.message}`);
        }
        
        // 2. Atualizar registros de feed (model_feed e global_feed)
        await updateFeedRecords(id, updates);

        // Atualiza o estado local
        setMediaItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        if (window.confirm(`Tem certeza que deseja excluir ${selectedIds.size} mídias?`)) {
            // Usamos o client normal, pois a política de RLS permite DELETE para o criador (admin)
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
                    
                    <input value={manualUrl} onChange={e => setManualUrl(e.target.value)} placeholder="URL da Mídia (Foto ou Vídeo)" className={inputStyle} required />
                    
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
                                disabled={isGeneratingManual || (!manualContext.trim() && !manualUrl)}
                                className="text-xs bg-primary/20 text-primary font-semibold px-2 py-1 rounded-md hover:bg-primary/40 disabled:opacity-50"
                            >
                                {isGeneratingManual ? 'Gerando...' : 'Gerar Copy ✨'}
                            </button>
                        </div>
                        <textarea value={manualContext} onChange={e => setManualContext(e.target.value)} placeholder="Ex: na banheira, lingerie preta, sorrindo..." className={`${inputStyle} h-16 resize-none`} />
                    </div>

                    {/* Preview da IA */}
                    {(aiPreview || manualUrl) && (
                        <div className="bg-privacy-border/50 p-3 rounded-lg space-y-1">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
                                <Sparkles className="w-4 h-4 text-primary" /> Preview da Mídia e Copy
                            </h3>
                            <div className="flex items-center gap-4 mb-3">
                                <img 
                                    src={manualType === 'image' ? stripTrackingParams(manualUrl) : '/video-fallback.svg'} 
                                    alt="Preview" 
                                    className="w-20 h-20 object-cover rounded-md border border-privacy-border"
                                />
                                <div className="text-xs">
                                    <p className="font-semibold text-white">URL da Mídia:</p>
                                    <p className="text-privacy-text-secondary break-all">{stripTrackingParams(manualUrl)}</p>
                                </div>
                            </div>
                            {aiPreview && (
                                <>
                                    <p className="text-xs text-primary font-medium">{aiPreview.subtitle}</p>
                                    <p className="text-xs text-white font-bold">{aiPreview.title}</p>
                                    <p className="text-xs text-privacy-text-secondary line-clamp-2">{aiPreview.description}</p>
                                    <p className="text-xs text-privacy-text-secondary/70">Tags: {aiPreview.tags.join(', ')}</p>
                                </>
                            )}
                        </div>
                    )}

                    {/* Campos de Copy (Preenchidos pela IA ou manualmente) */}
                    <input value={manualTitle} onChange={e => setManualTitle(e.target.value)} placeholder="Título" className={inputStyle} />
                    <input value={manualSubtitle} onChange={e => setManualSubtitle(e.target.value)} placeholder="Subtítulo" className={inputStyle} />
                    <textarea value={manualDescription} onChange={e => setManualDescription(e.target.value)} placeholder="Descrição" className={`${inputStyle} h-20 resize-none`} />
                    <input value={manualCta} onChange={e => setManualCta(e.target.value)} placeholder="CTA" className={inputStyle} />
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
                    <input value={batchBaseUrl} onChange={e => setBatchBaseUrl(e.target.value)} placeholder="URL Base (ex: https://cdn.com/foto/foto)" className={inputStyle} required />
                    <input type="number" value={batchCount} onChange={e => setBatchCount(parseInt(e.target.value))} placeholder="Quantidade" className={inputStyle} min="1" required />
                    <select value={batchType} onChange={e => setBatchType(e.target.value as 'image' | 'video')} className={inputStyle}>
                        <option value="image">Imagem (.png, .jpg)</option>
                        <option value="video">Vídeo (.mp4, .mov)</option>
                    </select>
                    <input value={batchExtension} onChange={e => setBatchExtension(e.target.value)} placeholder="Extensão (ex: .png ou .mp4)" className={inputStyle} required />
                    <p className="text-xs text-privacy-text-secondary">
                        {batchType === 'video' 
                            ? 'Para vídeos, a thumbnail será o fallback genérico. A Edge Function de thumbnail deve ser configurada separadamente.'
                            : 'Para fotos, a URL da mídia é usada como thumbnail.'
                        }
                    </p>
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