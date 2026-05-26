import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { notifyStartGuideRefresh } from '@/components/layout/startGuideUtils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useProfileCurrency } from '@/hooks/useProfileCurrency';
import { ClientFormFields } from '@/components/clients/ClientFormFields';
import { DEFAULT_CLIENT_AVATAR_COLOR } from '@/lib/clientAvatarColors';
import {
  buildClientDbPayload,
  clientToFormValues,
  emptyClientFormValues,
  type ClientFormValues,
} from '@/lib/clientForm';
import { clientLogoPublicUrl } from '@/lib/clientLogo';
import { resolveClientLogoPath } from '@/lib/clientLogoUpload';

export interface ClientFormDialogClient {
  id: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  tax_id?: string | null;
  street?: string | null;
  street2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  avatar_color?: string | null;
  logo_url?: string | null;
  status?: string | null;
  notes?: string | null;
  next_action?: string | null;
  next_follow_up_at?: string | null;
  lead_source?: string | null;
  estimated_value?: number | null;
  currency?: string | null;
  tags?: string[] | null;
}

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingClient?: ClientFormDialogClient | null;
  defaultStatus?: string;
  onSaved?: (client: ClientFormDialogClient) => void;
}

export function ClientFormDialog({
  open,
  onOpenChange,
  editingClient = null,
  defaultStatus = 'active',
  onSaved,
}: ClientFormDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { currency: profileCurrency } = useProfileCurrency();
  const [clientPhone, setClientPhone] = useState('');
  const [selectedColor, setSelectedColor] = useState(DEFAULT_CLIENT_AVATAR_COLOR);
  const [clientLogoPreview, setClientLogoPreview] = useState<string | null>(null);
  const clientLogoInputRef = useRef<HTMLInputElement>(null);
  const [formValues, setFormValues] = useState<ClientFormValues>(() =>
    emptyClientFormValues(profileCurrency, defaultStatus),
  );

  useEffect(() => {
    if (!open) return;
    if (editingClient) {
      setFormValues(clientToFormValues(editingClient, profileCurrency));
      setClientPhone(editingClient.phone || '');
      setSelectedColor(editingClient.avatar_color || DEFAULT_CLIENT_AVATAR_COLOR);
      setClientLogoPreview(
        editingClient.logo_url ? clientLogoPublicUrl(editingClient.logo_url) : null,
      );
    } else {
      setFormValues(emptyClientFormValues(profileCurrency, defaultStatus));
      setClientPhone('');
      setSelectedColor(DEFAULT_CLIENT_AVATAR_COLOR);
      setClientLogoPreview(null);
      if (clientLogoInputRef.current) clientLogoInputRef.current.value = '';
    }
  }, [open, editingClient, defaultStatus, profileCurrency]);

  const resetAndClose = () => {
    onOpenChange(false);
    setClientPhone('');
    setSelectedColor(DEFAULT_CLIENT_AVATAR_COLOR);
    setClientLogoPreview(null);
    if (clientLogoInputRef.current) clientLogoInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    try {
      const logoFile = clientLogoInputRef.current?.files?.[0];
      const logoPath = await resolveClientLogoPath({
        userId: user.id,
        clientId: editingClient?.id || 'new',
        existingLogoPath: editingClient?.logo_url || null,
        logoFile,
        hasPreview: !!clientLogoPreview,
      });

      const clientData = buildClientDbPayload(formValues, {
        phone: clientPhone,
        avatar_color: selectedColor,
        logo_url: logoPath,
        user_id: user.id,
      });

      let savedClient: ClientFormDialogClient | null = null;
      if (editingClient) {
        const { data, error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', editingClient.id)
          .select('*')
          .single();
        if (error) throw error;
        savedClient = data;
        toast({ title: 'Client updated successfully' });
      } else {
        const { data, error } = await supabase
          .from('clients')
          .insert(clientData)
          .select('*')
          .single();
        if (error) throw error;
        savedClient = data;
        toast({ title: 'Client created successfully' });
      }

      notifyStartGuideRefresh();
      resetAndClose();
      if (savedClient) onSaved?.(savedClient);
    } catch (error: any) {
      toast({
        title: 'Error saving client',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : resetAndClose())}>
      <DialogContent className="max-w-2xl max-h-[90vh] w-[95vw]">
        <DialogHeader>
          <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <form onSubmit={handleSubmit} className="space-y-4 py-1 pr-6 pl-1">
            <ClientFormFields
              values={formValues}
              onChange={(patch) => setFormValues((prev) => ({ ...prev, ...patch }))}
              phone={clientPhone}
              onPhoneChange={setClientPhone}
              logoPreviewUrl={clientLogoPreview}
              onLogoPreviewChange={setClientLogoPreview}
              selectedAvatarColor={selectedColor}
              onSelectedAvatarColorChange={setSelectedColor}
              logoFileInputRef={clientLogoInputRef}
              fallbackName={
                [formValues.first_name, formValues.last_name].filter(Boolean).join(' ').trim() ||
                editingClient?.name ||
                'Client'
              }
              profileCurrency={profileCurrency}
              fieldIdPrefix="clients-dialog"
            />
            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={resetAndClose}>
                Cancel
              </Button>
              <Button type="submit">
                {editingClient ? 'Update' : 'Add'} Client
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
