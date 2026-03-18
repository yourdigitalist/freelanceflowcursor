import { useRef, useMemo, useCallback, useEffect, useState } from 'react';
import ReactQuill from 'react-quill';
import type ReactQuillType from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './notes-editor.css';

let dividerBlotRegistered = false;
try {
  const QuillConstructor = (ReactQuill as { Quill?: { import: (path: string) => unknown; register: (blot: unknown) => void } }).Quill;
  if (QuillConstructor) {
    const BlockEmbed = QuillConstructor.import('blots/block/embed') as new (node: HTMLElement, value: unknown) => { length: () => number };
    class DividerBlot extends BlockEmbed {
      static blotName = 'divider';
      static tagName = 'HR';
    }
    QuillConstructor.register(DividerBlot);
    dividerBlotRegistered = true;
  }
} catch {
  // Divider blot registration failed; editor still works, divider button won't
}
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Tag,
  CheckSquare,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Square,
  Link,
  Image,
  Quote,
  RemoveFormatting,
  SeparatorHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { SlotIcon } from '@/contexts/IconSlotContext';
import { EntityLinkPopover, EntityLinkPickerContent } from './EntityLinkPopover';
import type { EntityOption } from './EntityLinkPopover';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const QUILL_MODULES = {
  toolbar: false,
  keyboard: {
    bindings: {
      // Backspace at start of blockquote: remove blockquote and stay on same line (return to normal text)
      blockquoteBackspace: {
        key: 'Backspace',
        collapsed: true,
        format: ['blockquote'],
        offset: 0,
        handler(
          this: { quill: { format: (name: string, value: boolean, source?: string) => void } },
          _range: { index: number; length: number },
          _context: Record<string, unknown>,
        ) {
          this.quill.format('blockquote', false, 'user');
        },
      },
      // Enter on empty blockquote line: remove blockquote, insert newline, so the new line is normal text
      blockquoteEnter: {
        key: 'Enter',
        empty: true,
        format: ['blockquote'],
        handler(
          this: {
            quill: {
              format: (name: string, value: boolean, source?: string) => void;
              insertText: (index: number, text: string, source?: string) => void;
              setSelection: (index: number, length?: number, source?: string) => void;
            };
          },
          range: { index: number; length: number },
          _context: Record<string, unknown>,
        ) {
          const q = this.quill;
          q.format('blockquote', false, 'user');
          q.insertText(range.index, '\n', 'user');
          q.setSelection(range.index + 1, 0, 'user');
          q.format('blockquote', false, 'user'); // ensure new line is normal
        },
      },
    },
  },
};

function ToolbarButton({ Icon, onClick, title }: { Icon: LucideIcon; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}

const QUILL_FORMATS = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet',
  'link', 'image',
  'blockquote', 'code-block',
  ...(dividerBlotRegistered ? ['divider' as const] : []),
];

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

const EMOJI_OPTIONS = ['📝', '📌', '💡', '📋', '✅', '📅', '🔖', '⭐', '💼', '📧', '📞', '🎯', '🚀', '💬', '📎'];
const COVER_COLORS = ['#f0f0f0', '#e8f5e9', '#e3f2fd', '#fff3e0', '#fce4ec', '#f3e5f5', '#e0f7fa', '#efebe9'];

interface DocumentEditorProps {
  title: string;
  onTitleChange: (title: string) => void;
  content: string;
  onContentChange: (content: string) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  suggestedTags?: string[];
  iconEmoji?: string;
  onIconEmojiChange?: (emoji: string) => void;
  coverColor?: string;
  onCoverColorChange?: (color: string) => void;
  onRequestCreateTask?: (selectedText: string) => void;
  onUploadImage?: (file: File) => Promise<string | null>;
  updatedAt?: string | null;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  clientName?: string | null;
  projectName?: string | null;
}

