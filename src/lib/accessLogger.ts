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
    // console.log('🔵 Tentando inserir no Supabase...'); // Removido log verboso
    // console.log('📦 Payload:', payload); // Removido log verboso

    const { data, error } = await supabase
      .from('first_access')
      .insert([payload])
      .select('id')
      .single();

    // console.log('📥 Resposta do Supabase:', { data, error }); // Removido log verboso

    if (error) {
      console.error('❌ Erro ao registrar acesso no Supabase:', error);
      return null;
    }

    const accessId = data?.id ?? null;
    if (accessId) {
      // console.log('✅ Acesso registrado com sucesso no Supabase. ID:', accessId); // Removido log verboso
    } else {
      console.warn('⚠️ Supabase retornou sem dados e sem erro');
    }
    return accessId;
  } catch (error) {
    console.error('Erro ao conectar com Supabase:', error);
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