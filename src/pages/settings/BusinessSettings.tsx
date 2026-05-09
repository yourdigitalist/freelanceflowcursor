import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useSettingsDirty } from '@/contexts/SettingsDirtyContext';
import { notifyStartGuideRefresh } from '@/components/layout/StartGuide';
import { Loader2, Upload } from '@/components/icons';
import { PhoneInput } from '@/components/ui/phone-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BusinessProfile {
  business_name: string | null;
  business_logo: string | null;
  business_email: string | null;
  business_phone: string | null;
  business_address: string | null;
  business_street: string | null;
  business_street2: string | null;
  business_city: string | null;
  business_state: string | null;
  business_postal_code: string | null;
  business_country: string | null;
  business_website: string | null;
  tax_id: string | null;
  client_email_primary_color: string | null;
  client_email_header_html: string | null;
  client_email_footer_html: string | null;
}

type FooterMode = 'standard' | 'custom';
type EmailLogoVariant = 'light' | 'dark';

const CUSTOM_FOOTER_PREFIX = '<!-- lance_footer_custom -->';
const EMAIL_COMMS_CONFIG_PREFIX = 'LANCE_EMAIL_CONFIG::';

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildCustomFooterHtml = (footerText: string) => {
  if (!footerText.trim()) return null;
  return `${CUSTOM_FOOTER_PREFIX}<p style="margin:0;">${escapeHtml(footerText.trim())}</p>`;
};

const parseEmailCommsConfig = (raw: string | null | undefined): { logoDefault: string; logoSecondary: string; logoVariant: EmailLogoVariant } => {
  const fallback = { logoDefault: '', logoSecondary: '', logoVariant: 'light' as EmailLogoVariant };
  const text = (raw || '').trim();
  if (!text.startsWith(EMAIL_COMMS_CONFIG_PREFIX)) return fallback;
  try {
    const parsed = JSON.parse(text.slice(EMAIL_COMMS_CONFIG_PREFIX.length));
    const logoDefault = typeof parsed?.logoDefault === 'string'
      ? parsed.logoDefault
      : typeof parsed?.logoLight === 'string'
        ? parsed.logoLight
        : '';
    const logoSecondary = typeof parsed?.logoSecondary === 'string'
      ? parsed.logoSecondary
      : typeof parsed?.logoDark === 'string'
        ? parsed.logoDark
        : '';
    return {
      logoDefault,
      logoSecondary,
      logoVariant: parsed?.logoVariant === 'dark' ? 'dark' : 'light',
    };
  } catch {
    return fallback;
  }
};

const buildEmailCommsConfig = (logoDefault: string, logoSecondary: string, logoVariant: EmailLogoVariant) =>
  `${EMAIL_COMMS_CONFIG_PREFIX}${JSON.stringify({ logoDefault, logoSecondary, logoVariant })}`;

