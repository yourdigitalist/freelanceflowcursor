import { useCallback, useRef, useState } from "react";
import type { LanceServiceAgreementTemplateLike } from "@/lib/lanceServiceAgreementTemplate";
import { isLanceProvidedServiceAgreementTemplate } from "@/lib/lanceServiceAgreementTemplate";

export function useLanceServiceAgreementDisclaimer() {
  const [open, setOpen] = useState(false);
  const resolverRef = useRef<((accepted: boolean) => void) | null>(null);
  const acceptedTemplateKeyRef = useRef<string | null>(null);

  const requestAcceptance = useCallback(
    (template: LanceServiceAgreementTemplateLike | null | undefined): Promise<boolean> => {
      if (!isLanceProvidedServiceAgreementTemplate(template)) {
        return Promise.resolve(true);
      }
      const templateKey = template?.id || "lance-default";
      if (acceptedTemplateKeyRef.current === templateKey) {
        return Promise.resolve(true);
      }
      return new Promise((resolve) => {
        resolverRef.current = (accepted) => {
          if (accepted) acceptedTemplateKeyRef.current = templateKey;
          resolve(accepted);
        };
        setOpen(true);
      });
    },
    [],
  );

  const handleOpenChange = useCallback((next: boolean) => {
    if (!next && resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
    setOpen(next);
  }, []);

  const handleConfirm = useCallback(() => {
    resolverRef.current?.(true);
    resolverRef.current = null;
    setOpen(false);
  }, []);

  return {
    disclaimerOpen: open,
    onDisclaimerOpenChange: handleOpenChange,
    onDisclaimerConfirm: handleConfirm,
    requestAcceptance,
  };
}
