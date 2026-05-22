import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  LANCE_SERVICE_AGREEMENT_DISCLAIMER_BODY,
  LANCE_SERVICE_AGREEMENT_DISCLAIMER_CHECKBOX,
  LANCE_SERVICE_AGREEMENT_DISCLAIMER_TITLE,
} from "@/lib/lanceServiceAgreementTemplate";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function LanceServiceAgreementDisclaimerDialog({ open, onOpenChange, onConfirm }: Props) {
  const [agreed, setAgreed] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) setAgreed(false);
    onOpenChange(next);
  };

  const handleConfirm = () => {
    if (!agreed) return;
    setAgreed(false);
    onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{LANCE_SERVICE_AGREEMENT_DISCLAIMER_TITLE}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left text-sm text-muted-foreground">
              {LANCE_SERVICE_AGREEMENT_DISCLAIMER_BODY.split("\n\n").map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50/80 px-3 py-3">
          <Checkbox
            id="lance-template-disclaimer-agree"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked === true)}
          />
          <Label htmlFor="lance-template-disclaimer-agree" className="cursor-pointer text-sm leading-snug text-foreground">
            {LANCE_SERVICE_AGREEMENT_DISCLAIMER_CHECKBOX}
          </Label>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button onClick={handleConfirm} disabled={!agreed}>
            I agree — continue
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type BannerProps = {
  agreed: boolean;
  onAgreedChange: (agreed: boolean) => void;
};

/** Persistent notice at the top of the Lance template editor. */
export function LanceServiceAgreementDisclaimerBanner({ agreed, onAgreedChange }: BannerProps) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-950">
      <p className="font-semibold">{LANCE_SERVICE_AGREEMENT_DISCLAIMER_TITLE}</p>
      <div className="mt-2 space-y-2 text-amber-900/90">
        {LANCE_SERVICE_AGREEMENT_DISCLAIMER_BODY.split("\n\n").map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <div className="mt-4 flex items-start gap-3">
        <Checkbox
          id="lance-template-banner-agree"
          checked={agreed}
          onCheckedChange={(checked) => onAgreedChange(checked === true)}
        />
        <Label htmlFor="lance-template-banner-agree" className="cursor-pointer text-sm leading-snug">
          {LANCE_SERVICE_AGREEMENT_DISCLAIMER_CHECKBOX}
        </Label>
      </div>
    </div>
  );
}
