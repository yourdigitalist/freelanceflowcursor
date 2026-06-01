import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useAuth } from '@/lib/auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageSearchInput } from '@/components/ui/page-search-input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Loader2, ListTodo, Wallet, Download, Save, RotateCcw } from '@/components/icons';
import { PageBreadcrumb } from '@/components/layout/PageBreadcrumb';
import { detailPageBreadcrumb } from '@/lib/breadcrumbs';
import { MenuDotsTrigger } from '@/components/ui/menu-dots-trigger';
import { reopenPaidInvoice } from '@/lib/invoiceStatus';
import {
  buildReceiptEmailMessage,
  formatInvoicePaymentMethod,
  markInvoicePaid,
  type MarkInvoicePaidInput,
} from '@/lib/invoicePayment';
import { MarkInvoicePaidDialog } from '@/components/invoices/MarkInvoicePaidDialog';
import { SendReceiptPromptDialog } from '@/components/invoices/SendReceiptPromptDialog';
import { useLocalePreferences } from '@/hooks/useLocalePreferences';
import { formatLocaleDate } from '@/lib/datetime';
import { formatStatusLabel, getStatusBadgeClass } from '@/lib/statusDisplay';
import { SlotIcon } from '@/contexts/IconSlotContext';
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { formatCurrency, currencies } from '@/lib/locale-data';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface InvoiceItem {
  id: string;
  description: string;
  line_description?: string | null;
  line_date?: string | null;
  quantity: number;
  unit_price: number;
  amount: number;
  time_entry_id?: string;
}

interface InvoiceTimeEntryLink {
  time_entry_id: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  paid_date?: string | null;
  payment_method?: string | null;
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  invoice_footer: string | null;
  bank_details: string | null;
  client_id: string | null;
  project_id: string | null;
  clients: { 
    name: string; 
    email: string | null; 
    phone: string | null;
    company: string | null;
    tax_id: string | null;
    street: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
    currency?: string | null;
  } | null;
  projects?: { name: string; hourly_rate: number | null; budget: number | null } | null;
}

interface UserProfile {
  full_name: string | null;
  email: string | null;
  company_name: string | null;
  business_name: string | null;
  business_logo: string | null;
  business_email: string | null;
  business_phone: string | null;
  business_address: string | null;
  business_street?: string | null;
  business_street2?: string | null;
  business_city?: string | null;
  business_state?: string | null;
  business_postal_code?: string | null;
  business_country?: string | null;
  tax_id: string | null;
  currency: string | null;
  currency_display: string | null;
  number_format: string | null;
  invoice_show_quantity: boolean | null;
  invoice_show_rate: boolean | null;
  invoice_show_line_date: boolean | null;
  invoice_footer: string | null;
  invoice_bank_details_default: string | null;
  invoice_notes_default: string | null;
  invoice_email_message_default: string | null;
  invoice_email_subject_default: string | null;
  reminder_enabled: boolean | null;
  reminder_subject_default: string | null;
  reminder_body_default: string | null;
}

const EMAIL_MERGE_TAGS = [
  { tag: '{{client_name}}', label: 'Client Name' },
  { tag: '{{invoice_number}}', label: 'Invoice Number' },
  { tag: '{{total}}', label: 'Total' },
  { tag: '{{due_date}}', label: 'Due Date' },
  { tag: '{{business_name}}', label: 'Business Name' },
  { tag: '{{project_name}}', label: 'Project Name' },
];

// Exact styles from CustomJS HTML template so preview matches PDF/email
const INVOICE_PREVIEW_STYLES = `
  @media print { body { width: 210mm; height: 297mm; margin: 0; padding: 0; font-size: 10pt; } }
  .invoice-preview-root * { margin: 0; padding: 0; box-sizing: border-box; }
  .invoice-preview-root { padding: 30px; min-height: 100vh; font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-font-smoothing: antialiased; font-size: 13px; line-height: 1.5; }
  .invoice-preview-root .wrapper-invoice { display: flex; justify-content: center; }
  .invoice-preview-root .wrapper-invoice .invoice { height: auto; background: #fff; max-width: 800px; width: 100%; }
  .invoice-preview-root .invoice-information { float: right; text-align: right; width: auto; }
  .invoice-preview-root .invoice-information b { color: #0F172A; font-weight: 600; }
  .invoice-preview-root .invoice-information p { font-size: 13px; color: #666; margin-bottom: 4px; }
  .invoice-preview-root .invoice-logo-brand h2 { text-transform: uppercase; font-size: 24px; color: #0F172A; }
  .invoice-preview-root .invoice-logo-brand img { max-width: 180px; width: 100%; height: auto; display: block; margin-bottom: 12px; }
  .invoice-preview-root .invoice-head { display: flex; margin-top: 50px; clear: both; gap: 40px; }
  .invoice-preview-root .invoice-head .head { flex: 1; }
  .invoice-preview-root .invoice-head .client-info { text-align: left; }
  .invoice-preview-root .invoice-head .client-info h2, .invoice-preview-root .invoice-head .client-data h2 { font-weight: 600; font-size: 11px; color: #999; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; }
  .invoice-preview-root .invoice-head .client-info p, .invoice-preview-root .invoice-head .client-data p { font-size: 13px; color: #666; margin-bottom: 3px; }
  .invoice-preview-root .invoice-head .client-info p strong, .invoice-preview-root .invoice-head .client-data p strong { color: #0F172A; font-weight: 600; }
  .invoice-preview-root .invoice-head .client-info .receiver-tax { margin-top: 8px; }
  .invoice-preview-root .invoice-head .client-data { text-align: right; }
  .invoice-preview-root .invoice-body { margin-top: 40px; }
  .invoice-preview-root .invoice-body .table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  .invoice-preview-root .invoice-body .table thead tr th { font-size: 11px; border: 1px solid #dcdcdc; text-align: left; padding: 10px 8px; background-color: #f5f5f5; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
  .invoice-preview-root .invoice-body .table thead tr th.col-date { width: 12%; }
  .invoice-preview-root .invoice-body .table thead tr th.col-description { width: 44%; }
  .invoice-preview-root .invoice-body .table thead tr th.col-qty { width: 8%; text-align: right; }
  .invoice-preview-root .invoice-body .table thead tr th.col-rate { width: 16%; text-align: right; }
  .invoice-preview-root .invoice-body .table thead tr th.col-amount { width: 20%; text-align: right; }
  .invoice-preview-root .invoice-body .table tbody tr td { font-size: 13px; border: 1px solid #e5e5e5; text-align: left; padding: 10px 8px; background-color: #fff; word-wrap: break-word; color: #333; }
  .invoice-preview-root .invoice-body .table tbody tr td.text-right { text-align: right; }
  .invoice-preview-root .invoice-body .table tr { break-inside: avoid; page-break-inside: avoid; }
  .invoice-preview-root .invoice-body .table td, .invoice-preview-root .invoice-body .table th { break-inside: avoid; page-break-inside: avoid; }
  .invoice-preview-root .invoice-body .table tbody tr td small { font-size: 11px; color: #888; display: block; margin-top: 3px; }
  .invoice-preview-root .invoice-body .flex-table { display: flex; margin-top: 20px; }
  .invoice-preview-root .invoice-body .flex-table .flex-column { width: 100%; }
  .invoice-preview-root .invoice-body .flex-table .flex-column .table-subtotal { border-collapse: collapse; width: 100%; max-width: 350px; margin-left: auto; }
  .invoice-preview-root .invoice-body .flex-table .flex-column .table-subtotal tbody tr td { font-size: 13px; border-bottom: 1px solid #e5e5e5; text-align: left; padding: 8px 12px; background-color: #fff; }
  .invoice-preview-root .invoice-body .flex-table .flex-column .table-subtotal tbody tr td:nth-child(2) { text-align: right; font-weight: 500; }
  .invoice-preview-root .invoice-body .invoice-total-amount { margin-top: 12px; text-align: right; }
  .invoice-preview-root .invoice-body .invoice-total-amount p { font-weight: 700; color: #0F172A; font-size: 18px; }
  .invoice-preview-root .paid-badge { display: inline-block; margin-left: 8px; padding: 3px 10px; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; color: #fff; background: #10B981; border-radius: 4px; vertical-align: middle; }
  .invoice-preview-root .invoice-information .paid-on { color: #10B981; font-weight: 600; }
  .invoice-preview-root .invoice-information .payment-method { color: #666; font-size: 13px; margin-top: 2px; }
  .invoice-preview-root .invoice-body .balance-due-paid { margin-top: 8px; font-size: 15px; font-weight: 700; color: #10B981; }
  .invoice-preview-root .invoice-body .amount-paid-line { margin-top: 6px; font-size: 13px; font-weight: 500; color: #666; }
  .invoice-preview-root .invoice-notes, .invoice-preview-root .invoice-bank-details { margin-top: 30px; padding: 16px; background-color: #f8f9fa; border-left: 3px solid #0F172A; }
  .invoice-preview-root .invoice-notes h3, .invoice-preview-root .invoice-bank-details h3 { font-size: 13px; color: #0F172A; margin-bottom: 8px; font-weight: 600; }
  .invoice-preview-root .invoice-notes p, .invoice-preview-root .invoice-bank-details p { font-size: 13px; color: #555; line-height: 1.6; white-space: pre-wrap; }
  .invoice-preview-root .invoice-footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #dcdcdc; }
  .invoice-preview-root .invoice-footer p { font-size: 12px; color: #888; text-align: center; line-height: 1.6; }
  @media print {
    @page { size: A4; margin: 12mm 10mm; }
    .invoice-preview-root { padding: 0; min-height: auto; }
    .invoice-preview-root .table thead tr th { -webkit-print-color-adjust: exact; background-color: #f5f5f5 !important; }
    .invoice-preview-root .invoice-notes, .invoice-preview-root .invoice-bank-details, .invoice-preview-root .invoice-footer, .invoice-preview-root .flex-table { break-inside: avoid; page-break-inside: avoid; }
  }
`;

interface Tax {
  id: string;
  name: string;
  rate: number;
  is_default: boolean;
}

interface ImportTimeEntry {
  id: string;
  description: string | null;
  duration_minutes: number;
  total_duration_seconds: number | null;
  hourly_rate: number | null;
  billable: boolean;
  billing_status: string | null;
  invoice_id?: string | null;
  project_id: string;
  project_name: string;
  task_id?: string | null;
  task_name?: string | null;
  start_time: string;
  linkedOnThisInvoice?: boolean;
}

const DEFAULT_INVOICE_EMAIL_SUBJECT = 'Invoice {{invoice_number}} from {{business_name}}';
const DEFAULT_INVOICE_EMAIL_MESSAGE =
  'Hi {{client_name}}, please find attached invoice {{invoice_number}} for {{total}}. Due by {{due_date}}.';
