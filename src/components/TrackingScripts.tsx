import { useEffect } from 'react';

interface FacebookPixelFunction {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push?: FacebookPixelFunction;
  loaded?: boolean;
  version?: string;
}

type TrackingWindow = Window & {
  dataLayer?: Record<string, unknown>[];
  fbq?: FacebookPixelFunction;
  _fbq?: FacebookPixelFunction;
  pixelId?: string;
};

const GTM_CONTAINER_ID = 'GTM-MT6B5TBD';
const FACEBOOK_PIXEL_IDS = ['1312196850345293', '1748812605764523'];
const UTMIFY_PIXEL_ID = '68e19e32a255808f0ad6f844';

const initializeGoogleTagManager = (win: TrackingWindow, doc: Document, containerId: string): void => {
  if (!win.dataLayer) {
    win.dataLayer = [];
  }

  win.dataLayer.push({
    'gtm.start': Date.now(),
    event: 'gtm.js',
  });

  const firstScript = doc.getElementsByTagName('script')[0];
  const scriptElement = doc.createElement('script');
  scriptElement.async = true;
  scriptElement.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}`;
  firstScript?.parentNode?.insertBefore(scriptElement, firstScript);
};

const loadUtmifyScripts = (win: TrackingWindow, doc: Document): void => {
  const utmifyScript = doc.createElement('script');
  utmifyScript.src = 'https://cdn.utmify.com.br/scripts/utms/latest.js';
  utmifyScript.setAttribute('data-utmify-prevent-xcod-sck', '');
  utmifyScript.setAttribute('data-utmify-prevent-subids', '');
  utmifyScript.async = true;
  utmifyScript.defer = true;
  doc.head.appendChild(utmifyScript);

  win.pixelId = UTMIFY_PIXEL_ID;
  const pixelScript = doc.createElement('script');
  pixelScript.async = true;
  pixelScript.defer = true;
  pixelScript.src = 'https://cdn.utmify.com.br/scripts/pixel/pixel.js';
  doc.head.appendChild(pixelScript);
};

const getOrCreateFacebookPixel = (win: TrackingWindow, doc: Document): FacebookPixelFunction => {
  if (win.fbq) {
    return win.fbq;
  }

  const fbq: FacebookPixelFunction = (...args: unknown[]) => {
    if (fbq.callMethod) {
      fbq.callMethod(...args);
    } else {
      fbq.queue.push(args);
    }
  };

  fbq.queue = [];
  win.fbq = fbq;
  win._fbq = fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';

  const scriptElement = doc.createElement('script');
  scriptElement.async = true;
  scriptElement.src = 'https://connect.facebook.net/en_US/fbevents.js';
  const firstScript = doc.getElementsByTagName('script')[0];
  firstScript?.parentNode?.insertBefore(scriptElement, firstScript);

  return fbq;
};

const initializeFacebookPixels = (win: TrackingWindow, doc: Document): void => {
  const fbq = getOrCreateFacebookPixel(win, doc);

  FACEBOOK_PIXEL_IDS.forEach((id) => fbq('init', id));
  fbq('track', 'PageView');

  FACEBOOK_PIXEL_IDS.forEach((id) => {
    const storageKey = `fbq_purchase_fired_${id}`;
    if (!localStorage.getItem(storageKey)) {
      fbq('track', 'Purchase', { value: 10, currency: 'BRL' });
      localStorage.setItem(storageKey, 'true');
      console.log(`Facebook Pixel ${id}: Evento Purchase disparado pela primeira vez para este navegador.`);
    } else {
      console.log(`Facebook Pixel ${id}: Evento Purchase já foi disparado anteriormente para este navegador. Ignorando.`);
    }
  });
};

/**
 * Componente para carregar scripts de tracking (GTM, Facebook Pixel, UTMify)
 * Deve ser usado apenas na página de Login (primeiro acesso)
 */
export const TrackingScripts: React.FC = () => {
  useEffect(() => {
    const trackingWindow = window as TrackingWindow;

    initializeGoogleTagManager(trackingWindow, document, GTM_CONTAINER_ID);
    loadUtmifyScripts(trackingWindow, document);
    initializeFacebookPixels(trackingWindow, document);
  }, []);

  return (
    <>
      {/* Google Tag Manager (noscript) */}
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>

      {/* Facebook Pixel (noscript) */}
      <noscript>
        <img
          height={1}
          width={1}
          style={{ display: 'none' }}
          src="https://www.facebook.com/tr?id=1312196850345293&ev=Purchase&value=10.00&currency=BRL&noscript=1"
          alt=""
        />
        <img
          height={1}
          width={1}
          style={{ display: 'none' }}
          src="https://www.facebook.com/tr?id=1748812605764523&ev=Purchase&value=10.00&currency=BRL&noscript=1"
          alt=""
        />
      </noscript>
    </>
  );
};