import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageSearchInput } from '@/components/ui/page-search-input';
import { MenuDotsTrigger } from '@/components/ui/menu-dots-trigger';
import { DataTableFrame, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableClientCell } from '@/components/ui/table-client-cell';
import { TableStatusBadge } from '@/components/ui/table-status-badge';
import { EmptyValue } from '@/components/ui/empty-value';
import { usePagination } from '@/hooks/usePagination';
import { TablePagination } from '@/components/ui/table-pagination';
import { useLocalePreferences } from '@/hooks/useLocalePreferences';
import { formatLocaleDate } from '@/lib/datetime';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Plus,
  Upload,
  X,
  CheckCircle,
  XCircle,
  MessageSquare,
  Clock,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
  List,

  Filter,
  Image,
} from '@/components/icons';
import { SlotIcon } from '@/contexts/IconSlotContext';

import { getSiteUrl } from '@/lib/site-url';
import { uploadReviewFile } from '@/lib/reviewFileUpload';
import { sendReviewRequestEmail } from '@/lib/sendReviewRequest';
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog';

interface ReviewFolder {
  id: string;
  name: string;
}

interface ReviewRequest {
  id: string;
  title: string;
  description: string | null;
  version: string;
  status: 'pending' | 'approved' | 'rejected' | 'commented';
  due_date: string | null;
  share_token: string;
  sent_at: string | null;
  created_at: string;
  folder_id: string | null;
  client_id: string | null;
  project_id: string | null;
  clients?: { name: string } | null;
  projects?: { name: string } | null;
}

interface Client {
  id: string;
  name: string;
  email: string | null;
}

interface Project {
  id: string;
  name: string;
  client_id: string | null;
}

