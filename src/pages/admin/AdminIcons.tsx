import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useIconSlots } from '@/contexts/IconSlotContext';
import { ICON_SLOT_GROUPS } from '@/lib/iconSlots';
import { Loader2, Search } from '@/components/icons';
import type { IconSlotKey } from '@/lib/iconSlots';
import type { SlotAssignmentValue } from '@/contexts/IconSlotContext';
import { listAllIconPaths, getAppIconPublicUrl, displayNameForIconPath } from '@/lib/appIcons';

export default function AdminIcons() {
  const { toast } = useToast();
  const { assignments, refetch } = useIconSlots();
  const [pickerSlot, setPickerSlot] = useState<IconSlotKey | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: bucketPaths = [], isLoading: loadingPaths } = useQuery({
    queryKey: ['app_icons_bucket_list'] as const,
    queryFn: listAllIconPaths,
    staleTime: 5 * 60 * 1000,
  });

  const filteredPaths = useMemo(() => {
    if (!search.trim()) return bucketPaths;
    const q = search.toLowerCase().trim();
    return bucketPaths.filter((path) => {
      const name = displayName(path);
      return name.toLowerCase().includes(q) || path.toLowerCase().includes(q);
    });
  }, [bucketPaths, search]);

  const publicUrl = getAppIconPublicUrl;
  const displayName = displayNameForIconPath;

  const handleAssign = async (slotKey: string, storagePath: string | null) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('app_icon_slots').upsert(
        {
          slot_key: slotKey,
          icon_upload_id: null,
          icon_storage_path: storagePath,
        },
        { onConflict: 'slot_key' }
      );
      if (error) throw error;
      toast({ title: 'Assignment saved' });
      refetch();
      setPickerSlot(null);
    } catch (err: unknown) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getAssignmentLabel = (slotKey: string): string => {
    const a = assignments[slotKey] as SlotAssignmentValue | undefined;
    if (a?.storagePath) return displayName(a.storagePath);
    if (a?.uploadId) return ' (from library)';
    return 'Default';
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Icons</h1>
        <p className="text-muted-foreground">
          Assign icons from the Supabase Storage bucket to each slot. Icons are managed in the bucket; changes here only
          link slots to those files.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assign icon to slot</CardTitle>
          <CardDescription>
            Each slot controls an icon somewhere in the app (sidebar, dashboard, admin nav, etc.). Click &quot;Choose
            icon&quot; to pick an SVG from the bucket. Use the search in the picker to find by name. Default uses the
            built-in icon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {ICON_SLOT_GROUPS.map(({ group, slots }) => (
              <div key={group}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">{group}</h3>
                <div className="space-y-3">
                  {slots.map(({ key, label }) => (
                    <div key={key} className="flex flex-wrap items-center gap-4">
                      <Label className="w-52 shrink-0 text-sm font-normal text-muted-foreground">{label}</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground min-w-[8rem]">
                          {getAssignmentLabel(key)}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPickerSlot(key)}
                        >
                          Choose icon
                        </Button>
                        {assignments[key]?.storagePath || assignments[key]?.uploadId ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAssign(key, null)}
                            disabled={saving}
                          >
                            Clear
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={pickerSlot !== null} onOpenChange={(open) => !open && setPickerSlot(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {pickerSlot
                ? `Pick icon for: ${ICON_SLOT_GROUPS.flatMap((g) => g.slots).find((s) => s.key === pickerSlot)?.label ?? pickerSlot}`
                : 'Pick icon'}
            </DialogTitle>
            <DialogDescription>
              Search by name, then click an icon to assign it to this slot. Icons are loaded from the Storage bucket.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search icons by name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex-1 overflow-auto rounded-md border bg-muted/30 p-4">
              {loadingPaths ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredPaths.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {bucketPaths.length === 0
                    ? 'No SVG files in the bucket. Upload icons in Supabase Storage (bucket: app-icons).'
                    : 'No icons match your search.'}
                </p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {filteredPaths.map((path) => (
                    <button
                      key={path}
                      type="button"
                      onClick={() => pickerSlot && handleAssign(pickerSlot, path)}
                      disabled={saving}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border bg-card hover:bg-muted/70 hover:border-muted-foreground/30 transition-colors disabled:opacity-50"
                      title={displayName(path)}
                    >
                      <div className="h-14 w-14 flex items-center justify-center overflow-hidden rounded-md bg-muted/80 shrink-0">
                        <img
                          src={publicUrl(path)}
                          alt=""
                          className="h-10 w-10 object-contain pointer-events-none"
                          style={{ filter: 'brightness(0) opacity(0.85)' }}
                        />
                      </div>
                      <span className="text-xs truncate w-full text-center text-foreground/90 font-medium">
                        {displayName(path).slice(0, 14)}
                        {displayName(path).length > 14 ? '…' : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
