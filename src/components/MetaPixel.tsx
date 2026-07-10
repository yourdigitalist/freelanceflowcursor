import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackMetaLead, trackMetaViewContent } from '@/lib/metaPixel';

/** Sends PageView + route-based standard events (base pixel is in index.html). */
export function MetaPixel() {
  const location = useLocation();
  const isInitialLoad = useRef(true);
  const lastLeadPath = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window.fbq !== 'function') return;

    if (isInitialLoad.current) {
      isInitialLoad.current = false;
    } else {
      window.fbq('track', 'PageView');
    }

    const path = location.pathname;
    const isSignupAuth = path === '/auth' && new URLSearchParams(location.search).get('tab') === 'signup';

    if (path === '/' || path === '/lptest') {
      trackMetaViewContent('Landing');
    }

    if (isSignupAuth && lastLeadPath.current !== `${path}${location.search}`) {
      lastLeadPath.current = `${path}${location.search}`;
      trackMetaLead();
    }
  }, [location.pathname, location.search, location.hash]);

  return null;
}

export { META_PIXEL_ID } from '@/lib/metaPixel';
