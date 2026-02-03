import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { X, Sparkles } from 'lucide-react';
import { differenceInDays } from 'date-fns';

interface TrialBannerProps {
  onUpgrade?: () => void;
}

export function TrialBanner({ onUpgrade }: TrialBannerProps) {
  const { user } = useAuth();
  const [trialInfo, setTrialInfo] = useState<{
    isOnTrial: boolean;
    daysLeft: number;
    isExpired: boolean;
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
        .select('plan_type, trial_end_date, subscription_status')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error || !data) return;

      if (data.subscription_status === 'trial' && data.trial_end_date) {
        const trialEnd = new Date(data.trial_end_date);
        const now = new Date();
        const daysLeft = differenceInDays(trialEnd, now);
        
        setTrialInfo({
          isOnTrial: true,
          daysLeft: Math.max(0, daysLeft),
          isExpired: daysLeft < 0,
        });
      } else {
        setTrialInfo(null);
      }
    } catch (error) {
      console.error('Error fetching trial info:', error);
    }
  };

  if (!trialInfo?.isOnTrial || dismissed) return null;

  const isUrgent = trialInfo.daysLeft <= 3;

  return (
    <div 
      className="relative py-2 px-4 text-center text-sm font-medium"
      style={{
        background: 'linear-gradient(135deg, #F8EDFF 0%, #CFDEF7 100%)',
      }}
    >
      <div className="flex items-center justify-center gap-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-foreground">
          {trialInfo.isExpired ? (
            <>Your free trial has ended.</>
          ) : (
            <>
              {trialInfo.daysLeft === 0 
                ? "Your free trial ends today!" 
                : `${trialInfo.daysLeft} day${trialInfo.daysLeft === 1 ? '' : 's'} left on your free trial`
              }
            </>
          )}
        </span>
        <Button
          size="sm"
          variant={isUrgent || trialInfo.isExpired ? 'default' : 'outline'}
          className="h-7 text-xs"
          onClick={onUpgrade}
        >
          Upgrade Now
        </Button>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}