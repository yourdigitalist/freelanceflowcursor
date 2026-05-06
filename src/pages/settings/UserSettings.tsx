import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useSettingsDirty } from '@/contexts/SettingsDirtyContext';
import { Loader2 } from '@/components/icons';
import { SlotIcon } from '@/contexts/IconSlotContext';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
}

export default function UserSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const dirtyContext = useSettingsDirty();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const save = async () => {
    if (!formRef.current || !user) return;
    const formData = new FormData(formRef.current);
    const firstName = formData.get('first_name') as string || null;
    const lastName = formData.get('last_name') as string || null;
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || null;
    const profileData = {
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      email: formData.get('email') as string || null,
      phone: formData.get('phone') as string || null,
    };
    const { error } = await supabase.from('profiles').update(profileData).eq('user_id', user.id);
    if (error) throw error;
    toast({ title: 'Profile updated successfully' });
    await fetchProfile();
    dirtyContext?.setDirty(false);
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
        .select('first_name, last_name, full_name, email, phone, avatar_url')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      await save();
    } catch (error: any) {
      toast({
        title: 'Error saving profile',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== 'DELETE' || deletingAccount) return;

    setDeletingAccount(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: {},
      });

      if (error) {
        throw new Error(error.message || 'Failed to delete account');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to delete account');
      }

      await supabase.auth.signOut();
      navigate('/auth', { replace: true });
      toast({ title: 'Account deleted' });
    } catch (error: any) {
      toast({
        title: 'Failed to delete account',
        description: error.message ?? 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  const MAX_AVATAR_BYTES = 500 * 1024; // 500KB

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' });
      e.target.value = '';
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
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
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('business-logos').getPublicUrl(path);
      const avatarUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', user.id);
      if (updateError) throw updateError;

      setProfile((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : prev));
      toast({ title: 'Profile photo updated' });
      dirtyContext?.setDirty(false);
    } catch (error: any) {
      const msg = error.message ?? '';
      const isRls = msg.includes('row-level security') || msg.includes('violates');
      toast({
        title: 'Upload failed',
        description: isRls
          ? 'Storage access was denied. Ensure the "business-logos" bucket has policies allowing your user folder.'
          : msg.includes('Bucket not found')
            ? 'Create a storage bucket named "business-logos" in Supabase Storage and set it to public.'
            : msg || 'Could not upload profile photo',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`.trim()
    : profile?.full_name || '';
  const initials = displayName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <form ref={formRef} onSubmit={handleSubmit} onInput={() => dirtyContext?.setDirty(true)} className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>Update your profile photo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleAvatarUpload}
              disabled={saving}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => avatarInputRef.current?.click()}
              disabled={saving}
            >
              <SlotIcon slot="profile_camera" className="mr-2 h-4 w-4" />
              {saving ? 'Uploading…' : 'Upload Photo'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                name="first_name"
                defaultValue={profile?.first_name || profile?.full_name?.split(' ')[0] || ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                name="last_name"
                defaultValue={profile?.last_name || profile?.full_name?.split(' ').slice(1).join(' ') || ''}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={profile?.email || ''}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={profile?.phone || ''}
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

      <Card className="border-destructive/20 bg-destructive/5 shadow-sm">
        <CardHeader>
          <CardTitle className="text-destructive">Delete Account</CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              setDeleteConfirmationText('');
              setDeleteDialogOpen(true);
            }}
          >
            Delete Account
          </Button>
        </CardContent>
      </Card>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!deletingAccount) {
            setDeleteDialogOpen(open);
            if (!open) setDeleteConfirmationText('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action permanently removes your account and data. Type DELETE to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="delete-account-confirmation">Type DELETE to confirm</Label>
            <Input
              id="delete-account-confirmation"
              value={deleteConfirmationText}
              onChange={(event) => setDeleteConfirmationText(event.target.value)}
              placeholder="DELETE"
              autoComplete="off"
              disabled={deletingAccount}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={deletingAccount}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteConfirmationText !== 'DELETE' || deletingAccount}
              onClick={handleDeleteAccount}
            >
              {deletingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Account
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <p className="mt-4 text-sm text-muted-foreground">
        Lance currently supports single-user workspaces. Team collaboration is on the roadmap.
      </p>
    </form>
  );
}