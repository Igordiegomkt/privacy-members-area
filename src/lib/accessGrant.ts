import { supabase } from './supabase';
import { sha256Hex } from './crypto'; // Importando sha256Hex

export interface AccessGrant {
  scope: 'global' | 'model' | 'product';
  model_id: string | null;
  product_id: string | null;
  expires_at: string | null; // Expiration set by Admin
  local_expires_at: string; // Local TTL (24h)
  link_type: 'access' | 'grant'; // Novo campo
}

const STORAGE_KEY = 'access_grant';

interface ValidationPayload {
    visitor_name?: string;
    visitor_email?: string;
    user_id?: string;
}

interface EFResponse {
    ok: boolean;
    code?: string;
    message?: string;
    grant?: Omit<AccessGrant, 'local_expires_at'>;
}

/**
 * Valida o token de acesso chamando a Edge Function.
 */
export const validateAccessToken = async (token: string, payload: ValidationPayload = {}): Promise<EFResponse | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('validate-access-link', {
      body: { token, ...payload },
    });

    if (error) {
      console.error('[validateAccessToken] EF invoke error:', error);
      return { ok: false, code: 'EF_INVOKE_ERROR', message: error.message };
    }

    if (!data) {
      return { ok: false, code: 'EMPTY_RESPONSE', message: 'Resposta vazia da Edge Function.' };
    }
    
    // Retorna a resposta completa da EF (que já contém ok, code, message, e opcionalmente grant)
    return data as EFResponse;

  } catch (e) {
    const err = e as Error;
    console.error('[validateAccessToken] Unexpected error:', err);
    return { ok: false, code: 'UNEXPECTED_ERROR', message: err.message };
  }
};

/**
 * Salva o grant no localStorage, adicionando um TTL local de 24h.
 */
export const saveGrant = (grantFromServer: Omit<AccessGrant, 'local_expires_at'>): void => {
  const now = new Date();
  const localExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 24 horas
  
  const grant: AccessGrant = {
      ...grantFromServer,
      local_expires_at: localExpiresAt,
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(grant));
};

/**
 * Retorna o grant válido do localStorage, ou null se expirado/inexistente.
 */
export const getValidGrant = (): AccessGrant | null => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    const grant: AccessGrant = JSON.parse(stored);
    const now = new Date();

    // 1. Verificar expiração local (24h TTL)
    if (new Date(grant.local_expires_at) < now) {
        console.log('[getValidGrant] Local grant expired (24h TTL).');
        localStorage.removeItem(STORAGE_KEY);
        return null;
    }

    // 2. Verificar expiração do Admin (se definida)
    if (grant.expires_at) {
      const expiresAt = new Date(grant.expires_at);
      if (now > expiresAt) {
        console.log('[getValidGrant] Admin grant expired.');
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
    }
    
    // Se passou nas duas verificações, é válido
    return grant;
  } catch (e) {
    console.error('[getValidGrant] Error parsing stored grant:', e);
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

/**
 * Remove o grant do localStorage.
 */
export const clearGrant = (): void => {
    localStorage.removeItem(STORAGE_KEY);
};