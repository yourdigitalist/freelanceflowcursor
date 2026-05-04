import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { X } from '@/components/icons';

const FREELANCE_AREAS = ['Design', 'Web Development', 'Marketing', 'Other'] as const;
const FIRST_FEATURES = [
  'CRM / Clients',
  'Projects',
  'Time Tracking',
  'Notes',
  'Invoicing',
  'File Approvals',
] as const;
const PRICING_FEEL = ['Too expensive', 'Fair', 'Great value', 'Not sure yet'] as const;
const TOOL_OPTIONS = [
  'Notion',
  'Monday.com',
  'Trello',
  'Asana',
  'Excel or Google Sheets',
  'FreshBooks or Wave',
  'Toggl or Clockify',
  'Google Drive or Dropbox',
  'Nothing yet',
  'Other',
] as const;

const IMPRESSIONS = [
  { value: 1, emoji: '😬' },
  { value: 2, emoji: '😐' },
  { value: 3, emoji: '🙂' },
  { value: 4, emoji: '😀' },
  { value: 5, emoji: '🤩' },
] as const;

function PillGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T | null;
  onChange: (v: T | null) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(selected ? null : opt)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                selected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PillGroupMulti({
  label,
  options,
  values,
  onToggle,
}: {
  label: string;
  options: readonly string[];
  values: readonly string[];
  onToggle: (opt: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = values.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                selected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Above app chrome; high enough to sit above third-party widgets (e.g. chat) while this modal is open */
const FEEDBACK_MODAL_Z = 'z-[100000]';

export function FeedbackTab() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [freelanceArea, setFreelanceArea] = useState<(typeof FREELANCE_AREAS)[number] | null>(null);
  const [firstFeature, setFirstFeature] = useState<(typeof FIRST_FEATURES)[number] | null>(null);
  const [whatBroke, setWhatBroke] = useState('');
  const [wishList, setWishList] = useState('');
  const [impression, setImpression] = useState<number | null>(null);
  const [pricingFeel, setPricingFeel] = useState<(typeof PRICING_FEEL)[number] | null>(null);
  const [toolsSelected, setToolsSelected] = useState<string[]>([]);
  const [toolsOther, setToolsOther] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const successCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetDelayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (successCloseTimer.current) {
      clearTimeout(successCloseTimer.current);
      successCloseTimer.current = null;
    }
    if (resetDelayTimer.current) {
      clearTimeout(resetDelayTimer.current);
      resetDelayTimer.current = null;
    }
  }, []);

  const resetForm = useCallback(() => {
    setFreelanceArea(null);
    setFirstFeature(null);
    setWhatBroke('');
    setWishList('');
    setImpression(null);
    setPricingFeel(null);
    setToolsSelected([]);
    setToolsOther('');
    setSubmitError(null);
    setSuccess(false);
  }, []);

  const scheduleResetAfterClose = useCallback(() => {
    if (resetDelayTimer.current) clearTimeout(resetDelayTimer.current);
    resetDelayTimer.current = window.setTimeout(() => {
      resetForm();
      resetDelayTimer.current = null;
    }, 320);
  }, [resetForm]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      clearTimers();
      setOpen(next);
      if (!next) {
        scheduleResetAfterClose();
      }
    },
    [clearTimers, scheduleResetAfterClose],
  );

  const toggleTool = useCallback((opt: string) => {
    setToolsSelected((prev) => (prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]));
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  useEffect(() => {
    if (!user) {
      clearTimers();
      setOpen(false);
      resetForm();
    }
  }, [user, clearTimers, resetForm]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const trimmed = whatBroke.trim();
    if (!trimmed) {
      setSubmitError('Please tell us if anything felt confusing or broken.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    const hasTools = toolsSelected.length > 0 || toolsOther.trim().length > 0;
    const current_tools = hasTools
      ? { selected: [...toolsSelected], other: toolsOther.trim() || null }
      : null;

    const { error } = await supabase.from('feedback').insert({
      user_id: user.id,
      freelance_area: freelanceArea,
      first_feature: firstFeature,
      what_broke: trimmed,
      wish_list: wishList.trim() || null,
      impression,
      pricing_feel: pricingFeel,
      current_tools,
      status: 'new',
    });
    setSubmitting(false);
    if (error) {
      setSubmitError(error.message || 'Something went wrong. Try again.');
      return;
    }
    setSuccess(true);
    successCloseTimer.current = window.setTimeout(() => {
      successCloseTimer.current = null;
      handleOpenChange(false);
    }, 3000);
  };

  if (!user) return null;

  const showToolsOther = toolsSelected.includes('Other');

  return (
    <>
      <div className="pointer-events-none fixed inset-y-0 right-0 z-[65] flex items-center justify-end">
        <button
          type="button"
          onClick={() => handleOpenChange(true)}
          className={cn(
            'pointer-events-auto flex w-7 shrink-0 flex-col items-center justify-center gap-0 border-y border-l border-r-0 border-border bg-card py-3 shadow-md transition-colors hover:bg-accent',
            'rounded-l-lg border-border',
            '[writing-mode:vertical-rl] [text-orientation:mixed] text-[11px] font-semibold tracking-wide text-foreground leading-tight',
          )}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          Feedback
        </button>
      </div>

      <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className={cn(
              'fixed inset-0 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              FEEDBACK_MODAL_Z,
            )}
          />
          <DialogPrimitive.Content
            className={cn(
              'fixed inset-0 flex flex-col border-0 bg-background p-0 shadow-lg outline-none',
              'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              FEEDBACK_MODAL_Z,
            )}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-8">
              <div>
                <DialogPrimitive.Title className="text-lg font-semibold tracking-tight">
                  Help us improve Lance
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-0.5 text-sm text-muted-foreground">
                  Takes 2 minutes. Seriously.
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close asChild>
                <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="Close feedback">
                  <X className="h-5 w-5" />
                </Button>
              </DialogPrimitive.Close>
            </div>

            {success ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
                <p className="text-base font-medium text-foreground">You&apos;re a legend. Thank you! 🙏</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-8">
                  <PillGroup
                    label="What's your main freelance area?"
                    options={FREELANCE_AREAS}
                    value={freelanceArea}
                    onChange={setFreelanceArea}
                  />
                  <PillGroup
                    label="Which feature did you try first?"
                    options={FIRST_FEATURES}
                    value={firstFeature}
                    onChange={setFirstFeature}
                  />
                  <div className="space-y-2">
                    <Label htmlFor="feedback-what-broke" className="text-sm font-medium">
                      Did anything confuse you or feel broken? <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="feedback-what-broke"
                      value={whatBroke}
                      onChange={(e) => setWhatBroke(e.target.value)}
                      placeholder="Be brutal, we can take it"
                      rows={4}
                      className="min-h-[100px] resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feedback-wish" className="text-sm font-medium">
                      What&apos;s one thing you wish Lance could do?
                    </Label>
                    <Textarea
                      id="feedback-wish"
                      value={wishList}
                      onChange={(e) => setWishList(e.target.value)}
                      placeholder="Dream big"
                      rows={3}
                      className="min-h-[80px] resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Overall first impression</Label>
                    <div className="flex flex-wrap gap-1" role="group" aria-label="First impression, 1 to 5">
                      {IMPRESSIONS.map(({ value, emoji }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setImpression(impression === value ? null : value)}
                          className={cn(
                            'flex h-11 w-11 items-center justify-center rounded-lg border text-xl transition-colors',
                            impression === value
                              ? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-2 ring-offset-background'
                              : 'border-transparent bg-muted/50 hover:bg-muted',
                          )}
                          aria-pressed={impression === value}
                          title={`${value} of 5`}
                        >
                          <span aria-hidden>{emoji}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <PillGroup
                    label="How does our pricing feel? It's $29 per month or $290 anually."
                    options={PRICING_FEEL}
                    value={pricingFeel}
                    onChange={setPricingFeel}
                  />
                  <div className="space-y-2">
                    <PillGroupMulti
                      label="What tools are you currently using for these? (select all that apply)"
                      options={TOOL_OPTIONS}
                      values={toolsSelected}
                      onToggle={toggleTool}
                    />
                    {showToolsOther && (
                      <div className="pt-1">
                        <Label htmlFor="feedback-tools-other" className="sr-only">
                          Other tools
                        </Label>
                        <Input
                          id="feedback-tools-other"
                          value={toolsOther}
                          onChange={(e) => setToolsOther(e.target.value)}
                          placeholder="List other tools…"
                          autoComplete="off"
                        />
                      </div>
                    )}
                  </div>
                  {submitError && <p className="text-sm text-destructive">{submitError}</p>}
                </div>
                <div className="shrink-0 border-t border-border p-4 sm:px-8">
                  <Button type="submit" className="w-full sm:max-w-md" disabled={submitting}>
                    {submitting ? 'Sending…' : 'Send feedback'}
                  </Button>
                </div>
              </form>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
