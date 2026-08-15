import type {
  AgingBucket,
  ClearingReconciliation,
  DisbursementCase,
  DisbursementMode,
  JournalLine,
  SubledgerLine,
} from '@/lib/types';

const NAMES: Record<string, { en: string; ar: string }> = {
  '122100': { en: 'Clearing receivable 122100', ar: 'ذمم تسوية 122100' },
  '222100': { en: 'Clearing prepay 222100', ar: 'دفعات مقدمة تسوية 222100' },
  '111000': { en: 'Cash / bank 111000 (map to 112000 operating)', ar: 'صندوق / بنك 111000 (يُربط بـ 112000 التشغيلي)' },
  '411100': { en: 'Agency revenue 411100', ar: 'إيراد تخليص 411100' },
};

function line(
  account: JournalLine['account'],
  debit: number,
  credit: number,
  memoEn: string,
  memoAr: string,
): JournalLine {
  const n = NAMES[account] ?? { en: account, ar: account };
  return {
    account,
    accountNameEn: n.en,
    accountNameAr: n.ar,
    debit: round2(debit),
    credit: round2(credit),
    memoEn,
    memoAr,
  };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function passThroughTotal(duties: number, portFees: number, otherGov: number): number {
  return round2(Math.max(0, duties) + Math.max(0, portFees) + Math.max(0, otherGov));
}

export type JournalStage = 'payout' | 'settle' | 'full';

/**
 * Build illustrative journal lines for a disbursement file.
 * Optional prepayAmount for client_prepay true-up (estimate received vs actual pass-through).
 */
export function buildJournal(params: {
  mode: DisbursementMode;
  duties: number;
  portFees: number;
  otherGov: number;
  agencyFee: number;
  stage?: JournalStage;
  /** Client prepayment received (defaults to actual pass-through if omitted) */
  prepayAmount?: number;
}): {
  lines: JournalLine[];
  passThrough: number;
  revenue: number;
  prepay: number;
  trueUp: number;
  balanced: boolean;
} {
  const stage = params.stage ?? 'full';
  const passThrough = passThroughTotal(params.duties, params.portFees, params.otherGov);
  const fee = round2(Math.max(0, params.agencyFee));
  const prepay =
    params.mode === 'client_prepay'
      ? round2(params.prepayAmount != null ? Math.max(0, params.prepayAmount) : passThrough)
      : 0;
  const trueUp = params.mode === 'client_prepay' ? round2(passThrough - prepay) : 0;
  const lines: JournalLine[] = [];

  if (params.mode === 'pay_first') {
    if (stage === 'payout' || stage === 'full') {
      if (passThrough > 0) {
        lines.push(
          line('122100', passThrough, 0, 'Duties/port/gov paid on behalf of client', 'رسوم/ميناء/جهات مدفوعة نيابة عن العميل'),
          line('111000', 0, passThrough, 'Bank payment to Customs / terminal / authorities', 'دفع بنكي للجمارك / المحطة / الجهات'),
        );
      }
    }
    if (stage === 'settle' || stage === 'full') {
      if (passThrough > 0) {
        lines.push(
          line('111000', passThrough, 0, 'Client reimbursement of disbursements', 'استرداد المدفوعات من العميل'),
          line('122100', 0, passThrough, 'Clear receivable 122100', 'إقفال ذمة 122100'),
        );
      }
      if (fee > 0) {
        lines.push(
          line('111000', fee, 0, 'Agency fee collected', 'تحصيل أتعاب التخليص'),
          line('411100', 0, fee, 'Agency clearance revenue', 'إيراد خدمة التخليص'),
        );
      }
    }
  } else {
    if (stage === 'payout' || stage === 'full') {
      if (prepay > 0) {
        lines.push(
          line('111000', prepay, 0, 'Client prepayment received', 'استلام دفعة مقدمة من العميل'),
          line('222100', 0, prepay, 'Liability for client funds 222100', 'التزام بأموال العميل 222100'),
        );
      }
      if (passThrough > 0) {
        lines.push(
          line('222100', Math.min(prepay, passThrough), 0, 'Apply prepay to actual charges', 'تطبيق المقدمة على الرسوم الفعلية'),
          line('111000', 0, passThrough, 'Bank payment of actual charges', 'دفع بنكي للرسوم الفعلية'),
        );
        // If actual > prepay: remainder is company receivable-style hit — use 122100 for shortfall
        if (trueUp > 0) {
          lines.push(
            line('122100', trueUp, 0, 'Shortfall: actual charges above prepay', 'عجز: الرسوم الفعلية أعلى من المقدمة'),
            // already credited bank for full passThrough above; need offset:
            // We credited bank passThrough but only debited 222100 for prepay — the trueUp debit to 122100 balances.
          );
        }
        // If prepay > actual: refund liability
        if (trueUp < 0) {
          const refund = Math.abs(trueUp);
          lines.push(
            line('222100', refund, 0, 'Release excess prepay (to refund client)', 'تحرير فائض المقدمة (للرد للعميل)'),
            line('111000', 0, refund, 'Refund excess to client', 'رد الفائض للعميل'),
          );
        }
      }
    }
    if ((stage === 'settle' || stage === 'full') && fee > 0) {
      lines.push(
        line('111000', fee, 0, 'Agency fee collected', 'تحصيل أتعاب التخليص'),
        line('411100', 0, fee, 'Agency clearance revenue', 'إيراد خدمة التخليص'),
      );
    }
    // Settle shortfall recovery
    if ((stage === 'settle' || stage === 'full') && trueUp > 0) {
      lines.push(
        line('111000', trueUp, 0, 'Client pays shortfall', 'العميل يسدد العجز'),
        line('122100', 0, trueUp, 'Clear shortfall receivable', 'إقفال ذمة العجز'),
      );
    }
  }

  const debits = lines.reduce((s, l) => s + l.debit, 0);
  const credits = lines.reduce((s, l) => s + l.credit, 0);
  return {
    lines,
    passThrough,
    revenue: fee,
    prepay,
    trueUp,
    balanced: round2(debits) === round2(credits),
  };
}

/** Portfolio metrics from demo/open cases */
export function portfolioMetrics(cases: DisbursementCase[]) {
  let openReceivable = 0;
  let openPrepayLiability = 0;
  let recognizedRevenue = 0;
  let passThroughVolume = 0;

  for (const c of cases) {
    const pt = passThroughTotal(c.duties, c.portFees, c.otherGovCharges);
    passThroughVolume = round2(passThroughVolume + pt);
    if (c.status === 'closed' || c.status === 'recovered') {
      recognizedRevenue = round2(recognizedRevenue + c.agencyFee);
    }
    const { account, openBalance } = fileClearingBalance(c);
    if (account === '122100') openReceivable = round2(openReceivable + openBalance);
    if (account === '222100') openPrepayLiability = round2(openPrepayLiability + openBalance);
  }

  return {
    openReceivable,
    openPrepayLiability,
    recognizedRevenue,
    passThroughVolume,
    caseCount: cases.length,
    openCount: cases.filter((c) => c.status === 'open').length,
  };
}

export function clientStatementLines(c: DisbursementCase): {
  labelEn: string;
  labelAr: string;
  amount: number;
  kind: 'passthrough' | 'fee' | 'total';
}[] {
  const pt = passThroughTotal(c.duties, c.portFees, c.otherGovCharges);
  return [
    { labelEn: 'Customs duties', labelAr: 'الرسوم الجمركية', amount: c.duties, kind: 'passthrough' },
    { labelEn: 'Port / ACT fees', labelAr: 'أجور ميناء / ACT', amount: c.portFees, kind: 'passthrough' },
    { labelEn: 'Other government charges', labelAr: 'رسوم حكومية أخرى', amount: c.otherGovCharges, kind: 'passthrough' },
    { labelEn: 'Pass-through subtotal', labelAr: 'مجموع الممرَّر', amount: pt, kind: 'passthrough' },
    { labelEn: 'Agency clearance fee', labelAr: 'أتعاب التخليص', amount: c.agencyFee, kind: 'fee' },
    { labelEn: 'Total due from client', labelAr: 'الإجمالي المستحق على العميل', amount: round2(pt + c.agencyFee), kind: 'total' },
  ];
}

export function formatJod(n: number, locale: 'en' | 'ar'): string {
  const v = round2(n);
  const num = v.toLocaleString(locale === 'ar' ? 'ar-JO' : 'en-JO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return locale === 'ar' ? `${num} د.أ` : `JOD ${num}`;
}


function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function daysBetween(from: string, to: string): number {
  const a = parseISODate(from).getTime();
  const b = parseISODate(to).getTime();
  return Math.max(0, Math.floor((b - a) / 86_400_000));
}

export function agingBucket(days: number): AgingBucket {
  if (days <= 7) return '0-7';
  if (days <= 15) return '8-15';
  if (days <= 30) return '16-30';
  return '30+';
}

/**
 * Open clearing balance for one file (subledger grain = declaration).
 * Pay-first: remaining receivable on 122100.
 * Prepay: remaining liability on 222100 (unapplied prepay).
 */
export function fileClearingBalance(c: DisbursementCase): {
  account: '122100' | '222100' | null;
  openBalance: number;
} {
  const pt = passThroughTotal(c.duties, c.portFees, c.otherGovCharges);

  if (c.mode === 'pay_first') {
    if (c.status === 'closed' || c.status === 'recovered') {
      // fully recovered unless exception forces residual
      const recovered = c.recoveredPassThrough != null ? c.recoveredPassThrough : pt;
      const open = round2(Math.max(0, pt - recovered));
      return { account: open > 0 ? '122100' : null, openBalance: open };
    }
    const recovered = c.recoveredPassThrough ?? 0;
    const open = round2(Math.max(0, pt - recovered));
    return { account: open > 0 ? '122100' : null, openBalance: open };
  }

  // client_prepay
  const prepay = round2(c.prepayReceived != null ? c.prepayReceived : pt);
  if (c.status === 'closed' || c.status === 'recovered') {
    const applied = c.appliedPassThrough != null ? c.appliedPassThrough : Math.min(prepay, pt);
    // remaining liability = prepay - applied - refunds; simplified:
    const open = round2(Math.max(0, prepay - applied));
    return { account: open > 0 ? '222100' : null, openBalance: open };
  }
  const applied = c.appliedPassThrough ?? 0;
  const open = round2(Math.max(0, prepay - applied));
  return { account: open > 0 ? '222100' : null, openBalance: open };
}

/**
 * Build file-level subledger + GL tie-out + aging + exceptions.
 * glAdjustments: optional manual reconciling items already in GL but not in files (demo).
 */
export function buildClearingReconciliation(
  cases: DisbursementCase[],
  asOf: string,
  opts?: { glAdjust122100?: number; glAdjust222100?: number },
): ClearingReconciliation {
  const lines: SubledgerLine[] = [];

  for (const c of cases) {
    const { account, openBalance } = fileClearingBalance(c);
    if (!account || openBalance <= 0) {
      // still surface exceptions on zero-balance closed files
      if (c.exceptionEn) {
        const last = c.lastMovementAt || c.createdAt;
        const days = daysBetween(last, asOf);
        lines.push({
          caseId: c.id,
          declarationNo: c.declarationNo,
          clientNameEn: c.clientNameEn,
          clientNameAr: c.clientNameAr,
          account: c.mode === 'pay_first' ? '122100' : '222100',
          openBalance: 0,
          signedBalance: 0,
          agingDays: days,
          agingBucket: agingBucket(days),
          status: c.status,
          lastMovementAt: last,
          exceptionEn: c.exceptionEn,
          exceptionAr: c.exceptionAr,
        });
      }
      continue;
    }

    const last = c.lastMovementAt || c.createdAt;
    const days = daysBetween(last, asOf);
    const signed = account === '122100' ? openBalance : -openBalance;
    lines.push({
      caseId: c.id,
      declarationNo: c.declarationNo,
      clientNameEn: c.clientNameEn,
      clientNameAr: c.clientNameAr,
      account,
      openBalance,
      signedBalance: signed,
      agingDays: days,
      agingBucket: agingBucket(days),
      status: c.status,
      lastMovementAt: last,
      exceptionEn: c.exceptionEn,
      exceptionAr: c.exceptionAr,
    });
  }

  const subledger122100 = round2(
    lines.filter((l) => l.account === '122100').reduce((s, l) => s + l.openBalance, 0),
  );
  const subledger222100 = round2(
    lines.filter((l) => l.account === '222100').reduce((s, l) => s + l.openBalance, 0),
  );

  // Demo GL = subledger + optional known timing differences
  const gl122100 = round2(subledger122100 + (opts?.glAdjust122100 ?? 0));
  const gl222100 = round2(subledger222100 + (opts?.glAdjust222100 ?? 0));
  const diff122100 = round2(gl122100 - subledger122100);
  const diff222100 = round2(gl222100 - subledger222100);

  const emptyBucket = () => ({ count: 0, amount122100: 0, amount222100: 0 });
  const aging: ClearingReconciliation['aging'] = {
    '0-7': emptyBucket(),
    '8-15': emptyBucket(),
    '16-30': emptyBucket(),
    '30+': emptyBucket(),
  };
  for (const l of lines) {
    if (l.openBalance <= 0) continue;
    const b = aging[l.agingBucket];
    b.count += 1;
    if (l.account === '122100') b.amount122100 = round2(b.amount122100 + l.openBalance);
    else b.amount222100 = round2(b.amount222100 + l.openBalance);
  }

  const exceptions = lines.filter(
    (l) =>
      !!l.exceptionEn ||
      (l.openBalance > 0 && l.agingBucket === '30+') ||
      (l.status !== 'open' && l.openBalance > 0),
  );

  return {
    asOf,
    lines: lines.sort((a, b) => b.agingDays - a.agingDays),
    subledger122100,
    subledger222100,
    gl122100,
    gl222100,
    diff122100,
    diff222100,
    tiedOut: diff122100 === 0 && diff222100 === 0,
    aging,
    exceptions,
  };
}
