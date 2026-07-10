import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const META_PIXEL_ID = '1377760630866019';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

/** Sends PageView on client-side route changes (base pixel is in index.html). */
export function MetaPixel() {
  const location = useLocation();
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (typeof window.fbq !== 'function') return;

    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    window.fbq('track', 'PageView');
  }, [location.pathname, location.search, location.hash]);

  return null;
}

export { META_PIXEL_ID };
