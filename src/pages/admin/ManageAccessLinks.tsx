import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Model, Product } from '../../types';
import { Link as LinkIcon, Copy, Check, Trash2, ToggleLeft, ToggleRight, Clock, Users, Calendar, XCircle } from 'lucide-react';
import { createHash } from 'crypto-js'; // Usando crypto-js para sha256 no frontend

// Tipos para a tabela access_links
interface AccessLink {
    id: string;
    token_hash: string;
    scope: 'global' | 'model' | 'product';
    model_id: string | null;
    product_id: string | null;
    expires_at: string | null;
    max_uses: number | null;
    uses: number;
    active: boolean;
    created_at: string;
    created_by: string | null;
}

// Tipos para o formulário
interface LinkFormData {
    scope: 'global' | 'model' | 'product';
    modelId: string;
    productId: string;
    expiresAt: string;
    maxUses: number | null;
}

const DOMAIN = window.location.origin;

const LinkForm: React.FC<{ models: Model[], products: Product[], onLinkCreated: () => void, userId: string }> = ({ models, products, onLinkCreated, userId }: { models: Model[], products: Product[], onLinkCreated: () => void, userId: string }) => {
    const [formData, setFormData] = useState<LinkFormData>({
        scope: 'global',
        modelId: '',
        productId: '',
        expiresAt: '',
        maxUses: null,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setGeneratedLink(null);
        setError(null);
    };
    
    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFormData(prev => ({ ...prev, maxUses: value ? parseInt(value, 10) : null }));
    };

    const handleGenerateToken = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setGeneratedLink(null);

        const { scope, modelId, productId, expiresAt, maxUses } = formData;

        // Validação de coerência no frontend
        if (scope === 'model' && !modelId) {
            setError('Selecione uma modelo para o escopo "Modelo".');
            setLoading(false);
            return;
        }
        if (scope === 'product' && !productId) {
            setError('Selecione um produto para o escopo "Produto".');
            setLoading(false);
            return;
        }
        if (scope === 'global' && (modelId || productId)) {
            setError('Escopo "Global" não deve ter modelo ou produto selecionado.');
            setLoading(false);
            return;
        }

        try {
            // 1. Gerar token forte (UUID + 16 bytes rand)
            const rawToken = crypto.randomUUID() + btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
            
            // 2. Calcular SHA256 hash (usando crypto-js para compatibilidade)
            const tokenHash = createHash('sha256').update(rawToken).toString('hex');

            // 3. Preparar payload
            const payload = {
                token_hash: tokenHash,
                scope,
                model_id: scope === 'model' ? modelId : null,
                product_id: scope === 'product' ? productId : null,
                expires_at: expiresAt || null,
                max_uses: maxUses,
                created_by: userId,
            };

            // 4. Inserir no Supabase (Service Role Key não é necessário aqui, pois o admin tem RLS INSERT)
            const { error: insertError } = await supabase.from('access_links').insert([payload]);

            if (insertError) throw insertError;

            // 5. Mostrar link final
            const finalLink = `${DOMAIN}/?access=${rawToken}`;
            setGeneratedLink(finalLink);
            onLinkCreated();

        } catch (err: any) {
            console.error('Error generating link:', err);
            setError(err.message || 'Erro ao gerar link de acesso.');
        } finally {
            setLoading(false);
        }
    };
    
    const handleCopyLink = () => {
        if (!generatedLink) return;
        navigator.clipboard.writeText(generatedLink);
        setCopyFeedback('Link copiado!');
        setTimeout(() => setCopyFeedback(null), 2000);
    };

    const inputStyle = "w-full px-4 py-2 bg-privacy-black border border-privacy-border rounded-lg text-privacy-text-primary text-sm focus:outline-none focus:border-primary transition-colors";

    return (
        <form onSubmit={handleGenerateToken} className="bg-privacy-surface p-6 rounded-lg space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Gerar Novo Link de Acesso</h2>
            
            {error && <p className="text-red-400 bg-red-500/10 p-3 rounded-md text-sm">{error}</p>}

            <div>
                <label className="block text-sm font-medium text-privacy-text-secondary mb-1">Escopo de Acesso</label>
                <select name="scope" value={formData.scope} onChange={handleChange} className={inputStyle} required>
                    <option value="global">Global (Acesso a tudo)</option>
                    <option value="model">Modelo Específica</option>
                    <option value="product">Produto Específico</option>
                </select>
            </div>

            {formData.scope === 'model' && (
                <div>
                    <label className="block text-sm font-medium text-privacy-text-secondary mb-1">Modelo</label>
                    <select name="modelId" value={formData.modelId} onChange={handleChange} className={inputStyle} required>
                        <option value="">Selecione uma modelo</option>
                        {models.map(m => <option key={m.id} value={m.id}>{m.name} (@{m.username})</option>)}
                    </select>
                </div>
            )}

            {formData.scope === 'product' && (
                <div>
                    <label className="block text-sm font-medium text-privacy-text-secondary mb-1">Produto</label>
                    <select name="productId" value={formData.productId} onChange={handleChange} className={inputStyle} required>
                        <option value="">Selecione um produto</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
                    </select>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-privacy-text-secondary mb-1">Expira em (Opcional)</label>
                    <input type="datetime-local" name="expiresAt" value={formData.expiresAt} onChange={handleChange} className={inputStyle} />
                    <p className="text-xs text-privacy-text-secondary/70 mt-1">Deixe vazio para nunca expirar.</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-privacy-text-secondary mb-1">Usos Máximos (Opcional)</label>
                    <input type="number" name="maxUses" value={formData.maxUses ?? ''} onChange={handleNumberChange} placeholder="Ilimitado" className={inputStyle} min="1" />
                    <p className="text-xs text-privacy-text-secondary/70 mt-1">Deixe vazio para usos ilimitados.</p>
                </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-primary text-black font-bold py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50">
                {loading ? 'Gerando...' : 'Gerar Link de Acesso'}
            </button>
            
            {generatedLink && (
                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/50 rounded-lg space-y-2">
                    <p className="text-green-400 font-semibold flex items-center gap-2">
                        <Check size={16} /> Link Gerado com Sucesso!
                    </p>
                    <div className="flex items-center gap-2 bg-privacy-black p-2 rounded-md">
                        <input 
                            type="text" 
                            value={generatedLink} 
                            readOnly 
                            className="flex-1 bg-transparent text-xs text-white truncate"
                        />
                        <button type="button" onClick={handleCopyLink} className="text-xs bg-primary/20 text-primary font-semibold px-2 py-1 rounded-md hover:bg-primary/40">
                            <Copy size={14} className="inline mr-1" /> Copiar
                        </button>
                    </div>
                    {copyFeedback && <p className="text-xs text-center text-green-400">{copyFeedback}</p>}
                    <p className="text-xs text-green-400/80">
                        Compartilhe este link. Ele concede acesso temporário/limitado.
                    </p>
                </div>
            )}
        </form>
    );
};

const LinkList: React.FC<{ links: AccessLink[], onToggleActive: (id: string, active: boolean) => void, onDelete: (id: string) => void }> = ({ links, onToggleActive, onDelete }: { links: AccessLink[], onToggleActive: (id: string, active: boolean) => void, onDelete: (id: string) => void }) => {
    const isExpired = (link: AccessLink) => link.expires_at && new Date(link.expires_at) < new Date();
    const isMaxUses = (link: AccessLink) => link.max_uses !== null && link.uses >= link.max_uses;

    return (
        <div className="bg-privacy-surface p-6 rounded-lg shadow-lg mt-8">
            <h2 className="text-xl font-bold text-privacy-text-primary mb-4">Links Existentes ({links.length})</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-privacy-text-secondary">
                    <thead className="text-xs text-privacy-text-secondary uppercase bg-privacy-border">
                        <tr>
                            <th scope="col" className="px-4 py-3">Status</th>
                            <th scope="col" className="px-4 py-3">Escopo</th>
                            <th scope="col" className="px-4 py-3">Usos</th>
                            <th scope="col" className="px-4 py-3">Expira em</th>
                            <th scope="col" className="px-4 py-3">Criado em</th>
                            <th scope="col" className="px-4 py-3">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {links.map((link) => {
                            const expired = isExpired(link);
                            const maxUses = isMaxUses(link);
                            const statusColor = link.active && !expired && !maxUses ? 'text-green-400' : 'text-red-400';
                            const statusText = expired ? 'Expirado' : maxUses ? 'Limite Atingido' : link.active ? 'Ativo' : 'Inativo';

                            return (
                                <tr key={link.id} className="bg-privacy-surface border-b border-privacy-border hover:bg-privacy-border/50">
                                    <td className={`px-4 py-3 font-medium ${statusColor}`}>
                                        {statusText}
                                    </td>
                                    <td className="px-4 py-3 capitalize">
                                        {link.scope}
                                        {link.model_id && <span className="block text-xs text-privacy-text-secondary/70">Modelo ID: {link.model_id.substring(0, 4)}...</span>}
                                        {link.product_id && <span className="block text-xs text-privacy-text-secondary/70">Produto ID: {link.product_id.substring(0, 4)}...</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        {link.uses} / {link.max_uses ?? '∞'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {link.expires_at ? new Date(link.expires_at).toLocaleString('pt-BR') : 'Nunca'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {new Date(link.created_at).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="px-4 py-3 space-x-2 flex items-center">
                                        <button 
                                            onClick={() => onToggleActive(link.id, !link.active)}
                                            className={`p-1 rounded-full transition-colors ${link.active ? 'text-green-500 hover:bg-green-500/20' : 'text-red-500 hover:bg-red-500/20'}`}
                                            title={link.active ? 'Desativar' : 'Ativar'}
                                        >
                                            {link.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                        </button>
                                        <button 
                                            onClick={() => onDelete(link.id)}
                                            className="p-1 rounded-full text-red-500 hover:bg-red-500/20 transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


export const ManageAccessLinks: React.FC = () => {
    const { user } = useAuth();
    const [links, setLinks] = useState<AccessLink[]>([]);
    const [models, setModels] = useState<Model[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [linksRes, modelsRes, productsRes] = await Promise.all([
                supabase.from('access_links').select('*').order('created_at', { ascending: false }),
                supabase.from('models').select('id, name, username'),
                supabase.from('products').select('id, name, type'),
            ]);

            if (linksRes.error) throw linksRes.error;
            if (modelsRes.error) throw modelsRes.error;
            if (productsRes.error) throw productsRes.error;

            setLinks(linksRes.data as AccessLink[]);
            setModels(modelsRes.data as Model[]);
            setProducts(productsRes.data as Product[]);

        } catch (err: any) {
            setError(err.message || 'Erro ao carregar dados.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleToggleActive = async (id: string, active: boolean) => {
        const { error: updateError } = await supabase.from('access_links').update({ active }).eq('id', id);
        if (updateError) {
            alert(`Erro ao atualizar status: ${updateError.message}`);
        } else {
            fetchData();
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir este link?')) return;
        const { error: deleteError } = await supabase.from('access_links').delete().eq('id', id);
        if (deleteError) {
            alert(`Erro ao excluir: ${deleteError.message}`);
        } else {
            fetchData();
        }
    };

    if (loading) return <p className="text-center text-privacy-text-secondary">Carregando...</p>;
    if (error) return <p className="text-center text-red-400">{error}</p>;
    if (!user) return <p className="text-center text-red-400">Usuário admin não autenticado.</p>;

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-6">Gerenciar Links de Acesso</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <LinkForm 
                    models={models} 
                    products={products} 
                    onLinkCreated={fetchData} 
                    userId={user.id}
                />
            </div>

            <LinkList 
                links={links} 
                onToggleActive={handleToggleActive} 
                onDelete={handleDelete}
            />
        </div>
    );
};