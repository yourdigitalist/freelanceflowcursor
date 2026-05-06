import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { notifyStartGuideRefresh } from '@/components/layout/StartGuide';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, MoreVertical, Trash2, Send, Download, Upload } from '@/components/icons';
import { SlotIcon } from '@/contexts/IconSlotContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, parseISO, addDays } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from '@/components/icons';
import {
  downloadCsv,
  parseCsv,
  getInvoicesTemplateRows,
  INVOICES_CSV_HEADERS,
} from '@/lib/csv';
import { formatCurrency } from '@/lib/locale-data';

interface Client {
  id: string;
  name: string;
  company?: string | null;
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
  clients: { name: string; company?: string | null } | null;
  projects: { name: string } | null;
  notes?: string | null;
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

  useEffect(() => {
    if (!isDialogOpen || !user) {
      setInvoiceSetupMissing(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('business_name, business_email, business_phone, business_street, business_city, business_country, business_address, bank_name, bank_routing_number, bank_account_number, tax_id')
        .eq('user_id', user.id)
        .maybeSingle();
      const missing: string[] = [];
      if (!(data?.business_name ?? '').trim()) missing.push('Business name');
      if (!(data?.business_email ?? '').trim()) missing.push('Business email');
      const hasAddress = !!((data?.business_address ?? '').trim()) || (!!((data?.business_street ?? '').trim()) && !!((data?.business_city ?? '').trim()) && !!((data?.business_country ?? '').trim()));
      if (!hasAddress) missing.push('Business address');
      if (!(data?.bank_name ?? '').trim()) missing.push('Bank name');
      if (!(data?.bank_routing_number ?? '').trim()) missing.push('Routing number');
      if (!(data?.bank_account_number ?? '').trim()) missing.push('Account number');
      setInvoiceSetupMissing(missing);
    })();
  }, [isDialogOpen, user]);

  const getInvoiceStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-success/10 text-success border-success/20';
      case 'sent':
        return 'bg-muted text-muted-foreground border-muted';
      case 'draft':
        return 'bg-warning/10 text-warning border-warning/20';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  };

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
    if (!projectId || !fromReview || projects.length === 0 || !user) return;
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    setCreateClientId(project.client_id || '');
    setCreateProjectId(projectId);
    setIsDialogOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, projects, user]);

  const fmt = (amount: number) => formatCurrency(amount, profileCurrency, profileCurrencyDisplay);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          clients(name, company),
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
        .select('id, name, company')
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
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('invoice_prefix, invoice_include_year, invoice_number_start, invoice_number_padding, invoice_number_reset_yearly, invoice_number_next, invoice_number_last_year')
      .eq('user_id', user!.id)
      .single();
    if (fetchError || !profile) return `INV-${new Date().getFullYear()}${String(Date.now()).slice(-6)}`;
    const currentYear = new Date().getFullYear();
    const start = Math.max(1, Number(profile.invoice_number_start) || 1);
    const padding = Math.min(6, Math.max(1, Number(profile.invoice_number_padding) || 4));
    const resetYearly = profile.invoice_number_reset_yearly !== false;
    const lastYear = profile.invoice_number_last_year ?? null;
    let next = Number(profile.invoice_number_next);
    let lastYearToSave = profile.invoice_number_last_year ?? currentYear;
    if (resetYearly && (lastYear === null || lastYear < currentYear)) {
      next = start;
      lastYearToSave = currentYear;
    } else if (!Number.isInteger(next) || next < start) {
      next = start;
    }
    const prefix = (profile.invoice_prefix ?? 'INV').trim();
    const includeYear = profile.invoice_include_year !== false;
    const formatted = prefix + (includeYear ? String(currentYear) : '') + String(next).padStart(padding, '0');
    await supabase
      .from('profiles')
      .update({ invoice_number_next: next + 1, invoice_number_last_year: lastYearToSave })
      .eq('user_id', user!.id);
    return formatted;
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
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
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

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this invoice?')) return;
    
    try {
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

  const stats = {
    total: filteredInvoices.reduce((sum, i) => sum + Number(i.total), 0),
    paid: filteredInvoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + Number(i.total), 0),
    pending: filteredInvoices.filter((i) => ['sent', 'draft'].includes(i.status)).reduce((sum, i) => sum + Number(i.total), 0),
    overdue: filteredInvoices.filter((i) => i.status === 'overdue').reduce((sum, i) => sum + Number(i.total), 0),
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
            <p className="text-muted-foreground">
              Create and manage invoices
            </p>
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
          <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) setCreateProjectId(''); setIsDialogOpen(open); }}>
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
                      <Link to="/settings/business" className="font-medium underline hover:no-underline" onClick={() => setIsDialogOpen(false)}>Company Settings</Link>
                      {' · '}
                      <Link to="/settings/invoices" className="font-medium underline hover:no-underline" onClick={() => setIsDialogOpen(false)}>Invoice Settings</Link>
                    </span>
                  </AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client_id">Client</Label>
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
                  <Label htmlFor="project_id">Project (optional)</Label>
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

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <SlotIcon slot="invoice_stat_total" className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Invoiced</p>
                  <p className="text-2xl font-bold">{fmt(stats.total)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <SlotIcon slot="invoice_stat_paid" className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Paid</p>
                  <p className="text-2xl font-bold">{fmt(stats.paid)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-warning/10">
                  <SlotIcon slot="invoice_stat_pending" className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{fmt(stats.pending)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-destructive/10">
                  <SlotIcon slot="invoice_stat_overdue" className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold">{fmt(stats.overdue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Select value={dateRangePreset} onValueChange={(v) => setDateRangePreset(v as DateRangePreset)}>
              <SelectTrigger className="w-[140px]">
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
          </div>
          {dateRangePreset === 'custom' && (
            <>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[140px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[140px]" />
              </div>
            </>
          )}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Client</Label>
            <Select value={filterClientId} onValueChange={setFilterClientId}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clients</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Project</Label>
            <Select value={filterProjectId} onValueChange={setFilterProjectId}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px]">
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
          </div>
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Invoices Table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <SlotIcon slot="invoice_empty" className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow
                      key={invoice.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                    >
                      <TableCell className="font-medium">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>
                        {invoice.clients?.name || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {format(new Date(invoice.issue_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : '—'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {fmt(Number(invoice.total))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getInvoiceStatusBadgeStyle(invoice.status || 'draft')}>
                          {(invoice.status || 'draft').charAt(0).toUpperCase() + (invoice.status || 'draft').slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/invoices/${invoice.id}`)}>
                              <SlotIcon slot="action_edit" className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            {invoice.status === 'draft' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'sent')}>
                                <Send className="mr-2 h-4 w-4" />
                                Mark as Sent
                              </DropdownMenuItem>
                            )}
                            {invoice.status === 'sent' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'paid')}>
                                <SlotIcon slot="invoice_stat_paid" className="mr-2 h-4 w-4" />
                                Mark as Paid
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
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