function FileThumbnail({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  if (!url) return <div className="h-8 w-8 rounded overflow-hidden bg-muted animate-pulse" />;
  return <img src={url} alt="" className="h-8 w-8 rounded object-cover bg-background" />;
}

export default function ReviewRequests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { dateFormat } = useLocalePreferences();
  
  const [folders, setFolders] = useState<ReviewFolder[]>([]);
  const [requests, setRequests] = useState<ReviewRequest[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialogs
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<ReviewFolder | null>(null);
  const [editingRequest, setEditingRequest] = useState<ReviewRequest | null>(null);
  
  // Folder form
  const [folderName, setFolderName] = useState('');
  
  // Request form
  const [requestTitle, setRequestTitle] = useState('');
  const [requestDescription, setRequestDescription] = useState('');
  const [requestVersion, setRequestVersion] = useState('1');
  const [requestClientId, setRequestClientId] = useState('');
  const [requestProjectId, setRequestProjectId] = useState('');
  const [requestFolderId, setRequestFolderId] = useState('');
  const [requestDueDate, setRequestDueDate] = useState<Date | undefined>();
  const [requestFiles, setRequestFiles] = useState<File[]>([]);
  const [requestRecipients, setRequestRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState('');
  const [uploading, setUploading] = useState(false);

  const [showCreateFolderInline, setShowCreateFolderInline] = useState(false);
  const [inlineFolderName, setInlineFolderName] = useState('');
  const [creatingFolderInline, setCreatingFolderInline] = useState(false);

  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);
  
  // Filters (like Projects)
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [folderFilter, setFolderFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  // When creating a new request, auto-fill recipients with the selected client's email
  useEffect(() => {
    if (editingRequest || !requestClientId) return;
    const client = clients.find(c => c.id === requestClientId);
    const email = client?.email?.trim();
    if (email) {
      setRequestRecipients(prev => (prev.includes(email) ? prev : [...prev, email]));
    }
  }, [requestClientId, editingRequest, clients]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    
    const [foldersRes, requestsRes, clientsRes, projectsRes] = await Promise.all([
      supabase.from('review_folders').select('*').eq('user_id', user.id).order('name'),
      supabase.from('review_requests').select(`
        *,
        clients(name),
        projects(name)
      `).eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name, email').eq('user_id', user.id).is('archived_at', null).order('name'),
      supabase.from('projects').select('id, name, client_id').eq('user_id', user.id).order('name'),
    ]);
    
    setFolders(foldersRes.data || []);
    setRequests((requestsRes.data as ReviewRequest[]) || []);
    setClients(clientsRes.data || []);
    setProjects(projectsRes.data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const client = searchParams.get('client');
    if (!client || clients.length === 0) return;
    if (!clients.some((c) => c.id === client)) return;
    setRequestClientId(client);
    setRequestProjectId('');
    setRequestDialogOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, clients, setSearchParams]);

  const filteredProjects = useMemo(
    () => projects.filter((p) => !requestClientId || p.client_id === requestClientId),
    [projects, requestClientId],
  );

  useEffect(() => {
    if (!requestProjectId) return;
    const project = projects.find((p) => p.id === requestProjectId);
    if (requestClientId && project?.client_id && project.client_id !== requestClientId) {
      setRequestProjectId('');
    }
  }, [requestClientId, requestProjectId, projects]);

  const resetFolderForm = () => {
    setFolderName('');
    setEditingFolder(null);
  };

  const resetRequestForm = () => {
    setRequestTitle('');
    setRequestDescription('');
    setRequestVersion('1');
    setRequestClientId('');
    setRequestProjectId('');
    setRequestFolderId('');
    setRequestDueDate(undefined);
    setRequestFiles([]);
    setRequestRecipients([]);
    setRecipientInput('');
    setEditingRequest(null);
    setShowCreateFolderInline(false);
    setInlineFolderName('');
    setCreateProjectDialogOpen(false);
  };

  const createFolderInline = async () => {
    if (!user || !inlineFolderName.trim()) {
      toast({ title: 'Folder name is required', variant: 'destructive' });
      return;
    }
    setCreatingFolderInline(true);
    try {
      const { data, error } = await supabase
        .from('review_folders')
        .insert({
          user_id: user.id,
          name: inlineFolderName.trim(),
        })
        .select('id, name')
        .single();
      if (error) throw error;
      if (!data) throw new Error('Folder was not created');
      setFolders((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setRequestFolderId(data.id);
      setShowCreateFolderInline(false);
      setInlineFolderName('');
      toast({ title: 'Folder created' });
    } catch (err: any) {
      toast({ title: 'Could not create folder', description: err?.message, variant: 'destructive' });
    } finally {
      setCreatingFolderInline(false);
    }
  };

  const handleSaveFolder = async () => {
    if (!user || !folderName.trim()) return;
    
    if (editingFolder) {
      const { error } = await supabase
        .from('review_folders')
        .update({ name: folderName })
        .eq('id', editingFolder.id);
      
      if (error) {
        toast({ title: 'Error updating folder', variant: 'destructive' });
        return;
      }
    } else {
      const { error } = await supabase
        .from('review_folders')
        .insert({ user_id: user.id, name: folderName });
      
      if (error) {
        toast({ title: 'Error creating folder', variant: 'destructive' });
        return;
      }
    }
    
    toast({ title: editingFolder ? 'Folder updated' : 'Folder created' });
    setFolderDialogOpen(false);
    resetFolderForm();
    fetchData();
  };

  const handleDeleteFolder = async (folder: ReviewFolder) => {
    const { error } = await supabase.from('review_folders').delete().eq('id', folder.id);
    if (error) {
      toast({ title: 'Error deleting folder', variant: 'destructive' });
      return;
    }
    toast({ title: 'Folder deleted' });
    if (folderFilter === folder.id) setFolderFilter('all');
    fetchData();
  };

  const handleEditFolder = (folder: ReviewFolder) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderDialogOpen(true);
  };

  const handleSaveRequest = async () => {
    if (!user || !requestTitle.trim() || !requestClientId) return;
    if (!editingRequest && requestFiles.length === 0) {
      toast({ title: 'Please upload at least one file', variant: 'destructive' });
      return;
    }
    
    setUploading(true);
    
    try {
      let requestId = editingRequest?.id;
      let createdNew = false;
      
      if (editingRequest) {
        const { error } = await supabase
          .from('review_requests')
          .update({
            title: requestTitle,
            description: requestDescription || null,
            version: requestVersion,
            client_id: requestClientId,
            project_id: requestProjectId || null,
            folder_id: requestFolderId || null,
            due_date: requestDueDate ? format(requestDueDate, 'yyyy-MM-dd') : null,
          })
          .eq('id', editingRequest.id);
        
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('review_requests')
          .insert({
            user_id: user.id,
            title: requestTitle,
            description: requestDescription || null,
            version: requestVersion,
            client_id: requestClientId,
            project_id: requestProjectId || null,
            folder_id: requestFolderId || null,
            due_date: requestDueDate ? format(requestDueDate, 'yyyy-MM-dd') : null,
          })
          .select()
          .single();
        
        if (error) throw error;
        requestId = data.id;
        createdNew = true;
      }
      
      // Upload files for new requests using validated edge function
      if (!editingRequest && requestFiles.length > 0 && requestId) {
        try {
          for (const file of requestFiles) {
            await uploadReviewFile(file, requestId);
          }
        } catch (e) {
          // Roll back: avoid creating an unsent approval with no files
          if (createdNew && requestId) {
            await supabase.from('review_requests').delete().eq('id', requestId);
          }
          throw e;
        }
      }
      
      // Add recipients
      if (!editingRequest && requestRecipients.length > 0 && requestId) {
        await supabase.from('review_recipients').insert(
          requestRecipients.map(email => ({ review_request_id: requestId, email }))
        );
      }

      // Send approval email when creating (same as "Send to client" on detail page)
      if (!editingRequest && requestId) {
        try {
          await sendReviewRequestEmail(requestId, getSiteUrl() || window.location.origin);
          toast({ title: 'Approval sent', description: 'Recipients have been emailed the review link.' });
        } catch (err: unknown) {
          const message =
            err instanceof Error
              ? err.message
              : 'The request was created, but email could not be sent. You can still share the link from the approval page.';
          toast({
            title: 'Email failed to send',
            description: message,
            variant: 'destructive',
          });
        }
      } else if (editingRequest) {
        toast({ title: 'Request updated' });
      }

      setRequestDialogOpen(false);
      resetRequestForm();
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error saving request', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleEditRequest = (request: ReviewRequest) => {
    setEditingRequest(request);
    setRequestTitle(request.title);
    setRequestDescription(request.description || '');
    setRequestVersion(request.version);
    setRequestClientId(request.client_id || '');
    setRequestProjectId(request.project_id || '');
    setRequestFolderId(request.folder_id || '');
    setRequestDueDate(request.due_date ? new Date(request.due_date) : undefined);
    setRequestDialogOpen(true);
  };

  const handleDeleteRequest = async (request: ReviewRequest) => {
    const { error } = await supabase.from('review_requests').delete().eq('id', request.id);
    if (error) {
      toast({ title: 'Error deleting request', variant: 'destructive' });
      return;
    }
    toast({ title: 'Request deleted' });
    fetchData();
  };

  const handleSendRequest = async (request: ReviewRequest) => {
    try {
      await sendReviewRequestEmail(request.id, getSiteUrl() || window.location.origin);
      toast({ title: 'Review request sent', description: 'Recipients have been emailed the review link.' });
      fetchData();
    } catch (err: unknown) {
      toast({
        title: 'Error sending',
        description: err instanceof Error ? err.message : 'Could not send email. You can still copy/share the link.',
        variant: 'destructive',
      });
    }
  };

  const getClientReviewUrl = (request: ReviewRequest) => {
    return `${getSiteUrl()}/review/${request.share_token}`;
  };

  const copyShareLink = (request: ReviewRequest) => {
    navigator.clipboard.writeText(getClientReviewUrl(request));
    toast({ title: 'Link copied to clipboard' });
  };

  const handleAddRecipient = () => {
    if (recipientInput && !requestRecipients.includes(recipientInput)) {
      setRequestRecipients([...requestRecipients, recipientInput]);
      setRecipientInput('');
    }
  };

  const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const PDF_TYPES = ['application/pdf'];
  const WORD_TYPES = [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  const EXT_TO_MIME: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB (images and documents)
  const MAX_FILE_SIZE_MB = 5;

  const fileMatchesTypes = (file: File, allowedTypes: string[]) => {
    if (allowedTypes.includes(file.type)) return true;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext) return false;
    const inferred = EXT_TO_MIME[ext];
    return !!inferred && allowedTypes.includes(inferred);
  };

  const [wordWarningOpen, setWordWarningOpen] = useState(false);
  const pendingWordFilesRef = useRef<File[]>([]);

  const validateAndAddFiles = (
    files: File[],
    allowedTypes: string[],
    typeLabel: string,
  ) => {
    const validFiles: File[] = [];
    const errors: string[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: too large (max ${MAX_FILE_SIZE_MB}MB)`);
        continue;
      }
      if (!fileMatchesTypes(file, allowedTypes)) {
        errors.push(`${file.name}: not a valid ${typeLabel} type`);
        continue;
      }
      validFiles.push(file);
    }
    if (errors.length > 0) {
      toast({ title: 'Some files were rejected', description: errors.join('\n'), variant: 'destructive' });
    }
    if (validFiles.length > 0) {
      setRequestFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    validateAndAddFiles(files, IMAGE_TYPES, 'image');
    e.target.value = '';
  };

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    validateAndAddFiles(files, PDF_TYPES, 'PDF');
    e.target.value = '';
  };

  const handleWordFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid: File[] = [];
    const errors: string[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: too large (max ${MAX_FILE_SIZE_MB}MB)`);
        continue;
      }
      if (!fileMatchesTypes(file, WORD_TYPES)) {
        errors.push(`${file.name}: not a valid Word document`);
        continue;
      }
      valid.push(file);
    }
    if (errors.length > 0) {
      toast({ title: 'Some files were rejected', description: errors.join('\n'), variant: 'destructive' });
    }
    if (valid.length > 0) {
      pendingWordFilesRef.current = valid;
      setWordWarningOpen(true);
    }
    e.target.value = '';
  };

  const confirmWordFiles = () => {
    const pending = pendingWordFilesRef.current;
    if (pending.length > 0) {
      setRequestFiles((prev) => [...prev, ...pending]);
      pendingWordFilesRef.current = [];
    }
    setWordWarningOpen(false);
  };

  const imageFiles = requestFiles.filter((f) => f.type.startsWith('image/'));
  const pdfFiles = requestFiles.filter((f) => f.type === 'application/pdf');
  const wordFiles = requestFiles.filter((f) => WORD_TYPES.includes(f.type));

  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.clients?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.projects?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesClient = clientFilter === 'all' || r.client_id === clientFilter;
    const matchesProject = projectFilter === 'all' || r.project_id === projectFilter;
    const matchesFolder = folderFilter === 'all' || (folderFilter === 'none' ? !r.folder_id : r.folder_id === folderFilter);
    return matchesSearch && matchesStatus && matchesClient && matchesProject && matchesFolder;
  });
  const activeFilterCount =
    (statusFilter !== 'all' ? 1 : 0) +
    (clientFilter !== 'all' ? 1 : 0) +
    (projectFilter !== 'all' ? 1 : 0) +
    (folderFilter !== 'all' ? 1 : 0);

  const folderById = useMemo(() => {
    const map: Record<string, ReviewFolder> = {};
    folders.forEach((f) => {
      map[f.id] = f;
    });
    return map;
  }, [folders]);

  const approvalsPagination = usePagination(filteredRequests);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">Loading...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Approvals</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { resetFolderForm(); setFolderDialogOpen(true); }}>
              Create Folder
            </Button>
            <Button onClick={() => { resetRequestForm(); setRequestDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              New approval
            </Button>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PageSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search approvals..."
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
              <PopoverContent className="w-[300px] p-4" align="end">
                <div className="space-y-3">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="commented">Commented</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={folderFilter} onValueChange={setFolderFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Folder" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Folders</SelectItem>
                      <SelectItem value="none">No folder</SelectItem>
                      {folders.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {activeFilterCount > 0 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-full"
                      onClick={() => {
                        setStatusFilter('all');
                        setClientFilter('all');
                        setProjectFilter('all');
                        setFolderFilter('all');
                      }}
                    >
                      Reset filters
                    </Button>
                  ) : null}
                </div>
              </PopoverContent>
          </Popover>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col p-0">
            {requests.length === 0 ? (
              <div className="py-14 text-center">
                <h3 className="text-lg font-semibold">No approval requests yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Create your first approval request to get started.</p>
                <Button onClick={() => { resetRequestForm(); setRequestDialogOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  New approval
                </Button>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="py-14 text-center text-sm text-muted-foreground">
                No approvals match your search or filters.
              </div>
            ) : (
              <DataTableFrame>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Approval</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Folder</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvalsPagination.paginatedItems.map((request) => {
                      const folder = request.folder_id ? folderById[request.folder_id] : null;
                      return (
                        <TableRow
                          key={request.id}
                          className="cursor-pointer"
                          onClick={() => navigate(`/reviews/${request.id}`)}
                        >
                          <TableCell className="font-semibold">
                            <div className="min-w-0">
                              <p className="truncate">{request.title}</p>
                              <p className="text-xs font-normal text-muted-foreground">v{request.version}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <TableClientCell
                              client={request.clients?.name ? { name: request.clients.name } : null}
                            />
                          </TableCell>
                          <TableCell>
                            {request.projects?.name ? (
                              request.projects.name
                            ) : (
                              <EmptyValue variant="table" field="project" />
                            )}
                          </TableCell>
                          <TableCell>
                            {folder ? (
                              <span className="truncate text-sm">{folder.name}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">No folder</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <TableStatusBadge status={request.status} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {request.due_date ? (
                              formatLocaleDate(request.due_date, dateFormat)
                            ) : (
                              <EmptyValue variant="table" field="due_date" />
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {request.sent_at ? (
                              formatLocaleDate(request.sent_at, dateFormat)
                            ) : (
                              <EmptyValue variant="table" field="sent_at" />
                            )}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <MenuDotsTrigger />
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/reviews/${request.id}`)}>
                                  <SlotIcon slot="approval_documents" className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditRequest(request)}>
                                  <SlotIcon slot="action_edit" className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => copyShareLink(request)}>
                                  <SlotIcon slot="action_copy_link" className="mr-2 h-4 w-4" />
                                  Copy Link
                                </DropdownMenuItem>
                                {!request.sent_at && (
                                  <DropdownMenuItem onClick={() => handleSendRequest(request)}>
                                    <SlotIcon slot="action_send" className="mr-2 h-4 w-4" />
                                    Mark as Sent
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleDeleteRequest(request)}
                                  className="text-destructive"
                                >
                                  <SlotIcon slot="action_delete" className="mr-2 h-4 w-4 text-muted-foreground" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <TablePagination
                  total={approvalsPagination.total}
                  page={approvalsPagination.page}
                  pageSize={approvalsPagination.pageSize}
                  from={approvalsPagination.from}
                  to={approvalsPagination.to}
                  pageSizeOptions={approvalsPagination.pageSizeOptions}
                  showPageSizeSelect={approvalsPagination.showPageSizeSelect}
                  onPageChange={approvalsPagination.setPage}
                  onPageSizeChange={approvalsPagination.setPageSize}
                />
              </DataTableFrame>
            )}
          </CardContent>
        </Card>
      </div>


      {/* Folder Dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFolder ? 'Edit Folder' : 'Create Folder'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Folder Name</Label>
              <Input value={folderName} onChange={e => setFolderName(e.target.value)} placeholder="e.g., Website Designs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveFolder} disabled={!folderName.trim()}>
              {editingFolder ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRequest ? 'Edit approval' : 'Send for approval'}</DialogTitle>
            <p className="text-sm text-muted-foreground">Create an approval request and send to clients</p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select
                value={requestClientId}
                onValueChange={(v) => {
                  setRequestClientId(v);
                  setRequestProjectId('');
                  setCreateProjectDialogOpen(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input 
                value={requestTitle} 
                onChange={e => setRequestTitle(e.target.value)} 
                placeholder="e.g., Design Mockups v1, Website Copy Review"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Project (optional)</Label>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-sm"
                  disabled={!requestClientId}
                  onClick={() => setCreateProjectDialogOpen(true)}
                >
                  Create new project
                </Button>
              </div>
              <Select value={requestProjectId || 'none'} onValueChange={v => setRequestProjectId(v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {filteredProjects.map(project => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!requestClientId ? (
                <p className="text-xs text-muted-foreground">Select a client to filter projects or create a new one.</p>
              ) : null}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Version</Label>
                <Input value={requestVersion} onChange={e => setRequestVersion(e.target.value)} />
                <p className="text-xs text-muted-foreground">Display: v{requestVersion}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Folder</Label>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-sm"
                    onClick={() => setShowCreateFolderInline((prev) => !prev)}
                  >
                    {showCreateFolderInline ? 'Cancel' : 'Create new folder'}
                  </Button>
                </div>
                <Select value={requestFolderId || 'none'} onValueChange={v => setRequestFolderId(v === 'none' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="No folder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No folder</SelectItem>
                    {folders.map(folder => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {showCreateFolderInline ? (
                  <div className="rounded-lg border p-3 space-y-3">
                    <Input
                      value={inlineFolderName}
                      onChange={(e) => setInlineFolderName(e.target.value)}
                      placeholder="Folder name *"
                    />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        disabled={creatingFolderInline || !inlineFolderName.trim()}
                        onClick={() => void createFolderInline()}
                      >
                        {creatingFolderInline ? 'Adding…' : 'Add folder'}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={requestDescription} 
                onChange={e => setRequestDescription(e.target.value)}
                placeholder="Add any notes or context about this review..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <SlotIcon slot="approval_calendar" className="mr-2 h-4 w-4" />
                    {requestDueDate ? format(requestDueDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={requestDueDate} onSelect={setRequestDueDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            
            {!editingRequest && (
              <>
                <div className="space-y-3">
                  <Label>Files *</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-border hover:bg-muted/40 transition-colors">
                      <input type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleImageFileChange} className="hidden" id="upload-images" />
                      <label htmlFor="upload-images" className="cursor-pointer block">
                        <Image className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Images</p>
                        <p className="text-xs text-muted-foreground">JPG, PNG, GIF, WebP (max {MAX_FILE_SIZE_MB}MB)</p>
                      </label>
                    </div>
                    <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-border hover:bg-muted/40 transition-colors">
                      <input type="file" multiple accept=".pdf,application/pdf" onChange={handlePdfFileChange} className="hidden" id="upload-pdf" />
                      <label htmlFor="upload-pdf" className="cursor-pointer block">
                        <SlotIcon slot="approval_documents" className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <div className="text-sm font-medium flex items-center justify-center gap-1.5">
                          PDF
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">Beta</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">View & comment in browser (max {MAX_FILE_SIZE_MB}MB)</p>
                      </label>
                    </div>
                    <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-amber-500/30 border-amber-500/20 transition-colors">
                      <input type="file" multiple accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleWordFileChange} className="hidden" id="upload-word" />
                      <label htmlFor="upload-word" className="cursor-pointer block">
                        <SlotIcon slot="approval_documents" className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Word (doc/docx)</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">Download only (max {MAX_FILE_SIZE_MB}MB)</p>
                      </label>
                    </div>
                  </div>
                  {requestFiles.length > 0 && (
                    <div className="space-y-3 pt-1">
                      {imageFiles.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">Images ({imageFiles.length})</p>
                          <div className="flex flex-wrap gap-2">
                            {requestFiles.map((file, i) =>
                              file.type.startsWith('image/') ? (
                                <div key={i} className="flex items-center gap-2 rounded-lg border bg-background p-2">
                                  <div className="h-8 w-8 rounded overflow-hidden bg-background shrink-0">
                                    <FileThumbnail file={file} />
                                  </div>
                                  <span className="text-sm truncate max-w-[120px]">{file.name}</span>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setRequestFiles((prev) => prev.filter((_, j) => j !== i))}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : null,
                            )}
                          </div>
                        </div>
                      )}
                      {pdfFiles.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">PDF (Beta) – view & comment ({pdfFiles.length})</p>
                          <div className="space-y-1">
                            {requestFiles.map((file, i) =>
                              file.type === 'application/pdf' ? (
                                <div key={i} className="flex items-center justify-between rounded-lg border bg-background p-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <SlotIcon slot="approval_documents" className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className="text-sm truncate">{file.name}</span>
                                  </div>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setRequestFiles((prev) => prev.filter((_, j) => j !== i))}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : null,
                            )}
                          </div>
                        </div>
                      )}
                      {wordFiles.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">Word (doc/docx) – download only ({wordFiles.length})</p>
                          <div className="space-y-1">
                            {requestFiles.map((file, i) =>
                              WORD_TYPES.includes(file.type) ? (
                                <div key={i} className="flex items-center justify-between rounded-lg border bg-background p-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <SlotIcon slot="approval_documents" className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className="text-sm truncate">{file.name}</span>
                                    <Badge variant="secondary" className="text-xs shrink-0">Download only</Badge>
                                  </div>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setRequestFiles((prev) => prev.filter((_, j) => j !== i))}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : null,
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Word files: download-only warning */}
                <AlertDialog open={wordWarningOpen} onOpenChange={setWordWarningOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Word files are download only</AlertDialogTitle>
                      <AlertDialogDescription>
                        Word documents (.doc, .docx) cannot be viewed or commented on in the browser. Clients will only be able to download them. For in-browser viewing and comments, use PDF instead.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogAction onClick={confirmWordFiles}>I understand, add anyway</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                
                <div className="space-y-2">
                  <Label>Recipients *</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={recipientInput} 
                      onChange={e => setRecipientInput(e.target.value)}
                      placeholder="Email address"
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddRecipient())}
                    />
                    <Button variant="outline" onClick={handleAddRecipient}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {requestRecipients.map((email, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md border bg-background p-2">
                      <span className="text-sm">{email}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setRequestRecipients(prev => prev.filter((_, j) => j !== i))}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveRequest} 
              disabled={uploading || !requestTitle.trim() || !requestClientId || (!editingRequest && (requestFiles.length === 0 || requestRecipients.length === 0))}
            >
              {uploading ? 'Uploading...' : editingRequest ? 'Update' : 'Send for approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ProjectFormDialog
        open={createProjectDialogOpen}
        onOpenChange={setCreateProjectDialogOpen}
        clients={clients}
        initialClientId={requestClientId || null}
        onSaved={(project) => {
          setProjects((prev) =>
            [
              ...prev.filter((item) => item.id !== project.id),
              { id: project.id, name: project.name, client_id: project.client_id },
            ].sort((a, b) => a.name.localeCompare(b.name)),
          );
          setRequestProjectId(project.id);
          if (project.client_id) setRequestClientId(project.client_id);
        }}
        onClientSaved={(client) => {
          setClients((prev) =>
            [...prev.filter((item) => item.id !== client.id), { id: client.id, name: client.name, email: client.email ?? null }]
              .sort((a, b) => a.name.localeCompare(b.name)),
          );
          setRequestClientId(client.id);
        }}
      />
    </AppLayout>
  );
}
