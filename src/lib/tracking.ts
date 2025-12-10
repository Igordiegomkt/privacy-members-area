declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    dataLayer?: Record<string, any>[];
  }
}

interface EventPayload {
  content_ids: string[];
  value?: number; // Em R$ (ex: 49.90)
  currency?: string;
  model_id?: string;
  content_type?: string;
  eventID?: string;
}

/**
 * Função centralizada para disparar eventos para Facebook Pixel e Google Tag Manager.
 */
export function dispatchEvent(eventName: string, gtmName: string, payload: EventPayload) {
  const eventID = payload.eventID ?? `${eventName}-${payload.content_ids.join('_')}-${Date.now()}`;

  const finalPayload = {
    ...payload,
    eventID,
    currency: payload.currency ?? 'BRL',
  };

  // 1. Facebook Pixel (Client-side)
  if (window.fbq) {
    // O FB Pixel espera o valor em R$ (não em centavos)
    window.fbq('track', eventName, {
      content_ids: finalPayload.content_ids,
      content_type: finalPayload.content_type,
      value: finalPayload.value,
      currency: finalPayload.currency,
      eventID: finalPayload.eventID, // Para deduplicação CAPI
    });
  }

  // 2. Google Tag Manager (dataLayer)
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: gtmName,
    ...finalPayload,
  });

  console.log(`[Tracking] Dispatched ${eventName} (ID: ${eventID})`);
}

export const trackViewContent = (payload: EventPayload) =>
  dispatchEvent('ViewContent', 'view_content', payload);

export const trackAddToCart = (payload: EventPayload) =>
  dispatchEvent('AddToCart', 'add_to_cart', payload);

export const trackInitiateCheckout = (payload: EventPayload) =>
  dispatchEvent('InitiateCheckout', 'initiate_checkout', payload);

export const trackAddPaymentInfo = (payload: EventPayload) =>
  dispatchEvent('AddPaymentInfo', 'add_payment_info', payload);

export const trackPurchase = (payload: EventPayload) =>
  dispatchEvent('Purchase', 'purchase', payload);