import { Search } from '@/components/icons';
import { Input, type InputProps } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type PageSearchInputProps = Omit<InputProps, 'onChange' | 'value'> & {
  value: string;
  onChange: (value: string) => void;
  wrapperClassName?: string;
};

/** Compact list-page search (not for the app shell top bar). */
export function PageSearchInput({
  value,
  onChange,
  placeholder,
  className,
  wrapperClassName,
  ...props
}: PageSearchInputProps) {
  return (
    <div className={cn('relative w-full min-w-[12rem] max-w-xs flex-1', wrapperClassName)}>
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn('h-8 pl-8 text-sm bg-card', className)}
        {...props}
      />
    </div>
  );
}
