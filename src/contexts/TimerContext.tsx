import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { formatDuration } from '@/lib/time';
import { resolveEffectiveHourlyRate } from '@/lib/billing';

const STORAGE_KEY = 'lance_timer_draft';
export const TIMER_ENTRY_SAVED_EVENT = 'timer-entry-saved';

export interface DraftSegment {
  startMs: number;
  endMs: number | null;
}

interface StoredDraft {
  activeEntryId: string | null;
  draftSegments: DraftSegment[];
  timerDescription: string;
  timerProject: string;
  timerTask: string;
  timerBillable: boolean;
}

function loadStored(): StoredDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft;
    if (!parsed || !Array.isArray(parsed.draftSegments)) return null;
    return {
      activeEntryId: typeof parsed.activeEntryId === 'string' ? parsed.activeEntryId : null,
      draftSegments: parsed.draftSegments,
      timerDescription: typeof parsed.timerDescription === 'string' ? parsed.timerDescription : '',
      timerProject: typeof parsed.timerProject === 'string' ? parsed.timerProject : '',
      timerTask: typeof parsed.timerTask === 'string' ? parsed.timerTask : '',
      timerBillable: typeof parsed.timerBillable === 'boolean' ? parsed.timerBillable : true,
    };
  } catch {
    return null;
  }
}

function saveStored(data: StoredDraft) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage write failures (private mode or quota).
  }
}

export function formatElapsed(totalSeconds: number): string {
  return formatDuration(totalSeconds, true);
}

export function formatDurationFromSeconds(totalSeconds: number): string {
  return formatDuration(totalSeconds, true);
}

interface TimerContextValue {
  activeEntryId: string | null;
  draftSegments: DraftSegment[];
  timerDescription: string;
  timerProject: string;
  timerTask: string;
  timerBillable: boolean;
  setTimerDescription: (v: string) => void;
  setTimerProject: (v: string) => void;
  setTimerTask: (v: string) => void;
  setTimerBillable: (v: boolean) => void;
  startTimer: () => Promise<void>;
  stopTimer: () => Promise<void>;
  logTimeFromTimer: () => Promise<void>;
  discardTimerSegment: () => void;
  resumeEntry: (entryId: string) => Promise<void>;
  getDraftTotalSeconds: () => number;
  elapsedSeconds: number;
  isLocalTimerRunning: boolean;
}

const TimerContext = createContext<TimerContextValue | undefined>(undefined);

