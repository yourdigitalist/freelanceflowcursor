import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Briefcase, Loader2, Clock, Users, FileText, BarChart3, Check } from 'lucide-react';

const SIGNUP_PENDING_KEY = 'signup_pending';

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showConfirmEmailMessage, setShowConfirmEmailMessage] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const { signIn, signUp, resetPassword, resendConfirmationEmail } = useAuth();
  const navigate = useNavigate();
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
      sessionStorage.setItem('signup_pending', '1');
      navigate('/onboarding');
      toast({
        title: 'Check your email',
        description: "We sent a confirmation link. After confirming, you'll complete setup here.",
      });
    }
    
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await resetPassword(forgotPasswordEmail);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
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
    { icon: Users, text: 'Client Management' },
    { icon: BarChart3, text: 'Project Tracking' },
    { icon: Clock, text: 'Time Tracking' },
    { icon: FileText, text: 'Professional Invoicing' },
  ];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-background via-background to-primary/5">
      {/* Left side - Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary/5 p-12 flex-col justify-between">
        <div>
          <Link to="/" className="flex items-center gap-2 mb-12">
            <Briefcase className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-gradient">FreelanceFlow</span>
          </Link>
          
          <div className="space-y-2 mb-12">
            <h1 className="text-4xl font-bold text-foreground">
              Manage your freelance business
            </h1>
            <p className="text-xl text-muted-foreground">
              All-in-one platform for clients, projects, time & invoices
            </p>
          </div>

          <div className="space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 text-foreground">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-lg">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-background/50 rounded-xl p-6 border border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex -space-x-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-xs font-medium">JD</div>
              <div className="h-8 w-8 rounded-full bg-accent/20 border-2 border-background flex items-center justify-center text-xs font-medium">SK</div>
              <div className="h-8 w-8 rounded-full bg-secondary border-2 border-background flex items-center justify-center text-xs font-medium">+</div>
            </div>
            <span className="text-sm text-muted-foreground">Join 1000+ freelancers</span>
          </div>
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Check key={i} className="h-4 w-4 text-primary" />
            ))}
            <span className="text-sm text-muted-foreground ml-2">Trusted by professionals</span>
          </div>
        </div>
      </div>

      {/* Right side - Auth forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-12">
        <div className="w-full max-w-md animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-8 lg:hidden">
            <Briefcase className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-gradient">FreelanceFlow</span>
          </div>

          <Card className="border-0 shadow-xl">
            {showConfirmEmailMessage && (
              <div className="mx-6 mt-6 p-4 rounded-lg bg-primary/10 border border-primary/20 text-sm space-y-3">
                <p className="text-center">Check your email to confirm your account. After confirming, you’ll complete setup on the onboarding page.</p>
                <form onSubmit={handleResendConfirmation} className="flex flex-col gap-2">
                  <Input
                    type="email"
                    placeholder="Your signup email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    className="h-9"
                  />
                  <Button type="submit" variant="secondary" size="sm" disabled={resendLoading}>
                    {resendLoading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                    Resend confirmation email
                  </Button>
                </form>
              </div>
            )}
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl">Welcome</CardTitle>
              <CardDescription>
                Sign in to your account or create a new one
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={authTab} onValueChange={setAuthTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 h-11 p-1 bg-muted">
                  <TabsTrigger
                    value="signin"
                    className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground"
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
                    <Button type="submit" className="w-full" disabled={isLoading}>
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
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Account
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  By continuing, you agree to our{' '}
                  <a href="#" className="text-primary hover:underline">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/" className="text-primary hover:underline">
              ← Back to home
            </Link>
          </p>
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
