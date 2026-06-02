import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageBreadcrumb } from '@/components/layout/PageBreadcrumb';
import { listPageBreadcrumb } from '@/lib/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DocumentEditor } from '@/components/notes/DocumentEditor';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Download, Pencil } from '@/components/icons';
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
import { useLocalePreferences } from '@/hooks/useLocalePreferences';
import { formatLocaleDateTime } from '@/lib/datetime';
import { getDefaultStatusId } from '@/lib/taskStatus';
import type { ProjectStatus } from '@/components/tasks/types';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { FolderPlus } from '@/components/icons';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

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

interface NoteTag {
  id: string;
  name: string;
}

const FOLDER_COLORS = [
  '#9B63E9', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#06B6D4'
];

const DEBOUNCE_MS = 800;

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

function isQuillContentEmpty(html: string): boolean {
  const t = html.trim();
  if (!t) return true;
  return t === '<p><br></p>' || t === '<p></p>' || t === '<p><br/></p>';
}

function noteDraftDirty(
  note: Note,
  draft: { title: string; content: string; tags: string[]; folder_id: string | null },
): boolean {
  return (
    draft.title !== note.title ||
    draft.content !== (note.content || '') ||
    JSON.stringify(draft.tags) !== JSON.stringify(note.tags || []) ||
    draft.folder_id !== (note.folder_id ?? null)
  );
}

