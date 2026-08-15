import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator,
  BookOpen,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Scale,
  Wallet,
  FileSpreadsheet,
  Info,
} from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';
import { ui } from '@/content/uiLabels';
import {
  ACCOUNTING_PRINCIPLE,
  DOUBLE_ENTRY,
  CHART_INTRO,
  CHART_ACCOUNTS,
  FLOW_STEPS,
  GST_NOTE,
} from '@/content/accounting';
import {
  buildJournal,
  buildClearingReconciliation,
  clientStatementLines,
  formatJod,
  passThroughTotal,
  portfolioMetrics,
  round2,
  type JournalStage,
} from '@/lib/disbursementCalc';
import type { DisbursementCase, DisbursementMode } from '@/lib/types';
import SectionNav from '@/components/SectionNav';
import { allDisbursements } from '@/lib/recordStore';
import { clearingReconToCsv, clientStatementToCsv, downloadTextFile } from '@/lib/exportCsv';
import { buildRecoveryQueue } from '@/lib/recoveryQueue';
import { appendAudit } from '@/lib/auditLog';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { staffHasPermission } from '@/lib/staffAuth';
import { TERMS } from '@/content/terminology';

const ACCOUNT_TYPE_LABEL: Record<string, { en: string; ar: string }> = {
  asset: { en: 'Asset', ar: 'أصل' },
  liability: { en: 'Liability', ar: 'التزام' },
  equity: { en: 'Equity', ar: 'حقوق ملكية' },
  revenue: { en: 'Revenue', ar: 'إيراد' },
  expense: { en: 'Expense', ar: 'مصروف' },
};

