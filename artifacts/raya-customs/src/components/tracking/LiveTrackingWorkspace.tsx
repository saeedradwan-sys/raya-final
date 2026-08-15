import { useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MapPin,
  Radio,
  Search,
  Ship,
} from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { t } from '@/lib/i18n';
import {
  buildPublicTrackingLink,
  hasValidIsoContainerCheckDigit,
  isIsoContainerFormat,
  listPublicCarriers,
} from '@/lib/agents/carrierTrackAgent';
import { ACT_N4_CAP_URL } from '@/lib/containerTracking';
import { getBestTerminalTracking, type TerminalTrackingResult, type TrackingAttempt } from '@/lib/terminalApis';
import type { NormalizedDcsaEvent } from '@/lib/dcsaTypes';

const EVENT_LABELS: Record<NormalizedDcsaEvent['eventType'], { en: string; ar: string }> = {
  LOAD: { en: 'Loaded on vessel', ar: 'تم التحميل على السفينة' },
  DISCH: { en: 'Discharged from vessel', ar: 'تم التفريغ من السفينة' },
  GTIN: { en: 'Gate in', ar: 'دخول البوابة' },
  GTOT: { en: 'Gate out', ar: 'خروج البوابة' },
  RESTOW: { en: 'Restowed', ar: 'إعادة رص الحاوية' },
  ARRI: { en: 'Vessel arrived', ar: 'وصلت السفينة' },
  DEPA: { en: 'Vessel departed', ar: 'غادرت السفينة' },
  AVPU: { en: 'Available for pickup', ar: 'جاهزة للاستلام' },
  AVDO: { en: 'Available for drop-off', ar: 'جاهزة للإرجاع' },
  UNKNOWN: { en: 'Carrier update', ar: 'تحديث من الناقل' },
};

const PROVIDER_LABELS: Record<string, string> = {
  '17track': '17TRACK',
  apm: 'APM Aqaba',
  maersk: 'Maersk',
  aggregator: 'Aggregator',
};

const CARRIERS = listPublicCarriers();
const DATE_FORMATTERS = {
  en: new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Amman',
  }),
  ar: new Intl.DateTimeFormat('ar-JO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Amman',
  }),
};

function eventDate(value: string | null, locale: 'en' | 'ar') {
  if (!value) return t(locale, 'Time not supplied', 'لم يتم توفير الوقت');
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return DATE_FORMATTERS[locale].format(parsed);

}

function attemptMessage(attempt: TrackingAttempt, locale: 'en' | 'ar') {
  if (!attempt.configured) return t(locale, 'Not configured', 'غير مهيأ');
  if (attempt.ok) return t(locale, `${attempt.eventCount || 0} events`, `${attempt.eventCount || 0} أحداث`);
  if (attempt.reason === 'container_required') return t(locale, 'Container number required', 'يتطلب رقم حاوية');
  if (attempt.reason === 'no_events') return t(locale, 'No events returned', 'لم يتم إرجاع أحداث');
  if (attempt.reason?.startsWith('provider_rejected')) return t(locale, 'Reference not accepted', 'لم يقبل المزود الرقم');
  if (attempt.reason === 'authentication_failed') return t(locale, 'Provider authentication failed', 'فشل توثيق المزود');
  if (attempt.reason === 'timeout') return t(locale, 'Timed out', 'انتهت مهلة الاتصال');
  return t(locale, 'Unavailable', 'غير متاح');
}