export function TimerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeEntryId, setActiveEntryId] = useState<string | null>(() => loadStored()?.activeEntryId ?? null);
  const [draftSegments, setDraftSegments] = useState<DraftSegment[]>(() => loadStored()?.draftSegments ?? []);
  const [timerDescription, setTimerDescriptionState] = useState(() => loadStored()?.timerDescription ?? '');
  const [timerProject, setTimerProjectState] = useState(() => loadStored()?.timerProject ?? '');
  const [timerTask, setTimerTaskState] = useState(() => loadStored()?.timerTask ?? '');
  const [timerBillable, setTimerBillableState] = useState(() => loadStored()?.timerBillable ?? true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerStartMsRef = useRef<number | null>(null);

  const isLocalTimerRunning = draftSegments.length > 0 && draftSegments[draftSegments.length - 1].endMs == null;
  const runningSegmentStartMs = isLocalTimerRunning ? draftSegments[draftSegments.length - 1].startMs : null;

  useEffect(() => {
    saveStored({
      activeEntryId,
      draftSegments,
      timerDescription,
      timerProject,
      timerTask,
      timerBillable,
    });
  }, [activeEntryId, draftSegments, timerDescription, timerProject, timerTask, timerBillable]);

  useEffect(() => {
    if (!isLocalTimerRunning || runningSegmentStartMs == null) {
      timerStartMsRef.current = null;
      setElapsedSeconds(0);
      return;
    }
    timerStartMsRef.current = runningSegmentStartMs;
    const tick = () => {
      if (timerStartMsRef.current == null) return;
      setElapsedSeconds(Math.floor((Date.now() - timerStartMsRef.current) / 1000));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isLocalTimerRunning, runningSegmentStartMs]);

  const setTimerDescription = useCallback((v: string) => setTimerDescriptionState(v), []);
  const setTimerProject = useCallback((v: string) => setTimerProjectState(v), []);
  const setTimerTask = useCallback((v: string) => setTimerTaskState(v), []);
  const setTimerBillable = useCallback((v: boolean) => setTimerBillableState(v), []);

  const startTimer = useCallback(async () => {
    if (!user) return;
    const now = Date.now();
    const effectiveHourlyRate = await resolveEffectiveHourlyRate({
      userId: user.id,
      projectId: timerProject || null,
    });
    let entryId = activeEntryId;
    if (!entryId) {
      const { data: entryRow, error: entryError } = await supabase
        .from('time_entries')
        .insert({
          description: timerDescription || null,
          project_id: timerProject || null,
          task_id: timerTask || null,
          billable: timerBillable,
          billing_status: timerBillable ? 'unbilled' : 'not_billable',
          hourly_rate: effectiveHourlyRate,
          user_id: user.id,
          start_time: new Date(now).toISOString(),
          started_at: new Date(now).toISOString(),
          end_time: null,
        })
        .select('id')
        .single();
      if (entryError || !entryRow?.id) {
        toast({
          title: 'Unable to start timer',
          description: entryError?.message || 'Could not create timer entry.',
          variant: 'destructive',
        });
        return;
      }
      entryId = entryRow.id;
      setActiveEntryId(entryRow.id);
    } else {
      await supabase
        .from('time_entries')
        .update({
          description: timerDescription || null,
          project_id: timerProject || null,
          task_id: timerTask || null,
          billable: timerBillable,
          billing_status: timerBillable ? 'unbilled' : 'not_billable',
          hourly_rate: effectiveHourlyRate,
        })
        .eq('id', entryId);
    }
    setDraftSegments((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.endMs == null) return prev;
      return [...prev, { startMs: now, endMs: null }];
    });
    toast({
      title: 'Timer started',
      description: 'You can navigate away—the timer keeps running. Use the bar at the bottom to pause or open the Timer page to save.',
    });
  }, [activeEntryId, timerDescription, timerProject, timerTask, timerBillable, user, toast]);

  const stopTimer = useCallback(async () => {
    if (!activeEntryId) return;
    const now = Date.now();
    let closedSegment: DraftSegment | null = null;
    setDraftSegments((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.endMs != null) return prev;
      closedSegment = { ...last, endMs: now };
      return [...prev.slice(0, -1), closedSegment];
    });
    if (closedSegment) {
      const durationSeconds = Math.max(0, Math.round((closedSegment.endMs! - closedSegment.startMs) / 1000));
      const { error } = await supabase.from('time_entry_segments').insert({
        time_entry_id: activeEntryId,
        start_time: new Date(closedSegment.startMs).toISOString(),
        end_time: new Date(closedSegment.endMs!).toISOString(),
        duration_seconds: durationSeconds,
      });
      if (!error) {
        const effectiveHourlyRate = await resolveEffectiveHourlyRate({
          userId: user.id,
          projectId: timerProject || null,
        });
        await supabase
          .from('time_entries')
          .update({
            description: timerDescription || null,
            project_id: timerProject || null,
            task_id: timerTask || null,
            billable: timerBillable,
            billing_status: timerBillable ? 'unbilled' : 'not_billable',
            hourly_rate: effectiveHourlyRate,
            end_time: null,
          })
          .eq('id', activeEntryId);
      }
    }
    toast({
      title: 'Timer paused',
      description: 'Use the bar at the bottom to resume, or open the Timer page to save your entry.',
    });
  }, [activeEntryId, timerDescription, timerProject, timerTask, timerBillable, toast, user]);

  const getDraftTotalSeconds = useCallback(() => {
    return draftSegments.reduce((sum, seg) => {
      const end = seg.endMs ?? Date.now();
      return sum + Math.max(0, Math.round((end - seg.startMs) / 1000));
    }, 0);
  }, [draftSegments]);

  const logTimeFromTimer = useCallback(async () => {
    if (!activeEntryId || draftSegments.length === 0 || !user) return;
    if (!timerDescription?.trim()) {
      toast({
        title: 'Description required',
        description: 'Enter what you worked on before saving.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const now = Date.now();
      const runningSegment = draftSegments[draftSegments.length - 1];
      if (runningSegment?.endMs == null) {
        const durationSeconds = Math.max(0, Math.round((now - runningSegment.startMs) / 1000));
        await supabase.from('time_entry_segments').insert({
          time_entry_id: activeEntryId,
          start_time: new Date(runningSegment.startMs).toISOString(),
          end_time: new Date(now).toISOString(),
          duration_seconds: durationSeconds,
        });
      }
      const { data: segments } = await supabase
        .from('time_entry_segments')
        .select('end_time, duration_seconds')
        .eq('time_entry_id', activeEntryId);
      const latestEnd = (segments || [])
        .map((s) => s.end_time)
        .sort()
        .at(-1) ?? new Date(now).toISOString();
      const totalSec = (segments || []).reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
      const effectiveHourlyRate = await resolveEffectiveHourlyRate({
        userId: user.id,
        projectId: timerProject || null,
      });
      await supabase
        .from('time_entries')
        .update({
          description: timerDescription || null,
          project_id: timerProject || null,
          task_id: timerTask || null,
          billable: timerBillable,
          billing_status: timerBillable ? 'unbilled' : 'not_billable',
          hourly_rate: effectiveHourlyRate,
          end_time: latestEnd,
        })
        .eq('id', activeEntryId);

      setDraftSegments([]);
      setActiveEntryId(null);
      setTimerDescriptionState('');
      setTimerProjectState('');
      setTimerTaskState('');
      setTimerBillableState(true);
      toast({
        title: 'Time entry saved',
        description: formatDurationFromSeconds(totalSec) + ' logged.',
      });
      window.dispatchEvent(new CustomEvent(TIMER_ENTRY_SAVED_EVENT));
    } catch (error: unknown) {
      toast({
        title: 'Error saving time',
        description: error instanceof Error ? error.message : 'Something went wrong.',
        variant: 'destructive',
      });
    }
  }, [activeEntryId, draftSegments, timerDescription, timerProject, timerTask, timerBillable, user, toast]);

  const discardTimerSegment = useCallback(() => {
    const currentEntryId = activeEntryId;
    if (currentEntryId) {
      supabase.from('time_entries').delete().eq('id', currentEntryId);
    }
    setActiveEntryId(null);
    setDraftSegments([]);
    setTimerDescriptionState('');
    setTimerProjectState('');
    setTimerTaskState('');
    setTimerBillableState(true);
  }, [activeEntryId]);

  const resumeEntry = useCallback(async (entryId: string) => {
    if (draftSegments.length > 0 && activeEntryId && activeEntryId !== entryId) {
      const shouldReplace = window.confirm(
        'You already have a timer draft in progress. Resume this entry instead and replace the current draft?'
      );
      if (!shouldReplace) return;
    }
    const { data: entry, error } = await supabase
      .from('time_entries')
      .select('id, description, project_id, task_id, billable')
      .eq('id', entryId)
      .maybeSingle();
    if (error || !entry) {
      toast({
        title: 'Unable to resume',
        description: error?.message || 'Entry not found.',
        variant: 'destructive',
      });
      return;
    }
    const { data: segments } = await supabase
      .from('time_entry_segments')
      .select('start_time, end_time')
      .eq('time_entry_id', entryId)
      .order('start_time', { ascending: true });
    setActiveEntryId(entryId);
    setTimerDescriptionState(entry.description || '');
    setTimerProjectState(entry.project_id || '');
    setTimerTaskState(entry.task_id || '');
    setTimerBillableState(entry.billable ?? true);
    setDraftSegments(
      (segments || []).map((s) => ({
        startMs: new Date(s.start_time).getTime(),
        endMs: s.end_time ? new Date(s.end_time).getTime() : null,
      })),
    );
    setDraftSegments((prev) => [...prev, { startMs: Date.now(), endMs: null }]);
    toast({
      title: 'Timer resumed',
      description: 'Continue tracking and save when done.',
    });
  }, [activeEntryId, draftSegments.length, toast]);

  const value: TimerContextValue = {
    activeEntryId,
    draftSegments,
    timerDescription,
    timerProject,
    timerTask,
    timerBillable,
    setTimerDescription,
    setTimerProject,
    setTimerTask,
    setTimerBillable,
    startTimer,
    stopTimer,
    logTimeFromTimer,
    discardTimerSegment,
    resumeEntry,
    getDraftTotalSeconds,
    elapsedSeconds,
    isLocalTimerRunning,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (ctx === undefined) throw new Error('useTimer must be used within TimerProvider');
  return ctx;
}
