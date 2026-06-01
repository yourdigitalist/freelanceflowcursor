import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from '@/components/icons';
import {
  INVOICE_PAYMENT_METHODS,
  todayDateInputValue,
  type MarkInvoicePaidInput,
} from '@/lib/invoicePayment';

type MarkInvoicePaidDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceNumber?: string;
  onConfirm: (input: MarkInvoicePaidInput) => void | Promise<void>;
};

export function MarkInvoicePaidDialog({
  open,
  onOpenChange,
  invoiceNumber,
  onConfirm,
}: MarkInvoicePaidDialogProps) {
  const [paidDate, setPaidDate] = useState(todayDateInputValue);
  const [paymentMethod, setPaymentMethod] = useState<string>('bank_transfer');
  const [paymentMethodOther, setPaymentMethodOther] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPaidDate(todayDateInputValue());
    setPaymentMethod('bank_transfer');
    setPaymentMethodOther('');
    setSubmitting(false);
  }, [open]);

  const handleSubmit = async () => {
    if (!paidDate.trim() || !paymentMethod) return;
    if (paymentMethod === 'other' && !paymentMethodOther.trim()) return;
    setSubmitting(true);
    try {
      await onConfirm({
        paidDate,
        paymentMethod,
        paymentMethodOther: paymentMethod === 'other' ? paymentMethodOther : undefined,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as paid</DialogTitle>
          <DialogDescription>
            {invoiceNumber
              ? `Record payment details for invoice ${invoiceNumber}. These appear on the invoice and receipt.`
              : 'Record payment details. These appear on the invoice and receipt.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="invoice-paid-date">Payment date</Label>
            <Input
              id="invoice-paid-date"
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice-payment-method">Payment method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="invoice-payment-method">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {INVOICE_PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {paymentMethod === 'other' ? (
            <div className="space-y-2">
              <Label htmlFor="invoice-payment-method-other">Specify method</Label>
              <Input
                id="invoice-payment-method-other"
                value={paymentMethodOther}
                onChange={(e) => setPaymentMethodOther(e.target.value)}
                placeholder="e.g. Wise, Venmo"
              />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={
              submitting ||
              !paidDate.trim() ||
              !paymentMethod ||
              (paymentMethod === 'other' && !paymentMethodOther.trim())
            }
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Mark as paid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
