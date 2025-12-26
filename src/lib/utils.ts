import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Remove parâmetros de tracking (UTMs, FB/Google IDs) de uma URL.
 * Isso é crucial para URLs de mídia que quebram com querystrings.
 */
export function stripTrackingParams(url: string): string {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    
    // Lista de parâmetros de tracking a remover
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'wbraid', 'gbraid', 'sck', 'xcod', 'subids'
    ];

    let changed = false;
    trackingParams.forEach(param => {
      if (params.has(param)) {
        params.delete(param);
        changed = true;
      }
    });

    if (changed) {
      // Reconstroi a URL sem os parâmetros removidos
      urlObj.search = params.toString();
      return urlObj.toString();
    }

    return url;
  } catch (e) {
    // Se a URL for inválida, retorna a original
    return url;
  }
}