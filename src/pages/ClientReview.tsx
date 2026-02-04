import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  FileText,
  MessageSquare,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReviewRequest {
  id: string;
  title: string;
  description: string | null;
  version: string;
  status: string;
  due_date: string | null;
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

interface CommentPin {
  x: number;
  y: number;
}

export default function ClientReview() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  
  const [request, setRequest] = useState<ReviewRequest | null>(null);
  const [files, setFiles] = useState<ReviewFile[]>([]);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Viewer state
  const [selectedFile, setSelectedFile] = useState<ReviewFile | null>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  
  // Comment state
  const [pendingPin, setPendingPin] = useState<CommentPin | null>(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [commenterName, setCommenterName] = useState('');
  const [commenterEmail, setCommenterEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Identity dialog
  const [identityDialogOpen, setIdentityDialogOpen] = useState(false);
  const [identitySaved, setIdentitySaved] = useState(false);
  
  const imageRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    
    try {
      // Use edge function to fetch review data (works without auth)
      const { data, error: fetchError } = await supabase.functions.invoke('get-review', {
        body: { token }
      });

      if (fetchError || data?.error) {
        console.error('Error fetching review:', fetchError || data?.error);
        setError('Review not found or link has expired');
        setLoading(false);
        return;
      }

      setRequest(data.request);
      setFiles(data.files || []);
      setComments(data.comments || []);
      
      if (data.files && data.files.length > 0) {
        setSelectedFile(data.files[0]);
      }
    } catch (err) {
      console.error('Error fetching review:', err);
      setError('Review not found or link has expired');
    }
    
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchData();
    
    // Load saved identity
    const savedName = localStorage.getItem('reviewer_name');
    const savedEmail = localStorage.getItem('reviewer_email');
    if (savedName && savedEmail) {
      setCommenterName(savedName);
      setCommenterEmail(savedEmail);
      setIdentitySaved(true);
    }
  }, [fetchData]);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedFile?.file_type?.startsWith('image/') || !imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setPendingPin({ x, y });
    
    if (!identitySaved) {
      setIdentityDialogOpen(true);
    } else {
      setCommentDialogOpen(true);
    }
  };

  const saveIdentity = () => {
    if (!commenterName.trim() || !commenterEmail.trim()) return;
    
    localStorage.setItem('reviewer_name', commenterName);
    localStorage.setItem('reviewer_email', commenterEmail);
    setIdentitySaved(true);
    setIdentityDialogOpen(false);
    setCommentDialogOpen(true);
  };

  const submitComment = async () => {
    if (!request || !selectedFile || !commentContent.trim()) return;
    
    setSubmitting(true);
    
    try {
      // Use edge function to submit comment (works without auth)
      const { data, error: submitError } = await supabase.functions.invoke('submit-review-comment', {
        body: {
          token,
          review_file_id: selectedFile.id,
          content: commentContent,
          commenter_name: commenterName,
          commenter_email: commenterEmail,
          x_position: pendingPin?.x || null,
          y_position: pendingPin?.y || null,
        }
      });

      if (submitError || data?.error) {
        toast({ title: data?.error || 'Error adding comment', variant: 'destructive' });
        setSubmitting(false);
        return;
      }

      toast({ title: 'Comment added' });
      setCommentContent('');
      setPendingPin(null);
      setCommentDialogOpen(false);
      setSubmitting(false);
      fetchData();
    } catch (err) {
      console.error('Error submitting comment:', err);
      toast({ title: 'Error adding comment', variant: 'destructive' });
      setSubmitting(false);
    }
  };

  const submitApproval = async (approved: boolean) => {
    if (!request) return;
    
    if (!identitySaved) {
      setIdentityDialogOpen(true);
      return;
    }
    
    try {
      // Use edge function to update status (works without auth)
      const { data, error: submitError } = await supabase.functions.invoke('update-review-status', {
        body: {
          token,
          status: approved ? 'approved' : 'rejected',
          commenter_name: commenterName,
          commenter_email: commenterEmail,
        }
      });

      if (submitError || data?.error) {
        toast({ title: data?.error || 'Error updating status', variant: 'destructive' });
        return;
      }

      toast({ title: approved ? 'Review approved!' : 'Review rejected' });
      fetchData();
    } catch (err) {
      console.error('Error updating status:', err);
      toast({ title: 'Error updating status', variant: 'destructive' });
    }
  };

  const navigateFile = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? Math.max(0, selectedFileIndex - 1)
      : Math.min(files.length - 1, selectedFileIndex + 1);
    setSelectedFileIndex(newIndex);
    setSelectedFile(files[newIndex]);
    setZoom(1);
  };

  const fileComments = comments.filter(c => c.review_file_id === selectedFile?.id);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading review...</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 pb-6 text-center space-y-4">
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Link expired or invalid</h2>
            <p className="text-muted-foreground text-sm">
              This review link may have expired or the address is incorrect. Please ask the sender for a new link.
            </p>
            <Button
              variant="outline"
              onClick={() => { setError(null); setLoading(true); fetchData(); }}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">{request.title}</h1>
              <p className="text-sm text-muted-foreground">v{request.version}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={request.status === 'approved' ? 'default' : request.status === 'rejected' ? 'destructive' : 'secondary'}>
                {request.status}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => submitApproval(false)}>
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button size="sm" onClick={() => submitApproval(true)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* File List Sidebar */}
        <aside className="w-64 border-r bg-card hidden md:block">
          <div className="p-4">
            <h2 className="font-medium mb-3">Files ({files.length})</h2>
            <div className="space-y-2">
              {files.map((file, index) => (
                <button
                  key={file.id}
                  onClick={() => { setSelectedFile(file); setSelectedFileIndex(index); setZoom(1); }}
                  className={cn(
                    "w-full p-3 rounded-lg text-left transition-colors flex items-center gap-3",
                    selectedFile?.id === file.id ? "bg-primary/10 border border-primary" : "hover:bg-muted"
                  )}
                >
                  {file.file_type?.startsWith('image/') ? (
                    <div className="h-10 w-10 rounded bg-muted overflow-hidden flex-shrink-0">
                      <img src={file.file_url} alt="" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <span className="text-sm truncate">{file.file_name}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Viewer */}
        <main className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="flex items-center justify-between p-2 border-b bg-card">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigateFile('prev')} disabled={selectedFileIndex === 0}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedFileIndex + 1} of {files.length}
              </span>
              <Button variant="ghost" size="icon" onClick={() => navigateFile('next')} disabled={selectedFileIndex === files.length - 1}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm w-16 text-center">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(3, z + 0.25))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Image/File Viewer */}
          <div className="flex-1 overflow-auto bg-muted/30 relative">
            {selectedFile && (
              <div className="min-h-full flex items-center justify-center p-8">
                {selectedFile.file_type?.startsWith('image/') ? (
                  <div
                    ref={imageRef}
                    className="relative cursor-crosshair"
                    onClick={handleImageClick}
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                  >
                    <img
                      src={selectedFile.file_url}
                      alt={selectedFile.file_name}
                      className="max-w-full shadow-lg rounded"
                    />
                    {/* Comment pins */}
                    {fileComments
                      .filter(c => c.x_position != null && c.y_position != null)
                      .map((comment, i) => (
                        <div
                          key={comment.id}
                          className="absolute w-6 h-6 -ml-3 -mt-3 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold shadow-lg cursor-pointer hover:scale-110 transition-transform"
                          style={{ left: `${comment.x_position}%`, top: `${comment.y_position}%` }}
                          title={comment.content}
                        >
                          {i + 1}
                        </div>
                      ))}
                    {/* Pending pin */}
                    {pendingPin && (
                      <div
                        className="absolute w-6 h-6 -ml-3 -mt-3 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs animate-pulse"
                        style={{ left: `${pendingPin.x}%`, top: `${pendingPin.y}%` }}
                      >
                        +
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <FileText className="h-24 w-24 text-muted-foreground mx-auto mb-4" />
                    <p className="font-medium">{selectedFile.file_name}</p>
                    <a
                      href={selectedFile.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      Download file
                    </a>
                  </div>
                )}
              </div>
            )}
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-muted-foreground bg-background/80 px-3 py-1 rounded-full">
              Click on the image to add a comment
            </p>
          </div>
        </main>

        {/* Comments Sidebar - grouped by file when multiple files */}
        <aside className="w-80 border-l bg-card hidden lg:flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comments ({comments.length})
            </h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No comments yet. Click on the image to add one.
                </p>
              ) : files.length <= 1 ? (
                fileComments.map((comment, i) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="flex-shrink-0">
                      {comment.x_position != null ? (
                        <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </div>
                      ) : (
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {comment.commenter_name?.slice(0, 2).toUpperCase() || 'AN'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {comment.commenter_name || 'Anonymous'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), 'MMM d')}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{comment.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                files.map((file) => {
                  const fileCommentsList = comments.filter((c) => c.review_file_id === file.id);
                  if (fileCommentsList.length === 0) return null;
                  return (
                    <div key={file.id} className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                        {file.file_type?.startsWith('image/') ? (
                          <div className="h-6 w-6 rounded overflow-hidden flex-shrink-0">
                            <img src={file.file_url} alt="" className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <FileText className="h-4 w-4 flex-shrink-0" />
                        )}
                        <span className="truncate">{file.file_name}</span>
                      </div>
                      <div className="space-y-4 pl-1">
                        {fileCommentsList.map((comment, i) => (
                          <div key={comment.id} className="flex gap-3">
                            <div className="flex-shrink-0">
                              {comment.x_position != null ? (
                                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                                  {i + 1}
                                </div>
                              ) : (
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">
                                    {comment.commenter_name?.slice(0, 2).toUpperCase() || 'AN'}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">
                                  {comment.commenter_name || 'Anonymous'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(comment.created_at), 'MMM d')}
                                </span>
                              </div>
                              <p className="text-sm mt-1">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
          
          {/* Quick comment */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Add a general comment..."
                value={commentContent}
                onChange={e => setCommentContent(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && commentContent.trim()) {
                    if (!identitySaved) {
                      setIdentityDialogOpen(true);
                    } else {
                      submitComment();
                    }
                  }
                }}
              />
              <Button size="icon" onClick={() => {
                if (!identitySaved) {
                  setIdentityDialogOpen(true);
                } else if (commentContent.trim()) {
                  submitComment();
                }
              }}>
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {/* Identity Dialog */}
      <Dialog open={identityDialogOpen} onOpenChange={setIdentityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Who are you?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                value={commenterName}
                onChange={e => setCommenterName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Your Email</Label>
              <Input
                id="email"
                type="email"
                value={commenterEmail}
                onChange={e => setCommenterEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveIdentity} disabled={!commenterName.trim() || !commenterEmail.trim()}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comment Dialog */}
      <Dialog open={commentDialogOpen} onOpenChange={(open) => {
        setCommentDialogOpen(open);
        if (!open) setPendingPin(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Comment</Label>
              <Textarea
                value={commentContent}
                onChange={e => setCommentContent(e.target.value)}
                placeholder="Enter your feedback..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCommentDialogOpen(false); setPendingPin(null); }}>
              Cancel
            </Button>
            <Button onClick={submitComment} disabled={submitting || !commentContent.trim()}>
              {submitting ? 'Adding...' : 'Add Comment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
