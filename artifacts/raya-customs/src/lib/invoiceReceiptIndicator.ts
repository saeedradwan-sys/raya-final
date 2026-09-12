export interface ReceiptAwareInvoice {
  payments?: Array<{ id: string }>;
}

export function invoiceHasGeneratedReceipt(invoice: ReceiptAwareInvoice): boolean {
  return Array.isArray(invoice.payments) && invoice.payments.length > 0;
}

export function receiptIndicatorLabel(
  invoice: ReceiptAwareInvoice,
  locale: 'en' | 'ar',
) {
  const ready = invoiceHasGeneratedReceipt(invoice);
  if (ready) {
    const count = invoice.payments!.length;
    return {
      ready: true,
      label: locale === 'ar' ? 'الإيصال متاح' : 'Receipt ready',
      detail: locale === 'ar' ? `يتوفر ${count} إيصال دفع` : `${count} receipt(s) available`,
    };
  }
  return {
    ready: false,
    label: locale === 'ar' ? 'لا يوجد إيصال' : 'No receipt',
    detail: locale === 'ar' ? 'سجّل دفعة لإنشاء إيصال' : 'Record a payment to generate a receipt',
  };
}
