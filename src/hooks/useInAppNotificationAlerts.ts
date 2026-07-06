import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type InAppNotificationAlert = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
};

const MAX_ALERTS = 3;

export function useInAppNotificationAlerts(userId: string | undefined) {
  const [alerts, setAlerts] = useState<InAppNotificationAlert[]>([]);
  const readyRef = useRef(false);

  const dismiss = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  useEffect(() => {
    if (!userId) {
      setAlerts([]);
      readyRef.current = false;
      return;
    }

    readyRef.current = false;
    const readyTimer = window.setTimeout(() => {
      readyRef.current = true;
    }, 1500);

    const channel = supabase
      .channel(`notifications-in-app-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!readyRef.current) return;
          const row = payload.new as {
            id?: string;
            title?: string;
            body?: string | null;
            link?: string | null;
          };
          if (!row.id || !row.title) return;

          setAlerts((prev) => {
            if (prev.some((alert) => alert.id === row.id)) return prev;
            return [
              {
                id: row.id!,
                title: row.title!,
                body: row.body ?? null,
                link: row.link ?? null,
              },
              ...prev,
            ].slice(0, MAX_ALERTS);
          });
        },
      )
      .subscribe();

    return () => {
      window.clearTimeout(readyTimer);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { alerts, dismiss };
}
