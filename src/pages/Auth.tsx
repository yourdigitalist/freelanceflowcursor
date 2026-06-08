import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from '@/components/icons';

const LANCE_LOGO_SRC = '/lance-logo-black-colour.png';
import { SlotIcon } from '@/contexts/IconSlotContext';
import type { IconSlotKey } from '@/lib/iconSlots';

const SIGNUP_PENDING_KEY = 'signup_pending';
const SIGNUP_EMAIL_KEY = 'signup_email';
const AUTH_LAST_EMAIL_KEY = 'lance_auth_last_email';

function readStoredAuthEmail(): string {
  try {
    return localStorage.getItem(AUTH_LAST_EMAIL_KEY)?.trim() ?? '';
  } catch {
    return '';
  }
}

function persistAuthEmail(email: string) {
  const trimmed = email.trim();
  if (!trimmed) return;
  try {
    localStorage.setItem(AUTH_LAST_EMAIL_KEY, trimmed);
  } catch {
    // ignore localStorage failures
  }
}

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTermsAndPrivacy, setAcceptTermsAndPrivacy] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showConfirmEmailMessage, setShowConfirmEmailMessage] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const { signIn, signUp, signInWithMagicLink, resetPassword, resendConfirmationEmail } = useAuth();
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

  useEffect(() => {
    const signupEmail = sessionStorage.getItem(SIGNUP_EMAIL_KEY)?.trim() ?? '';
    const stored = readStoredAuthEmail();
    const initial = signupEmail || stored;
    if (initial) {
      setAuthEmail(initial);
      if (signupEmail) setResendEmail(signupEmail);
    }
  }, []);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string).trim();
    const password = formData.get('password') as string;
    persistAuthEmail(email);

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
    if (!acceptTermsAndPrivacy) {
      toast({
        title: 'Acceptance required',
        description: 'You must accept privacy policy and terms and conditions before creating an account.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string).trim();
    const password = formData.get('password') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    persistAuthEmail(email);

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

    const email = authEmail.trim();
    persistAuthEmail(email);
    const { error } = await resetPassword(email);

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
    const email = authEmail.trim();
    if (!email) return;
    persistAuthEmail(email);
    setMagicLinkLoading(true);
    const { error, message } = await signInWithMagicLink(email);
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
    persistAuthEmail(resendEmail);
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

  const features: Array<{ slot: IconSlotKey; text: string }> = [
    { slot: 'sidebar_clients', text: 'Clients' },
    { slot: 'sidebar_projects', text: 'Projects' },
    { slot: 'sidebar_time', text: 'Time' },
    { slot: 'sidebar_notes', text: 'Notes' },
    { slot: 'sidebar_invoices', text: 'Invoices' },
    { slot: 'sidebar_proposals', text: 'Proposals' },
    { slot: 'sidebar_contracts', text: 'Contracts' },
    { slot: 'sidebar_reviews', text: 'Approvals' },
  ];

  return (
    <div className="auth-brand min-h-screen flex bg-[linear-gradient(170deg,#faf8ff_0%,#f0ebfc_50%,#fff_100%)]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap');
        .auth-brand { font-family: 'Inter', sans-serif; }
      `}</style>
      {/* Left side - Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-[linear-gradient(160deg,#f8f6ff_0%,#fff_100%)] p-12 flex-col justify-between border-r border-[#ede8fa]">
        <div>
          <Link to="/" className="flex items-center gap-2 mb-12">
            <img
              src={LANCE_LOGO_SRC}
              alt="Lance"
              className="block h-auto w-auto max-h-[30px] max-w-[96px] object-contain object-left"
            />
          </Link>
          
          <div className="space-y-2 mb-12">
            <h1 className="text-4xl font-extrabold tracking-[-0.03em] text-[#1a1a2e]">
              <span className="block">Your entire freelance stack.</span>
              <span className="block">$29/month.</span>
            </h1>
            <p className="text-sm leading-relaxed text-[#64647a] max-w-md">
              Stop paying for five apps to run one business. Lance gives designers, developers, and freelancers a single workspace for clients, projects, time tracking, approvals, and invoices.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {features.map((feature) => (
              <div key={feature.slot} className="flex items-center gap-2.5 text-[#1a1a2e]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#9b63e9]/20 bg-[#9b63e9]/10">
                  <SlotIcon slot={feature.slot} className="h-4 w-4 text-[#9b63e9]" />
                </div>
                <span className="text-sm font-medium">{feature.text}</span>
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
            <span className="text-sm text-[#64647a]">Tested by real freelancers in beta.</span>
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
            <img
              src={LANCE_LOGO_SRC}
              alt="Lance"
              className="block h-auto w-auto max-h-[30px] max-w-[96px] object-contain object-left"
            />
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
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        autoComplete="email"
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
                        <p>We sent a sign-in link to <strong>{authEmail}</strong>. Click the link in the email to sign in.</p>
                        <p className="text-xs">If you don’t see it, check spam/junk.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleMagicLink} className="flex gap-2">
                        <Input
                          id="magic-link-email"
                          type="email"
                          placeholder="you@example.com"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          autoComplete="email"
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
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        autoComplete="email"
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
                        minLength={8}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Minimum 8 characters
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <input
                        id="accept-terms-and-privacy"
                        name="acceptTermsAndPrivacy"
                        type="checkbox"
                        checked={acceptTermsAndPrivacy}
                        onChange={(e) => setAcceptTermsAndPrivacy(e.target.checked)}
                        required
                        className="mt-1 h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <Label htmlFor="accept-terms-and-privacy" className="text-sm font-normal leading-relaxed">
                        Accept privacy policy and terms and conditions (
                        <Link to="/privacy" className="text-primary hover:underline">Privacy policy</Link>
                        {' '}and{' '}
                        <Link to="/terms" className="text-primary hover:underline">Terms and conditions</Link>
                        )
                      </Label>
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
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForgotPassword(false)}
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
