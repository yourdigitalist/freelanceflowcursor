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

const STORAGE_KEY = 'lance_timer_draft';
export const TIMER_ENTRY_SAVED_EVENT = 'timer-entry-saved';

export interface DraftSegment {
  startMs: number;
  endMs: number | null;
}

interface StoredDraft {
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
  } catch {}
}

export function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatDurationFromSeconds(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${mins}m${secs > 0 ? ` ${secs}s` : ''}`;
  if (mins > 0) return `${mins}m${secs > 0 ? ` ${secs}s` : ''}`;
  return `${secs}s`;
}

interface TimerContextValue {
  draftSegments: DraftSegment[];
  timerDescription: string;
  timerProject: string;
  timerTask: string;
  timerBillable: boolean;
  setTimerDescription: (v: string) => void;
  setTimerProject: (v: string) => void;
  setTimerTask: (v: string) => void;
  setTimerBillable: (v: boolean) => void;
  startTimer: () => void;
  stopTimer: () => void;
  logTimeFromTimer: () => Promise<void>;
  discardTimerSegment: () => void;
  getDraftTotalSeconds: () => number;
  elapsedSeconds: number;
  isLocalTimerRunning: boolean;
}

const TimerContext = createContext<TimerContextValue | undefined>(undefined);

export function TimerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
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
      draftSegments,
      timerDescription,
      timerProject,
      timerTask,
      timerBillable,
    });
  }, [draftSegments, timerDescription, timerProject, timerTask, timerBillable]);

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

  const startTimer = useCallback(() => {
    const now = Date.now();
    setDraftSegments((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.endMs == null) return prev;
      return [...prev, { startMs: now, endMs: null }];
    });
    toast({
      title: 'Timer started',
      description: 'You can navigate away—the timer keeps running. Use the bar at the bottom to pause or open the Timer page to save.',
    });
  }, [toast]);

  const stopTimer = useCallback(() => {
    setDraftSegments((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.endMs != null) return prev;
      return [...prev.slice(0, -1), { ...last, endMs: Date.now() }];
    });
    toast({
      title: 'Timer paused',
      description: 'Use the bar at the bottom to resume, or open the Timer page to save your entry.',
    });
  }, [toast]);

  const getDraftTotalSeconds = useCallback(() => {
    return draftSegments.reduce((sum, seg) => {
      const end = seg.endMs ?? Date.now();
      return sum + Math.max(0, Math.round((end - seg.startMs) / 1000));
    }, 0);
  }, [draftSegments]);

  const logTimeFromTimer = useCallback(async () => {
    if (draftSegments.length === 0 || !user) return;
    if (!timerDescription?.trim()) {
      toast({
        title: 'Description required',
        description: 'Enter what you worked on before saving.',
        variant: 'destructive',
      });
      return;
    }
    const now = Date.now();
    const segmentsToSave = draftSegments.map((s) => ({
      startMs: s.startMs,
      endMs: s.endMs ?? now,
    }));
    const firstStart = new Date(segmentsToSave[0].startMs);

    try {
      const { data: entryRow, error: entryError } = await supabase
        .from('time_entries')
        .insert({
          description: timerDescription || null,
          project_id: timerProject || null,
          task_id: timerTask || null,
          billable: timerBillable,
          billing_status: timerBillable ? 'unbilled' : 'not_billable',
          user_id: user.id,
          start_time: firstStart.toISOString(),
          end_time: firstStart.toISOString(),
        })
        .select('id')
        .single();
      if (entryError) throw entryError;
      if (!entryRow?.id) throw new Error('No id returned');

      for (const seg of segmentsToSave) {
        const durationSeconds = Math.max(0, Math.round((seg.endMs - seg.startMs) / 1000));
        await supabase.from('time_entry_segments').insert({
          time_entry_id: entryRow.id,
          start_time: new Date(seg.startMs).toISOString(),
          end_time: new Date(seg.endMs).toISOString(),
          duration_seconds: durationSeconds,
        });
      }

      setDraftSegments([]);
      setTimerDescriptionState('');
      setTimerProjectState('');
      setTimerTaskState('');
      setTimerBillableState(true);
      const totalSec = segmentsToSave.reduce((s, seg) => s + Math.round((seg.endMs - seg.startMs) / 1000), 0);
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
  }, [draftSegments, timerDescription, timerProject, timerTask, timerBillable, user, toast]);

  const discardTimerSegment = useCallback(() => {
    setDraftSegments([]);
    setTimerDescriptionState('');
    setTimerProjectState('');
    setTimerTaskState('');
    setTimerBillableState(true);
  }, []);

  const value: TimerContextValue = {
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
