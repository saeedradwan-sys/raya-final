import { useMemo, useState } from 'react';
import { allShipments } from '@/lib/recordStore';
import { Container, ExternalLink, CalendarClock, AlertTriangle } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';
import { ACT_OVERVIEW, ACT_FREE_DAY_RULES } from '@/content/act';
import {
  addCalendarDays,
  dateErrorMessage,
  formatDate,
  formatDateISO,
  todayISO,
  validateDateInput,
} from '@/lib/dates';

export default function ActPage() {
  const { locale } = useLocale();
  const [dischargeDate, setDischargeDate] = useState(() => todayISO());
  const [ruleIndex, setRuleIndex] = useState(0);
  const [touched, setTouched] = useState(false);
  const [batchText, setBatchText] = useState('');

  const rule = ACT_FREE_DAY_RULES[ruleIndex] ?? ACT_FREE_DAY_RULES[0];

  const batchRows = useMemo(() => {
    const lines = batchText
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const out: { ref: string; discharge: string; lastFree: string | null; error?: string }[] = [];
    for (const line of lines) {
      // format: REF,YYYY-MM-DD  or just date
      const parts = line.split(/[,;\t]/).map((x) => x.trim());
      let ref = parts[0] || '';
      let dateStr = parts[1] || parts[0];
      if (parts.length === 1 && /^\d{4}-\d{2}-\d{2}$/.test(parts[0])) {
        ref = parts[0];
        dateStr = parts[0];
      }
      const v = validateDateInput(dateStr);
      if (!v.ok || !v.date) {
        out.push({ ref, discharge: dateStr, lastFree: null, error: v.error || 'invalid' });
        continue;
      }
      try {
        const lastFree = addCalendarDays(v.date, rule.freeDays);
        out.push({ ref, discharge: dateStr, lastFree: formatDateISO(lastFree) });
      } catch {
        out.push({ ref, discharge: dateStr, lastFree: null, error: 'calc' });
      }
    }
    return out;
  }, [batchText, rule]);

  function loadFromCases() {
    const ships = allShipments().filter((s) => s.dischargeDate);
    const lines = ships.map((s) => `${s.declarationNo || s.blNo || s.id},${s.dischargeDate}`);
    setBatchText(lines.join('\n'));
  }

  const validation = useMemo(() => validateDateInput(dischargeDate), [dischargeDate]);

  const result = useMemo(() => {
    if (!validation.ok || !validation.date || !rule) return null;
    try {
      const lastFree = addCalendarDays(validation.date, rule.freeDays);
      const demurrageStart = addCalendarDays(validation.date, rule.freeDays + 1);
      return { lastFree, demurrageStart, freeDays: rule.freeDays };
    } catch {
      return null;
    }
  }, [validation, rule]);

  const showError = touched && !validation.ok;
  const errorText =
    showError && validation.error ? dateErrorMessage(validation.error, locale) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 lg:px-8 py-12">
      <div className="max-w-3xl mb-10">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-navy-700 text-accent mb-4">
          <Container size={22} />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
          {t(locale, ACT_OVERVIEW.titleEn, ACT_OVERVIEW.titleAr)}
        </h1>
        <p className="text-muted text-sm leading-relaxed mb-3">
          {t(locale, ACT_OVERVIEW.whatEn, ACT_OVERVIEW.whatAr)}
        </p>
        <p className="text-xs text-dim leading-relaxed">
          {t(locale, ACT_OVERVIEW.portalNoteEn, ACT_OVERVIEW.portalNoteAr)}
        </p>
      </div>

      <div className="mb-8 p-4 rounded-xl bg-elevated border border-subtle flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {t(
            locale,
            'Always verify live free time and demurrage on the official ACT customer portal.',
            'تحقق دائماً من المدة المجانية وغرامات التأخير الحية على بوابة عملاء ACT الرسمية.',
          )}
        </p>
        <a
          href={ACT_OVERVIEW.portalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-accent hover:underline shrink-0"
        >
          {t(locale, 'Open ACT portal', 'فتح بوابة ACT')}
          <ExternalLink size={14} />
        </a>
      </div>

      <div className="rounded-xl bg-elevated border border-subtle p-6 mb-10">
        <div className="flex items-center gap-2 mb-5">
          <CalendarClock size={18} className="text-accent" />
          <h2 className="text-base font-semibold text-white">
            {t(locale, 'Last free day planner', 'مخطط آخر يوم مجاني')}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-dim mb-1.5" htmlFor="act-discharge">
              {t(locale, 'Discharge / availability date', 'تاريخ التفريغ / التوفر')}
            </label>
            <input
              id="act-discharge"
              type="date"
              value={dischargeDate}
              min="2000-01-01"
              max="2100-12-31"
              onChange={(e) => {
                setDischargeDate(e.target.value);
                setTouched(true);
              }}
              onBlur={() => setTouched(true)}
              aria-invalid={showError}
              aria-describedby={errorText ? 'act-date-error' : undefined}
              className={`w-full rounded-lg bg-navy-900 border px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent ${
                showError ? 'border-danger' : 'border-subtle'
              }`}
            />
            {errorText && (
              <p
                id="act-date-error"
                role="alert"
                className="mt-2 text-xs text-danger flex items-start gap-1.5"
              >
                <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                {errorText}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-dim mb-1.5" htmlFor="act-cargo">
              {t(locale, 'Cargo / container type', 'نوع البضاعة / الحاوية')}
            </label>
            <select
              id="act-cargo"
              value={ruleIndex}
              onChange={(e) => setRuleIndex(Number(e.target.value))}
              className="w-full rounded-lg bg-navy-900 border border-subtle px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent"
            >
              {ACT_FREE_DAY_RULES.map((r, i) => (
                <option key={r.cargoTypeEn} value={i}>
                  {t(locale, r.cargoTypeEn, r.cargoTypeAr)} ({r.freeDays}{' '}
                  {t(locale, 'days', 'أيام')})
                </option>
              ))}
            </select>
          </div>
        </div>

        {result && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg bg-navy-900 border border-subtle p-4">
              <p className="text-xs text-dim mb-1">
                {t(locale, 'Planning free days', 'أيام مجانية تخطيطية')}
              </p>
              <p className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                {result.freeDays}
              </p>
            </div>
            <div className="rounded-lg bg-navy-900 border border-subtle p-4">
              <p className="text-xs text-dim mb-1">
                {t(locale, 'Est. last free day', 'آخر يوم مجاني تقديري')}
              </p>
              <p className="text-lg font-semibold text-success">
                {formatDate(result.lastFree, locale, { style: 'full' })}
              </p>
            </div>
            <div className="rounded-lg bg-navy-900 border border-subtle p-4">
              <p className="text-xs text-dim mb-1">
                {t(locale, 'Demurrage may start', 'قد يبدأ التأخير')}
              </p>
              <p className="text-lg font-semibold text-warning">
                {formatDate(result.demurrageStart, locale, { style: 'full' })}
              </p>
            </div>
          </div>
        )}

        {!result && touched && !validation.ok && (
          <div className="rounded-lg bg-danger/10 border border-danger/30 p-4 text-xs text-red-300">
            {t(
              locale,
              'Cannot calculate free days until a valid discharge date is entered.',
              'لا يمكن حساب الأيام المجانية قبل إدخال تاريخ تفريغ صالح.',
            )}
          </div>
        )}

        <div className="mt-4 flex items-start gap-2 text-xs text-dim">
          <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
          <p>
            {t(
              locale,
              rule?.noteEn ??
                'Illustrative free days for planning. Confirm exact start rule (discharge vs availability) and holidays on the ACT tariff.',
              rule?.noteAr ??
                'أيام مجانية إرشادية للتخطيط. أكد قاعدة البداية الدقيقة (التفريغ مقابل التوفر) والعطل على تعرفة ACT.',
            )}
          </p>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
        {t(locale, 'Planning free-day reference', 'مرجع الأيام المجانية التخطيطي')}
      </h2>
      <div className="overflow-x-auto rounded-xl border border-subtle">
        <table className="w-full text-sm" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
          <thead>
            <tr className={`bg-navy-800 text-dim text-xs ${locale === 'ar' ? '' : 'uppercase tracking-wider'}`}>
              <th className="text-start px-4 py-3 font-medium">{t(locale, 'Type', 'النوع')}</th>
              <th className="text-start px-4 py-3 font-medium">
                {t(locale, 'Free days', 'أيام مجانية')}
              </th>
              <th className="text-start px-4 py-3 font-medium">{t(locale, 'Note', 'ملاحظة')}</th>
            </tr>
          </thead>
          <tbody>
            {ACT_FREE_DAY_RULES.map((r) => (
              <tr key={r.cargoTypeEn} className="border-t border-subtle">
                <td className="px-4 py-3 text-white">{t(locale, r.cargoTypeEn, r.cargoTypeAr)}</td>
                <td className="px-4 py-3 text-accent font-semibold" dir="ltr">
                  {locale === 'ar'
                    ? r.freeDays.toLocaleString('ar-JO')
                    : r.freeDays}
                </td>
                <td className="px-4 py-3 text-muted text-xs">{t(locale, r.noteEn, r.noteAr)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl bg-elevated border border-subtle p-6 mb-10">
        <h2 className="text-base font-semibold text-white mb-2">
          {t(locale, 'Batch free-day planner', 'مخطط الأيام المجانية الجماعي')}
        </h2>
        <p className="text-xs text-dim mb-3 prose-ar">
          {t(
            locale,
            'One line per container: DeclarationOrBL,YYYY-MM-DD — uses the cargo type selected above.',
            'سطر لكل حاوية: رقم_البيان_أو_البوليصة,YYYY-MM-DD — يستخدم نوع البضاعة المختار أعلاه.',
          )}
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            onClick={loadFromCases}
            className="text-xs px-3 py-1.5 rounded-lg border border-subtle text-muted hover:text-white"
          >
            {t(locale, 'Load discharge dates from cases', 'تحميل تواريخ التفريغ من الملفات')}
          </button>
        </div>
        <textarea
          className="w-full rounded-lg bg-navy-900 border border-subtle px-3 py-2 text-sm text-white font-mono min-h-[120px]"
          value={batchText}
          onChange={(e) => setBatchText(e.target.value)}
          placeholder={"39568/4/2026,2026-07-20"}
        />
        {batchRows.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs text-muted">
              <thead>
                <tr className="text-dim border-b border-subtle">
                  <th className="text-start py-2">{t(locale, 'Ref', 'المرجع')}</th>
                  <th className="text-start py-2">{t(locale, 'Discharge', 'التفريغ')}</th>
                  <th className="text-start py-2">{t(locale, 'Last free day', 'آخر يوم مجاني')}</th>
                </tr>
              </thead>
              <tbody>
                {batchRows.map((r, i) => (
                  <tr key={i} className="border-b border-subtle/50">
                    <td className="py-2 font-mono">{r.ref}</td>
                    <td className="py-2 font-mono">{r.discharge}</td>
                    <td className="py-2">
                      {r.lastFree ? (
                        <span className="text-emerald-300 font-mono">{r.lastFree}</span>
                      ) : (
                        <span className="text-danger">{r.error || '—'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
