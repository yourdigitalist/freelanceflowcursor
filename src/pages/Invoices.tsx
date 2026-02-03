import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AppLayout } from '@/components/layout/AppLayout';
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
import { Plus, Search, FileText, DollarSign, Calendar, MoreVertical, Pencil, Trash2, Send, Clock, Download, Upload } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, parseISO } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  downloadCsv,
  parseCsv,
  getInvoicesTemplateRows,
  INVOICES_CSV_HEADERS,
} from '@/lib/csv';

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
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
  clients: { name: string } | null;
  projects: { name: string } | null;
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

  useEffect(() => {
    if (user) {
      fetchInvoices();
      fetchClients();
      fetchProjects();
      fetchTaxes();
    }
  }, [user]);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          clients(name),
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
        .select('id, name')
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
        .select('id, name')
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

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}-${random}`;
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const selectedTax = taxes.find(t => t.id === selectedTaxId);
    
    const invoiceData = {
      invoice_number: generateInvoiceNumber(),
      client_id: (formData.get('client_id') as string) || null,
      project_id: (formData.get('project_id') as string) || null,
      issue_date: formData.get('issue_date') as string,
      due_date: (formData.get('due_date') as string) || null,
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
      setIsDialogOpen(false);
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
        inv.clients?.name ?? '',
        inv.projects?.name ?? '',
        inv.notes ?? '',
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
      if (invoiceNumberIdx === -1 || issueDateIdx === -1) {
        toast({ title: 'CSV must have invoice_number and issue_date columns', variant: 'destructive' });
        return;
      }
      const defaultTax = taxes[0];
      let created = 0;
      for (const row of dataRows) {
        const invoiceNumber = row[invoiceNumberIdx]?.trim();
        const issueDate = row[issueDateIdx]?.trim();
        if (!invoiceNumber || !issueDate) continue;
        let clientId: string | null = null;
        const clientName = clientNameIdx >= 0 ? row[clientNameIdx]?.trim() : '';
        if (clientName) {
          const client = clients.find((c) => c.name === clientName);
          clientId = client?.id ?? null;
        }
        let projectId: string | null = null;
        const projectName = projectNameIdx >= 0 ? row[projectNameIdx]?.trim() : '';
        if (projectName) {
          const project = projects.find((p) => p.name === projectName);
          projectId = project?.id ?? null;
        }
        const dueDate = dueDateIdx >= 0 ? row[dueDateIdx]?.trim() || null : null;
        const status = (statusIdx >= 0 ? row[statusIdx]?.trim() : 'draft') || 'draft';
        const notes = notesIdx >= 0 ? row[notesIdx]?.trim() || null : null;
        const { error } = await supabase.from('invoices').insert({
          invoice_number: invoiceNumber,
          issue_date: issueDate,
          due_date: dueDate || null,
          status: status,
          client_id: clientId,
          project_id: projectId,
          notes,
          subtotal: 0,
          tax_rate: defaultTax?.rate ?? 0,
          tax_amount: 0,
          total: 0,
          user_id: user.id,
        });
        if (!error) created++;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-success/10 text-success';
      case 'sent':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
      case 'draft':
        return 'bg-muted text-muted-foreground';
      case 'overdue':
        return 'bg-destructive/10 text-destructive';
      case 'cancelled':
        return 'bg-muted text-muted-foreground line-through';
      default:
        return 'bg-muted text-muted-foreground';
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
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  CSV
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadTemplate}>
                  Download template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCsv}>
                  Export CSV {filteredInvoices.length > 0 ? `(${filteredInvoices.length})` : ''}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client_id">Client</Label>
                  <Select name="client_id">
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project_id">Project (optional)</Label>
                  <Select name="project_id">
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Invoiced</p>
                  <p className="text-2xl font-bold">${stats.total.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <DollarSign className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Paid</p>
                  <p className="text-2xl font-bold">${stats.paid.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-warning/10">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">${stats.pending.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-destructive/10">
                  <Calendar className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold">${stats.overdue.toLocaleString()}</p>
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
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
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
                        ${Number(invoice.total).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status}
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
                              <Pencil className="mr-2 h-4 w-4" />
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
                                <DollarSign className="mr-2 h-4 w-4" />
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
