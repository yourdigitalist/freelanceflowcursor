import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

/** Public GA4 measurement ID — safe to embed in client code (not a secret). */
const GA_MEASUREMENT_ID = 'G-F987NCEKDC';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

function initGoogleAnalytics() {
  if (typeof window === 'undefined' || !GA_MEASUREMENT_ID) return false;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });

  if (!document.getElementById('google-analytics-script')) {
    const script = document.createElement('script');
    script.id = 'google-analytics-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
  }

  return true;
}

export function GoogleAnalytics() {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (!import.meta.env.PROD) return;
    initGoogleAnalytics();
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD || typeof window.gtag !== 'function') return;

    const pagePath = `${location.pathname}${location.search}${location.hash}`;

    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: pagePath,
    });
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (!import.meta.env.PROD || typeof window.gtag !== 'function') return;

    if (user?.id) {
      window.gtag('config', GA_MEASUREMENT_ID, { user_id: user.id });
    }
  }, [user?.id]);

  return null;
}