function AttemptBadge({ attempt, locale }: { attempt: TrackingAttempt; locale: 'en' | 'ar' }) {
  const tone = attempt.ok
    ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
    : attempt.configured
      ? 'border-amber-400/25 bg-amber-400/10 text-amber-100'
      : 'border-subtle bg-navy-950/60 text-dim';
  return (
    <div className={`rounded-xl border px-3 py-2 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold">{attempt.label || PROVIDER_LABELS[attempt.provider] || attempt.provider}</span>
        <span className="text-[10px]">{attempt.durationMs ? `${attempt.durationMs} ms` : ''}</span>
      </div>
      <p className="mt-1 text-[10px] opacity-80">{attemptMessage(attempt, locale)}</p>
      {attempt.detail ? <p className="mt-1 text-[10px] leading-relaxed opacity-65">{attempt.detail}</p> : null}
    </div>
  );
}

export default function LiveTrackingWorkspace() {
  const { locale } = useLocale();
  const { session } = useStaffAuth();
  const [reference, setReference] = useState('');
  const [submittedReference, setSubmittedReference] = useState('');
  const [selectedCarrierId, setSelectedCarrierId] = useState('');
  const [result, setResult] = useState<TerminalTrackingResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const requestSequence = useRef(0);
  const normalizedDraft = reference.trim().toUpperCase().replace(/\s+/g, '');
  const draftHasInvalidCheckDigit = isIsoContainerFormat(normalizedDraft)
    && !hasValidIsoContainerCheckDigit(normalizedDraft);
  const referenceKind = isIsoContainerFormat(submittedReference) ? 'container' : 'bl';
  const publicTracking = buildPublicTrackingLink(
    submittedReference,
    referenceKind,
    selectedCarrierId || undefined,
  );
  const automaticallyDetectedCarrier = buildPublicTrackingLink(
    submittedReference,
    referenceKind,
  ).carrier;
  const carrierWasSelected = Boolean(selectedCarrierId && publicTracking.carrier);
  const orderedEvents = useMemo(() => {
    if (!result) return [];
    return [...result.events].sort((left, right) => {
      const leftTime = left.eventTime ? Date.parse(left.eventTime) : Number.POSITIVE_INFINITY;
      const rightTime = right.eventTime ? Date.parse(right.eventTime) : Number.POSITIVE_INFINITY;
      return leftTime - rightTime;
    });
  }, [result]);
  const latestEvent = orderedEvents.length ? orderedEvents[orderedEvents.length - 1] : null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = reference.trim().toUpperCase().replace(/\s+/g, '');
    setSubmittedReference(normalized);
    setResult(null);
    setError('');
    if (!normalized) return;
    if (!session?.accessToken) {
      setError(t(locale, 'Your staff session has expired. Sign in again before tracking.', 'انتهت جلسة الموظف. سجل الدخول مرة أخرى قبل التتبع.'));
      return;
    }
    const kind = isIsoContainerFormat(normalized) ? 'container' : 'bl';
    const carrier = buildPublicTrackingLink(normalized, kind, selectedCarrierId || undefined).carrier;
    const requestId = ++requestSequence.current;
    setPending(true);
    try {
      const trackingResult = await getBestTerminalTracking(normalized, {
        token: session.accessToken,
        carrierId: carrier?.id,
      });
      if (requestId === requestSequence.current) setResult(trackingResult);
    } catch {
      if (requestId !== requestSequence.current) return;
      setError(t(locale, 'Raya could not reach the tracking services. Retry, then use the official carrier link.', 'تعذر على راية الوصول إلى خدمات التتبع. أعد المحاولة ثم استخدم رابط الناقل الرسمي.'));
    } finally {
      if (requestId === requestSequence.current) setPending(false);
    }
  }

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-accent/35 bg-navy-900/75 shadow-xl shadow-black/15">
      <div className="border-b border-subtle bg-gradient-to-br from-navy-800/90 to-navy-950/90 p-5 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Ship size={21} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
                {t(locale, 'Live shipment intelligence', 'معلومات الشحنة المباشرة')}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-white">
                {t(locale, 'One search. One reconciled timeline.', 'بحث واحد. خط زمني موحد.')}
              </h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted prose-ar">
                {t(locale, 'Raya checks configured carrier and Aqaba-terminal sources, removes duplicate events, and labels every milestone by source.', 'تتحقق راية من مصادر الناقل ومحطة العقبة المهيأة، وتزيل الأحداث المكررة، وتوضح مصدر كل مرحلة.')}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1.5 text-[10px] font-medium text-sky-100">
            <Radio size={12} />
            {t(locale, 'Staff-only provider access', 'وصول المزود للموظفين فقط')}
          </span>
        </div>
      </div>

      <div className="p-5 lg:p-6">
        <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px_auto] lg:items-end" onSubmit={submit}>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted" htmlFor="tracking-reference">
              {t(locale, 'Container or master B/L', 'رقم الحاوية أو البوليصة الرئيسية')}
            </label>
            <input
              id="tracking-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="ECMU5691535"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-xl border border-subtle bg-navy-950 px-4 py-3 font-mono text-sm uppercase text-white placeholder:text-dim focus:border-accent focus:outline-none"
            />
            {draftHasInvalidCheckDigit ? (
              <p className="mt-1.5 text-[10px] leading-relaxed text-amber-200">
                {t(locale, 'The ISO 6346 check digit does not match. Confirm the container number before using paid provider quota.', '\u0631\u0642\u0645 \u0627\u0644\u062a\u062d\u0642\u0642 ISO 6346 \u063a\u064a\u0631 \u0645\u0637\u0627\u0628\u0642. \u0623\u0643\u062f \u0631\u0642\u0645 \u0627\u0644\u062d\u0627\u0648\u064a\u0629 \u0642\u0628\u0644 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u062d\u0635\u0629 \u0627\u0644\u0645\u0632\u0648\u062f \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0629.')}
              </p>
            ) : null}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted" htmlFor="tracking-carrier">
              {t(locale, 'Carrier override', 'تحديد الناقل يدوياً')}
            </label>
            <select
              id="tracking-carrier"
              value={selectedCarrierId}
              onChange={(event) => setSelectedCarrierId(event.target.value)}
              className="w-full rounded-xl border border-subtle bg-navy-950 px-4 py-3 text-sm text-white focus:border-accent focus:outline-none"
            >
              <option value="">{t(locale, 'Detect automatically', 'اكتشاف تلقائي')}</option>
              {CARRIERS.map((carrier) => (
                <option key={carrier.id} value={carrier.id}>{locale === 'ar' ? carrier.nameAr : carrier.nameEn}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={!reference.trim() || pending}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Search size={16} />
            {pending ? t(locale, 'Reconciling…', 'جارٍ توحيد النتائج…') : t(locale, 'Track shipment', 'تتبع الشحنة')}
          </button>
        </form>

        {error ? (
          <div className="mt-5 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
        ) : null}

        {submittedReference && !pending ? (
          <div className="mt-6 space-y-4" aria-live="polite">
            <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-subtle bg-navy-950/65 p-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-lg font-semibold text-white">{submittedReference}</span>
                  <span className="rounded-full bg-navy-800 px-2 py-1 text-[10px] text-muted">
                    {referenceKind === 'container' ? t(locale, 'Container', 'حاوية') : t(locale, 'B/L', 'بوليصة')}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {publicTracking.carrier
                    ? `${(carrierWasSelected ? t(locale, 'Selected carrier', '\u0627\u0644\u0646\u0627\u0642\u0644 \u0627\u0644\u0645\u062e\u062a\u0627\u0631') : t(locale, 'Detected carrier', 'الناقل المكتشف'))}: ${locale === 'ar' ? publicTracking.carrier.nameAr : publicTracking.carrier.nameEn}`
                    : t(locale, 'Carrier could not be confirmed from the reference.', 'تعذر تأكيد الناقل من الرقم.')}
                </p>
                {referenceKind === 'container' && carrierWasSelected && !automaticallyDetectedCarrier ? (
                  <p className="mt-1 max-w-xl text-[10px] leading-relaxed text-amber-200/80">
                    {t(
                      locale,
                      'The container prefix identifies the equipment owner, not necessarily the ocean carrier. Confirm the selected line from the master B/L.',
                      '\u062a\u062d\u062f\u062f \u0628\u0627\u062f\u0626\u0629 \u0627\u0644\u062d\u0627\u0648\u064a\u0629 \u0645\u0627\u0644\u0643 \u0627\u0644\u0645\u0639\u062f\u0629\u060c \u0648\u0644\u064a\u0633 \u0628\u0627\u0644\u0636\u0631\u0648\u0631\u0629 \u0627\u0644\u0646\u0627\u0642\u0644 \u0627\u0644\u0628\u062d\u0631\u064a. \u0623\u0643\u062f \u0627\u0644\u062e\u0637 \u0627\u0644\u0645\u062e\u062a\u0627\u0631 \u0645\u0646 \u0627\u0644\u0628\u0648\u0644\u064a\u0635\u0629 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629.',
                    )}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {publicTracking.url ? (
                  <a href={publicTracking.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-accent/50 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/10">
                    {t(locale, 'Official carrier', 'موقع الناقل الرسمي')} <ExternalLink size={13} />
                  </a>
                ) : null}
                <a href={result?.n4CapUrl || ACT_N4_CAP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-400/5">
                  ACT N4 CAP <ExternalLink size={13} />
                </a>
              </div>
            </div>

            {result?.live && latestEvent ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/8 p-4">
                    <CheckCircle2 size={17} className="text-emerald-300" />
                    <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-emerald-200/70">{t(locale, 'Latest milestone', 'آخر مرحلة')}</p>
                    <p className="mt-1 text-sm font-semibold text-white">{t(locale, EVENT_LABELS[latestEvent.eventType].en, EVENT_LABELS[latestEvent.eventType].ar)}</p>
                  </div>
                  <div className="rounded-xl border border-subtle bg-navy-950/55 p-4">
                    <MapPin size={17} className="text-accent" />
                    <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-dim">{t(locale, 'Last location', 'آخر موقع')}</p>
                    <p className="mt-1 text-sm font-semibold text-white">{latestEvent.locationName || latestEvent.locationCode || t(locale, 'Not supplied', 'غير متوفر')}</p>
                  </div>
                  <div className="rounded-xl border border-subtle bg-navy-950/55 p-4">
                    <Clock3 size={17} className="text-accent" />
                    <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-dim">{t(locale, 'Last event time', 'وقت آخر حدث')}</p>
                    <p className="mt-1 text-sm font-semibold text-white">{eventDate(latestEvent.eventTime, locale)}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-subtle bg-navy-950/55 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-white">{t(locale, 'Reconciled timeline', 'الخط الزمني الموحد')}</h3>
                    <span className="text-[10px] text-dim">{t(locale, `Checked ${eventDate(result.checkedAt, locale)}`, `تم الفحص ${eventDate(result.checkedAt, locale)}`)}</span>
                  </div>
                  <ol className="mt-4 space-y-0">
                    {orderedEvents.map((event, index) => (
                      <li key={`${event.sourceProvider}-${event.eventType}-${event.eventTime || index}`} className="relative grid grid-cols-[24px_minmax(0,1fr)] gap-3 pb-5 last:pb-0">
                        <div className="relative flex justify-center">
                          {index < orderedEvents.length - 1 ? <span className="absolute top-3 h-full w-px bg-subtle" /> : null}
                          <span className={`relative mt-1 h-3 w-3 rounded-full border-2 ${event.classifier === 'ACT' ? 'border-emerald-300 bg-emerald-400' : 'border-accent bg-navy-950'}`} />
                        </div>
                        <div className="rounded-lg border border-subtle/80 bg-navy-900/65 px-3 py-2.5">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold text-white">{t(locale, EVENT_LABELS[event.eventType].en, EVENT_LABELS[event.eventType].ar)}</p>
                              <p className="mt-1 text-[11px] text-muted">{eventDate(event.eventTime, locale)}{event.locationName || event.locationCode ? ` · ${event.locationName || event.locationCode}` : ''}</p>
                            </div>
                            <div className="flex gap-1.5">
                              {event.classifier ? <span className="rounded bg-navy-800 px-1.5 py-0.5 text-[9px] text-muted">{event.classifier}</span> : null}
                              <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[9px] text-accent">{event.sourceLabel || PROVIDER_LABELS[event.sourceProvider || ''] || result.sourceLabel}</span>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            ) : result ? (
              <div className="rounded-xl border border-amber-400/25 bg-amber-400/7 p-4">
                <div className="flex gap-3">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-200" />
                  <div>
                    <p className="text-sm font-semibold text-amber-100">{t(locale, 'No verified live events were returned', 'لم يتم إرجاع أحداث مباشرة مؤكدة')}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{t(locale, 'This does not mean the shipment has not moved. Confirm the reference and carrier, then use the official carrier page and ACT N4 CAP.', 'هذا لا يعني أن الشحنة لم تتحرك. أكد الرقم والناقل، ثم استخدم موقع الناقل الرسمي وبوابة ACT N4 CAP.')}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {result ? (
              <details className="rounded-xl border border-subtle bg-navy-950/45 p-4">
                <summary className="cursor-pointer text-xs font-semibold text-slate-300">{t(locale, 'Source diagnostics', 'تشخيص المصادر')}</summary>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {result.attempts.map((attempt) => <AttemptBadge key={attempt.provider} attempt={attempt} locale={locale} />)}
                </div>
                <p className="mt-3 text-[10px] leading-relaxed text-dim">{result.disclaimer}</p>
              </details>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
