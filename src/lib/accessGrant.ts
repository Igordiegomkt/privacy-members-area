import { supabase } from './supabase';

export interface AccessGrant {
  scope: 'global' | 'model' | 'product';
  model_id: string | null;
  product_id: string | null;
  expires_at: string | null;
}

const STORAGE_KEY = 'access_grant';

/**
 * Extrai o token de acesso da query string (?access=TOKEN).
 */
export const extractAccessTokenFromUrl = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  return params.get('access');
};

/**
 * Limpa o parâmetro 'access' da URL sem recarregar a página.
 */
export const clearTokenFromUrl = (): void => {
  const url = new URL(window.location.href);
  if (url.searchParams.has('access')) {
    url.searchParams.delete('access');
    window.history.replaceState({}, document.title, url.toString());
  }
};

/**
 * Valida o token de acesso chamando a Edge Function.
 */
export const validateAccessToken = async (token: string): Promise<AccessGrant | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('validate-access-link', {
      body: { token },
    });

    if (error) {
      console.error('[validateAccessToken] EF invoke error:', error);
      return null;
    }

    if (!data || data.ok === false) {
      console.warn('[validateAccessToken] Validation failed:', data?.message || 'Unknown error');
      return null;
    }

    return data.grant as AccessGrant;
  } catch (e) {
    console.error('[validateAccessToken] Unexpected error:', e);
    return null;
  }
};

/**
 * Salva o grant no localStorage.
 */
export const saveGrant = (grant: AccessGrant): void => {
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

    if (grant.expires_at) {
      const expiresAt = new Date(grant.expires_at);
      if (new Date() > expiresAt) {
        console.log('[getValidGrant] Grant expired.');
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
    }
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