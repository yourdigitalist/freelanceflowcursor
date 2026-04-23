import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { AppLogo } from '@/components/AppLogo';
import { Loader2 } from '@/components/icons';
import { SlotIcon } from '@/components/SlotIcon';

const SIGNUP_PENDING_KEY = 'signup_pending';
const SIGNUP_EMAIL_KEY = 'signup_email';

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showConfirmEmailMessage, setShowConfirmEmailMessage] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const { signIn, signUp, signInWithMagicLink, resetPassword, resendConfirmationEmail } = useAuth();
  const [magicLinkEmail, setMagicLinkEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const navigate = useNavigate();

  // After showing magic link success, allow re-entering email after a few seconds
  useEffect(() => {
    if (!magicLinkSent) return;
    const t = setTimeout(() => setMagicLinkSent(false), 4000);
    return () => clearTimeout(t);
  }, [magicLinkSent]);
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const authTab = searchParams.get('tab') === 'signup' ? 'signup' : 'signin';
  const setAuthTab = (value: string) => setSearchParams((p) => { p.set('tab', value); return p; }, { replace: true });

  useEffect(() => {
    const pending = sessionStorage.getItem(SIGNUP_PENDING_KEY);
    if (pending || searchParams.get('confirm') === 'email') {
      if (pending) sessionStorage.removeItem(SIGNUP_PENDING_KEY);
      setShowConfirmEmailMessage(true);
    }
  }, [searchParams]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: 'Error signing in',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      navigate('/dashboard');
    }
    
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

    const { error } = await signUp(email, password, fullName, firstName, lastName);
    
    if (error) {
      toast({
        title: 'Error signing up',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      sessionStorage.setItem(SIGNUP_PENDING_KEY, '1');
      sessionStorage.setItem(SIGNUP_EMAIL_KEY, email.trim());
      setResendEmail(email.trim());
      setShowConfirmEmailMessage(true);
      setAuthTab('signup');
      toast({
        title: 'Check your email',
        description: "If this is a new account, we sent a confirmation link. If you already signed up before, try Sign In or Reset password.",
      });
    }
    
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await resetPassword(forgotPasswordEmail);

    if (error) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const hint =
        /redirect|url|not allowed/i.test(error.message)
          ? ` In Supabase: Authentication → URL Configuration → add ${origin}/reset-password (or ${origin}/**) to Redirect URLs.`
          : /rate|smtp|email/i.test(error.message)
            ? ' Check Supabase Authentication → SMTP (custom SMTP is required for reliable delivery in production) and Auth logs for details.'
            : '';
      toast({
        title: "Couldn't send recovery email",
        description: `${error.message}${hint}`,
        variant: 'destructive',
      });
    } else {
      setResetEmailSent(true);
      toast({
        title: 'Reset email sent!',
        description: 'Check your inbox for a password reset link.',
      });
    }

    setIsLoading(false);
  };

  const handleMagicLink = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!magicLinkEmail?.trim()) return;
    setMagicLinkLoading(true);
    const { error, message } = await signInWithMagicLink(magicLinkEmail);
    if (error) {
      toast({
        title: 'Could not send magic link',
        description: message ?? error.message,
        variant: 'destructive',
      });
    } else {
      setMagicLinkSent(true);
      const desc = message ?? "We sent you a sign-in link. Check your inbox (and spam) and click the link.";
      toast({
        title: 'Check your email',
        description: desc,
      });
    }
    setMagicLinkLoading(false);
  };

  const handleResendConfirmation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail?.trim()) return;
    setResendLoading(true);
    const { error } = await resendConfirmationEmail(resendEmail);
    if (error) {
      toast({
        title: 'Could not resend',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Email sent',
        description: 'Check your inbox (and spam) for the confirmation link.',
      });
    }
    setResendLoading(false);
  };

  const features = [
    { slot: 'sidebar_clients' as const, text: 'Client Management' },
    { slot: 'sidebar_projects' as const, text: 'Project Tracking' },
    { slot: 'sidebar_time' as const, text: 'Time Tracking' },
    { slot: 'sidebar_reviews' as const, text: 'Client Approvals' },
    { slot: 'sidebar_invoices' as const, text: 'Professional Invoicing' },
    { slot: 'stat_money' as const, text: 'Payment Tracking' },
  ];

  return (
    <div className="auth-brand min-h-screen flex bg-[linear-gradient(170deg,#faf8ff_0%,#f0ebfc_50%,#fff_100%)]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,500&display=swap');
        .auth-brand { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}</style>
      {/* Left side - Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-[linear-gradient(160deg,#f8f6ff_0%,#fff_100%)] p-12 flex-col justify-between border-r border-[#ede8fa]">
        <div>
          <Link to="/" className="flex items-center gap-2 mb-12">
            <AppLogo full height={32} className="text-gradient" />
          </Link>
          
          <div className="space-y-2 mb-12">
            <h1 className="text-4xl font-extrabold tracking-[-0.03em] text-[#1a1a2e]">
              Run your freelance business like a pro.
            </h1>
            <p className="text-xl text-[#64647a]">
              Clients, projects, time tracking, approvals, and invoices in one clean workspace.
            </p>
          </div>

          <div className="space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 text-[#1a1a2e]">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-[#9b63e9]/10 border border-[#9b63e9]/20">
                  <SlotIcon slot={feature.slot} className="h-5 w-5 text-[#9b63e9]" />
                </div>
                <span className="text-lg">{feature.text}</span>
              </div>
            ))}
          </div>

        </div>

        <div className="bg-white rounded-xl p-6 border border-[#ede8fa] shadow-[0_20px_56px_rgba(155,99,233,0.1)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex -space-x-2">
              <div className="h-8 w-8 rounded-full bg-[#9b63e9]/20 border-2 border-white flex items-center justify-center text-xs font-medium">JD</div>
              <div className="h-8 w-8 rounded-full bg-[#fe8e01]/20 border-2 border-white flex items-center justify-center text-xs font-medium">SK</div>
              <div className="h-8 w-8 rounded-full bg-[#f8f6ff] border-2 border-white flex items-center justify-center text-xs font-medium">+</div>
            </div>
            <span className="text-sm text-[#64647a]">2,400+ freelancers trust Lance</span>
          </div>
          <p className="text-sm font-bold text-[#1a1a2e]">15-day free trial. Cancel anytime.</p>
          <div className="mt-2 flex items-center gap-2 text-sm text-[#64647a]">
            <img src="/stripe-logo.svg" alt="Stripe" className="h-3.5 w-auto" />
            <span>Secure Payment Powered by Stripe.</span>
          </div>
        </div>
      </div>

      {/* Right side - Auth forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-12">
        <div className="w-full max-w-md animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-8 lg:hidden">
            <AppLogo full height={32} className="text-gradient" />
          </div>

          <Card className="border border-[#ede8fa] shadow-[0_24px_72px_rgba(155,99,233,0.18)]">
            {showConfirmEmailMessage && (
              <div className="mx-6 mt-8 mb-1 px-5 pt-10 pb-5 rounded-xl bg-primary/10 border border-primary/20 text-sm space-y-4">
                <p className="text-center text-foreground leading-relaxed pt-0.5">
                  We sent a <strong>confirmation link</strong> to your email. Open it to verify your account, then continue onboarding.
                </p>
                <form onSubmit={handleResendConfirmation} className="flex flex-col gap-3">
                  {resendEmail ? (
                    <p className="text-center text-muted-foreground text-xs">
                      Didn&apos;t get it? We can send another to{' '}
                      <span className="font-medium text-foreground">{resendEmail}</span>
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="resend-email" className="text-xs text-muted-foreground">
                        Email to resend confirmation to
                      </Label>
                      <Input
                        id="resend-email"
                        type="email"
                        placeholder="you@example.com"
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                        className="h-9"
                        autoComplete="email"
                      />
                    </div>
                  )}
                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    disabled={resendLoading || !resendEmail.trim()}
                  >
                    {resendLoading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                    Resend confirmation email
                  </Button>
                </form>
              </div>
            )}
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl tracking-[-0.02em] text-[#1a1a2e]">Welcome</CardTitle>
              <CardDescription>
                Sign in to your account or create a new one
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={authTab} onValueChange={setAuthTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 h-11 p-1 bg-[#f8f6ff] border border-[#ede8fa]">
                  <TabsTrigger
                    value="signin"
                    className="rounded-md data-[state=active]:bg-[#9b63e9] data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=inactive]:text-[#64647a]"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="rounded-md data-[state=active]:bg-[#9b63e9] data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=inactive]:text-[#64647a]"
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input
                        id="signin-password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full bg-[#9b63e9] hover:bg-[#7a45cc]" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign In
                    </Button>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="w-full text-sm text-primary hover:underline"
                    >
                      Forgot your password?
                    </button>
                  </form>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase text-muted-foreground">
                      <span className="bg-card px-2">Or</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="magic-link-email">Sign in with a magic link</Label>
                    {magicLinkSent ? (
                      <div className="text-sm text-muted-foreground py-2 space-y-1">
                        <p>We sent a sign-in link to <strong>{magicLinkEmail}</strong>. Click the link in the email to sign in.</p>
                        <p className="text-xs">If you don’t see it, check spam/junk.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleMagicLink} className="flex gap-2">
                        <Input
                          id="magic-link-email"
                          type="email"
                          placeholder="you@example.com"
                          value={magicLinkEmail}
                          onChange={(e) => setMagicLinkEmail(e.target.value)}
                          className="flex-1"
                          disabled={magicLinkLoading}
                        />
                        <Button type="submit" variant="secondary" disabled={magicLinkLoading}>
                          {magicLinkLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                          Send link
                        </Button>
                      </form>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-first-name">First Name</Label>
                        <Input
                          id="signup-first-name"
                          name="firstName"
                          type="text"
                          placeholder="John"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-last-name">Last Name</Label>
                        <Input
                          id="signup-last-name"
                          name="lastName"
                          type="text"
                          placeholder="Doe"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        minLength={6}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Minimum 6 characters
                      </p>
                    </div>
                    <Button type="submit" className="w-full bg-[#9b63e9] hover:bg-[#7a45cc]" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Account
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  By continuing, you agree to our{' '}
                  <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/" className="text-primary hover:underline">
              ← Back to home
            </Link>
          </p>
          <footer className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
            <Link to="/auth" className="hover:text-foreground mr-4">Log in</Link>
            <Link to="/help" className="hover:text-foreground mr-4">Help</Link>
            <Link to="/terms" className="hover:text-foreground mr-4">Terms and conditions</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy policy</Link>
          </footer>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md border-0 shadow-xl animate-fade-in">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl">
                {resetEmailSent ? 'Check Your Email' : 'Reset Password'}
              </CardTitle>
              <CardDescription>
                {resetEmailSent
                  ? 'We sent a password reset link to your email.'
                  : 'Enter your email and we\'ll send you a reset link.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resetEmailSent ? (
                <div className="text-center space-y-4">
                  <p className="text-muted-foreground text-sm">
                    Click the link in the email to reset your password. If you don't see it, check your spam folder.
                  </p>
                  <Button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmailSent(false);
                      setForgotPasswordEmail('');
                    }}
                    className="w-full"
                  >
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="you@example.com"
                      value={forgotPasswordEmail}
                      onChange={(e) => setForgotPasswordEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setForgotPasswordEmail('');
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Send Link
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
