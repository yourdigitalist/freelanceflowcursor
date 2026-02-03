import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface QuickAddTaskProps {
  onAdd: (title: string) => void;
  onCancel: () => void;
}

export function QuickAddTask({ onAdd, onCancel }: QuickAddTaskProps) {
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && title.trim()) {
      onAdd(title.trim());
      setTitle('');
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <Input
      ref={inputRef}
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        if (title.trim()) {
          onAdd(title.trim());
        } else {
          onCancel();
        }
      }}
      placeholder="Task title... (Enter to add, Esc to cancel)"
      className="text-sm"
    />
  );
}
