import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBrowserCountry } from '@/lib/locale-data';
import { countries as countryList } from '@/components/ui/phone-input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Check, Sparkles, Loader2, ArrowRight, Building2, User } from 'lucide-react';
import { PhoneInput } from '@/components/ui/phone-input';
import { DEFAULT_STATUSES } from '@/components/tasks/types';

type Step = 'plan' | 'profile' | 'business';

const plans = [
  {
    id: 'free_trial',
    name: 'Free Trial',
    price: '$0',
    period: '14 days',
    description: 'Try all features free for 14 days',
    features: [
      'Unlimited projects',
      'Time tracking',
      'Invoice generation',
      'Client management',
    ],
    highlighted: false,
  },
  {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    price: '$45',
    period: '/month',
    description: 'Full access to all features',
    features: [
      'Everything in Free Trial',
      'Priority support',
      'Custom branding',
      'Advanced reporting',
    ],
    highlighted: true,
  },
  {
    id: 'pro_annual',
    name: 'Pro Annual',
    price: '$360',
    period: '/year',
    description: 'Save $180 with annual billing',
    features: [
      'Everything in Pro',
      '2 months free',
      'Early access to new features',
      'Dedicated account manager',
    ],
    highlighted: false,
  },
];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('plan');
  const [selectedPlan, setSelectedPlan] = useState('free_trial');
  const [loading, setLoading] = useState(false);
  
  // Profile data
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Business data
  const [businessName, setBusinessName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessStreet, setBusinessStreet] = useState('');
  const [businessStreet2, setBusinessStreet2] = useState('');
  const [businessCity, setBusinessCity] = useState('');
  const [businessState, setBusinessState] = useState('');
  const [businessPostalCode, setBusinessPostalCode] = useState('');
  const [businessCountry, setBusinessCountry] = useState('');
  const [taxId, setTaxId] = useState('');

  // Prefill first/last name from user_metadata or profile when entering profile step
  const loadProfileForPrefill = useCallback(async () => {
    if (!user) return;
    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const fromMeta = meta?.first_name != null || meta?.last_name != null;
    if (fromMeta) {
      setFirstName((meta?.first_name as string) ?? '');
      setLastName((meta?.last_name as string) ?? '');
      return;
    }
    if (meta?.full_name && typeof meta.full_name === 'string') {
      const parts = (meta.full_name as string).trim().split(/\s+/);
      if (parts.length >= 1) setFirstName(parts[0]);
      if (parts.length >= 2) setLastName(parts.slice(1).join(' '));
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', user.id)
      .maybeSingle();
    if (profile?.first_name) setFirstName(profile.first_name);
    if (profile?.last_name) setLastName(profile.last_name);
  }, [user]);

  useEffect(() => {
    if (step === 'profile') loadProfileForPrefill();
  }, [step, loadProfileForPrefill]);

  // Auto-detect country when reaching business step
  useEffect(() => {
    if (step === 'business' && !businessCountry) {
      const code = getBrowserCountry();
      const match = countryList.find((c) => c.code === code);
      if (match) setBusinessCountry(match.name);
    }
  }, [step, businessCountry]);

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleContinueToProfile = () => {
    setStep('profile');
  };

  const canContinueFromProfile = Boolean(firstName?.trim() && lastName?.trim());

  const handleContinueToBusiness = () => {
    if (!canContinueFromProfile) {
      toast({
        title: 'Name required',
        description: 'Please enter your first and last name',
        variant: 'destructive',
      });
      return;
    }
    setStep('business');
  };

  const canCompleteBusiness = Boolean(
    businessName?.trim() || businessEmail?.trim() || businessPhone?.trim()
  );

  const handleComplete = async () => {
    if (!canCompleteBusiness) {
      toast({
        title: 'Business details required',
        description: 'Please enter at least a business name or one contact (email or phone).',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 14);
      
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const profileData: Record<string, unknown> = {
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        full_name: fullName || null,
        phone,
        business_name: businessName || null,
        business_email: businessEmail || null,
        business_phone: businessPhone || null,
        business_street: businessStreet || null,
        business_street2: businessStreet2 || null,
        business_city: businessCity || null,
        business_state: businessState || null,
        business_postal_code: businessPostalCode || null,
        business_country: businessCountry || null,
        business_address: [businessStreet, businessStreet2, businessCity, businessState, businessPostalCode, businessCountry].filter(Boolean).join('\n') || null,
        tax_id: taxId || null,
        plan_type: selectedPlan,
        subscription_status: selectedPlan === 'free_trial' ? 'trial' : 'active',
        trial_start_date: new Date().toISOString(),
        trial_end_date: selectedPlan === 'free_trial' ? trialEndDate.toISOString() : null,
        onboarding_completed: false,
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('user_id', user!.id);

      if (profileError) throw profileError;

      const sampleProject = {
        user_id: user!.id,
        name: 'Getting started with FreelanceFlow',
        description: 'Sample project – next steps for FreelanceFlow',
        status: 'active',
        budget: null,
        hourly_rate: null,
        client_id: null,
      };

      const { data: projectRow, error: projectError } = await supabase
        .from('projects')
        .insert(sampleProject)
        .select('id')
        .single();

      if (projectError) throw projectError;
      const projectId = projectRow!.id;

      const statusRows = DEFAULT_STATUSES.map((s, i) => ({
        ...s,
        project_id: projectId,
        user_id: user!.id,
        position: i,
      }));
      const { data: insertedStatuses, error: statusError } = await supabase
        .from('project_statuses')
        .insert(statusRows)
        .select('id, position');

      if (statusError) throw statusError;
      const firstStatusId = insertedStatuses?.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]?.id;

      const sampleTaskTitles = [
        'Create your first invoice',
        'Update your business settings',
        'Add your bank details',
        'Add a client',
        'Create a project',
        'Log time',
      ];
      const tasksToInsert = sampleTaskTitles.map((title, i) => ({
        user_id: user!.id,
        project_id: projectId,
        title,
        description: null,
        status_id: firstStatusId ?? null,
        priority: 'medium',
        due_date: null,
        estimated_hours: null,
        position: i,
      }));

      const { error: tasksError } = await supabase.from('tasks').insert(tasksToInsert);
      if (tasksError) throw tasksError;

      const { error: completeError } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('user_id', user!.id);

      if (completeError) throw completeError;

      toast({ title: 'Welcome! Your account is ready.' });
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Error completing setup',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">FreelanceFlow</span>
          </div>
        </div>
      </header>

      {/* Progress indicator */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-2">
          <div className={`flex items-center gap-2 ${step === 'plan' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium ${step === 'plan' ? 'bg-primary text-primary-foreground' : 'bg-primary text-primary-foreground'}`}>
                {step === 'plan' ? '1' : <Check className="h-4 w-4" />}
              </div>
              <span className="text-sm font-medium hidden sm:inline">Choose Plan</span>
            </div>
            <div className="h-px w-8 bg-border" />
            <div className={`flex items-center gap-2 ${step === 'profile' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium ${step === 'profile' ? 'bg-primary text-primary-foreground' : step === 'business' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {step === 'business' ? <Check className="h-4 w-4" /> : '2'}
              </div>
              <span className="text-sm font-medium hidden sm:inline">Your Profile</span>
            </div>
            <div className="h-px w-8 bg-border" />
            <div className={`flex items-center gap-2 ${step === 'business' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium ${step === 'business' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                3
              </div>
              <span className="text-sm font-medium hidden sm:inline">Business Details</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {step === 'plan' && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold">Choose your plan</h1>
              <p className="text-muted-foreground mt-2">
                Start with a free trial or get full access immediately
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`cursor-pointer transition-all border-2 ${
                    selectedPlan === plan.id
                      ? 'border-primary shadow-lg'
                      : 'border-transparent hover:border-border'
                  } ${plan.highlighted ? 'ring-2 ring-primary/20' : ''}`}
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  <CardHeader>
                    {plan.highlighted && (
                      <div className="text-xs font-medium text-primary uppercase tracking-wide mb-2">
                        Most Popular
                      </div>
                    )}
                    <CardTitle className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-center">
              <Button size="lg" onClick={handleContinueToProfile} className="px-8">
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'profile' && (
          <div className="space-y-6 max-w-md mx-auto">
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <User className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold">Your Profile</h1>
              <p className="text-muted-foreground mt-2">
                Tell us a bit about yourself
              </p>
            </div>

            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <PhoneInput
                    id="phone"
                    value={phone}
                    onChange={setPhone}
                    placeholder="Phone number"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep('plan')}>
                Back
              </Button>
              <Button onClick={handleContinueToBusiness} disabled={!canContinueFromProfile}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'business' && (
          <div className="space-y-6 max-w-md mx-auto">
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold">Business Details</h1>
              <p className="text-muted-foreground mt-2">
                This information will appear on your invoices
              </p>
            </div>

            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business / Company Name</Label>
                  <Input
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Acme Inc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessEmail">Business Email</Label>
                  <Input
                    id="businessEmail"
                    type="email"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    placeholder="billing@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessPhone">Business Phone</Label>
                  <PhoneInput
                    id="businessPhone"
                    value={businessPhone}
                    onChange={setBusinessPhone}
                    placeholder="Phone number"
                    className="w-full min-w-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Business Address</Label>
                  <Input
                    value={businessStreet}
                    onChange={(e) => setBusinessStreet(e.target.value)}
                    placeholder="Street"
                  />
                  <Input
                    value={businessStreet2}
                    onChange={(e) => setBusinessStreet2(e.target.value)}
                    placeholder="Street 2 / Apt, Suite"
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      value={businessCity}
                      onChange={(e) => setBusinessCity(e.target.value)}
                      placeholder="City"
                    />
                    <Input
                      value={businessState}
                      onChange={(e) => setBusinessState(e.target.value)}
                      placeholder="State / Province"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      value={businessPostalCode}
                      onChange={(e) => setBusinessPostalCode(e.target.value)}
                      placeholder="ZIP / Postal Code"
                    />
                    <Input
                      value={businessCountry}
                      onChange={(e) => setBusinessCountry(e.target.value)}
                      placeholder="Country"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID / VAT Number</Label>
                  <Input
                    id="taxId"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="XX-XXXXXXX"
                  />
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground text-center">
              You can update these details anytime in Settings
            </p>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep('profile')}>
                Back
              </Button>
              <Button onClick={handleComplete} disabled={loading || !canCompleteBusiness}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Setup
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}