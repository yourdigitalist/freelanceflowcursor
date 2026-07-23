import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import {
  GA_MEASUREMENT_ID,
  trackGaSignUpConfirmed,
  trackGaViewLanding,
  trackGaViewSignup,
} from '@/lib/googleAnalytics';

/** Sends page views on client-side route changes (base tag is in index.html). */
export function GoogleAnalytics() {
  const location = useLocation();
  const { user } = useAuth();
  const isInitialLoad = useRef(true);
  const lastSignupPath = useRef<string | null>(null);
  const lastConfirmedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window.gtag !== 'function') return;

    const pagePath = `${location.pathname}${location.search}${location.hash}`;

    if (isInitialLoad.current) {
      isInitialLoad.current = false;
    } else {
      window.gtag('config', GA_MEASUREMENT_ID, { page_path: pagePath });
    }

    const path = location.pathname;
    const isSignupAuth =
      path === '/auth' && new URLSearchParams(location.search).get('tab') === 'signup';

    if (path === '/' || path === '/lptest' || path === '/designers') {
      trackGaViewLanding();
    }

    if (isSignupAuth && lastSignupPath.current !== pagePath) {
      lastSignupPath.current = pagePath;
      trackGaViewSignup();
    }
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (!user?.id || !user.email_confirmed_at) return;
    if (lastConfirmedUserId.current === user.id) return;
    lastConfirmedUserId.current = user.id;
    trackGaSignUpConfirmed('email');
  }, [user?.id, user?.email_confirmed_at]);

  return null;
}
