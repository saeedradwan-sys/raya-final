/**
 * Server-side accounting rules for disbursement files.
 * Mirrors src/lib/disbursementCalc.ts and src/lib/recoveryQueue.ts — the
 * server is the source of truth; the client falls back to its local copy
 * only when the API is unreachable (local development without login).
 */

const NAMES = {
  '122100': { en: 'Clearing receivable 122100', ar: 'ذمم تسوية 122100' },
  '222100': { en: 'Clearing prepay 222100', ar: 'دفعات مقدمة تسوية 222100' },
  '111000': { en: 'Cash / bank 111000 (map to 112000 operating)', ar: 'صندوق / بنك 111000 (يُربط بـ 112000 التشغيلي)' },
  '411100': { en: 'Agency revenue 411100', ar: 'إيراد تخليص 411100' },
};

export function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

export function passThroughTotal(duties, portFees, otherGov) {
  return round2(Math.max(0, Number(duties) || 0) + Math.max(0, Number(portFees) || 0) + Math.max(0, Number(otherGov) || 0));
}

function line(account, debit, credit, memoEn, memoAr) {
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

export function buildJournal(params) {
  const stage = params.stage ?? 'full';
  const passThrough = passThroughTotal(params.duties, params.portFees, params.otherGov);
  const fee = round2(Math.max(0, Number(params.agencyFee) || 0));
  const prepay =
    params.mode === 'client_prepay'
      ? round2(params.prepayAmount != null ? Math.max(0, Number(params.prepayAmount) || 0) : passThrough)
      : 0;
  const trueUp = params.mode === 'client_prepay' ? round2(passThrough - prepay) : 0;
  const lines = [];

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
        if (trueUp > 0) {
          lines.push(
            line('122100', trueUp, 0, 'Shortfall: actual charges above prepay', 'عجز: الرسوم الفعلية أعلى من المقدمة'),
          );
        }
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

export function fileClearingBalance(c) {
  const pt = passThroughTotal(c.duties, c.portFees, c.otherGovCharges);

  if (c.mode === 'pay_first') {
    const recovered =
      c.status === 'closed' || c.status === 'recovered'
        ? (c.recoveredPassThrough != null ? c.recoveredPassThrough : pt)
        : (c.recoveredPassThrough ?? 0);
    const open = round2(Math.max(0, pt - recovered));
    return { account: open > 0 ? '122100' : null, openBalance: open };
  }

  const prepay = round2(c.prepayReceived != null ? c.prepayReceived : pt);
  const applied =
    c.status === 'closed' || c.status === 'recovered'
      ? (c.appliedPassThrough != null ? c.appliedPassThrough : Math.min(prepay, pt))
      : (c.appliedPassThrough ?? 0);
  const open = round2(Math.max(0, prepay - applied));
  return { account: open > 0 ? '222100' : null, openBalance: open };
}

export function portfolioMetrics(cases) {
  let openReceivable = 0;
  let openPrepayLiability = 0;
  let recognizedRevenue = 0;
  let passThroughVolume = 0;

  for (const c of cases) {
    const pt = passThroughTotal(c.duties, c.portFees, c.otherGovCharges);
    passThroughVolume = round2(passThroughVolume + pt);
    if (c.status === 'closed' || c.status === 'recovered') {
      recognizedRevenue = round2(recognizedRevenue + (Number(c.agencyFee) || 0));
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

export function clientStatementLines(c) {
  const pt = passThroughTotal(c.duties, c.portFees, c.otherGovCharges);
  return [
    { labelEn: 'Customs duties', labelAr: 'الرسوم الجمركية', amount: round2(c.duties), kind: 'passthrough' },
    { labelEn: 'Port / ACT fees', labelAr: 'أجور ميناء / ACT', amount: round2(c.portFees), kind: 'passthrough' },
    { labelEn: 'Other government charges', labelAr: 'رسوم حكومية أخرى', amount: round2(c.otherGovCharges), kind: 'passthrough' },
    { labelEn: 'Pass-through subtotal', labelAr: 'مجموع الممرَّر', amount: pt, kind: 'passthrough' },
    { labelEn: 'Agency clearance fee', labelAr: 'أتعاب التخليص', amount: round2(c.agencyFee), kind: 'fee' },
    { labelEn: 'Total due from client', labelAr: 'الإجمالي المستحق على العميل', amount: round2(pt + (Number(c.agencyFee) || 0)), kind: 'total' },
  ];
}

function parseISODate(s) {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function daysBetween(from, to) {
  const a = parseISODate(from).getTime();
  const b = parseISODate(to).getTime();
  return Math.max(0, Math.floor((b - a) / 86_400_000));
}

export function agingBucket(days) {
  if (days <= 7) return '0-7';
  if (days <= 15) return '8-15';
  if (days <= 30) return '16-30';
  return '30+';
}

export function buildClearingReconciliation(cases, asOf, opts) {
  const lines = [];

  for (const c of cases) {
    const { account, openBalance } = fileClearingBalance(c);
    if (!account || openBalance <= 0) {
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

  const gl122100 = round2(subledger122100 + (opts?.glAdjust122100 ?? 0));
  const gl222100 = round2(subledger222100 + (opts?.glAdjust222100 ?? 0));
  const diff122100 = round2(gl122100 - subledger122100);
  const diff222100 = round2(gl222100 - subledger222100);

  const emptyBucket = () => ({ count: 0, amount122100: 0, amount222100: 0 });
  const aging = {
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

export function buildRecoveryQueue(cases) {
  const items = [];
  for (const c of cases) {
    const pt = passThroughTotal(c.duties, c.portFees, c.otherGovCharges);
    if (c.mode === 'pay_first') {
      const recovered = Math.min(c.recoveredPassThrough ?? 0, pt);
      const passThroughOpen = round2(Math.max(0, pt - recovered));
      const agencyFeeOpen = c.status === 'closed' ? 0 : (Number(c.agencyFee) || 0);
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

/** Jordan GST default rate on agency clearance fees. */
export const DEFAULT_GST_RATE = 0.16;

/**
 * Period GST/tax summary fed by persisted journal entries so the report
 * always matches posted journal figures. Pass-through amounts are shown as
 * non-taxable; GST applies to the agency fee revenue only.
 */
export function buildGstReport(journalEntries, from, to, rate = DEFAULT_GST_RATE) {
  const inPeriod = journalEntries.filter((e) => {
    const day = String(e.createdAt || '').slice(0, 10);
    return day >= from && day <= to;
  });
  // A case can have entries persisted per stage (full / payout / settle).
  // Count each disbursement once: prefer the full-cycle entry, else the
  // settlement entry, else the payout entry — never sum stages together.
  const STAGE_PRIORITY = { full: 0, settle: 1, payout: 2 };
  const byCase = new Map();
  for (const e of inPeriod) {
    const prev = byCase.get(e.disbursementId);
    if (!prev || (STAGE_PRIORITY[e.stage] ?? 9) < (STAGE_PRIORITY[prev.stage] ?? 9)) {
      byCase.set(e.disbursementId, e);
    }
  }
  const rows = [...byCase.values()].map((e) => {
    // Revenue is recognized at settlement, not at payout: a payout-only
    // entry contributes pass-through exposure but no taxable fee yet.
    const feeRevenue = e.stage === 'payout' ? 0 : round2(e.revenue);
    return {
      disbursementId: e.disbursementId,
      stage: e.stage,
      postedAt: String(e.createdAt || '').slice(0, 10),
      passThrough: round2(e.passThrough),
      feeRevenue,
      gstOnFee: round2(feeRevenue * rate),
    };
  });
  const feeRevenue = round2(rows.reduce((s, r) => s + r.feeRevenue, 0));
  const passThrough = round2(rows.reduce((s, r) => s + r.passThrough, 0));
  const gstCollectible = round2(rows.reduce((s, r) => s + r.gstOnFee, 0));
  return {
    from,
    to,
    rate,
    entryCount: rows.length,
    feeRevenue,
    passThrough,
    gstCollectible,
    grossTaxable: round2(feeRevenue + gstCollectible),
    rows: rows.sort((a, b) => (a.postedAt < b.postedAt ? 1 : -1)),
  };
}
