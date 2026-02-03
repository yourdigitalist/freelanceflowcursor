import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Folder,
  FolderPlus,
  MoreVertical,
  Edit,
  Trash2,
  Send,
  ExternalLink,
  FileText,
  Image,
  Upload,
  X,
  CalendarIcon,
  CheckCircle,
  XCircle,
  MessageSquare,
  Clock,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ReviewFolder {
  id: string;
  name: string;
  emoji: string;
  color: string;
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
}

const FOLDER_COLORS = [
  '#9B63E9', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#06B6D4'
];

export default function ReviewRequests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
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
  const [folderEmoji, setFolderEmoji] = useState('📁');
  const [folderColor, setFolderColor] = useState('#9B63E9');
  
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
  
  // Filters (like Projects)
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [folderFilter, setFolderFilter] = useState<string>('all');
  // Collapsible folder sections: which are open (default open for "none" and first folder)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

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
      supabase.from('clients').select('id, name, email').eq('user_id', user.id).order('name'),
      supabase.from('projects').select('id, name').eq('user_id', user.id).order('name'),
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

  const resetFolderForm = () => {
    setFolderName('');
    setFolderEmoji('📁');
    setFolderColor('#9B63E9');
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
  };

  const handleSaveFolder = async () => {
    if (!user || !folderName.trim()) return;
    
    if (editingFolder) {
      const { error } = await supabase
        .from('review_folders')
        .update({ name: folderName, emoji: folderEmoji, color: folderColor })
        .eq('id', editingFolder.id);
      
      if (error) {
        toast({ title: 'Error updating folder', variant: 'destructive' });
        return;
      }
    } else {
      const { error } = await supabase
        .from('review_folders')
        .insert({ user_id: user.id, name: folderName, emoji: folderEmoji, color: folderColor });
      
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
    setFolderEmoji(folder.emoji);
    setFolderColor(folder.color);
    setFolderDialogOpen(true);
  };

  const handleSaveRequest = async () => {
    if (!user || !requestTitle.trim() || !requestClientId) return;
    
    setUploading(true);
    
    try {
      let requestId = editingRequest?.id;
      
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
      }
      
      // Upload files for new requests using validated edge function
      if (!editingRequest && requestFiles.length > 0 && requestId) {
        for (const file of requestFiles) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('review_request_id', requestId);
          
          const { data: session } = await supabase.auth.getSession();
          
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-review-file`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session?.session?.access_token}`,
              },
              body: formData,
            }
          );
          
          const result = await response.json();
          
          if (!response.ok || result.error) {
            throw new Error(result.error || 'Failed to upload file');
          }
        }
      }
      
      // Add recipients
      if (!editingRequest && requestRecipients.length > 0 && requestId) {
        await supabase.from('review_recipients').insert(
          requestRecipients.map(email => ({ review_request_id: requestId, email }))
        );
      }
      
      toast({ title: editingRequest ? 'Request updated' : 'Request created' });
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
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('send-review-request', {
        body: { reviewRequestId: request.id, origin: window.location.origin },
      });
      if (session && response.data && !response.error) {
        toast({ title: 'Review request sent', description: 'Recipients have been emailed the review link.' });
        fetchData();
        return;
      }
    } catch (_) {
      // Fall through to mark as sent locally
    }
    const { error } = await supabase
      .from('review_requests')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', request.id);
    if (error) {
      toast({ title: 'Error sending request', variant: 'destructive' });
      return;
    }
    toast({ title: 'Request marked as sent', description: 'Share the link with your client' });
    fetchData();
  };

  const getClientReviewUrl = (request: ReviewRequest) => {
    return `${window.location.origin}/review/${request.share_token}`;
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

  // Allowed MIME types for client-side validation
  const ALLOWED_FILE_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large (max 10MB)`);
        continue;
      }
      
      // Check file type
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        errors.push(`${file.name}: File type not allowed`);
        continue;
      }
      
      validFiles.push(file);
    }

    if (errors.length > 0) {
      toast({ 
        title: 'Some files were rejected', 
        description: errors.join('\n'),
        variant: 'destructive' 
      });
    }

    setRequestFiles(prev => [...prev, ...validFiles]);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'commented':
        return <Badge className="bg-primary/10 text-primary border-primary/20"><MessageSquare className="h-3 w-3 mr-1" />Commented</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesClient = clientFilter === 'all' || r.client_id === clientFilter;
    const matchesProject = projectFilter === 'all' || r.project_id === projectFilter;
    const matchesFolder = folderFilter === 'all' || (folderFilter === 'none' ? !r.folder_id : r.folder_id === folderFilter);
    return matchesStatus && matchesClient && matchesProject && matchesFolder;
  });

  // Group filtered requests by folder for collapsible directory
  const requestsByFolder = (() => {
    const none: ReviewRequest[] = [];
    const byId: Record<string, ReviewRequest[]> = {};
    folders.forEach((f) => { byId[f.id] = []; });
    filteredRequests.forEach((r) => {
      if (!r.folder_id) none.push(r);
      else (byId[r.folder_id] = byId[r.folder_id] || []).push(r);
    });
    return { none, byId };
  })();

  const setSectionOpen = (id: string, open: boolean) => {
    setOpenSections((prev) => ({ ...prev, [id]: open }));
  };

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Review Requests</h1>
            <p className="text-muted-foreground">Manage work sent for client review</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { resetFolderForm(); setFolderDialogOpen(true); }}>
              <FolderPlus className="h-4 w-4 mr-2" />
              Create Folder
            </Button>
            <Button onClick={() => { resetRequestForm(); setRequestDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Request
            </Button>
          </div>
        </div>

        {/* Filters (like Projects) */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
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
            <SelectTrigger className="w-[160px]">
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
            <SelectTrigger className="w-[160px]">
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
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Folders</SelectItem>
              <SelectItem value="none">No folder</SelectItem>
              {folders.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  <span className="mr-1">{f.emoji}</span>{f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Collapsible folder directory with request cards */}
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No review requests yet
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {/* No folder section */}
            {requestsByFolder.none.length > 0 && (
              <Collapsible
                open={openSections['none'] !== false}
                onOpenChange={(open) => setSectionOpen('none', open)}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start gap-2 h-9 font-medium">
                    {openSections['none'] === false ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <Folder className="h-4 w-4 text-muted-foreground" />
                    No folder
                    <span className="text-muted-foreground text-sm ml-1">({requestsByFolder.none.length})</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pl-6 pt-2">
                    {requestsByFolder.none.map((request) => (
                      <Card
                        key={request.id}
                        className="hover:shadow-md transition-shadow cursor-pointer group border-0 shadow-sm"
                        onClick={() => navigate(`/reviews/${request.id}`)}
                      >
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">{request.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                v{request.version} • {request.clients?.name || 'No client'}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/reviews/${request.id}`); }}>
                                  <FileText className="h-4 w-4 mr-2" />View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditRequest(request); }}>
                                  <Edit className="h-4 w-4 mr-2" />Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); copyShareLink(request); }}>
                                  <ExternalLink className="h-4 w-4 mr-2" />Copy Link
                                </DropdownMenuItem>
                                {!request.sent_at && (
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSendRequest(request); }}>
                                    <Send className="h-4 w-4 mr-2" />Mark as Sent
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteRequest(request); }} className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(request.status)}
                            {request.sent_at && (
                              <Badge variant="outline" className="text-xs">
                                <Send className="h-3 w-3 mr-1" />Sent
                              </Badge>
                            )}
                          </div>
                          {request.due_date && (
                            <p className="text-xs text-muted-foreground">
                              Due: {format(new Date(request.due_date), 'MMM d, yyyy')}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
            {/* Each folder section */}
            {folders.map((folder) => {
              const folderRequests = requestsByFolder.byId[folder.id] || [];
              if (folderRequests.length === 0) return null;
              const sectionId = folder.id;
              return (
                <Collapsible
                  key={folder.id}
                  open={openSections[sectionId] !== false}
                  onOpenChange={(open) => setSectionOpen(sectionId, open)}
                >
                  <div className="flex items-center gap-1 w-full">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="flex-1 justify-start gap-2 h-9 font-medium">
                        {openSections[sectionId] === false ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        <span className="text-lg" style={{ color: folder.color }}>{folder.emoji}</span>
                        {folder.name}
                        <span className="text-muted-foreground text-sm ml-1">({folderRequests.length})</span>
                      </Button>
                    </CollapsibleTrigger>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditFolder(folder)}>
                          <Edit className="h-4 w-4 mr-2" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteFolder(folder)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CollapsibleContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pl-6 pt-2">
                      {folderRequests.map((request) => (
                        <Card
                          key={request.id}
                          className="hover:shadow-md transition-shadow cursor-pointer group border-0 shadow-sm"
                          onClick={() => navigate(`/reviews/${request.id}`)}
                        >
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium truncate">{request.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                  v{request.version} • {request.clients?.name || 'No client'}
                                </p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/reviews/${request.id}`); }}>
                                    <FileText className="h-4 w-4 mr-2" />View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditRequest(request); }}>
                                    <Edit className="h-4 w-4 mr-2" />Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); copyShareLink(request); }}>
                                    <ExternalLink className="h-4 w-4 mr-2" />Copy Link
                                  </DropdownMenuItem>
                                  {!request.sent_at && (
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSendRequest(request); }}>
                                      <Send className="h-4 w-4 mr-2" />Mark as Sent
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteRequest(request); }} className="text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" />Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(request.status)}
                              {request.sent_at && (
                                <Badge variant="outline" className="text-xs">
                                  <Send className="h-3 w-3 mr-1" />Sent
                                </Badge>
                              )}
                            </div>
                            {request.due_date && (
                              <p className="text-xs text-muted-foreground">
                                Due: {format(new Date(request.due_date), 'MMM d, yyyy')}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
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
            <div className="flex gap-4">
              <div className="space-y-2">
                <Label>Emoji</Label>
                <EmojiPicker value={folderEmoji} onChange={setFolderEmoji} />
              </div>
              <div className="space-y-2 flex-1">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {FOLDER_COLORS.map(color => (
                    <button
                      key={color}
                      className={cn(
                        "h-8 w-8 rounded-full border-2 transition-transform",
                        folderColor === color ? "scale-110 border-foreground" : "border-transparent hover:scale-105"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setFolderColor(color)}
                    />
                  ))}
                </div>
              </div>
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
            <DialogTitle>{editingRequest ? 'Edit Request' : 'Send for Review'}</DialogTitle>
            <p className="text-sm text-muted-foreground">Create a review request and send to clients</p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select value={requestClientId} onValueChange={setRequestClientId}>
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
              <Label>Review Title *</Label>
              <Input 
                value={requestTitle} 
                onChange={e => setRequestTitle(e.target.value)} 
                placeholder="e.g., Design Mockups v1, Website Copy Review"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Project (optional)</Label>
              <Select value={requestProjectId || 'none'} onValueChange={v => setRequestProjectId(v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Version</Label>
                <Input value={requestVersion} onChange={e => setRequestVersion(e.target.value)} />
                <p className="text-xs text-muted-foreground">Display: v{requestVersion}</p>
              </div>
              <div className="space-y-2">
                <Label>Folder</Label>
                <Select value={requestFolderId || 'none'} onValueChange={v => setRequestFolderId(v === 'none' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="No folder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No folder</SelectItem>
                    {folders.map(folder => (
                      <SelectItem key={folder.id} value={folder.id}>
                        <span className="mr-1">{folder.emoji}</span>{folder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    <CalendarIcon className="mr-2 h-4 w-4" />
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
                <div className="space-y-2">
                  <Label>Files *</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                      accept="image/*,.pdf,.doc,.docx"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm font-medium">Click to upload or drag & drop</p>
                      <p className="text-xs text-muted-foreground">PDF, Images, Documents (max 10MB each)</p>
                    </label>
                  </div>
                  {requestFiles.length > 0 && (
                    <div className="space-y-2">
                      {requestFiles.map((file, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex items-center gap-2">
                            {file.type.startsWith('image/') ? <Image className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                            <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setRequestFiles(prev => prev.filter((_, j) => j !== i))}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
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
                    <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
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
              {uploading ? 'Uploading...' : editingRequest ? 'Update' : 'Send for Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
