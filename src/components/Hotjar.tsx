import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isPublicClientRoute } from '@/lib/publicClientRoutes';

/** Hotjar tracking script (served via ContentSquare). Public site ID — not a secret. */
const HOTJAR_SCRIPT_SRC = 'https://t.contentsquare.net/uxa/03dee917d7542.js';

export function Hotjar() {
  const location = useLocation();

  useEffect(() => {
    if (!import.meta.env.PROD || typeof window === 'undefined') return;
    if (isPublicClientRoute(location.pathname)) return;
    if (document.getElementById('hotjar-script')) return;

    const script = document.createElement('script');
    script.id = 'hotjar-script';
    script.src = HOTJAR_SCRIPT_SRC;
    script.async = true;
    document.head.appendChild(script);
  }, [location.pathname]);

  return null;
}
