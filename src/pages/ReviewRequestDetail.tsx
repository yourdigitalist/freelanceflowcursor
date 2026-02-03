import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
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
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Send,
  ExternalLink,
  Copy,
  FileText,
  Image,
  CheckCircle,
  XCircle,
  MessageSquare,
  Clock,
  Calendar,
  User,
  FolderOpen,
} from 'lucide-react';

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
  clients?: { name: string; email: string } | null;
  projects?: { name: string } | null;
  review_folders?: { name: string; emoji: string; color: string } | null;
}

interface ReviewFile {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
}

interface ReviewComment {
  id: string;
  content: string;
  commenter_name: string | null;
  commenter_email: string | null;
  x_position: number | null;
  y_position: number | null;
  created_at: string;
  review_file_id: string;
}

interface ReviewRecipient {
  id: string;
  email: string;
}

interface ReviewFolder {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export default function ReviewRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [request, setRequest] = useState<ReviewRequest | null>(null);
  const [files, setFiles] = useState<ReviewFile[]>([]);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [recipients, setRecipients] = useState<ReviewRecipient[]>([]);
  const [folders, setFolders] = useState<ReviewFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [imageViewFile, setImageViewFile] = useState<ReviewFile | null>(null);

  const fetchData = useCallback(async () => {
    if (!user || !id) return;
    
    const [requestRes, filesRes, commentsRes, recipientsRes, foldersRes] = await Promise.all([
      supabase.from('review_requests').select(`
        *,
        clients(name, email),
        projects(name),
        review_folders(name, emoji, color)
      `).eq('id', id).eq('user_id', user.id).single(),
      supabase.from('review_files').select('*').eq('review_request_id', id),
      supabase.from('review_comments').select('*').eq('review_request_id', id).order('created_at', { ascending: false }),
      supabase.from('review_recipients').select('*').eq('review_request_id', id),
      supabase.from('review_folders').select('*').eq('user_id', user.id).order('name'),
    ]);
    
    if (requestRes.error) {
      toast({ title: 'Request not found', variant: 'destructive' });
      navigate('/reviews');
      return;
    }
    
    setRequest(requestRes.data as ReviewRequest);
    setFiles(filesRes.data || []);
    setComments(commentsRes.data || []);
    setRecipients(recipientsRes.data || []);
    setFolders(foldersRes.data || []);
    setLoading(false);
  }, [user, id, navigate, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getClientReviewUrl = () => {
    if (!request) return '';
    return `${window.location.origin}/review/${request.share_token}`;
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(getClientReviewUrl());
    toast({ title: 'Link copied to clipboard' });
  };

  const openClientView = () => {
    window.open(getClientReviewUrl(), '_blank');
  };

  const updateStatus = async (status: string) => {
    if (!request) return;
    
    const { error } = await supabase
      .from('review_requests')
      .update({ status })
      .eq('id', request.id);
    
    if (error) {
      toast({ title: 'Error updating status', variant: 'destructive' });
      return;
    }
    
    toast({ title: 'Status updated' });
    fetchData();
  };

  const handleMoveToFolder = async (folderId: string | null) => {
    if (!request) return;
    const { error } = await supabase
      .from('review_requests')
      .update({ folder_id: folderId || null })
      .eq('id', request.id);
    if (error) {
      toast({ title: 'Error moving to folder', variant: 'destructive' });
      return;
    }
    toast({ title: folderId ? 'Moved to folder' : 'Removed from folder' });
    fetchData();
  };

  const handleSendToClient = async () => {
    if (!request) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-review-request', {
        body: { reviewRequestId: request.id, origin: window.location.origin },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: request.sent_at ? 'Reminder sent' : 'Review request sent',
        description: 'Recipients have been emailed.',
      });
      fetchData();
    } catch (err: any) {
      toast({
        title: 'Error sending',
        description: err?.message || 'Could not send email. You can still share the link.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
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

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">Loading...</div>
      </AppLayout>
    );
  }

  if (!request) {
    return (
      <AppLayout>
        <div className="text-center py-12">Request not found</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/reviews')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{request.title}</h1>
              {getStatusBadge(request.status)}
            </div>
            <p className="text-muted-foreground">v{request.version} • {request.clients?.name || 'No client'}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={copyShareLink}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
            <Button variant="outline" onClick={openClientView}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View as Client
            </Button>
            <Button onClick={handleSendToClient} disabled={sending}>
              <Send className="h-4 w-4 mr-2" />
              {request.sent_at ? 'Send reminder' : 'Send to client'}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Files */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Files ({files.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {files.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No files uploaded</p>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {files.map(file => {
                        const isImage = file.file_type?.startsWith('image/');
                        return isImage ? (
                          <button
                            key={file.id}
                            type="button"
                            onClick={() => setImageViewFile(file)}
                            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors text-left w-full"
                          >
                            <div className="h-12 w-12 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                              <img src={file.file_url} alt={file.file_name} className="h-full w-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{file.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                Click to view with comment locations
                              </p>
                            </div>
                          </button>
                        ) : (
                          <a
                            key={file.id}
                            href={file.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors"
                          >
                            <div className="h-12 w-12 rounded bg-muted flex items-center justify-center shrink-0">
                              <FileText className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{file.file_name}</p>
                              <p className="text-xs text-muted-foreground">Click to view</p>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                    {/* Image viewer with comment pins (like client view) */}
                    <Dialog open={!!imageViewFile} onOpenChange={(open) => !open && setImageViewFile(null)}>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                        <DialogHeader>
                          <DialogTitle>{imageViewFile?.file_name}</DialogTitle>
                        </DialogHeader>
                        {imageViewFile?.file_type?.startsWith('image/') && (
                          <div className="relative inline-block max-w-full">
                            <img
                              src={imageViewFile.file_url}
                              alt={imageViewFile.file_name}
                              className="max-w-full h-auto rounded-lg"
                            />
                            {comments
                              .filter(c => c.review_file_id === imageViewFile.id && c.x_position != null && c.y_position != null)
                              .map((comment, i) => (
                                <div
                                  key={comment.id}
                                  className="absolute w-6 h-6 -ml-3 -mt-3 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold shadow-lg"
                                  style={{
                                    left: `${comment.x_position}%`,
                                    top: `${comment.y_position}%`,
                                  }}
                                  title={comment.content}
                                >
                                  {i + 1}
                                </div>
                              ))}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Comments - grouped by file when multiple files */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Comments ({comments.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {comments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No comments yet</p>
                ) : files.length <= 1 ? (
                  <div className="space-y-4">
                    {comments.map(comment => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {comment.commenter_name?.slice(0, 2).toUpperCase() || 'AN'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {comment.commenter_name || 'Anonymous'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                          {comment.commenter_email && (
                            <p className="text-xs text-muted-foreground">{comment.commenter_email}</p>
                          )}
                          <p className="text-sm mt-1">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {files.map(file => {
                      const fileComments = comments.filter(c => c.review_file_id === file.id);
                      if (fileComments.length === 0) return null;
                      return (
                        <div key={file.id} className="space-y-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                            <FileText className="h-4 w-4" />
                            {file.file_name}
                          </div>
                          <div className="space-y-4 pl-2">
                            {fileComments.map(comment => (
                              <div key={comment.id} className="flex gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs">
                                    {comment.commenter_name?.slice(0, 2).toUpperCase() || 'AN'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">
                                      {comment.commenter_name || 'Anonymous'}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                                    </span>
                                  </div>
                                  {comment.commenter_email && (
                                    <p className="text-xs text-muted-foreground">{comment.commenter_email}</p>
                                  )}
                                  <p className="text-sm mt-1">{comment.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {request.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="text-sm mt-1">{request.description}</p>
                  </div>
                )}
                
                <Separator />
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Client:</span>
                    <span>{request.clients?.name || 'Not assigned'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground shrink-0">Folder:</span>
                    <Select
                      value={request.folder_id || 'none'}
                      onValueChange={(v) => handleMoveToFolder(v === 'none' ? null : v)}
                    >
                      <SelectTrigger className="h-8 flex-1">
                        <SelectValue placeholder="No folder" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No folder</SelectItem>
                        {folders.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.emoji} {f.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {request.projects && (
                    <div className="flex items-center gap-2 text-sm">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Project:</span>
                      <span>{request.projects.name}</span>
                    </div>
                  )}
                  
                  {request.due_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Due:</span>
                      <span>{format(new Date(request.due_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Created:</span>
                    <span>{format(new Date(request.created_at), 'MMM d, yyyy')}</span>
                  </div>
                  
                  {request.sent_at && (
                    <div className="flex items-center gap-2 text-sm">
                      <Send className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Sent:</span>
                      <span>{format(new Date(request.sent_at), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recipients */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recipients</CardTitle>
              </CardHeader>
              <CardContent>
                {recipients.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No recipients</p>
                ) : (
                  <div className="space-y-2">
                    {recipients.map(r => (
                      <p key={r.id} className="text-sm">{r.email}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Update Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant={request.status === 'approved' ? 'default' : 'outline'} 
                  className={request.status === 'approved' ? 'w-full justify-start bg-green-600 hover:bg-green-700 text-white' : 'w-full justify-start'}
                  onClick={() => updateStatus('approved')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approved
                </Button>
                <Button 
                  variant={request.status === 'rejected' ? 'default' : 'outline'} 
                  className={request.status === 'rejected' ? 'w-full justify-start bg-red-600 hover:bg-red-700 text-white' : 'w-full justify-start'}
                  onClick={() => updateStatus('rejected')}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejected
                </Button>
                <Button 
                  variant={request.status === 'pending' ? 'default' : 'outline'} 
                  className={request.status === 'pending' ? 'w-full justify-start bg-amber-500 hover:bg-amber-600 text-white' : 'w-full justify-start'}
                  onClick={() => updateStatus('pending')}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Pending
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
