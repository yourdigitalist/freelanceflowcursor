import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useSettingsDirty } from '@/contexts/SettingsDirtyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Pencil, Check, X, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const MERGE_TAGS = [
  { tag: '{{client_name}}', label: 'Client Name' },
  { tag: '{{invoice_number}}', label: 'Invoice Number' },
  { tag: '{{project_name}}', label: 'Project Name' },
  { tag: '{{due_date}}', label: 'Due Date' },
  { tag: '{{business_name}}', label: 'Business Name' },
  { tag: '{{total}}', label: 'Total' },
];

interface InvoiceProfile {
  hourly_rate: number | null;
  invoice_prefix: string | null;
  invoice_notes_default: string | null;
  invoice_footer: string | null;
  invoice_email_message_default: string | null;
  invoice_show_quantity: boolean | null;
  invoice_show_rate: boolean | null;
  invoice_show_line_description: boolean | null;
  invoice_show_line_date: boolean | null;
  invoice_email_subject_default: string | null;
  reminder_enabled: boolean | null;
  reminder_days_before: number | null;
  reminder_subject_default: string | null;
  reminder_body_default: string | null;
}

interface Tax {
  id: string;
  name: string;
  rate: number;
  is_default: boolean;
}

export default function InvoiceSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const dirtyContext = useSettingsDirty();
  const [profile, setProfile] = useState<InvoiceProfile | null>(null);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  
  // Tax form state
  const [newTaxName, setNewTaxName] = useState('');
  const [newTaxRate, setNewTaxRate] = useState('');
  const [editingTax, setEditingTax] = useState<Tax | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(1);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchTaxes();
    }
  }, [user]);

  const save = async () => {
    if (!formRef.current || !user) return;
    const formData = new FormData(formRef.current);
    const profileData = {
      hourly_rate: parseFloat(formData.get('hourly_rate') as string) || 0,
      invoice_prefix: formData.get('invoice_prefix') as string || 'INV-',
      invoice_notes_default: formData.get('invoice_notes_default') as string || null,
      invoice_footer: formData.get('invoice_footer') as string || null,
      invoice_email_message_default: formData.get('invoice_email_message_default') as string || null,
      invoice_show_quantity: formData.get('invoice_show_quantity') === 'on',
      invoice_show_rate: formData.get('invoice_show_rate') === 'on',
      invoice_show_line_description: formData.get('invoice_show_line_description') === 'on',
      invoice_show_line_date: formData.get('invoice_show_line_date') === 'on',
      invoice_email_subject_default: formData.get('invoice_email_subject_default') as string || null,
      reminder_enabled: reminderEnabled,
      reminder_days_before: reminderDaysBefore,
      reminder_subject_default: formData.get('reminder_subject_default') as string || null,
      reminder_body_default: formData.get('reminder_body_default') as string || null,
    };
    const { error } = await supabase.from('profiles').update(profileData).eq('user_id', user.id);
    if (error) throw error;
    toast({ title: 'Invoice settings saved successfully' });
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
        .select('hourly_rate, invoice_prefix, invoice_notes_default, invoice_footer, invoice_email_message_default, invoice_show_quantity, invoice_show_rate, invoice_show_line_description, invoice_show_line_date, invoice_email_subject_default, reminder_enabled, reminder_days_before, reminder_subject_default, reminder_body_default')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
      if (data) {
        setReminderEnabled(!!data.reminder_enabled);
        setReminderDaysBefore(data.reminder_days_before ?? 1);
      }
    } catch (error) {
      console.error('Error fetching invoice settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTaxes = async () => {
    try {
      const { data, error } = await supabase
        .from('taxes')
        .select('*')
        .order('name');

      if (error) throw error;
      setTaxes(data || []);
    } catch (error) {
      console.error('Error fetching taxes:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      await save();
    } catch (error: any) {
      toast({
        title: 'Error saving settings',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const addTax = async () => {
    if (!newTaxName.trim() || !newTaxRate.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Please enter both name and rate',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('taxes')
        .insert({
          name: newTaxName.trim(),
          rate: parseFloat(newTaxRate),
          is_default: taxes.length === 0,
          user_id: user!.id,
        });

      if (error) throw error;
      toast({ title: 'Tax added' });
      setNewTaxName('');
      setNewTaxRate('');
      fetchTaxes();
    } catch (error: any) {
      toast({
        title: 'Error adding tax',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateTax = async (tax: Tax) => {
    try {
      const { error } = await supabase
        .from('taxes')
        .update({
          name: tax.name,
          rate: tax.rate,
        })
        .eq('id', tax.id);

      if (error) throw error;
      toast({ title: 'Tax updated' });
      setEditingTax(null);
      fetchTaxes();
    } catch (error: any) {
      toast({
        title: 'Error updating tax',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteTax = async (id: string) => {
    if (!confirm('Delete this tax rate?')) return;
    
    try {
      const { error } = await supabase
        .from('taxes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Tax deleted' });
      fetchTaxes();
    } catch (error: any) {
      toast({
        title: 'Error deleting tax',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const setDefaultTax = async (id: string) => {
    try {
      // First, unset all defaults
      await supabase
        .from('taxes')
        .update({ is_default: false })
        .eq('user_id', user!.id);

      // Then set the new default
      const { error } = await supabase
        .from('taxes')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Default tax updated' });
      fetchTaxes();
    } catch (error: any) {
      toast({
        title: 'Error updating default',
        description: error.message,
        variant: 'destructive',
      });
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
    <div className="space-y-6">
      <form ref={formRef} onSubmit={handleSubmit} onInput={() => dirtyContext?.setDirty(true)} className="space-y-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Billing Defaults</CardTitle>
            <CardDescription>Default values for new invoices and projects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Default Hourly Rate</Label>
                <Input
                  id="hourly_rate"
                  name="hourly_rate"
                  type="number"
                  step="0.01"
                  defaultValue={profile?.hourly_rate || 0}
                  placeholder="75.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice_prefix">Invoice Number Prefix</Label>
                <Input
                  id="invoice_prefix"
                  name="invoice_prefix"
                  defaultValue={profile?.invoice_prefix || 'INV-'}
                  placeholder="INV-"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Invoice Column Visibility</CardTitle>
            <CardDescription>Choose which columns to show on invoices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="invoice_show_quantity">Show Quantity Column</Label>
                <p className="text-sm text-muted-foreground">Display quantity for each line item</p>
              </div>
              <Switch
                id="invoice_show_quantity"
                name="invoice_show_quantity"
                defaultChecked={profile?.invoice_show_quantity ?? true}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="invoice_show_rate">Show Rate Column</Label>
                <p className="text-sm text-muted-foreground">Display unit rate for each line item</p>
              </div>
              <Switch
                id="invoice_show_rate"
                name="invoice_show_rate"
                defaultChecked={profile?.invoice_show_rate ?? true}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="invoice_show_line_description">Show Line Description on Invoice</Label>
                <p className="text-sm text-muted-foreground">Show the optional description column on the invoice PDF</p>
              </div>
              <Switch
                id="invoice_show_line_description"
                name="invoice_show_line_description"
                defaultChecked={profile?.invoice_show_line_description ?? true}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="invoice_show_line_date">Show Line Item Date on Invoice</Label>
                <p className="text-sm text-muted-foreground">Show the optional line item date column on the invoice PDF</p>
              </div>
              <Switch
                id="invoice_show_line_date"
                name="invoice_show_line_date"
                defaultChecked={profile?.invoice_show_line_date ?? false}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Default Content</CardTitle>
            <CardDescription>Pre-fill content for new invoices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoice_notes_default">Default Notes</Label>
              <Textarea
                id="invoice_notes_default"
                name="invoice_notes_default"
                defaultValue={profile?.invoice_notes_default || ''}
                placeholder="Payment terms, thank you message, etc."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                These notes will be pre-filled on new invoices
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice_footer">Invoice Footer</Label>
              <Textarea
                id="invoice_footer"
                name="invoice_footer"
                defaultValue={profile?.invoice_footer || ''}
                placeholder="Thank you for your business!"
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                This text appears at the bottom of every invoice (can be overridden per invoice)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Email Templates */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Email Templates</CardTitle>
            <CardDescription>
              Templates for invoice and reminder emails. Use the placeholders below in subject and body.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoice_email_subject_default">Default Invoice Email Subject</Label>
              <Input
                id="invoice_email_subject_default"
                name="invoice_email_subject_default"
                defaultValue={profile?.invoice_email_subject_default ?? 'Invoice {{invoice_number}} from {{business_name}}'}
                placeholder="Invoice {{invoice_number}} from {{business_name}}"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="invoice_email_message_default">Default Invoice Email Body</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="h-8">
                      Insert placeholder <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {MERGE_TAGS.map(({ tag, label }) => (
                      <DropdownMenuItem
                        key={tag}
                        onSelect={() => {
                          const ta = document.getElementById('invoice_email_message_default') as HTMLTextAreaElement;
                          if (ta) {
                            const start = ta.selectionStart;
                            const end = ta.selectionEnd;
                            const v = ta.value;
                            ta.value = v.slice(0, start) + tag + v.slice(end);
                            ta.dispatchEvent(new Event('input', { bubbles: true }));
                          }
                        }}
                      >
                        {label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Textarea
                id="invoice_email_message_default"
                name="invoice_email_message_default"
                defaultValue={profile?.invoice_email_message_default || ''}
                placeholder="Hi {{client_name}}, please find attached invoice {{invoice_number}} for {{total}}. Due by {{due_date}}."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder_subject_default">Default Reminder Email Subject</Label>
              <Input
                id="reminder_subject_default"
                name="reminder_subject_default"
                defaultValue={profile?.reminder_subject_default ?? 'Reminder: Invoice {{invoice_number}} Due Soon'}
                placeholder="Reminder: Invoice {{invoice_number}} Due Soon"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="reminder_body_default">Default Reminder Email Body</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="h-8">
                      Insert placeholder <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {MERGE_TAGS.map(({ tag, label }) => (
                      <DropdownMenuItem key={tag} onSelect={() => {
                        const ta = document.getElementById('reminder_body_default') as HTMLTextAreaElement;
                        if (ta) { const s = ta.selectionStart, e = ta.selectionEnd, v = ta.value; ta.value = v.slice(0, s) + tag + v.slice(e); ta.dispatchEvent(new Event('input', { bubbles: true })); }
                      }}>{label}</DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Textarea
                id="reminder_body_default"
                name="reminder_body_default"
                defaultValue={profile?.reminder_body_default ?? `Hi {{client_name}},\nThis is a friendly reminder that invoice {{invoice_number}} for {{project_name}} is due on {{due_date}}.\nPlease let us know if you have any questions.`}
                placeholder="Reminder message..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Reminder Settings */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Reminder Settings</CardTitle>
            <CardDescription>Automated reminders based on due dates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="reminder_enabled">Enable Automatic Reminders</Label>
                <p className="text-sm text-muted-foreground">Send reminder emails before invoice due date</p>
              </div>
              <Switch
                id="reminder_enabled"
                checked={reminderEnabled}
                onCheckedChange={(v) => { setReminderEnabled(v); dirtyContext?.setDirty(true); }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder_days_before">Send Reminder (days before due date)</Label>
              <Input
                id="reminder_days_before"
                type="number"
                min={1}
                max={30}
                value={reminderDaysBefore}
                onChange={(e) => { setReminderDaysBefore(Math.max(1, parseInt(e.target.value, 10) || 1)); dirtyContext?.setDirty(true); }}
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

      {/* Tax Rates Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Tax Rates</CardTitle>
          <CardDescription>Configure your tax rates for invoices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new tax */}
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="new_tax_name">Tax Name</Label>
              <Input
                id="new_tax_name"
                value={newTaxName}
                onChange={(e) => setNewTaxName(e.target.value)}
                placeholder="e.g., VAT, Sales Tax"
              />
            </div>
            <div className="w-32 space-y-2">
              <Label htmlFor="new_tax_rate">Rate (%)</Label>
              <Input
                id="new_tax_rate"
                type="number"
                step="0.01"
                value={newTaxRate}
                onChange={(e) => setNewTaxRate(e.target.value)}
                placeholder="21"
              />
            </div>
            <Button onClick={addTax} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Tax list */}
          {taxes.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxes.map((tax) => (
                  <TableRow key={tax.id}>
                    <TableCell>
                      {editingTax?.id === tax.id ? (
                        <Input
                          value={editingTax.name}
                          onChange={(e) => setEditingTax({ ...editingTax, name: e.target.value })}
                          className="h-8"
                        />
                      ) : (
                        tax.name
                      )}
                    </TableCell>
                    <TableCell>
                      {editingTax?.id === tax.id ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={editingTax.rate}
                          onChange={(e) => setEditingTax({ ...editingTax, rate: parseFloat(e.target.value) })}
                          className="h-8 w-20"
                        />
                      ) : (
                        `${tax.rate}%`
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={tax.is_default}
                        onCheckedChange={() => setDefaultTax(tax.id)}
                        disabled={tax.is_default}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {editingTax?.id === tax.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateTax(editingTax)}
                            >
                              <Check className="h-4 w-4 text-success" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditingTax(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditingTax(tax)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteTax(tax.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {taxes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No tax rates configured. Add your first tax rate above.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
