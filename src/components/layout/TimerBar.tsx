import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTimer } from '@/contexts/TimerContext';
import { formatElapsed } from '@/contexts/TimerContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Square, Play } from '@/components/icons';
import { SlotIcon } from '@/contexts/IconSlotContext';

export function TimerBar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    draftSegments,
    timerDescription,
    setTimerDescription,
    isLocalTimerRunning,
    getDraftTotalSeconds,
    startTimer,
    stopTimer,
    logTimeFromTimer,
  } = useTimer();

  if (!user || draftSegments.length === 0) return null;

  const totalSeconds = getDraftTotalSeconds();

  const handleSave = async () => {
    if (!timerDescription?.trim()) {
      toast({
        title: 'Add a description',
        description: 'Type what you worked on in the bar above, then save.',
        variant: 'destructive',
      });
      return;
    }
    await logTimeFromTimer();
  };

  return (
    <div className="border-t bg-card shadow-lg">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-2.5 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 text-foreground shrink-0">
          <SlotIcon slot="timer_bar_clock" className="h-4 w-4 text-primary" />
          <span className="font-mono font-semibold tabular-nums text-sm sm:text-base">
            {formatElapsed(totalSeconds)}
          </span>
        </div>
        <Input
          value={timerDescription}
          onChange={(e) => setTimerDescription(e.target.value)}
          placeholder="What are you working on?"
          className="h-8 flex-1 min-w-[120px] max-w-md text-sm"
        />
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end sm:justify-start">
          {isLocalTimerRunning ? (
            <Button variant="outline" size="sm" onClick={stopTimer} className="gap-1.5">
              <Square className="h-3.5 w-3.5" />
              Pause
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={startTimer} className="gap-1.5">
              <Play className="h-3.5 w-3.5" />
              Resume
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleSave} className="gap-1.5">
            Save
          </Button>
          <Button variant="ghost" size="sm" asChild className="gap-1.5">
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
