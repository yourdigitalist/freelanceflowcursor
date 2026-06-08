import { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/AppLogo';
import { SlotIcon } from '@/contexts/IconSlotContext';

interface BillingLockLayoutProps {
  children: ReactNode;
}

/** Minimal shell when trial ended / subscription inactive — no app navigation. */
export function BillingLockLayout({ children }: BillingLockLayoutProps) {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between shrink-0">
        <AppLogo className="h-8" />
        <Button variant="ghost" size="sm" onClick={() => signOut()}>
          <SlotIcon slot="auth_sign_out" className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </header>
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
