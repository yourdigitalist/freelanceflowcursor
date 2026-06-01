import { useEffect, useState, useRef, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { notifyStartGuideRefresh } from '@/components/layout/startGuideUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageSearchInput } from '@/components/ui/page-search-input';
import { MenuDotsTrigger } from '@/components/ui/menu-dots-trigger';
import { Card, CardContent } from '@/components/ui/card';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Download, Upload, RotateCcw, Filter } from '@/components/icons';
import { reopenPaidInvoice } from '@/lib/invoiceStatus';
import {
  formatInvoicePaymentMethod,
  markInvoicePaid,
  type MarkInvoicePaidInput,
} from '@/lib/invoicePayment';
import { MarkInvoicePaidDialog } from '@/components/invoices/MarkInvoicePaidDialog';
import { SendReceiptPromptDialog } from '@/components/invoices/SendReceiptPromptDialog';
import { formatLocaleDate } from '@/lib/datetime';

import { SlotIcon } from '@/contexts/IconSlotContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, parseISO, addDays } from 'date-fns';
import {
  DataTableFrame,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableClientCell } from '@/components/ui/table-client-cell';
import { TableStatusBadge } from '@/components/ui/table-status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from '@/components/icons';
import {
  downloadCsv,
  parseCsv,
  getInvoicesTemplateRows,
  INVOICES_CSV_HEADERS,
} from '@/lib/csv';
import { formatCurrency } from '@/lib/locale-data';
import { useLocalePreferences } from '@/hooks/useLocalePreferences';
import { ClientFormDialog } from '@/components/clients/ClientFormDialog';
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog';
import { usePagination } from '@/hooks/usePagination';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { compareDates, compareNullableNumbers, compareStrings } from '@/lib/tableSort';
import { TablePagination } from '@/components/ui/table-pagination';
import { PageSummaryBar, PageSummaryStat } from '@/components/ui/page-summary-stats';
import { PageBreadcrumb } from '@/components/layout/PageBreadcrumb';
import { listPageBreadcrumb } from '@/lib/breadcrumbs';

interface Client {
  id: string;
  name: string;
  company?: string | null;
  currency?: string | null;
  email?: string | null;
}

interface Project {
  id: string;
  name: string;
  client_id: string | null;
}

interface Tax {
  id: string;
  name: string;
  rate: number;
  is_default: boolean;
}

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  client_id: string | null;
  project_id: string | null;
  clients: {
    name: string;
    first_name?: string | null;
    last_name?: string | null;
    avatar_color?: string | null;
    logo_url?: string | null;
    company?: string | null;
    currency?: string | null;
  } | null;
  projects: { name: string } | null;
  notes?: string | null;
  paid_date?: string | null;
  payment_method?: string | null;
  created_at: string;
}

