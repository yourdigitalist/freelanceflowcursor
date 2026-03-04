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
import { Textarea } from '@/components/ui/textarea';
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
  Code,
  RemoveFormatting,
  SeparatorHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { SlotIcon } from '@/contexts/IconSlotContext';
import { EntityLinkPopover, EntityLinkPickerContent } from './EntityLinkPopover';
import type { EntityOption } from './EntityLinkPopover';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const QUILL_MODULES = {
  toolbar: false,
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
  iconEmoji?: string;
  onIconEmojiChange?: (emoji: string) => void;
  coverColor?: string;
  onCoverColorChange?: (color: string) => void;
  noteComment?: string;
  onNoteCommentChange?: (comment: string) => void;
  onRequestCreateTask?: (selectedText: string) => void;
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
  iconEmoji = '',
  onIconEmojiChange,
  coverColor = '',
  onCoverColorChange,
  noteComment = '',
  onNoteCommentChange,
  onRequestCreateTask,
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
  const [commentPopoverOpen, setCommentPopoverOpen] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ index: number; length: number } | null>(null);
  const [createTaskButtonPos, setCreateTaskButtonPos] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const modules = useMemo(() => QUILL_MODULES, []);

  const applyFormat = useCallback((name: string, value?: string | number | boolean) => {
    const q = quillRef.current?.getEditor();
    if (!q) return;
    if (value === undefined) value = true;
    q.format(name, value);
  }, []);

  const handleInsertImage = useCallback(() => {
    const url = prompt('Image URL');
    if (!url) return;
    const q = quillRef.current?.getEditor();
    if (!q) return;
    const sel = q.getSelection(true);
    q.insertEmbed(sel?.index ?? 0, 'image', url);
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

      {/* Notion-like header with working Add icon / cover / comment */}
      <div className="flex items-center gap-4 px-4 pt-4 pb-1 text-sm text-muted-foreground border-b shrink-0">
        <Popover open={iconPopoverOpen} onOpenChange={setIconPopoverOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="flex items-center gap-1.5 hover:text-foreground">
              {iconEmoji ? <span className="text-lg">{iconEmoji}</span> : <SlotIcon slot="notes_add_icon" className="h-4 w-4" />}
              <span>Add icon</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
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
        <Popover open={coverPopoverOpen} onOpenChange={setCoverPopoverOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="flex items-center gap-1.5 hover:text-foreground">
              <SlotIcon slot="notes_add_cover" className="h-4 w-4" />
              Add cover
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-2" align="start">
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
        <Popover open={commentPopoverOpen} onOpenChange={setCommentPopoverOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="flex items-center gap-1.5 hover:text-foreground">
              <SlotIcon slot="notes_add_comment" className="h-4 w-4" />
              Add comment
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <p className="text-sm font-medium mb-2">Note to self / comment</p>
            <Textarea
              placeholder="Add a comment or reminder…"
              value={noteComment}
              onChange={(e) => onNoteCommentChange?.(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <Button size="sm" className="mt-2" onClick={() => setCommentPopoverOpen(false)}>Done</Button>
          </PopoverContent>
        </Popover>
      </div>

      {/* Timestamp + client/project */}
      <div className="px-4 pt-3 pb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        {timestampLabel && <span className="font-medium">{timestampLabel}</span>}
        {(clientName || projectName) && (
          <span className="flex items-center gap-x-2">
            {clientName && <span>Client: {clientName}</span>}
            {clientName && projectName && <span aria-hidden>·</span>}
            {projectName && <span>Project: {projectName}</span>}
          </span>
        )}
      </div>

      {/* Title row: optional icon + title */}
      <div className="flex items-center gap-2 px-4 py-2">
        {iconEmoji && <span className="text-2xl shrink-0">{iconEmoji}</span>}
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Untitled"
          className="text-2xl font-semibold border-0 shadow-none focus-visible:ring-0 px-0 placeholder:text-muted-foreground rounded-none flex-1"
        />
      </div>

      {/* Comment when set */}
      {noteComment && (
        <div className="px-4 pb-2">
          <div className="rounded-lg bg-muted/50 border px-3 py-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Comment: </span>
            {noteComment}
          </div>
        </div>
      )}

      {/* Tags row + hint */}
      <div className="px-4 py-2 flex items-center gap-2 flex-wrap border-b">
        <span className="text-xs text-muted-foreground">Type <kbd className="px-1 py-0.5 rounded bg-muted font-mono">@</kbd> in the editor to link a client, project, or task</span>
        <div className="flex-1" />
        <Popover open={tagsPopoverOpen} onOpenChange={setTagsPopoverOpen} modal={false}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground">
              <Tag className="h-4 w-4 mr-1.5" />
              Tags
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="end" onOpenAutoFocus={(e) => e.preventDefault()}>
            <div className="space-y-2">
              <p className="text-sm font-medium">Tags</p>
              <div className="flex gap-2 flex-wrap">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="pr-1">
                    {t}
                    <button type="button" className="ml-1 rounded hover:bg-muted-foreground/20" onClick={() => removeTag(t)} aria-label={`Remove ${t}`}>×</button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="h-8"
                />
                <Button size="sm" onClick={addTag}>Add</Button>
              </div>
              <Button size="sm" variant="secondary" className="mt-2 w-full" onClick={() => setTagsPopoverOpen(false)}>Done</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Editor - white background */}
      <div className="px-4 pb-6">
        <div className="rich-text-editor-wrapper [&_.ql-toolbar]:rounded-t-lg [&_.ql-container]:rounded-b-lg [&_.ql-editor]:min-h-[300px] [&_.ql-editor]:text-base [&_.ql-container]:bg-white [&_.ql-editor]:bg-white [&_.ql-snow]:border-muted">
          {/* Custom toolbar with Lucide icons */}
          <div className="ql-toolbar ql-snow flex flex-wrap items-center gap-0.5 p-2 border-b border-muted rounded-t-lg bg-muted/30">
            <select
              className="ql-header h-8 min-w-[6rem] rounded border border-transparent bg-transparent text-sm px-2 text-muted-foreground hover:text-foreground"
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value;
                applyFormat('header', v ? Number(v) : false);
              }}
            >
              <option value="">Normal</option>
              <option value="1">Heading 1</option>
              <option value="2">Heading 2</option>
              <option value="3">Heading 3</option>
            </select>
            <ToolbarButton Icon={Bold} onClick={() => applyFormat('bold')} title="Bold" />
            <ToolbarButton Icon={Italic} onClick={() => applyFormat('italic')} title="Italic" />
            <ToolbarButton Icon={Underline} onClick={() => applyFormat('underline')} title="Underline" />
            <ToolbarButton Icon={Strikethrough} onClick={() => applyFormat('strike')} title="Strikethrough" />
            <span className="w-px h-5 bg-border mx-0.5" />
            <ToolbarButton Icon={List} onClick={() => applyFormat('list', 'bullet')} title="Bullet list" />
            <ToolbarButton Icon={ListOrdered} onClick={() => applyFormat('list', 'ordered')} title="Numbered list" />
            <ToolbarButton Icon={Square} onClick={() => applyFormat('list', 'unchecked')} title="Checklist" />
            <span className="w-px h-5 bg-border mx-0.5" />
            <ToolbarButton Icon={Link} onClick={() => { const url = prompt('URL'); if (url) applyFormat('link', url); }} title="Link" />
            <ToolbarButton Icon={Image} onClick={handleInsertImage} title="Image" />
            <ToolbarButton Icon={Quote} onClick={() => applyFormat('blockquote')} title="Blockquote" />
            <ToolbarButton Icon={Code} onClick={() => applyFormat('code-block')} title="Code block" />
            {dividerBlotRegistered && (
              <ToolbarButton Icon={SeparatorHorizontal} onClick={handleInsertDivider} title="Line separator" />
            )}
            <ToolbarButton Icon={RemoveFormatting} onClick={() => applyFormat('clean')} title="Clear formatting" />
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
    </div>
  );
}
