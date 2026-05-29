import { useRef, useMemo, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import type ReactQuillType from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './notes-editor.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  CheckSquare,
  X,
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
import { EntityLinkPickerContent } from './EntityLinkPopover';
import type { EntityOption } from './EntityLinkPopover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type EntityMentionValue = {
  type: 'client' | 'project' | 'task';
  id: string;
  href: string;
  label: string;
};

let dividerBlotRegistered = false;
let entityMentionBlotRegistered = false;

try {
  const QuillConstructor = (ReactQuill as {
    Quill?: {
      import: (path: string) => unknown;
      register: (blot: unknown, suppressWarning?: boolean) => void;
    };
  }).Quill;
  if (QuillConstructor) {
    const BlockEmbed = QuillConstructor.import('blots/block/embed') as new (
      node: HTMLElement,
      value: unknown,
    ) => { length: () => number };
    class DividerBlot extends BlockEmbed {
      static blotName = 'divider';
      static tagName = 'HR';
    }
    QuillConstructor.register(DividerBlot);
    dividerBlotRegistered = true;

    const Embed = QuillConstructor.import('blots/embed') as {
      create: (value?: unknown) => HTMLElement;
      blotName: string;
      tagName: string;
      new (node: HTMLElement, value?: unknown): unknown;
    };
    class EntityMentionBlot extends Embed {
      static blotName = 'entityMention';
      static tagName = 'span';

      static create(value: EntityMentionValue) {
        const node = super.create() as HTMLElement;
        node.setAttribute('data-entity', value.type);
        node.setAttribute('data-entity-id', value.id);
        node.setAttribute('data-href', value.href);
        node.setAttribute('contenteditable', 'false');
        node.classList.add('entity-pill', `entity-pill--${value.type}`);
        node.textContent = value.label;
        return node;
      }

      static value(node: HTMLElement): EntityMentionValue {
        return {
          type: (node.getAttribute('data-entity') || 'client') as EntityMentionValue['type'],
          id: node.getAttribute('data-entity-id') || '',
          href: node.getAttribute('data-href') || '',
          label: node.textContent || '',
        };
      }
    }
    QuillConstructor.register(EntityMentionBlot, true);
    entityMentionBlotRegistered = true;
  }
} catch {
  // Custom blot registration failed; editor still works without divider/entity pills
}

const tagColorClass = (tag: string) => {
  const palette = [
    'bg-blue-50 text-blue-700 border-blue-200',
    'bg-emerald-50 text-emerald-700 border-emerald-200',
    'bg-violet-50 text-violet-700 border-violet-200',
    'bg-amber-50 text-amber-700 border-amber-200',
    'bg-rose-50 text-rose-700 border-rose-200',
    'bg-cyan-50 text-cyan-700 border-cyan-200',
  ];
  const hash = Array.from(tag).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
};

const formatTag = (tag: string) =>
  tag
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