export default function BusinessSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const dirtyContext = useSettingsDirty();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessPhone, setBusinessPhone] = useState('');
  const [emailBrandColor, setEmailBrandColor] = useState('#9B63E9');
  const [footerMode, setFooterMode] = useState<FooterMode>('standard');
  const [customFooterText, setCustomFooterText] = useState('');
  const [emailLogoSecondary, setEmailLogoSecondary] = useState('');
  const [emailLogoVariant, setEmailLogoVariant] = useState<EmailLogoVariant>('light');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const emailLogoDarkInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const save = async () => {
    if (!formRef.current || !user) return;
    const formData = new FormData(formRef.current);
    const street = formData.get('business_street') as string || null;
    const street2 = formData.get('business_street2') as string || null;
    const city = formData.get('business_city') as string || null;
    const state = formData.get('business_state') as string || null;
    const postalCode = formData.get('business_postal_code') as string || null;
    const country = formData.get('business_country') as string || null;
    const addressLine = [street, street2, city, state, postalCode, country].filter(Boolean).join('\n') || null;
    const profileData = {
      business_name: formData.get('business_name') as string || null,
      business_email: formData.get('business_email') as string || null,
      business_phone: businessPhone || null,
      business_street: street,
      business_street2: street2,
      business_city: city,
      business_state: state,
      business_postal_code: postalCode,
      business_country: country,
      business_address: addressLine,
      business_website: formData.get('business_website') as string || null,
      tax_id: formData.get('tax_id') as string || null,
      client_email_primary_color: emailBrandColor || '#9B63E9',
      client_email_header_html: buildEmailCommsConfig(profile?.business_logo || '', emailLogoSecondary, emailLogoVariant),
      client_email_footer_html: footerMode === 'custom' ? buildCustomFooterHtml(customFooterText) : null,
    };
    const { error } = await supabase.from('profiles').update(profileData).eq('user_id', user.id);
    if (error) throw error;
    toast({ title: 'Business profile updated successfully' });
    await fetchProfile();
    dirtyContext?.setDirty(false);
    notifyStartGuideRefresh();
  };

  const discard = () => {
    fetchProfile();
    dirtyContext?.setDirty(false);
  };

  useEffect(() => {
    dirtyContext?.registerHandlers(save, discard);
  }, [dirtyContext]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('business_name, business_logo, business_email, business_phone, business_address, business_street, business_street2, business_city, business_state, business_postal_code, business_country, business_website, tax_id, client_email_primary_color, client_email_header_html, client_email_footer_html')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
      setEmailBrandColor((data?.client_email_primary_color || '#9B63E9').trim() || '#9B63E9');
      const commsCfg = parseEmailCommsConfig(data?.client_email_header_html);
      setEmailLogoSecondary(commsCfg.logoSecondary || '');
      setEmailLogoVariant(commsCfg.logoVariant);
      const rawFooter = (data?.client_email_footer_html || '').trim();
      if (rawFooter.startsWith(CUSTOM_FOOTER_PREFIX)) {
        setFooterMode('custom');
        setCustomFooterText(
          rawFooter
            .replace(CUSTOM_FOOTER_PREFIX, '')
            .replace(/<[^>]*>/g, '')
            .trim()
        );
      } else {
        setFooterMode('standard');
        setCustomFooterText('');
      }
      if (data?.business_phone) {
        setBusinessPhone(data.business_phone);
      } else {
        setBusinessPhone('');
      }
    } catch (error) {
      console.error('Error fetching business profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const MAX_LOGO_BYTES = 500 * 1024; // 500KB

  const persistEmailCommsConfig = async (next: { secondaryLogo?: string; variant?: EmailLogoVariant }) => {
    if (!user) return;
    const secondaryLogo = next.secondaryLogo ?? emailLogoSecondary;
    const variant = next.variant ?? emailLogoVariant;
    const payload = buildEmailCommsConfig(profile?.business_logo || '', secondaryLogo, variant);
    const { error } = await supabase
      .from('profiles')
      .update({ client_email_header_html: payload })
      .eq('user_id', user.id);
    if (error) throw error;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast({
        title: 'File too large',
        description: `Max size is 500 KB. Your file is ${(file.size / 1024).toFixed(1)} KB.`,
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }
    setSaving(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${user.id}/logo-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('business-logos').getPublicUrl(path);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ business_logo: urlData.publicUrl })
        .eq('user_id', user.id);
      if (updateError) throw updateError;
      toast({ title: 'Logo uploaded' });
      fetchProfile();
    } catch (error: any) {
      const msg = error.message ?? '';
      const isRls = msg.includes('row-level security') || msg.includes('violates');
      toast({
        title: 'Upload failed',
        description: isRls
          ? 'Storage access was denied. Ensure the business-logos bucket has RLS policies for your user.'
          : msg.includes('Bucket not found')
            ? 'Create a storage bucket named "business-logos" in Supabase (Storage) and set it to public.'
            : msg,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
      e.target.value = '';
    }
  };

  const uploadEmailLogoVariant = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast({
        title: 'File too large',
        description: `Max size is 500 KB. Your file is ${(file.size / 1024).toFixed(1)} KB.`,
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${user.id}/email-logo-secondary-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('business-logos').getPublicUrl(path);
      setEmailLogoSecondary(urlData.publicUrl);
      await persistEmailCommsConfig({ secondaryLogo: urlData.publicUrl });
      dirtyContext?.setDirty(true);
      toast({ title: 'Secondary email logo uploaded' });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message ?? 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      await save();
    } catch (error: any) {
      toast({
        title: 'Error saving business profile',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} onInput={() => dirtyContext?.setDirty(true)} className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Business Logo</CardTitle>
          <CardDescription>Upload your default business logo and an optional secondary logo for client emails. Max file size: 500 KB each.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Default logo</p>
              <div className="flex items-center gap-3">
                {profile?.business_logo ? (
                  <img
                    src={profile.business_logo}
                    alt="Business logo"
                    className="h-10 w-[140px] rounded border bg-background p-1 object-contain"
                  />
                ) : (
                  <div className="h-10 w-[140px] rounded border-2 border-dashed border-border bg-muted" />
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleLogoUpload}
                  disabled={saving}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={saving}
                >
                  {saving ? 'Uploading…' : 'Upload'}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Secondary logo (optional)</p>
              <div className="flex items-center gap-3">
                {emailLogoSecondary ? (
                  <img src={emailLogoSecondary} alt="Secondary email logo" className="h-10 w-[140px] rounded border bg-background p-1 object-contain" />
                ) : (
                  <div className="h-10 w-[140px] rounded border-2 border-dashed border-border bg-muted" />
                )}
                <input
                  ref={emailLogoDarkInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadEmailLogoVariant(file);
                    e.target.value = '';
                  }}
                  disabled={saving}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => emailLogoDarkInputRef.current?.click()} disabled={saving}>
                  Upload
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>Your business details for invoices and client communication</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business Name</Label>
              <Input
                id="business_name"
                name="business_name"
                defaultValue={profile?.business_name || ''}
                placeholder="Acme Inc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_id">Tax ID / VAT Number</Label>
              <Input
                id="tax_id"
                name="tax_id"
                defaultValue={profile?.tax_id || ''}
                placeholder="XX-XXXXXXX"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="business_email">Business Email</Label>
              <Input
                id="business_email"
                name="business_email"
                type="email"
                defaultValue={profile?.business_email || ''}
                placeholder="billing@company.com"
              />
            </div>
            <div className="space-y-2 min-w-0">
              <Label htmlFor="business_phone">Business Phone</Label>
              <div className="flex gap-2 min-w-0">
                <PhoneInput
                  value={businessPhone}
                  onChange={setBusinessPhone}
                  placeholder="Phone number"
                  className="min-w-0 flex-1"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Business Address</Label>
            <Input
              name="business_street"
              defaultValue={profile?.business_street || ''}
              placeholder="Street"
            />
            <Input
              name="business_street2"
              defaultValue={profile?.business_street2 || ''}
              placeholder="Street 2 / Apt, Suite"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                name="business_city"
                defaultValue={profile?.business_city || ''}
                placeholder="City"
              />
              <Input
                name="business_state"
                defaultValue={profile?.business_state || ''}
                placeholder="State / Province"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                name="business_postal_code"
                defaultValue={profile?.business_postal_code || ''}
                placeholder="ZIP / Postal Code"
              />
              <Input
                name="business_country"
                defaultValue={profile?.business_country || ''}
                placeholder="Country"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="business_website">Website</Label>
            <Input
              id="business_website"
              name="business_website"
              defaultValue={profile?.business_website || ''}
              placeholder="https://www.company.com"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Client Email Template</CardTitle>
          <CardDescription>
            This controls how invoice and review emails look for clients.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client_email_primary_color">Brand Color</Label>
            <Input
              id="client_email_primary_color"
              value={emailBrandColor}
              onChange={(e) => setEmailBrandColor(e.target.value)}
              placeholder="#9B63E9"
            />
            <p className="text-xs text-muted-foreground">Header and email call-to-action buttons use this color.</p>
          </div>
          <div className="space-y-2">
            <Label>Logo used in client emails</Label>
            <Select
              value={emailLogoVariant}
              onValueChange={async (value) => {
                const next = value as EmailLogoVariant;
                setEmailLogoVariant(next);
                dirtyContext?.setDirty(true);
                try {
                  await persistEmailCommsConfig({ variant: next });
                  toast({ title: 'Email logo preference saved' });
                } catch (error: any) {
                  toast({
                    title: 'Failed to save logo preference',
                    description: error.message ?? 'Please try again',
                    variant: 'destructive',
                  });
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select logo option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Default logo</SelectItem>
                <SelectItem value="dark">Secondary logo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Email Footer Style</Label>
            <Select value={footerMode} onValueChange={(value) => setFooterMode(value as FooterMode)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select footer style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard (Business name + reply email)</SelectItem>
                <SelectItem value="custom">Custom message</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {footerMode === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="client_email_footer_custom_text">Custom Footer Text</Label>
              <Textarea
                id="client_email_footer_custom_text"
                value={customFooterText}
                onChange={(e) => setCustomFooterText(e.target.value)}
                placeholder="Example: Sent by Acme Studio · billing@acme.com"
                rows={2}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Live Preview</Label>
            <div className="overflow-hidden rounded-xl border bg-white">
              <div className="px-5 py-4" style={{ backgroundColor: emailBrandColor || '#9B63E9' }}>
                {(emailLogoVariant === 'dark' ? emailLogoSecondary : profile?.business_logo) ? (
                  <img src={(emailLogoVariant === 'dark' ? emailLogoSecondary : profile?.business_logo) || profile?.business_logo || ''} alt="Business logo" className="h-7 max-w-[170px] object-contain" />
                ) : (
                  <p className="text-base font-semibold text-white">{profile?.business_name || 'Your Business'}</p>
                )}
              </div>
              <div className="space-y-4 p-5 text-sm text-slate-700">
                <h3 className="text-lg font-semibold" style={{ color: emailBrandColor || '#9B63E9' }}>Invoice INV-0001</h3>
                <p>Hi Client Name,</p>
                <p>Here&apos;s your invoice for this project. Let me know if you have any questions.</p>
                <Button
                  type="button"
                  size="sm"
                  className="text-white"
                  style={{ backgroundColor: emailBrandColor || '#9B63E9' }}
                >
                  View Invoice
                </Button>
              </div>
              <div className="border-t px-5 py-3 text-xs text-muted-foreground">
                {footerMode === 'custom' && customFooterText.trim()
                  ? customFooterText.trim()
                  : `Sent by ${profile?.business_name || 'Your Business'}${profile?.business_email || user?.email ? ` · ${profile?.business_email || user?.email}` : ''}`}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
