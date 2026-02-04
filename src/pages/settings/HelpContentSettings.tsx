import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Pencil, Plus, BookOpen } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type HelpContentRow = Database['public']['Tables']['help_content']['Row'];

const CATEGORIES = [
  { value: 'faq', label: 'FAQs' },
  { value: 'contact', label: 'Contact' },
  { value: 'onboarding', label: 'Onboarding' },
] as const;

export default function HelpContentSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [list, setList] = useState<HelpContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<HelpContentRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ slug: '', title: '', body: '', category: 'faq' as string });

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .maybeSingle();
    setIsAdmin(data?.is_admin ?? false);
  };

  const fetchContent = async () => {
    const { data, error } = await supabase
      .from('help_content')
      .select('*')
      .order('category')
      .order('sort_order', { ascending: true })
      .order('title');

    if (error) {
      console.error('Error fetching help content:', error);
      setList([]);
      toast({ title: 'Error loading help content', variant: 'destructive' });
    } else {
      setList((data as HelpContentRow[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchContent();
    }
  }, [user]);

  const openCreate = () => {
    setEditing(null);
    setForm({ slug: '', title: '', body: '', category: 'faq' });
    setEditOpen(true);
  };

  const openEdit = (row: HelpContentRow) => {
    setEditing(row);
    setForm({
      slug: row.slug,
      title: row.title,
      body: row.body ?? '',
      category: row.category,
    });
    setEditOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    const slug = (form.slug || form.title.toLowerCase().replace(/\s+/g, '-')).replace(/[^a-z0-9-]/gi, '');
    if (!slug) {
      toast({ title: 'Slug is required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from('help_content')
          .update({
            slug,
            title: form.title.trim(),
            body: form.body.trim() || null,
            category: form.category,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editing.id);

        if (error) throw error;
        toast({ title: 'Content updated' });
      } else {
        const { error } = await supabase.from('help_content').insert({
          slug,
          title: form.title.trim(),
          body: form.body.trim() || null,
          category: form.category,
          sort_order: list.filter((r) => r.category === form.category).length,
        });

        if (error) throw error;
        toast({ title: 'Content added' });
      }
      setEditOpen(false);
      fetchContent();
    } catch (e: unknown) {
      toast({
        title: editing ? 'Failed to update' : 'Failed to add',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const byCategory = list.reduce(
    (acc, row) => {
      if (!acc[row.category]) acc[row.category] = [];
      acc[row.category].push(row);
      return acc;
    },
    {} as Record<string, HelpContentRow[]>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Help content
        </CardTitle>
        <CardDescription>
          Edit FAQs, contact info, and onboarding documentation shown on the Help Center page.
          {!isAdmin && (
            <span className="block mt-1 text-amber-600 dark:text-amber-500">
              Only admins can add or edit content. You can view the list below.
            </span>
          )}
        </CardDescription>
      </div>

      {isAdmin && (
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add section
        </Button>
      )}

      <div className="space-y-6">
        {CATEGORIES.map(({ value, label }) => {
          const rows = byCategory[value] ?? [];
          return (
            <Card key={value}>
              <CardHeader>
                <CardTitle className="text-base">{label}</CardTitle>
                <CardDescription>
                  {rows.length === 0
                    ? 'No content yet.'
                    : `${rows.length} section${rows.length === 1 ? '' : 's'}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Add content to show on the Help Center.</p>
                ) : (
                  <ul className="space-y-2">
                    {rows.map((row) => (
                      <li
                        key={row.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium">{row.title}</p>
                          <p className="text-xs text-muted-foreground">{row.slug}</p>
                        </div>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit section' : 'Add section'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="help-title">Title</Label>
              <Input
                id="help-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. How do I create an invoice?"
              />
            </div>
            <div>
              <Label htmlFor="help-slug">Slug (URL-friendly)</Label>
              <Input
                id="help-slug"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="e.g. create-invoice"
              />
            </div>
            <div>
              <Label htmlFor="help-category">Category</Label>
              <select
                id="help-category"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="help-body">Content (Markdown)</Label>
              <textarea
                id="help-body"
                className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Write content in Markdown..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
