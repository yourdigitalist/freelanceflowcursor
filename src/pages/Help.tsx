import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Loader2, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

declare global {
  interface Window {
    $crisp: unknown[];
  }
}

const HELP_CENTER_URL = 'https://get-lance.crisp.help/en/';

export default function Help() {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeTimedOut, setIframeTimedOut] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIframeTimedOut(true);
    }, 12000);
    return () => window.clearTimeout(timeout);
  }, []);

  const openCrispChat = () => {
    if (typeof window === 'undefined' || !window.$crisp) return;
    window.$crisp.push(['do', 'chat:show']);
    window.$crisp.push(['do', 'chat:open']);
  };

  return (
    <AppLayout>
      <div className="w-full max-w-6xl space-y-4">
        <div className="rounded-xl border bg-card p-4 sm:p-5">
          <h1 className="text-2xl font-bold">Help Center</h1>
          <p className="text-muted-foreground mt-1">
            Browse support articles or chat live with us.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={openCrispChat} className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Open live chat
            </Button>
            <a
              href={HELP_CENTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              Open in new tab
            </a>
          </div>
        </div>

        <div className="rounded-xl border overflow-hidden bg-background">
          {!iframeLoaded && !iframeTimedOut ? (
            <div className="flex h-[70vh] min-h-[420px] w-full items-center justify-center gap-2 text-sm text-muted-foreground sm:h-[75vh]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading help center...
            </div>
          ) : null}

          {iframeTimedOut && !iframeLoaded ? (
            <div className="flex h-[70vh] min-h-[420px] w-full flex-col items-center justify-center gap-3 p-6 text-center sm:h-[75vh]">
              <p className="text-sm text-muted-foreground">
                The embedded help center is taking too long to load in this browser.
              </p>
              <a
                href={HELP_CENTER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Open Help Center in a new tab
              </a>
            </div>
          ) : null}

          <iframe
            title="Get Lance Help Center"
            src={HELP_CENTER_URL}
            className={`h-[70vh] min-h-[420px] w-full border-0 sm:h-[75vh] ${iframeLoaded && !iframeTimedOut ? 'block' : 'hidden'}`}
            onLoad={() => {
              setIframeLoaded(true);
              setIframeTimedOut(false);
            }}
          />
        </div>

        <footer className="pt-2 text-sm text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground mr-4">Terms and conditions</Link>
          <Link to="/privacy" className="hover:text-foreground">Privacy policy</Link>
        </footer>
      </div>
    </AppLayout>
  );
}
