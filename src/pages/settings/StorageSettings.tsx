import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { HardDrive, Trash2, FileText, Image, Loader2, AlertTriangle } from 'lucide-react';

const MAX_STORAGE_BYTES = 10 * 1024 * 1024; // 10MB per user

interface StorageFile {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  review_request_id: string;
  review_requests?: { title: string } | null;
  file_url: string;
}

export default function StorageSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<StorageFile | null>(null);

  useEffect(() => {
    if (user) fetchFiles();
  }, [user]);

  const fetchFiles = async () => {
    if (!user) return;
    try {
      const { data: requests } = await supabase
        .from('review_requests')
        .select('id')
        .eq('user_id', user.id);
      const requestIds = (requests || []).map((r) => r.id);
      if (requestIds.length === 0) {
        setFiles([]);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('review_files')
        .select(`
          id,
          file_name,
          file_type,
          file_size,
          review_request_id,
          file_url,
          review_requests(title)
        `)
        .in('review_request_id', requestIds);
      if (error) throw error;
      setFiles((data as StorageFile[]) || []);
    } catch (e) {
      console.error(e);
      toast({ title: 'Error loading storage', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const totalBytes = files.reduce((sum, f) => sum + (f.file_size || 0), 0);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
  const maxMB = (MAX_STORAGE_BYTES / (1024 * 1024)).toFixed(0);
  const percentUsed = Math.min(100, Math.round((totalBytes / MAX_STORAGE_BYTES) * 100));

  const handleDeleteClick = (file: StorageFile) => {
    setConfirmDelete(file);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete || !user) return;
    setDeletingId(confirmDelete.id);
    try {
      const { data: reviewRequest } = await supabase
        .from('review_requests')
        .select('id')
        .eq('id', confirmDelete.review_request_id)
        .single();
      const { data: otherFiles } = await supabase
        .from('review_files')
        .select('id')
        .eq('review_request_id', confirmDelete.review_request_id)
        .neq('id', confirmDelete.id);
      const isOnlyFile = !otherFiles?.length;

      const pathMatch = confirmDelete.file_url.match(/review-files\/(.+)$/);
      const storagePath = pathMatch ? pathMatch[1] : null;
      if (storagePath) {
        await supabase.storage.from('review-files').remove([storagePath]);
      }
      await supabase.from('review_files').delete().eq('id', confirmDelete.id);
      if (isOnlyFile && reviewRequest) {
        await supabase.from('review_requests').delete().eq('id', confirmDelete.review_request_id);
        toast({ title: 'File and review request deleted' });
      } else {
        toast({ title: 'File deleted' });
      }
      setConfirmDelete(null);
      fetchFiles();
    } catch (e: any) {
      toast({ title: 'Error deleting file', description: e.message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const reviewTitle = confirmDelete?.review_requests?.title || 'this review';

  return (
    <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Storage</h1>
          <p className="text-muted-foreground">
            Manage your uploaded files. Max {maxMB}MB per user.
          </p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Usage
            </CardTitle>
            <CardDescription>
              {totalMB}MB of {maxMB}MB used
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${percentUsed}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Files</CardTitle>
            <CardDescription>
              Review files you've uploaded. Deleting a file removes it from the review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : files.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No files yet</p>
            ) : (
              <ul className="space-y-3">
                {files.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    {file.file_type?.startsWith('image/') ? (
                      <Image className="h-5 w-5 text-muted-foreground shrink-0" />
                    ) : (
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {((file.file_size || 0) / 1024).toFixed(1)} KB
                        {file.review_requests?.title && (
                          <> · {file.review_requests.title}</>
                        )}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClick(file)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete file?</DialogTitle>
              <DialogDescription>
                This file is part of review request &quot;{reviewTitle}&quot;. Deleting it will
                remove the file from that review. If it&apos;s the only file in that review, the
                review request will be deleted as well.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>This action cannot be undone.</span>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={!!deletingId}
              >
                {deletingId ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Delete file
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
