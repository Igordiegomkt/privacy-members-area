import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

interface PaymentProvider {
  id: string;
  provider: 'mercado_pago' | 'pushinpay';
  display_name: string;
  public_key?: string;
  client_id?: string;
  is_active: boolean;
}

const ProviderCard: React.FC<{ provider: PaymentProvider; onUpdate: () => void }> = ({ provider, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ ...provider });
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        const { error } = await supabase.from('payment_providers_config').update({
            public_key: formData.public_key,
            client_id: formData.client_id
        }).eq('id', provider.id);
        if (error) alert(error.message);
        else {
            setIsEditing(false);
            onUpdate();
        }
        setLoading(false);
    };

    const handleActivate = async () => {
        setLoading(true);
        try {
            await supabase.from('payment_providers_config').update({ is_active: false }).neq('id', provider.id);
            await supabase.from('payment_providers_config').update({ is_active: true }).eq('id', provider.id);
            onUpdate();
        } catch (err: any) {
            alert(err.message);
        }
        setLoading(false);
    };

    const inputStyle = "w-full px-4 py-2 bg-privacy-black border border-privacy-border rounded-lg text-privacy-text-primary focus:outline-none focus:border-primary";

    return (
        <div className={`bg-privacy-surface p-6 rounded-lg border-2 ${provider.is_active ? 'border-primary' : 'border-transparent'}`}>
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-white">{provider.display_name}</h2>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${provider.is_active ? 'bg-primary/20 text-primary' : 'bg-privacy-border text-privacy-text-secondary'}`}>
                        {provider.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                </div>
                {!provider.is_active && <button onClick={handleActivate} disabled={loading} className="bg-primary text-black font-bold py-2 px-4 rounded">Ativar</button>}
            </div>
            <div className="mt-4 space-y-4">
                <div>
                    <label className="text-sm text-privacy-text-secondary">Public Key</label>
                    <input value={formData.public_key || ''} onChange={e => setFormData({...formData, public_key: e.target.value})} className={inputStyle} readOnly={!isEditing} />
                </div>
                <div>
                    <label className="text-sm text-privacy-text-secondary">Client ID</label>
                    <input value={formData.client_id || ''} onChange={e => setFormData({...formData, client_id: e.target.value})} className={inputStyle} readOnly={!isEditing} />
                </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
                {isEditing ? (
                    <>
                        <button onClick={() => setIsEditing(false)} className="text-sm text-privacy-text-secondary">Cancelar</button>
                        <button onClick={handleSave} disabled={loading} className="bg-primary text-black font-bold py-1 px-3 rounded">{loading ? '...' : 'Salvar'}</button>
                    </>
                ) : (
                    <button onClick={() => setIsEditing(true)} className="text-sm text-primary">Editar</button>
                )}
            </div>
        </div>
    );
};

export const PaymentSettings: React.FC = () => {
    const [providers, setProviders] = useState<PaymentProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProviders = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('payment_providers_config').select('*');
        if (error) setError(error.message);
        else setProviders(data as PaymentProvider[]);
        setLoading(false);
    }, []);

    useEffect(() => { fetchProviders(); }, [fetchProviders]);

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-6">Configurações de Pagamento</h1>
            <p className="text-privacy-text-secondary mb-8">
                Gerencie os provedores de pagamento. Apenas um pode estar ativo por vez. As chaves secretas (Access Tokens) devem ser configuradas como segredos nas Edge Functions.
            </p>
            
            {error && <p className="text-red-400 bg-red-500/10 p-3 rounded-md mb-4">{error}</p>}

            {loading ? (
                <p className="text-privacy-text-secondary">Carregando...</p>
            ) : (
                <div className="space-y-4 max-w-2xl">
                    {providers.map(provider => (
                        <ProviderCard key={provider.id} provider={provider} onUpdate={fetchProviders} />
                    ))}
                </div>
            )}
        </div>
    );
}