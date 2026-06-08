import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { X } from '@/components/icons';
import { SlotIcon } from '@/contexts/IconSlotContext';
import { differenceInDays } from 'date-fns';
import { getTrialBannerAppearance } from '@/lib/trialBannerStyles';
import { cn } from '@/lib/utils';

interface TrialBannerProps {
  onUpgrade?: () => void;
  onDismiss?: () => void;
}

export function TrialBanner({ onUpgrade, onDismiss }: TrialBannerProps) {
  const { user } = useAuth();
  const [trialInfo, setTrialInfo] = useState<{
    show: boolean;
    daysLeft: number;
    isExpired: boolean;
    status: string | null;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTrialInfo();
    }
  }, [user]);

  const fetchTrialInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('plan_type, trial_end_date, subscription_status, is_lifetime')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error || !data || data.is_lifetime === true) return;

      if (data.subscription_status === 'trial' && data.trial_end_date) {
        const trialEnd = new Date(data.trial_end_date);
        const now = new Date();
        const daysLeft = differenceInDays(trialEnd, now);
        
        setTrialInfo({
          show: true,
          daysLeft: Math.max(0, daysLeft),
          isExpired: daysLeft < 0,
          status: data.subscription_status,
        });
      } else if (data.subscription_status === 'past_due') {
        setTrialInfo({
          show: true,
          daysLeft: 0,
          isExpired: false,
          status: data.subscription_status,
        });
      } else if (data.subscription_status === 'paused') {
        setTrialInfo({
          show: true,
          daysLeft: 0,
          isExpired: true,
          status: data.subscription_status,
        });
      } else {
        setTrialInfo(null);
      }
    } catch (error) {
      console.error('Error fetching trial info:', error);
    }
  };

  if (!trialInfo?.show || dismissed) return null;

  const appearance = getTrialBannerAppearance(
    trialInfo.daysLeft,
    trialInfo.status,
    trialInfo.isExpired,
  );
  const isUrgent = trialInfo.daysLeft <= 3 || trialInfo.isExpired;

  return (
    <div 
      className="sticky top-0 z-40 py-2 px-4 text-center text-sm font-medium relative"
      style={{ background: appearance.background }}
    >
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <SlotIcon slot="nav_billing" className={cn('h-4 w-4 shrink-0', appearance.iconClass)} />
        <span className={appearance.textClass}>
          {trialInfo.status === 'past_due' ? (
            <>Your payment is past due. Update your payment method in Billing to keep access.</>
          ) : trialInfo.status === 'paused' || trialInfo.isExpired ? (
            <>Your free trial has ended. Add a payment method in Billing to restore access.</>
          ) : trialInfo.daysLeft === 0 ? (
            <>Your trial ends today. Add a payment method in Billing to keep access after the trial.</>
          ) : trialInfo.daysLeft <= 3 ? (
            <>Your trial ends in {trialInfo.daysLeft} day{trialInfo.daysLeft === 1 ? '' : 's'}. Add a payment method before it ends to keep access.</>
          ) : (
            <>Your free trial is active—{trialInfo.daysLeft} day{trialInfo.daysLeft === 1 ? '' : 's'} left. No card required until you choose to subscribe.</>
          )}
        </span>
        <Button
          size="sm"
          variant={isUrgent || trialInfo.isExpired ? 'default' : 'outline'}
          className="h-7 text-xs shrink-0"
          onClick={onUpgrade}
        >
          Billing
        </Button>
      </div>
      <button
        onClick={() => {
          setDismissed(true);
          onDismiss?.();
        }}
        className={cn(
          'absolute right-3 top-1/2 -translate-y-1/2 transition-colors',
          appearance.textClass === 'text-white'
            ? 'text-white/80 hover:text-white'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}