export function DocumentEditor({
  title,
  onTitleChange,
  content,
  onContentChange,
  tags,
  onTagsChange,
  suggestedTags = [],
  iconEmoji = '',
  onIconEmojiChange,
  coverColor = '',
  onCoverColorChange,
  onRequestCreateTask,
  onUploadImage,
  updatedAt,
  placeholder = 'Write your note… Type @ to link a client, project, or task.',
  className,
  minHeight = '400px',
  clientName,
  projectName,
}: DocumentEditorProps) {
  const quillRef = useRef<ReactQuillType>(null);
  const atMentionIndexRef = useRef<number | null>(null);
  const [showAtPopover, setShowAtPopover] = useState(false);
  const [atPopoverPosition, setAtPopoverPosition] = useState({ top: 0, left: 0 });
  const [tagsPopoverOpen, setTagsPopoverOpen] = useState(false);
  const [iconPopoverOpen, setIconPopoverOpen] = useState(false);
  const [coverPopoverOpen, setCoverPopoverOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ index: number; length: number } | null>(null);
  const [createTaskButtonPos, setCreateTaskButtonPos] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<{ index: number; length: number } | null>(null);

  const modules = useMemo(() => QUILL_MODULES, []);

  const saveSelection = useCallback(() => {
    const q = quillRef.current?.getEditor();
    if (!q) return;
    const sel = q.getSelection(true);
    if (sel) savedSelectionRef.current = { index: sel.index, length: sel.length };
  }, []);

  const getSelectionOrSaved = useCallback(() => {
    const q = quillRef.current?.getEditor();
    if (!q) return null;
    const sel = q.getSelection(true);
    if (sel) return sel;
    return savedSelectionRef.current;
  }, []);

  const applyFormat = useCallback((name: string, value?: string | number | boolean) => {
    const q = quillRef.current?.getEditor();
    if (!q) return;
    if (value === undefined) value = true;
    q.format(name, value);
  }, []);

  const applyFormatToggle = useCallback((name: string, listValue?: string) => {
    const q = quillRef.current?.getEditor();
    if (!q) return;
    const sel = getSelectionOrSaved();
    if (sel) q.setSelection(sel.index, sel.length, 'user');
    const format = q.getFormat(sel?.index ?? 0);
    if (listValue !== undefined) {
      const current = format[name];
      q.format(name, current === listValue ? false : listValue, 'user');
    } else {
      const current = !!format[name];
      q.format(name, !current, 'user');
    }
  }, [getSelectionOrSaved]);

  const openLinkDialog = useCallback(() => {
    const q = quillRef.current?.getEditor();
    if (!q) return;
    const sel = getSelectionOrSaved();
    if (sel) {
      const format = q.getFormat(sel.index);
      const current = typeof format.link === 'string' ? format.link : '';
      setLinkUrl(current || 'https://');
      setLinkDialogOpen(true);
    }
  }, [getSelectionOrSaved]);

  const handleLinkApply = useCallback(() => {
    const q = quillRef.current?.getEditor();
    if (!q) return;
    const sel = getSelectionOrSaved();
    const index = sel?.index ?? 0;
    const length = sel?.length ?? 0;
    q.setSelection(index, length, 'user');
    q.format('link', linkUrl.trim() || false, 'user');
    setLinkDialogOpen(false);
    setLinkUrl('');
  }, [linkUrl, getSelectionOrSaved]);

  const openImageDialog = useCallback(() => {
    saveSelection();
    setImageUrl('');
    setImageDialogOpen(true);
  }, [saveSelection]);

  const handleImageFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !file.type.startsWith('image/')) return;
      const q = quillRef.current?.getEditor();
      if (!q) return;
      const sel = getSelectionOrSaved();
      const index = sel?.index ?? q.getLength() - 1;
      setImageUploading(true);
      try {
        let url: string | null = null;
        if (onUploadImage) {
          url = await onUploadImage(file);
        }
        if (!url) {
          url = await new Promise<string>((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result as string);
            r.onerror = rej;
            r.readAsDataURL(file);
          });
        }
        if (url) {
          q.insertEmbed(index, 'image', url, 'user');
          q.setSelection(index + 1, 0, 'user');
          setImageDialogOpen(false);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setImageUploading(false);
      }
    },
    [getSelectionOrSaved, onUploadImage]
  );

  const handleInsertImageFromDialog = useCallback(() => {
    const q = quillRef.current?.getEditor();
    if (!q || !imageUrl.trim()) return;
    const sel = getSelectionOrSaved();
    const index = sel?.index ?? q.getLength() - 1;
    q.insertEmbed(index, 'image', imageUrl.trim(), 'user');
    q.setSelection(index + 1, 0, 'user');
    setImageDialogOpen(false);
    setImageUrl('');
  }, [imageUrl, getSelectionOrSaved]);

  const handleRemoveFormat = useCallback(() => {
    const q = quillRef.current?.getEditor();
    if (!q) return;
    const sel = getSelectionOrSaved();
    const index = sel?.index ?? 0;
    const length = sel?.length ?? 1;
    if (typeof q.removeFormat === 'function') {
      q.removeFormat(index, length, 'user');
    } else {
      (q as { format: (name: string, value: boolean, source?: string) => void }).format('clean', false, 'user');
    }
  }, [getSelectionOrSaved]);

  const handleHeaderChange = useCallback((value: string) => {
    const q = quillRef.current?.getEditor();
    if (!q) return;
    const sel = savedSelectionRef.current;
    if (sel) q.setSelection(sel.index, sel.length, 'user');
    q.format('header', value ? Number(value) : false, 'user');
  }, []);

  const handleInsertDivider = useCallback(() => {
    if (!dividerBlotRegistered) return;
    const q = quillRef.current?.getEditor();
    if (!q) return;
    const sel = q.getSelection(true);
    const index = sel?.index ?? 0;
    const len = sel?.length ?? 0;
    if (len > 0) q.deleteText(index, len);
    q.insertEmbed(index, 'divider', true);
    q.setSelection(index + 2, 0);
  }, []);

  const insertEntityLink = useCallback((entity: EntityOption) => {
    const q = quillRef.current?.getEditor();
    const idx = atMentionIndexRef.current;
    if (!q || idx == null) {
      setShowAtPopover(false);
      return;
    }
    q.deleteText(idx, 1, 'user'); // remove the @
    const html = `<a href="${escapeHtml(entity.href)}" data-entity="${escapeHtml(entity.type)}" data-entity-id="${escapeHtml(entity.id)}">${escapeHtml(entity.label)}</a>`;
    q.clipboard.dangerouslyPasteHTML(idx, html, 'user');
    q.setSelection(idx + entity.label.length + 2, 0);
    atMentionIndexRef.current = null;
    setShowAtPopover(false);
  }, []);

  useEffect(() => {
    const q = quillRef.current?.getEditor();
    if (!q) return;
    const handler = (delta: { ops?: { insert?: string }[] }, _old: unknown, source: string) => {
      if (source !== 'user' || !delta.ops?.length) return;
      for (const op of delta.ops) {
        if (typeof op.insert !== 'string') continue;
        if (!op.insert.includes('@')) continue;
        const sel = q.getSelection(true);
        if (!sel) return;
        const atPos = op.insert.indexOf('@');
        const index = sel.index - op.insert.length + atPos;
        const atIndex = index;
        if (atIndex >= 0) {
          const bounds = q.getBounds(atIndex);
          if (bounds && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setAtPopoverPosition({
              top: rect.top + bounds.bottom + 4,
              left: rect.left + bounds.left,
            });
            atMentionIndexRef.current = atIndex;
            setShowAtPopover(true);
          }
        }
        break;
      }
    };
    q.on('text-change', handler);
    return () => {
      q.off('text-change', handler);
    };
  }, []);

  // Selection change: show "Create task" when text is selected
  useEffect(() => {
    const q = quillRef.current?.getEditor();
    if (!q || !onRequestCreateTask) return;
    const getSelectedText = (index: number, length: number) => {
      const delta = q.getContents(index, length);
      let t = '';
      (delta?.ops || []).forEach((op: { insert?: string }) => {
        if (typeof op.insert === 'string') t += op.insert;
      });
      return t.trim();
    };
    const handler = () => {
      const sel = q.getSelection(true);
      if (sel && sel.length > 0) {
        const text = getSelectedText(sel.index, sel.length);
        if (text) {
          const editorEl = q.root;
          const editorRect = editorEl.getBoundingClientRect();
          const bounds = q.getBounds(sel.index + sel.length);
          setCreateTaskButtonPos({
            top: editorRect.top + bounds.top,
            left: editorRect.left + bounds.right + 10,
          });
          setSelectionRange(sel);
        } else {
          setCreateTaskButtonPos(null);
          setSelectionRange(null);
        }
      } else {
        setCreateTaskButtonPos(null);
        setSelectionRange(null);
      }
    };
    q.on('selection-change', handler);
    return () => {
      q.off('selection-change', handler);
    };
  }, [onRequestCreateTask]);

  const handleCreateTaskFromSelection = useCallback(() => {
    if (!selectionRange || !onRequestCreateTask) return;
    const q = quillRef.current?.getEditor();
    if (!q) return;
    const delta = q.getContents(selectionRange.index, selectionRange.length);
    let text = '';
    (delta?.ops || []).forEach((op: { insert?: string }) => {
      if (typeof op.insert === 'string') text += op.insert;
    });
    text = text.trim();
    if (text) onRequestCreateTask(text);
    setCreateTaskButtonPos(null);
    setSelectionRange(null);
    q.setSelection(selectionRange.index + selectionRange.length, 0);
  }, [selectionRange, onRequestCreateTask]);

  const timestampLabel = useMemo(() => {
    if (!updatedAt) return null;
    const d = new Date(updatedAt);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    if (isToday) {
      return `@Today ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }
    return `@${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }, [updatedAt]);

  const addTag = useCallback(() => {
    const t = newTagInput.trim();
    if (t && !tags.includes(t)) {
      onTagsChange([...tags, t]);
      setNewTagInput('');
    }
  }, [newTagInput, tags, onTagsChange]);

  const removeTag = useCallback((tag: string) => {
    onTagsChange(tags.filter((x) => x !== tag));
  }, [tags, onTagsChange]);

  return (
    <div ref={containerRef} className={cn('flex flex-col bg-white rounded-lg border shadow-sm overflow-hidden', className)}>
      {/* Cover color bar - fixed height so no layout shift when toggled */}
      {coverColor && (
        <div className="h-2 w-full shrink-0" style={{ backgroundColor: coverColor }} aria-hidden />
      )}

      {/* Header: Add icon, Add cover, and date/time on the right */}
      <div className="flex items-center justify-between gap-4 px-4 pt-4 pb-3 text-sm text-muted-foreground border-b shrink-0">
        <div className="flex items-center gap-4">
          <Popover open={iconPopoverOpen} onOpenChange={setIconPopoverOpen} modal={false}>
            <PopoverTrigger asChild>
              <button type="button" className="flex items-center gap-1.5 hover:text-foreground">
                {iconEmoji ? <span className="text-lg">{iconEmoji}</span> : <SlotIcon slot="notes_add_icon" className="h-4 w-4" />}
                <span>Add icon</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
              <div className="grid grid-cols-5 gap-1">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="h-8 w-8 rounded hover:bg-muted flex items-center justify-center text-lg"
                    onClick={() => {
                      onIconEmojiChange?.(emoji);
                      setIconPopoverOpen(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              {iconEmoji && (
                <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => { onIconEmojiChange?.(''); setIconPopoverOpen(false); }}>
                  Remove icon
                </Button>
              )}
            </PopoverContent>
          </Popover>
          <Popover open={coverPopoverOpen} onOpenChange={setCoverPopoverOpen} modal={false}>
            <PopoverTrigger asChild>
              <button type="button" className="flex items-center gap-1.5 hover:text-foreground">
                <SlotIcon slot="notes_add_cover" className="h-4 w-4" />
                Add cover
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-2" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
              <div className="grid grid-cols-4 gap-2">
                {COVER_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="h-8 w-8 rounded border-2 border-muted hover:border-primary shrink-0"
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      onCoverColorChange?.(color);
                      setCoverPopoverOpen(false);
                    }}
                  />
                ))}
              </div>
              {coverColor && (
                <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => { onCoverColorChange?.(''); setCoverPopoverOpen(false); }}>
                  Remove cover
                </Button>
              )}
            </PopoverContent>
          </Popover>
        </div>
        {timestampLabel && <span className="text-muted-foreground text-xs shrink-0">{timestampLabel}</span>}
      </div>

      {/* Client/project (if set) */}
      {(clientName || projectName) && (
        <div className="px-4 pt-2 pb-1 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
          {clientName && <span>Client: {clientName}</span>}
          {clientName && projectName && <span aria-hidden>·</span>}
          {projectName && <span>Project: {projectName}</span>}
        </div>
      )}

      {/* Title: large text, white background, no box */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white">
        {iconEmoji && <span className="text-2xl shrink-0">{iconEmoji}</span>}
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Untitled"
          className="flex-1 min-w-0 text-3xl font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground py-0"
        />
      </div>

      {/* Tags row + hint */}
      <div className="px-4 py-2 flex items-center gap-2 flex-wrap border-b">
        <span className="text-xs text-muted-foreground">Type <kbd className="px-1 py-0.5 rounded bg-muted font-mono">@</kbd> in the editor to link a client, project, or task</span>
        <div className="flex-1" />
        <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setTagsDialogOpen(true)}>
          <Tag className="h-4 w-4 mr-1.5" />
          Tags
        </Button>
      </div>

      {/* Tags dialog - stays open while adding so input works */}
      <Dialog open={tagsDialogOpen} onOpenChange={setTagsDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tags</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex gap-2 flex-wrap">
              {tags.map((t) => (
                <Badge key={t} variant="secondary" className="pr-1">
                  {t}
                  <button type="button" className="ml-1 rounded hover:bg-muted-foreground/20" onClick={() => removeTag(t)} aria-label={`Remove ${t}`}>×</button>
                </Badge>
              ))}
            </div>
            {suggestedTags.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Reuse</p>
                <div className="flex gap-1 flex-wrap">
                  {suggestedTags.filter((t) => !tags.includes(t)).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onTagsChange([...tags, t])}
                      className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80"
                    >
                      + {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Add new tag"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="h-8"
              />
              <Button size="sm" onClick={addTag}>Add</Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setTagsDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editor - white background. Clicks on links open in new tab (Quill doesn't do this by default). */}
      <div className="px-4 pb-6">
        <div
          className="rich-text-editor-wrapper [&_.ql-toolbar]:rounded-t-lg [&_.ql-container]:rounded-b-lg [&_.ql-editor]:min-h-[300px] [&_.ql-editor]:text-base [&_.ql-container]:bg-white [&_.ql-editor]:bg-white [&_.ql-snow]:border-muted"
          onClick={(e) => {
            const a = (e.target as HTMLElement).closest?.('a[href]');
            if (a) {
              const href = (a as HTMLAnchorElement).href;
              if (href && !href.startsWith('javascript:')) {
                e.preventDefault();
                window.open(href, '_blank', 'noopener,noreferrer');
              }
            }
          }}
        >
          {/* Custom toolbar: mousedown keeps editor focus so selection is preserved for Link/Image/Code/Clear */}
          <div
            className="ql-toolbar ql-snow flex flex-wrap items-center gap-0.5 p-2 border-b border-muted rounded-t-lg bg-muted/30"
            onMouseDown={(e) => {
              saveSelection();
              if ((e.target as HTMLElement).closest?.('select')) return;
              e.preventDefault();
            }}
          >
            <select
              className="ql-header h-8 min-w-[6rem] rounded border border-transparent bg-transparent text-sm px-2 text-muted-foreground hover:text-foreground"
              defaultValue=""
              onChange={(e) => handleHeaderChange(e.target.value)}
            >
              <option value="">Normal</option>
              <option value="1">Heading 1</option>
              <option value="2">Heading 2</option>
              <option value="3">Heading 3</option>
            </select>
            <ToolbarButton Icon={Bold} onClick={() => applyFormatToggle('bold')} title="Bold (toggle)" />
            <ToolbarButton Icon={Italic} onClick={() => applyFormatToggle('italic')} title="Italic (toggle)" />
            <ToolbarButton Icon={Underline} onClick={() => applyFormatToggle('underline')} title="Underline (toggle)" />
            <ToolbarButton Icon={Strikethrough} onClick={() => applyFormatToggle('strike')} title="Strikethrough (toggle)" />
            <span className="w-px h-5 bg-border mx-0.5" />
            <ToolbarButton Icon={List} onClick={() => applyFormatToggle('list', 'bullet')} title="Bullet list (toggle)" />
            <ToolbarButton Icon={ListOrdered} onClick={() => applyFormatToggle('list', 'ordered')} title="Numbered list (toggle)" />
            <ToolbarButton Icon={Square} onClick={() => applyFormatToggle('list', 'unchecked')} title="Checklist (toggle)" />
            <span className="w-px h-5 bg-border mx-0.5" />
            <ToolbarButton Icon={Link} onClick={openLinkDialog} title="Link (select text first)" />
            <ToolbarButton Icon={Image} onClick={openImageDialog} title="Insert image" />
            <ToolbarButton Icon={Quote} onClick={() => applyFormatToggle('blockquote')} title="Blockquote (toggle)" />
            {dividerBlotRegistered && (
              <ToolbarButton Icon={SeparatorHorizontal} onClick={handleInsertDivider} title="Line separator" />
            )}
            <ToolbarButton Icon={RemoveFormatting} onClick={handleRemoveFormat} title="Clear formatting" />
          </div>
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={content}
            onChange={onContentChange}
            modules={modules}
            formats={QUILL_FORMATS}
            placeholder={placeholder}
            style={{ minHeight }}
          />
        </div>
      </div>

      {/* @ mention popover - positioned when @ is typed */}
      {showAtPopover && (
        <div
          className="fixed z-50 w-[320px] rounded-md border bg-popover shadow-lg p-0"
          style={{
            top: atPopoverPosition.top,
            left: atPopoverPosition.left,
          }}
        >
          <EntityLinkPickerContent
            onSelect={insertEntityLink}
            onClose={() => {
              setShowAtPopover(false);
              atMentionIndexRef.current = null;
            }}
          />
        </div>
      )}

      {/* Create task from selection - floating button next to selected text */}
      {createTaskButtonPos && onRequestCreateTask && (
        <div
          className="fixed z-50"
          style={{
            top: createTaskButtonPos.top,
            left: createTaskButtonPos.left,
          }}
        >
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shadow-md gap-1.5"
            onClick={handleCreateTaskFromSelection}
          >
            <CheckSquare className="h-4 w-4" />
            Create task from selection
          </Button>
        </div>
      )}

      {/* Link dialog - apply URL to selected text */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleLinkApply())}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleLinkApply}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Insert image dialog - upload or URL */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Upload image</Label>
              <input
                type="file"
                accept="image/*"
                className="block w-full text-sm text-muted-foreground file:mr-2 file:rounded file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
                onChange={handleImageFile}
                disabled={!!imageUploading}
              />
              {imageUploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
            </div>
            <div className="relative">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-full border-t" />
              <span className="relative block text-center">
                <span className="bg-background px-2 text-xs text-muted-foreground">or paste URL</span>
              </span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="image-url">Image URL</Label>
              <Input
                id="image-url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleInsertImageFromDialog())}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleInsertImageFromDialog} disabled={!imageUrl.trim()}>Insert from URL</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
