import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Model, Product } from '../../types';
import { Link as LinkIcon, Copy, Check, Trash2, ToggleLeft, ToggleRight, Clock, Users, Calendar, XCircle, Edit, Eye, TestTube } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { sha256Hex, generateStrongToken } from '../../lib/crypto';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';

// Tipos para a tabela access_links
interface AccessLink {
    id: string;
    token_hash: string;
    token_plain: string | null; // Novo campo
    scope: 'global' | 'model' | 'product';
    link_type: 'access' | 'grant'; // Novo campo
    model_id: string | null;
    product_id: string | null;
    expires_at: string | null;
    max_uses: number | null;
    uses: number;
    active: boolean;
    created_at: string;
    created_by: string | null;
    last_used_at: string | null;
    first_used_at: string | null;
    last_validator_name: string | null; // Novo campo
    last_validator_email: string | null; // Novo campo
}

// Tipos para a tabela access_link_visits
interface AccessLinkVisit {
    id: string;
    access_link_id: string; // Adicionado para consistência
    visited_at: string;
    visitor_name: string | null;
    visitor_email: string | null;
    user_id: string | null;
    user_agent: string | null;
    ip: string | null;
}

// Tipos para o formulário
interface LinkFormData {
    scope: 'global' | 'model' | 'product';
    linkType: 'access' | 'grant'; // Novo campo
    modelId: string;
    productId: string;
    expiresAt: string;
    maxUses: number | null;
}

const DOMAIN = window.location.origin;
const inputStyle = "w-full px-4 py-2 bg-privacy-black border border-privacy-border rounded-lg text-privacy-text-primary text-sm focus:outline-none focus:border-primary transition-colors";

// --- Componente de Visualização de Acessos ---
interface VisitModalProps {
    linkId: string;
    onClose: () => void;
}

