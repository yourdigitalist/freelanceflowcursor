import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTimer } from '@/contexts/TimerContext';
import { formatElapsed } from '@/contexts/TimerContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Trash2, Check } from '@/components/icons';
import { SlotIcon } from '@/contexts/IconSlotContext';
import { Pause } from 'lucide-react';

export function TimerBar() {
  const { user } = useAuth();
  const {
    draftSegments,
    timerDescription,
    setTimerDescription,
    isLocalTimerRunning,
    getDraftTotalSeconds,
    startTimer,
    stopTimer,
    logTimeFromTimer,
    discardTimerSegment,
  } = useTimer();

  if (!user || draftSegments.length === 0) return null;

  const totalSeconds = getDraftTotalSeconds();

  const handleSave = async () => {
    await logTimeFromTimer();
  };

  return (
    <div className="border-t border-black/30 bg-black text-white shadow-2xl">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-2.5 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 shrink-0">
          <SlotIcon slot="timer_bar_clock" className="h-4 w-4 text-white/90" />
          <span className="font-mono font-semibold tabular-nums text-sm sm:text-base text-white">
            {formatElapsed(totalSeconds)}
          </span>
        </div>
        <Input
          value={timerDescription}
          onChange={(e) => setTimerDescription(e.target.value)}
          placeholder="Optional notes"
          className="h-8 flex-1 min-w-[120px] max-w-md text-sm bg-white/10 border-white/20 text-white placeholder:text-white/60"
        />
        <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end sm:justify-start">
          {isLocalTimerRunning ? (
            <Button variant="secondary" size="icon" onClick={stopTimer} title="Pause timer" className="h-8 w-8">
              <Pause className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button variant="secondary" size="icon" onClick={startTimer} title="Resume timer" className="h-8 w-8">
              <Play className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="secondary" size="icon" onClick={handleSave} title="Save entry" className="h-8 w-8">
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => {
              if (confirm('Discard this timer entry? This removes all tracked segments and closes the timer bar.')) {
                discardTimerSegment();
              }
            }}
            title="Discard draft"
            className="h-8 w-8 text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-white/80 hover:text-white hover:bg-white/10">
            <Link to="/time/timer">
              <SlotIcon slot="timer_bar_open" className="h-3.5 w-3.5" />
              Open Timer
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
