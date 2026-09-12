import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator,
  BookOpen,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Wallet,
} from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';
import { ui } from '@/content/uiLabels';
import {
  buildJournal,
  buildClearingReconciliation,
  formatJod,
  passThroughTotal,
  portfolioMetrics,
  round2,
  type JournalStage,
} from '@/lib/disbursementCalc';
import type { DisbursementCase, DisbursementMode } from '@/lib/types';
import { allDisbursements, pullRecordsFromServer } from '@/lib/recordStore';
import { clearingReconToCsv, downloadTextFile } from '@/lib/exportCsv';
import { buildRecoveryQueue } from '@/lib/recoveryQueue';
import { appendAudit } from '@/lib/auditLog';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { staffHasPermission } from '@/lib/staffAuth';
import {
  fetchAccountingSummary,
  fetchJournalPreview,
  fetchJournalEntries,
  fetchReconciliationFull,
  postJournalEntry,
  saveReconAdjustments,
  resolveReconItem,
  type AccountingMetrics,
  type FinanceControls,
  type JournalEntry,
  type ReconResolution,
  type ServerJournal,
} from '@/lib/accountingApi';
import type { ClearingReconciliation } from '@/lib/types';
import type { RecoveryItem } from '@/lib/recoveryQueue';
import InvoicesSection from '@/pages/accounting/InvoicesSection';
import GstSection from '@/pages/accounting/GstSection';
import ReferenceSection from '@/pages/accounting/ReferenceSection';
import FinanceControlTower from '@/components/accounting/FinanceControlTower';

/** Demo reconciliation date (kept stable so the teaching content matches). */
const RECON_AS_OF = '2026-07-25';

type TabId = 'workspace' | 'invoices' | 'gst' | 'recon' | 'reference';

const TABS: { id: TabId; en: string; ar: string }[] = [
  { id: 'workspace', en: 'Workspace', ar: 'مساحة العمل' },
  { id: 'invoices', en: 'Invoices & statements', ar: 'الفواتير والكشوف' },
  { id: 'gst', en: 'GST reports', ar: 'تقارير الضريبة' },
  { id: 'recon', en: 'Reconciliation & recovery', ar: 'المطابقة والاسترداد' },
  { id: 'reference', en: 'Reference', ar: 'المرجع' },
];

function initialTab(): TabId {
  const h = window.location.hash.replace('#', '');
  return (TABS.some((x) => x.id === h) ? h : 'workspace') as TabId;
}

