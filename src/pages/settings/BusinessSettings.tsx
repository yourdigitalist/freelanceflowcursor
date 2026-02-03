import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';
import { PhoneInput } from '@/components/ui/phone-input';

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
  bank_name: string | null;
  bank_account_number: string | null;
  bank_routing_number: string | null;
  payment_instructions: string | null;
}

export default function BusinessSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessPhone, setBusinessPhone] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('business_name, business_logo, business_email, business_phone, business_address, business_street, business_street2, business_city, business_state, business_postal_code, business_country, business_website, tax_id, bank_name, bank_account_number, bank_routing_number, payment_instructions')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
      if (data?.business_phone) {
        setBusinessPhone(data.business_phone);
      }
    } catch (error) {
      console.error('Error fetching business profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const MAX_LOGO_BYTES = 500 * 1024; // 500KB

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
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
      bank_name: formData.get('bank_name') as string || null,
      bank_account_number: formData.get('bank_account_number') as string || null,
      bank_routing_number: formData.get('bank_routing_number') as string || null,
      payment_instructions: formData.get('payment_instructions') as string || null,
    };

    try {
      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('user_id', user!.id);

      if (error) throw error;
      toast({ title: 'Business profile updated successfully' });
      fetchProfile();
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Business Logo</CardTitle>
          <CardDescription>This logo will appear on your invoices. Max file size: 500 KB. Counts toward your storage allowance.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {profile?.business_logo ? (
              <img 
                src={profile.business_logo} 
                alt="Business logo" 
                className="h-16 w-16 object-contain rounded-lg border"
              />
            ) : (
              <div className="h-16 w-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
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
              <Upload className="mr-2 h-4 w-4" />
              {saving ? 'Uploading…' : 'Upload Logo'}
            </Button>
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
          <CardTitle>Payment Information</CardTitle>
          <CardDescription>Bank details for receiving payments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input
                id="bank_name"
                name="bank_name"
                defaultValue={profile?.bank_name || ''}
                placeholder="Bank of America"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_routing_number">Routing Number</Label>
              <Input
                id="bank_routing_number"
                name="bank_routing_number"
                defaultValue={profile?.bank_routing_number || ''}
                placeholder="XXXXXXXXX"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank_account_number">Account Number</Label>
            <Input
              id="bank_account_number"
              name="bank_account_number"
              defaultValue={profile?.bank_account_number || ''}
              placeholder="XXXXXXXXXXXX"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment_instructions">Payment Instructions</Label>
            <Textarea
              id="payment_instructions"
              name="payment_instructions"
              defaultValue={profile?.payment_instructions || ''}
              placeholder="Additional payment instructions or notes..."
              rows={2}
            />
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
