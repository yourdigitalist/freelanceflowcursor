import { useCallback, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export type ConfirmDialogOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type PendingConfirm = ConfirmDialogOptions & {
  resolve: (value: boolean) => void;
};

export function useConfirmDialog() {
  const pendingRef = useRef<PendingConfirm | null>(null);
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((n) => n + 1), []);

  const confirm = useCallback(
    (options: ConfirmDialogOptions): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        pendingRef.current = { ...options, resolve };
        rerender();
      });
    },
    [rerender],
  );

  const dismiss = useCallback(
    (result: boolean) => {
      const pending = pendingRef.current;
      if (!pending) return;
      pendingRef.current = null;
      pending.resolve(result);
      rerender();
    },
    [rerender],
  );

  const pending = pendingRef.current;

  const ConfirmDialogHost = pending ? (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) dismiss(false);
      }}
      title={pending.title}
      description={pending.description}
      confirmLabel={pending.confirmLabel}
      cancelLabel={pending.cancelLabel}
      destructive={pending.destructive}
      onConfirm={() => dismiss(true)}
    />
  ) : null;

  return { confirm, ConfirmDialogHost };
}