export default function Invoices() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTaxId, setSelectedTaxId] = useState<string>('');
  const [createClientId, setCreateClientId] = useState<string>('');
  const [createProjectId, setCreateProjectId] = useState<string>('');
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters
  type DateRangePreset = 'all' | 'this_week' | 'this_month' | 'last_90' | 'custom';
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [filterClientId, setFilterClientId] = useState<string>('all');
  const [filterProjectId, setFilterProjectId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [profileCurrency, setProfileCurrency] = useState<string | null>(null);
  const [profileCurrencyDisplay, setProfileCurrencyDisplay] = useState<string | null>(null);
  const [invoiceSetupMissing, setInvoiceSetupMissing] = useState<string[] | null>(null);
  const [markPaidInvoice, setMarkPaidInvoice] = useState<Invoice | null>(null);
  const [sendReceiptInvoice, setSendReceiptInvoice] = useState<Invoice | null>(null);
  const [invoiceCreateDefaults, setInvoiceCreateDefaults] = useState<{
    invoice_notes_default: string | null;
    invoice_footer: string | null;
    invoice_bank_details_default: string | null;
  } | null>(null);
  const { dateFormat } = useLocalePreferences();
  const [createClientDialogOpen, setCreateClientDialogOpen] = useState(false);
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);

  useEffect(() => {
    if (!isDialogOpen || !user) {
      setInvoiceSetupMissing(null);
      setInvoiceCreateDefaults(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('business_name, business_email, business_phone, business_street, business_city, business_country, business_address, tax_id, invoice_notes_default, invoice_footer, invoice_bank_details_default')
        .eq('user_id', user.id)
        .maybeSingle();
      const missing: string[] = [];
      if (!(data?.business_name ?? '').trim()) missing.push('Business name');
      if (!(data?.business_email ?? '').trim()) missing.push('Business email');
      const hasAddress = !!((data?.business_address ?? '').trim()) || (!!((data?.business_street ?? '').trim()) && !!((data?.business_city ?? '').trim()) && !!((data?.business_country ?? '').trim()));
      if (!hasAddress) missing.push('Business address');
      if (!(data?.invoice_bank_details_default ?? '').trim()) missing.push('Default bank/payment details (Invoice Settings)');
      setInvoiceCreateDefaults({
        invoice_notes_default: data?.invoice_notes_default ?? null,
        invoice_footer: data?.invoice_footer ?? null,
        invoice_bank_details_default: data?.invoice_bank_details_default ?? null,
      });
      setInvoiceSetupMissing(missing);
    })();
  }, [isDialogOpen, user]);


  useEffect(() => {
    if (user) {
      fetchInvoices();
      fetchClients();
      fetchProjects();
      fetchTaxes();
      (async () => {
        const { data } = await supabase.from('profiles').select('currency, currency_display').eq('user_id', user.id).maybeSingle();
        if (data) {
          setProfileCurrency(data.currency ?? null);
          setProfileCurrencyDisplay(data.currency_display ?? null);
        }
      })();
    }
  }, [user]);

  // Open New Invoice dialog with project pre-selected when coming from approved review (e.g. notification or review detail CTA)
  useEffect(() => {
    const projectId = searchParams.get('project_id');
    const fromReview = searchParams.get('from_review') === '1';
    const clientId = searchParams.get('client');
    if (projectId && fromReview && projects.length > 0 && user) {
      const project = projects.find((p) => p.id === projectId);
      if (!project) return;
      setCreateClientId(project.client_id || '');
      setCreateProjectId(projectId);
      setIsDialogOpen(true);
      setSearchParams({}, { replace: true });
      return;
    }
    if (clientId && clients.length > 0) {
      const exists = clients.some((c) => c.id === clientId);
      if (!exists) return;
      setCreateClientId(clientId);
      setCreateProjectId('');
      setIsDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, projects, clients, user, setSearchParams]);

  const fmt = (amount: number) => formatCurrency(amount, profileCurrency, profileCurrencyDisplay);
  const fmtForClient = (amount: number, clientCurrency?: string | null) =>
    formatCurrency(amount, clientCurrency || profileCurrency, profileCurrencyDisplay);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          clients(name, first_name, last_name, avatar_color, logo_url, company, currency),
          projects(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, company, currency, email')
        .is('archived_at', null)
        .order('name');
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client_id')
        .order('name');
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
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

  const getNextInvoiceNumber = async (): Promise<string> => {
    const { data, error } = await supabase.rpc('next_invoice_number', { p_user_id: user!.id });
    if (!error && typeof data === 'string' && data.trim()) return data;
    return `INV-${new Date().getFullYear()}${String(Date.now()).slice(-6)}`;
  };

  const projectsForCreateClient = createClientId
    ? projects.filter((p) => p.client_id === createClientId)
    : projects;

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const issueDate = (formData.get('issue_date') as string)?.trim() || null;
    const dueDate = (formData.get('due_date') as string)?.trim() || null;
    if (!issueDate || !dueDate) {
      toast({
        title: 'Issue date and due date are required',
        variant: 'destructive',
      });
      return;
    }

    const normalizeOptionalId = (value: string | null | undefined): string | null => {
      const trimmed = value?.trim();
      if (!trimmed || trimmed.toLowerCase() === 'none') return null;
      return trimmed;
    };
    const selectedTax = taxes.find(t => t.id === selectedTaxId);
    const clientId = normalizeOptionalId(createClientId || (formData.get('client_id') as string) || null);
    const projectId = normalizeOptionalId(createProjectId || (formData.get('project_id') as string) || null);
    let invoiceNumber: string;
    try {
      invoiceNumber = await getNextInvoiceNumber();
    } catch {
      invoiceNumber = `INV-${new Date().getFullYear()}${String(Date.now()).slice(-6)}`;
    }
    const invoiceData = {
      invoice_number: invoiceNumber,
      client_id: clientId,
      project_id: projectId,
      issue_date: issueDate,
      due_date: dueDate,
      status: 'draft',
      notes: invoiceCreateDefaults?.invoice_notes_default?.trim() || null,
      invoice_footer: invoiceCreateDefaults?.invoice_footer?.trim() || null,
      bank_details: invoiceCreateDefaults?.invoice_bank_details_default?.trim() || null,
      subtotal: 0,
      tax_rate: selectedTax?.rate || 0,
      tax_amount: 0,
      total: 0,
      user_id: user!.id,
    };

    try {
      const { data, error } = await supabase
        .from('invoices')
        .insert(invoiceData)
        .select()
        .single();
        
      if (error) throw error;
      
      toast({ title: 'Invoice created' });
      notifyStartGuideRefresh();
      setIsDialogOpen(false);
      setCreateProjectId('');
      navigate(`/invoices/${data.id}`);
    } catch (error: any) {
      toast({
        title: 'Error creating invoice',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    if (status === 'paid') {
      const inv = invoices.find((row) => row.id === id);
      if (inv) setMarkPaidInvoice(inv);
      return;
    }
    try {
      const currentStatus = invoices.find((inv) => inv.id === id)?.status;
      const { error } = await supabase
        .from('invoices')
        .update({
          status,
          ...(currentStatus === 'paid' && status !== 'paid' ? { paid_date: null, payment_method: null } : {}),
        })
        .eq('id', id);
      if (error) throw error;
      if (currentStatus === 'paid') {
        await supabase
          .from('time_entries')
          .update({ billing_status: 'billed' })
          .eq('invoice_id', id)
          .eq('billing_status', 'paid');
      }
      toast({ title: `Invoice marked as ${status}` });
      fetchInvoices();
    } catch (error: any) {
      toast({
        title: 'Error updating invoice',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleMarkPaidConfirm = async (input: MarkInvoicePaidInput) => {
    if (!markPaidInvoice) return;
    try {
      await markInvoicePaid(supabase, markPaidInvoice.id, input);
      toast({ title: 'Invoice marked as paid' });
      await fetchInvoices();
      setSendReceiptInvoice(markPaidInvoice);
      setMarkPaidInvoice(null);
    } catch (error: any) {
      toast({
        title: 'Error updating invoice',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleReopenInvoice = async (inv: (typeof invoices)[0]) => {
    const paidOn = formatLocaleDate(inv.paid_date ?? undefined, dateFormat);
    const method = formatInvoicePaymentMethod(inv.payment_method);
    const paidDetails = [paidOn && `paid on ${paidOn}`, method && `via ${method}`].filter(Boolean).join(' ');
    const msg = paidDetails
      ? `Reopen invoice ${inv.invoice_number}? It was marked ${paidDetails}.`
      : `Reopen invoice ${inv.invoice_number}? It will show as sent again.`;
    if (!window.confirm(msg)) return;
    try {
      await reopenPaidInvoice(supabase, inv.id);
      toast({ title: 'Invoice reopened' });
      fetchInvoices();
    } catch (error: any) {
      toast({
        title: 'Could not reopen invoice',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this invoice?')) return;
    
    try {
      await supabase
        .from('time_entries')
        .update({ billing_status: 'unbilled', invoice_id: null })
        .eq('invoice_id', id)
        .in('billing_status', ['billed', 'paid']);
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Invoice deleted' });
      fetchInvoices();
    } catch (error: any) {
      toast({
        title: 'Error deleting invoice',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.clients?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    const created = parseISO(inv.created_at);
    if (dateRangePreset !== 'all') {
      const now = new Date();
      if (dateRangePreset === 'this_week') {
        if (created < startOfWeek(now) || created > endOfWeek(now)) return false;
      } else if (dateRangePreset === 'this_month') {
        if (created < startOfMonth(now) || created > endOfMonth(now)) return false;
      } else if (dateRangePreset === 'last_90') {
        if (created < subDays(now, 90)) return false;
      } else if (dateRangePreset === 'custom') {
        if (dateFrom && created < parseISO(dateFrom)) return false;
        if (dateTo && created > parseISO(dateTo + 'T23:59:59')) return false;
      }
    }
    if (filterClientId !== 'all' && inv.client_id !== filterClientId) return false;
    if (filterProjectId !== 'all' && inv.project_id !== filterProjectId) return false;
    if (filterStatus !== 'all' && inv.status !== filterStatus) return false;
    return true;
  });
  const activeFilterCount =
    (dateRangePreset !== 'all' ? 1 : 0) +
    (filterClientId !== 'all' ? 1 : 0) +
    (filterProjectId !== 'all' ? 1 : 0) +
    (filterStatus !== 'all' ? 1 : 0);

  const invoiceSortComparators = useMemo(
    () => ({
      invoice: (a: Invoice, b: Invoice) => compareStrings(a.invoice_number, b.invoice_number),
      client: (a: Invoice, b: Invoice) =>
        compareStrings(a.clients?.name ?? '', b.clients?.name ?? ''),
      issued: (a: Invoice, b: Invoice) => compareDates(a.issue_date, b.issue_date),
      due: (a: Invoice, b: Invoice) => compareDates(a.due_date, b.due_date),
      status: (a: Invoice, b: Invoice) => compareStrings(a.status ?? '', b.status ?? ''),
      amount: (a: Invoice, b: Invoice) =>
        compareNullableNumbers(Number(a.total), Number(b.total)),
    }),
    [],
  );

  const invoiceSort = useTableSort(filteredInvoices, invoiceSortComparators);
  const invoicesPagination = usePagination(invoiceSort.sortedItems);

  const duplicateInvoice = async (invoice: Invoice) => {
    if (!user) return;
    try {
      const invoiceNumber = await getNextInvoiceNumber();
      const { data: source, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoice.id)
        .single();
      if (fetchError || !source) throw fetchError ?? new Error('Invoice not found');

      const { data: items } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id)
        .order('created_at');

      const { data: copy, error: insertError } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          client_id: source.client_id,
          project_id: source.project_id,
          invoice_number: invoiceNumber,
          issue_date: source.issue_date,
          due_date: source.due_date,
          status: 'draft',
          notes: source.notes,
          invoice_footer: source.invoice_footer,
          bank_details: source.bank_details,
          subtotal: source.subtotal,
          tax_rate: source.tax_rate,
          tax_amount: source.tax_amount,
          total: source.total,
          paid_date: null,
          payment_method: null,
        })
        .select('id')
        .single();

      if (insertError || !copy) throw insertError ?? new Error('Could not duplicate');

      if (items?.length) {
        const { error: itemsError } = await supabase.from('invoice_items').insert(
          items.map((row) => ({
            invoice_id: copy.id,
            description: row.description,
            quantity: row.quantity,
            unit_price: row.unit_price,
            amount: row.amount,
            line_date: row.line_date,
            line_description: row.line_description,
          })),
        );
        if (itemsError) {
          toast({
            title: 'Invoice duplicated without line items',
            description: itemsError.message,
            variant: 'destructive',
          });
        }
      }

      toast({ title: 'Invoice duplicated' });
      fetchInvoices();
      navigate(`/invoices/${copy.id}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not duplicate invoice';
      toast({ title: 'Could not duplicate', description: message, variant: 'destructive' });
    }
  };

  const handleDownloadTemplate = () => {
    downloadCsv('invoices_template.csv', getInvoicesTemplateRows());
    toast({ title: 'Template downloaded' });
  };

  const handleExportCsv = () => {
    const rows = [
      INVOICES_CSV_HEADERS,
      ...filteredInvoices.map((inv) => [
        inv.invoice_number,
        inv.issue_date,
        inv.due_date ?? '',
        inv.status ?? '',
        inv.clients?.name ?? inv.clients?.company ?? '',
        inv.projects?.name ?? '',
        inv.notes ?? '',
        inv.subtotal ?? '',
        inv.tax_rate ?? '',
        inv.tax_amount ?? '',
        inv.total ?? '',
        '', // line_description
        '', // quantity
        '', // unit_price
        '', // amount
      ]),
    ];
    downloadCsv(`invoices_export_${format(new Date(), 'yyyy-MM-dd')}.csv`, rows);
    toast({ title: `Exported ${filteredInvoices.length} invoices` });
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setImporting(true);
    try {
      const rows = await parseCsv(file);
      if (rows.length < 2) {
        toast({ title: 'No data rows in file', variant: 'destructive' });
        return;
      }
      const header = rows[0].map((h) => h.toLowerCase().replace(/\s/g, '_'));
      const dataRows = rows.slice(1);
      const invoiceNumberIdx = header.indexOf('invoice_number');
      const issueDateIdx = header.indexOf('issue_date');
      const dueDateIdx = header.indexOf('due_date');
      const statusIdx = header.indexOf('status');
      const clientNameIdx = header.indexOf('client_name');
      const projectNameIdx = header.indexOf('project_name');
      const notesIdx = header.indexOf('notes');
      const subtotalIdx = header.indexOf('subtotal');
      const taxRateIdx = header.indexOf('tax_rate');
      const taxAmountIdx = header.indexOf('tax_amount');
      const totalIdx = header.indexOf('total');
      const lineDescIdx = header.indexOf('line_description');
      const quantityIdx = header.indexOf('quantity');
      const unitPriceIdx = header.indexOf('unit_price');
      const amountIdx = header.indexOf('amount');
      if (invoiceNumberIdx === -1 || issueDateIdx === -1) {
        toast({ title: 'CSV must have invoice_number and issue_date columns', variant: 'destructive' });
        return;
      }
      const defaultTax = taxes[0];
      const parseNum = (val: string | undefined): number => {
        if (val === undefined || val === null || val === '') return 0;
        const n = Number(String(val).replace(/,/g, '').trim());
        return Number.isFinite(n) ? n : 0;
      };
      const normalizeStatus = (s: string): string => {
        const lower = (s || 'draft').trim().toLowerCase();
        if (['draft', 'sent', 'paid', 'overdue'].includes(lower)) return lower;
        if (lower === 'completed') return 'paid';
        if (lower === 'in progress' || lower === 'in_progress') return 'sent';
        return lower || 'draft';
      };
      let created = 0;
      for (const row of dataRows) {
        const invoiceNumber = row[invoiceNumberIdx]?.trim();
        const issueDate = row[issueDateIdx]?.trim();
        if (!invoiceNumber || !issueDate) continue;
        let clientId: string | null = null;
        const clientName = clientNameIdx >= 0 ? row[clientNameIdx]?.trim() : '';
        if (clientName) {
          const key = clientName.toLowerCase().trim();
          const client = clients.find(
            (c) =>
              (c.name && c.name.trim().toLowerCase() === key) ||
              (c.company && c.company.trim().toLowerCase() === key)
          );
          clientId = client?.id ?? null;
        }
        let projectId: string | null = null;
        const projectName = projectNameIdx >= 0 ? row[projectNameIdx]?.trim() : '';
        if (projectName) {
          const project = projects.find((p) => p.name === projectName);
          projectId = project?.id ?? null;
        }
        const dueDate = dueDateIdx >= 0 ? row[dueDateIdx]?.trim() || null : null;
        const rawStatus = statusIdx >= 0 ? row[statusIdx]?.trim() : 'draft';
        const status = normalizeStatus(rawStatus);
        const notes = notesIdx >= 0 ? row[notesIdx]?.trim() || null : null;
        const subtotal = subtotalIdx >= 0 ? parseNum(row[subtotalIdx]) : 0;
        const taxRate = taxRateIdx >= 0 ? parseNum(row[taxRateIdx]) : (defaultTax?.rate ?? 0);
        const taxAmount = taxAmountIdx >= 0 ? parseNum(row[taxAmountIdx]) : 0;
        const total = totalIdx >= 0 ? parseNum(row[totalIdx]) : 0;
        const lineDescription = lineDescIdx >= 0 ? row[lineDescIdx]?.trim() || null : null;
        const quantity = quantityIdx >= 0 ? parseNum(row[quantityIdx]) : null;
        const unitPrice = unitPriceIdx >= 0 ? parseNum(row[unitPriceIdx]) : 0;
        const lineAmount = amountIdx >= 0 ? parseNum(row[amountIdx]) : 0;
        const { data: inserted, error } = await supabase
          .from('invoices')
          .insert({
            invoice_number: invoiceNumber,
            issue_date: issueDate,
            due_date: dueDate || null,
            status,
            client_id: clientId,
            project_id: projectId,
            notes,
            subtotal,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            total,
            user_id: user.id,
          })
          .select('id')
          .single();
        if (error) continue;
        created++;
        const hasLineItem =
          (lineDescription && lineDescription.length > 0) ||
          (lineAmount > 0) ||
          (quantity != null && quantity > 0) ||
          unitPrice > 0;
        if (inserted?.id && hasLineItem) {
          const desc = lineDescription || 'Line item';
          const qty = quantity != null && quantity > 0 ? quantity : 1;
          const up = unitPrice > 0 ? unitPrice : lineAmount / (qty || 1);
          const amt = lineAmount > 0 ? lineAmount : up * qty;
          await supabase.from('invoice_items').insert({
            invoice_id: inserted.id,
            description: desc,
            quantity: qty,
            unit_price: up,
            amount: amt,
          });
        }
      }
      setImportDialogOpen(false);
      if (importFileInputRef.current) importFileInputRef.current.value = '';
      toast({ title: `Imported ${created} invoices` });
      fetchInvoices();
    } catch (err: any) {
      toast({ title: 'Import failed', description: err?.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const invoiceSummary = useMemo(() => {
    const totalAmount = filteredInvoices.reduce((sum, i) => sum + Number(i.total), 0);
    const paidInvoices = filteredInvoices.filter((i) => i.status === 'paid');
    const pendingInvoices = filteredInvoices.filter((i) => ['sent', 'draft'].includes(i.status));
    const overdueInvoices = filteredInvoices.filter((i) => i.status === 'overdue');
    const sentCount = filteredInvoices.filter((i) => i.status === 'sent').length;
    const paidAmount = paidInvoices.reduce((sum, i) => sum + Number(i.total), 0);
    const pendingAmount = pendingInvoices.reduce((sum, i) => sum + Number(i.total), 0);
    const overdueAmount = overdueInvoices.reduce((sum, i) => sum + Number(i.total), 0);
    const count = filteredInvoices.length;
    return {
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount,
      count,
      sentCount,
      overdueCount: overdueInvoices.length,
      collectedPct: totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0,
    };
  }, [filteredInvoices]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <PageBreadcrumb items={listPageBreadcrumb('Invoices')} />
            <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" title="Template, export, or import CSV">
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCsv} disabled={filteredInvoices.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setImportDialogOpen(true)} disabled={importing}>
                  <Upload className="h-4 w-4 mr-2" />
                  {importing ? 'Importing…' : 'Import'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              if (!open) {
                setCreateProjectId('');
                setCreateClientDialogOpen(false);
                setCreateProjectDialogOpen(false);
              }
              setIsDialogOpen(open);
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Invoice
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Invoice</DialogTitle>
                <DialogDescription>
                  Start a new invoice
                </DialogDescription>
              </DialogHeader>
              {invoiceSetupMissing && invoiceSetupMissing.length > 0 && (
                <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-200 [&_svg]:text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Complete your setup first</AlertTitle>
                  <AlertDescription>
                    <span className="block mb-2">These fields appear on your invoice but are not set yet:</span>
                    <ul className="list-disc list-inside text-sm mb-2">
                      {invoiceSetupMissing.map((label) => (
                        <li key={label}>{label}</li>
                      ))}
                    </ul>
                    <span className="block text-sm">
                      <Link to="/settings/invoices" className="font-medium underline hover:no-underline" onClick={() => setIsDialogOpen(false)}>Invoice Settings</Link>
                    </span>
                  </AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="client_id">Client</Label>
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-sm"
                      onClick={() => setCreateClientDialogOpen(true)}
                    >
                      Create new client
                    </Button>
                  </div>
                  <Select
                    name="client_id"
                    value={createClientId || 'none'}
                    onValueChange={(v) => setCreateClientId(v === 'none' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No client</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="project_id">Project (optional)</Label>
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-sm"
                      onClick={() => setCreateProjectDialogOpen(true)}
                    >
                      Create new project
                    </Button>
                  </div>
                  <Select
                    name="project_id"
                    value={createProjectId || 'none'}
                    onValueChange={(v) => setCreateProjectId(v === 'none' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {projectsForCreateClient.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {createClientId
                      ? projectsForCreateClient.length === 0
                        ? "No projects for this client. You can assign a client to a project in Projects."
                        : "Only projects for this client are shown. You can change a project's client in Projects."
                      : "Select a client to see their projects."}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax">Tax Rate</Label>
                  <Select
                    value={selectedTaxId || 'none'}
                    onValueChange={(v) => setSelectedTaxId(v === 'none' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tax rate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No tax</SelectItem>
                      {taxes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.rate}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {taxes.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      <Link to="/settings/invoices" className="text-primary hover:underline">Add tax rates in Invoice Settings</Link>
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="issue_date">Issue Date</Label>
                    <Input
                      id="issue_date"
                      name="issue_date"
                      type="date"
                      defaultValue={format(new Date(), 'yyyy-MM-dd')}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      name="due_date"
                      type="date"
                      defaultValue={format(addDays(new Date(), 30), 'yyyy-MM-dd')}
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Invoice</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <ClientFormDialog
            open={createClientDialogOpen}
            onOpenChange={setCreateClientDialogOpen}
            onSaved={(client) => {
              setClients((prev) =>
                [...prev.filter((item) => item.id !== client.id), client].sort((a, b) =>
                  a.name.localeCompare(b.name),
                ),
              );
              setCreateClientId(client.id);
              setCreateProjectId('');
            }}
          />
          <ProjectFormDialog
            open={createProjectDialogOpen}
            onOpenChange={setCreateProjectDialogOpen}
            clients={clients}
            initialClientId={createClientId || null}
            onSaved={(project) => {
              setProjects((prev) =>
                [
                  ...prev.filter((item) => item.id !== project.id),
                  { id: project.id, name: project.name, client_id: project.client_id },
                ].sort((a, b) => a.name.localeCompare(b.name)),
              );
              setCreateProjectId(project.id);
              if (project.client_id) setCreateClientId(project.client_id);
            }}
            onClientSaved={(client) => {
              setClients((prev) =>
                [...prev.filter((item) => item.id !== client.id), client].sort((a, b) =>
                  a.name.localeCompare(b.name),
                ),
              );
              setCreateClientId(client.id);
            }}
          />
          </div>
        </div>

        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import invoices from CSV</DialogTitle>
              <DialogDescription>
                Upload a CSV with columns: invoice_number, issue_date, due_date, status, client_name, project_name, notes. Use the template for the correct format.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <input
                ref={importFileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImportCsv}
              />
              <Button
                variant="outline"
                className="w-full"
                disabled={importing}
                onClick={() => importFileInputRef.current?.click()}
              >
                {importing ? 'Importing…' : 'Choose CSV file'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <PageSummaryBar columns={4}>
          <PageSummaryStat
            label="Total invoiced"
            value={fmt(invoiceSummary.totalAmount)}
            subtitle={`${invoiceSummary.count} invoice${invoiceSummary.count === 1 ? '' : 's'}`}
            hideDot
          />
          <PageSummaryStat
            label="Paid"
            value={fmt(invoiceSummary.paidAmount)}
            subtitle={`${invoiceSummary.collectedPct}% collected`}
            status="paid"
          />
          <PageSummaryStat
            label="Pending"
            value={fmt(invoiceSummary.pendingAmount)}
            subtitle={`${invoiceSummary.sentCount} sent`}
            dotClassName="bg-amber-500"
          />
          <PageSummaryStat
            label="Overdue"
            value={fmt(invoiceSummary.overdueAmount)}
            subtitle={`${invoiceSummary.overdueCount} overdue`}
            status="rejected"
          />
        </PageSummaryBar>

        {/* Search + Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PageSearchInput
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="relative h-8 w-8 p-0 ml-auto" aria-label="Filters">
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 ? (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                    {activeFilterCount}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-4" align="end">
              <div className="space-y-3">
                <Select value={dateRangePreset} onValueChange={(v) => setDateRangePreset(v as DateRangePreset)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="this_week">This week</SelectItem>
                    <SelectItem value="this_month">This month</SelectItem>
                    <SelectItem value="last_90">Last 90 days</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                {dateRangePreset === 'custom' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                  </div>
                ) : null}
                <Select value={filterClientId} onValueChange={setFilterClientId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All clients</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterProjectId} onValueChange={setFilterProjectId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                {activeFilterCount > 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full"
                    onClick={() => {
                      setDateRangePreset('all');
                      setDateFrom('');
                      setDateTo('');
                      setFilterClientId('all');
                      setFilterProjectId('all');
                      setFilterStatus('all');
                    }}
                  >
                    Reset filters
                  </Button>
                ) : null}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Invoices Table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col p-0">
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold mb-1">No invoices yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first invoice to get started
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Invoice
                </Button>
              </div>
            ) : (
              <DataTableFrame>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <SortableTableHead label="Invoice" sortKey="invoice" sort={invoiceSort} />
                    <SortableTableHead label="Client" sortKey="client" sort={invoiceSort} />
                    <SortableTableHead label="Issued" sortKey="issued" sort={invoiceSort} />
                    <SortableTableHead label="Due" sortKey="due" sort={invoiceSort} />
                    <SortableTableHead label="Status" sortKey="status" sort={invoiceSort} />
                    <SortableTableHead label="Amount" sortKey="amount" sort={invoiceSort} align="right" className="text-right" />
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesPagination.paginatedItems.map((invoice) => (
                    <TableRow
                      key={invoice.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                    >
                      <TableCell className="font-semibold">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>
                        <TableClientCell client={invoice.clients} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatLocaleDate(invoice.issue_date, dateFormat)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatLocaleDate(invoice.due_date, dateFormat)}
                      </TableCell>
                      <TableCell>
                        <TableStatusBadge status={invoice.status || 'draft'} />
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {fmtForClient(Number(invoice.total), invoice.clients?.currency)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <MenuDotsTrigger />
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/invoices/${invoice.id}`)}>
                              <SlotIcon slot="action_edit" className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                void duplicateInvoice(invoice);
                              }}
                            >
                              <SlotIcon slot="action_duplicate" className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            {invoice.status === 'draft' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'sent')}>
                                <SlotIcon slot="action_send" className="mr-2" />
                                Mark as Sent
                              </DropdownMenuItem>
                            )}
                            {invoice.status === 'sent' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'paid')}>
                                <SlotIcon slot="invoice_stat_paid" className="mr-2 h-4 w-4" />
                                Mark as Paid
                              </DropdownMenuItem>
                            )}
                            {invoice.status === 'paid' && (
                              <DropdownMenuItem onClick={() => handleReopenInvoice(invoice)}>
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Reopen invoice
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDelete(invoice.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                total={invoicesPagination.total}
                page={invoicesPagination.page}
                pageSize={invoicesPagination.pageSize}
                from={invoicesPagination.from}
                to={invoicesPagination.to}
                pageSizeOptions={invoicesPagination.pageSizeOptions}
                showPageSizeSelect={invoicesPagination.showPageSizeSelect}
                onPageChange={invoicesPagination.setPage}
                onPageSizeChange={invoicesPagination.setPageSize}
              />
              </DataTableFrame>
            )}
          </CardContent>
        </Card>
      </div>
      <MarkInvoicePaidDialog
        open={!!markPaidInvoice}
        onOpenChange={(open) => {
          if (!open) setMarkPaidInvoice(null);
        }}
        invoiceNumber={markPaidInvoice?.invoice_number}
        onConfirm={handleMarkPaidConfirm}
      />
      <SendReceiptPromptDialog
        open={!!sendReceiptInvoice}
        onOpenChange={(open) => {
          if (!open) setSendReceiptInvoice(null);
        }}
        invoiceNumber={sendReceiptInvoice?.invoice_number}
        onSendReceipt={() => {
          if (!sendReceiptInvoice) return;
          navigate(`/invoices/${sendReceiptInvoice.id}?sendReceipt=1`);
          setSendReceiptInvoice(null);
        }}
      />
    </AppLayout>
  );
}
