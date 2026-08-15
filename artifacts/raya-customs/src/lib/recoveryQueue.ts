import type { DisbursementCase } from '@/lib/types';
import { passThroughTotal, round2 } from '@/lib/disbursementCalc';
import { allDisbursements } from '@/lib/recordStore';

export interface RecoveryItem {
  id: string;
  declarationNo: string;
  clientNameEn: string;
  clientNameAr: string;
  mode: DisbursementCase['mode'];
  openAmount: number;
  account: '122100' | '222100' | 'none';
  priority: 'high' | 'normal';
  noteEn: string;
  noteAr: string;
}

/** Open clearing exposure for chase / recovery board. */
export function buildRecoveryQueue(cases: DisbursementCase[] = allDisbursements()): RecoveryItem[] {
  const items: RecoveryItem[] = [];
  for (const c of cases) {
    const pt = passThroughTotal(c.duties, c.portFees, c.otherGovCharges);
    if (c.mode === 'pay_first') {
      const recovered = Math.min(c.recoveredPassThrough ?? 0, pt);
      const passThroughOpen = round2(Math.max(0, pt - recovered));
      // A closed case has already settled its agency fee; retain only a documented clearing residual.
      const agencyFeeOpen = c.status === 'closed' ? 0 : c.agencyFee;
      const openAmount = round2(passThroughOpen + agencyFeeOpen);
      if (openAmount > 0 && (c.status !== 'closed' || c.exceptionEn)) {
        items.push({
          id: c.id,
          declarationNo: c.declarationNo,
          clientNameEn: c.clientNameEn,
          clientNameAr: c.clientNameAr,
          mode: c.mode,
          openAmount,
          account: '122100',
          priority: c.exceptionEn || openAmount >= 1000 ? 'high' : 'normal',
          noteEn: c.exceptionEn || 'Pay-first: recover the remaining duties and agency fee from the client (122100 → cash).',
          noteAr: c.exceptionAr || 'دفع أولاً: استرد الرسوم والأتعاب المتبقية من العميل (122100 → نقد).',
        });
      }
    } else {
      const applied = Math.min(c.prepayReceived || 0, pt);
      const shortfall = round2(pt - applied);
      if (shortfall > 0) {
        items.push({
          id: c.id,
          declarationNo: c.declarationNo,
          clientNameEn: c.clientNameEn,
          clientNameAr: c.clientNameAr,
          mode: c.mode,
          openAmount: shortfall,
          account: '222100',
          priority: shortfall >= 500 ? 'high' : 'normal',
          noteEn: 'Prepay shortfall still due from client.',
          noteAr: 'عجز المقدمة ما زال مستحقاً على العميل.',
        });
      }
    }
  }
  return items.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1;
    return b.openAmount - a.openAmount;
  });
}