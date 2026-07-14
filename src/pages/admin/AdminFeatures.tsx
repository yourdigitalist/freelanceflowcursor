import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from '@/components/icons';
import { useAppFeatures, useAppFeaturesMutation } from '@/hooks/useAppFeatures';
import {
  FEATURE_ACCESS_OPTIONS,
  FEATURE_DEFINITIONS,
  type FeatureAccessMode,
} from '@/lib/features';

type FeatureColumn = typeof FEATURE_DEFINITIONS[number]['column'];

export default function AdminFeatures() {
  const { toast } = useToast();
  const { data: features, isLoading } = useAppFeatures();
  const { invalidate } = useAppFeaturesMutation();
  const [draft, setDraft] = useState<Record<FeatureColumn, FeatureAccessMode>>({
    notes_access_mode: 'admin',
    contracts_access_mode: 'admin',
    proposals2_access_mode: 'off',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!features) return;
    setDraft({
      notes_access_mode: features.notes,
      contracts_access_mode: features.contracts,
      proposals2_access_mode: features.proposals2,
    });
  }, [features]);

  const saveFeatures = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('app_features')
      .update({
        notes_access_mode: draft.notes_access_mode,
        contracts_access_mode: draft.contracts_access_mode,
        proposals2_access_mode: draft.proposals2_access_mode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);
    setSaving(false);
    if (error) {
      toast({
        title: 'Could not save feature settings',
        description: error.message.includes('app_features')
          ? 'Run the app_features migration in Supabase first.'
          : error.message,
        variant: 'destructive',
      });
      return;
    }
    await invalidate();
    toast({ title: 'Feature settings saved' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading feature settings…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Features</h1>
        <p className="text-sm text-muted-foreground">
          Control which product areas are visible. Use <strong>Off</strong> to park a feature without deleting code.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feature access</CardTitle>
          <CardDescription>
            Changes apply immediately after saving. Env vars still act as fallback if this table is missing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {FEATURE_DEFINITIONS.map((feature) => {
            const value = draft[feature.column];
            const selectedHint = FEATURE_ACCESS_OPTIONS.find((option) => option.value === value)?.hint;
            return (
              <div key={feature.key} className="grid gap-3 border-b pb-6 last:border-b-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_220px] md:items-start">
                <div className="space-y-1">
                  <Label className="text-base">{feature.label}</Label>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                  {selectedHint ? <p className="text-xs text-muted-foreground">{selectedHint}</p> : null}
                </div>
                <Select
                  value={value}
                  onValueChange={(next) =>
                    setDraft((current) => ({
                      ...current,
                      [feature.column]: next as FeatureAccessMode,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FEATURE_ACCESS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}

          <div className="flex justify-end pt-2">
            <Button onClick={saveFeatures} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {features ? (
        <p className="text-xs text-muted-foreground">
          Current effective modes: Notes {features.notes}, Contracts {features.contracts}, Proposals 2 {features.proposals2}.
        </p>
      ) : null}
    </div>
  );
}
