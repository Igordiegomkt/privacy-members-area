import { supabase } from './supabase';
import { getCombinedUTMs, getDeviceInfo, getReferrerDomain } from '../utils/utmParser';
import { FirstAccessRecord } from '../types';

// Usamos FirstAccessRecord do types, mas removemos o ID e created_at que são gerados pelo DB
type InsertFirstAccessPayload = Omit<FirstAccessRecord, 'id' | 'created_at' | 'updated_at'>;

const fetchIpAddress = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data?.ip || 'unknown';
  } catch (error) {
    console.warn('Não foi possível obter o IP:', error);
    return 'unknown';
  }
};

const buildAccessPayload = async ({
  name,
  isAdult,
  landingPage,
}: {
  name: string;
  isAdult: boolean;
  landingPage: string;
}): Promise<InsertFirstAccessPayload> => {
  const userAgent = navigator.userAgent;
  const utms = getCombinedUTMs();
  const deviceInfo = getDeviceInfo();
  const referrer = document.referrer || null;
  const referrerDomain = getReferrerDomain(referrer);
  const ipAddress = await fetchIpAddress();

  return {
    name,
    is_adult: isAdult,
    ip_address: ipAddress,
    user_agent: userAgent,
    utm_source: utms.utm_source ?? null,
    utm_medium: utms.utm_medium ?? null,
    utm_campaign: utms.utm_campaign ?? null,
    utm_term: utms.utm_term ?? null,
    utm_content: utms.utm_content ?? null,
    referrer,
    referrer_domain: referrerDomain ?? null,
    landing_page: landingPage,
    device_type: deviceInfo.device_type,
    browser: deviceInfo.browser,
    operating_system: deviceInfo.operating_system,
  };
};

const insertAccessRecord = async (payload: InsertFirstAccessPayload): Promise<string | null> => {
  if (!supabase) {
    console.warn('Supabase não configurado. Registro de acesso ignorado.');
    return null;
  }

  try {
    // Chamando a Edge Function para inserir o log com o Service Role Key
    const { data, error } = await supabase.functions.invoke('register-access', {
      body: payload,
    });

    if (error) {
      console.error('❌ Erro ao invocar Edge Function register-access:', error);
      return null;
    }

    if (data.ok === false) {
      console.error('❌ Erro retornado pela Edge Function register-access:', data.message);
      return null;
    }

    const accessId = data?.accessId ?? null;
    if (!accessId) {
      console.warn('⚠️ Edge Function retornou sucesso, mas sem ID de acesso.');
    }
    return accessId;
  } catch (error) {
    console.error('Erro ao conectar com Edge Function:', error);
    return null;
  }
};

export const registerFirstAccess = async ({
  name,
  isAdult,
  landingPage,
}: {
  name: string;
  isAdult: boolean;
  landingPage: string;
}): Promise<string | null> => {
  const payload = await buildAccessPayload({ name, isAdult, landingPage });
  return insertAccessRecord(payload);
};

export const registerAuthenticatedPageAccess = async (pageLabel: string): Promise<string | null> => {
  const storedName = localStorage.getItem('userName');
  const storedAdultFlag = localStorage.getItem('userIsAdult');

  if (!storedName || !storedAdultFlag) {
    console.warn('Informações do usuário não encontradas. Pulando registro de acesso.');
    return null;
  }

  const landingPage = `${window.location.href}#${pageLabel}`;
  return registerFirstAccess({
    name: storedName,
    isAdult: storedAdultFlag === 'true',
    landingPage,
  });
};