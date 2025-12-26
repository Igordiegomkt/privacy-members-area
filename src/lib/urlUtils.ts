/**
 * Regex para identificar parâmetros de tracking comuns que podem quebrar o carregamento de recursos.
 * Inclui UTMs, FBCLID, GCLID, e outros.
 */
const TRACKING_PARAMS_RE = /^(utm_|fbclid|gclid|sck|xcod)/i;

/**
 * Remove parâmetros de tracking conhecidos de uma URL para garantir que recursos de mídia carreguem corretamente.
 * @param urlString A URL que pode conter parâmetros de tracking.
 * @returns A URL sanitizada.
 */
export function stripTrackingParams(urlString: string): string {
  if (!urlString) return urlString;

  try {
    const url = new URL(urlString);
    
    // Se não houver query params, retorna a URL original
    if (!url.search) return urlString;

    const params = url.searchParams;
    let changed = false;

    // Itera sobre os parâmetros e deleta aqueles que são de tracking
    for (const key of Array.from(params.keys())) {
      if (TRACKING_PARAMS_RE.test(key)) {
        params.delete(key);
        changed = true;
      }
    }

    // Se houve mudanças, retorna a URL reconstruída
    if (changed) {
      // Reconstroi a URL sem os parâmetros deletados
      return url.toString();
    }

    // Se não houve mudanças, retorna a URL original
    return urlString;
  } catch (e) {
    // Em caso de URL inválida, retorna a string original
    console.warn('Failed to parse URL for stripping tracking params:', e);
    return urlString;
  }
}