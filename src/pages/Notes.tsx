import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DocumentEditor } from '@/components/notes/DocumentEditor';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileText, Trash2, Download } from '@/components/icons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface Note {
  id: string;
  title: string;
  content: string | null;
  client_id: string | null;
  project_id: string | null;
  tags: string[];
  icon_emoji: string | null;
  cover_color: string | null;
  note_comment: string | null;
  created_at: string;
  updated_at: string;
}

const DEBOUNCE_MS = 800;

function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function Notes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newNoteOpen, setNewNoteOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createTaskTitle, setCreateTaskTitle] = useState('');
  const [createTaskProjectId, setCreateTaskProjectId] = useState('');
  const [createTaskSubmitting, setCreateTaskSubmitting] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteClientId, setNewNoteClientId] = useState<string>('');
  const [newNoteProjectId, setNewNoteProjectId] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [iconEmoji, setIconEmoji] = useState<string>('');
  const [coverColor, setCoverColor] = useState<string>('');
  const [noteComment, setNoteComment] = useState<string>('');
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('clients').select('id, name').eq('user_id', user.id).order('name').then(({ data }) => setClients((data as { id: string; name: string }[]) || []));
    supabase.from('projects').select('id, name').eq('user_id', user.id).order('updated_at', { ascending: false }).then(({ data }) => setProjects((data as { id: string; name: string }[]) || []));
  }, [user]);

  useEffect(() => {
    if (user) fetchNotes();
  }, [user]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('id, title, content, client_id, project_id, tags, icon_emoji, cover_color, note_comment, created_at, updated_at')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      const list = (data || []).map((n: any) => ({ ...n, tags: n.tags || [], icon_emoji: n.icon_emoji ?? null, cover_color: n.cover_color ?? null, note_comment: n.note_comment ?? null }));
      setNotes(list as Note[]);
      if (!selectedId && list[0]) {
        setSelectedId(list[0].id);
      }
    } catch (err: any) {
      toast({ title: 'Error loading notes', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const selectedNote = notes.find((n) => n.id === selectedId);
  const prevSelectedIdRef = useRef<string | null>(null);

  // Sync from selected note only when switching notes (prevents jump when save updates the list)
  useEffect(() => {
    if (selectedId !== prevSelectedIdRef.current) {
      prevSelectedIdRef.current = selectedId;
      const note = notes.find((n) => n.id === selectedId);
      if (note) {
        setTitle(note.title);
        setContent(note.content || '');
        setTags(note.tags || []);
        setIconEmoji(note.icon_emoji || '');
        setCoverColor(note.cover_color || '');
        setNoteComment(note.note_comment || '');
      } else {
        setTitle('');
        setContent('');
        setTags([]);
        setIconEmoji('');
        setCoverColor('');
        setNoteComment('');
      }
    }
  }, [selectedId, notes]);

  const persistNote = useCallback(async (noteId: string, payload: { title: string; content: string; tags: string[]; icon_emoji?: string; cover_color?: string; note_comment?: string }) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('notes')
        .update({
          title: payload.title,
          content: payload.content,
          tags: payload.tags,
          icon_emoji: payload.icon_emoji ?? null,
          cover_color: payload.cover_color ?? null,
          note_comment: payload.note_comment ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId)
        .eq('user_id', user!.id);
      if (error) throw error;
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId
            ? { ...n, title: payload.title, content: payload.content, tags: payload.tags, icon_emoji: payload.icon_emoji ?? null, cover_color: payload.cover_color ?? null, note_comment: payload.note_comment ?? null }
            : n
        )
      );
    } catch (err: any) {
      toast({ title: 'Error saving note', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!selectedId || !user) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const note = notes.find((n) => n.id === selectedId);
      if (note && (title !== note.title || content !== (note.content || '') || JSON.stringify(tags) !== JSON.stringify(note.tags || []) || iconEmoji !== (note.icon_emoji || '') || coverColor !== (note.cover_color || '') || noteComment !== (note.note_comment || ''))) {
        persistNote(selectedId, { title, content, tags, icon_emoji: iconEmoji || undefined, cover_color: coverColor || undefined, note_comment: noteComment || undefined });
      }
      saveTimeoutRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [title, content, tags, iconEmoji, coverColor, noteComment, selectedId, notes, user, persistNote]);

  const handleRequestCreateTask = useCallback((selectedText: string) => {
    setCreateTaskTitle(selectedText);
    setCreateTaskProjectId('');
    setCreateTaskOpen(true);
  }, []);

  const handleCreateTaskFromNote = async () => {
    if (!createTaskProjectId || !createTaskTitle.trim() || !user) return;
    setCreateTaskSubmitting(true);
    try {
      const { data: statuses } = await supabase
        .from('project_statuses')
        .select('id')
        .eq('project_id', createTaskProjectId)
        .order('sort_order', { ascending: true })
        .limit(1);
      const statusId = statuses?.[0]?.id ?? null;
      const { error } = await supabase.from('tasks').insert({
        title: createTaskTitle.trim(),
        project_id: createTaskProjectId,
        status_id: statusId,
        status: 'todo',
        priority: 'medium',
        user_id: user.id,
      });
      if (error) throw error;
      toast({ title: 'Task created' });
      setCreateTaskOpen(false);
      setCreateTaskTitle('');
      setCreateTaskProjectId('');
    } catch (err: any) {
      toast({ title: 'Error creating task', description: err.message, variant: 'destructive' });
    } finally {
      setCreateTaskSubmitting(false);
    }
  };

  const handleOpenNewNoteDialog = () => {
    setNewNoteTitle('');
    setNewNoteClientId('');
    setNewNoteProjectId('');
    setNewNoteOpen(true);
  };

  const handleCreateFromDialog = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user!.id,
          title: newNoteTitle.trim() || 'Untitled',
          content: '',
          client_id: newNoteClientId || null,
          project_id: newNoteProjectId || null,
          tags: [],
        })
        .select('id, title, content, client_id, project_id, tags, created_at, updated_at')
        .single();
      if (error) throw error;
      const newNote = { ...data, tags: (data as any).tags || [] } as Note;
      setNotes((prev) => [newNote, ...prev]);
      setSelectedId(newNote.id);
      setTitle(newNote.title);
      setContent(newNote.content || '');
      setTags(newNote.tags || []);
      setNewNoteOpen(false);
      toast({ title: 'Note created' });
    } catch (err: any) {
      toast({ title: 'Error creating note', description: err.message, variant: 'destructive' });
    }
  };

  const downloadNoteAsDoc = useCallback(() => {
    if (!selectedNote || !title) return;
    const dateLabel = selectedNote.updated_at
      ? new Date(selectedNote.updated_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
      : new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    const safeTitle = (title || 'Untitled').replace(/[<>:"/\\|?*]/g, '').trim() || 'Note';
    const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>${escapeHtmlAttr(title || 'Untitled')}</title></head>
<body>
<h1>${escapeHtmlAttr(title || 'Untitled')}</h1>
<p style="color:#666;font-size:14px;">${escapeHtmlAttr(dateLabel)}</p>
<div style="margin-top:1em;">${content || ''}</div>
</body>
</html>`;
    const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = selectedNote.updated_at ? selectedNote.updated_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
    a.download = `${safeTitle}_${dateStr}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedNote, title, content]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('notes').delete().eq('id', id).eq('user_id', user!.id);
      if (error) throw error;
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (selectedId === id) {
        const next = notes.find((n) => n.id !== id);
        setSelectedId(next?.id ?? null);
      }
      setDeleteConfirmId(null);
      toast({ title: 'Note deleted' });
    } catch (err: any) {
      toast({ title: 'Error deleting note', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-muted/30 flex flex-col shrink-0">
          <div className="p-3 border-b flex items-center justify-between">
            <h2 className="font-semibold text-sm">Notes</h2>
            <Button size="sm" onClick={handleOpenNewNoteDialog}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {loading ? (
                <p className="text-sm text-muted-foreground p-2">Loading…</p>
              ) : notes.length === 0 ? (
                <p className="text-sm text-muted-foreground p-2">No notes yet</p>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className={cn(
                      'group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer',
                      selectedId === note.id ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-muted'
                    )}
                    onClick={() => setSelectedId(note.id)}
                  >
                    <FileText className="h-4 w-4 shrink-0 opacity-70" />
                    <span className="truncate flex-1">{note.title || 'Untitled'}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(note.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Editor */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-3xl mx-auto px-6 py-8">
            {selectedNote ? (
              <>
                {/* Saving indicator + Download as doc */}
                <div className="h-9 mb-1 flex items-center justify-between">
                  <div>
                    {saving && (
                      <p className="text-xs text-muted-foreground">Saving…</p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadNoteAsDoc} className="gap-1.5">
                    <Download className="h-4 w-4" />
                    Download as doc
                  </Button>
                </div>
                <DocumentEditor
                  title={title}
                  onTitleChange={setTitle}
                  content={content}
                  onContentChange={setContent}
                  tags={tags}
                  onTagsChange={setTags}
                  iconEmoji={iconEmoji}
                  onIconEmojiChange={setIconEmoji}
                  coverColor={coverColor}
                  onCoverColorChange={setCoverColor}
                  noteComment={noteComment}
                  onNoteCommentChange={setNoteComment}
                  onRequestCreateTask={handleRequestCreateTask}
                  updatedAt={selectedNote.updated_at}
                  clientName={selectedNote.client_id ? (clients.find((c) => c.id === selectedNote.client_id)?.name ?? null) : null}
                  projectName={selectedNote.project_id ? (projects.find((p) => p.id === selectedNote.project_id)?.name ?? null) : null}
                  placeholder="Write your note… Type @ to link a client, project, or task."
                  minHeight="400px"
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-1">No note selected</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a note or select one from the sidebar
                </p>
                <Button onClick={handleOpenNewNoteDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  New note
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>

      <Dialog open={createTaskOpen} onOpenChange={setCreateTaskOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create task from selection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Task title</Label>
              <Input
                value={createTaskTitle}
                onChange={(e) => setCreateTaskTitle(e.target.value)}
                placeholder="Task title"
              />
            </div>
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select value={createTaskProjectId} onValueChange={setCreateTaskProjectId}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTaskOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTaskFromNote} disabled={!createTaskProjectId || !createTaskTitle.trim() || createTaskSubmitting}>
              {createTaskSubmitting ? 'Creating…' : 'Create task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newNoteOpen} onOpenChange={setNewNoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-note-title">Title</Label>
              <Input
                id="new-note-title"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="e.g. Meeting notes"
              />
            </div>
            <div className="space-y-2">
              <Label>Client (optional)</Label>
              <Select value={newNoteClientId || 'none'} onValueChange={(v) => setNewNoteClientId(v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Project (optional)</Label>
              <Select value={newNoteProjectId || 'none'} onValueChange={(v) => setNewNoteProjectId(v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewNoteOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateFromDialog}>Create & open</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              This note will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
