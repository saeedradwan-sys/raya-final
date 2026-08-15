import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container, ExternalLink, Search, AlertTriangle, Clock } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';
import {
  ACT_TRACK_PORTAL,
  ACT_N4_CAP_URL,
  findContainerTrack,
  listContainerTracks,
  type ContainerTrackCard,
} from '@/lib/containerTracking';
import { detectCarrier } from '@/lib/agents/carrierTrackAgent';
import { LANE_STYLE } from '@/lib/selectivityStyles';
import { updateUserShipment } from '@/lib/recordStore';
import { todayISO } from '@/lib/dates';
import { estimateDemurrageJod, ACT_OVERVIEW } from '@/content/act';
import LiveTrackingWorkspace from '@/components/tracking/LiveTrackingWorkspace';

function RiskBadge({ risk, locale }: { risk: ContainerTrackCard['risk']; locale: 'en' | 'ar' }) {
  if (risk === 'urgent')
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-danger/20 text-danger">
        {t(locale, 'Urgent', 'عاجل')}
      </span>
    );
  if (risk === 'watch')
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200">
        {t(locale, 'Watch', 'مراقبة')}
      </span>
    );
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">
      {t(locale, 'OK', 'جيد')}
    </span>
  );
}

function Timeline({ card, locale }: { card: ContainerTrackCard; locale: 'en' | 'ar' }) {
  return (
    <ol className="relative border-s border-subtle ms-2 ps-4 space-y-3">
      {card.events.map((ev) => (
        <li key={ev.id} className="relative">
          <span
            className={`absolute -start-[1.3rem] top-1 h-2.5 w-2.5 rounded-full border ${
              ev.done
                ? 'bg-emerald-400 border-emerald-400'
                : ev.active
                  ? 'bg-accent border-accent'
                  : 'bg-navy-900 border-subtle'
            }`}
          />
          <p
            className={`text-xs font-medium ${
              ev.active ? 'text-white' : ev.done ? 'text-slate-300' : 'text-dim'
            }`}
          >
            {t(locale, ev.titleEn, ev.titleAr)}
          </p>
          {(ev.detailEn || ev.detailAr) && (
            <p className="text-[11px] text-dim prose-ar mt-0.5">
              {t(locale, ev.detailEn || '', ev.detailAr || '')}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

export default function ContainerTrackPage({ staffMode = false }: { staffMode?: boolean }) {
  const { locale } = useLocale();
  const [q, setQ] = useState('');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [terminalNote, setTerminalNote] = useState('');
  const list = useMemo(() => listContainerTracks(q), [q, tick]);
  const focused =
    focusId ? list.find((card) => card.shipmentId === focusId) || findContainerTrack(focusId) : list[0];

  const applyTerminalUpdate = (patch: Parameters<typeof updateUserShipment>[1], successMsg: string) => {
    if (!focused) return;
    const row = updateUserShipment(focused.shipmentId, patch);
    if (row) {
      setTick((n) => n + 1);
      setTerminalNote('');
      // Optional: could show a toast; for now alert is fine in this context
      console.log(successMsg, row.id);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 lg:px-8 py-12">
      <div className="max-w-3xl mb-8">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-navy-700 text-accent mb-4">
          <Container size={22} />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
          {t(locale, 'Container tracking', 'تتبع الحاويات')}
        </h1>
        <p className="text-sm text-muted prose-ar mb-2">
          {t(
            locale,
            'Track containers on Raya cases: discharge, ACT free time, selectivity, inspection, release.',
            'تتبع الحاويات على ملفات راية: التفريغ، مدة ACT المجانية، الانتقائية، المعاينة، الإفراج.',
          )}
        </p>
        <p className="text-xs text-dim prose-ar flex items-start gap-1.5">
          <AlertTriangle size={12} className="shrink-0 mt-0.5" />
          {t(locale, 'Live carrier and terminal checks are shown above. Raya case milestones below are the agency operating record.', 'تظهر نتائج الناقل والمحطة المباشرة أعلاه. مراحل ملفات راية أدناه هي سجل العمل الداخلي للوكالة.')}
        </p>
      </div>

      <LiveTrackingWorkspace />
      {staffMode && (
        <>
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">{t(locale, 'Raya operations', 'عمليات راية')}</p>
            <h2 className="mt-1 text-xl font-semibold text-white">{t(locale, 'Case control board', 'لوحة متابعة الملفات')}</h2>
            <p className="mt-1 text-xs text-muted">{t(locale, 'Manage free time, selectivity, inspection and release separately from live ocean tracking.', 'أدر المدة المجانية والانتقائية والمعاينة والإفراج بشكل منفصل عن التتبع البحري المباشر.')}</p>
          </div>
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-dim" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setFocusId(null);
            }}
            placeholder={t(
              locale,
              'Container, B/L, declaration, tax…',
              'حاوية، بوليصة، بيان، ضريبي…',
            )}
            className="w-full rounded-lg bg-navy-900 border border-subtle ps-9 pe-3 py-2.5 text-sm text-white placeholder:text-dim"
          />
        </div>
        <a
          href={ACT_TRACK_PORTAL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
        >
          {t(locale, 'ACT main site', 'موقع ACT الرئيسي')}
          <ExternalLink size={14} />
        </a>
        <a
          href={ACT_N4_CAP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-accent/60 text-accent text-sm font-medium hover:bg-accent/10"
        >
          {t(locale, 'N4 CAP (live terminal)', 'N4 CAP (المحطة الحية)')}
          <ExternalLink size={14} />
        </a>
        <Link to="/act" className="text-sm text-muted hover:text-white">
          {t(locale, 'Free-day planner', 'مخطط الأيام المجانية')} →
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-2">
          {list.length === 0 && (
            <p className="text-sm text-dim">
              {t(locale, 'No containers match — cases need a container number.', 'لا حاويات مطابقة — الملفات تحتاج رقم حاوية.')}
            </p>
          )}
          {list.map((c) => (
            <button
              key={c.shipmentId}
              type="button"
              onClick={() => setFocusId(c.shipmentId)}
              className={`w-full text-start rounded-xl border px-3 py-3 transition ${
                focused?.shipmentId === c.shipmentId
                  ? 'border-accent bg-accent/10'
                  : 'border-subtle bg-elevated hover:border-accent/40'
              }`}
            >
              <div className="flex justify-between gap-2 items-start">
                <span className="font-mono text-sm text-white">{c.containerNo}</span>
                <RiskBadge risk={c.risk} locale={locale} />
              </div>
              <p className="text-[11px] text-dim mt-1">
                {c.declarationNo || c.blNo || c.shipmentId}
              </p>
              <p className="text-xs text-muted mt-1 line-clamp-1">
                {t(locale, c.customerNameEn, c.customerNameAr)}
              </p>
              <div className="flex flex-wrap gap-2 mt-2 items-center">
                {c.selectivityLane && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${LANE_STYLE[c.selectivityLane]}`}>
                    {c.selectivityLane}
                  </span>
                )}
                {c.freeDaysLeft !== null && (
                  <span
                    className={`text-[10px] font-mono ${
                      c.freeDaysLeft <= 1 ? 'text-danger' : 'text-dim'
                    }`}
                  >
                    {t(locale, 'Free', 'مجاني')}: {c.freeDaysLeft}d
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-3 rounded-xl border border-subtle bg-elevated p-5">
          {!focused ? (
            <p className="text-sm text-dim">{t(locale, 'Select a container', 'اختر حاوية')}</p>
          ) : (
            <>
              <div className="flex flex-wrap justify-between gap-3 mb-4">
                <div>
                  <p className="font-mono text-lg text-white">{focused.containerNo}</p>
                  <p className="text-xs text-muted mt-1">
                    {t(locale, focused.customerNameEn, focused.customerNameAr)} ·{' '}
                    {t(locale, focused.goodsEn, focused.goodsAr)}
                  </p>
                </div>
                <RiskBadge risk={focused.risk} locale={locale} />
              </div>
              <dl className="grid grid-cols-2 gap-3 text-xs mb-6">
                <div>
                  <dt className="text-dim">{t(locale, 'B/L', 'البوليصة')}</dt>
                  <dd className="font-mono text-slate-300">{focused.blNo || '—'}</dd>
                </div>
                <div>
                  <dt className="text-dim">{t(locale, 'Declaration', 'البيان')}</dt>
                  <dd className="font-mono text-slate-300">{focused.declarationNo || '—'}</dd>
                </div>
                <div>
                  <dt className="text-dim">{t(locale, 'Discharge', 'التفريغ')}</dt>
                  <dd className="font-mono text-slate-300">{focused.dischargeDate || '—'}</dd>
                </div>
                <div>
                  <dt className="text-dim">{t(locale, 'Last free day', 'آخر يوم مجاني')}</dt>
                  <dd
                    className={`font-mono ${
                      focused.freeDaysLeft !== null && focused.freeDaysLeft <= 1
                        ? 'text-danger'
                        : 'text-slate-300'
                    }`}
                  >
                    {focused.lastFreeDay || '—'}
                    {focused.freeDaysLeft !== null ? ` (${focused.freeDaysLeft}d)` : ''}
                  </dd>
                </div>
                {(() => {
                  const est = estimateDemurrageJod(focused.freeDaysLeft);
                  if (est === null) return null;
                  return (
                    <div className="col-span-2">
                      <dt className="text-dim">{t(locale, 'Est. demurrage (illustrative)', 'تقدير التأخير (توضيحي)')}</dt>
                      <dd className="font-mono text-danger">
                        ~{est} JOD
                        <span className="text-[10px] text-dim ms-2">
                          ({Math.abs(focused.freeDaysLeft!)}d × {ACT_OVERVIEW.illustrativeDemurrageJodPerDay} JOD)
                        </span>
                      </dd>
                      <p className="text-[9px] text-dim mt-0.5">
                        {t(locale, ACT_OVERVIEW.demurrageNoteEn, ACT_OVERVIEW.demurrageNoteAr)}
                      </p>
                    </div>
                  );
                })()}
                <div className="col-span-2">
                  <dt className="text-dim">{t(locale, 'Agency status', 'حالة الوكالة')}</dt>
                  <dd className="text-slate-300">{t(locale, focused.statusEn, focused.statusAr)}</dd>
                </div>
              </dl>

              {/* PCA open / Blue lane workflow note + checklist */}
              {(focused.pcaOpen || focused.selectivityLane === 'blue') && (
                <div className="mb-6 rounded-xl border border-sky-500/40 bg-sky-500/10 p-4 space-y-2">
                  <p className="text-sm font-semibold text-sky-200 flex items-center gap-2">
                    <AlertTriangle size={14} />
                    {t(
                      locale,
                      'Post-clearance audit (PCA) — open / blue lane',
                      'التدقيق اللاحق (PCA) — مفتوح / المسرب الأزرق',
                    )}
                  </p>
                  <p className="text-[11px] text-sky-100/90">
                    {t(
                      locale,
                      'Release does not close compliance exposure. Customs may still verify HS, origin, value and permits. Keep a complete audit pack.',
                      'الإفراج لا يغلق التعرض الامتثالي. قد تتحقق الجمارك لاحقاً من HS والمنشأ والقيمة والتصاريح. أبقِ حزمة تدقيق كاملة.',
                    )}
                  </p>
                  <div className="text-[10px] text-sky-100/80 space-y-0.5">
                    <p className="font-medium text-sky-200/90">
                      {t(locale, 'PCA checklist (keep ready):', 'قائمة تحقق PCA (أبقِها جاهزة):')}
                    </p>
                    <ul className="list-disc ps-4 space-y-0.5">
                      <li>{t(locale, 'Invoice + packing list (as declared)', 'الفاتورة + قائمة التعبئة (كما صُرّح)')}</li>
                      <li>{t(locale, 'B/L or AWB + delivery order refs', 'البوليصة + مراجع أمر التسليم')}</li>
                      <li>{t(locale, 'Certificate of origin (if preference claimed)', 'شهادة المنشأ (إن وُجدت مطالبة تفضيلية)')}</li>
                      <li>{t(locale, 'Permits & lab results (JFDA / JSMO / Agri…)', 'التصاريح ونتائج المختبر')}</li>
                      <li>{t(locale, 'Declaration print + assessment + payment receipts', 'طباعة البيان + التقدير + إيصالات الدفع')}</li>
                      <li>{t(locale, 'Broker authorization & amendment approvals', 'تفويض المخلص وموافقات التعديل')}</li>
                      <li>{t(locale, 'Inspection Act (if any exam occurred)', 'محضر المعاينة (إن حدثت معاينة)')}</li>
                    </ul>
                  </div>
                  <p className="text-[10px] text-dim">
                    {t(
                      locale,
                      'On audit notice: freeze deletions, appoint one response owner, meet the deadline. See full guide on the ASYCUDA page.',
                      'عند إشعار التدقيق: أوقف الحذف، عيّن مسؤولاً واحداً، التزم بالمهلة. الدليل الكامل في صفحة الأسيكودا.',
                    )}
                  </p>
                  <Link to="/asycuda" className="text-[10px] text-accent hover:underline inline-block">
                    {t(locale, 'Full PCA guide on ASYCUDA page →', 'دليل PCA الكامل في صفحة الأسيكودا →')}
                  </Link>
                </div>
              )}

              {/* N4 CAP Live Terminal Status */}
              <div className="mb-6 rounded-xl border border-accent/40 bg-navy-900/60 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-accent text-sm">
                      {t(locale, 'Live Terminal Status (N4 CAP)', 'حالة المحطة الحية (N4 CAP)')}
                    </p>
                    <p className="text-[11px] text-dim">
                      {t(locale, 'Exact discharge, gate movements, EDO & storage clock', 'التفريغ الدقيق، حركات البوابة، حالة EDO وساعة التخزين')}
                    </p>
                  </div>
                  <a
                    href={ACT_N4_CAP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90"
                  >
                    {t(locale, 'Open N4 CAP', 'افتح N4 CAP')}
                    <ExternalLink size={12} />
                  </a>
                </div>
                <p className="text-[11px] text-muted bg-navy-950/70 rounded p-2 mb-3 prose-ar">
                  {t(locale, 'Use ACT-provided access for real-time terminal events (more accurate than calculated free days).', 'استخدم صلاحية الوصول التي توفرها ACT لأحداث المحطة المباشرة (أدق من الأيام المجانية المحسوبة).')}
                </p>

                {/* Quick usage guide for N4 CAP */}
                <div className="text-[10px] text-dim space-y-1">
                  <p className="font-medium text-muted">{t(locale, 'Quick guide in N4 CAP:', 'دليل سريع في N4 CAP:')}</p>
                  <ul className="list-disc ps-4 space-y-0.5">
                    <li>{t(locale, 'Units → Units → select Import/Export/Empty inquiry', 'Units → Units → اختر استعلام الوارد/الصادر/الفارغ')}</li>
                    <li>{t(locale, 'Search by container number or B/L', 'ابحث برقم الحاوية أو البوليصة')}</li>
                    <li>{t(locale, 'Right-click container → History for full timeline', 'انقر يمين على الحاوية → History للخط الزمني الكامل')}</li>
                    <li>{t(locale, 'Look for: Discharge time, Gate Out, EDO issuance, Storage start', 'ابحث عن: وقت التفريغ، الخروج من البوابة، إصدار EDO، بدء التخزين')}</li>
                  </ul>
                  <p className="mt-1 text-[9px] italic">{t(locale, 'Manually update dischargeDate or status in Raya after checking N4 CAP for accuracy.', 'حدّث dischargeDate أو الحالة يدوياً في راية بعد التحقق من N4 CAP للدقة.')}</p>
                </div>

                {/* Quick terminal sync actions + events log */}
                {focused && (
                  <div className="mt-3 pt-3 border-t border-subtle/50 space-y-3">
                    <p className="text-[10px] font-medium text-muted">
                      {t(locale, 'Quick actions from N4 CAP:', 'إجراءات سريعة من N4 CAP:')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const today = todayISO();
                          const noteEn = `Discharge confirmed via N4 CAP on ${today}`;
                          const noteAr = `تم تأكيد التفريغ عبر N4 CAP في ${today}`;
                          const prevEn = focused.agentNoteEn || '';
                          const prevAr = focused.agentNoteAr || '';
                          applyTerminalUpdate(
                            {
                              dischargeDate: today,
                              agentNoteEn: prevEn ? `${prevEn}\n• ${noteEn}` : noteEn,
                              agentNoteAr: prevAr ? `${prevAr}\n• ${noteAr}` : noteAr,
                            },
                            'Discharge marked from N4 CAP',
                          );
                        }}
                        className="text-[10px] px-2.5 py-1 rounded border border-accent/50 text-accent hover:bg-accent/10"
                      >
                        {t(locale, 'Mark discharged (today)', 'تسجيل التفريغ (اليوم)')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const today = todayISO();
                          const noteEn = `Gate-out / EDO confirmed via N4 CAP on ${today}`;
                          const noteAr = `تم تأكيد الخروج / EDO عبر N4 CAP في ${today}`;
                          const prevEn = focused.agentNoteEn || '';
                          const prevAr = focused.agentNoteAr || '';
                          applyTerminalUpdate(
                            {
                              agentNoteEn: prevEn ? `${prevEn}\n• ${noteEn}` : noteEn,
                              agentNoteAr: prevAr ? `${prevAr}\n• ${noteAr}` : noteAr,
                            },
                            'Gate-out / EDO logged from N4 CAP',
                          );
                        }}
                        className="text-[10px] px-2.5 py-1 rounded border border-subtle hover:bg-navy-900 text-muted"
                      >
                        {t(locale, 'Log EDO / Gate Out', 'تسجيل EDO / الخروج')}
                      </button>
                    </div>

                    {/* Free-form terminal note */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-dim">
                        {t(locale, 'Add terminal event note', 'أضف ملاحظة حدث محطة')}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={terminalNote}
                          onChange={(e) => setTerminalNote(e.target.value)}
                          placeholder={t(locale, 'e.g. Storage started 2026-07-20 / EDO #12345', 'مثال: بدأ التخزين 2026-07-20 / EDO #12345')}
                          className="flex-1 rounded-lg bg-navy-950 border border-subtle px-2.5 py-1.5 text-[11px] text-white placeholder:text-dim"
                        />
                        <button
                          type="button"
                          disabled={!terminalNote.trim()}
                          onClick={() => {
                            if (!terminalNote.trim() || !focused) return;
                            const today = todayISO();
                            const noteEn = `[N4 CAP ${today}] ${terminalNote.trim()}`;
                            const noteAr = `[N4 CAP ${today}] ${terminalNote.trim()}`;
                            const prevEn = focused.agentNoteEn || '';
                            const prevAr = focused.agentNoteAr || '';
                            applyTerminalUpdate(
                              {
                                agentNoteEn: prevEn ? `${prevEn}\n• ${noteEn}` : noteEn,
                                agentNoteAr: prevAr ? `${prevAr}\n• ${noteAr}` : noteAr,
                              },
                              'Terminal note added',
                            );
                          }}
                          className="text-[10px] px-2.5 py-1.5 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 disabled:opacity-40"
                        >
                          {t(locale, 'Add', 'إضافة')}
                        </button>
                      </div>
                    </div>

                    {/* Terminal Events Log */}
                    <div className="rounded-lg border border-subtle bg-navy-950/50 p-2.5">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Clock size={12} className="text-accent" />
                        <p className="text-[10px] font-medium text-muted">
                          {t(locale, 'Terminal Events Log', 'سجل أحداث المحطة')}
                        </p>
                      </div>
                      {focused.dischargeDate && (
                        <p className="text-[10px] text-slate-300 mb-1">
                          • {t(locale, 'Discharge', 'التفريغ')}: <span className="font-mono text-emerald-300">{focused.dischargeDate}</span>
                        </p>
                      )}
                      {focused.lastFreeDay && (
                        <p className="text-[10px] text-slate-300 mb-1">
                          • {t(locale, 'Last free day', 'آخر يوم مجاني')}: <span className="font-mono">{focused.lastFreeDay}</span>
                          {focused.freeDaysLeft !== null && (
                            <span className={focused.freeDaysLeft <= 1 ? ' text-danger' : ' text-dim'}>
                              {' '}({focused.freeDaysLeft}d)
                            </span>
                          )}
                        </p>
                      )}
                      {focused.agentNoteEn || focused.agentNoteAr ? (
                        <div className="mt-1.5 text-[10px] text-dim whitespace-pre-wrap leading-relaxed border-t border-subtle/50 pt-1.5">
                          {t(locale, focused.agentNoteEn || '', focused.agentNoteAr || '')}
                        </div>
                      ) : (
                        <p className="text-[10px] text-dim italic">
                          {t(locale, 'No terminal notes yet. Use the actions above after checking N4 CAP.', 'لا ملاحظات محطة بعد. استخدم الإجراءات أعلاه بعد التحقق من N4 CAP.')}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <details className="rounded-xl border border-subtle bg-navy-950/45 p-4 text-xs">
                <summary className="cursor-pointer font-semibold text-slate-300">
                  {t(locale, 'Tracking source rules', 'قواعد مصادر التتبع')}
                </summary>
                <ul className="mt-3 list-disc space-y-1.5 ps-4 text-[11px] leading-relaxed text-muted">
                  <li>{t(locale, 'Carrier data describes the ocean journey; it does not prove Customs release.', 'بيانات الناقل تصف الرحلة البحرية ولا تثبت الإفراج الجمركي.')}</li>
                  <li>{t(locale, 'APM/ACT events control Aqaba discharge and gate facts when available.', 'تتحكم أحداث APM/ACT في حقائق التفريغ والبوابات في العقبة عند توفرها.')}</li>
                  <li>{t(locale, 'Free time, EDO and release must be confirmed against the operational record before action.', 'يجب تأكيد المدة المجانية وEDO والإفراج مقابل السجل التشغيلي قبل اتخاذ الإجراء.')}</li>
                </ul>
              </details>              {(() => {
                const car = detectCarrier(focused.containerNo);
                if (!car) return null;
                const url = car.trackUrl(focused.containerNo, 'container');
                return (
                  <div className="mb-4 rounded-lg border border-subtle px-3 py-2 text-xs">
                    <p className="text-muted mb-1">
                      {t(locale, 'Likely carrier', 'الخط المحتمل')}:{' '}
                      <span className="text-white">{locale === 'ar' ? car.nameAr : car.nameEn}</span>
                    </p>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      {t(locale, 'Open public track', 'فتح التتبع العام')} ↗
                    </a>
                    {' · '}
                    <Link to="/staff/assist" className="text-accent hover:underline">
                      {t(locale, 'Carrier agent', 'وكيل الخط')} →
                    </Link>
                  </div>
                );
              })()}
              <h2 className="text-sm font-semibold text-white mb-3">
                {t(locale, 'Timeline', 'الخط الزمني')}
              </h2>
              <Timeline card={focused} locale={locale} />
            </>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}