export default function StaffAccountingPage() {
  const { locale } = useLocale();
  const { session } = useStaffAuth();
  const [mode, setMode] = useState<DisbursementMode>('pay_first');
  const [stage, setStage] = useState<JournalStage>('full');
  const [duties, setDuties] = useState(1500);
  const [portFees, setPortFees] = useState(350);
  const [otherGov, setOtherGov] = useState(50);
  const [agencyFee, setAgencyFee] = useState(150);
  const [prepayAmount, setPrepayAmount] = useState(1800);
  const [statementId, setStatementId] = useState(() => allDisbursements()[0]?.id ?? '');

  const cases = useMemo(() => allDisbursements(), []);
  const metrics = useMemo(() => portfolioMetrics(cases), [cases]);
  /** as-of = today demo; optional GL timing difference on 122100 for teaching */
  const recon = useMemo(
    () =>
      buildClearingReconciliation(cases, '2026-07-25', {
        glAdjust122100: 50, // timing: bank paid, journal lag (demo reconciling item)
      }),
    [cases],
  );
  const accountingDenied = !staffHasPermission(session, 'clearing:read');

  const sim = useMemo(
    () =>
      buildJournal({
        mode,
        duties,
        portFees,
        otherGov,
        agencyFee,
        stage,
        prepayAmount: mode === 'client_prepay' ? prepayAmount : undefined,
      }),
    [mode, duties, portFees, otherGov, agencyFee, stage, prepayAmount],
  );

  const passThrough = passThroughTotal(duties, portFees, otherGov);
  const wrongRevenue = round2(passThrough + agencyFee);
  const correctRevenue = round2(agencyFee);

  const statementCase: DisbursementCase | undefined =
    cases.find((d) => d.id === statementId) ?? cases[0];
  const statementLines = statementCase ? clientStatementLines(statementCase) : [];

  if (accountingDenied) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-muted text-sm mb-4">
          {t(
            locale,
            'Accounting workspace is limited to staff and accounting roles.',
            'مساحة المحاسبة مقتصرة على أدوار الموظفين والمحاسبة.',
          )}
        </p>
        <Link to="/staff" className="text-accent text-sm hover:underline">
          {t(locale, 'Back to staff', 'العودة للموظفين')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 lg:px-8 py-12">
      <Link
        to="/staff"
        className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-white mb-6"
      >
        <ArrowLeft size={14} className={locale === 'ar' ? 'rotate-180' : ''} />
        {t(locale, 'Staff workspace', 'مساحة الموظفين')}
      </Link>

      <div className="max-w-3xl mb-8">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-navy-700 text-accent mb-4">
          <Calculator size={22} />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
          {t(locale, 'Disbursement accounting', 'محاسبة المدفوعات')}
        </h1>
        <p className="text-muted text-sm leading-relaxed">
          {t(
            locale,
            'Clearing accounts, journal simulator with prepay true-up, portfolio KPIs, and client recovery statements.',
            'حسابات التسوية، محاكي قيود مع تسوية المقدمة، مؤشرات المحفظة، وكشوف استرداد العميل.',
          )}
        </p>
      </div>

      <SectionNav
        items={[
          { id: 'sec-kpi', labelEn: 'KPIs', labelAr: 'المؤشرات' },
          { id: 'sec-double', labelEn: 'Double-entry', labelAr: 'القيد المزدوج' },
          { id: 'sec-coa', labelEn: 'Accounts', labelAr: 'الحسابات' },
          { id: 'sec-flows', labelEn: 'Flows', labelAr: 'التدفقات' },
          { id: 'sec-journal', labelEn: 'Journal', labelAr: 'القيود' },
          { id: 'sec-recovery', labelEn: 'Recovery', labelAr: 'الاسترداد' },
          { id: 'sec-statement', labelEn: 'Statement', labelAr: 'الكشف' },
          { id: 'sec-files', labelEn: 'Files', labelAr: 'الملفات' },
          { id: 'sec-recon', labelEn: 'Reconciliation', labelAr: 'المطابقة' },
          { id: 'sec-acct-terms', labelEn: 'Terms', labelAr: 'المصطلحات' },
        ]}
      />

      {/* KPI strip */}
      <div id="sec-kpi" className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        <div className="rounded-xl bg-elevated border border-subtle p-4">
          <p className="text-[11px] text-dim mb-1 flex items-center gap-1">
            <Wallet size={12} /> {t(locale, 'Open 122100 receivable', 'ذمم 122100 المفتوحة')}
          </p>
          <p className="text-lg font-semibold text-amber-300 font-mono">
            {formatJod(metrics.openReceivable, locale)}
          </p>
        </div>
        <div className="rounded-xl bg-elevated border border-subtle p-4">
          <p className="text-[11px] text-dim mb-1">
            {t(locale, 'Open 222100 prepay liability', 'التزام مقدم 222100')}
          </p>
          <p className="text-lg font-semibold text-sky-300 font-mono">
            {formatJod(metrics.openPrepayLiability, locale)}
          </p>
        </div>
        <div className="rounded-xl bg-elevated border border-subtle p-4">
          <p className="text-[11px] text-dim mb-1">
            {t(locale, 'Recognized fee revenue', 'إيراد أتعاب معترف به')}
          </p>
          <p className="text-lg font-semibold text-success font-mono">
            {formatJod(metrics.recognizedRevenue, locale)}
          </p>
        </div>
        <div className="rounded-xl bg-elevated border border-subtle p-4">
          <p className="text-[11px] text-dim mb-1">
            {t(locale, 'Pass-through volume', 'حجم الممرَّر')}
          </p>
          <p className="text-lg font-semibold text-white font-mono">
            {formatJod(metrics.passThroughVolume, locale)}
          </p>
          <p className="text-[10px] text-dim mt-0.5">
            {metrics.openCount}/{metrics.caseCount} {t(locale, 'files open', 'ملفات مفتوحة')}
          </p>
        </div>
      </div>

      {/* Principle */}
      <div className="rounded-xl border border-warning/30 bg-warning/5 p-5 mb-6">
        <div className="flex items-start gap-3">
          <Scale size={18} className="text-warning shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-semibold text-warning mb-1">
              {t(locale, ACCOUNTING_PRINCIPLE.titleEn, ACCOUNTING_PRINCIPLE.titleAr)}
            </h2>
            <p className="text-xs text-muted leading-relaxed">
              {t(locale, ACCOUNTING_PRINCIPLE.bodyEn, ACCOUNTING_PRINCIPLE.bodyAr)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-subtle bg-elevated p-5 mb-10 flex items-start gap-3">
        <Info size={16} className="text-accent shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-white mb-1">
            {t(locale, GST_NOTE.titleEn, GST_NOTE.titleAr)}
          </h3>
          <p className="text-xs text-muted leading-relaxed">
            {t(locale, GST_NOTE.bodyEn, GST_NOTE.bodyAr)}
          </p>
        </div>
      </div>

      {/* Chart */}

      {/* Double-entry */}
      <div id="sec-double" className="mb-12">
        <h2 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
          {t(locale, DOUBLE_ENTRY.titleEn, DOUBLE_ENTRY.titleAr)}
        </h2>
        <p className="text-sm text-muted mb-4 max-w-3xl leading-relaxed prose-ar">
          {t(locale, DOUBLE_ENTRY.ruleEn, DOUBLE_ENTRY.ruleAr)}
        </p>
        <div className="rounded-xl bg-navy-900 border border-subtle p-4 mb-5">
          <p className="text-xs text-dim mb-1">{t(locale, 'Accounting equation', 'المعادلة المحاسبية')}</p>
          <p className="text-sm font-mono text-accent" dir="ltr">
            {locale === 'ar' ? DOUBLE_ENTRY.equationAr : DOUBLE_ENTRY.equationEn}
          </p>
          {locale === 'ar' && (
            <p className="text-xs text-muted mt-1 font-mono" dir="ltr">{DOUBLE_ENTRY.equationEn}</p>
          )}
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
          {DOUBLE_ENTRY.rules.map((r) => (
            <li key={r.en} className="text-xs text-muted rounded-lg bg-elevated border border-subtle px-3 py-2 leading-relaxed prose-ar">
              {t(locale, r.en, r.ar)}
            </li>
          ))}
        </ul>
        <h3 className="text-sm font-semibold text-white mb-3">
          {t(locale, 'Worked examples (Raya clearing)', 'أمثلة عملية (تسوية راية)')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {DOUBLE_ENTRY.examples.map((ex) => (
            <div key={ex.titleEn} className="rounded-xl bg-elevated border border-subtle p-4">
              <p className="text-xs font-semibold text-white mb-3">
                {t(locale, ex.titleEn, ex.titleAr)}
              </p>
              <ul className="space-y-1.5">
                {ex.lines.map((ln, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-accent" dir="ltr">{ln.account}</span>
                    <span className="text-muted flex-1 text-start">
                      {t(locale, ln.en, ln.ar)}
                    </span>
                    <span
                      className={
                        ln.side === 'debit'
                          ? 'text-amber-300 font-medium'
                          : 'text-sky-300 font-medium'
                      }
                    >
                      {ln.side === 'debit'
                        ? t(locale, 'Debit', 'مدين')
                        : t(locale, 'Credit', 'دائن')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-xs text-dim leading-relaxed prose-ar max-w-3xl">
          {t(locale, DOUBLE_ENTRY.pnlEn, DOUBLE_ENTRY.pnlAr)}
        </p>
      </div>

      <h2 id="sec-coa" className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
        {t(locale, CHART_INTRO.titleEn, CHART_INTRO.titleAr)}
      </h2>
      <p className="text-sm text-muted mb-4 max-w-3xl leading-relaxed prose-ar">
        {t(locale, CHART_INTRO.bodyEn, CHART_INTRO.bodyAr)}
      </p>
      <div className="overflow-x-auto rounded-xl border border-subtle mb-4 table-desktop-only">
        <table className="w-full text-sm min-w-[560px]" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
          <thead>
            <tr className={`bg-navy-800 text-dim text-[11px] ${locale === 'ar' ? '' : 'uppercase tracking-wider'}`}>
              <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'Code', 'الرمز')}</th>
              <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'Name', 'الاسم')}</th>
              <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'Type', 'النوع')}</th>
              <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'Role', 'الدور')}</th>
            </tr>
          </thead>
          <tbody>
            {CHART_ACCOUNTS.map((a) => (
              <tr key={a.code} className="border-t border-subtle">
                <td className="px-3 py-3 font-mono text-accent text-xs" dir="ltr">{a.code}</td>
                <td className="px-3 py-3 text-white text-xs">{t(locale, a.nameEn, a.nameAr)}</td>
                <td className="px-3 py-3 text-xs text-muted">
                  {t(
                    locale,
                    ACCOUNT_TYPE_LABEL[a.type]?.en ?? a.type,
                    ACCOUNT_TYPE_LABEL[a.type]?.ar ?? a.type,
                  )}
                </td>
                <td className="px-3 py-3 text-xs text-dim leading-relaxed max-w-md">
                  {t(locale, a.roleEn, a.roleAr)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="cards-mobile-only space-y-3 mb-12">
        {CHART_ACCOUNTS.map((a) => (
          <div key={a.code} className="rounded-xl bg-elevated border border-subtle p-4">
            <p className="font-mono text-accent text-xs mb-1" dir="ltr">{a.code}</p>
            <p className="text-sm text-white mb-1">{t(locale, a.nameEn, a.nameAr)}</p>
            <p className="text-[11px] text-muted mb-2">
              {t(
                locale,
                ACCOUNT_TYPE_LABEL[a.type]?.en ?? a.type,
                ACCOUNT_TYPE_LABEL[a.type]?.ar ?? a.type,
              )}
            </p>
            <p className="text-xs text-dim leading-relaxed">{t(locale, a.roleEn, a.roleAr)}</p>
          </div>
        ))}
      </div>

      {/* Flows */}
      <div id="sec-flows" className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
        {(['pay_first', 'client_prepay'] as const).map((key) => {
          const flow = FLOW_STEPS[key];
          const steps = locale === 'ar' ? flow.stepsAr : flow.stepsEn;
          return (
            <div key={key} className="rounded-xl bg-elevated border border-subtle p-5">
              <h3 className="text-sm font-semibold text-white mb-3">
                {t(locale, flow.titleEn, flow.titleAr)}
              </h3>
              <ol className="space-y-2">
                {steps.map((s) => (
                  <li key={s} className="text-xs text-muted leading-relaxed">
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>

      {/* Simulator */}
      <div id="sec-journal" className="rounded-xl bg-elevated border border-subtle p-6 mb-12">
        <div className="flex items-center gap-2 mb-5">
          <BookOpen size={18} className="text-accent" />
          <h2 className="text-base font-semibold text-white">
            {t(locale, 'Journal simulator', 'محاكي القيود')}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-[11px] text-dim mb-1">{t(locale, 'Mode', 'النمط')}</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as DisbursementMode)}
              className="w-full rounded-lg bg-navy-900 border border-subtle px-3 py-2 text-sm text-white"
            >
              <option value="pay_first">{t(locale, 'Pay-first (122100)', 'دفع أولاً (122100)')}</option>
              <option value="client_prepay">{t(locale, 'Client prepay (222100)', 'مقدم عميل (222100)')}</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-dim mb-1">{t(locale, 'Stage', 'المرحلة')}</label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as JournalStage)}
              className="w-full rounded-lg bg-navy-900 border border-subtle px-3 py-2 text-sm text-white"
            >
              <option value="full">{t(locale, 'Full cycle', 'دورة كاملة')}</option>
              <option value="payout">{t(locale, 'Payout only', 'الدفع فقط')}</option>
              <option value="settle">{t(locale, 'Settlement only', 'التسوية فقط')}</option>
            </select>
          </div>
          {mode === 'client_prepay' && (
            <div>
              <label className="block text-[11px] text-dim mb-1">
                {t(locale, 'Client prepay received', 'المقدمة المستلمة')}
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={prepayAmount}
                onChange={(e) => setPrepayAmount(Number(e.target.value) || 0)}
                className="w-full rounded-lg bg-navy-900 border border-subtle px-3 py-2 text-sm text-white font-mono"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {(
            [
              [duties, setDuties, 'Duties', 'الرسوم'],
              [portFees, setPortFees, 'Port / ACT', 'ميناء / ACT'],
              [otherGov, setOtherGov, 'Other gov', 'حكومي'],
              [agencyFee, setAgencyFee, 'Agency fee', 'أتعاب'],
            ] as const
          ).map(([val, set, en, ar], i) => (
            <div key={i}>
              <label className="block text-[11px] text-dim mb-1">{t(locale, en, ar)}</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={val}
                onChange={(e) => set(Number(e.target.value) || 0)}
                className="w-full rounded-lg bg-navy-900 border border-subtle px-3 py-2 text-sm text-white font-mono"
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="rounded-lg bg-navy-900 border border-subtle p-4">
            <p className="text-[11px] text-dim mb-1">{t(locale, 'Pass-through', 'ممرَّر')}</p>
            <p className="text-lg font-semibold text-white font-mono">{formatJod(sim.passThrough, locale)}</p>
          </div>
          <div className="rounded-lg bg-navy-900 border border-subtle p-4">
            <p className="text-[11px] text-dim mb-1">{t(locale, 'Revenue 411100', 'إيراد 411100')}</p>
            <p className="text-lg font-semibold text-success font-mono">{formatJod(sim.revenue, locale)}</p>
          </div>
          {mode === 'client_prepay' && (
            <div className="rounded-lg bg-navy-900 border border-subtle p-4">
              <p className="text-[11px] text-dim mb-1">{t(locale, 'True-up (actual − prepay)', 'التسوية (فعلي − مقدم)')}</p>
              <p
                className={`text-lg font-semibold font-mono ${
                  sim.trueUp > 0 ? 'text-amber-300' : sim.trueUp < 0 ? 'text-sky-300' : 'text-white'
                }`}
              >
                {formatJod(sim.trueUp, locale)}
              </p>
              <p className="text-[10px] text-dim mt-0.5">
                {sim.trueUp > 0
                  ? t(locale, 'Client owes shortfall', 'العميل عليه عجز')
                  : sim.trueUp < 0
                    ? t(locale, 'Refund excess prepay', 'رد فائض المقدمة')
                    : t(locale, 'Exact match', 'تطابق تام')}
              </p>
            </div>
          )}
          <div className="rounded-lg bg-navy-900 border border-subtle p-4">
            <p className="text-[11px] text-dim mb-1 flex items-center gap-1">
              <AlertTriangle size={12} className="text-warning" />
              {t(locale, 'Wrong “sales” total', 'إجمالي «مبيعات» خاطئ')}
            </p>
            <p className="text-lg font-semibold text-warning font-mono">{formatJod(wrongRevenue, locale)}</p>
            <p className="text-[10px] text-dim mt-0.5">
              {t(locale, 'Overstates by', 'يضخّم بمقدار')} {formatJod(passThrough, locale)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-subtle">
          <table className="w-full text-xs min-w-[520px]" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            <thead>
              <tr className="bg-navy-900 text-dim">
                <th className="text-start px-3 py-2 font-medium">{t(locale, 'Account', 'الحساب')}</th>
                <th className="text-start px-3 py-2 font-medium">{t(locale, 'Memo', 'البيان')}</th>
                <th className="text-end px-3 py-2 font-medium">{t(locale, 'Debit', 'مدين')}</th>
                <th className="text-end px-3 py-2 font-medium">{t(locale, 'Credit', 'دائن')}</th>
              </tr>
            </thead>
            <tbody>
              {sim.lines.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-dim">
                    {t(locale, 'Enter amounts to generate lines.', 'أدخل مبالغاً لتوليد القيود.')}
                  </td>
                </tr>
              ) : (
                sim.lines.map((l, i) => (
                  <tr key={`${l.account}-${i}`} className="border-t border-subtle">
                    <td className="px-3 py-2 font-mono text-accent">
                      <span dir="ltr">{l.account}</span>
                      <span className="block text-[10px] text-dim font-sans">
                        {t(locale, l.accountNameEn, l.accountNameAr)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted">{t(locale, l.memoEn, l.memoAr)}</td>
                    <td className="px-3 py-2 text-end font-mono text-slate-300">
                      {l.debit > 0 ? formatJod(l.debit, locale) : '—'}
                    </td>
                    <td className="px-3 py-2 text-end font-mono text-slate-300">
                      {l.credit > 0 ? formatJod(l.credit, locale) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {sim.lines.length > 0 && (
              <tfoot>
                <tr className="border-t border-strong bg-navy-900/80">
                  <td colSpan={2} className="px-3 py-2 text-dim">
                    {sim.balanced ? (
                      <span className="inline-flex items-center gap-1 text-success">
                        <CheckCircle2 size={12} />
                        {t(locale, 'Entry balances', 'القيد متوازن')}
                      </span>
                    ) : (
                      <span className="text-danger">{t(locale, 'Out of balance', 'غير متوازن')}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-end font-mono text-white">
                    {formatJod(sim.lines.reduce((s, l) => s + l.debit, 0), locale)}
                  </td>
                  <td className="px-3 py-2 text-end font-mono text-white">
                    {formatJod(sim.lines.reduce((s, l) => s + l.credit, 0), locale)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <p className="text-[11px] text-dim mt-3">
          {t(
            locale,
            `P&L: recognize only ${formatJod(correctRevenue, locale)} fee revenue. Pass-through ${formatJod(passThrough, locale)} stays on BS until cleared.`,
            `قائمة الدخل: اعترف فقط بإيراد أتعاب ${formatJod(correctRevenue, locale)}. الممرَّر ${formatJod(passThrough, locale)} يبقى في الميزانية حتى التصفية.`,
          )}
        </p>
      </div>

      {/* Recovery queue */}
      <div id="sec-recovery" className="rounded-xl bg-elevated border border-subtle p-6 mb-12">
        <h2 className="text-base font-semibold text-white mb-2">
          {t(locale, 'Client recovery queue', 'طابور استرداد العملاء')}
        </h2>
        <p className="text-xs text-dim mb-4 prose-ar">
          {t(
            locale,
            'Open pass-through exposure to chase (122100 / prepay shortfall) from current records.',
            'التعرض المفتوح للممرَّر للمتابعة (122100 / عجز المقدمة). مبالغ تجريبية من ملفات العينة.',
          )}
        </p>
        <ul className="space-y-2">
          {buildRecoveryQueue(cases).map((r) => (
            <li
              key={r.id}
              className={`rounded-lg border px-3 py-2 text-xs flex flex-wrap justify-between gap-2 ${
                r.priority === 'high'
                  ? 'border-amber-500/40 bg-amber-500/10'
                  : 'border-subtle'
              }`}
            >
              <span>
                <span className="font-mono text-slate-300">{r.declarationNo}</span>
                {' · '}
                {t(locale, r.clientNameEn, r.clientNameAr)}
                <span className="block text-dim mt-0.5">{t(locale, r.noteEn, r.noteAr)}</span>
              </span>
              <span className="font-mono text-white">
                {r.openAmount.toFixed(2)} JOD · {r.account}
              </span>
            </li>
          ))}
          {buildRecoveryQueue(cases).length === 0 && (
            <li className="text-xs text-dim">{t(locale, 'No open recovery items', 'لا بنود استرداد مفتوحة')}</li>
          )}
        </ul>
      </div>

      {/* Client statement */}
      <div id="sec-statement" className="rounded-xl bg-elevated border border-subtle p-6 mb-12">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-accent" />
            <h2 className="text-base font-semibold text-white">
              {t(locale, 'Client recovery statement', 'كشف استرداد العميل')}
            </h2>
          </div>
          <select
            value={statementCase?.id ?? ''}
            onChange={(e) => setStatementId(e.target.value)}
            className="rounded-lg bg-navy-900 border border-subtle px-3 py-1.5 text-xs text-white"
          >
            {cases.map((d) => (
              <option key={d.id} value={d.id}>
                {d.declarationNo} — {locale === 'ar' ? d.clientNameAr : d.clientNameEn}
              </option>
            ))}
          </select>
          {statementCase && (
            <button
              type="button"
              className="text-xs px-3 py-1.5 rounded-lg border border-subtle text-muted hover:text-white print:hidden"
              onClick={() => {
                downloadTextFile(
                  `raya-statement-${statementCase.declarationNo.replace(/\//g, '-')}.csv`,
                  clientStatementToCsv(statementCase),
                );
                appendAudit(
                  'staff',
                  'export_statement',
                  `Exported statement ${statementCase.declarationNo}`,
                  `تصدير كشف ${statementCase.declarationNo}`,
                );
              }}
            >
              {t(locale, 'Export statement CSV', 'تصدير الكشف CSV')}
            </button>
          )}
        </div>
        {statementCase && (
          <>
            <p className="text-xs text-muted mb-4">
              {t(locale, statementCase.clientNameEn, statementCase.clientNameAr)} ·{' '}
              <span className="font-mono">{statementCase.declarationNo}</span> ·{' '}
              {statementCase.mode === 'pay_first'
                ? t(locale, 'Pay-first', 'دفع أولاً')
                : t(locale, 'Prepay', 'مقدم')}
            </p>
            <table className="w-full text-xs" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
              <thead>
                <tr className="text-dim border-b border-subtle">
                  <th className="text-start py-2 font-medium">{t(locale, 'Description', 'الوصف')}</th>
                  <th className="text-end py-2 font-medium">{t(locale, 'Amount (JOD)', 'المبلغ (د.أ)')}</th>
                </tr>
              </thead>
              <tbody>
                {statementLines.map((row) => (
                  <tr
                    key={row.labelEn}
                    className={`border-t border-subtle ${
                      row.kind === 'total' ? 'bg-navy-900/60 font-semibold' : ''
                    }`}
                  >
                    <td className="py-2.5 text-muted">
                      {t(locale, row.labelEn, row.labelAr)}
                      {row.kind === 'fee' && (
                        <span className="ms-2 text-[10px] text-success">
                          {t(locale, '→ revenue', '→ إيراد')}
                        </span>
                      )}
                      {row.kind === 'passthrough' && row.labelEn.startsWith('Pass') && (
                        <span className="ms-2 text-[10px] text-dim">
                          {t(locale, '→ clearing', '→ تسوية')}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-end font-mono text-slate-300">
                      {formatJod(row.amount, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Current disbursement cases */}
      <h2 id="sec-files" className="text-lg font-semibold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
        {t(locale, 'Disbursement files', 'ملفات المدفوعات')}
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {cases.map((d) => {
          const pt = passThroughTotal(d.duties, d.portFees, d.otherGovCharges);
          return (
            <button
              type="button"
              key={d.id}
              onClick={() => setStatementId(d.id)}
              className={`text-start rounded-xl bg-elevated border p-5 transition-colors ${
                statementId === d.id ? 'border-accent' : 'border-subtle hover:border-strong'
              }`}
            >
              <p className="text-[11px] font-mono text-dim mb-1">{d.id}</p>
              <p className="text-sm font-semibold text-white mb-1">
                {t(locale, d.clientNameEn, d.clientNameAr)}
              </p>
              <p className="text-xs text-muted font-mono mb-3">{d.declarationNo}</p>
              <p className="text-[11px] text-dim mb-2">
                {d.mode === 'pay_first'
                  ? t(locale, 'Pay-first · 122100', 'دفع أولاً · 122100')
                  : t(locale, 'Prepay · 222100', 'مقدم · 222100')}
              </p>
              <div className="space-y-1 text-xs text-muted mb-3">
                <p>
                  {t(locale, 'Pass-through', 'ممرَّر')}:{' '}
                  <span className="font-mono text-slate-300">{formatJod(pt, locale)}</span>
                </p>
                <p>
                  {t(locale, 'Agency fee', 'أتعاب')}:{' '}
                  <span className="font-mono text-success">{formatJod(d.agencyFee, locale)}</span>
                </p>
              </div>
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  d.status === 'open'
                    ? 'bg-amber-500/15 text-amber-300'
                    : d.status === 'recovered'
                      ? 'bg-sky-500/15 text-sky-300'
                      : 'bg-emerald-500/15 text-emerald-300'
                }`}
              >
                {t(locale, d.statusEn, d.statusAr)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Accounting terminology */}

      {/* Clearing reconciliation */}
      <div id="sec-recon" className="mb-12 mt-14">
        <h2 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
          {t(locale, 'Clearing subledger reconciliation', 'مطابقة دفتر التسوية المساعد')}
        </h2>
        <p className="text-sm text-muted mb-5 max-w-3xl leading-relaxed prose-ar">
          {t(
            locale,
            'File-level open balances on 122100 / 222100 must equal the GL control accounts. Aging and exceptions drive follow-up.',
            'أرصدة الملفات المفتوحة على 122100 / 222100 يجب أن تساوي حسابات المراقبة في الأستاذ. التقادم والاستثناءات توجّه المتابعة. العرض يتضمن فرق توقيت 50 د.أ على 122100.',
          )}
        </p>

        {/* Tie-out cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl bg-elevated border border-subtle p-4">
            <p className="text-[11px] text-dim mb-1">122100 — {t(locale, 'Subledger', 'المساعد')}</p>
            <p className="font-mono text-amber-300">{formatJod(recon.subledger122100, locale)}</p>
          </div>
          <div className="rounded-xl bg-elevated border border-subtle p-4">
            <p className="text-[11px] text-dim mb-1">122100 — {t(locale, 'GL control', 'مراقبة الأستاذ')}</p>
            <p className="font-mono text-white">{formatJod(recon.gl122100, locale)}</p>
            <p className={`text-[11px] mt-1 ${recon.diff122100 === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              Δ {formatJod(recon.diff122100, locale)}
            </p>
          </div>
          <div className="rounded-xl bg-elevated border border-subtle p-4">
            <p className="text-[11px] text-dim mb-1">222100 — {t(locale, 'Subledger', 'المساعد')}</p>
            <p className="font-mono text-sky-300">{formatJod(recon.subledger222100, locale)}</p>
          </div>
          <div className="rounded-xl bg-elevated border border-subtle p-4">
            <p className="text-[11px] text-dim mb-1">222100 — {t(locale, 'GL control', 'مراقبة الأستاذ')}</p>
            <p className="font-mono text-white">{formatJod(recon.gl222100, locale)}</p>
            <p className={`text-[11px] mt-1 ${recon.diff222100 === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              Δ {formatJod(recon.diff222100, locale)}
            </p>
          </div>
        </div>


        <div className="flex flex-wrap gap-2 mb-4 print:hidden">
          <button
            type="button"
            className="text-xs px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover"
            onClick={() => {
              downloadTextFile(`raya-clearing-recon-${recon.asOf}.csv`, clearingReconToCsv(recon));
              appendAudit('staff', 'export_recon', 'Exported clearing reconciliation CSV', 'تصدير مطابقة التسوية CSV');
            }}
          >
            {t(locale, 'Export recon CSV', 'تصدير المطابقة CSV')}
          </button>
          <button
            type="button"
            className="text-xs px-3 py-1.5 rounded-lg border border-subtle text-muted hover:text-white"
            onClick={() => window.print()}
          >
            {t(locale, 'Print recon pack', 'طباعة حزمة المطابقة')}
          </button>
        </div>
        <div
          className={`rounded-lg border px-4 py-3 text-sm mb-6 ${
            recon.tiedOut
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-100'
          }`}
        >
          {recon.tiedOut
            ? t(locale, 'Tied out — no unexplained difference', 'مطابق — لا فرق غير مفسَّر')
            : t(
                locale,
                'Not tied out — document reconciling items (e.g. bank paid, journal not yet posted).',
                'غير مطابق — وثّق بنود التسوية (مثل دفع بنكي لم يُقيَّد بعد).',
              )}
          <span className="text-dim text-xs ms-2">{ui.asOf(locale)} {recon.asOf}</span>
        </div>

        {/* Aging */}
        <h3 className="text-sm font-semibold text-white mb-3">
          {t(locale, 'Aging of open clearing', 'تقادم أرصدة التسوية المفتوحة')}
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {(['0-7', '8-15', '16-30', '30+'] as const).map((b) => {
            const row = recon.aging[b];
            const total = row.amount122100 + row.amount222100;
            return (
              <div
                key={b}
                className={`rounded-xl border p-3 ${
                  b === '30+' && total > 0
                    ? 'border-red-500/40 bg-red-500/10'
                    : 'border-subtle bg-elevated'
                }`}
              >
                <p className="text-[11px] text-dim mb-1">
                  {t(locale, `${b} days`, `${b} يوماً`)} · {row.count}
                </p>
                <p className="text-xs text-amber-200/90 font-mono">
                  122100 {formatJod(row.amount122100, locale)}
                </p>
                <p className="text-xs text-sky-200/90 font-mono">
                  222100 {formatJod(row.amount222100, locale)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Subledger table */}
        <h3 className="text-sm font-semibold text-white mb-3">
          {t(locale, 'Open item subledger', 'دفتر البنود المفتوحة')}
        </h3>
        <div className="overflow-x-auto rounded-xl border border-subtle mb-6 table-desktop-only">
          <table className="w-full text-xs min-w-[720px]" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            <thead>
              <tr className={`bg-navy-800 text-dim ${locale === 'ar' ? '' : 'uppercase tracking-wider'}`}>
                <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'Declaration', 'البيان')}</th>
                <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'Client', 'العميل')}</th>
                <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'Account', 'الحساب')}</th>
                <th className="text-end px-3 py-2.5 font-medium">{t(locale, 'Open balance', 'الرصيد المفتوح')}</th>
                <th className="text-end px-3 py-2.5 font-medium">{t(locale, 'Age (days)', 'العمر (أيام)')}</th>
                <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'Bucket', 'الشريحة')}</th>
              </tr>
            </thead>
            <tbody>
              {recon.lines
                .filter((l) => l.openBalance > 0)
                .map((l) => (
                  <tr key={l.caseId} className="border-t border-subtle">
                    <td className="px-3 py-2.5 font-mono text-slate-300">{l.declarationNo}</td>
                    <td className="px-3 py-2.5 text-muted">{t(locale, l.clientNameEn, l.clientNameAr)}</td>
                    <td className="px-3 py-2.5 font-mono text-accent">{l.account}</td>
                    <td className="px-3 py-2.5 text-end font-mono text-white">
                      {formatJod(l.openBalance, locale)}
                    </td>
                    <td className="px-3 py-2.5 text-end text-dim">{l.agingDays}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={
                          l.agingBucket === '30+'
                            ? 'text-red-300'
                            : l.agingBucket === '16-30'
                              ? 'text-amber-300'
                              : 'text-dim'
                        }
                      >
                        {l.agingBucket}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="cards-mobile-only space-y-3 mb-6">
          {recon.lines
            .filter((l) => l.openBalance > 0)
            .map((l) => (
              <div key={l.caseId} className="rounded-xl bg-elevated border border-subtle p-4">
                <p className="font-mono text-xs text-slate-300">{l.declarationNo}</p>
                <p className="text-xs text-muted mb-2">{t(locale, l.clientNameEn, l.clientNameAr)}</p>
                <div className="flex justify-between text-xs">
                  <span className="font-mono text-accent">{l.account}</span>
                  <span className="font-mono text-white">{formatJod(l.openBalance, locale)}</span>
                </div>
                <p className="text-[11px] text-dim mt-1">
                  {l.agingDays}d · {l.agingBucket}
                </p>
              </div>
            ))}
        </div>

        {/* Exceptions */}
        <h3 className="text-sm font-semibold text-white mb-3">
          {t(locale, 'Exception list', 'قائمة الاستثناءات')}
        </h3>
        {recon.exceptions.length === 0 ? (
          <p className="text-xs text-dim">{t(locale, 'No exceptions', 'لا استثناءات')}</p>
        ) : (
          <ul className="space-y-2">
            {recon.exceptions.map((l) => (
              <li
                key={`ex-${l.caseId}`}
                className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-xs"
              >
                <span className="font-mono text-slate-300">{l.declarationNo}</span>
                <span className="text-dim mx-2">·</span>
                <span className="font-mono text-accent">{l.account}</span>
                {l.openBalance > 0 && (
                  <span className="text-amber-200 ms-2">{formatJod(l.openBalance, locale)}</span>
                )}
                <p className="text-red-200/90 mt-1 leading-relaxed prose-ar">
                  {l.exceptionEn
                    ? t(locale, l.exceptionEn, l.exceptionAr || l.exceptionEn)
                    : l.agingBucket === '30+'
                      ? t(
                          locale,
                          'Aged over 30 days — chase recovery or apply/refund prepay',
                          'أقدم من 30 يوماً — تابع الاسترداد أو طبّق/أرد المقدمة',
                        )
                      : t(
                          locale,
                          'Non-open status with residual balance',
                          'حالة غير مفتوحة مع رصيد متبقي',
                        )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div id="sec-acct-terms" className="mt-14">
        <h2 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
          {t(locale, 'Accounting terminology', 'مصطلحات المحاسبة')}
        </h2>
        <p className="text-sm text-muted mb-5 max-w-3xl leading-relaxed prose-ar">
          {t(
            locale,
            'Arabic terms for clearing accounts, journals, and client recovery. Full glossary also on the ASYCUDA page.',
            'المصطلحات العربية لحسابات التسوية والقيود واسترداد العميل. المسرد الكامل أيضاً في صفحة الأسيكودا.',
          )}
        </p>
        <div className="overflow-x-auto rounded-xl border border-subtle">
          <table className="w-full text-sm" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            <thead>
              <tr className={`bg-navy-800 text-dim text-[11px] ${locale === 'ar' ? '' : 'uppercase tracking-wider'}`}>
                <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'English', 'الإنجليزية')}</th>
                <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'Arabic', 'العربية')}</th>
                <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'Meaning', 'المعنى')}</th>
              </tr>
            </thead>
            <tbody>
              {TERMS.filter((x) => x.category === 'accounting').map((term) => (
                <tr key={term.id} className="border-t border-subtle">
                  <td className="px-3 py-2.5 text-slate-300 text-xs">{term.en}</td>
                  <td className="px-3 py-2.5 text-white text-xs font-medium">{term.ar}</td>
                  <td className="px-3 py-2.5 text-dim text-xs leading-relaxed prose-ar">
                    {t(locale, term.defEn, term.defAr)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-dim mt-3">
          <Link to="/asycuda" className="text-accent hover:underline">
            {t(locale, 'Full customs terminology glossary', 'مسرد مصطلحات التخليص الكامل')}
          </Link>
        </p>
      </div>

    </div>
  );
}