const buildQuillModules = () => {
  const QuillConstructor = (ReactQuill as { Quill?: { import: (path: string) => unknown } }).Quill;
  const DeltaCtor = QuillConstructor?.import('delta') as
    | (new () => { insert: (value: unknown) => { insert: (value: unknown) => unknown } })
    | undefined;

  const clipboardMatchers: [string, (node: Element, delta: unknown) => unknown] = entityMentionBlotRegistered
    ? [
        [
          'span[data-entity]',
          (node: Element, delta) => {
            const el = node as HTMLElement;
            const type = el.getAttribute('data-entity') as EntityMentionValue['type'] | null;
            if (!type || !DeltaCtor) return delta;
            const mentionDelta = new DeltaCtor().insert({
              entityMention: {
                type,
                id: el.getAttribute('data-entity-id') || '',
                href: el.getAttribute('data-href') || '',
                label: el.textContent || '',
              },
            });
            return mentionDelta;
          },
        ],
      ]
    : [];

  return {
  toolbar: false,
  clipboard: clipboardMatchers.length ? { matchers: clipboardMatchers } : undefined,
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
};

function ToolbarButton({ Icon, onClick, title }: { Icon: LucideIcon; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
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
  ...(entityMentionBlotRegistered ? ['entityMention' as const] : []),
];

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

interface DocumentEditorProps {
  noteId?: string | null;
  title: string;
  onTitleChange: (title: string) => void;
  content: string;
  onContentChange: (content: string) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  suggestedTags?: string[];
  onRequestCreateTask?: (selectedText: string) => void;
  onUploadImage?: (file: File) => Promise<string | null>;
  formattedDate?: string | null;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  clientName?: string | null;
  projectName?: string | null;
}

export function DocumentEditor({
  noteId = null,
  title,
  onTitleChange,
  content,
  onContentChange,
  tags,
  onTagsChange,
  suggestedTags = [],
  onRequestCreateTask,
  onUploadImage,
  formattedDate = null,
  placeholder = 'Write your note… Type @ to link a client, project, or task.',
  className,
  minHeight = '400px',
  clientName,
  projectName,
}: DocumentEditorProps) {
  const navigate = useNavigate();
  const quillRef = useRef<ReactQuillType>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const atMentionIndexRef = useRef<number | null>(null);
  const [showAtPopover, setShowAtPopover] = useState(false);
  const [atPopoverPosition, setAtPopoverPosition] = useState({ top: 0, left: 0 });
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ index: number; length: number } | null>(null);
  const [createTaskButtonPos, setCreateTaskButtonPos] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<{ index: number; length: number } | null>(null);
  const linkUrlInputRef = useRef<HTMLInputElement>(null);
  const linkDialogOpenRef = useRef(false);
  const handleLinkApplyRef = useRef<() => void>(() => {});

  useEffect(() => {
    setIsAddingTag(false);
    setNewTag('');
  }, [noteId]);

  const modules = useMemo(() => buildQuillModules(), []);

  const handleEditorClick = useCallback(
    (e: React.MouseEvent) => {
      const pill = (e.target as HTMLElement).closest?.('[data-entity][data-href]');
      if (pill) {
        e.preventDefault();
        const href = pill.getAttribute('data-href');
        if (href) {
          const legacyClient = href.match(/^\/clients\?open=([^&]+)/);
          navigate(legacyClient ? `/clients/${legacyClient[1]}` : href);
        }
        return;
      }
      const a = (e.target as HTMLElement).closest?.('a[href]');
      if (a) {
        const href = (a as HTMLAnchorElement).getAttribute('href');
        if (href && !href.startsWith('javascript:')) {
          e.preventDefault();
          window.open(href, '_blank', 'noopener,noreferrer');
        }
      }
    },
    [navigate],
  );

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
    saveSelection(); // Must save before dialog opens so we still have the selection when applying
    const sel = getSelectionOrSaved();
    if (sel) {
      const format = q.getFormat(sel.index);
      const current = typeof format.link === 'string' ? format.link : '';
      setLinkUrl(current || 'https://');
      setLinkDialogOpen(true);
    }
  }, [getSelectionOrSaved, saveSelection]);

  const handleLinkApply = useCallback(() => {
    const q = quillRef.current?.getEditor();
    if (!q) return;
    const raw = linkUrl.trim();
    if (!raw) {
      setLinkDialogOpen(false);
      setLinkUrl('');
      return;
    }
    // Quill's Link format only allows http, https, mailto, tel; else it sanitizes to about:blank. Normalize so any input works.
    const hasProtocol = /^(https?|mailto|tel):/i.test(raw);
    const urlForQuill = hasProtocol ? raw : `https://${raw}`;
    const sel = getSelectionOrSaved();
    const index = sel?.index ?? 0;
    const length = sel?.length ?? 0;
    q.setSelection(index, length, 'user');
    q.format('link', urlForQuill, 'user');
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
    if (entityMentionBlotRegistered) {
      q.insertEmbed(
        idx,
        'entityMention',
        { type: entity.type, id: entity.id, href: entity.href, label: entity.label },
        'user',
      );
      q.insertText(idx + 1, ' ', 'user');
      q.setSelection(idx + 2, 0, 'user');
    } else {
      const pillClass = `entity-pill entity-pill--${escapeHtml(entity.type)}`;
      const html = `<span class="${pillClass}" data-entity="${escapeHtml(entity.type)}" data-entity-id="${escapeHtml(entity.id)}" data-href="${escapeHtml(entity.href)}" contenteditable="false">${escapeHtml(entity.label)}</span>&nbsp;`;
      q.clipboard.dangerouslyPasteHTML(idx, html, 'user');
      q.setSelection(idx + entity.label.length + 2, 0, 'user');
    }
    atMentionIndexRef.current = null;
    setShowAtPopover(false);
  }, []);

  // Keep refs in sync for the link-dialog Enter handler (so listener added on mount always sees latest)
  useEffect(() => {
    linkDialogOpenRef.current = linkDialogOpen;
    handleLinkApplyRef.current = handleLinkApply;
  }, [linkDialogOpen, handleLinkApply]);

  // Single document capture listener (added on mount so it runs before Radix's dialog listener)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      if (!linkDialogOpenRef.current) return;
      const target = e.target as HTMLElement | null;
      if (!target || (target.id !== 'link-url' && target.getAttribute('data-link-input') !== 'true')) return;
      e.preventDefault();
      e.stopPropagation();
      handleLinkApplyRef.current();
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, []); // run once on mount

  useEffect(() => {
    const q = quillRef.current?.getEditor();
    if (!q) return;

    const openAtPopoverIfNeeded = () => {
      const sel = q.getSelection();
      if (sel == null || sel.index < 1) return;
      const atIndex = sel.index - 1;
      if (q.getText(atIndex, 1) !== '@') return;
      const bounds = q.getBounds(atIndex);
      if (!bounds || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setAtPopoverPosition({
        top: rect.top + bounds.bottom + 4,
        left: rect.left + bounds.left,
      });
      atMentionIndexRef.current = atIndex;
      setShowAtPopover(true);
    };

    const handler = (_delta: unknown, _old: unknown, source: string) => {
      if (source !== 'user') return;
      requestAnimationFrame(() => {
        q.scrollIntoView();
        openAtPopoverIfNeeded();
      });
    };

    q.on('text-change', handler);
    return () => {
      q.off('text-change', handler);
    };
  }, [noteId]);

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

  const saveTag = useCallback(() => {
    const t = newTag.trim();
    if (t && !tags.includes(t)) {
      onTagsChange([...tags, t]);
    }
    setNewTag('');
    setIsAddingTag(false);
  }, [newTag, tags, onTagsChange]);

  const removeTag = useCallback(
    (tag: string) => {
      onTagsChange(tags.filter((x) => x !== tag));
    },
    [tags, onTagsChange],
  );

  return (
    <div
      ref={containerRef}
      className={cn('flex flex-col flex-1 min-h-0 bg-card rounded-lg border shadow-sm overflow-hidden', className)}
    >
      {/* Title + date; tags row below (matches client detail panel) */}
      <div className="px-5 py-4 border-b shrink-0 space-y-3">
        <div className="flex items-start gap-4">
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="Untitled"
            className="flex-1 min-w-0 bg-transparent py-0 text-2xl font-semibold leading-tight placeholder:text-muted-foreground focus:outline-none"
          />
          {formattedDate && (
            <span className="shrink-0 whitespace-nowrap pt-1.5 text-sm tabular-nums text-muted-foreground">
              {formattedDate}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {tags.map((t) => (
            <Badge key={t} variant="outline" className={cn('group relative pr-6', tagColorClass(t))}>
              {formatTag(t)}
              <button
                type="button"
                className="absolute right-0.5 top-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/10"
                onClick={() => removeTag(t)}
                aria-label={`Remove ${t}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {!isAddingTag ? (
            <button
              type="button"
              className="rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setIsAddingTag(true)}
            >
              + Add tag
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
              <Input
                className="h-6 w-28 border-0 px-1 text-xs shadow-none focus-visible:ring-0"
                placeholder="Tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onBlur={() => saveTag()}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    saveTag();
                  }
                  if (e.key === 'Escape') {
                    setNewTag('');
                    setIsAddingTag(false);
                  }
                }}
              />
            </span>
          )}
          {suggestedTags
            .filter((t) => !tags.includes(t))
            .slice(0, 3)
            .map((t) => (
              <button
                key={t}
                type="button"
                className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onTagsChange([...tags, t])}
              >
                {formatTag(t)}
              </button>
            ))}
        </div>

        {(clientName || projectName) && (
          <div className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
            {clientName && <span>Client: {clientName}</span>}
            {clientName && projectName && <span aria-hidden>·</span>}
            {projectName && <span>Project: {projectName}</span>}
          </div>
        )}
      </div>

      {/* Rich text editor — fills remaining card height */}
      <div className="flex flex-col flex-1 min-h-0 px-5 pt-5 pb-0">
        <div
          className="rich-text-editor-wrapper flex flex-col flex-1 min-h-0 [&_.ql-toolbar]:rounded-t-lg [&_.ql-container]:rounded-b-lg [&_.ql-editor]:text-base [&_.ql-container]:bg-card [&_.ql-editor]:bg-card [&_.ql-snow]:border-muted"
          onClick={handleEditorClick}
        >
          {/* Custom toolbar: mousedown keeps editor focus so selection is preserved for Link/Image/Code/Clear */}
          <div
            className="ql-toolbar ql-snow flex flex-wrap items-center gap-0.5 rounded-t-lg border-b border-muted bg-muted/30 p-2"
            onMouseDown={(e) => {
              saveSelection();
              if ((e.target as HTMLElement).closest?.('select')) return;
              e.preventDefault();
            }}
          >
            <select
              className="ql-header h-8 min-w-[6rem] rounded-md border border-transparent bg-transparent px-2 text-sm text-muted-foreground hover:text-foreground"
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
            onChangeSelection={(range, source) => {
              if (source === 'user' && range) {
                const editor = quillRef.current?.getEditor();
                if (editor) requestAnimationFrame(() => editor.scrollIntoView());
              }
            }}
            modules={modules}
            formats={QUILL_FORMATS}
            placeholder={placeholder}
            className="notes-quill-editor flex flex-col flex-1 min-h-0"
            style={{ minHeight: minHeight === '100%' ? undefined : minHeight, height: minHeight === '100%' ? '100%' : undefined }}
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

      {/* Link dialog - apply URL to selected text. Enter in input applies link (capture phase so we run before Radix closes dialog). */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); handleLinkApply(); }}
            className="space-y-4 py-2"
          >
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                ref={linkUrlInputRef}
                id="link-url"
                data-link-input="true"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https:// (optional – any text is saved as link)"
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  e.stopPropagation();
                  handleLinkApply();
                }}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Apply</Button>
            </DialogFooter>
          </form>
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
