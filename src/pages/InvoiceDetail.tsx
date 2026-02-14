import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useAuth } from '@/lib/auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Trash2, Send, DollarSign, Mail, Loader2, Eye, Clock, Printer, ListTodo, Wallet, Pencil, Download, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
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

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  paid_date?: string | null;
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
  invoice_notes_default: string | null;
  invoice_email_message_default: string | null;
  invoice_email_subject_default: string | null;
  reminder_enabled: boolean | null;
  reminder_subject_default: string | null;
  reminder_body_default: string | null;
}

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
  .invoice-preview-root .invoice-body .table thead tr th:nth-child(1) { width: 12%; }
  .invoice-preview-root .invoice-body .table thead tr th:nth-child(2) { width: 36%; }
  .invoice-preview-root .invoice-body .table thead tr th:nth-child(3) { width: 10%; text-align: right; }
  .invoice-preview-root .invoice-body .table thead tr th:nth-child(4) { width: 20%; text-align: right; }
  .invoice-preview-root .invoice-body .table thead tr th:nth-child(5) { width: 22%; text-align: right; }
  .invoice-preview-root .invoice-body .table tbody tr td { font-size: 13px; border: 1px solid #e5e5e5; text-align: left; padding: 10px 8px; background-color: #fff; word-wrap: break-word; color: #333; }
  .invoice-preview-root .invoice-body .table tbody tr td.text-right { text-align: right; }
  .invoice-preview-root .invoice-body .table tbody tr td small { font-size: 11px; color: #888; display: block; margin-top: 3px; }
  .invoice-preview-root .invoice-body .flex-table { display: flex; margin-top: 20px; }
  .invoice-preview-root .invoice-body .flex-table .flex-column { width: 100%; }
  .invoice-preview-root .invoice-body .flex-table .flex-column .table-subtotal { border-collapse: collapse; width: 100%; max-width: 350px; margin-left: auto; }
  .invoice-preview-root .invoice-body .flex-table .flex-column .table-subtotal tbody tr td { font-size: 13px; border-bottom: 1px solid #e5e5e5; text-align: left; padding: 8px 12px; background-color: #fff; }
  .invoice-preview-root .invoice-body .flex-table .flex-column .table-subtotal tbody tr td:nth-child(2) { text-align: right; font-weight: 500; }
  .invoice-preview-root .invoice-body .invoice-total-amount { margin-top: 12px; text-align: right; }
  .invoice-preview-root .invoice-body .invoice-total-amount p { font-weight: 700; color: #0F172A; font-size: 18px; }
  .invoice-preview-root .invoice-notes, .invoice-preview-root .invoice-bank-details { margin-top: 30px; padding: 16px; background-color: #f8f9fa; border-left: 3px solid #0F172A; }
  .invoice-preview-root .invoice-notes h3, .invoice-preview-root .invoice-bank-details h3 { font-size: 13px; color: #0F172A; margin-bottom: 8px; font-weight: 600; }
  .invoice-preview-root .invoice-notes p, .invoice-preview-root .invoice-bank-details p { font-size: 13px; color: #555; line-height: 1.6; white-space: pre-wrap; }
  .invoice-preview-root .invoice-footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #dcdcdc; }
  .invoice-preview-root .invoice-footer p { font-size: 12px; color: #888; text-align: center; line-height: 1.6; }
  @media print { .invoice-preview-root .table thead tr th { -webkit-print-color-adjust: exact; background-color: #f5f5f5 !important; } }
`;

interface Tax {
  id: string;
  name: string;
  rate: number;
  is_default: boolean;
}

interface UnbilledEntry {
  id: string;
  description: string | null;
  duration_minutes: number;
  hourly_rate: number | null;
  project_id: string;
  project_name: string;
  start_time: string;
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
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

  // Edit mode: draft starts editable; after save or when sent/paid, read-only until "Edit Invoice" is clicked
  const [isEditMode, setIsEditMode] = useState(true);
  
  // Import unbilled time entries modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [unbilledEntries, setUnbilledEntries] = useState<UnbilledEntry[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [defaultHourlyRate, setDefaultHourlyRate] = useState(75);
  const preloadedDefaultsRef = useRef<string | null>(null);

  useEffect(() => {
    if (user && id) {
      fetchInvoice();
      fetchItems();
      fetchProfile();
      fetchTaxes();
    }
  }, [user, id]);

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
      setBankDetails('');
    }
    preloadedDefaultsRef.current = invoice.id;
  }, [invoice?.id, invoice?.notes, (invoice as Invoice)?.invoice_footer, (invoice as Invoice)?.bank_details, profile?.invoice_notes_default, profile?.invoice_footer]);

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

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, company_name, business_name, business_logo, business_email, business_phone, business_address, business_street, business_street2, business_city, business_state, business_postal_code, business_country, tax_id, currency, currency_display, invoice_show_quantity, invoice_show_rate, invoice_show_line_description, invoice_show_line_date, invoice_footer, invoice_notes_default, invoice_email_message_default, invoice_email_subject_default, reminder_enabled, reminder_subject_default, reminder_body_default, hourly_rate')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) {
        console.error('Error fetching profile:', error);
        toast({ title: 'Could not load business details', description: 'Showing placeholder. You can still edit the invoice.', variant: 'destructive' });
        return;
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
          clients(name, email, phone, company, tax_id, street, city, state, postal_code, country),
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

  const fetchUnbilledEntries = async () => {
    if (!invoice?.client_id) {
      toast({
        title: 'No client selected',
        description: 'Please assign a client to this invoice first',
        variant: 'destructive',
      });
      return;
    }

    try {
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
      const projectMap = Object.fromEntries(clientProjects.map(p => [p.id, p.name]));

      // Get unbilled time entries for these projects
      const { data: entries, error: entriesError } = await supabase
        .from('time_entries')
        .select('id, description, duration_minutes, hourly_rate, project_id, start_time')
        .in('project_id', projectIds)
        .eq('billing_status', 'unbilled')
        .eq('billable', true)
        .order('project_id')
        .order('start_time');

      if (entriesError) throw entriesError;

      const entriesWithProjects = (entries || []).map(e => ({
        ...e,
        project_name: projectMap[e.project_id!] || 'Unknown'
      }));

      setUnbilledEntries(entriesWithProjects);
      setSelectedEntries(new Set(entriesWithProjects.map(e => e.id)));
      setIsImportModalOpen(true);
    } catch (error: any) {
      toast({
        title: 'Error fetching time entries',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const importSelectedEntries = async () => {
    const entriesToImport = unbilledEntries.filter(e => selectedEntries.has(e.id));
    
    if (entriesToImport.length === 0) {
      toast({
        title: 'No entries selected',
        description: 'Please select at least one time entry to import',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Group by project
      const groupedByProject = entriesToImport.reduce((acc, entry) => {
        if (!acc[entry.project_name]) {
          acc[entry.project_name] = [];
        }
        acc[entry.project_name].push(entry);
        return acc;
      }, {} as Record<string, UnbilledEntry[]>);

      // Create invoice items
      const newItems: any[] = [];
      for (const [projectName, entries] of Object.entries(groupedByProject)) {
        for (const entry of entries) {
          const hours = entry.duration_minutes / 60;
          const rate = entry.hourly_rate || defaultHourlyRate;
          newItems.push({
            invoice_id: id,
            description: `${projectName}: ${entry.description || 'Time entry from ' + format(new Date(entry.start_time), 'MMM d')}`,
            quantity: parseFloat(hours.toFixed(2)),
            unit_price: rate,
            amount: parseFloat((hours * rate).toFixed(2)),
          });
        }
      }

      const { data: insertedItems, error: insertError } = await supabase
        .from('invoice_items')
        .insert(newItems)
        .select();

      if (insertError) throw insertError;

      // Update time entries to mark as billed
      const { error: updateError } = await supabase
        .from('time_entries')
        .update({ 
          billing_status: 'billed',
          invoice_id: id 
        })
        .in('id', Array.from(selectedEntries));

      if (updateError) throw updateError;

      toast({ title: `Imported ${entriesToImport.length} time entries` });
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
      const { error } = await supabase
        .from('invoice_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
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
          notes,
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

  const markAsSent = async () => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', id);

      if (error) throw error;
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

  const markAsPaid = async () => {
    try {
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({ status: 'paid', paid_date: new Date().toISOString() })
        .eq('id', id);

      if (invoiceError) throw invoiceError;

      // Update linked time entries to paid
      const { error: entriesError } = await supabase
        .from('time_entries')
        .update({ billing_status: 'paid' })
        .eq('invoice_id', id);

      if (entriesError) throw entriesError;

      toast({ title: 'Invoice marked as paid' });
      fetchInvoice();
    } catch (error: any) {
      toast({
        title: 'Error updating invoice',
        description: error.message,
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

    setSendingInvoice(true);
    let sendResponse: { data?: { error?: string }; error?: { message?: string } } | null = null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      if (sendModalMode === 'receipt') {
        await supabase.from('invoices').update({ status: 'paid', paid_date: new Date().toISOString() }).eq('id', id);
        await fetchInvoice();
      }

      sendResponse = await supabase.functions.invoke('send-invoice', {
        body: {
          invoiceId: id,
          recipientEmail,
          cc: ccEmails.filter(Boolean),
          senderName: profile?.full_name || profile?.company_name || 'Your Business',
          senderEmail: profile?.email || user?.email,
          message: emailMessage,
          subject: emailSubject.trim() || undefined,
          receipt: sendModalMode === 'receipt',
        },
      });

      if (sendResponse.error) throw sendResponse.error;

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

  const fmt = (amount: number) => formatCurrency(amount, profile?.currency, profile?.currency_display, profile?.number_format);

  // Resolve merge tags for default email message: {{client_name}}, {{invoice_number}}, {{total}}, {{due_date}}
  const resolveEmailMessage = (template: string) => {
    if (!template?.trim()) return '';
    const totalVal = total > 0 ? total : (invoice?.total != null ? Number(invoice.total) : 0);
    return template
      .replace(/\{\{client_name\}\}/gi, invoice?.clients?.name ?? '')
      .replace(/\{\{invoice_number\}\}/gi, invoice?.invoice_number ?? '')
      .replace(/\{\{total\}\}/gi, totalVal > 0 || invoice?.total != null ? fmt(totalVal || Number(invoice?.total ?? 0)) : '')
      .replace(/\{\{due_date\}\}/gi, invoice?.due_date ? format(new Date(invoice.due_date), 'MMMM d, yyyy') : '')
      .replace(/\{\{business_name\}\}/gi, profile?.business_name || profile?.company_name || profile?.full_name || '')
      .replace(/\{\{project_name\}\}/gi, invoice?.projects?.name ?? '');
  };

  const previewNotes = notes.trim() || profile?.invoice_notes_default?.trim() || '';
  const previewFooter = invoiceFooter.trim() || profile?.invoice_footer?.trim() || '';
  const previewClientMessage = emailMessage.trim() || resolveEmailMessage(profile?.invoice_email_message_default ?? '');
  const previewBankDetails = bankDetails.trim() || '';

  // Data for CustomJS-style preview (matches send-invoice payload)
  const currencySymbol = currencies.find((c) => c.value === (profile?.currency || 'USD'))?.symbol ?? '$';
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
  const createdDate = invoice?.issue_date ? String(invoice.issue_date).slice(0, 10) : '';
  const dueDate = invoice?.due_date ? String(invoice.due_date).slice(0, 10) : '';
  const companyLogo = profile?.business_logo && typeof profile.business_logo === 'string' ? profile.business_logo : '';
  const previewItems = items.map((it) => ({
    description: it.description || '',
    price: Number(it.amount),
    unit_price: Number(it.unit_price) ?? Number(it.amount),
    quantity: Number(it.quantity) || 1,
    line_date: it.line_date ? String(it.line_date).slice(0, 10) : '',
    line_description: it.line_description != null ? String(it.line_description) : '',
  }));
  const amt = (n: number) => `${currencySymbol}${Number(n).toFixed(2)}`;

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
    return null;
  }

  return (
    <AppLayout>
      <TooltipProvider>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/invoices')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              {isEditMode ? (
                <Input
                  value={invoiceNumberEdit}
                  onChange={(e) => setInvoiceNumberEdit(e.target.value)}
                  className="text-2xl font-bold h-9 max-w-[200px]"
                  placeholder="Invoice number"
                />
              ) : (
                <h1 className="text-2xl font-bold truncate">{invoice.invoice_number}</h1>
              )}
              <Badge variant="outline" className={getInvoiceStatusBadgeStyle(invoice.status || 'draft')}>
                {(invoice.status || 'draft').charAt(0).toUpperCase() + (invoice.status || 'draft').slice(1)}
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(true)}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadPdf} disabled={downloadingPdf}>
                  {downloadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Download PDF
                </DropdownMenuItem>
                {invoice.status === 'draft' && (
                  <DropdownMenuItem onClick={markAsSent}>
                    <Send className="mr-2 h-4 w-4" />
                    Mark as Sent
                  </DropdownMenuItem>
                )}
                {invoice.status === 'sent' && (
                  <DropdownMenuItem onClick={markAsPaid}>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Mark as Paid
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={async () => {
                    if (!window.confirm('Delete this invoice? This cannot be undone.')) return;
                    try {
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
            {isEditMode ? (
              <Button variant="outline" size="sm" onClick={saveInvoice} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (invoice.status === 'sent' || invoice.status === 'paid') {
                        if (window.confirm('This invoice has already been sent. Any changes you make won\'t update the version the client received. To send an updated copy, save your changes and use "Send to Client" again. Continue to edit?')) {
                          setIsEditMode(true);
                        }
                      } else {
                        setIsEditMode(true);
                      }
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit Invoice</TooltipContent>
              </Tooltip>
            )}
            {invoice.clients?.email && (
              <Button
                size="sm"
                onClick={async () => {
                  if (isEditMode) {
                    const ok = await saveInvoice();
                    if (!ok) return;
                  }
                  const isReceipt = invoice.status === 'paid';
                  const isReminder = invoice.status === 'sent' || invoice.status === 'paid';
                  if (isReceipt) {
                    setSendModalMode('receipt');
                    setEmailSubject(`Receipt for Invoice ${invoice.invoice_number} – Paid`);
                    setEmailMessage(`This invoice has been paid. Balance due: ${fmt(0)}. Thank you for your business.`);
                  } else if (isReminder) {
                    setSendModalMode('reminder');
                    setEmailSubject(profile?.reminder_subject_default ? resolveEmailMessage(profile.reminder_subject_default) : '');
                    setEmailMessage(profile?.reminder_body_default ? resolveEmailMessage(profile.reminder_body_default) : '');
                  } else {
                    setSendModalMode('send');
                    setEmailSubject(profile?.invoice_email_subject_default ? resolveEmailMessage(profile.invoice_email_subject_default) : '');
                    setEmailMessage(resolveEmailMessage(profile?.invoice_email_message_default ?? ''));
                  }
                  setCcEmails([]);
                  setIsSendModalOpen(true);
                }}
              >
                <Mail className="mr-2 h-4 w-4" />
                {invoice.status === 'paid' ? 'Send receipt' : invoice.status === 'sent' || invoice.status === 'paid' ? 'Send reminder' : 'Send to Client'}
              </Button>
            )}
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
                    <span className="font-medium">{invoice.issue_date ? format(new Date(invoice.issue_date), 'MMM d, yyyy') : '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Due Date:</span>{' '}
                    <span className="font-medium">{invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : '—'}</span>
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
                  <Button variant="outline" size="sm" onClick={fetchUnbilledEntries}>
                    <Clock className="mr-2 h-4 w-4" />
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
            <div className="space-y-4 overflow-x-auto">
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No items yet. {isEditMode ? 'Add your first line item or import from time entries.' : ''}
                </div>
              ) : (
                <Table className="min-w-[640px] w-full">
                  <TableHeader>
                    <TableRow className="border-b hover:bg-transparent">
                      <TableHead className="w-[110px] min-w-[110px]">
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
                      <TableHead className="min-w-[160px]">Item</TableHead>
                      <TableHead className="min-w-[140px]">
                        <div className="flex items-center gap-2">
                          Description
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
                      <TableHead className="w-[72px] min-w-[72px] text-center">
                        <div className="flex items-center gap-2 justify-center">
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
                      <TableHead className="w-[100px] min-w-[100px] text-right">
                        <div className="flex items-center gap-2 justify-end">
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
                      <TableHead className="w-[120px] min-w-[120px] text-right">Amount</TableHead>
                      {isEditMode && <TableHead className="w-12 min-w-12" />}
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
                              className="h-8 text-sm"
                            />
                          ) : (
                            <span className="text-sm">{item.line_date ? format(new Date(item.line_date), 'MMM d, yyyy') : '—'}</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 align-middle min-w-[160px]">
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
                        <TableCell className="py-2 align-middle min-w-[140px]">
                          {isEditMode ? (
                            <Input
                              value={item.line_description ?? ''}
                              onChange={(e) => updateItem(item.id, 'line_description', e.target.value)}
                              placeholder="Optional"
                              className="h-8 text-sm"
                            />
                          ) : (
                            <span className="text-sm text-muted-foreground break-words">{item.line_description || '—'}</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 align-middle text-center">
                          {isEditMode ? (
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                              className="h-8 w-16 text-center mx-auto"
                            />
                          ) : (
                            <span className="text-sm">{item.quantity}</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 align-middle text-right">
                          {isEditMode ? (
                            <Input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                              className="h-8 w-24 text-right ml-auto"
                            />
                          ) : (
                            <span className="text-sm">{fmt(Number(item.unit_price))}</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 align-middle text-right font-medium">
                          {fmt(Number(item.quantity) * Number(item.unit_price))}
                        </TableCell>
                        {isEditMode && (
                          <TableCell className="py-2 align-middle w-12">
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
              <p className="text-sm text-muted-foreground">Leave empty to use default from Company settings. Shown on the invoice PDF.</p>
            )}
          </CardHeader>
          <CardContent>
            {isEditMode ? (
              <Textarea
                value={bankDetails}
                onChange={(e) => setBankDetails(e.target.value)}
                placeholder="Bank name, account number, routing, payment instructions..."
                rows={3}
              />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap min-h-[2rem]">
                {bankDetails.trim() || '—'}
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
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button size="sm" onClick={() => {
                setIsPreviewOpen(false);
                setEmailMessage(resolveEmailMessage(profile?.invoice_email_message_default ?? ''));
                setIsSendModalOpen(true);
              }}>
                <Mail className="mr-2 h-4 w-4" />
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
                      <p><b>Invoice #</b> {invoice.invoice_number}</p>
                      <p><b>Date</b> {createdDate}</p>
                      <p><b>Due Date</b> {dueDate}</p>
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
                            {showLineDate ? <th>Date</th> : null}
                            <th>Description</th>
                            {showQuantity ? <th>Qty</th> : null}
                            {showRate ? <th>Rate</th> : null}
                            <th>Amount</th>
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
                <div className="border-t pt-4 mt-4 p-4 bg-muted/30">
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
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Import Unbilled Time Entries</DialogTitle>
            <DialogDescription>
              Select time entries to add to this invoice
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-200px)]">
            {unbilledEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No unbilled time entries found for this client's projects
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(
                  unbilledEntries.reduce((acc, entry) => {
                    if (!acc[entry.project_name]) acc[entry.project_name] = [];
                    acc[entry.project_name].push(entry);
                    return acc;
                  }, {} as Record<string, UnbilledEntry[]>)
                ).map(([projectName, entries]) => (
                  <div key={projectName} className="border rounded-lg p-3">
                    <h4 className="font-medium mb-2">{projectName}</h4>
                    {entries.map((entry) => {
                      const hours = entry.duration_minutes / 60;
                      const rate = entry.hourly_rate || defaultHourlyRate;
                      return (
                        <div key={entry.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                          <Checkbox
                            checked={selectedEntries.has(entry.id)}
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
                            <p className="text-sm">{entry.description || 'No description'}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(entry.start_time), 'MMM d, yyyy')}
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
          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {selectedEntries.size} entries selected
            </p>
            <div className="flex gap-2">
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
        if (open) {
          const isReminder = invoice.status === 'sent' || invoice.status === 'paid';
          if (isReminder) {
            setEmailSubject(profile?.reminder_subject_default ? resolveEmailMessage(profile.reminder_subject_default) : '');
            setEmailMessage(profile?.reminder_body_default ? resolveEmailMessage(profile.reminder_body_default) : '');
          } else {
            setEmailSubject(profile?.invoice_email_subject_default ? resolveEmailMessage(profile.invoice_email_subject_default) : '');
            setEmailMessage(resolveEmailMessage(profile?.invoice_email_message_default ?? ''));
          }
        }
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
              <Label htmlFor="recipient-email">Recipient Email</Label>
              <Input
                id="recipient-email"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="client@example.com"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>CC</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setCcEmails((prev) => [...prev, ''])}
                >
                  + Add CC
                </Button>
              </div>
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
            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject</Label>
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
                    {[
                      { tag: '{{client_name}}', label: 'Client Name' },
                      { tag: '{{invoice_number}}', label: 'Invoice Number' },
                      { tag: '{{total}}', label: 'Total' },
                      { tag: '{{due_date}}', label: 'Due Date' },
                      { tag: '{{business_name}}', label: 'Business Name' },
                      { tag: '{{project_name}}', label: 'Project Name' },
                    ].map(({ tag, label }) => (
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
              {invoice.due_date && (
                <p>Due: {format(new Date(invoice.due_date), 'MMM d, yyyy')}</p>
              )}
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
                  <Mail className="mr-2 h-4 w-4" />
                  {sendModalMode === 'receipt' ? 'Send receipt' : invoice.status === 'sent' || invoice.status === 'paid' ? 'Send reminder' : 'Send Invoice'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </TooltipProvider>
    </AppLayout>
  );
}
