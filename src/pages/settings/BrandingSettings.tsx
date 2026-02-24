import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useBranding, useBrandingMutation, type AppBranding } from '@/hooks/useBranding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Palette } from 'lucide-react';

const BRANDING_BUCKET = 'app-branding';
const MAX_FILE_BYTES = 500 * 1024; // 500KB per image

export default function BrandingSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: branding, isLoading } = useBranding();
  const { invalidate } = useBrandingMutation();
  const [saving, setSaving] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('');
  const [logoWidth, setLogoWidth] = useState<string>('120');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (branding?.primary_color) setPrimaryColor(branding.primary_color);
    else setPrimaryColor('');
  }, [branding]);

  useEffect(() => {
    if (branding?.logo_width != null) setLogoWidth(String(branding.logo_width));
    else setLogoWidth('120');
  }, [branding?.logo_width]);

  const uploadFile = async (
    file: File,
    key: 'logo' | 'icon' | 'favicon'
  ): Promise<string> => {
    const ext = file.name.split('.').pop() || (key === 'favicon' ? 'ico' : 'png');
    const path = `${key}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BRANDING_BUCKET).upload(path, file, { upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from(BRANDING_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const saveBranding = async (updates: Partial<AppBranding>) => {
    const { error } = await supabase
      .from('app_branding')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', 1);
    if (error) throw error;
    await invalidate();
    toast({ title: 'Branding updated' });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' });
      e.target.value = '';
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast({ title: 'File too large (max 500 KB)', variant: 'destructive' });
      e.target.value = '';
      return;
    }
    setSaving(true);
    try {
      const url = await uploadFile(file, 'logo');
      await saveBranding({ logo_url: url });
      e.target.value = '';
    } catch (err: unknown) {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
      e.target.value = '';
    } finally {
      setSaving(false);
      e.target.value = '';
    }
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' });
      e.target.value = '';
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast({ title: 'File too large (max 500 KB)', variant: 'destructive' });
      e.target.value = '';
      return;
    }
    setSaving(true);
    try {
      const url = await uploadFile(file, 'icon');
      await saveBranding({ icon_url: url });
      e.target.value = '';
    } catch (err: unknown) {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
      e.target.value = '';
    } finally {
      setSaving(false);
      e.target.value = '';
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const valid = file.type.startsWith('image/') || file.name.endsWith('.ico');
    if (!valid) {
      toast({ title: 'Use an image or .ico file', variant: 'destructive' });
      e.target.value = '';
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast({ title: 'File too large (max 500 KB)', variant: 'destructive' });
      e.target.value = '';
      return;
    }
    setSaving(true);
    try {
      const url = await uploadFile(file, 'favicon');
      await saveBranding({ favicon_url: url });
      e.target.value = '';
    } catch (err: unknown) {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
      e.target.value = '';
    } finally {
      setSaving(false);
      e.target.value = '';
    }
  };

  const handlePrimaryColorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hex = primaryColor.trim().replace(/^#/, '');
    if (!hex) {
      setSaving(true);
      try {
        await saveBranding({ primary_color: null });
        setPrimaryColor('');
      } catch (err: unknown) {
        toast({
          title: 'Failed to save',
          description: err instanceof Error ? err.message : 'Unknown error',
          variant: 'destructive',
        });
      } finally {
        setSaving(false);
      }
      return;
    }
    if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
      toast({ title: 'Enter a valid hex color (e.g. 9B63E9)', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await saveBranding({ primary_color: '#' + hex });
    } catch (err: unknown) {
      toast({
        title: 'Failed to save',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Branding</h1>
        <p className="text-muted-foreground">
          App logo, sidebar icon, favicon, and optional primary color. Shown to all users.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logo (expanded sidebar)</CardTitle>
          <CardDescription>
            Full logo shown when the sidebar is expanded. Height fills the header; set width in pixels below. Max 500 KB.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          {branding?.logo_url ? (
            <img src={branding.logo_url} alt="App logo" className="h-10 object-contain" />
          ) : (
            <div className="h-10 w-32 rounded border-2 border-dashed border-border flex items-center justify-center bg-muted">
              <Upload className="h-5 w-5 text-muted-foreground" />
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
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload logo
          </Button>
          <div className="flex items-center gap-2">
            <Label htmlFor="logo_width" className="text-muted-foreground whitespace-nowrap">Width (px)</Label>
            <Input
              id="logo_width"
              type="number"
              min={24}
              max={400}
              className="w-20 font-mono"
              value={logoWidth}
              onChange={(e) => setLogoWidth(e.target.value)}
              onBlur={() => {
                const n = parseInt(logoWidth, 10);
                if (!Number.isNaN(n) && n >= 24 && n <= 400) saveBranding({ logo_width: n });
                else if (logoWidth !== '' && (Number.isNaN(n) || n < 24 || n > 400)) {
                  toast({ title: 'Width must be between 24 and 400', variant: 'destructive' });
                }
              }}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Icon (collapsed sidebar)</CardTitle>
          <CardDescription>
            Square icon shown when the sidebar is collapsed. Prefer square or round. Max 500 KB.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          {branding?.icon_url ? (
            <img src={branding.icon_url} alt="App icon" className="h-10 w-10 object-contain rounded-lg" />
          ) : (
            <div className="h-10 w-10 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted">
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <input
            ref={iconInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleIconUpload}
            disabled={saving}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => iconInputRef.current?.click()}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload icon
          </Button>
          <div className="flex items-center gap-2">
            <Label htmlFor="icon_size" className="text-muted-foreground whitespace-nowrap">Size</Label>
            <Select
              value={branding?.logo_size ?? 'md'}
              onValueChange={(v) => saveBranding({ logo_size: v })}
              disabled={saving}
            >
              <SelectTrigger id="icon_size" className="w-28">
                <SelectValue placeholder="Size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sm">Small</SelectItem>
                <SelectItem value="md">Medium</SelectItem>
                <SelectItem value="lg">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Favicon</CardTitle>
          <CardDescription>
            Browser tab icon. Use a square image or .ico. Max 500 KB.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          {branding?.favicon_url ? (
            <img src={branding.favicon_url} alt="Favicon" className="h-8 w-8 object-contain" />
          ) : (
            <div className="h-8 w-8 rounded border-2 border-dashed border-border flex items-center justify-center bg-muted">
              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <input
            ref={faviconInputRef}
            type="file"
            accept="image/*,.ico"
            className="sr-only"
            onChange={handleFaviconUpload}
            disabled={saving}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => faviconInputRef.current?.click()}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload favicon
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Primary color
          </CardTitle>
          <CardDescription>
            Optional. Hex color (e.g. 9B63E9) for buttons and accents. Leave empty to keep default purple.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePrimaryColorSubmit} className="flex items-end gap-2 flex-wrap">
            <div className="space-y-2">
              <Label htmlFor="primary_color">Hex</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">#</span>
                <Input
                  id="primary_color"
                  placeholder="9B63E9"
                  value={primaryColor.replace(/^#/, '')}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-28 font-mono"
                />
                {primaryColor && (
                  <div
                    className="h-8 w-8 rounded border shrink-0"
                    style={{ backgroundColor: primaryColor.startsWith('#') ? primaryColor : '#' + primaryColor }}
                  />
                )}
              </div>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save color'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
