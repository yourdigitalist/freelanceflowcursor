import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Briefcase, Loader2, CheckCircle } from 'lucide-react';

export default function ResetPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasAuthSession, setHasAuthSession] = useState<boolean | null>(null);
  const { updatePassword, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // The recovery link sets a session via URL hash; make sure we detect it reliably.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setHasAuthSession(!!nextSession);
    });

    supabase.auth.getSession().then(({ data }) => {
      setHasAuthSession(!!data.session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Keep local state in sync with provider session
    if (!authLoading) setHasAuthSession((prev) => (prev === null ? !!session : prev));
  }, [authLoading, session]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!session) {
      toast({
        title: 'Reset link expired',
        description: 'Please request a new password reset link and open it in the same browser.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure both passwords are the same.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const { error } = await updatePassword(password);

    if (error) {
      toast({
        title: 'Error updating password',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setIsSuccess(true);
      toast({
        title: 'Password updated!',
        description: 'Your password has been successfully changed.',
      });
      setTimeout(() => navigate('/dashboard'), 2000);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md animate-fade-in">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <Briefcase className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-gradient">FreelanceFlow</span>
        </Link>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">
              {isSuccess ? 'Password Updated!' : 'Reset Password'}
            </CardTitle>
            <CardDescription>
              {isSuccess
                ? 'Redirecting you to your dashboard...'
                : 'Enter your new password below'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasAuthSession === false && !isSuccess ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  This reset link is missing or expired. Please request a new password reset email and open the link from the same device/browser.
                </p>
                <Button asChild className="w-full">
                  <Link to="/auth">Go to Sign In</Link>
                </Button>
              </div>
            ) : isSuccess ? (
              <div className="flex flex-col items-center py-6">
                <CheckCircle className="h-16 w-16 text-primary mb-4" />
                <p className="text-muted-foreground">Your password has been updated successfully.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 6 characters
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/auth" className="text-primary hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
