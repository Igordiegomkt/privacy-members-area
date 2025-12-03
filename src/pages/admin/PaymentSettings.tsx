import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

interface PaymentProvider {
  id: string;
  provider: 'mercado_pago' | 'pushinpay';
  display_name: string;
  public_key?: string;
  is_active: boolean;
}

export const PaymentSettings: React.FC = () => {
    const [providers, setProviders] = useState<PaymentProvider[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchProviders = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('payment_providers_config').select('*');
        if (error) alert(error.message);
        else setProviders(data as PaymentProvider[]);
        setLoading(false);
    }, []);

    useEffect(() => { fetchProviders(); }, [fetchProviders]);

    const handleActivate = async (providerId: string) => {
        // Deactivate all others
        await supabase.from('payment_providers_config').update({ is_active: false }).neq('id', providerId);
        // Activate the selected one
        const { error } = await supabase.from('payment_providers_config').update({ is_active: true }).eq('id', providerId);
        if (error) alert(error.message);
        else {
            alert('Provedor ativado com sucesso!');
            fetchProviders();
        }
    };

    if (loading) return <p>Carregando...</p>;

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-6">Configurações de Pagamento</h1>
            <p className="text-privacy-text-secondary mb-8">
                Gerencie os provedores de pagamento. Apenas um pode estar ativo por vez. As chaves secretas (Access Tokens) devem ser configuradas como segredos nas Edge Functions.
            </p>
            
            <div className="space-y-4">
                {providers.map(provider => (
                    <div key={provider.id} className="bg-privacy-surface p-6 rounded-lg flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-white">{provider.display_name}</h2>
                            <p className="text-sm text-privacy-text-secondary">Provider: {provider.provider}</p>
                            <p className="text-sm text-privacy-text-secondary">Public Key: {provider.public_key || 'Não configurada'}</p>
                        </div>
                        <div>
                            {provider.is_active ? (
                                <span className="bg-green-500 text-white font-bold py-2 px-4 rounded">Ativo</span>
                            ) : (
                                <button onClick={() => handleActivate(provider.id)} className="bg-primary text-black font-bold py-2 px-4 rounded">
                                    Ativar
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}