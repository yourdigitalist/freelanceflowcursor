import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTimer } from '@/contexts/TimerContext';
import { formatElapsed } from '@/contexts/TimerContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Square, Play, Clock, ExternalLink } from '@/components/icons';

export function TimerBar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    draftSegments,
    timerDescription,
    timerProject,
    isLocalTimerRunning,
    getDraftTotalSeconds,
    startTimer,
    stopTimer,
    logTimeFromTimer,
  } = useTimer();

  if (!user || draftSegments.length === 0) return null;

  const totalSeconds = getDraftTotalSeconds();
  const label = timerDescription?.trim() || timerProject || 'No description yet';

  const handleSave = async () => {
    if (!timerDescription?.trim()) {
      toast({
        title: 'Add a description first',
        description: 'Open the Timer page to add what you worked on, then save your time.',
        variant: 'destructive',
      });
      return;
    }
    await logTimeFromTimer();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] border-t bg-card shadow-lg">
      <div className="flex items-center gap-3 px-4 py-2.5 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 text-foreground shrink-0">
          <Clock className="h-4 w-4 text-primary" />
          <span className="font-mono font-semibold tabular-nums text-sm sm:text-base">
            {formatElapsed(totalSeconds)}
          </span>
        </div>
        <div className="min-w-0 flex-1 truncate text-sm text-muted-foreground" title={label}>
          {label}
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
              <ExternalLink className="h-3.5 w-3.5" />
              Open Timer
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
