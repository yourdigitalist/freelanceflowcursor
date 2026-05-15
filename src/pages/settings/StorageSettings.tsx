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
import { HardDrive, Trash2, FileText, Loader2, AlertTriangle } from '@/components/icons';
import {
  MAX_USER_STORAGE_BYTES,
  listUserStorageFiles,
  type UserStorageFile,
} from '@/lib/userStorage';

export default function StorageSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<UserStorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserStorageFile | null>(null);

  const fetchFiles = async () => {
    if (!user) return;
    try {
      setFiles(await listUserStorageFiles(user.id));
    } catch (e) {
      console.error(e);
      toast({ title: 'Error loading storage', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setLoading(true);
      void fetchFiles();
    }
  }, [user?.id]);

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
  const maxMB = (MAX_USER_STORAGE_BYTES / (1024 * 1024)).toFixed(0);
  const percentUsed = Math.min(100, Math.round((totalBytes / MAX_USER_STORAGE_BYTES) * 100));

  const handleDeleteConfirm = async () => {
    if (!confirmDelete || !user) return;
    setDeletingId(confirmDelete.id);
    try {
      if (confirmDelete.id.startsWith('review:')) {
        const reviewFileId = confirmDelete.id.replace('review:', '');
        const pathMatch = confirmDelete.path.match(/review-files\/(.+)$/);
        if (pathMatch?.[1]) {
          await supabase.storage.from('review-files').remove([pathMatch[1]]);
        }
        const { data: fileRow } = await supabase
          .from('review_files')
          .select('review_request_id')
          .eq('id', reviewFileId)
          .single();
        await supabase.from('review_files').delete().eq('id', reviewFileId);
        if (fileRow?.review_request_id) {
          const { count } = await supabase
            .from('review_files')
            .select('id', { count: 'exact', head: true })
            .eq('review_request_id', fileRow.review_request_id);
          if (!count) {
            await supabase.from('review_requests').delete().eq('id', fileRow.review_request_id);
          }
        }
      } else {
        await supabase.storage.from(confirmDelete.bucket).remove([confirmDelete.path]);
        if (confirmDelete.bucket === 'business-logos') {
          const { data: profile } = await supabase
            .from('profiles')
            .select('business_logo')
            .eq('user_id', user.id)
            .maybeSingle();
          if (profile?.business_logo?.includes(confirmDelete.path)) {
            await supabase.from('profiles').update({ business_logo: null }).eq('user_id', user.id);
          }
        }
        if (confirmDelete.bucket === 'proposal-images') {
          await supabase
            .from('profiles')
            .update({ proposal_default_cover_image_url: null })
            .eq('user_id', user.id)
            .eq('proposal_default_cover_image_url', confirmDelete.path);
          await supabase
            .from('proposals')
            .update({ cover_image_url: null })
            .eq('user_id', user.id)
            .eq('cover_image_url', confirmDelete.path);
        }
        if (confirmDelete.bucket === 'client-logos') {
          await supabase.from('clients').update({ logo_url: null }).eq('user_id', user.id).eq('logo_url', confirmDelete.path);
        }
        if (confirmDelete.bucket === 'avatars') {
          await supabase.from('profiles').update({ avatar_url: null }).eq('user_id', user.id);
        }
      }
      toast({ title: 'File deleted' });
      setConfirmDelete(null);
      await fetchFiles();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: 'Error deleting file', description: message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Storage</h1>
        <p className="text-muted-foreground">Manage your uploaded files. Max {maxMB}MB per user.</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Usage
          </CardTitle>
          <CardDescription>
            {totalMB}MB of {maxMB}MB used. Includes company logos, proposal covers, client logos, profile photos, and
            review files.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${percentUsed}%` }} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Files</CardTitle>
          <CardDescription>All files stored in your Lance account.</CardDescription>
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
                <li key={file.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  {file.previewUrl && /\.(png|jpe?g|gif|webp)/i.test(file.name) ? (
                    <img
                      src={file.previewUrl}
                      alt=""
                      className="h-10 w-10 rounded object-cover shrink-0 border bg-muted"
                    />
                  ) : (
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.category} · {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  {file.canDelete ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setConfirmDelete(file)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
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
              Delete &quot;{confirmDelete?.name}&quot;? Linked settings may be cleared if this file is in use.
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
            <Button variant="destructive" onClick={() => void handleDeleteConfirm()} disabled={!!deletingId}>
              {deletingId ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete file
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
