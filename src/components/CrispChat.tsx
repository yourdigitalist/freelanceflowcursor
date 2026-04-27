import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

declare global {
  interface Window {
    $crisp: unknown[];
    CRISP_WEBSITE_ID: string;
  }
}

const CRISP_WEBSITE_ID =
  import.meta.env.VITE_CRISP_WEBSITE_ID || 'dfd412fb-fc85-4788-b95e-72fa04284f19';

const HIDE_ON_PREFIXES = ['/auth', '/reset-password', '/onboarding', '/review/'];
const HIDE_ON_EXACT = ['/terms', '/privacy'];

export function CrispChat() {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!CRISP_WEBSITE_ID) return;

    window.$crisp = window.$crisp || [];
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;

    const existing = document.getElementById('crisp-chat-script');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://client.crisp.chat/l.js';
      script.async = true;
      script.id = 'crisp-chat-script';
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.$crisp) return;

    const path = location.pathname;
    const hiddenByPrefix = HIDE_ON_PREFIXES.some((prefix) => path.startsWith(prefix));
    const hiddenByExact = HIDE_ON_EXACT.includes(path);
    const shouldShow = !hiddenByPrefix && !hiddenByExact;

    if (shouldShow) {
      window.$crisp.push(['do', 'chat:show']);
    } else {
      window.$crisp.push(['do', 'chat:hide']);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.$crisp) return;

    if (user) {
      const displayName =
        (user.user_metadata?.full_name as string | undefined) ||
        `${user.user_metadata?.first_name ?? ''} ${user.user_metadata?.last_name ?? ''}`.trim() ||
        user.email ||
        user.id;

      window.$crisp.push(['set', 'user:nickname', [displayName]]);
      if (user.email) {
        window.$crisp.push(['set', 'user:email', [user.email]]);
      }
    } else {
      window.$crisp.push(['do', 'session:reset']);
    }
  }, [user]);

  return null;
}

