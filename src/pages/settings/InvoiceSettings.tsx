import { useEffect, useMemo, useState, useRef } from 'react';
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
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { markStartGuideItemComplete, notifyStartGuideRefresh } from '@/components/layout/startGuideUtils';
import { Loader2, Plus, Trash2, Pencil, Check, X, ChevronDown } from '@/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  DataTableFrame,
} from '@/components/ui/table';
import { usePagination } from '@/hooks/usePagination';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { compareBooleans, compareNullableNumbers, compareStrings } from '@/lib/tableSort';
import { TablePagination } from '@/components/ui/table-pagination';
import {
  INVOICE_DUE_DAYS_PRESETS,
  INVOICE_NUMBER_FORMAT_PRESETS,
  INVOICE_NUMBER_FORMAT_TAGS,
  legacyInvoiceNumberFormat,
  matchInvoiceDueDaysPreset,
  matchInvoiceFormatPreset,
  previewInvoiceNumber,
  type InvoiceNumberReset,
} from '@/lib/invoiceNumbering';

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
  invoice_include_year: boolean | null;
  invoice_number_start: number | null;
  invoice_number_padding: number | null;
  invoice_number_reset_yearly: boolean | null;
  invoice_number_format: string | null;
  invoice_number_reset: string | null;
  invoice_number_next: number | null;
  invoice_due_days: number | null;
  invoice_notes_default: string | null;
  invoice_footer: string | null;
  invoice_bank_details_default: string | null;
  invoice_email_message_default: string | null;
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
  const { confirm, ConfirmDialogHost } = useConfirmDialog();
  const dirtyContext = useSettingsDirty();
  const [profile, setProfile] = useState<InvoiceProfile | null>(null);
  const [appCommsDefaults, setAppCommsDefaults] = useState<{
    invoice_footer: string | null;
    invoice_email_subject_default: string | null;
    invoice_email_message_default: string | null;
    reminder_subject_default: string | null;
    reminder_body_default: string | null;
  } | null>(null);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const taxSortComparators = useMemo(
    () => ({
      name: (a: Tax, b: Tax) => compareStrings(a.name, b.name),
      rate: (a: Tax, b: Tax) => compareNullableNumbers(a.rate, b.rate),
      default: (a: Tax, b: Tax) => compareBooleans(!!a.is_default, !!b.is_default),
    }),
    [],
  );
  const taxSort = useTableSort(taxes, taxSortComparators);
  const taxesPagination = usePagination(taxSort.sortedItems);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Tax form state
  const [newTaxName, setNewTaxName] = useState('');
  const [newTaxRate, setNewTaxRate] = useState('');
  const [editingTax, setEditingTax] = useState<Tax | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(1);
  const [invoicePrefix, setInvoicePrefix] = useState('INV');
  const [invoiceFormat, setInvoiceFormat] = useState(legacyInvoiceNumberFormat(true));
  const [invoiceFormatPreset, setInvoiceFormatPreset] = useState('inv_year_number');
  const [invoiceReset, setInvoiceReset] = useState<InvoiceNumberReset>('yearly');
  const [invoicePadding, setInvoicePadding] = useState(4);
  const [invoiceStart, setInvoiceStart] = useState(1);
  const [invoiceDueDays, setInvoiceDueDays] = useState(30);
  const [invoiceDuePreset, setInvoiceDuePreset] = useState('30');
  const [invoiceNextPreview, setInvoiceNextPreview] = useState(1);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchTaxes();
      (async () => {
        const { data } = await supabase.from('app_comms_defaults').select('invoice_footer, invoice_email_subject_default, invoice_email_message_default, reminder_subject_default, reminder_body_default').eq('id', 1).maybeSingle();
        setAppCommsDefaults(data ?? null);
      })();
    }
  }, [user]);

  const applyFormatPreset = (presetId: string) => {
    setInvoiceFormatPreset(presetId);
    if (presetId === 'custom') {
      dirtyContext?.setDirty(true);
      return;
    }
    const preset = INVOICE_NUMBER_FORMAT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setInvoiceFormat(preset.format);
    setInvoiceReset(preset.reset);
    setInvoicePadding(preset.padding);
    if (preset.prefix !== undefined && preset.prefix !== null) {
      setInvoicePrefix(preset.prefix);
    }
    dirtyContext?.setDirty(true);
  };

  const insertFormatTag = (tag: string) => {
    const input = document.getElementById('invoice_number_format') as HTMLInputElement | null;
    if (input) {
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      const next = input.value.slice(0, start) + tag + input.value.slice(end);
      setInvoiceFormat(next);
      setInvoiceFormatPreset('custom');
      dirtyContext?.setDirty(true);
      requestAnimationFrame(() => {
        input.focus();
        const pos = start + tag.length;
        input.setSelectionRange(pos, pos);
      });
      return;
    }
    setInvoiceFormat((prev) => prev + tag);
    setInvoiceFormatPreset('custom');
    dirtyContext?.setDirty(true);
  };

  const formatPreview = useMemo(
    () =>
      previewInvoiceNumber({
        format: invoiceFormat,
        prefix: invoicePrefix,
        padding: invoicePadding,
        nextNumber: invoiceNextPreview || invoiceStart,
      }),
    [invoiceFormat, invoicePrefix, invoicePadding, invoiceNextPreview, invoiceStart],
  );

  const save = async () => {
    if (!formRef.current || !user) return;
    const formData = new FormData(formRef.current);
    const startNum = Math.max(1, Math.floor(invoiceStart || 1));
    const padding = Math.min(6, Math.max(1, Math.floor(invoicePadding || 4)));
    const dueDays = Math.min(365, Math.max(0, Math.floor(invoiceDueDays || 0)));
    const formatValue = invoiceFormat.trim() || legacyInvoiceNumberFormat(true);
    const profileData = {
      hourly_rate: parseFloat(formData.get('hourly_rate') as string) || 0,
      invoice_prefix: invoicePrefix.trim(),
      invoice_include_year: formatValue.includes('{{year}}') || formatValue.includes('{{yy}}'),
      invoice_number_start: startNum,
      invoice_number_padding: padding,
      invoice_number_reset_yearly: invoiceReset === 'yearly',
      invoice_number_format: formatValue,
      invoice_number_reset: invoiceReset,
      invoice_due_days: dueDays,
      invoice_notes_default: formData.get('invoice_notes_default') as string || null,
      invoice_footer: formData.get('invoice_footer') as string || null,
      invoice_bank_details_default: formData.get('invoice_bank_details_default') as string || null,
      invoice_email_message_default: formData.get('invoice_email_message_default') as string || null,
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
    markStartGuideItemComplete(user.id, 'customizeInvoices');
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
    const withBankDefault = 'hourly_rate, invoice_prefix, invoice_include_year, invoice_number_start, invoice_number_padding, invoice_number_reset_yearly, invoice_number_format, invoice_number_reset, invoice_number_next, invoice_due_days, invoice_notes_default, invoice_footer, invoice_bank_details_default, invoice_email_message_default, invoice_email_subject_default, reminder_enabled, reminder_days_before, reminder_subject_default, reminder_body_default';
    const withoutBankDefault = 'hourly_rate, invoice_prefix, invoice_include_year, invoice_number_start, invoice_number_padding, invoice_number_reset_yearly, invoice_notes_default, invoice_footer, invoice_email_message_default, invoice_email_subject_default, reminder_enabled, reminder_days_before, reminder_subject_default, reminder_body_default';
    try {
      const { data: initialData, error } = await supabase
        .from('profiles')
        .select(withBankDefault)
        .eq('user_id', user!.id)
        .maybeSingle();
      let data = initialData;

      if (error) {
        const tryFallback = /column.*does not exist|invoice_bank_details_default|invoice_number_format|invoice_due_days|42703/i.test(String(error.message));
        if (tryFallback) {
          const fallback = await supabase
            .from('profiles')
            .select(withoutBankDefault)
            .eq('user_id', user!.id)
            .maybeSingle();
          if (!fallback.error) {
            data = fallback.data as typeof data;
          } else {
            throw fallback.error;
          }
        } else {
          throw error;
        }
      }
      setProfile(data);
      if (data) {
        setReminderEnabled(!!data.reminder_enabled);
        setReminderDaysBefore(data.reminder_days_before ?? 1);
        const prefix = data.invoice_prefix ?? 'INV';
        setInvoicePrefix(prefix);
        const format =
          (data as InvoiceProfile).invoice_number_format?.trim() ||
          legacyInvoiceNumberFormat(data.invoice_include_year !== false);
        setInvoiceFormat(format);
        setInvoiceFormatPreset(matchInvoiceFormatPreset((data as InvoiceProfile).invoice_number_format));
        const resetRaw = (data as InvoiceProfile).invoice_number_reset;
        const reset: InvoiceNumberReset =
          resetRaw === 'monthly' || resetRaw === 'never' || resetRaw === 'yearly'
            ? resetRaw
            : data.invoice_number_reset_yearly === false
              ? 'never'
              : 'yearly';
        setInvoiceReset(reset);
        setInvoicePadding(data.invoice_number_padding ?? 4);
        setInvoiceStart(data.invoice_number_start ?? 1);
        setInvoiceNextPreview((data as InvoiceProfile).invoice_number_next ?? data.invoice_number_start ?? 1);
        setInvoiceDueDays((data as InvoiceProfile).invoice_due_days ?? 30);
        setInvoiceDuePreset(matchInvoiceDueDaysPreset((data as InvoiceProfile).invoice_due_days ?? 30));
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
      markStartGuideItemComplete(user!.id, 'customizeInvoices');
      notifyStartGuideRefresh();
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
    const ok = await confirm({
      title: 'Delete tax rate?',
      description: 'Delete this tax rate?',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    
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
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Invoice Number</CardTitle>
            <CardDescription>
              Choose a common format or build your own with tags. Invoice numbers must be unique for your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Common formats</Label>
              <Select value={invoiceFormatPreset} onValueChange={applyFormatPreset}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a format" />
                </SelectTrigger>
                <SelectContent>
                  {INVOICE_NUMBER_FORMAT_PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      <span className="font-medium">{preset.label}</span>
                      <span className="text-muted-foreground"> — {preset.description}</span>
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom format…</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="invoice_number_format">Number format</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="h-8">
                      Insert tag <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {INVOICE_NUMBER_FORMAT_TAGS.map(({ tag, label }) => (
                      <DropdownMenuItem key={tag} onSelect={() => insertFormatTag(tag)}>
                        {label} <span className="ml-2 font-mono text-xs text-muted-foreground">{tag}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Input
                id="invoice_number_format"
                value={invoiceFormat}
                onChange={(e) => {
                  const next = e.target.value;
                  setInvoiceFormat(next);
                  const matched = INVOICE_NUMBER_FORMAT_PRESETS.find((p) => p.format === next.trim());
                  setInvoiceFormatPreset(matched?.id ?? 'custom');
                  if (matched) {
                    setInvoiceReset(matched.reset);
                  } else if (/\{\{\s*month\s*\}\}/i.test(next) && invoiceReset !== 'monthly') {
                    setInvoiceReset('monthly');
                  }
                  dirtyContext?.setDirty(true);
                }}
                placeholder="{{number}}/{{month}}/{{year}}"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Example preview: <span className="font-mono font-medium text-foreground">{formatPreview}</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice_prefix">Prefix</Label>
              <Input
                id="invoice_prefix"
                value={invoicePrefix}
                onChange={(e) => {
                  setInvoicePrefix(e.target.value);
                  dirtyContext?.setDirty(true);
                }}
                placeholder="INV (used by {{prefix}} tag)"
              />
              <p className="text-xs text-muted-foreground">Optional. Inserted wherever you use the {'{{prefix}}'} tag.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invoice_number_start">Starting number</Label>
                <Input
                  id="invoice_number_start"
                  type="number"
                  min={1}
                  value={invoiceStart}
                  onChange={(e) => {
                    setInvoiceStart(Math.max(1, Math.floor(Number(e.target.value) || 1)));
                    dirtyContext?.setDirty(true);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice_number_padding">Number padding</Label>
                <Input
                  id="invoice_number_padding"
                  type="number"
                  min={1}
                  max={6}
                  value={invoicePadding}
                  onChange={(e) => {
                    setInvoicePadding(Math.min(6, Math.max(1, Math.floor(Number(e.target.value) || 1))));
                    dirtyContext?.setDirty(true);
                  }}
                />
                <p className="text-xs text-muted-foreground">2 → 02, 4 → 0001</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>When does {'{{number}}'} reset?</Label>
                <Select
                  value={invoiceReset}
                  onValueChange={(v) => {
                    const next = v as InvoiceNumberReset;
                    setInvoiceReset(next);
                    if (next === 'monthly' && invoicePadding > 2) {
                      setInvoicePadding(2);
                    }
                    dirtyContext?.setDirty(true);
                  }}
                >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">
                    Every month — count restarts each month (e.g. 01/09/2026 after August)
                  </SelectItem>
                  <SelectItem value="yearly">
                    Every year — count restarts each January
                  </SelectItem>
                  <SelectItem value="never">
                    Never — keep counting across all invoices
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                For formats like 02/08/2026, choose <span className="font-medium text-foreground">Every month</span> so the first part is “invoice # within this month,” not your lifetime total.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Default due date</CardTitle>
            <CardDescription>
              Applied automatically when you create a new invoice (create dialog and client page).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Payment terms</Label>
              <Select
                value={invoiceDuePreset}
                onValueChange={(v) => {
                  setInvoiceDuePreset(v);
                  if (v !== 'custom') {
                    setInvoiceDueDays(Number(v));
                  }
                  dirtyContext?.setDirty(true);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose payment terms" />
                </SelectTrigger>
                <SelectContent>
                  {INVOICE_DUE_DAYS_PRESETS.map((preset) => (
                    <SelectItem key={preset.days} value={String(preset.days)}>
                      {preset.label} — {preset.description}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom number of days…</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {invoiceDuePreset === 'custom' ? (
              <div className="space-y-2">
                <Label htmlFor="invoice_due_days">Custom days after issue date</Label>
                <Input
                  id="invoice_due_days"
                  type="number"
                  min={0}
                  max={365}
                  value={invoiceDueDays}
                  onChange={(e) => {
                    const next = Math.min(365, Math.max(0, Math.floor(Number(e.target.value) || 0)));
                    setInvoiceDueDays(next);
                    setInvoiceDuePreset(matchInvoiceDueDaysPreset(next));
                    dirtyContext?.setDirty(true);
                  }}
                />
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Example: issue date today → due date{' '}
              <span className="font-medium text-foreground">
                {invoiceDueDays === 0 ? 'same day' : `${invoiceDueDays} day${invoiceDueDays === 1 ? '' : 's'} later`}
              </span>
              .
            </p>
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
                defaultValue={profile?.invoice_footer ?? appCommsDefaults?.invoice_footer ?? ''}
                placeholder={appCommsDefaults?.invoice_footer ?? 'Thank you for your business!'}
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                This text appears at the bottom of every invoice (can be overridden per invoice)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice_bank_details_default">Bank / Payment details</Label>
              <Textarea
                id="invoice_bank_details_default"
                name="invoice_bank_details_default"
                defaultValue={profile?.invoice_bank_details_default ?? ''}
                placeholder="Bank name, account number, routing number, payment instructions..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Pre-filled on new invoices and shown on the PDF (can be overridden per invoice)
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
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="invoice_email_subject_default">Default Invoice Email Subject</Label>
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
                        const input = document.getElementById('invoice_email_subject_default') as HTMLInputElement;
                        if (input) {
                          const start = input.selectionStart ?? input.value.length;
                          const end = input.selectionEnd ?? input.value.length;
                          const v = input.value;
                          input.value = v.slice(0, start) + tag + v.slice(end);
                          input.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                      }}
                    >
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Input
              id="invoice_email_subject_default"
              name="invoice_email_subject_default"
              defaultValue={profile?.invoice_email_subject_default ?? appCommsDefaults?.invoice_email_subject_default ?? 'Invoice {{invoice_number}} from {{business_name}}'}
              placeholder={appCommsDefaults?.invoice_email_subject_default ?? 'Invoice {{invoice_number}} from {{business_name}}'}
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
                defaultValue={profile?.invoice_email_message_default ?? appCommsDefaults?.invoice_email_message_default ?? ''}
                placeholder={appCommsDefaults?.invoice_email_message_default ?? 'Hi {{client_name}}, please find attached invoice {{invoice_number}} for {{total}}. Due by {{due_date}}.'}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="reminder_subject_default">Default Reminder Email Subject</Label>
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
                          const input = document.getElementById('reminder_subject_default') as HTMLInputElement;
                          if (input) {
                            const start = input.selectionStart ?? input.value.length;
                            const end = input.selectionEnd ?? input.value.length;
                            const v = input.value;
                            input.value = v.slice(0, start) + tag + v.slice(end);
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                          }
                        }}
                      >
                        {label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Input
                id="reminder_subject_default"
                name="reminder_subject_default"
                defaultValue={profile?.reminder_subject_default ?? appCommsDefaults?.reminder_subject_default ?? 'Reminder: Invoice {{invoice_number}} Due Soon'}
                placeholder={appCommsDefaults?.reminder_subject_default ?? 'Reminder: Invoice {{invoice_number}} Due Soon'}
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
                defaultValue={profile?.reminder_body_default ?? appCommsDefaults?.reminder_body_default ?? `Hi {{client_name}},\nThis is a friendly reminder that invoice {{invoice_number}} for {{project_name}} is due on {{due_date}}.\nPlease let us know if you have any questions.`}
                placeholder={appCommsDefaults?.reminder_body_default ?? 'Reminder message...'}
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
            <DataTableFrame>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <SortableTableHead label="Name" sortKey="name" sort={taxSort} />
                  <SortableTableHead label="Rate" sortKey="rate" sort={taxSort} />
                  <SortableTableHead label="Default" sortKey="default" sort={taxSort} />
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxesPagination.paginatedItems.map((tax) => (
                  <TableRow key={tax.id}>
                    <TableCell>
                      {editingTax?.id === tax.id ? (
                        <Input
                          value={editingTax.name}
                          onChange={(e) => setEditingTax({ ...editingTax, name: e.target.value })}
                          className="h-8"
                        />
                      ) : (
                        <span className="font-semibold">{tax.name}</span>
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
            <TablePagination
              total={taxesPagination.total}
              page={taxesPagination.page}
              pageSize={taxesPagination.pageSize}
              from={taxesPagination.from}
              to={taxesPagination.to}
              pageSizeOptions={taxesPagination.pageSizeOptions}
              showPageSizeSelect={taxesPagination.showPageSizeSelect}
              onPageChange={taxesPagination.setPage}
              onPageSizeChange={taxesPagination.setPageSize}
            />
            </DataTableFrame>
          )}

          {taxes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No tax rates configured. Add your first tax rate above.
            </p>
          )}
        </CardContent>
      </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
      {ConfirmDialogHost}
    </div>
  );
}