export default function Notes() {
  const [searchParams] = useSearchParams();
  const { dateFormat, timeFormat } = useLocalePreferences();
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
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('clients').select('id, name').eq('user_id', user.id).is('archived_at', null).order('name').then(({ data }) => setClients((data as { id: string; name: string }[]) || []));
    supabase.from('projects').select('id, name').eq('user_id', user.id).order('updated_at', { ascending: false }).then(({ data }) => setProjects((data as { id: string; name: string }[]) || []));
    supabase.from('note_folders').select('id, name, emoji, color').eq('user_id', user.id).order('name').then(({ data }) => setFolders((data as NoteFolder[]) || []));
    supabase
      .from('note_tags')
      .select('id, name')
      .eq('user_id', user.id)
      .order('name')
      .then(({ data, error }) => {
        if (!error) {
          setAvailableTags(((data as NoteTag[]) || []).map((row) => row.name));
        }
      });
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

  useEffect(() => {
    if (availableTags.length > 0) return;
    if (allTagsFromNotes.length === 0) return;
    setAvailableTags(allTagsFromNotes);
  }, [availableTags.length, allTagsFromNotes]);

  const filteredNotes = notes.filter((n) => {
    const hasNoFolder = n.folder_id == null || n.folder_id === '';
    const matchesFolder = folderFilter === 'all' || (folderFilter === 'none' ? hasNoFolder : n.folder_id === folderFilter);
    const noteTags = n.tags || [];
    const matchesTag = tagFilter.length === 0 || tagFilter.some((t) => noteTags.includes(t));
    return matchesFolder && matchesTag;
  });
  const selectedNote = notes.find((n) => n.id === selectedId);
  const prevSelectedIdRef = useRef<string | null>(null);
  const notesRef = useRef(notes);
  notesRef.current = notes;

  const patchNoteInList = useCallback(
    (noteId: string, patch: Partial<Pick<Note, 'folder_id'>>) => {
      setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, ...patch } : n)));
    },
    [],
  );

  const handleTitleChange = useCallback((value: string) => {
    setTitle(value);
  }, []);

  const handleContentChange = useCallback((value: string) => {
    setContent(value);
  }, []);

  /** Sidebar reflects in-progress edits for the open note without mutating the saved list copy */
  const noteCardTitle = useCallback(
    (note: Note) => (note.id === selectedId ? title.trim() || 'Untitled' : note.title?.trim() || 'Untitled'),
    [selectedId, title],
  );

  const noteCardExcerpt = useCallback(
    (note: Note) => {
      const html = note.id === selectedId ? content : note.content;
      return excerptFromHtml(isQuillContentEmpty(html || '') ? null : html, NOTE_EXCERPT_LEN);
    },
    [selectedId, content],
  );

  const persistNote = useCallback(async (noteId: string, payload: { title: string; content: string; tags: string[]; folder_id?: string | null }) => {
    setSaving(true);
    try {
      const updatePayload: Record<string, unknown> = {
        title: payload.title,
        content: payload.content,
        tags: payload.tags,
        updated_at: new Date().toISOString(),
      };
      if (payload.folder_id !== undefined) updatePayload.folder_id = payload.folder_id;
      const { error } = await supabase
        .from('notes')
        .update(updatePayload)
        .eq('id', noteId)
        .eq('user_id', user!.id);
      if (error) throw error;
      const now = new Date().toISOString();
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId
            ? {
                ...n,
                title: payload.title,
                content: payload.content,
                tags: payload.tags,
                folder_id: payload.folder_id !== undefined ? payload.folder_id : n.folder_id,
                updated_at: now,
              }
            : n
        )
      );
    } catch (err: any) {
      toast({ title: 'Error saving note', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [user, toast]);

  // Save previous note then load the newly selected one (draft state still belongs to previous note on this render)
  useEffect(() => {
    const prevId = prevSelectedIdRef.current;
    if (prevId && prevId !== selectedId && user) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      const note = notesRef.current.find((n) => n.id === prevId);
      const draft = { title, content, tags, folder_id: folderIdInNote };
      if (note && noteDraftDirty(note, draft)) {
        persistNote(prevId, { title, content, tags, folder_id: folderIdInNote });
      }
    }

    if (prevId !== selectedId) {
      prevSelectedIdRef.current = selectedId;
      const note = selectedId ? notesRef.current.find((n) => n.id === selectedId) : null;
      if (note) {
        setTitle(note.title);
        setContent(note.content || '');
        setTags(note.tags || []);
        setFolderIdInNote(note.folder_id ?? null);
      } else {
        setTitle('');
        setContent('');
        setTags([]);
        setFolderIdInNote(null);
      }
    }
  }, [selectedId, user, persistNote]); // eslint-disable-line react-hooks/exhaustive-deps -- title/content are intentionally from the render when selectedId changed

  useEffect(() => {
    if (!selectedId || !user) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const note = notesRef.current.find((n) => n.id === selectedId);
      const draft = { title, content, tags, folder_id: folderIdInNote };
      if (note && noteDraftDirty(note, draft)) {
        persistNote(selectedId, { title, content, tags, folder_id: folderIdInNote });
      }
      saveTimeoutRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [title, content, tags, folderIdInNote, selectedId, user, persistNote]);

  const handleRequestCreateTask = useCallback((selectedText: string) => {
    setCreateTaskTitle(selectedText);
    setCreateTaskProjectId('');
    setCreateTaskOpen(true);
  }, []);

  const handleCreateTaskFromNote = async () => {
    if (!createTaskProjectId || !createTaskTitle.trim() || !user) return;
    setCreateTaskSubmitting(true);
    try {
      const { data: statusRows } = await supabase
        .from('project_statuses')
        .select('id, name, color, is_done_status, position, project_id, user_id')
        .eq('project_id', createTaskProjectId)
        .order('position');
      const statusId = getDefaultStatusId((statusRows ?? []) as ProjectStatus[]);
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
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: '',
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
    } catch (err: any) {
      toast({ title: 'Error creating note', description: err.message, variant: 'destructive' });
    }
  }, [user, toast]);

  const normalizeTagName = useCallback((value: string) => value.trim().replace(/\s+/g, ' '), []);

  const handleCreateTag = useCallback(
    async (rawTag: string) => {
      if (!user) return;
      const name = normalizeTagName(rawTag);
      if (!name) return;
      const exists = availableTags.some((tag) => tag.toLowerCase() === name.toLowerCase());
      if (exists) return;
      try {
        const { error } = await supabase.from('note_tags').insert({ user_id: user.id, name });
        if (error) throw error;
        setAvailableTags((prev) => [...prev, name].sort((a, b) => a.localeCompare(b)));
      } catch (err: any) {
        toast({ title: 'Error creating tag', description: err.message, variant: 'destructive' });
      }
    },
    [user, normalizeTagName, availableTags, toast],
  );

  const handleDeleteTag = useCallback(
    async (tagToDelete: string) => {
      if (!user) return;
      try {
        const { error } = await supabase
          .from('note_tags')
          .delete()
          .eq('user_id', user.id)
          .eq('name', tagToDelete);
        if (error) throw error;

        const now = new Date().toISOString();
        const affectedNotes = notesRef.current.filter((note) => (note.tags || []).includes(tagToDelete));
        if (affectedNotes.length > 0) {
          await Promise.all(
            affectedNotes.map((note) =>
              supabase
                .from('notes')
                .update({
                  tags: (note.tags || []).filter((tag) => tag !== tagToDelete),
                  updated_at: now,
                })
                .eq('id', note.id)
                .eq('user_id', user.id),
            ),
          );
        }

        setNotes((prev) =>
          prev.map((note) =>
            (note.tags || []).includes(tagToDelete)
              ? { ...note, tags: (note.tags || []).filter((tag) => tag !== tagToDelete), updated_at: now }
              : note,
          ),
        );
        setTags((prev) => prev.filter((tag) => tag !== tagToDelete));
        setTagFilter((prev) => prev.filter((tag) => tag !== tagToDelete));
        setAvailableTags((prev) => prev.filter((tag) => tag !== tagToDelete));
      } catch (err: any) {
        toast({ title: 'Error deleting tag', description: err.message, variant: 'destructive' });
      }
    },
    [user, toast, setNotes],
  );

  const handleTagsChange = useCallback(
    (nextTags: string[]) => {
      const normalized = Array.from(
        new Set(nextTags.map((tag) => normalizeTagName(tag)).filter((tag) => tag.length > 0)),
      );
      setTags(normalized);
      const newCatalogTags = normalized.filter(
        (tag) => !availableTags.some((existing) => existing.toLowerCase() === tag.toLowerCase()),
      );
      if (newCatalogTags.length > 0) {
        setAvailableTags((prev) => [...prev, ...newCatalogTags].sort((a, b) => a.localeCompare(b)));
        if (user) {
          void Promise.all(
            newCatalogTags.map((name) =>
              supabase.from('note_tags').upsert({ user_id: user.id, name }, { onConflict: 'user_id,name' }),
            ),
          );
        }
      }
    },
    [normalizeTagName, availableTags, user],
  );

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
      ? formatLocaleDateTime(selectedNote.updated_at, dateFormat, timeFormat)
      : formatLocaleDateTime(new Date(), dateFormat, timeFormat);
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
  }, [selectedNote, title, content, dateFormat, timeFormat]);

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
      <div className="flex flex-col min-h-[calc(100svh-4.5rem)] lg:min-h-[calc(100svh-4rem)] space-y-4">
        <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <PageBreadcrumb items={listPageBreadcrumb('Notes')} />
            <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
          </div>
          <Button size="sm" onClick={handleCreateQuickNote}>
            <Plus className="mr-2 h-4 w-4" />
            New note
          </Button>
        </div>

        <div className="flex flex-1 min-h-0 -mx-4 -mb-4 lg:-mx-8 lg:-mb-8">
        {/* Sidebar — full-bleed panel bg to main content edges */}
        <aside className="w-80 border-r bg-muted/50 flex flex-col shrink-0 self-stretch">
          <div className="px-3 py-3 border-b">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="icon-sm"
                variant="outline"
                className="shrink-0"
                onClick={() => {
                  resetFolderForm();
                  setFolderDialogOpen(true);
                }}
                title="Create folder"
              >
                <FolderPlus className="h-4 w-4" />
              </Button>
              <Select value={folderFilter} onValueChange={setFolderFilter}>
                <SelectTrigger className="h-9 w-[156px] text-sm">
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
                  <Button type="button" variant="ghost" size="icon-sm" className="shrink-0" title="Edit folder" onClick={() => handleEditFolder(folder)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                ) : null;
              })()}
              {allTagsFromNotes.length > 0 && (
                <Select
                  value={tagFilter.length === 0 ? 'all' : tagFilter[0]}
                  onValueChange={(v) => setTagFilter(v === 'all' ? [] : [v])}
                >
                  <SelectTrigger className="h-9 w-[132px] text-sm">
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
                <Button type="button" variant="ghost" size="sm" onClick={() => { setFolderFilter('all'); setTagFilter([]); }}>
                  Clear filters
                </Button>
              )}
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="px-3 py-2 space-y-1.5">
              {loading ? (
                <p className="text-sm text-muted-foreground p-2">Loading…</p>
              ) : filteredNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground p-2">{notes.length === 0 ? 'No notes yet' : 'No notes in this folder'}</p>
              ) : (
                filteredNotes.map((note) => {
                  const excerpt = noteCardExcerpt(note);
                  const relativeUpdated = note.updated_at
                    ? formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })
                    : null;
                  return (
                    <div
                      key={note.id}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        'group cursor-pointer rounded-lg border px-3 py-2.5 text-left transition-colors',
                        selectedId === note.id
                          ? 'border-primary/30 bg-white shadow-sm ring-1 ring-primary/10'
                          : 'border-border/80 bg-white hover:border-muted-foreground/25 hover:bg-muted/40'
                      )}
                      onClick={() => setSelectedId(note.id)}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedId(note.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{noteCardTitle(note)}</p>
                          {excerpt ? (
                            <p className="mt-0.5 line-clamp-2 min-h-[2rem] text-xs text-muted-foreground">{excerpt}</p>
                          ) : (
                            <p className="mt-0.5 line-clamp-2 min-h-[2rem] text-xs italic text-muted-foreground/50">No preview</p>
                          )}
                          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                            {relativeUpdated ? (
                              <span className="tabular-nums">{relativeUpdated}</span>
                            ) : null}
                            {note.tags?.length ? (
                              <span>{note.tags.length} tag{note.tags.length === 1 ? '' : 's'}</span>
                            ) : null}
                          </div>
                          {note.tags?.length ? (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {note.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                                >
                                  {tag}
                                </span>
                              ))}
                              {note.tags.length > 3 ? (
                                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  +{note.tags.length - 3}
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className={cn(
                            'shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive',
                            selectedId === note.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                          )}
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
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
          <div className="flex flex-1 flex-col min-h-0 max-w-3xl w-full mx-auto px-4 pb-5 lg:px-8 lg:pb-8">
            {selectedNote ? (
              <div className="flex flex-1 flex-col min-h-0">
                <div className="mb-2 flex h-10 shrink-0 items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {saving && (
                      <p className="text-sm text-muted-foreground">Saving…</p>
                    )}
                    <Select
                      value={folderIdInNote || 'none'}
                      onValueChange={(v) => {
                        const next = v === 'none' ? null : v;
                        setFolderIdInNote(next);
                        if (selectedId) patchNoteInList(selectedId, { folder_id: next });
                      }}
                    >
                      <SelectTrigger className="h-9 w-[190px] text-sm">
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
                  key={selectedId}
                  noteId={selectedId}
                  title={title}
                  onTitleChange={handleTitleChange}
                  content={content}
                  onContentChange={handleContentChange}
                  tags={tags}
                  onTagsChange={handleTagsChange}
                  availableTags={availableTags}
                  onCreateTag={handleCreateTag}
                  onDeleteAvailableTag={handleDeleteTag}
                  onRequestCreateTask={handleRequestCreateTask}
                  onUploadImage={handleUploadNoteImage}
                  formattedDate={
                    selectedNote.updated_at
                      ? formatLocaleDateTime(selectedNote.updated_at, dateFormat, timeFormat)
                      : null
                  }
                  clientName={selectedNote.client_id ? (clients.find((c) => c.id === selectedNote.client_id)?.name ?? null) : null}
                  projectName={selectedNote.project_id ? (projects.find((p) => p.id === selectedNote.project_id)?.name ?? null) : null}
                  placeholder="Write your note… Type @ to link a client, project, or task."
                  className="flex-1 min-h-0"
                  minHeight="100%"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
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
