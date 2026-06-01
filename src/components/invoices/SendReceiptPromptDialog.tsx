import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type SendReceiptPromptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceNumber?: string;
  onSendReceipt: () => void;
};

export function SendReceiptPromptDialog({
  open,
  onOpenChange,
  invoiceNumber,
  onSendReceipt,
}: SendReceiptPromptDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Send receipt now?</AlertDialogTitle>
          <AlertDialogDescription>
            {invoiceNumber
              ? `Invoice ${invoiceNumber} is marked as paid. Email a receipt to your client now, or send it later from the invoice page.`
              : 'This invoice is marked as paid. Email a receipt to your client now, or send it later from the invoice page.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Not now</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              onSendReceipt();
              onOpenChange(false);
            }}
          >
            Send receipt
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
