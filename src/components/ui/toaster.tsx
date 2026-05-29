import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { ToastErrorIcon, ToastSuccessIcon, ToastWarningIcon } from "@/components/ui/toast-icons";

function toastMessage(title?: React.ReactNode, description?: React.ReactNode) {
  if (title && description) {
    return (
      <>
        {title}
        <span className="text-white/50"> · </span>
        {description}
      </>
    );
  }
  return title ?? description;
}

function ToastStatusIcon({ variant }: { variant?: "default" | "destructive" | "warning" | null }) {
  if (variant === "destructive") return <ToastErrorIcon />;
  if (variant === "warning") return <ToastWarningIcon />;
  return <ToastSuccessIcon />;
}

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, variant, ...props }) => (
        <Toast key={id} variant={variant} {...props}>
          <ToastClose />
          <ToastStatusIcon variant={variant} />
          <div className="min-w-0 flex-1 pr-1">
            {(title || description) && (
              <ToastTitle asChild>
                <p>{toastMessage(title, description)}</p>
              </ToastTitle>
            )}
          </div>
          {action}
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}

