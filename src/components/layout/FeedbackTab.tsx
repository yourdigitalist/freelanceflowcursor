import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { X } from '@/components/icons';

const AUTH_START_KEY = 'lance_feedback_tab_auth_started_at';
const AUTO_OPEN_DONE_KEY = 'lance_feedback_three_min_auto_open_done';
const THREE_MIN_MS = 3 * 60 * 1000;
/** Clear Crisp’s bottom-right launcher (~56px) plus comfortable gap */
const CRISP_BOTTOM_SAFE_CLASS = 'bottom-24';

const FREELANCE_AREAS = ['Design', 'Web Development', 'Marketing', 'Other'] as const;
const FIRST_FEATURES = ['Projects', 'File Approvals', 'Invoicing', 'CRM'] as const;

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

export function FeedbackTab() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [freelanceArea, setFreelanceArea] = useState<(typeof FREELANCE_AREAS)[number] | null>(null);
  const [firstFeature, setFirstFeature] = useState<(typeof FIRST_FEATURES)[number] | null>(null);
  const [whatBroke, setWhatBroke] = useState('');
  const [wishList, setWishList] = useState('');
  const [impression, setImpression] = useState<number | null>(null);
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

  const closePanel = useCallback(() => {
    clearTimers();
    setOpen(false);
  }, [clearTimers]);

  const closePanelAndResetForm = useCallback(() => {
    clearTimers();
    setOpen(false);
    scheduleResetAfterClose();
  }, [clearTimers, scheduleResetAfterClose]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  useEffect(() => {
    if (!user) {
      try {
        sessionStorage.removeItem(AUTH_START_KEY);
        sessionStorage.removeItem(AUTO_OPEN_DONE_KEY);
      } catch {
        /* ignore */
      }
      setOpen(false);
      clearTimers();
      return;
    }

    let start: string | null = null;
    try {
      start = sessionStorage.getItem(AUTH_START_KEY);
      if (!start) {
        start = String(Date.now());
        sessionStorage.setItem(AUTH_START_KEY, start);
      }
    } catch {
      start = String(Date.now());
    }

    const elapsed = Date.now() - Number(start);
    if (elapsed >= THREE_MIN_MS) {
      return;
    }

    const t = window.setTimeout(() => {
      let already = false;
      try {
        already = sessionStorage.getItem(AUTO_OPEN_DONE_KEY) === '1';
        if (!already) sessionStorage.setItem(AUTO_OPEN_DONE_KEY, '1');
      } catch {
        /* ignore */
      }
      if (!already) {
        setOpen(true);
      }
    }, THREE_MIN_MS - elapsed);
    return () => window.clearTimeout(t);
  }, [user, clearTimers]);

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
    const { error } = await supabase.from('feedback').insert({
      user_id: user.id,
      freelance_area: freelanceArea,
      first_feature: firstFeature,
      what_broke: trimmed,
      wish_list: wishList.trim() || null,
      impression,
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
      closePanelAndResetForm();
    }, 3000);
  };

  if (!user) return null;

  return (
    <div
      className={cn(
        'fixed top-0 right-0 z-[65] flex flex-row-reverse items-stretch pointer-events-none',
        CRISP_BOTTOM_SAFE_CLASS,
      )}
    >
      <button
        type="button"
        onClick={() => {
          if (open) {
            closePanel();
          } else {
            clearTimers();
            setOpen(true);
          }
        }}
        className={cn(
          'pointer-events-auto my-auto shrink-0 border-y border-l border-r-0 border-border bg-card pl-2.5 pr-2 py-7 text-sm font-semibold tracking-wide text-foreground shadow-md transition-all hover:bg-accent hover:shadow-lg',
          'rounded-l-2xl',
          '[writing-mode:vertical-rl] [text-orientation:mixed]',
          open && 'border-primary/40 bg-primary/5 shadow-lg',
        )}
        aria-expanded={open}
        aria-controls="lance-feedback-panel"
      >
        Feedback
      </button>

      <aside
        id="lance-feedback-panel"
        className={cn(
          'pointer-events-auto flex h-full max-h-full w-[min(100vw-2.75rem,400px)] flex-col border-l border-border bg-card shadow-lg transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4 shrink-0">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Help us improve Lance</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Takes 2 minutes. Seriously.</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8"
            onClick={closePanel}
            aria-label="Close feedback"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {success ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
            <p className="text-base font-medium text-foreground">You&apos;re a legend. Thank you! 🙏</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
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
                  className="resize-none min-h-[100px]"
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
                  className="resize-none min-h-[80px]"
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
              {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            </div>
            <div className="shrink-0 border-t border-border p-4">
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send feedback'}
              </Button>
            </div>
          </form>
        )}
      </aside>
    </div>
  );
}