const VisitModal: React.FC<VisitModalProps> = ({ linkId, onClose }: VisitModalProps) => {
    const [visits, setVisits] = useState<AccessLinkVisit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchVisits = async () => {
            setLoading(true);
            // RLS garante que apenas admins podem ler esta tabela
            const { data, error } = await supabase
                .from('access_link_visits')
                .select('*')
                .eq('access_link_id', linkId)
                .order('visited_at', { ascending: false })
                .limit(50);
            
            if (error) setError(error.message);
            else setVisits(data as AccessLinkVisit[]);
            setLoading(false);
        };
        fetchVisits();
    }, [linkId]);

    return (
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Eye size={20} /> Histórico de Acessos
                </DialogTitle>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
                {loading ? (
                    <p className="text-center text-privacy-text-secondary py-4">Carregando acessos...</p>
                ) : error ? (
                    <p className="text-red-400 py-4">{error}</p>
                ) : visits.length === 0 ? (
                    <p className="text-center text-privacy-text-secondary py-4">Nenhum acesso registrado ainda.</p>
                ) : (
                    <table className="w-full text-sm text-left text-privacy-text-secondary">
                        <thead className="text-xs text-privacy-text-secondary uppercase bg-privacy-border sticky top-0">
                            <tr>
                                <th className="px-4 py-2">Data/Hora</th>
                                <th className="px-4 py-2">Nome/Email</th>
                                <th className="px-4 py-2">IP</th>
                                <th className="px-4 py-2">User Agent (Parcial)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visits.map(v => (
                                <tr key={v.id} className="border-b border-privacy-border/50">
                                    <td className="px-4 py-2 text-xs">{new Date(v.visited_at).toLocaleString('pt-BR')}</td>
                                    <td className="px-4 py-2">
                                        <p className="text-white">{v.visitor_name || 'Anônimo'}</p>
                                        <p className="text-xs text-privacy-text-secondary/70">{v.visitor_email || '-'}</p>
                                    </td>
                                    <td className="px-4 py-2 text-xs">{v.ip || '-'}</td>
                                    <td className="px-4 py-2 text-xs truncate max-w-[150px]">{v.user_agent?.substring(0, 50) || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            <DialogFooter>
                <button onClick={onClose} className="bg-privacy-border text-white font-semibold py-2 px-4 rounded-lg">Fechar</button>
            </DialogFooter>
        </DialogContent>
    );
};


// --- Componente de Edição ---
interface EditLinkModalProps {
    link: AccessLink;
    onSave: (id: string, updates: { expires_at: string | null, max_uses: number | null, active: boolean }) => void;
    onClose: () => void;
}

const EditLinkModal: React.FC<EditLinkModalProps> = ({ link, onSave, onClose }: EditLinkModalProps) => {
    // Converte para formato local para o input datetime-local
    const localDateTime = link.expires_at 
        ? new Date(link.expires_at).toLocaleString('sv').replace(' ', 'T').slice(0, 16) 
        : '';
        
    const [expiresAt, setExpiresAt] = useState(localDateTime);
    const [maxUses, setMaxUses] = useState<number | string>(link.max_uses ?? '');
    const [active, setActive] = useState(link.active);
    const [loading, setLoading] = useState(false);

    const handleSave = () => {
        setLoading(true);
        
        // 1. Tratar maxUses: vazio ou 0 => null (ilimitado)
        let finalMaxUses: number | null = null;
        const parsedMaxUses = parseInt(String(maxUses), 10);
        if (!isNaN(parsedMaxUses) && parsedMaxUses >= 1) {
            finalMaxUses = parsedMaxUses;
        }
        
        // 2. Tratar expiresAt: vazio => null. Se tiver data, converte para ISO.
        let finalExpiresAt: string | null = null;
        if (expiresAt) {
            // Se o input é apenas data (YYYY-MM-DD), adicionamos 23:59:59 local antes de converter para UTC/ISO
            let dateToConvert = expiresAt;
            if (expiresAt.length === 10) { // Formato YYYY-MM-DD
                dateToConvert = `${expiresAt}T23:59:59`;
            }
            finalExpiresAt = new Date(dateToConvert).toISOString();
        }

        onSave(link.id, {
            expires_at: finalExpiresAt,
            max_uses: finalMaxUses,
            active,
        });
        setLoading(false);
        onClose();
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Editar Link de Acesso</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
                <p className="text-sm text-privacy-text-secondary">Escopo: <span className="font-semibold text-white capitalize">{link.scope}</span></p>
                <p className="text-sm text-privacy-text-secondary">Tipo: <span className={`font-semibold text-white capitalize ${link.link_type === 'grant' ? 'text-green-400' : 'text-primary'}`}>{link.link_type}</span></p>
                
                <div>
                    <label className="block text-sm font-medium text-privacy-text-secondary mb-1">Expira em (Opcional)</label>
                    <input 
                        type="datetime-local" 
                        value={expiresAt} 
                        onChange={e => setExpiresAt(e.target.value)} 
                        className={inputStyle} 
                    />
                    <p className="text-xs text-privacy-text-secondary/70 mt-1">Deixe vazio para nunca expirar. (Seu horário local)</p>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-privacy-text-secondary mb-1">Usos Máximos</label>
                    <input 
                        type="number" 
                        value={maxUses} 
                        onChange={e => setMaxUses(e.target.value)} 
                        placeholder="0 ou vazio = Ilimitado" 
                        className={inputStyle} 
                        min="0"
                    />
                    <p className="text-xs text-privacy-text-secondary/70 mt-1">Usos atuais: {link.uses}</p>
                </div>

                <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-privacy-text-secondary">Status</label>
                    <button 
                        type="button"
                        onClick={() => setActive(prev => !prev)}
                        className={`p-1 rounded-full transition-colors flex items-center gap-2 ${active ? 'text-green-500 bg-green-500/20' : 'text-red-500 bg-red-500/20'}`}
                    >
                        {active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        {active ? 'Ativo' : 'Inativo'}
                    </button>
                </div>
            </div>
            <DialogFooter>
                <button onClick={onClose} className="bg-privacy-border text-white font-semibold py-2 px-4 rounded-lg">Cancelar</button>
                <button onClick={handleSave} disabled={loading} className="bg-primary text-black font-bold py-2 px-4 rounded-lg disabled:opacity-50">
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </DialogFooter>
        </DialogContent>
    );
};

// --- Componente de Criação ---
const LinkForm: React.FC<{ models: Model[], products: Product[], onLinkCreated: (link: string) => void, userId: string, debugState: LinkFormData }> = ({ models, products, onLinkCreated, userId, debugState }: { models: Model[], products: Product[], onLinkCreated: (link: string) => void, userId: string, debugState: LinkFormData }) => {
    const [formData, setFormData] = useState<LinkFormData>(debugState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sincroniza o estado interno com o estado de debug (que é o estado inicial)
    useEffect(() => {
        setFormData(debugState);
    }, [debugState]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setError(null);

        if (name === 'linkType') {
            const newLinkType = value as 'access' | 'grant';
            let newScope = formData.scope;
            
            // Se mudar para 'grant', força o escopo para 'model' se for 'global'
            if (newLinkType === 'grant' && newScope === 'global') {
                newScope = 'model';
            }
            
            setFormData(prev => ({ 
                ...prev, 
                linkType: newLinkType,
                scope: newScope,
                // Se mudar para 'access' e o escopo for 'global', limpa IDs
                modelId: newScope === 'global' ? '' : prev.modelId,
                productId: newScope === 'global' ? '' : prev.productId,
            }));
            return;
        }
        
        if (name === 'scope') {
            const newScope = value as 'global' | 'model' | 'product';
            setFormData(prev => ({ 
                ...prev, 
                scope: newScope,
                // Limpa IDs se mudar de escopo
                modelId: newScope === 'global' ? '' : prev.modelId,
                productId: newScope !== 'product' ? '' : prev.productId,
            }));
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // 0 ou vazio = null (ilimitado)
        setFormData(prev => ({ ...prev, maxUses: value === '' || parseInt(value, 10) === 0 ? null : parseInt(value, 10) }));
    };

    const handleGenerateToken = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { scope, linkType, modelId, productId, expiresAt, maxUses } = formData;
        
        const isGrant = linkType === 'grant';
        
        // --- Validação de Coerência ---
        
        // 1. Grant não pode ser Global
        if (isGrant && scope === 'global') {
            setError('Links do tipo "Grant" não podem ter escopo "Global".');
            setLoading(false);
            return;
        }
        
        // 2. Grant deve ter modelo OU produto
        if (isGrant && !modelId && !productId) {
            setError('Links do tipo "Grant" devem ser vinculados a uma Modelo ou Produto específico.');
            setLoading(false);
            return;
        }
        
        // 3. Access/Model exige modelId
        if (linkType === 'access' && scope === 'model' && !modelId) {
            setError('Selecione uma modelo para o escopo "Modelo".');
            setLoading(false);
            return;
        }
        
        // 4. Access/Product exige productId
        if (scope === 'product' && !productId) {
            setError('Selecione um produto para o escopo "Produto".');
            setLoading(false);
            return;
        }
        
        // -----------------------------
        
        // 5. Tratar maxUses
        let finalMaxUses: number | null = maxUses;
        if (finalMaxUses !== null && finalMaxUses < 1) {
            setError('Usos máximos deve ser um número positivo ou vazio/zero.');
            setLoading(false);
            return;
        }
        
        // 6. Tratar expiresAt
        let finalExpiresAt: string | null = null;
        if (expiresAt) {
            let dateToConvert = expiresAt;
            if (expiresAt.length === 10) { 
                dateToConvert = `${expiresAt}T23:59:59`;
            }
            finalExpiresAt = new Date(dateToConvert).toISOString();
        }

        try {
            // 7. Gerar token forte e hash
            const rawToken = generateStrongToken();
            const tokenHash = await sha256Hex(rawToken);

            // 8. Preparar payload
            const payload = {
                token_hash: tokenHash,
                token_plain: rawToken,
                scope,
                link_type: linkType,
                // Se for Global, model_id e product_id devem ser NULL
                model_id: scope === 'global' ? null : (scope === 'product' ? modelId : modelId || null),
                product_id: scope === 'product' ? productId : null,
                expires_at: finalExpiresAt,
                max_uses: finalMaxUses,
                created_by: userId,
            };
            
            // 9. Inserir no Supabase
            const { error: insertError } = await supabase.from('access_links').insert([payload]);

            if (insertError) throw insertError;

            // 10. Mostrar link final
            const finalLink = `${DOMAIN}/acesso/${encodeURIComponent(rawToken)}`;
            onLinkCreated(finalLink);

        } catch (err: any) {
            console.error('Error generating link:', err);
            setError(err.message || 'Erro ao gerar link de acesso.');
        } finally {
            setLoading(false);
        }
    };
    
    const isGrant = formData.linkType === 'grant';
    const isProductScope = formData.scope === 'product';
    const isModelScope = formData.scope === 'model';
    const isGlobalScope = formData.scope === 'global';
    
    const filteredProducts = formData.modelId 
        ? products.filter(p => p.model_id === formData.modelId)
        : products;
        
    const selectedProduct = products.find(p => p.id === formData.productId);
    
    // Efeito para garantir que o modelId seja preenchido se o produto for selecionado
    useEffect(() => {
        if (isProductScope && selectedProduct?.model_id && formData.modelId !== selectedProduct.model_id) {
            setFormData(prev => ({ ...prev, modelId: selectedProduct.model_id || '' }));
        }
    }, [isProductScope, formData.productId, selectedProduct?.model_id]);


    return (
        <form onSubmit={handleGenerateToken} className="bg-privacy-surface p-6 rounded-lg space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Gerar Novo Link de Acesso</h2>
            
            {error && <p className="text-red-400 bg-red-500/10 p-3 rounded-md text-sm">{error}</p>}

            <div>
                <label className="block text-sm font-medium text-privacy-text-secondary mb-1">Tipo de Link</label>
                <select name="linkType" value={formData.linkType} onChange={handleChange} className={inputStyle} required>
                    <option value="access">Access (Temporário - Acesso via token)</option>
                    <option value="grant">Grant (Permanente - Cria compra no 1º acesso)</option>
                </select>
                {isGrant && (
                    <p className="text-xs text-green-400 mt-1">
                        ⚠️ Grant: Cria um registro de compra permanente (status 'paid') no banco de dados para o usuário no primeiro acesso.
                    </p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-privacy-text-secondary mb-1">Escopo de Acesso</label>
                <select name="scope" value={formData.scope} onChange={handleChange} className={inputStyle} required>
                    <option value="global" disabled={isGrant}>Global (Acesso a tudo)</option>
                    <option value="model">Modelo Específica</option>
                    <option value="product">Produto Específico</option>
                </select>
                {isGlobalScope && !isGrant && (
                    <p className="text-xs text-primary mt-1">
                        Access Global: Concede acesso temporário a todos os conteúdos de todas as modelos.
                    </p>
                )}
            </div>

            {/* Se for Grant, Model ou Product, mostramos o seletor de Modelo */}
            {(!isGlobalScope || isGrant) && (
                <div>
                    <label className="block text-sm font-medium text-privacy-text-secondary mb-1">Modelo</label>
                    <select 
                        name="modelId" 
                        value={formData.modelId} 
                        onChange={handleChange} 
                        className={inputStyle} 
                        required={isModelScope && !isProductScope}
                        disabled={isProductScope && !!selectedProduct?.model_id} // Desabilita se o produto já define a modelo
                    >
                        <option value="">{isModelScope ? 'Selecione uma modelo' : 'Filtrar por modelo (Opcional)'}</option>
                        {models.map(m => <option key={m.id} value={m.id}>{m.name} (@{m.username})</option>)}
                    </select>
                </div>
            )}

            {isProductScope && (
                <div>
                    <label className="block text-sm font-medium text-privacy-text-secondary mb-1">Produto</label>
                    <select name="productId" value={formData.productId} onChange={handleChange} className={inputStyle} required>
                        <option value="">Selecione um produto</option>
                        {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
                    </select>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-privacy-text-secondary mb-1">Expira em (Opcional)</label>
                    <input type="datetime-local" name="expiresAt" value={formData.expiresAt} onChange={handleChange} className={inputStyle} />
                    <p className="text-xs text-privacy-text-secondary/70 mt-1">Deixe vazio para nunca expirar. (Seu horário local)</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-privacy-text-secondary mb-1">Usos Máximos</label>
                    <input type="number" name="maxUses" value={formData.maxUses ?? ''} onChange={handleNumberChange} placeholder="0 ou vazio = Ilimitado" className={inputStyle} min="0" />
                    <p className="text-xs text-privacy-text-secondary/70 mt-1">0 ou vazio = Ilimitado</p>
                </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-primary text-black font-bold py-3 rounded-lg hover:opacity-90 transition disabled:opacity-50">
                {loading ? 'Gerando...' : 'Gerar Link de Acesso'}
            </button>
        </form>
    );
};

// --- Componente de Listagem ---
const LinkList: React.FC<{ links: AccessLink[], onToggleActive: (id: string, active: boolean) => void, onDelete: (id: string) => void, onEdit: (link: AccessLink) => void, onShowVisits: (linkId: string) => void, onTestLink: (link: AccessLink) => void }> = ({ links, onToggleActive, onDelete, onEdit, onShowVisits, onTestLink }: { links: AccessLink[], onToggleActive: (id: string, active: boolean) => void, onDelete: (id: string) => void, onEdit: (link: AccessLink) => void, onShowVisits: (linkId: string) => void, onTestLink: (link: AccessLink) => void }) => {
    const isExpired = (link: AccessLink) => link.expires_at && new Date(link.expires_at) < new Date();
    const isMaxUses = (link: AccessLink) => link.max_uses !== null && link.uses >= link.max_uses;
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

    const handleCopyLink = (tokenPlain: string) => {
        const link = `${DOMAIN}/acesso/${encodeURIComponent(tokenPlain)}`;
        navigator.clipboard.writeText(link);
        setCopyFeedback('Link copiado!');
        setTimeout(() => setCopyFeedback(null), 2000);
    };

    return (
        <div className="bg-privacy-surface p-6 rounded-lg shadow-lg mt-8">
            <h2 className="text-xl font-bold text-privacy-text-primary mb-4">Links Existentes ({links.length})</h2>
            {copyFeedback && <p className="text-green-400 text-sm mb-3">{copyFeedback}</p>}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-privacy-text-secondary">
                    <thead className="text-xs text-privacy-text-secondary uppercase bg-privacy-border">
                        <tr>
                            <th scope="col" className="px-4 py-3">Status</th>
                            <th scope="col" className="px-4 py-3">Tipo</th>
                            <th scope="col" className="px-4 py-3">Escopo</th>
                            <th scope="col" className="px-4 py-3">Usos</th>
                            <th scope="col" className="px-4 py-3">Expira em</th>
                            <th scope="col" className="px-4 py-3">Último Validador</th>
                            <th scope="col" className="px-4 py-3">Link</th>
                            <th scope="col" className="px-4 py-3">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {links.map((link) => {
                            const expired = isExpired(link);
                            const maxUses = isMaxUses(link);
                            const statusColor = link.active && !expired && !maxUses ? 'text-green-400' : 'text-red-400';
                            const statusText = expired ? 'Expirado' : maxUses ? 'Esgotado' : link.active ? 'Ativo' : 'Inativo';
                            const linkTypeColor = link.link_type === 'grant' ? 'text-green-400' : 'text-primary';

                            return (
                                <tr key={link.id} className="bg-privacy-surface border-b border-privacy-border hover:bg-privacy-border/50">
                                    <td className={`px-4 py-3 font-medium ${statusColor}`}>
                                        {statusText}
                                    </td>
                                    <td className={`px-4 py-3 font-medium capitalize ${linkTypeColor}`}>
                                        {link.link_type}
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
                                        {link.expires_at ? new Date(link.expires_at).toLocaleDateString('pt-BR') : 'Nunca'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-white text-xs">{link.last_validator_name || '—'}</p>
                                        <p className="text-privacy-text-secondary text-[10px] truncate max-w-[100px]">{link.last_validator_email || '—'}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        {link.token_plain ? (
                                            <button 
                                                onClick={() => handleCopyLink(link.token_plain!)}
                                                className="text-xs bg-privacy-border px-2 py-1 rounded hover:bg-primary hover:text-black flex items-center gap-1"
                                            >
                                                <Copy size={12} /> Copiar
                                            </button>
                                        ) : (
                                            <span className="text-xs text-red-400">Token indisponível</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 space-x-2 flex items-center">
                                        <button 
                                            onClick={() => onTestLink(link)}
                                            className="p-1 rounded-full text-yellow-400 hover:bg-yellow-400/20 transition-colors"
                                            title="Testar Link"
                                        >
                                            <TestTube size={20} />
                                        </button>
                                        <button 
                                            onClick={() => onShowVisits(link.id)}
                                            className="p-1 rounded-full text-blue-400 hover:bg-blue-400/20 transition-colors"
                                            title="Ver Acessos"
                                        >
                                            <Eye size={20} />
                                        </button>
                                        <button 
                                            onClick={() => onEdit(link)}
                                            className="p-1 rounded-full text-primary hover:bg-primary/20 transition-colors"
                                            title="Editar"
                                        >
                                            <Edit size={20} />
                                        </button>
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
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [linkToEdit, setLinkToEdit] = useState<AccessLink | null>(null);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [isGeneratedModalOpen, setIsGeneratedModalOpen] = useState(false);
    const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
    const [linkIdToView, setLinkIdToView] = useState<string | null>(null);
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);
    const [testResult, setTestResult] = useState<{ ok: boolean, code: string, message: string } | null>(null);
    
    // Estado inicial do formulário para debug
    const initialFormState: LinkFormData = {
        scope: 'global',
        linkType: 'access',
        modelId: '',
        productId: '',
        expiresAt: '',
        maxUses: null,
    };
    const [debugFormState, setDebugFormState] = useState<LinkFormData>(initialFormState);


    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Buscando token_plain, link_type, last_validator_name e last_validator_email
            const [linksRes, modelsRes, productsRes] = await Promise.all([
                supabase.from('access_links').select('*, token_plain, link_type, last_validator_name, last_validator_email').order('created_at', { ascending: false }),
                supabase.from('models').select('id, name, username'),
                supabase.from('products').select('id, name, type, model_id'), // Adicionado model_id para filtrar no form
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
        console.log('[ManageAccessLinks] DEBUG VERSION v2025-12-25');
        fetchData();
    }, [fetchData]);

    const handleLinkCreated = (link: string) => {
        setGeneratedLink(link);
        setIsGeneratedModalOpen(true);
        fetchData(); // Recarrega a lista para mostrar o novo link
    };

    const handleEdit = (link: AccessLink) => {
        setLinkToEdit(link);
        setIsEditModalOpen(true);
    };
    
    const handleShowVisits = (linkId: string) => {
        setLinkIdToView(linkId);
        setIsVisitModalOpen(true);
    };

    const handleSaveEdit = async (id: string, updates: { expires_at: string | null, max_uses: number | null, active: boolean }) => {
        const { error: updateError } = await supabase.from('access_links').update(updates).eq('id', id);
        if (updateError) {
            alert(`Erro ao atualizar link: ${updateError.message}`);
        } else {
            fetchData();
        }
    };

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
    
    const handleTestLink = async (link: AccessLink) => {
        if (!link.token_plain) {
            setTestResult({ ok: false, code: 'MISSING_TOKEN', message: 'Token puro não está salvo no banco.' });
            setIsTestModalOpen(true);
            return;
        }
        
        setIsTestModalOpen(true);
        setTestResult(null);
        
        try {
            // 1. Diagnóstico de Hash
            const localHash = await sha256Hex(link.token_plain);
            if (localHash !== link.token_hash) {
                setTestResult({ 
                    ok: false, 
                    code: 'HASH_MISMATCH', 
                    message: `O hash calculado localmente (${localHash.substring(0, 10)}...) não corresponde ao hash salvo no DB (${link.token_hash.substring(0, 10)}...). O link foi criado incorretamente.` 
                });
                return;
            }
            
            // 2. Chamar EF com o token puro
            const { data, error: invokeError } = await supabase.functions.invoke('validate-access-link', {
                body: { token: link.token_plain, visitor_name: 'Admin Teste', visitor_email: 'admin@teste.com', user_id: user?.id },
            });
            
            if (invokeError) {
                setTestResult({ ok: false, code: 'EF_ERROR', message: invokeError.message });
                return;
            }
            
            if (data.ok === false) {
                setTestResult({ ok: false, code: data.code, message: data.message });
            } else {
                setTestResult({ ok: true, code: 'OK', message: `Link validado com sucesso! (Uso registrado). Tipo: ${data.grant?.link_type}` });
                fetchData(); // Atualiza a lista para mostrar o incremento de 'uses'
            }
            
        } catch (err: any) {
            setTestResult({ ok: false, code: 'UNEXPECTED_ERROR', message: err.message });
        }
    };

    if (loading) return <p className="text-center text-privacy-text-secondary">Carregando...</p>;
    if (error) return <p className="text-center text-red-400">{error}</p>;
    if (!user) return <p className="text-center text-red-400">Usuário admin não autenticado.</p>;

    return (
        <div>
            <div className="bg-red-800/20 border border-red-500/50 p-2 mb-4 text-xs text-white">
                <p className="text-lg font-bold text-red-400">ManageAccessLinks DEBUG v2025-12-25</p>
                <p>Form State: Type={debugFormState.linkType} | Scope={debugFormState.scope}</p>
            </div>
            <h1 className="text-3xl font-bold text-white mb-6">Gerenciar Links de Acesso</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <LinkForm 
                    models={models} 
                    products={products} 
                    onLinkCreated={handleLinkCreated} 
                    userId={user.id}
                    debugState={debugFormState}
                />
            </div>

            <LinkList 
                links={links} 
                onToggleActive={handleToggleActive} 
                onDelete={handleDelete}
                onEdit={handleEdit}
                onShowVisits={handleShowVisits}
                onTestLink={handleTestLink}
            />
            
            {/* Modal de Teste */}
            <Dialog open={isTestModalOpen} onOpenChange={setIsTestModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <TestTube size={20} /> Resultado do Teste
                        </DialogTitle>
                    </DialogHeader>
                    {testResult && (
                        <div className={`p-4 rounded-lg ${testResult.ok ? 'bg-green-500/10 border border-green-500/50' : 'bg-red-500/10 border border-red-500/50'}`}>
                            <p className={`font-bold ${testResult.ok ? 'text-green-400' : 'text-red-400'}`}>
                                Status: {testResult.code}
                            </p>
                            <p className="text-sm text-white mt-2">{testResult.message}</p>
                            {testResult.ok && <p className="text-xs text-privacy-text-secondary mt-1">O contador de usos foi incrementado.</p>}
                        </div>
                    )}
                    <DialogFooter>
                        <button onClick={() => setIsTestModalOpen(false)} className="bg-primary text-black font-bold py-2 px-4 rounded-lg">
                            Fechar
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Edição */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                {linkToEdit && (
                    <EditLinkModal 
                        link={linkToEdit} 
                        onSave={handleSaveEdit} 
                        onClose={() => setIsEditModalOpen(false)} 
                    />
                )}
            </Dialog>

            {/* Modal de Visualização de Acessos */}
            <Dialog open={isVisitModalOpen} onOpenChange={setIsVisitModalOpen}>
                {linkIdToView && (
                    <VisitModal 
                        linkId={linkIdToView} 
                        onClose={() => setIsVisitModalOpen(false)} 
                    />
                )}
            </Dialog>

            {/* Modal de Link Gerado (Segurança: Copiar Agora) */}
            <Dialog open={isGeneratedModalOpen} onOpenChange={setIsGeneratedModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-green-400 flex items-center gap-2">
                            <Check size={20} /> Link Gerado com Sucesso!
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-white">
                            <span className="font-bold text-red-400">ATENÇÃO:</span> Copie o link abaixo AGORA. Por motivos de segurança, o token não será exibido novamente.
                        </p>
                        <div className="flex items-center gap-2 bg-privacy-black p-3 rounded-md border border-green-500/50">
                            <input 
                                type="text" 
                                value={generatedLink || ''} 
                                readOnly 
                                className="flex-1 bg-transparent text-xs text-white truncate"
                            />
                            <button 
                                type="button" 
                                onClick={() => {
                                    if (generatedLink) navigator.clipboard.writeText(generatedLink);
                                    alert('Link copiado!');
                                }} 
                                className="text-xs bg-primary/20 text-primary font-semibold px-2 py-1 rounded-md hover:bg-primary/40"
                            >
                                <Copy size={14} className="inline mr-1" /> Copiar
                            </button>
                        </div>
                    </div>
                    <DialogFooter>
                        <button onClick={() => setIsGeneratedModalOpen(false)} className="bg-primary text-black font-bold py-2 px-4 rounded-lg">
                            Entendi
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};