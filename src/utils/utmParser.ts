/**
 * Utilitário para extrair parâmetros UTM e outras informações da URL
 */

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export interface DeviceInfo {
  device_type: string;
  browser: string;
  operating_system: string;
}

/**
 * Extrai parâmetros UTM da URL atual
 */
export const getUTMParams = (): UTMParams => {
  const params = new URLSearchParams(window.location.search);
  
  return {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
    utm_term: params.get('utm_term') || undefined,
    utm_content: params.get('utm_content') || undefined,
  };
};

/**
 * Detecta informações do dispositivo e navegador
 */
export const getDeviceInfo = (): DeviceInfo => {
  const userAgent = navigator.userAgent;
  
  // Detectar tipo de dispositivo
  let device_type = 'desktop';
  if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
    device_type = 'tablet';
  } else if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
    device_type = 'mobile';
  }
  
  // Detectar navegador
  let browser = 'unknown';
  if (userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('Edg') === -1) {
    browser = 'Chrome';
  } else if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1) {
    browser = 'Safari';
  } else if (userAgent.indexOf('Firefox') > -1) {
    browser = 'Firefox';
  } else if (userAgent.indexOf('Edg') > -1) {
    browser = 'Edge';
  } else if (userAgent.indexOf('Opera') > -1 || userAgent.indexOf('OPR') > -1) {
    browser = 'Opera';
  }
  
  // Detectar sistema operacional
  let operating_system = 'unknown';
  if (userAgent.indexOf('Windows') > -1) {
    operating_system = 'Windows';
  } else if (userAgent.indexOf('Mac') > -1) {
    operating_system = 'macOS';
  } else if (userAgent.indexOf('Linux') > -1) {
    operating_system = 'Linux';
  } else if (userAgent.indexOf('Android') > -1) {
    operating_system = 'Android';
  } else if (userAgent.indexOf('iOS') > -1 || userAgent.indexOf('iPhone') > -1 || userAgent.indexOf('iPad') > -1) {
    operating_system = 'iOS';
  }
  
  return {
    device_type,
    browser,
    operating_system,
  };
};

/**
 * Extrai o domínio do referrer
 */
export const getReferrerDomain = (referrer: string | null): string | undefined => {
  if (!referrer) return undefined;
  
  try {
    const url = new URL(referrer);
    return url.hostname.replace('www.', '');
  } catch {
    return undefined;
  }
};

/**
 * Salva UTMs no localStorage para persistência entre páginas
 */
export const saveUTMsToLocalStorage = (): void => {
  const utms = getUTMParams();
  const hasUTMs = Object.values(utms).some(value => value !== undefined);
  
  if (hasUTMs) {
    localStorage.setItem('utm_params', JSON.stringify(utms));
    // Salvar timestamp para expiração (30 dias)
    localStorage.setItem('utm_timestamp', Date.now().toString());
  }
};

/**
 * Recupera UTMs do localStorage (útil se o usuário navegar entre páginas)
 */
export const getUTMsFromLocalStorage = (): UTMParams => {
  const stored = localStorage.getItem('utm_params');
  const timestamp = localStorage.getItem('utm_timestamp');
  
  if (!stored || !timestamp) {
    return {};
  }
  
  // Verificar se não expirou (30 dias)
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const storedTime = parseInt(timestamp, 10);
  
  if (Date.now() - storedTime > thirtyDays) {
    localStorage.removeItem('utm_params');
    localStorage.removeItem('utm_timestamp');
    return {};
  }
  
  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
};

/**
 * Combina UTMs da URL atual com os salvos no localStorage
 * Prioriza os da URL atual
 */
export const getCombinedUTMs = (): UTMParams => {
  const urlUTMs = getUTMParams();
  const storedUTMs = getUTMsFromLocalStorage();
  
  // Se há UTMs na URL, usar eles e salvar
  const hasURLUTMs = Object.values(urlUTMs).some(value => value !== undefined);
  if (hasURLUTMs) {
    saveUTMsToLocalStorage();
    return urlUTMs;
  }
  
  // Caso contrário, usar os salvos
  return storedUTMs;
};

