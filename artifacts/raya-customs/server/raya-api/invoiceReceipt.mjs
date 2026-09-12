import { Buffer } from 'node:buffer';

function safeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/[\\()]/g, (character) => `\\${character}`);
}

function money(value, currency = 'JOD') {
  return `${currency} ${Number(value || 0).toFixed(2)}`;
}

function wrap(value, max = 82) {
  const text = String(value || '');
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function pdfTextLines(lines) {
  const commands = ['BT', '/F1 20 Tf', '50 790 Td', `(${safeText(lines.shift())}) Tj`, '/F1 10 Tf', '0 -28 Td'];
  for (const line of lines) {
    commands.push(`(${safeText(line)}) Tj`, '0 -16 Td');
  }
  commands.push('ET');
  return commands.join('\n');
}

/** Build a dependency-free, single-page receipt PDF using standard Helvetica. */
export function buildInvoicePaymentReceiptPdf({ invoice, payment }) {
  const balanceDue = Number(invoice.balanceDue ?? invoice.total ?? 0);
  const paidAmount = Number(invoice.paidAmount ?? 0);
  const status = balanceDue <= 0.005 ? 'PAID IN FULL' : 'PAYMENT RECEIVED';
  const receiptNumber = `RCP-${String(payment.id).slice(0, 8).toUpperCase()}`;
  const client = invoice.payload?.clientNameEn || invoice.payload?.clientNameAr || 'Client';
  const declaration = invoice.payload?.declarationNo || invoice.disbursementId || '-';
  const lines = [
    'RAYA JORDAN CUSTOMS',
    'PAYMENT RECEIPT',
    '',
    `Receipt number: ${receiptNumber}`,
    `Payment date: ${payment.receivedAt || '-'}`,
    `Invoice: ${invoice.invoiceNumber || '-'}`,
    `Client: ${client}`,
    `Declaration: ${declaration}`,
    '',
    `Status: ${status}`,
    `Payment amount: ${money(payment.amount, payment.currency || invoice.currency)}`,
    `Invoice total: ${money(invoice.total, invoice.currency)}`,
    `Paid to date: ${money(paidAmount, invoice.currency)}`,
    `Balance due: ${money(balanceDue, invoice.currency)}`,
    '',
    `Reference: ${payment.reference || 'Not provided'}`,
    ...wrap(`Note: ${payment.note || 'No additional note'}`),
    '',
    'This receipt confirms the payment recorded in the Raya accounting ledger.',
    'Customs and government charges are pass-through amounts; GST applies to the agency fee only.',
    `Generated: ${new Date().toISOString()}`,
  ];

  const content = pdfTextLines(lines);
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content, 'ascii')} >>\nstream\n${content}\nendstream`,
  ];
  const chunks = ['%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'];
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(chunks.join(''), 'binary'));
    chunks.push(`${index + 1} 0 obj\n${objects[index]}\nendobj\n`);
  }
  const xrefOffset = Buffer.byteLength(chunks.join(''), 'binary');
  chunks.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (let index = 1; index < offsets.length; index += 1) {
    chunks.push(`${String(offsets[index]).padStart(10, '0')} 00000 n \n`);
  }
  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
  return Buffer.from(chunks.join(''), 'binary');
}
