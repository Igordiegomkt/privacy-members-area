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
    const [error, setError] = useState<string | null>(null);

    const fetchProviders = useCallback(async () => {
        setLoading(true);
        setError(null);
        console.log('[PaymentSettings] Carregando provedores...');
        const { data, error } = await supabase.from('payment_providers_config').select('*');
        
        console.log('[PaymentSettings] Supabase retorno', { data, error });
        if (error) {
            setError(error.message);
        } else {
            setProviders(data as PaymentProvider[]);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchProviders(); }, [fetchProviders]);

    const handleActivate = async (providerId: string) => {
        console.log(`[PaymentSettings] Ativando provedor: ${providerId}`);
        setError(null);
        setLoading(true);
        try {
            // Desativa todos os outros provedores
            const { error: deactivateError } = await supabase
                .from('payment_providers_config')
                .update({ is_active: false })
                .neq('id', providerId);
            if (deactivateError) throw deactivateError;

            // Ativa o provedor selecionado
            const { error: activateError } = await supabase
                .from('payment_providers_config')
                .update({ is_active: true })
                .eq('id', providerId);
            if (activateError) throw activateError;

            alert('Provedor ativado com sucesso!');
            await fetchProviders(); // Recarrega a lista para refletir a mudança
        } catch (err: any) {
            console.error('[PaymentSettings] Erro na ativação:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-6">Configurações de Pagamento</h1>
            <p className="text-privacy-text-secondary mb-8">
                Gerencie os provedores de pagamento. Apenas um pode estar ativo por vez. As chaves secretas (Access Tokens) devem ser configuradas como segredos nas Edge Functions.
            </p>
            
            {error && <p className="text-red-400 bg-red-500/10 p-3 rounded-md mb-4">{error}</p>}

            {loading ? (
                <p className="text-privacy-text-secondary">Carregando configurações...</p>
            ) : providers.length === 0 ? (
                <div className="bg-privacy-surface p-6 rounded-lg text-center">
                    <p className="text-privacy-text-secondary">Nenhum provedor de pagamento configurado.</p>
                    <p className="text-xs text-privacy-text-secondary mt-2">Você pode adicionar provedores diretamente no banco de dados Supabase.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {providers.map(provider => (
                        <div key={provider.id} className="bg-privacy-surface p-6 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-white">{provider.display_name}</h2>
                                <p className="text-sm text-privacy-text-secondary">Provider: {provider.provider}</p>
                                <p className="text-sm text-privacy-text-secondary">Public Key: {provider.public_key || 'Não configurada'}</p>
                            </div>
                            <div className="w-full sm:w-auto">
                                {provider.is_active ? (
                                    <span className="bg-green-500 text-white font-bold py-2 px-4 rounded block text-center">Ativo</span>
                                ) : (
                                    <button onClick={() => handleActivate(provider.id)} className="bg-primary hover:opacity-90 text-black font-bold py-2 px-4 rounded w-full">
                                        Ativar
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}