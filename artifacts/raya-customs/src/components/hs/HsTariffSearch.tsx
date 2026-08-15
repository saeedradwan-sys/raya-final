import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Info, LoaderCircle, Search } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { t } from '@/lib/i18n';
import { loadJordanTariff, type TariffDataset } from '@/lib/tariffData';
import { searchJordanTariffs } from '@/lib/tariffSearch';
import type { TariffSearchResult } from '@/lib/types';

const OFFICIAL_TARIFF_URL = 'https://services.customs.gov.jo/JCcits/Search_tariffcode.aspx';

function formatDutyRate(value: string): string {
  if (!value.trim()) return '—';
  return /^-?\d+(?:\.\d+)?$/.test(value.trim()) ? `${value.trim()}%` : value.trim();
}

function cleanEnglishDescription(value: string): string {
  return value.replace(/^-+\s*/, '').trim();
}

function officialSearchUrl(query: string): string {
  const digits = query.replace(/\D/g, '');
  return digits.length >= 2
    ? `${OFFICIAL_TARIFF_URL}?parent=${encodeURIComponent(digits)}`
    : OFFICIAL_TARIFF_URL;
}

interface HsTariffSearchProps {
  locale: Locale;
}

export default function HsTariffSearch({ locale }: HsTariffSearchProps) {
  const [dataset, setDataset] = useState<TariffDataset | null>(null);
  const [loadError, setLoadError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [results, setResults] = useState<TariffSearchResult[]>([]);

  useEffect(() => {
    let active = true;
    setLoadError('');
    loadJordanTariff()
      .then((payload) => {
        if (active) setDataset(payload);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : 'Tariff data could not be loaded');
      });
    return () => {
      active = false;
    };
  }, [retryKey]);

  const examples = useMemo(
    () => locale === 'ar'
      ? ['2106', 'مسحوق الشراب', 'محضرات غذائية', 'هاتف خلوي']
      : ['2106', 'powdered juices', 'food preparations', 'mobile phone'],
    [locale],
  );

  const runSearch = (value: string) => {
    const trimmed = value.trim();
    setQuery(trimmed);
    setSubmitted(trimmed);
    setResults(trimmed && dataset ? searchJordanTariffs(trimmed, dataset.items, 20) : []);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    runSearch(query);
  };

  const loading = !dataset && !loadError;
  const hasResults = results.length > 0;
  const empty = Boolean(submitted && dataset && !hasResults);

  return (
    <>
      <form onSubmit={handleSubmit} className="mb-6" role="search">
        <div className="flex max-w-4xl flex-col gap-2 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">{t(locale, 'HS code or product description', 'رمز النظام المنسق أو وصف المنتج')}</span>
            <Search
              size={18}
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="search"
              inputMode="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t(locale, 'Try 2106, powdered juices, or mobile phone', 'جرّب 2106 أو مسحوق الشراب أو هاتف خلوي')}
              className="w-full rounded-lg border border-subtle bg-elevated py-3 pe-4 ps-10 text-sm text-white placeholder:text-slate-600 focus:border-accent focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={loading || Boolean(loadError)}
            className="inline-flex min-w-32 items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <LoaderCircle size={17} className="animate-spin" /> : <Search size={17} />}
            {t(locale, loading ? 'Loading tariff' : 'Search', loading ? 'تحميل التعرفة' : 'بحث')}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              disabled={!dataset}
              onClick={() => runSearch(example)}
              className="rounded-full border border-subtle bg-navy-800 px-3 py-1 text-xs text-muted transition-colors hover:text-white disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>
      </form>

      {loadError ? (
        <div className="mb-8 max-w-4xl rounded-xl border border-red-900/70 bg-red-950/40 p-4" role="alert">
          <p className="text-sm font-medium text-red-200">
            {t(locale, 'The tariff dataset could not be loaded.', 'تعذر تحميل بيانات التعرفة الجمركية.')}
          </p>
          <p className="mt-1 text-xs text-red-300/80">{loadError}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRetryKey((value) => value + 1)}
              className="rounded-lg bg-red-200 px-3 py-2 text-xs font-semibold text-red-950"
            >
              {t(locale, 'Retry', 'إعادة المحاولة')}
            </button>
            <a
              href={OFFICIAL_TARIFF_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-red-700 px-3 py-2 text-xs text-red-100"
            >
              {t(locale, 'Open official tariff', 'فتح التعرفة الرسمية')}
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
      ) : null}

      <div className="mb-8 flex max-w-4xl items-start gap-2 rounded-lg border border-subtle bg-navy-800/60 p-3">
        <Info size={16} className="mt-0.5 shrink-0 text-slate-500" />
        <div className="text-xs leading-relaxed text-dim">
          <p>
            {dataset
              ? t(
                  locale,
                  `${dataset.meta.rows.toLocaleString()} supplied Jordan tariff lines. Arabic descriptions and duty values follow the supplied authority workbook; English descriptions are reference-only.`,
                  `${dataset.meta.rows.toLocaleString()} بنداً من التعرفة الأردنية الموردة. الوصف العربي ونسبة الرسم حسب ملف المرجع المورّد، والوصف الإنجليزي مرجعي فقط.`,
                )
              : t(locale, 'Loading the supplied Jordan tariff dataset…', 'جارٍ تحميل بيانات التعرفة الأردنية الموردة…')}
          </p>
          <a
            href={officialSearchUrl(submitted || query)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-accent hover:underline"
          >
            {t(locale, 'Verify with Jordan Customs before declaration', 'تحقق من الجمارك الأردنية قبل البيان')}
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {hasResults ? (
        <div className="space-y-3" aria-live="polite">
          <p className="mb-4 text-sm text-dim">
            {t(locale, `${results.length} result(s) for`, `${results.length} نتيجة لـ`)}{' '}
            <span className="text-white">“{submitted}”</span>
          </p>
          {results.map((result) => {
            const englishDescription = cleanEnglishDescription(result.item.descriptionEn);
            const englishMissing = !englishDescription;
            const primary = locale === 'ar'
              ? result.item.descriptionAr
              : englishDescription || result.item.descriptionAr;
            const secondary = locale === 'ar'
              ? englishDescription
              : englishDescription ? result.item.descriptionAr : '';
            return (
              <article
                key={result.item.code}
                className="rounded-xl border border-subtle bg-elevated p-5 transition-colors hover:border-strong"
              >
                <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <code className="font-mono text-sm font-semibold tracking-wide text-accent">
                      {result.item.code}
                    </code>
                    {result.matchKind === 'description' && result.needsReview ? (
                      <span className="inline-flex items-center gap-1 text-xs text-warning">
                        <AlertTriangle size={12} />
                        {t(locale, 'Classification review required', 'مراجعة التصنيف مطلوبة')}
                      </span>
                    ) : result.matchKind === 'description' ? (
                      <span className="inline-flex items-center gap-1 text-xs text-success">
                        <CheckCircle2 size={12} />
                        {t(locale, 'Strong description match', '\u0645\u0637\u0627\u0628\u0642\u0629 \u0648\u0635\u0641 \u0642\u0648\u064a\u0629')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-success">
                        <CheckCircle2 size={12} />
                        {t(locale, result.matchKind === 'exact_code' ? 'Exact code' : 'Code match', result.matchKind === 'exact_code' ? 'رمز مطابق' : 'مطابقة الرمز')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-dim">
                    <span>
                      {t(locale, 'Duty', 'الرسم')}:{' '}
                      <span className="font-medium text-white">{formatDutyRate(result.item.dutyRateRaw)}</span>
                    </span>
                    <span>
                      {t(locale, 'Match', 'المطابقة')}:{' '}
                      <span className="font-medium text-white">{Math.round(result.confidence * 100)}%</span>
                    </span>
                  </div>
                </div>
                <p className="text-sm text-white">{primary}</p>
                {secondary ? <p className="mt-1 text-xs text-dim">{secondary}</p> : null}
                {englishMissing && locale === 'en' ? (
                  <p className="mt-2 text-xs text-warning">
                    {t(locale, 'No matched English reference is present; review the Arabic description.', 'لا يوجد وصف إنجليزي مرجعي مطابق؛ راجع الوصف العربي.')}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {result.matchedConcepts.map((concept) => (
                    <span key={concept} className="rounded bg-navy-700 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-400">
                      {concept}
                    </span>
                  ))}
                  {result.item.parentCode ? (
                    <span className="rounded bg-navy-700 px-2 py-0.5 text-[10px] tracking-wider text-slate-400">
                      {t(locale, 'Parent', 'الأصل')}: {result.item.parentCode}
                    </span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {empty ? (
        <div className="max-w-4xl rounded-xl border border-subtle bg-elevated p-8 text-center" aria-live="polite">
          <p className="text-sm text-muted">
            {t(locale, `No supplied tariff lines match “${submitted}”.`, `لا توجد بنود مطابقة لـ ”${submitted}“ في البيانات الموردة.`)}
          </p>
          <a
            href={officialSearchUrl(submitted)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm text-accent hover:underline"
          >
            {t(locale, 'Search the official Jordan Customs tariff', 'ابحث في تعرفة الجمارك الأردنية الرسمية')}
            <ExternalLink size={14} />
          </a>
        </div>
      ) : null}
    </>
  );
}
