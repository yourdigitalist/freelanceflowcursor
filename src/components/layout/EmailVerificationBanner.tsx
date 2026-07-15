import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Loader2 } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';

export function EmailVerificationBanner() {
  const { user, resendConfirmationEmail } = useAuth();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const handleResend = async () => {
    const email = user?.email?.trim();
    if (!email) return;
    setSending(true);
    const { error } = await resendConfirmationEmail(email);
    if (error) {
      toast({
        title: 'Could not send verification email',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Verification email sent',
        description: 'Check your inbox (and spam) for the link.',
      });
    }
    setSending(false);
  };

  return (
    <div className="sticky top-0 z-50 flex min-h-10 items-center justify-center gap-3 border-b border-amber-200/80 bg-amber-50 px-4 py-2 text-sm text-amber-950">
      <span>
        Verify your email to send invoices and other client emails.{' '}
        <Link to="/settings/profile" className="font-medium underline underline-offset-2">
          Settings
        </Link>
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 shrink-0 border-amber-300 bg-white/80 text-amber-950 hover:bg-white"
        onClick={handleResend}
        disabled={sending || !user?.email}
      >
        {sending && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
        Resend link
      </Button>
    </div>
  );
}