const DEFAULT_REMINDER_SUBJECT = 'Reminder: Invoice {{invoice_number}} Due Soon';
const DEFAULT_REMINDER_BODY =
  'Hi {{client_name}}, this is a reminder that invoice {{invoice_number}} is due on {{due_date}}.';

const pickEmailTemplate = (...candidates: (string | null | undefined)[]) => {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) return trimmed;
  }
  return '';
};

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { dateFormat } = useLocalePreferences();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTaxId, setSelectedTaxId] = useState<string>('');
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [notes, setNotes] = useState('');
  const [invoiceFooter, setInvoiceFooter] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [invoiceNumberEdit, setInvoiceNumberEdit] = useState('');
  const [issueDateEdit, setIssueDateEdit] = useState('');
  const [dueDateEdit, setDueDateEdit] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [appCommsDefaults, setAppCommsDefaults] = useState<{
    invoice_email_subject_default: string | null;
    invoice_email_message_default: string | null;
    reminder_subject_default: string | null;
    reminder_body_default: string | null;
  } | null>(null);
  
  // Send invoice modal state
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [sendModalMode, setSendModalMode] = useState<'send' | 'reminder' | 'receipt'>('send');
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  
  // Preview modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);
  const [sendReceiptPromptOpen, setSendReceiptPromptOpen] = useState(false);

  // Edit mode: draft starts editable; after save or when sent/paid, read-only until "Edit Invoice" is clicked
  const [isEditMode, setIsEditMode] = useState(true);
  
  // Import time entries modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importEntries, setImportEntries] = useState<ImportTimeEntry[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [defaultHourlyRate, setDefaultHourlyRate] = useState(75);
  const [importStatusFilter, setImportStatusFilter] = useState<'unbilled' | 'billed' | 'paid' | 'all'>('unbilled');
  const [importBillableFilter, setImportBillableFilter] = useState<'billable' | 'non_billable' | 'all'>('billable');
  const [importProjectFilter, setImportProjectFilter] = useState<string>('all');
  const [importSearch, setImportSearch] = useState('');
  const [importFromDate, setImportFromDate] = useState<string>(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [importToDate, setImportToDate] = useState<string>(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [importGrouping, setImportGrouping] = useState<'grouped' | 'detailed'>('grouped');
  const [importIncludeNotes, setImportIncludeNotes] = useState(false);
  const [importIncludeLineDate, setImportIncludeLineDate] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [unlinkingImports, setUnlinkingImports] = useState(false);
  const [clientProjectsForImport, setClientProjectsForImport] = useState<Array<{ id: string; name: string }>>([]);
  const preloadedDefaultsRef = useRef<string | null>(null);
  const sendModalDefaultsAppliedRef = useRef(false);
  const importFetchSkipRef = useRef(true);

  const getDefaultImportFilters = useCallback(
    () => ({
      status: 'unbilled' as const,
      billable: 'billable' as const,
      project: 'all',
      search: '',
      from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
      grouping: 'grouped' as const,
    }),
    [],
  );

  const resetImportFilters = useCallback(() => {
    const defaults = getDefaultImportFilters();
    setImportStatusFilter(defaults.status);
    setImportBillableFilter(defaults.billable);
    setImportProjectFilter(defaults.project);
    setImportSearch(defaults.search);
    setImportFromDate(defaults.from);
    setImportToDate(defaults.to);
    setImportGrouping(defaults.grouping);
  }, [getDefaultImportFilters]);

  /** Keeps invoice↔time links aligned after line deletes or legacy imports. */
  const syncInvoiceTimeEntryLinks = useCallback(async (invoiceId: string) => {
    const { data: items } = await supabase.from('invoice_items').select('id').eq('invoice_id', invoiceId);
    const validItemIds = new Set((items ?? []).map((row) => row.id));

    const { data: allLinks } = await supabase
      .from('invoice_time_entry_links')
      .select('id, time_entry_id, invoice_item_id')
      .eq('invoice_id', invoiceId);

    const staleLinkEntryIds = new Set<string>();
    for (const link of allLinks ?? []) {
      const brokenItem =
        link.invoice_item_id != null && !validItemIds.has(link.invoice_item_id);
      const legacyOrphan = link.invoice_item_id == null;
      if (brokenItem || legacyOrphan) {
        staleLinkEntryIds.add(link.time_entry_id);
      }
    }

    if (staleLinkEntryIds.size > 0) {
      await supabase
        .from('invoice_time_entry_links')
        .delete()
        .eq('invoice_id', invoiceId)
        .in('time_entry_id', Array.from(staleLinkEntryIds));
      await supabase
        .from('time_entries')
        .update({ billing_status: 'unbilled', invoice_id: null })
        .in('id', Array.from(staleLinkEntryIds))
        .neq('billing_status', 'paid');
    }

    const { data: freshLinks } = await supabase
      .from('invoice_time_entry_links')
      .select('time_entry_id')
      .eq('invoice_id', invoiceId);
    const linkedIds = new Set((freshLinks ?? []).map((row) => row.time_entry_id));

    const { data: attachedEntries } = await supabase
      .from('time_entries')
      .select('id')
      .eq('invoice_id', invoiceId);
    const orphanedEntryIds = (attachedEntries ?? [])
      .map((row) => row.id)
      .filter((entryId) => !linkedIds.has(entryId));

    if (orphanedEntryIds.length > 0) {
      await supabase
        .from('time_entries')
        .update({ billing_status: 'unbilled', invoice_id: null })
        .in('id', orphanedEntryIds)
        .neq('billing_status', 'paid');
    }
  }, []);

  useEffect(() => {
    if (user && id) {
      fetchInvoice();
      fetchItems();
      fetchProfile();
      (async () => {
        const { data } = await supabase
          .from('app_comms_defaults')
          .select('invoice_email_subject_default, invoice_email_message_default, reminder_subject_default, reminder_body_default')
          .eq('id', 1)
          .maybeSingle();
        setAppCommsDefaults(data ?? null);
      })();
      fetchTaxes();
    }
  }, [user, id]);

  useEffect(() => {
    if (!invoice || taxes.length === 0) return;
    const matchingTax = taxes.find((tax) => Number(tax.rate) === Number(invoice.tax_rate));
    setSelectedTaxId(matchingTax?.id ?? '');
  }, [invoice?.id, invoice?.tax_rate, taxes]);

  // When invoice is sent or paid, switch to read-only (user must click "Edit Invoice" to change)
  useEffect(() => {
    if (invoice && (invoice.status === 'sent' || invoice.status === 'paid')) {
      setIsEditMode(false);
    }
  }, [invoice?.id, invoice?.status]);

  // Preload notes and footer from profile when invoice has none (e.g. newly created)
  useEffect(() => {
    if (id) preloadedDefaultsRef.current = null;
  }, [id]);
  useEffect(() => {
    if (!invoice || !profile || preloadedDefaultsRef.current === invoice.id) return;
    if (invoice.notes == null || invoice.notes === '') {
      setNotes(profile.invoice_notes_default || '');
    }
    if ((invoice as Invoice).invoice_footer == null || (invoice as Invoice).invoice_footer === '') {
      setInvoiceFooter(profile.invoice_footer || '');
    }
    if ((invoice as Invoice).bank_details == null || (invoice as Invoice).bank_details === '') {
      setBankDetails(profile?.invoice_bank_details_default ?? '');
    }
    preloadedDefaultsRef.current = invoice.id;
  }, [invoice?.id, invoice?.notes, (invoice as Invoice)?.invoice_footer, (invoice as Invoice)?.bank_details, profile?.invoice_notes_default, profile?.invoice_footer, profile?.invoice_bank_details_default]);

  const fetchProfile = async () => {
    const columnsWithBankDefault = 'full_name, email, company_name, business_name, business_logo, business_email, business_phone, business_address, business_street, business_street2, business_city, business_state, business_postal_code, business_country, tax_id, currency, currency_display, invoice_show_quantity, invoice_show_rate, invoice_show_line_description, invoice_show_line_date, invoice_footer, invoice_bank_details_default, invoice_notes_default, invoice_email_message_default, invoice_email_subject_default, reminder_enabled, reminder_subject_default, reminder_body_default, hourly_rate';
    const columnsWithoutBankDefault = 'full_name, email, company_name, business_name, business_logo, business_email, business_phone, business_address, business_street, business_street2, business_city, business_state, business_postal_code, business_country, tax_id, currency, currency_display, invoice_show_quantity, invoice_show_rate, invoice_show_line_description, invoice_show_line_date, invoice_footer, invoice_notes_default, invoice_email_message_default, invoice_email_subject_default, reminder_enabled, reminder_subject_default, reminder_body_default, hourly_rate';
    try {
      const { data: initialData, error } = await supabase
        .from('profiles')
        .select(columnsWithBankDefault)
        .eq('user_id', user!.id)
        .maybeSingle();
      let data = initialData;
      if (error) {
        const tryFallback = /column.*does not exist|invoice_bank_details_default|42703/i.test(String(error.message));
        if (tryFallback) {
          const fallback = await supabase
            .from('profiles')
            .select(columnsWithoutBankDefault)
            .eq('user_id', user!.id)
            .maybeSingle();
          if (fallback.error) {
            console.error('Error fetching profile:', fallback.error);
            toast({ title: 'Could not load business details', description: 'Showing placeholder. You can still edit the invoice.', variant: 'destructive' });
            return;
          }
          data = fallback.data;
        } else {
          console.error('Error fetching profile:', error);
          toast({ title: 'Could not load business details', description: 'Showing placeholder. You can still edit the invoice.', variant: 'destructive' });
          return;
        }
      }
      if (data) {
        setProfile(data);
        setDefaultHourlyRate((data as { hourly_rate?: number }).hourly_rate || 75);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      toast({ title: 'Could not load business details', variant: 'destructive' });
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
      
      // Set default tax
      const defaultTax = data?.find(t => t.is_default);
      if (defaultTax) {
        setSelectedTaxId(defaultTax.id);
      }
    } catch (error) {
      console.error('Error fetching taxes:', error);
    }
  };

  const fetchInvoice = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          clients(name, email, phone, company, tax_id, street, city, state, postal_code, country, currency),
          projects(name, hourly_rate, budget)
        `)
        .eq('id', id)
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        navigate('/invoices');
        return;
      }
      setInvoice(data);
      setInvoiceNumberEdit(data.invoice_number || '');
      setIssueDateEdit(data.issue_date ? data.issue_date.slice(0, 10) : '');
      setDueDateEdit(data.due_date ? data.due_date.slice(0, 10) : '');
      setNotes(data.notes || '');
      setInvoiceFooter((data as Invoice).invoice_footer ?? '');
      setBankDetails((data as Invoice).bank_details ?? '');
      // Pre-fill recipient email from client
      if (data.clients?.email) {
        setRecipientEmail(data.clients.email);
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id)
        .order('created_at');

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyImportPreset = (preset: 'this_week' | 'this_month' | 'last_month' | 'all_time') => {
    if (preset === 'all_time') {
      setImportFromDate('');
      setImportToDate('');
      return;
    }
    if (preset === 'this_week') {
      setImportFromDate(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
      setImportToDate(format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
      return;
    }
    if (preset === 'last_month') {
      const base = subMonths(new Date(), 1);
      setImportFromDate(format(startOfMonth(base), 'yyyy-MM-dd'));
      setImportToDate(format(endOfMonth(base), 'yyyy-MM-dd'));
      return;
    }
    setImportFromDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    setImportToDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  };

  const fetchImportEntries = async (options?: { preserveSelection?: boolean }) => {
    if (!invoice?.client_id) {
      toast({
        title: 'No client selected',
        description: 'Please assign a client to this invoice first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setImportLoading(true);
      if (id) await syncInvoiceTimeEntryLinks(id);
      // Get projects for this client
      const { data: clientProjects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name')
        .eq('client_id', invoice.client_id);

      if (projectsError) throw projectsError;
      
      if (!clientProjects || clientProjects.length === 0) {
        toast({
          title: 'No projects found',
          description: 'This client has no projects with time entries',
        });
        return;
      }

      const projectIds = clientProjects.map(p => p.id);
      setClientProjectsForImport(clientProjects);
      const projectMap = Object.fromEntries(clientProjects.map(p => [p.id, p.name]));
      const scopedProjectIds = importProjectFilter === 'all' ? projectIds : projectIds.filter((id) => id === importProjectFilter);
      if (scopedProjectIds.length === 0) {
        setImportEntries([]);
        setSelectedEntries(new Set());
        setIsImportModalOpen(true);
        return;
      }

      // Fetch time entries for import and filter in memory for flexible UX.
      const { data: entries, error: entriesError } = await supabase
        .from('time_entries')
        .select('id, description, duration_minutes, total_duration_seconds, hourly_rate, billable, billing_status, invoice_id, project_id, task_id, start_time, tasks(title)')
        .in('project_id', scopedProjectIds)
        .order('project_id')
        .order('start_time');

      if (entriesError) throw entriesError;

      const { data: existingLinks } = await supabase
        .from('invoice_time_entry_links')
        .select('time_entry_id')
        .eq('invoice_id', id);
      const linkedOnInvoice = new Set((existingLinks || []).map((row) => row.time_entry_id));

      const entriesWithProjects = ((entries || []) as Array<ImportTimeEntry & { tasks?: { title: string } | null }>).map((e) => ({
        ...e,
        project_name: projectMap[e.project_id!] || 'Unknown',
        task_name: e.tasks?.title || null,
        linkedOnThisInvoice: linkedOnInvoice.has(e.id) && e.invoice_id === id,
      }));
      const filtered = entriesWithProjects.filter((entry) => {
        const date = format(new Date(entry.start_time), 'yyyy-MM-dd');
        if (importFromDate && date < importFromDate) return false;
        if (importToDate && date > importToDate) return false;
        const status = entry.billing_status || 'unbilled';
        if (importStatusFilter !== 'all' && status !== importStatusFilter) {
          const onThisInvoice = entry.invoice_id === id || entry.linkedOnThisInvoice;
          if (!onThisInvoice) return false;
        }
        if (importBillableFilter === 'billable' && !entry.billable) return false;
        if (importBillableFilter === 'non_billable' && entry.billable) return false;
        if (importSearch.trim()) {
          const q = importSearch.toLowerCase();
          const hay = `${entry.project_name} ${entry.task_name || ''} ${entry.description || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      setImportEntries(filtered);
      if (profile) {
        setImportIncludeNotes(profile.invoice_show_line_description ?? true);
        setImportIncludeLineDate(profile.invoice_show_line_date ?? false);
      }
      const isEligible = (e: ImportTimeEntry) =>
        e.billable && (e.billing_status || 'unbilled') === 'unbilled' && !e.linkedOnThisInvoice;

      if (options?.preserveSelection) {
        setSelectedEntries((prev) => {
          const next = new Set<string>();
          for (const entryId of prev) {
            const entry = filtered.find((e) => e.id === entryId);
            if (entry && isEligible(entry)) next.add(entryId);
          }
          return next;
        });
      } else {
        setSelectedEntries(new Set(filtered.filter(isEligible).map((e) => e.id)));
      }
      setIsImportModalOpen(true);
    } catch (error: any) {
      toast({
        title: 'Error fetching time entries',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setImportLoading(false);
    }
  };

  const importSelectedEntries = async () => {
    const selectedIds = Array.from(selectedEntries);
    const entriesToImport = importEntries.filter(e => selectedEntries.has(e.id));
    
    if (entriesToImport.length === 0) {
      toast({
        title: 'No entries selected',
        description: 'Please select at least one time entry to import',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: existingLinks } = await supabase
        .from('invoice_time_entry_links')
        .select('time_entry_id')
        .eq('invoice_id', id)
        .in('time_entry_id', selectedIds);

      const linkedIds = new Set((existingLinks as InvoiceTimeEntryLink[] | null)?.map((row) => row.time_entry_id) ?? []);
      const dedupedEntries = entriesToImport.filter((entry) => !linkedIds.has(entry.id));
      if (dedupedEntries.length === 0) {
        toast({
          title: 'No new entries to import',
          description: 'Selected entries are already linked to this invoice.',
        });
        return;
      }

      const { data: freshEligibleEntries, error: eligibilityError } = await supabase
        .from('time_entries')
        .select('id, billing_status, invoice_id')
        .in('id', dedupedEntries.map((entry) => entry.id))
        .eq('billable', true);
      if (eligibilityError) throw eligibilityError;

      const eligibleIds = new Set(
        (freshEligibleEntries ?? [])
          .filter(
            (entry) =>
              entry.billing_status === 'unbilled' &&
              (entry.invoice_id == null || entry.invoice_id === id),
          )
          .map((entry) => entry.id),
      );
      const finalEntries = dedupedEntries.filter((entry) => eligibleIds.has(entry.id));
      const skippedCount = dedupedEntries.length - finalEntries.length;
      if (finalEntries.length === 0) {
        toast({
          title: 'No eligible entries',
          description: 'The selected entries were already billed or linked to another invoice.',
          variant: 'destructive',
        });
        return;
      }

      type ImportLinePayload = {
        invoice_id: string | undefined;
        description: string;
        line_description?: string;
        line_date?: string;
        quantity: number;
        unit_price: number;
        amount: number;
        entryIds: string[];
      };
      const newItems: ImportLinePayload[] = [];
      let missingRateCount = 0;
      if (importGrouping === 'detailed') {
        for (const entry of finalEntries) {
          const hours = entry.total_duration_seconds != null ? entry.total_duration_seconds / 3600 : entry.duration_minutes / 60;
          const rate = entry.hourly_rate ?? defaultHourlyRate;
          if (entry.hourly_rate == null) missingRateCount += 1;
          const itemTitle = `${entry.project_name}${entry.task_name ? ` • ${entry.task_name}` : ''}`;
          newItems.push({
            invoice_id: id,
            description: itemTitle,
            line_description: importIncludeNotes ? (entry.description || '') : '',
            line_date: importIncludeLineDate ? format(new Date(entry.start_time), 'yyyy-MM-dd') : undefined,
            quantity: parseFloat(hours.toFixed(2)),
            unit_price: rate,
            amount: parseFloat((hours * rate).toFixed(2)),
            entryIds: [entry.id],
          });
        }
      } else {
        const grouped = new Map<
          string,
          {
            projectName: string;
            taskName: string | null;
            rate: number;
            hours: number;
            notes: string[];
            minDate: string;
            maxDate: string;
            entryIds: string[];
          }
        >();
        for (const entry of finalEntries) {
          const hours = entry.total_duration_seconds != null ? entry.total_duration_seconds / 3600 : entry.duration_minutes / 60;
          const rate = entry.hourly_rate ?? defaultHourlyRate;
          if (entry.hourly_rate == null) missingRateCount += 1;
          const key = `${entry.project_id}__${entry.task_id || 'none'}__${rate}`;
          const date = format(new Date(entry.start_time), 'yyyy-MM-dd');
          const current = grouped.get(key);
          const notes = entry.description?.trim() ? [entry.description.trim()] : [];
          if (!current) {
            grouped.set(key, {
              projectName: entry.project_name,
              taskName: entry.task_name || null,
              rate,
              hours,
              notes,
              minDate: date,
              maxDate: date,
              entryIds: [entry.id],
            });
          } else {
            current.hours += hours;
            current.minDate = current.minDate < date ? current.minDate : date;
            current.maxDate = current.maxDate > date ? current.maxDate : date;
            if (notes.length) current.notes.push(...notes);
            current.entryIds.push(entry.id);
          }
        }
        grouped.forEach((group) => {
          const uniqueNotes = Array.from(new Set(group.notes));
          const notesSummary =
            uniqueNotes.length === 0
              ? ''
              : uniqueNotes.length === 1
                ? uniqueNotes[0]
                : `${uniqueNotes[0]}${uniqueNotes.length > 1 ? ` (+${uniqueNotes.length - 1} more notes)` : ''}`;
          newItems.push({
            invoice_id: id,
            description: `${group.projectName}${group.taskName ? ` • ${group.taskName}` : ''}`,
            line_description: importIncludeNotes ? notesSummary : '',
            line_date: importIncludeLineDate
              ? (group.minDate === group.maxDate ? group.minDate : group.maxDate)
              : undefined,
            quantity: parseFloat(group.hours.toFixed(2)),
            unit_price: group.rate,
            amount: parseFloat((group.hours * group.rate).toFixed(2)),
            entryIds: group.entryIds,
          });
        });
      }

      const { data: insertedItems, error: insertError } = await supabase
        .from('invoice_items')
        .insert(
          newItems.map(({ entryIds: _entryIds, ...item }) => item),
        )
        .select('id');

      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('time_entries')
        .update({ invoice_id: id })
        .in('id', finalEntries.map((entry) => entry.id))
        .eq('billing_status', 'unbilled');

      if (updateError) throw updateError;

      const linkRows = newItems.flatMap((item, index) => {
        const itemId = insertedItems?.[index]?.id;
        if (!itemId) return [];
        return item.entryIds.map((timeEntryId) => ({
          invoice_id: id,
          invoice_item_id: itemId,
          time_entry_id: timeEntryId,
        }));
      });
      const { error: linkError } = await supabase.from('invoice_time_entry_links').insert(linkRows);
      if (linkError) throw linkError;

      const suffix = missingRateCount > 0 ? ` (${missingRateCount} entries used default rate)` : '';
      const skipSuffix = skippedCount > 0 ? `, ${skippedCount} skipped` : '';
      const importParts = [`${finalEntries.length} entries imported`];
      if (skippedCount > 0) importParts.push(`${skippedCount} skipped`);
      if (missingRateCount > 0) importParts.push(`${missingRateCount} used default rate`);
      toast({
        title: importParts.join(' · '),
        variant: skippedCount > 0 ? 'warning' : 'default',
      });
      setIsImportModalOpen(false);
      fetchItems();
    } catch (error: any) {
      toast({
        title: 'Error importing entries',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const unlinkSelectedImportedEntries = async () => {
    const selectedIds = Array.from(selectedEntries);
    if (selectedIds.length === 0) {
      toast({
        title: 'No entries selected',
        description: 'Select entries to unlink first.',
        variant: 'destructive',
      });
      return;
    }
    if (!window.confirm('Unlink selected time entries from this invoice? They will be marked as unbilled again.')) return;
    setUnlinkingImports(true);
    try {
      const { data: linkedRows, error: linkedError } = await supabase
        .from('time_entries')
        .select('id')
        .in('id', selectedIds)
        .eq('invoice_id', id);
      if (linkedError) throw linkedError;
      const linkedIds = (linkedRows || []).map((row) => row.id);
      if (linkedIds.length === 0) {
        toast({ title: 'Nothing to unlink', description: 'Selected entries are not linked to this invoice.' });
        return;
      }
      const { error: updateError } = await supabase
        .from('time_entries')
        .update({ billing_status: 'unbilled', invoice_id: null })
        .in('id', linkedIds);
      if (updateError) throw updateError;
      const { error: linkDeleteError } = await supabase
        .from('invoice_time_entry_links')
        .delete()
        .eq('invoice_id', id)
        .in('time_entry_id', linkedIds);
      if (linkDeleteError) throw linkDeleteError;
      toast({
        title: `Unlinked ${linkedIds.length} entries`,
        description: 'Billing status moved from billed/paid back to unbilled.',
      });
      await fetchImportEntries();
      await fetchItems();
    } catch (error: any) {
      toast({
        title: 'Error unlinking entries',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUnlinkingImports(false);
    }
  };

  const importTasksFromProject = async () => {
    if (!invoice?.project_id) {
      toast({
        title: 'No project',
        description: 'Assign a project to this invoice to import tasks',
        variant: 'destructive',
      });
      return;
    }
    try {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, title, estimated_hours')
        .eq('project_id', invoice.project_id)
        .order('title');
      if (error) throw error;
      if (!tasks?.length) {
        toast({ title: 'No tasks', description: 'This project has no tasks' });
        return;
      }
      const projectRate = invoice.projects?.hourly_rate ?? defaultHourlyRate;
      const newItems = tasks.map((t) => {
        const qty = Number(t.estimated_hours) || 1;
        const rate = projectRate;
        const amount = qty * rate;
        return {
          invoice_id: id,
          description: t.title,
          quantity: qty,
          unit_price: rate,
          amount: parseFloat(amount.toFixed(2)),
        };
      });
      const { data: inserted, error: insertError } = await supabase
        .from('invoice_items')
        .insert(newItems)
        .select();
      if (insertError) throw insertError;
      toast({ title: `Imported ${tasks.length} tasks as line items` });
      fetchItems();
    } catch (e: any) {
      toast({ title: 'Error importing tasks', description: e.message, variant: 'destructive' });
    }
  };

  const importProjectBudget = async () => {
    if (!invoice?.project_id) {
      toast({
        title: 'No project',
        description: 'Assign a project to this invoice to import budget',
        variant: 'destructive',
      });
      return;
    }
    const budget = invoice.projects?.budget;
    if (budget == null || Number(budget) <= 0) {
      toast({
        title: 'No budget',
        description: 'This project has no budget set',
        variant: 'destructive',
      });
      return;
    }
    try {
      const amount = Number(budget);
      const { data: inserted, error } = await supabase
        .from('invoice_items')
        .insert({
          invoice_id: id,
          description: `Project budget: ${invoice.projects?.name || 'Project'}`,
          quantity: 1,
          unit_price: amount,
          amount,
        })
        .select()
        .single();
      if (error) throw error;
      toast({ title: 'Project budget added as line item' });
      fetchItems();
    } catch (e: any) {
      toast({ title: 'Error importing budget', description: e.message, variant: 'destructive' });
    }
  };

  const addItem = async () => {
    try {
      const { data, error } = await supabase
        .from('invoice_items')
        .insert({
          invoice_id: id,
          description: 'New item',
          quantity: 1,
          unit_price: 0,
          amount: 0,
        })
        .select()
        .single();

      if (error) throw error;
      setItems([...items, data]);
    } catch (error: any) {
      toast({
        title: 'Error adding item',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateItem = async (itemId: string, field: string, value: string | number) => {
    const updatedItems = items.map((item) => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.amount = Number(updated.quantity) * Number(updated.unit_price);
        }
        return updated;
      }
      return item;
    });
    setItems(updatedItems);
  };

  const deleteItem = async (itemId: string) => {
    try {
      const { data: linkedRows } = await supabase
        .from('invoice_time_entry_links')
        .select('time_entry_id')
        .eq('invoice_id', id)
        .eq('invoice_item_id', itemId);
      const linkedEntryIds = (linkedRows || []).map((row) => row.time_entry_id);

      await supabase.from('invoice_time_entry_links').delete().eq('invoice_id', id).eq('invoice_item_id', itemId);

      const { error } = await supabase
        .from('invoice_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      if (linkedEntryIds.length > 0) {
        await supabase
          .from('time_entries')
          .update({ billing_status: 'unbilled', invoice_id: null })
          .in('id', linkedEntryIds)
          .neq('billing_status', 'paid');
      }

      if (id) await syncInvoiceTimeEntryLinks(id);

      setItems(items.filter((i) => i.id !== itemId));
    } catch (error: any) {
      toast({
        title: 'Error deleting item',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const saveInvoice = async (): Promise<boolean> => {
    const issueDate = issueDateEdit?.trim() || null;
    const dueDate = dueDateEdit?.trim() || null;
    if (!issueDate || !dueDate) {
      toast({
        title: 'Issue date and due date are required',
        variant: 'destructive',
      });
      return false;
    }
    setSaving(true);
    try {
      // Save all items
      for (const item of items) {
        const { error } = await supabase
          .from('invoice_items')
          .update({
            description: item.description,
            line_description: item.line_description?.trim() || null,
            line_date: item.line_date?.trim() || null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            amount: item.amount,
          })
          .eq('id', item.id);
        if (error) throw error;
      }

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + Number(item.amount), 0);
      const selectedTax = taxes.find(t => t.id === selectedTaxId);
      const taxRate = selectedTax?.rate || 0;
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;

      // Save invoice (including editable invoice number and dates)
      const { error } = await supabase
        .from('invoices')
        .update({
          invoice_number: invoiceNumberEdit.trim() || invoice?.invoice_number,
          issue_date: issueDate,
          due_date: dueDate,
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total,
          notes: notes.trim() || null,
          invoice_footer: invoiceFooter.trim() || null,
          bank_details: bankDetails.trim() || null,
        })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Invoice saved' });
      setIsEditMode(false);
      fetchInvoice();
      return true;
    } catch (error: any) {
      toast({
        title: 'Error saving invoice',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const markLinkedEntriesBilled = async () => {
    if (!id) return;
    await supabase
      .from('time_entries')
      .update({ billing_status: 'billed' })
      .eq('invoice_id', id)
      .eq('billing_status', 'unbilled');
  };

  const markAsSent = async () => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', id);

      if (error) throw error;
      await markLinkedEntriesBilled();
      toast({ title: 'Invoice marked as sent' });
      fetchInvoice();
    } catch (error: any) {
      toast({
        title: 'Error updating invoice',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleMarkPaidConfirm = async (input: MarkInvoicePaidInput) => {
    if (!id) return;
    try {
      await markInvoicePaid(supabase, id, input);
      toast({ title: 'Invoice marked as paid' });
      await fetchInvoice();
      setSendReceiptPromptOpen(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not mark invoice as paid';
      toast({
        title: 'Error updating invoice',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    if (!id) return;
    setDownloadingPdf(true);
    try {
      const response = await supabase.functions.invoke('send-invoice', {
        body: { invoiceId: id, downloadOnly: true },
      });
      if (response.error) throw response.error;
      const pdfBase64 = (response.data as { pdfBase64?: string })?.pdfBase64;
      if (!pdfBase64) throw new Error('No PDF returned');
      const binary = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
      const blob = new Blob([binary], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice?.invoice_number ?? 'invoice'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'PDF downloaded' });
    } catch (error: any) {
      toast({
        title: 'Failed to download PDF',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSendInvoice = async () => {
    if (!recipientEmail) {
      toast({
        title: 'Email required',
        description: 'Please enter the recipient email address',
        variant: 'destructive',
      });
      return;
    }

    if (sendModalMode === 'receipt' && invoice?.status !== 'paid') {
      toast({
        title: 'Invoice not paid',
        description: 'Mark the invoice as paid before sending a receipt.',
        variant: 'destructive',
      });
      return;
    }

    setSendingInvoice(true);
    let sendResponse: { data?: { error?: string }; error?: { message?: string } } | null = null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      sendResponse = await supabase.functions.invoke('send-invoice', {
        body: {
          invoiceId: id,
          recipientEmail,
          cc: ccEmails.filter(Boolean),
          senderName: profile?.business_name || profile?.company_name || profile?.full_name || 'Your Business',
          senderEmail: profile?.business_email || profile?.email || user?.email,
          message: emailMessage,
          subject: emailSubject.trim() || undefined,
          receipt: sendModalMode === 'receipt',
        },
      });

      if (sendResponse.error) throw sendResponse.error;

      if (sendModalMode === 'send') {
        await markLinkedEntriesBilled();
      }

      toast({ title: sendModalMode === 'receipt' ? 'Receipt sent!' : 'Invoice sent successfully!' });
      setIsSendModalOpen(false);
      setEmailMessage('');
      setCcEmails([]);
      fetchInvoice();
    } catch (error: any) {
      console.error('Send invoice error:', error);
      let message = error?.message ?? 'Please try again';
      if (error instanceof FunctionsHttpError && error.context) {
        try {
          const body = await (error.context as Response).json();
          if (body?.error && typeof body.error === 'string') message = body.error;
        } catch {
          // ignore parse errors
        }
      } else if (sendResponse?.data?.error) {
        message = sendResponse.data.error;
      }
      toast({
        title: 'Failed to send',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSendingInvoice(false);
    }
  };


  const subtotal = items.reduce((sum, item) => sum + Number(item.amount), 0);
  const selectedTax = taxes.find(t => t.id === selectedTaxId);
  const taxRate = selectedTax?.rate || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const showQuantity = profile?.invoice_show_quantity ?? true;
  const showRate = profile?.invoice_show_rate ?? true;
  const showLineDescription = profile?.invoice_show_line_description ?? true;
  const showLineDate = profile?.invoice_show_line_date ?? false;

  const updateColumnVisibility = async (field: 'invoice_show_quantity' | 'invoice_show_rate' | 'invoice_show_line_description' | 'invoice_show_line_date', value: boolean) => {
    if (!user?.id) return;
    const { error } = await supabase.from('profiles').update({ [field]: value }).eq('user_id', user.id);
    if (error) {
      toast({ title: 'Failed to update column visibility', variant: 'destructive' });
      return;
    }
    setProfile((p) => (p ? { ...p, [field]: value } : null));
  };

  const resolvedCurrency = invoice?.clients?.currency || profile?.currency;
  const fmt = (amount: number) => formatCurrency(amount, resolvedCurrency, profile?.currency_display, profile?.number_format);

  // Resolve merge tags for default email message: {{client_name}}, {{invoice_number}}, {{total}}, {{due_date}}
  const resolveEmailMessage = (template: string) => {
    if (!template?.trim()) return '';
    const totalVal = total > 0 ? total : (invoice?.total != null ? Number(invoice.total) : 0);
    return template
      .replace(/\{\{client_name\}\}/gi, invoice?.clients?.name ?? '')
      .replace(/\{\{invoice_number\}\}/gi, invoice?.invoice_number ?? '')
      .replace(/\{\{total\}\}/gi, totalVal > 0 || invoice?.total != null ? fmt(totalVal || Number(invoice?.total ?? 0)) : '')
      .replace(/\{\{due_date\}\}/gi, invoice?.due_date ? formatLocaleDate(invoice.due_date, dateFormat) : '')
      .replace(/\{\{business_name\}\}/gi, profile?.business_name || profile?.company_name || profile?.full_name || '')
      .replace(/\{\{project_name\}\}/gi, invoice?.projects?.name ?? '');
  };

  const applySendModalDefaults = (mode: 'send' | 'reminder' | 'receipt', invoiceForReceipt?: Invoice | null) => {
    const inv = invoiceForReceipt ?? invoice;
    if (mode === 'receipt') {
      const paidDateDisplay = formatLocaleDate(inv?.paid_date ?? undefined, dateFormat);
      const paymentMethodDisplay = formatInvoicePaymentMethod(inv?.payment_method);
      setEmailSubject(`Receipt for Invoice ${inv?.invoice_number ?? ''} – Paid`);
      setEmailMessage(
        buildReceiptEmailMessage({
          totalFormatted: fmt(Number(inv?.total ?? 0)),
          paidDateDisplay: paidDateDisplay || '—',
          paymentMethodDisplay,
        }),
      );
      return;
    }

    if (mode === 'reminder') {
      const subjectTpl = pickEmailTemplate(
        profile?.reminder_subject_default,
        appCommsDefaults?.reminder_subject_default,
        DEFAULT_REMINDER_SUBJECT,
      );
      const bodyTpl = pickEmailTemplate(
        profile?.reminder_body_default,
        appCommsDefaults?.reminder_body_default,
        DEFAULT_REMINDER_BODY,
      );
      setEmailSubject(resolveEmailMessage(subjectTpl));
      setEmailMessage(resolveEmailMessage(bodyTpl));
      return;
    }

    const subjectTpl = pickEmailTemplate(
      profile?.invoice_email_subject_default,
      appCommsDefaults?.invoice_email_subject_default,
      DEFAULT_INVOICE_EMAIL_SUBJECT,
    );
    const bodyTpl = pickEmailTemplate(
      profile?.invoice_email_message_default,
      appCommsDefaults?.invoice_email_message_default,
      DEFAULT_INVOICE_EMAIL_MESSAGE,
    );
    setEmailSubject(resolveEmailMessage(subjectTpl));
    setEmailMessage(resolveEmailMessage(bodyTpl));
  };

  useEffect(() => {
    if (searchParams.get('sendReceipt') !== '1' || !invoice || invoice.status !== 'paid' || loading) return;
    setSendModalMode('receipt');
    applySendModalDefaults('receipt');
    setIsSendModalOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('sendReceipt');
    setSearchParams(next, { replace: true });
  }, [invoice, loading, searchParams, setSearchParams]);

  useEffect(() => {
    if (!isSendModalOpen) {
      sendModalDefaultsAppliedRef.current = false;
      return;
    }
    if (sendModalDefaultsAppliedRef.current) return;
    if (!profile && !appCommsDefaults) return;
    applySendModalDefaults(sendModalMode);
    sendModalDefaultsAppliedRef.current = true;
  }, [isSendModalOpen, profile, appCommsDefaults, sendModalMode, invoice?.invoice_number]);

  useEffect(() => {
    if (!isImportModalOpen || !invoice?.client_id) {
      importFetchSkipRef.current = true;
      return;
    }
    if (importFetchSkipRef.current) {
      importFetchSkipRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchImportEntries({ preserveSelection: true });
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch when filters change
  }, [
    isImportModalOpen,
    invoice?.client_id,
    importStatusFilter,
    importBillableFilter,
    importProjectFilter,
    importFromDate,
    importToDate,
    importSearch,
  ]);

  const openImportModal = () => {
    importFetchSkipRef.current = true;
    void fetchImportEntries();
  };

  const previewNotes = notes.trim() || profile?.invoice_notes_default?.trim() || '';
  const previewFooter = invoiceFooter.trim() || profile?.invoice_footer?.trim() || '';
  const previewClientMessage = emailMessage.trim() || resolveEmailMessage(profile?.invoice_email_message_default ?? '');
  const previewBankDetails = bankDetails.trim() || '';

  // Data for CustomJS-style preview (matches send-invoice payload)
  const currencySymbol = currencies.find((c) => c.value === (resolvedCurrency || 'USD'))?.symbol ?? '$';
  const senderAddress1 = [profile?.business_street, profile?.business_street2].filter(Boolean).join(', ') || '';
  const senderAddress2 = [profile?.business_city, profile?.business_state, profile?.business_postal_code].filter(Boolean).join(', ') || (profile?.business_country || '');
  const sender = {
    name: profile?.business_name || profile?.company_name || profile?.full_name || 'Your Business',
    address1: senderAddress1,
    address2: [senderAddress2, profile?.business_country].filter(Boolean).join(', ').trim(),
    email: profile?.business_email || profile?.email || '',
    phone: profile?.business_phone || '',
    tax: profile?.tax_id || '',
  };
  const client = invoice?.clients;
  const receiverAddress1 = [client?.street, (client as { street2?: string } | null)?.street2].filter(Boolean).join(', ') || '';
  const receiverAddress2 = [client?.city, client?.state, client?.postal_code].filter(Boolean).join(', ') || (client?.country || '');
  const receiver = {
    name: client?.name || '',
    company: client?.company || '',
    address1: receiverAddress1,
    address2: receiverAddress2.trim() || (client?.company || ''),
    email: client?.email || '',
    phone: client?.phone || '',
    tax: client?.tax_id || '',
  };
  const createdDate = formatLocaleDate(invoice?.issue_date, dateFormat);
  const dueDate = formatLocaleDate(invoice?.due_date, dateFormat);
  const isPaidReceipt = invoice?.status === 'paid';
  const paidDateDisplay = formatLocaleDate(invoice?.paid_date ?? undefined, dateFormat);
  const paymentMethodDisplay = formatInvoicePaymentMethod(invoice?.payment_method);
  const handleReopenInvoice = async () => {
    if (!id) return;
    const paidDetails = [paidDateDisplay && `paid on ${paidDateDisplay}`, paymentMethodDisplay && `via ${paymentMethodDisplay}`]
      .filter(Boolean)
      .join(' ');
    const msg = paidDetails
      ? `Reopen this invoice? It was marked ${paidDetails}. It will show as sent again; any receipt already emailed stays with your client.`
      : 'Reopen this invoice? It will show as sent again; any receipt already emailed stays with your client.';
    if (!window.confirm(msg)) return;
    try {
      await reopenPaidInvoice(supabase, id);
      toast({ title: 'Invoice reopened' });
      fetchInvoice();
    } catch (error: any) {
      toast({
        title: 'Could not reopen invoice',
        description: error.message,
        variant: 'destructive',
      });
    }
  };
  const formatDisplayDate = (value: string | null | undefined) => formatLocaleDate(value, dateFormat);
  const companyLogo = profile?.business_logo && typeof profile.business_logo === 'string' ? profile.business_logo : '';
  const previewItems = items.map((it) => ({
    description: it.description || '',
    price: Number(it.amount),
    unit_price: Number(it.unit_price) || Number(it.amount),
    quantity: Number(it.quantity) || 1,
    line_date: it.line_date ? formatLocaleDate(it.line_date, dateFormat) : '',
    line_description: it.line_description != null ? String(it.line_description) : '',
  }));
  const amt = (n: number) => `${currencySymbol}${Number(n).toFixed(2)}`;
  const selectedImportEntries = importEntries.filter((entry) => selectedEntries.has(entry.id));
  const importSummary = (() => {
    const totalHours = selectedImportEntries.reduce((sum, entry) => {
      const hours = entry.total_duration_seconds != null ? entry.total_duration_seconds / 3600 : entry.duration_minutes / 60;
      return sum + hours;
    }, 0);
    const totalAmount = selectedImportEntries.reduce((sum, entry) => {
      const hours = entry.total_duration_seconds != null ? entry.total_duration_seconds / 3600 : entry.duration_minutes / 60;
      const rate = entry.hourly_rate ?? defaultHourlyRate;
      return sum + (hours * rate);
    }, 0);
    const groupedCount = new Set(
      selectedImportEntries.map((entry) => `${entry.project_id}__${entry.task_id || 'none'}__${entry.hourly_rate ?? defaultHourlyRate}`),
    ).size;
    return {
      totalHours,
      totalAmount,
      groupedCount,
      entryCount: selectedImportEntries.length,
    };
  })();

  const formatClientAddress = (client: Invoice['clients']) => {
    if (!client) return '';
    const parts = [
      client.street,
      client.city && client.state ? `${client.city}, ${client.state}` : client.city || client.state,
      client.postal_code,
      client.country
    ].filter(Boolean);
    return parts.join('\n');
  };

  const formatBusinessAddress = (p: UserProfile | null) => {
    if (!p) return '';
    const parts = [p.business_street, p.business_street2, p.business_city, p.business_state, p.business_postal_code, p.business_country].filter(Boolean);
    if (parts.length) return parts.join('\n');
    return p.business_address || '';
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </AppLayout>
    );
  }

  if (!invoice) {
    return (
      <AppLayout>
        <div className="space-y-4 max-w-lg">
          <p className="text-muted-foreground">Invoice not found.</p>
          <PageBreadcrumb items={detailPageBreadcrumb('Invoices', '/invoices', 'Invoice not found')} />
          <Button variant="outline" onClick={() => navigate('/invoices')}>
            View all invoices
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <TooltipProvider>
      <div className="space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4">
          <div className="min-w-0 space-y-2">
            <PageBreadcrumb
              items={detailPageBreadcrumb('Invoices', '/invoices', invoice.invoice_number || 'Invoice')}
            />
            <div className="min-w-0">
              {isEditMode ? (
                <Input
                  value={invoiceNumberEdit}
                  onChange={(e) => setInvoiceNumberEdit(e.target.value)}
                  className="text-2xl font-bold h-9 max-w-[200px]"
                  placeholder="Invoice number"
                />
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold truncate">{invoice.invoice_number}</h1>
                    <Badge variant="outline" className={getStatusBadgeClass(invoice.status || 'draft')}>
                      {formatStatusLabel(invoice.status || 'draft')}
                    </Badge>
                  </div>
                  {invoice.status === 'paid' && (paidDateDisplay || paymentMethodDisplay) ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {paidDateDisplay ? <>Paid {paidDateDisplay}</> : null}
                      {paidDateDisplay && paymentMethodDisplay ? ' · ' : null}
                      {paymentMethodDisplay ? <>{paymentMethodDisplay}</> : null}
                    </p>
                  ) : null}
                </div>
              )}
              {isEditMode && (
                <Badge variant="outline" className={getStatusBadgeClass(invoice.status || 'draft')}>
                  {formatStatusLabel(invoice.status || 'draft')}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (isEditMode) {
                      void saveInvoice();
                      return;
                    }
                    if (invoice.status === 'sent' || invoice.status === 'paid') {
                      if (window.confirm('This invoice has already been sent. Any changes you make won\'t update the version the client received. To send an updated copy, save your changes and use "Send to Client" again. Continue to edit?')) {
                        setIsEditMode(true);
                      }
                    } else {
                      setIsEditMode(true);
                    }
                  }}
                  title={isEditMode ? 'Save invoice' : 'Edit invoice'}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isEditMode ? (
                    <Save className="h-4 w-4" />
                  ) : (
                    <SlotIcon slot="action_edit" className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isEditMode ? 'Save invoice' : 'Edit invoice'}</TooltipContent>
            </Tooltip>
            <Button variant="outline" size="icon" onClick={() => setIsPreviewOpen(true)} title="Preview">
              <SlotIcon slot="action_preview" className="h-4 w-4" />
            </Button>
            {invoice.clients?.email && (
              <Button
                size="sm"
                onClick={async () => {
                  if (isEditMode) {
                    const shouldSave = window.confirm(
                      'Save your invoice before sending? Your latest changes are not saved yet.',
                    );
                    if (!shouldSave) return;
                    const ok = await saveInvoice();
                    if (!ok) return;
                  }
                  const isReceipt = invoice.status === 'paid';
                  const isReminder = invoice.status === 'sent' || invoice.status === 'paid';
                  if (isReceipt) {
                    setSendModalMode('receipt');
                    applySendModalDefaults('receipt');
                  } else if (isReminder) {
                    setSendModalMode('reminder');
                    applySendModalDefaults('reminder');
                  } else {
                    setSendModalMode('send');
                    applySendModalDefaults('send');
                  }
                  setCcEmails([]);
                  setIsSendModalOpen(true);
                }}
              >
                <SlotIcon slot="action_send" className="mr-2 h-4 w-4 text-current" />
                {invoice.status === 'paid' ? 'Send receipt' : invoice.status === 'sent' || invoice.status === 'paid' ? 'Send reminder' : 'Send to Client'}
              </Button>
            )}
            <DropdownMenu>
              <MenuDotsTrigger />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadPdf} disabled={downloadingPdf}>
                  {downloadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Download PDF
                </DropdownMenuItem>
                {invoice.status === 'draft' && (
                  <DropdownMenuItem onClick={markAsSent}>
                    <SlotIcon slot="action_send" className="mr-2" />
                    Mark as Sent
                  </DropdownMenuItem>
                )}
                {invoice.status === 'sent' && (
                  <DropdownMenuItem onClick={() => setMarkPaidDialogOpen(true)}>
                    <SlotIcon slot="invoice_stat_paid" className="mr-2 h-4 w-4" />
                    Mark as Paid
                  </DropdownMenuItem>
                )}
                {invoice.status === 'paid' && (
                  <DropdownMenuItem onClick={handleReopenInvoice}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reopen invoice
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={async () => {
                    if (!window.confirm('Delete this invoice? This cannot be undone.')) return;
                    try {
                      await supabase
                        .from('time_entries')
                        .update({ billing_status: 'unbilled', invoice_id: null })
                        .eq('invoice_id', id)
                        .in('billing_status', ['billed', 'paid']);
                      const { error } = await supabase.from('invoices').delete().eq('id', id);
                      if (error) throw error;
                      toast({ title: 'Invoice deleted' });
                      navigate('/invoices');
                    } catch (err: any) {
                      toast({ title: err?.message || 'Failed to delete', variant: 'destructive' });
                    }
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {isEditMode && (invoice.status === 'sent' || invoice.status === 'paid') && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-4 text-sm text-amber-800 dark:text-amber-200">
            This invoice has already been sent to your client. Changes you make here will not update the version they received. To send an updated copy, save your changes and use &quot;Send to Client&quot; again.
          </div>
        )}

        {/* Invoice Details */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* From - Business Details */}
              <div>
                <h3 className="font-semibold mb-2">From</h3>
                <div className="text-sm text-muted-foreground">
                  {profile == null ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-muted rounded w-32" />
                      <div className="h-3 bg-muted rounded w-48" />
                    </div>
                  ) : (
                    <>
                      {profile?.business_logo && (
                        <img 
                          src={profile.business_logo} 
                          alt="Business logo" 
                          className="h-12 mb-2 object-contain"
                        />
                      )}
                      <p className="font-medium text-foreground break-words">
                        {profile?.business_name || profile?.company_name || profile?.full_name || 'Your Business'}
                      </p>
                      {formatBusinessAddress(profile) && (
                        <p className="whitespace-pre-line">{formatBusinessAddress(profile)}</p>
                      )}
                      {(profile?.business_email || profile?.email) && (
                        <p>{profile.business_email || profile.email}</p>
                      )}
                      {profile?.business_phone && <p>{profile.business_phone}</p>}
                      {profile?.tax_id && (
                        <p className="mt-1">Tax ID: {profile.tax_id}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              {/* Bill To - Client Details */}
              <div>
                <h3 className="font-semibold mb-2">Bill To</h3>
                {invoice.clients ? (
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{invoice.clients.name}</p>
                    {invoice.clients.company && <p>{invoice.clients.company}</p>}
                    {formatClientAddress(invoice.clients) && (
                      <p className="whitespace-pre-line">{formatClientAddress(invoice.clients)}</p>
                    )}
                    {invoice.clients.email && <p>{invoice.clients.email}</p>}
                    {invoice.clients.phone && <p>{invoice.clients.phone}</p>}
                    {invoice.clients.tax_id && (
                      <p className="mt-1">Tax ID: {invoice.clients.tax_id}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No client selected</p>
                )}
              </div>
            </div>
            
            {/* Invoice Dates */}
            <div className="mt-6 pt-6 border-t border-border">
              {isEditMode ? (
                <div className="grid grid-cols-2 gap-4 max-w-sm">
                  <div className="space-y-2">
                    <Label htmlFor="issue_date_edit">Issue Date</Label>
                    <Input
                      id="issue_date_edit"
                      type="date"
                      value={issueDateEdit}
                      onChange={(e) => setIssueDateEdit(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due_date_edit">Due Date</Label>
                    <Input
                      id="due_date_edit"
                      type="date"
                      value={dueDateEdit}
                      onChange={(e) => setDueDateEdit(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Issue Date:</span>{' '}
                    <span className="font-medium">{formatDisplayDate(invoice.issue_date) || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Due Date:</span>{' '}
                    <span className="font-medium">{formatDisplayDate(invoice.due_date) || '—'}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            {isEditMode && (
              <div className="flex flex-wrap gap-2">
                {invoice.client_id && (
                  <Button variant="outline" size="sm" onClick={openImportModal}>
                    <SlotIcon slot="invoice_stat_pending" className="mr-2 h-4 w-4" />
                    Import Time
                  </Button>
                )}
                {invoice.project_id && (
                  <>
                    <Button variant="outline" size="sm" onClick={importTasksFromProject}>
                      <ListTodo className="mr-2 h-4 w-4" />
                      Import Tasks
                    </Button>
                    {invoice.projects?.budget != null && Number(invoice.projects.budget) > 0 && (
                      <Button variant="outline" size="sm" onClick={importProjectBudget}>
                        <Wallet className="mr-2 h-4 w-4" />
                        Import Budget
                      </Button>
                    )}
                  </>
                )}
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4 overflow-x-auto no-scrollbar">
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No items yet. {isEditMode ? 'Add your first line item or import from time entries.' : ''}
                </div>
              ) : (
                <Table className="min-w-[560px] w-full">
                  <TableHeader>
                    <TableRow className="border-b hover:bg-transparent">
                      <TableHead className="w-[128px] min-w-[128px]">
                        <div className="flex items-center gap-2">
                          Date
                          {isEditMode && (
                            <Switch
                              checked={showLineDate}
                              onCheckedChange={(v) => updateColumnVisibility('invoice_show_line_date', v)}
                              className="scale-75"
                              title="Show in preview & PDF"
                            />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="min-w-[140px]">Item</TableHead>
                      <TableHead className="min-w-[120px]">
                        <div className="flex items-center gap-2">
                          Notes
                          {isEditMode && (
                            <Switch
                              checked={showLineDescription}
                              onCheckedChange={(v) => updateColumnVisibility('invoice_show_line_description', v)}
                              className="scale-75"
                              title="Show in preview & PDF"
                            />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="w-[96px] min-w-[96px]">
                        <div className="flex items-center justify-center gap-2">
                          Qty
                          {isEditMode && (
                            <Switch
                              checked={showQuantity}
                              onCheckedChange={(v) => updateColumnVisibility('invoice_show_quantity', v)}
                              className="scale-75"
                              title="Show in preview & PDF"
                            />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="w-[104px] min-w-[104px]">
                        <div className="flex items-center justify-center gap-2">
                          Rate
                          {isEditMode && (
                            <Switch
                              checked={showRate}
                              onCheckedChange={(v) => updateColumnVisibility('invoice_show_rate', v)}
                              className="scale-75"
                              title="Show in preview & PDF"
                            />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="w-[110px] min-w-[110px] text-right">Amount</TableHead>
                      {isEditMode && <TableHead className="sticky right-0 z-10 w-12 min-w-12 bg-card" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="py-2 align-middle">
                          {isEditMode ? (
                            <Input
                              type="date"
                              value={item.line_date ? format(new Date(item.line_date), 'yyyy-MM-dd') : ''}
                              onChange={(e) => updateItem(item.id, 'line_date', e.target.value || '')}
                              className="relative h-8 w-full min-w-0 pl-3 pr-10 text-sm [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:top-1/2 [&::-webkit-calendar-picker-indicator]:h-4 [&::-webkit-calendar-picker-indicator]:w-4 [&::-webkit-calendar-picker-indicator]:-translate-y-1/2 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                            />
                          ) : (
                            <span className="text-sm">{item.line_date ? formatDisplayDate(item.line_date) : '—'}</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 align-middle min-w-[140px]">
                          {isEditMode ? (
                            <Input
                              value={item.description}
                              onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                              placeholder="Item / activity"
                              className="h-8 text-sm"
                            />
                          ) : (
                            <span className="text-sm break-words">{item.description}</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 align-middle min-w-[120px]">
                          {isEditMode ? (
                            <Input
                              value={item.line_description ?? ''}
                              onChange={(e) => updateItem(item.id, 'line_description', e.target.value)}
                              placeholder="Optional notes"
                              className="h-8 text-sm"
                            />
                          ) : (
                            <span className="text-sm text-muted-foreground break-words">{item.line_description || '—'}</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 align-middle">
                          <div className="flex justify-center">
                          {isEditMode ? (
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                              className="h-8 w-[4.5rem] min-w-[4.5rem] px-2 text-center tabular-nums"
                            />
                          ) : (
                            <span className="text-sm tabular-nums">{item.quantity}</span>
                          )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 align-middle">
                          <div className="flex justify-center">
                          {isEditMode ? (
                            <Input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                              className="h-8 w-[5.5rem] min-w-[5.5rem] px-2 text-center tabular-nums"
                            />
                          ) : (
                            <span className="text-sm tabular-nums">{fmt(Number(item.unit_price))}</span>
                          )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 align-middle text-right font-medium">
                          {fmt(Number(item.quantity) * Number(item.unit_price))}
                        </TableCell>
                        {isEditMode && (
                          <TableCell className="sticky right-0 z-10 w-12 bg-card py-2 align-middle">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Tax</span>
                    {isEditMode ? (
                      <Select
                        value={selectedTaxId || 'none'}
                        onValueChange={(v) => setSelectedTaxId(v === 'none' ? '' : v)}
                      >
                        <SelectTrigger className="w-40 h-8">
                          <SelectValue placeholder="Select tax" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No tax</SelectItem>
                          {taxes.map((tax) => (
                            <SelectItem key={tax.id} value={tax.id}>
                              {tax.name} ({tax.rate}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span>{taxes.find(t => t.id === selectedTaxId)?.name ?? 'None'} ({taxRate}%)</span>
                    )}
                  </div>
                  <span className="font-medium">{fmt(taxAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total</span>
                  <span>{fmt(total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            {isEditMode && (
              <p className="text-sm text-muted-foreground">Shown on the PDF. Leave empty to use the default from Invoice Settings.</p>
            )}
          </CardHeader>
          <CardContent>
            {isEditMode ? (
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={profile?.invoice_notes_default ? 'Leave empty to use default from settings' : 'Add any notes or payment instructions...'}
                rows={4}
              />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap min-h-[4rem]">
                {previewNotes || '—'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Footer (per-invoice override) */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Footer</CardTitle>
            {isEditMode && (
              <p className="text-sm text-muted-foreground">Shown at the bottom of the PDF. Leave empty to use the default from Invoice Settings.</p>
            )}
          </CardHeader>
          <CardContent>
            {isEditMode ? (
              <Textarea
                value={invoiceFooter}
                onChange={(e) => setInvoiceFooter(e.target.value)}
                placeholder={profile?.invoice_footer ? 'Leave empty to use default from settings' : 'e.g. Thank you for your business!'}
                rows={2}
              />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap min-h-[2rem]">
                {previewFooter || '—'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Bank details (per-invoice override) */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Bank details</CardTitle>
            {isEditMode && (
              <p className="text-sm text-muted-foreground">Leave empty to use the default from Invoice Settings. Shown on the invoice PDF.</p>
            )}
          </CardHeader>
          <CardContent>
            {isEditMode ? (
              <Textarea
                value={bankDetails}
                onChange={(e) => setBankDetails(e.target.value)}
                placeholder={profile?.invoice_bank_details_default ? 'Leave empty to use default from Invoice Settings' : 'Bank name, account number, routing, payment instructions...'}
                rows={3}
              />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap min-h-[2rem]">
                {bankDetails.trim() || profile?.invoice_bank_details_default?.trim() || '—'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Invoice Preview</DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <SlotIcon slot="action_print" className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button size="sm" onClick={async () => {
                setIsPreviewOpen(false);
                if (isEditMode) {
                  const shouldSave = window.confirm(
                    'Save your invoice before sending? Your latest changes are not saved yet.',
                  );
                  if (!shouldSave) return;
                  const ok = await saveInvoice();
                  if (!ok) return;
                }
                setSendModalMode('send');
                setCcEmails([]);
                setIsSendModalOpen(true);
              }}>
                <SlotIcon slot="action_send" className="mr-2 h-4 w-4" />
                Send Invoice
              </Button>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-120px)]">
            <div className="bg-white rounded-lg border">
              <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
              <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
              <style dangerouslySetInnerHTML={{ __html: INVOICE_PREVIEW_STYLES }} />
              <div className="invoice-preview-root">
                <section className="wrapper-invoice">
                  <div className="invoice">
                    <div className="invoice-information">
                      <p>
                        <b>Invoice #</b> {invoice.invoice_number}
                        {isPaidReceipt ? <span className="paid-badge">PAID</span> : null}
                      </p>
                      <p><b>Date</b> {createdDate}</p>
                      {isPaidReceipt && paidDateDisplay ? (
                        <>
                          <p className="paid-on"><b>Paid on</b> {paidDateDisplay}</p>
                          {paymentMethodDisplay ? (
                            <p className="payment-method"><b>Payment method</b> {paymentMethodDisplay}</p>
                          ) : null}
                        </>
                      ) : (
                        <p><b>Due Date</b> {dueDate}</p>
                      )}
                    </div>
                    <div className="invoice-logo-brand">
                      {companyLogo ? <img src={companyLogo} alt="Company Logo" /> : null}
                    </div>
                    <div className="invoice-head">
                      <div className="head client-info">
                        <h2>To</h2>
                        <p><strong>{receiver.name}</strong></p>
                        {receiver.company ? <p>{receiver.company}</p> : null}
                        {receiver.address1 ? <p>{receiver.address1}</p> : null}
                        {receiver.address2 ? <p>{receiver.address2}</p> : null}
                        {receiver.email ? <p>{receiver.email}</p> : null}
                        {receiver.phone ? <p>{receiver.phone}</p> : null}
                        {receiver.tax ? <p className="receiver-tax"><b>Tax ID:</b> {receiver.tax}</p> : null}
                      </div>
                      <div className="head client-data">
                        <h2>From</h2>
                        <p><strong>{sender.name}</strong></p>
                        {sender.address1 ? <p>{sender.address1}</p> : null}
                        {sender.address2 ? <p>{sender.address2}</p> : null}
                        {sender.email ? <p>{sender.email}</p> : null}
                        {sender.phone ? <p>{sender.phone}</p> : null}
                        {sender.tax ? <p><b>Tax ID:</b> {sender.tax}</p> : null}
                      </div>
                    </div>
                    <div className="invoice-body">
                      <table className="table">
                        <thead>
                          <tr>
                            {showLineDate ? <th className="col-date">Date</th> : null}
                            <th className="col-description">Description</th>
                            {showQuantity ? <th className="col-qty">Qty</th> : null}
                            {showRate ? <th className="col-rate">Rate</th> : null}
                            <th className="col-amount">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewItems.map((item, idx) => (
                            <tr key={idx}>
                              {showLineDate ? <td>{item.line_date}</td> : null}
                              <td>
                                {item.description}
                                {showLineDescription && item.line_description ? <small>{item.line_description}</small> : null}
                              </td>
                              {showQuantity ? <td className="text-right">{item.quantity}</td> : null}
                              {showRate ? <td className="text-right">{amt(item.unit_price)}</td> : null}
                              <td className="text-right">{amt(item.price)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="flex-table">
                        <div className="flex-column">
                          <table className="table-subtotal">
                            <tbody>
                              <tr>
                                <td>Subtotal</td>
                                <td>{amt(subtotal)}</td>
                              </tr>
                              {taxRate > 0 ? (
                                <tr>
                                  <td>Tax {taxRate}%</td>
                                  <td>{amt(taxAmount)}</td>
                                </tr>
                              ) : null}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="invoice-total-amount">
                        <p>Total: {amt(total)}</p>
                        {isPaidReceipt ? (
                          <>
                            <p className="amount-paid-line">Amount paid: {amt(total)}</p>
                            <p className="balance-due-paid">Balance due: {amt(0)}</p>
                          </>
                        ) : null}
                      </div>
                    </div>
                    {previewNotes ? (
                      <div className="invoice-notes">
                        <h3>Notes</h3>
                        <p>{previewNotes}</p>
                      </div>
                    ) : null}
                    {previewBankDetails ? (
                      <div className="invoice-bank-details">
                        <h3>Payment Information</h3>
                        <p>{previewBankDetails}</p>
                      </div>
                    ) : null}
                    {previewFooter ? (
                      <div className="invoice-footer">
                        <p>{previewFooter}</p>
                      </div>
                    ) : null}
                  </div>
                </section>
              </div>
              {previewClientMessage ? (
                <div className="mt-4 rounded-lg border bg-background p-4">
                  <p className="text-sm font-medium mb-1">Message to client (email)</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{previewClientMessage}</p>
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Import Time Entries Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle>Import Time Entries</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-3 space-y-3 shrink-0">
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={resetImportFilters}>
              Reset filters
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Select value={importStatusFilter} onValueChange={(v) => setImportStatusFilter(v as typeof importStatusFilter)}>
              <SelectTrigger className="h-9 w-full min-w-0"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unbilled">Unbilled</SelectItem>
                <SelectItem value="billed">Billed</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="all">All statuses</SelectItem>
              </SelectContent>
            </Select>
            <Select value={importBillableFilter} onValueChange={(v) => setImportBillableFilter(v as typeof importBillableFilter)}>
              <SelectTrigger className="h-9 w-full min-w-0"><SelectValue placeholder="Billable" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="billable">Billable</SelectItem>
                <SelectItem value="non_billable">Non-billable</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <Select value={importProjectFilter} onValueChange={setImportProjectFilter}>
              <SelectTrigger className="h-9 w-full min-w-0 text-left"><SelectValue placeholder="Project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All client projects</SelectItem>
                {clientProjectsForImport.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              value={importFromDate}
              onChange={(e) => setImportFromDate(e.target.value)}
              type="date"
              aria-label="From date"
              className="relative h-9 w-full min-w-0 pl-3 pr-11 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2.5 [&::-webkit-calendar-picker-indicator]:top-1/2 [&::-webkit-calendar-picker-indicator]:h-4 [&::-webkit-calendar-picker-indicator]:w-4 [&::-webkit-calendar-picker-indicator]:-translate-y-1/2 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
            <Input
              value={importToDate}
              onChange={(e) => setImportToDate(e.target.value)}
              type="date"
              aria-label="To date"
              className="relative h-9 w-full min-w-0 pl-3 pr-11 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2.5 [&::-webkit-calendar-picker-indicator]:top-1/2 [&::-webkit-calendar-picker-indicator]:h-4 [&::-webkit-calendar-picker-indicator]:w-4 [&::-webkit-calendar-picker-indicator]:-translate-y-1/2 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
            <Select value={importGrouping} onValueChange={(v) => setImportGrouping(v as typeof importGrouping)}>
              <SelectTrigger className="h-9 w-full min-w-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="grouped">Grouped (project + task)</SelectItem>
                <SelectItem value="detailed">Detailed (one line per entry)</SelectItem>
              </SelectContent>
            </Select>
            <PageSearchInput
              value={importSearch}
              onChange={setImportSearch}
              placeholder="Search notes/task/project"
              wrapperClassName="max-w-none min-w-0"
            />
          </div>
          {importLoading ? (
            <p className="text-xs text-muted-foreground">Updating list…</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Button type="button" variant="ghost" size="sm" onClick={() => applyImportPreset('this_week')}>This week</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => applyImportPreset('this_month')}>This month</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => applyImportPreset('last_month')}>Last month</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => applyImportPreset('all_time')}>All time</Button>
            <div className="ml-auto flex items-center gap-4">
              <label className="flex items-center gap-2">
                <Checkbox checked={importIncludeNotes} onCheckedChange={(v) => setImportIncludeNotes(v === true)} />
                Include notes in line description
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={importIncludeLineDate} onCheckedChange={(v) => setImportIncludeLineDate(v === true)} />
                Include line date
              </label>
            </div>
          </div>
          </div>
          <ScrollArea className="flex-1 min-h-0 px-6 max-h-[min(50vh,420px)]">
            {importEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No entries match current filters
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(
                  importEntries.reduce((acc, entry) => {
                    if (!acc[entry.project_name]) acc[entry.project_name] = [];
                    acc[entry.project_name].push(entry);
                    return acc;
                  }, {} as Record<string, ImportTimeEntry[]>)
                ).map(([projectName, entries]) => (
                  <div key={projectName} className="border rounded-lg p-3">
                    <h4 className="font-medium mb-2">{projectName}</h4>
                    {entries.map((entry) => {
                      const hours = (entry.total_duration_seconds != null ? entry.total_duration_seconds / 3600 : entry.duration_minutes / 60);
                      const rate = entry.hourly_rate || defaultHourlyRate;
                      const eligible =
                        entry.billable &&
                        (entry.billing_status || 'unbilled') === 'unbilled' &&
                        !entry.linkedOnThisInvoice;
                      const alreadyOnInvoice = entry.linkedOnThisInvoice;
                      return (
                        <div key={entry.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                          <Checkbox
                            checked={selectedEntries.has(entry.id)}
                            disabled={!eligible}
                            onCheckedChange={(checked) => {
                              const newSet = new Set(selectedEntries);
                              if (checked) {
                                newSet.add(entry.id);
                              } else {
                                newSet.delete(entry.id);
                              }
                              setSelectedEntries(newSet);
                            }}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {entry.task_name ? `${entry.task_name}` : 'No task'}
                              {alreadyOnInvoice ? (
                                <span className="ml-2 text-xs text-primary">(on this invoice)</span>
                              ) : !eligible ? (
                                <span className="ml-2 text-xs text-muted-foreground">(not importable)</span>
                              ) : null}
                            </p>
                            <p className="text-xs text-muted-foreground">{entry.description || 'No notes'} • {formatDisplayDate(entry.start_time)}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {(entry.billing_status || 'unbilled').replace('_', ' ')} • {entry.billable ? 'billable' : 'non-billable'}
                            </p>
                          </div>
                          <div className="text-right text-sm">
                            <p>{hours.toFixed(2)}h × {fmt(rate)}</p>
                            <p className="font-medium">{fmt(hours * rate)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="mx-6 mb-3 rounded-lg border bg-muted/20 p-3 text-sm shrink-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-medium">Import preview</span>
              <span className="text-muted-foreground">{importSummary.entryCount} entries</span>
              <span className="text-muted-foreground">{importSummary.totalHours.toFixed(2)}h</span>
              <span className="text-muted-foreground">{fmt(importSummary.totalAmount)}</span>
              <span className="text-muted-foreground">
                {importGrouping === 'grouped' ? `${importSummary.groupedCount} grouped lines` : `${importSummary.entryCount} detailed lines`}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {importGrouping === 'grouped'
                ? 'Grouped import creates one invoice line per project/task/rate combination.'
                : 'Detailed import creates one invoice line per selected time entry.'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Entries stay <span className="font-medium">unbilled</span> until the invoice is sent. Unlink removes them from this invoice.
            </p>
          </div>
          <div className="flex justify-between items-center px-6 py-4 border-t shrink-0">
            <p className="text-sm text-muted-foreground">
              {selectedEntries.size} entries →{' '}
              {importGrouping === 'grouped'
                ? `${importSummary.groupedCount} invoice line${importSummary.groupedCount === 1 ? '' : 's'}`
                : `${importSummary.entryCount} invoice line${importSummary.entryCount === 1 ? '' : 's'}`}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={unlinkSelectedImportedEntries}
                disabled={selectedEntries.size === 0 || unlinkingImports}
              >
                {unlinkingImports ? 'Unlinking…' : 'Unlink selected'}
              </Button>
              <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={importSelectedEntries} disabled={selectedEntries.size === 0}>
                Import Selected
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Invoice Modal */}
      <Dialog open={isSendModalOpen} onOpenChange={(open) => {
        setIsSendModalOpen(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {sendModalMode === 'receipt' ? 'Send receipt' : invoice.status === 'sent' || invoice.status === 'paid' ? 'Send reminder' : 'Send Invoice'}
            </DialogTitle>
            <DialogDescription>
              {sendModalMode === 'receipt'
                ? 'Send a receipt to your client confirming payment. The PDF is attached.'
                : invoice.status === 'sent' || invoice.status === 'paid'
                  ? 'Send a reminder email to your client with the invoice PDF attached.'
                  : 'Send this invoice to your client via email with a PDF attachment.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {(invoice.status === 'sent' || invoice.status === 'paid') && sendModalMode !== 'receipt' && profile?.reminder_enabled && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-3 text-sm text-amber-800 dark:text-amber-200">
                You have automatic reminders enabled. This is a manual reminder.
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="recipient-email">Recipient Email</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 text-xs"
                  onClick={() => setCcEmails((prev) => [...prev, ''])}
                >
                  + Add CC
                </Button>
              </div>
              <Input
                id="recipient-email"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="client@example.com"
              />
            </div>
            {ccEmails.length > 0 ? (
            <div className="space-y-2">
              {ccEmails.map((email, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setCcEmails((prev) => {
                      const next = [...prev];
                      next[i] = e.target.value;
                      return next;
                    })}
                    placeholder="cc@example.com"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => setCcEmails((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            ) : null}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="email-subject">Subject</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="h-8">
                      Insert placeholder
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {EMAIL_MERGE_TAGS.map(({ tag, label }) => (
                      <DropdownMenuItem
                        key={tag}
                        onSelect={() => setEmailSubject((s) => s + (s ? ' ' : '') + tag)}
                      >
                        {label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="email-message">Message</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="h-8">
                      Insert placeholder
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {EMAIL_MERGE_TAGS.map(({ tag, label }) => (
                      <DropdownMenuItem
                        key={tag}
                        onSelect={() => setEmailMessage((m) => m + (m ? ' ' : '') + tag)}
                      >
                        {label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Textarea
                id="email-message"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Uses default from Invoice Settings if empty. Edit to override."
                rows={4}
              />
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Invoice Summary</p>
              <p>Invoice: {invoice.invoice_number}</p>
              <p>Amount: {fmt(total)}</p>
              {sendModalMode === 'receipt' ? (
                <>
                  {paidDateDisplay ? <p>Paid: {paidDateDisplay}</p> : null}
                  {paymentMethodDisplay ? <p>Method: {paymentMethodDisplay}</p> : null}
                </>
              ) : invoice.due_date ? (
                <p>Due: {formatDisplayDate(invoice.due_date)}</p>
              ) : null}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsSendModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendInvoice} disabled={sendingInvoice}>
              {sendingInvoice ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <SlotIcon slot="action_send" className="mr-2 h-4 w-4" />
                  {sendModalMode === 'receipt' ? 'Send receipt' : invoice.status === 'sent' || invoice.status === 'paid' ? 'Send reminder' : 'Send Invoice'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <MarkInvoicePaidDialog
        open={markPaidDialogOpen}
        onOpenChange={setMarkPaidDialogOpen}
        invoiceNumber={invoice.invoice_number}
        onConfirm={handleMarkPaidConfirm}
      />
      <SendReceiptPromptDialog
        open={sendReceiptPromptOpen}
        onOpenChange={setSendReceiptPromptOpen}
        invoiceNumber={invoice.invoice_number}
        onSendReceipt={() => {
          setSendModalMode('receipt');
          applySendModalDefaults('receipt');
          setIsSendModalOpen(true);
        }}
      />
      </TooltipProvider>
    </AppLayout>
  );
}