export default function StaffAccountingPage() {
  const { locale } = useLocale();
  const { session } = useStaffAuth();
  const [tab, setTab] = useState<TabId>(initialTab);
  const [mode, setMode] = useState<DisbursementMode>('pay_first');
  const [stage, setStage] = useState<JournalStage>('full');
  const [duties, setDuties] = useState(1500);
  const [portFees, setPortFees] = useState(350);
  const [otherGov, setOtherGov] = useState(50);
  const [agencyFee, setAgencyFee] = useState(150);
  const [prepayAmount, setPrepayAmount] = useState(1800);

  const [cases, setCases] = useState<DisbursementCase[]>(() => allDisbursements());
  const accountingDenied = !staffHasPermission(session, 'clearing:read');

  // Sync persisted disbursements from the server so figures/statements match
  // the database on any device, then re-read the merged local store.
  useEffect(() => {
    if (accountingDenied) return;
    let cancelled = false;
    pullRecordsFromServer()
      .then(() => {
        if (!cancelled) setCases(allDisbursements());
      })
      .catch(() => {
        /* offline/dev fallback keeps local records */
      });
    return () => {
      cancelled = true;
    };
  }, [accountingDenied]);

  useEffect(() => {
    window.history.replaceState(null, '', `#${tab}`);
  }, [tab]);

  // Server-computed accounting (source of truth). Local calc is the fallback
  // when there is no validated staff session or the API is unreachable.
  const [serverSummary, setServerSummary] = useState<{
    metrics: AccountingMetrics;
    recoveryQueue: RecoveryItem[];
    financeControls?: FinanceControls;
  } | null>(null);
  const [serverRecon, setServerRecon] = useState<ClearingReconciliation | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, ReconResolution>>({});
  const [serverSim, setServerSim] = useState<ServerJournal | null>(null);
  const [postedEntries, setPostedEntries] = useState<JournalEntry[] | null>(null);
  const [postCaseId, setPostCaseId] = useState('');
  const [posting, setPosting] = useState(false);
  const [postNotice, setPostNotice] = useState<'ok' | 'error' | null>(null);
  const [adjust122100, setAdjust122100] = useState('0');
  const [adjust222100, setAdjust222100] = useState('0');
  const [adjustNote, setAdjustNote] = useState('');
  const [savingAdjust, setSavingAdjust] = useState(false);
  const [adjustNotice, setAdjustNotice] = useState<'ok' | 'error' | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const canPostJournal =
    staffHasPermission(session, 'journals:post') ||
    staffHasPermission(session, 'shipments:write') ||
    session?.role === 'staff' ||
    session?.role === 'accounting';

  useEffect(() => {
    if (accountingDenied) return;
    let cancelled = false;
    fetchAccountingSummary().then((s) => {
      if (!cancelled && s) setServerSummary(s);
    });
    fetchReconciliationFull(RECON_AS_OF).then((r) => {
      if (cancelled || !r) return;
      setServerRecon(r.reconciliation);
      setResolutions(r.resolutions || {});
      setAdjust122100(String(r.state.glAdjust122100));
      setAdjust222100(String(r.state.glAdjust222100));
      setAdjustNote(r.state.note ?? '');
    });
    fetchJournalEntries().then((entries) => {
      if (!cancelled && entries) setPostedEntries(entries);
    });
    return () => {
      cancelled = true;
    };
  }, [accountingDenied]);

  const localMetrics = useMemo(() => portfolioMetrics(cases), [cases]);
  const metrics = serverSummary?.metrics ?? localMetrics;
  /** Local fallback uses the same visible GL adjustment state as the server path. */
  const localRecon = useMemo(
    () =>
      buildClearingReconciliation(cases, RECON_AS_OF, {
        glAdjust122100: Number(adjust122100) || 0,
        glAdjust222100: Number(adjust222100) || 0,
      }),
    [adjust122100, adjust222100, cases],
  );
  const recon = serverRecon ?? localRecon;
  const recoveryQueue = useMemo(
    () => serverSummary?.recoveryQueue ?? buildRecoveryQueue(cases),
    [serverSummary, cases],
  );
  const financeControls: FinanceControls = serverSummary?.financeControls ?? {
    postedJournalCount: postedEntries?.length ?? 0,
    unbalancedJournalCount: postedEntries?.filter((entry) => !entry.balanced).length ?? 0,
    openInvoiceCount: 0,
    overdueInvoiceCount: 0,
    overdueAmount: 0,
  };
  /** Aging days per case from the reconciliation subledger, for the recovery board. */
  const agingByCase = useMemo(() => {
    const map: Record<string, { days: number; bucket: string }> = {};
    for (const l of recon.lines) map[l.caseId] = { days: l.agingDays, bucket: l.agingBucket };
    return map;
  }, [recon]);

  const localSim = useMemo(
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

  useEffect(() => {
    if (accountingDenied) return;
    let cancelled = false;
    // Drop the previous server preview immediately so stale figures are never
    // shown against the new inputs; local calc renders until the reply lands.
    setServerSim(null);
    const handle = setTimeout(() => {
      fetchJournalPreview({
        mode,
        duties,
        portFees,
        otherGov,
        agencyFee,
        stage,
        prepayAmount: mode === 'client_prepay' ? prepayAmount : undefined,
      }).then((j) => {
        if (!cancelled) setServerSim(j);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [accountingDenied, mode, duties, portFees, otherGov, agencyFee, stage, prepayAmount]);

  const sim = serverSim ?? localSim;

  const passThrough = passThroughTotal(duties, portFees, otherGov);
  const wrongRevenue = round2(passThrough + agencyFee);
  const correctRevenue = round2(agencyFee);

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

      <div className="max-w-3xl mb-6">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-navy-700 text-accent mb-4">
          <Calculator size={22} />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
          {t(locale, 'Disbursement accounting', 'محاسبة المدفوعات')}
        </h1>
        <p className="text-muted text-sm leading-relaxed">
          {t(
            locale,
            'Clearing accounts, invoicing, GST reports, reconciliation, and client recovery — computed by the server from persisted files.',
            'حسابات التسوية، الفوترة، تقارير الضريبة، المطابقة واسترداد العملاء — يحسبها الخادم من الملفات المخزَّنة.',
          )}
        </p>
      </div>

      <FinanceControlTower
        metrics={metrics}
        controls={financeControls}
        recoveryQueue={recoveryQueue}
        recon={recon}
        onNavigate={setTab}
      />

      {/* Tabs */}
      <nav
        aria-label={t(locale, 'Accounting sections', 'أقسام المحاسبة')}
        className="sticky top-16 z-20 -mx-1 mb-8 overflow-x-auto print:hidden"
      >
        <ul className="flex gap-1.5 min-w-max rounded-xl bg-navy-900/95 border border-subtle p-1.5 backdrop-blur-sm">
          {TABS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setTab(item.id)}
                aria-current={tab === item.id ? 'page' : undefined}
                className={`block text-xs px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  tab === item.id
                    ? 'bg-navy-700 text-white border border-strong'
                    : 'text-muted hover:text-white hover:bg-navy-800'
                }`}
              >
                {t(locale, item.en, item.ar)}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {tab === 'workspace' && (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
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
                {t(locale, 'Pass-through volume', 'حجم الممرَّر')}
              </p>
              <p className="text-lg font-semibold text-white font-mono">
                {formatJod(metrics.passThroughVolume, locale)}
              </p>
              <p className="text-[10px] text-dim mt-0.5">
                {metrics.openCount}/{metrics.caseCount} {t(locale, 'files open', 'ملفات مفتوحة')}
              </p>
            </div>
          </div>

          {/* Simulator */}
          <div className="rounded-xl bg-elevated border border-subtle p-6 mb-12">
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
                <p className="text-[11px] text-dim mb-1">{t(locale, 'Pass-through', 'ممرَّر')}</p>
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
                `قائمة الدخل: اعترف فقط بإيراد أتعاب ${formatJod(correctRevenue, locale)}. الممرَّر ${formatJod(passThrough, locale)} يبقى في الميزانية حتى التصفية.`,
              )}
            </p>
          </div>

          {/* Posted journal entries (persisted server-side) */}
          <div className="rounded-xl bg-elevated border border-subtle p-6 mb-12">
            <h2 className="text-base font-semibold text-white mb-2">
              {t(locale, 'Posted journal entries', 'القيود المرحَّلة')}
            </h2>
            <p className="text-xs text-dim mb-4 prose-ar">
              {t(
                locale,
                'Journals are recomputed by the server from the saved file and stored permanently with an audit trail. Reposting a file/stage replaces its previous snapshot — it never double-books.',
                'القيود يعيد الخادم حسابها من الملف المحفوظ وتُخزَّن بشكل دائم مع سجل تدقيق. إعادة الترحيل لنفس الملف/المرحلة تستبدل اللقطة السابقة — لا ازدواجية قيود.',
              )}
            </p>
            {postedEntries === null ? (
              <p className="text-xs text-dim">
                {t(
                  locale,
                  'Sign in with a validated staff session to post and view persisted journals.',
                  'سجّل الدخول بجلسة موظف موثّقة لترحيل القيود المخزَّنة وعرضها.',
                )}
              </p>
            ) : (
              <>
                {canPostJournal && (
                  <div className="flex flex-wrap items-center gap-2 mb-4 print:hidden">
                    <select
                      className="text-xs rounded-lg bg-navy-900 border border-subtle text-white px-2 py-1.5"
                      value={postCaseId || cases[0]?.id || ''}
                      onChange={(e) => setPostCaseId(e.target.value)}
                    >
                      {cases.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.declarationNo} — {locale === 'ar' ? c.clientNameAr : c.clientNameEn}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={posting || cases.length === 0}
                      className="text-xs px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
                      onClick={async () => {
                        const id = postCaseId || cases[0]?.id;
                        if (!id) return;
                        setPosting(true);
                        setPostNotice(null);
                        const entry = await postJournalEntry(id, 'full');
                        if (entry) {
                          setPostNotice('ok');
                          const [entries, summary] = await Promise.all([
                            fetchJournalEntries(),
                            fetchAccountingSummary(),
                          ]);
                          if (entries) setPostedEntries(entries);
                          if (summary) setServerSummary(summary);
                        } else {
                          setPostNotice('error');
                        }
                        setPosting(false);
                      }}
                    >
                      {posting
                        ? t(locale, 'Posting…', 'جارٍ الترحيل…')
                        : t(locale, 'Post journal for file', 'ترحيل قيد للملف')}
                    </button>
                    {postNotice === 'ok' && (
                      <span className="text-[11px] text-emerald-400">
                        {t(locale, 'Journal posted and stored.', 'تم ترحيل القيد وتخزينه.')}
                      </span>
                    )}
                    {postNotice === 'error' && (
                      <span className="text-[11px] text-danger">
                        {t(
                          locale,
                          'Could not post — the file must be saved to the server first.',
                          'تعذّر الترحيل — يجب حفظ الملف على الخادم أولاً.',
                        )}
                      </span>
                    )}
                  </div>
                )}
                {postedEntries.length === 0 ? (
                  <p className="text-xs text-dim">
                    {t(locale, 'No journals posted yet.', 'لا قيود مرحَّلة بعد.')}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-dim border-b border-subtle">
                          <th className="text-start px-3 py-2">{t(locale, 'File', 'الملف')}</th>
                          <th className="text-start px-3 py-2">{t(locale, 'Stage', 'المرحلة')}</th>
                          <th className="text-end px-3 py-2">{t(locale, 'Pass-through', 'الممرَّر')}</th>
                          <th className="text-end px-3 py-2">{t(locale, 'Fee revenue', 'إيراد الأتعاب')}</th>
                          <th className="text-start px-3 py-2">{t(locale, 'Posted', 'التاريخ')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {postedEntries.slice(0, 12).map((e) => (
                          <tr key={e.id} className="border-b border-subtle/50">
                            <td className="px-3 py-2 text-white font-mono">{e.disbursementId}</td>
                            <td className="px-3 py-2 text-muted">{e.stage}</td>
                            <td className="px-3 py-2 text-end font-mono text-white">
                              {formatJod(e.passThrough, locale)}
                            </td>
                            <td className="px-3 py-2 text-end font-mono text-success">
                              {formatJod(e.revenue, locale)}
                            </td>
                            <td className="px-3 py-2 text-dim">
                              {new Date(e.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-JO' : 'en-GB')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Current disbursement cases */}
          <h2 className="text-lg font-semibold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
            {t(locale, 'Disbursement files', 'ملفات المدفوعات')}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {cases.map((d) => {
              const pt = passThroughTotal(d.duties, d.portFees, d.otherGovCharges);
              return (
                <div
                  key={d.id}
                  className="text-start rounded-xl bg-elevated border border-subtle p-5"
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
                      {t(locale, 'Pass-through', 'ممرَّر')}:{' '}
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
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'invoices' && (
        <InvoicesSection
          cases={cases}
          canMutate={canPostJournal}
          serverAvailable={serverRecon !== null || postedEntries !== null}
        />
      )}

      {tab === 'gst' && <GstSection serverAvailable={postedEntries !== null} />}

      {tab === 'recon' && (
        <>
          {/* Recovery queue */}
          <div className="rounded-xl bg-elevated border border-subtle p-6 mb-12">
            <h2 className="text-base font-semibold text-white mb-2">
              {t(locale, 'Client recovery queue', 'طابور استرداد العملاء')}
            </h2>
            <p className="text-xs text-dim mb-4 prose-ar">
              {t(
                locale,
                'Open pass-through exposure to chase (122100 / prepay shortfall), with aging from the reconciliation subledger.',
                'التعرض المفتوح للممرَّر للمتابعة (122100 / عجز المقدمة)، مع التقادم من دفتر المطابقة المساعد.',
              )}
            </p>
            <ul className="space-y-2">
              {recoveryQueue.map((r) => {
                const aging = agingByCase[r.id];
                return (
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
                      {aging && (
                        <span
                          className={`ms-2 text-[10px] px-1.5 py-0.5 rounded-full ${
                            aging.bucket === '30+'
                              ? 'bg-red-500/15 text-red-300'
                              : aging.bucket === '16-30'
                                ? 'bg-amber-500/15 text-amber-300'
                                : 'bg-navy-700 text-dim'
                          }`}
                        >
                          {aging.days} {t(locale, 'days', 'يوماً')} · {aging.bucket}
                        </span>
                      )}
                      <span className="block text-dim mt-0.5">{t(locale, r.noteEn, r.noteAr)}</span>
                    </span>
                    <span className="font-mono text-white">
                      {r.openAmount.toFixed(2)} JOD · {r.account}
                    </span>
                  </li>
                );
              })}
              {recoveryQueue.length === 0 && (
                <li className="text-xs text-dim">{t(locale, 'No open recovery items', 'لا بنود استرداد مفتوحة')}</li>
              )}
            </ul>
          </div>

          {/* Clearing reconciliation */}
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              {t(locale, 'Clearing subledger reconciliation', 'مطابقة دفتر التسوية المساعد')}
            </h2>
            <p className="text-sm text-muted mb-5 max-w-3xl leading-relaxed prose-ar">
              {t(
                locale,
                'File-level open balances on 122100 / 222100 must equal the GL control accounts. Aging and exceptions drive follow-up.',
                'أرصدة الملفات المفتوحة على 122100 / 222100 يجب أن تساوي حسابات المراقبة في الأستاذ. التقادم والاستثناءات توجّه المتابعة.',
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

            {serverRecon && canPostJournal && (
              <div className="rounded-lg border border-subtle bg-navy-900/60 p-4 mb-4 print:hidden">
                <p className="text-xs font-semibold text-white mb-2">
                  {t(locale, 'GL adjustments (reconciling items)', 'تسويات الأستاذ العام (بنود المطابقة)')}
                </p>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="text-[11px] text-dim">
                    122100
                    <input
                      type="number"
                      step="0.01"
                      className="block mt-1 w-28 text-xs rounded-lg bg-navy-900 border border-subtle text-white px-2 py-1.5"
                      value={adjust122100}
                      onChange={(e) => setAdjust122100(e.target.value)}
                    />
                  </label>
                  <label className="text-[11px] text-dim">
                    222100
                    <input
                      type="number"
                      step="0.01"
                      className="block mt-1 w-28 text-xs rounded-lg bg-navy-900 border border-subtle text-white px-2 py-1.5"
                      value={adjust222100}
                      onChange={(e) => setAdjust222100(e.target.value)}
                    />
                  </label>
                  <label className="text-[11px] text-dim flex-1 min-w-[180px]">
                    {t(locale, 'Note', 'ملاحظة')}
                    <input
                      type="text"
                      className="block mt-1 w-full text-xs rounded-lg bg-navy-900 border border-subtle text-white px-2 py-1.5"
                      value={adjustNote}
                      onChange={(e) => setAdjustNote(e.target.value)}
                      placeholder={t(locale, 'e.g. bank paid, journal lag', 'مثال: دفع بنكي لم يُقيَّد بعد')}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={savingAdjust}
                    className="text-xs px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
                    onClick={async () => {
                      setSavingAdjust(true);
                      setAdjustNotice(null);
                      const state = await saveReconAdjustments({
                        glAdjust122100: Number(adjust122100) || 0,
                        glAdjust222100: Number(adjust222100) || 0,
                        note: adjustNote || undefined,
                      });
                      if (state) {
                        setAdjustNotice('ok');
                        const r = await fetchReconciliationFull(RECON_AS_OF);
                        if (r) {
                          setServerRecon(r.reconciliation);
                          setResolutions(r.resolutions || {});
                        }
                      } else {
                        setAdjustNotice('error');
                      }
                      setSavingAdjust(false);
                    }}
                  >
                    {savingAdjust
                      ? t(locale, 'Saving…', 'جارٍ الحفظ…')
                      : t(locale, 'Save adjustments', 'حفظ التسويات')}
                  </button>
                  {adjustNotice === 'ok' && (
                    <span className="text-[11px] text-emerald-400">
                      {t(locale, 'Saved and audited.', 'تم الحفظ والتدقيق.')}
                    </span>
                  )}
                  {adjustNotice === 'error' && (
                    <span className="text-[11px] text-danger">
                      {t(locale, 'Save failed.', 'فشل الحفظ.')}
                    </span>
                  )}
                </div>
              </div>
            )}

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
                ? t(locale, 'Tied out — no unexplained difference', 'مطابق — لا فرق غير مفسَّر')
                : t(
                    locale,
                    'Not tied out — document reconciling items (e.g. bank paid, journal not yet posted).',
                    'غير مطابق — وثّق بنود التسوية (مثل دفع بنكي لم يُقيَّد بعد).',
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
              <table className="w-full text-xs min-w-[760px]" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                <thead>
                  <tr className={`bg-navy-800 text-dim ${locale === 'ar' ? '' : 'uppercase tracking-wider'}`}>
                    <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'Declaration', 'البيان')}</th>
                    <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'Client', 'العميل')}</th>
                    <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'Account', 'الحساب')}</th>
                    <th className="text-end px-3 py-2.5 font-medium">{t(locale, 'Open balance', 'الرصيد المفتوح')}</th>
                    <th className="text-end px-3 py-2.5 font-medium">{t(locale, 'Age (days)', 'العمر (أيام)')}</th>
                    <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'Bucket', 'الشريحة')}</th>
                    <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'Status', 'الحالة')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recon.lines
                    .filter((l) => l.openBalance > 0)
                    .map((l) => {
                      const resolution = resolutions[l.caseId];
                      return (
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
                          <td className="px-3 py-2.5">
                            {resolution?.resolved ? (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">
                                <CheckCircle2 size={10} /> {t(locale, 'Resolved', 'مُسوّى')}
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">
                                {t(locale, 'Outstanding', 'قائم')}
                              </span>
                            )}
                            {serverRecon && canPostJournal && (
                              <button
                                type="button"
                                disabled={resolvingId === l.caseId}
                                className="block mt-1 text-[10px] text-muted hover:text-white underline decoration-dotted print:hidden disabled:opacity-50"
                                onClick={async () => {
                                  const nextResolved = !resolution?.resolved;
                                  const note = nextResolved
                                    ? window.prompt(
                                        t(locale, 'Resolution note (optional):', 'ملاحظة التسوية (اختياري):'),
                                        resolution?.note ?? '',
                                      ) ?? undefined
                                    : undefined;
                                  setResolvingId(l.caseId);
                                  const state = await resolveReconItem(l.caseId, nextResolved, note);
                                  if (state) {
                                    setResolutions((prev) => ({ ...prev, [l.caseId]: state }));
                                  }
                                  setResolvingId(null);
                                }}
                              >
                                {resolution?.resolved
                                  ? t(locale, 'Reopen', 'إعادة فتح')
                                  : t(locale, 'Mark resolved', 'تعليم كمُسوّى')}
                              </button>
                            )}
                            {resolution?.resolved && resolution.note && (
                              <span className="block text-[10px] text-dim mt-0.5 max-w-[160px] truncate" title={resolution.note}>
                                {resolution.note}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            <div className="cards-mobile-only space-y-3 mb-6">
              {recon.lines
                .filter((l) => l.openBalance > 0)
                .map((l) => {
                  const resolution = resolutions[l.caseId];
                  return (
                    <div key={l.caseId} className="rounded-xl bg-elevated border border-subtle p-4">
                      <p className="font-mono text-xs text-slate-300">{l.declarationNo}</p>
                      <p className="text-xs text-muted mb-2">{t(locale, l.clientNameEn, l.clientNameAr)}</p>
                      <div className="flex justify-between text-xs">
                        <span className="font-mono text-accent">{l.account}</span>
                        <span className="font-mono text-white">{formatJod(l.openBalance, locale)}</span>
                      </div>
                      <p className="text-[11px] text-dim mt-1">
                        {l.agingDays}d · {l.agingBucket}
                        {resolution?.resolved && (
                          <span className="ms-2 text-emerald-300">{t(locale, 'Resolved', 'مُسوّى')}</span>
                        )}
                      </p>
                      {serverRecon && canPostJournal && (
                        <button
                          type="button"
                          disabled={resolvingId === l.caseId}
                          className="mt-2 text-[11px] text-muted hover:text-white underline decoration-dotted disabled:opacity-50"
                          onClick={async () => {
                            const nextResolved = !resolution?.resolved;
                            setResolvingId(l.caseId);
                            const state = await resolveReconItem(l.caseId, nextResolved);
                            if (state) setResolutions((prev) => ({ ...prev, [l.caseId]: state }));
                            setResolvingId(null);
                          }}
                        >
                          {resolution?.resolved
                            ? t(locale, 'Reopen', 'إعادة فتح')
                            : t(locale, 'Mark resolved', 'تعليم كمُسوّى')}
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Exceptions */}
            <h3 className="text-sm font-semibold text-white mb-3">
              {t(locale, 'Exception list', 'قائمة الاستثناءات')}
            </h3>
            {recon.exceptions.length === 0 ? (
              <p className="text-xs text-dim">{t(locale, 'No exceptions', 'لا استثناءات')}</p>
            ) : (
              <ul className="space-y-2">
                {recon.exceptions.map((l) => {
                  const resolution = resolutions[l.caseId];
                  return (
                    <li
                      key={`ex-${l.caseId}`}
                      className={`rounded-lg border px-4 py-3 text-xs ${
                        resolution?.resolved
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : 'border-red-500/30 bg-red-500/5'
                      }`}
                    >
                      <span className="font-mono text-slate-300">{l.declarationNo}</span>
                      <span className="text-dim mx-2">·</span>
                      <span className="font-mono text-accent">{l.account}</span>
                      {l.openBalance > 0 && (
                        <span className="text-amber-200 ms-2">{formatJod(l.openBalance, locale)}</span>
                      )}
                      {resolution?.resolved && (
                        <span className="ms-2 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">
                          <CheckCircle2 size={10} /> {t(locale, 'Resolved', 'مُسوّى')}
                        </span>
                      )}
                      <p className={`mt-1 leading-relaxed prose-ar ${resolution?.resolved ? 'text-emerald-200/80' : 'text-red-200/90'}`}>
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
                        {resolution?.resolved && resolution.note && (
                          <span className="block text-dim mt-0.5">{resolution.note}</span>
                        )}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}

      {tab === 'reference' && <ReferenceSection />}
    </div>
  );
}
