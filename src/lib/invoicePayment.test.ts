import { describe, expect, it } from 'vitest';
import {
  buildReceiptEmailMessage,
  formatInvoicePaymentMethod,
  paidDateInputToIso,
  resolvePaymentMethodForSave,
} from './invoicePayment';

describe('invoicePayment', () => {
  it('formats stored payment methods', () => {
    expect(formatInvoicePaymentMethod('bank_transfer')).toBe('Bank transfer');
    expect(formatInvoicePaymentMethod('other: Wise')).toBe('Wise');
  });

  it('resolves other payment method for save', () => {
    expect(resolvePaymentMethodForSave('card')).toBe('card');
    expect(resolvePaymentMethodForSave('other', 'Venmo')).toBe('other: Venmo');
  });

  it('converts date input to ISO', () => {
    expect(paidDateInputToIso('2026-05-29')).toContain('2026-05-29');
  });

  it('builds receipt email with payment details', () => {
    const message = buildReceiptEmailMessage({
      totalFormatted: '$100.00',
      paidDateDisplay: '29/05/2026',
      paymentMethodDisplay: 'Bank transfer',
    });
    expect(message).toContain('Payment date: 29/05/2026');
    expect(message).toContain('Payment method: Bank transfer');
  });
});
