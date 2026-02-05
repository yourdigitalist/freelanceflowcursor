import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/locale-data';

export function useProfileCurrency() {
  const { user } = useAuth();
  const [currency, setCurrency] = useState<string | null>(null);
  const [currencyDisplay, setCurrencyDisplay] = useState<string | null>(null);
  const [numberFormat] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('currency, currency_display')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setCurrency(data.currency ?? null);
        setCurrencyDisplay(data.currency_display ?? null);
      }
    })();
  }, [user?.id]);

  const fmt = (amount: number) => formatCurrency(amount, currency, currencyDisplay, numberFormat);
  return { currency, currencyDisplay, numberFormat, formatCurrency: fmt };
}
