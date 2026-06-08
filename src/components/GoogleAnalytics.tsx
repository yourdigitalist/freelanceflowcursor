import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const GA_MEASUREMENT_ID = 'G-F987NCEKDC';

declare global {
  interface Window {
    dataLayer: IArguments[];
    gtag: (...args: unknown[]) => void;
  }
}

/** Sends page views on client-side route changes (base tag is in index.html). */
export function GoogleAnalytics() {
  const location = useLocation();
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (typeof window.gtag !== 'function') return;

    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    const pagePath = `${location.pathname}${location.search}${location.hash}`;
    window.gtag('config', GA_MEASUREMENT_ID, { page_path: pagePath });
  }, [location.pathname, location.search, location.hash]);

  return null;
}
