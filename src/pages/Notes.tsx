import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DocumentEditor } from '@/components/notes/DocumentEditor';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileText, Trash2, Download, Pencil } from '@/components/icons';
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
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { FolderPlus } from '@/components/icons';
import { cn } from '@/lib/utils';

interface NoteFolder {
  id: string;
  name: string;
  emoji: string | null;
  color: string | null;
}

interface Note {
  id: string;
  title: string;
  content: string | null;
  client_id: string | null;
  project_id: string | null;
  folder_id: string | null;
  tags: string[];
  icon_emoji: string | null;
  cover_color: string | null;
  note_comment: string | null;
  created_at: string;
  updated_at: string;
}

const FOLDER_COLORS = [
  '#9B63E9', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#06B6D4'
];

const DEBOUNCE_MS = 800;

function getDefaultNoteTitle(): string {
  return `New Note ${new Date().toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
}

function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const NOTE_EXCERPT_LEN = 60;

function excerptFromHtml(html: string | null, maxLen = NOTE_EXCERPT_LEN): string {
  if (!html || !html.trim()) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  const text = (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
  return text.length <= maxLen ? text : text.slice(0, maxLen) + '…';
}

export default function Notes() {
  const [searchParams] = useSearchParams();
  const openId = searchParams.get('open');
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createTaskTitle, setCreateTaskTitle] = useState('');
  const [createTaskProjectId, setCreateTaskProjectId] = useState('');
  const [createTaskSubmitting, setCreateTaskSubmitting] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [iconEmoji, setIconEmoji] = useState<string>('');
  const [coverColor, setCoverColor] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [folderFilter, setFolderFilter] = useState<string>('all');
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<NoteFolder | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderEmoji, setFolderEmoji] = useState('📁');
  const [folderColor, setFolderColor] = useState('#9B63E9');
  const [folderIdInNote, setFolderIdInNote] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('clients').select('id, name').eq('user_id', user.id).order('name').then(({ data }) => setClients((data as { id: string; name: string }[]) || []));
    supabase.from('projects').select('id, name').eq('user_id', user.id).order('updated_at', { ascending: false }).then(({ data }) => setProjects((data as { id: string; name: string }[]) || []));
    supabase.from('note_folders').select('id, name, emoji, color').eq('user_id', user.id).order('name').then(({ data }) => setFolders((data as NoteFolder[]) || []));
  }, [user]);

  useEffect(() => {
    if (user) fetchNotes();
  }, [user]);

  useEffect(() => {
    if (openId && notes.some((n) => n.id === openId)) setSelectedId(openId);
  }, [openId, notes]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('id, title, content, client_id, project_id, folder_id, tags, icon_emoji, cover_color, note_comment, created_at, updated_at')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      const list = (data || []).map((n: any) => ({ ...n, tags: n.tags || [], folder_id: n.folder_id ?? null, icon_emoji: n.icon_emoji ?? null, cover_color: n.cover_color ?? null, note_comment: n.note_comment ?? null }));
      setNotes(list as Note[]);
      if (openId && list.some((n: Note) => n.id === openId)) {
        setSelectedId(openId);
      } else if (!selectedId && list[0]) {
        setSelectedId(list[0].id);
      }
    } catch (err: any) {
      toast({ title: 'Error loading notes', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const allTagsFromNotes = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => (n.tags || []).forEach((t) => t.trim() && set.add(t.trim())));
    return Array.from(set).sort();
  }, [notes]);

  const filteredNotes = notes.filter((n) => {
    const hasNoFolder = n.folder_id == null || n.folder_id === '';
    const matchesFolder = folderFilter === 'all' || (folderFilter === 'none' ? hasNoFolder : n.folder_id === folderFilter);
    const noteTags = n.tags || [];
    const matchesTag = tagFilter.length === 0 || tagFilter.some((t) => noteTags.includes(t));
    return matchesFolder && matchesTag;
  });
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
        setFolderIdInNote(note.folder_id ?? null);
      } else {
        setTitle('');
        setContent('');
        setTags([]);
        setIconEmoji('');
        setCoverColor('');
        setFolderIdInNote(null);
      }
    }
  }, [selectedId, notes]);

  const persistNote = useCallback(async (noteId: string, payload: { title: string; content: string; tags: string[]; icon_emoji?: string; cover_color?: string; folder_id?: string | null }) => {
    setSaving(true);
    try {
      const updatePayload: Record<string, unknown> = {
        title: payload.title,
        content: payload.content,
        tags: payload.tags,
        icon_emoji: payload.icon_emoji ?? null,
        cover_color: payload.cover_color ?? null,
        updated_at: new Date().toISOString(),
      };
      if (payload.folder_id !== undefined) updatePayload.folder_id = payload.folder_id;
      const { error } = await supabase
        .from('notes')
        .update(updatePayload)
        .eq('id', noteId)
        .eq('user_id', user!.id);
      if (error) throw error;
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId
            ? { ...n, title: payload.title, content: payload.content, tags: payload.tags, icon_emoji: payload.icon_emoji ?? null, cover_color: payload.cover_color ?? null, folder_id: payload.folder_id !== undefined ? payload.folder_id : n.folder_id }
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
      if (note && (title !== note.title || content !== (note.content || '') || JSON.stringify(tags) !== JSON.stringify(note.tags || []) || iconEmoji !== (note.icon_emoji || '') || coverColor !== (note.cover_color || '') || folderIdInNote !== (note.folder_id ?? null))) {
        persistNote(selectedId, { title, content, tags, icon_emoji: iconEmoji || undefined, cover_color: coverColor || undefined, folder_id: folderIdInNote });
      }
      saveTimeoutRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [title, content, tags, iconEmoji, coverColor, folderIdInNote, selectedId, notes, user, persistNote]);

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

  const resetFolderForm = () => {
    setFolderName('');
    setFolderEmoji('📁');
    setFolderColor('#9B63E9');
    setEditingFolder(null);
  };

  const handleSaveFolder = async () => {
    if (!user || !folderName.trim()) return;
    try {
      if (editingFolder) {
        const { error } = await supabase.from('note_folders').update({ name: folderName, emoji: folderEmoji, color: folderColor }).eq('id', editingFolder.id);
        if (error) throw error;
        toast({ title: 'Folder updated' });
      } else {
        const { error } = await supabase.from('note_folders').insert({ user_id: user.id, name: folderName, emoji: folderEmoji, color: folderColor });
        if (error) throw error;
        toast({ title: 'Folder created' });
      }
      setFolderDialogOpen(false);
      resetFolderForm();
      const { data } = await supabase.from('note_folders').select('id, name, emoji, color').eq('user_id', user.id).order('name');
      setFolders((data as NoteFolder[]) || []);
    } catch (err: any) {
      toast({ title: editingFolder ? 'Error updating folder' : 'Error creating folder', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteFolder = async (folder: NoteFolder) => {
    try {
      const { error } = await supabase.from('note_folders').delete().eq('id', folder.id);
      if (error) throw error;
      toast({ title: 'Folder deleted' });
      if (folderFilter === folder.id) setFolderFilter('all');
      const { data } = await supabase.from('note_folders').select('id, name, emoji, color').eq('user_id', user!.id).order('name');
      setFolders((data as NoteFolder[]) || []);
    } catch (err: any) {
      toast({ title: 'Error deleting folder', description: err.message, variant: 'destructive' });
    }
  };

  const handleEditFolder = (folder: NoteFolder) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderEmoji(folder.emoji || '📁');
    setFolderColor(folder.color || '#9B63E9');
    setFolderDialogOpen(true);
  };

  const handleCreateQuickNote = useCallback(async () => {
    if (!user) return;
    const defaultTitle = getDefaultNoteTitle();
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: defaultTitle,
          content: '',
          client_id: null,
          project_id: null,
          folder_id: null,
          tags: [],
        })
        .select('id, title, content, client_id, project_id, folder_id, tags, created_at, updated_at')
        .single();
      if (error) throw error;
      const newNote = { ...data, tags: (data as any).tags || [], folder_id: (data as any).folder_id ?? null, icon_emoji: null, cover_color: null, note_comment: null } as Note;
      setNotes((prev) => [newNote, ...prev]);
      setSelectedId(newNote.id);
      setTitle(newNote.title);
      setContent(newNote.content || '');
      setTags(newNote.tags || []);
      setIconEmoji('');
      setCoverColor('');
      setFolderIdInNote(null);
    } catch (err: any) {
      toast({ title: 'Error creating note', description: err.message, variant: 'destructive' });
    }
  }, [user, toast]);

  const handleUploadNoteImage = useCallback(
    async (file: File): Promise<string | null> => {
      if (!user) return null;
      try {
        const ext = file.name.split('.').pop() || 'png';
        const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error } = await supabase.storage.from('note-images').upload(path, file, { upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from('note-images').getPublicUrl(path);
        return data.publicUrl;
      } catch (err: any) {
        const msg = err.message ?? 'Could not upload image';
        const isBucketMissing = /bucket|not found|does not exist/i.test(String(msg));
        toast({
          title: 'Upload failed',
          description: isBucketMissing
            ? 'Note images storage is not set up. Create the "note-images" bucket in Supabase (Storage) or run the migration: supabase db push.'
            : msg,
          variant: 'destructive',
        });
        return null;
      }
    },
    [user, toast]
  );

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
        <aside className="w-80 border-r bg-muted/30 flex flex-col shrink-0">
          <div className="p-3 border-b space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Notes</h2>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { resetFolderForm(); setFolderDialogOpen(true); }} title="Create folder">
                  <FolderPlus className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={handleCreateQuickNote}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={folderFilter} onValueChange={setFolderFilter}>
                <SelectTrigger className="h-8 text-xs w-[140px]">
                  <SelectValue placeholder="Folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All folders</SelectItem>
                  <SelectItem value="none">No folder</SelectItem>
                  {folders.map((f) => (
                    <SelectItem key={f.id} value={f.id}><span className="mr-1">{f.emoji || '📁'}</span>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {folderFilter !== 'all' && folderFilter !== 'none' && (() => {
                const folder = folders.find((f) => f.id === folderFilter);
                return folder ? (
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Edit folder" onClick={() => handleEditFolder(folder)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                ) : null;
              })()}
              {allTagsFromNotes.length > 0 && (
                <Select
                  value={tagFilter.length === 0 ? 'all' : tagFilter[0]}
                  onValueChange={(v) => setTagFilter(v === 'all' ? [] : [v])}
                >
                  <SelectTrigger className="h-8 text-xs w-[120px]">
                    <SelectValue placeholder="Tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All tags</SelectItem>
                    {allTagsFromNotes.map((tag) => (
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {(folderFilter !== 'all' || tagFilter.length > 0) && (
                <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setFolderFilter('all'); setTagFilter([]); }}>
                  Clear filters
                </Button>
              )}
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1.5">
              {loading ? (
                <p className="text-sm text-muted-foreground p-2">Loading…</p>
              ) : filteredNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground p-2">{notes.length === 0 ? 'No notes yet' : 'No notes in this folder'}</p>
              ) : (
                filteredNotes.map((note) => {
                  const folder = note.folder_id ? folders.find((f) => f.id === note.folder_id) : null;
                  const excerpt = excerptFromHtml(note.content, NOTE_EXCERPT_LEN);
                  return (
                    <div
                      key={note.id}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        'group rounded-lg border px-3 py-2.5 text-left cursor-pointer transition-colors',
                        selectedId === note.id
                          ? 'border-primary bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                          : 'border-border bg-background hover:bg-muted hover:border-muted-foreground/30'
                      )}
                      onClick={() => setSelectedId(note.id)}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedId(note.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{note.title || 'Untitled'}</p>
                          {excerpt ? (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 min-h-[2rem]">{excerpt}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground/50 mt-0.5 line-clamp-2 min-h-[2rem] italic">No preview</p>
                          )}
                          <div className="flex flex-wrap items-center gap-1 mt-1.5">
                            {folder && (
                              <span className="inline-flex items-center text-[10px] px-1.5 py-0 rounded bg-muted text-muted-foreground">
                                {folder.emoji || '📁'} {folder.name}
                              </span>
                            )}
                            {note.tags?.slice(0, 2).map((tag) => (
                              <span key={tag} className="text-[10px] px-1.5 py-0 rounded bg-muted text-muted-foreground">
                                {tag}
                              </span>
                            ))}
                            {note.tags?.length > 2 ? (
                              <span className="text-[10px] text-muted-foreground">+{note.tags.length - 2}</span>
                            ) : null}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeleteConfirmId(note.id);
                          }}
                          aria-label="Delete note"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Editor */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-3xl mx-auto px-6 py-8">
            {selectedNote ? (
              <>
                {/* Saving indicator + Folder + Download as doc */}
                <div className="h-9 mb-1 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {saving && (
                      <p className="text-xs text-muted-foreground">Saving…</p>
                    )}
                    <Select value={folderIdInNote || 'none'} onValueChange={(v) => setFolderIdInNote(v === 'none' ? null : v)}>
                      <SelectTrigger className="w-[180px] h-8 text-xs">
                        <SelectValue placeholder="Folder" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No folder</SelectItem>
                        {folders.map((f) => (
                          <SelectItem key={f.id} value={f.id}><span className="mr-1">{f.emoji || '📁'}</span>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  suggestedTags={allTagsFromNotes}
                  iconEmoji={iconEmoji}
                  onIconEmojiChange={setIconEmoji}
                  coverColor={coverColor}
                  onCoverColorChange={setCoverColor}
                  onRequestCreateTask={handleRequestCreateTask}
                  onUploadImage={handleUploadNoteImage}
                  updatedAt={selectedNote.created_at}
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
                <Button onClick={handleCreateQuickNote}>
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

      <Dialog open={folderDialogOpen} onOpenChange={(open) => { if (!open) resetFolderForm(); setFolderDialogOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFolder ? 'Edit Folder' : 'Create Folder'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Folder name</Label>
              <Input value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="e.g. Client notes" />
            </div>
            <div className="flex gap-4">
              <div className="space-y-2">
                <Label>Emoji</Label>
                <EmojiPicker value={folderEmoji} onChange={setFolderEmoji} />
              </div>
              <div className="space-y-2 flex-1">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {FOLDER_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        'h-8 w-8 rounded-full border-2 transition-transform',
                        folderColor === color ? 'scale-110 border-foreground' : 'border-transparent hover:scale-105'
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
            {editingFolder && (
              <Button variant="outline" className="mr-auto text-destructive hover:text-destructive" onClick={() => { handleDeleteFolder(editingFolder); setFolderDialogOpen(false); resetFolderForm(); }}>
                Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveFolder} disabled={!folderName.trim()}>
                {editingFolder ? 'Update' : 'Create'}
              </Button>
            </div>
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
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (deleteConfirmId) {
                  handleDelete(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
