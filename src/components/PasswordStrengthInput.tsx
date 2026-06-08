import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { evaluatePasswordStrength, type PasswordStrength } from '@/lib/passwordStrength';
import { Check } from '@/components/icons';

const STRENGTH_BAR: Record<
  PasswordStrength,
  { fill: string; track: string; text: string }
> = {
  weak: {
    fill: 'bg-red-500',
    track: 'bg-red-500/20',
    text: 'text-red-600 dark:text-red-400',
  },
  fair: {
    fill: 'bg-[#FE8E01]',
    track: 'bg-[#FE8E01]/20',
    text: 'text-[#FE8E01]',
  },
  strong: {
    fill: 'bg-green-500',
    track: 'bg-green-500/20',
    text: 'text-green-600 dark:text-green-400',
  },
};

interface PasswordStrengthInputProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  placeholder?: string;
  showRequirements?: boolean;
}

export function PasswordStrengthInput({
  id,
  name,
  label,
  value,
  onChange,
  autoComplete = 'new-password',
  placeholder = '••••••••',
  showRequirements = true,
}: PasswordStrengthInputProps) {
  const result = evaluatePasswordStrength(value);
  const styles = STRENGTH_BAR[result.strength];
  const showMeter = value.length > 0;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type="password"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        minLength={8}
        aria-describedby={showMeter ? `${id}-strength` : undefined}
      />

      {showMeter && (
        <div id={`${id}-strength`} className="space-y-2" aria-live="polite">
          <div className="flex items-center justify-between gap-2">
            <div className={cn('h-1.5 flex-1 overflow-hidden rounded-full', styles.track)}>
              <div
                className={cn('h-full rounded-full transition-all duration-300', styles.fill)}
                style={{ width: `${result.percent}%` }}
              />
            </div>
            <span className={cn('text-xs font-medium shrink-0', styles.text)}>{result.label}</span>
          </div>

          {showRequirements && (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {result.requirements.map((req) => (
                <li key={req.id} className="flex items-center gap-1.5">
                  <Check
                    className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      req.met ? 'text-green-500' : 'text-muted-foreground/40'
                    )}
                    aria-hidden
                  />
                  <span className={cn(req.met && 'text-foreground')}>{req.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!showMeter && showRequirements && (
        <p className="text-xs text-muted-foreground">
          Use at least 8 characters with uppercase, lowercase, a number, and a special character.
        </p>
      )}
    </div>
  );
}
