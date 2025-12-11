/**
 * Normaliza um número de telefone para o formato E.164 (+CCDDNNNNNNNNN).
 * Assume Brasil (+55) se o código do país estiver faltando.
 * @param phone O número de telefone bruto.
 * @returns O número normalizado ou null se for inválido.
 */
export const normalizePhone = (phone: string): string | null => {
  if (!phone) return null;

  // Remove caracteres não numéricos, exceto o '+' inicial
  let normalized = phone.replace(/[^\d+]/g, '');

  // Se não começar com '+', assume +55 (Brasil)
  if (!normalized.startsWith('+')) {
    // Se o número tiver 11 dígitos (DD + 9XXXX-XXXX), adiciona +55
    if (normalized.length === 11) {
      normalized = `+55${normalized}`;
    } else if (normalized.length === 10) {
      // Se tiver 10 dígitos (DD + XXXX-XXXX), adiciona +55 (pode ser fixo)
      normalized = `+55${normalized}`;
    } else {
      // Se for um número curto ou estranho, tenta adicionar +55
      normalized = `+55${normalized}`;
    }
  }
  
  // Validação básica: deve ter pelo menos 10 dígitos (incluindo o +)
  if (normalized.length < 10) return null;

  return normalized;
};

/**
 * Cria um email sintético a partir do número de telefone normalizado.
 * Isso é necessário quando o login por telefone está desabilitado no Supabase.
 * @param normalizedPhone O número de telefone no formato +CCDDNNNNNNNNN.
 * @returns Um email sintético único.
 */
export const synthesizeEmailFromPhone = (normalizedPhone: string): string => {
  const cleanPhone = normalizedPhone.replace('+', '');
  // Usamos um domínio fixo para garantir a unicidade e evitar conflitos com emails reais.
  return `phone_${cleanPhone}@whatsapp.meuprivacy.com`;
};