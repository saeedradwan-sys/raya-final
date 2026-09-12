import { useEffect, useMemo, useState } from 'react';
import { Calculator, Info, LoaderCircle } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { t } from '@/lib/i18n';
import { loadJordanTariff } from '@/lib/tariffData';
import { searchJordanTariffs } from '@/lib/tariffSearch';
import { estimateImportCharges, parseDutyRate, DEFAULT_IMPORT_GST_RATE, type ImportEstimate } from '@/lib/dutyEstimate';
import type { HSCodeItem } from '@/lib/types';

function money(value: number) {
  return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} JOD`;
}

export default function DutyEstimator({ locale }: { locale: Locale }) {
  const [query, setQuery] = useState('');
  const [value, setValue] = useState('1000');
  const [dutyRate, setDutyRate] = useState('');
  const [gstRate, setGstRate] = useState(String(DEFAULT_IMPORT_GST_RATE * 100));
  const [selected, setSelected] = useState<HSCodeItem | null>(null);
  const [suggestions, setSuggestions] = useState<HSCodeItem[]>([]);
  const [estimate, setEstimate] = useState<ImportEstimate | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    let active = true;
    setLoading(true);
    void loadJordanTariff().then((dataset) => {
      if (!active) return;
      setSuggestions(searchJordanTariffs(query.trim(), dataset.items, 6).map((result) => result.item));
    }).catch(() => {
      if (active) setSuggestions([]);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [query]);

  const effectiveDutyRate = useMemo(() => parseDutyRate(dutyRate), [dutyRate]);

  function calculate() {
    const parsedDuty = parseDutyRate(dutyRate);
    const parsedValue = Number(value);
    const parsedGst = Number(gstRate);
    if (parsedDuty === null || !Number.isFinite(parsedValue) || parsedValue < 0 || !Number.isFinite(parsedGst) || parsedGst < 0) {
      setEstimate(null);
      return;
    }
    setEstimate(estimateImportCharges({ customsValue: parsedValue, dutyRate: parsedDuty, gstRate: parsedGst / 100 }));
  }

  function choose(item: HSCodeItem) {
    setSelected(item);
    setQuery(item.code);
    setDutyRate(parseDutyRate(item.dutyRateRaw)?.toString() || '');
    setSuggestions([]);
  }

  return (
    <section className="mt-10 max-w-4xl rounded-2xl border border-accent/30 bg-gradient-to-br from-navy-900/90 to-navy-950/80 p-5 lg:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-accent/15 p-2.5 text-accent"><Calculator size={19} /></div>
        <div>
          <h2 className="text-base font-semibold text-white">{t(locale, 'Import duty & GST estimator', 'حاسبة الرسم والضريبة على الاستيراد')}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">{t(locale, 'Choose a supplied tariff line, enter the customs value, and get a planning estimate before the formal ASYCUDA assessment.', 'اختر بنداً من التعرفة الموردة وأدخل القيمة الجمركية للحصول على تقدير تخطيطي قبل التقدير الرسمي في الأسيكودا.')}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="relative">
          <label htmlFor="estimate-hs" className="mb-1.5 block text-xs font-medium text-muted">{t(locale, 'HS code or product', 'رمز HS أو المنتج')}</label>
          <input id="estimate-hs" value={query} onChange={(event) => { setQuery(event.target.value); setSelected(null); }} placeholder={t(locale, 'e.g. 2106 or mobile phone', 'مثال: 2106 أو هاتف محمول')} className="w-full rounded-lg border border-subtle bg-navy-950 px-3 py-2.5 text-sm text-white placeholder:text-dim focus:border-accent focus:outline-none" />
          {loading ? <LoaderCircle size={14} className="absolute end-3 bottom-3 animate-spin text-accent" /> : null}
          {suggestions.length ? <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-subtle bg-navy-900 p-1 shadow-xl">
            {suggestions.map((item) => <button type="button" key={item.code} onClick={() => choose(item)} className="block w-full rounded-md px-3 py-2 text-start hover:bg-accent/10"><span className="font-mono text-xs text-accent">{item.code}</span><span className="ms-2 text-xs text-white">{locale === 'ar' ? item.descriptionAr : item.descriptionEn || item.descriptionAr}</span></button>)}
          </div> : null}
        </div>
        <label className="block text-xs font-medium text-muted">{t(locale, 'Customs value (JOD)', 'القيمة الجمركية (دينار)')}<input inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} className="mt-1.5 w-full rounded-lg border border-subtle bg-navy-950 px-3 py-2.5 text-sm text-white focus:border-accent focus:outline-none" /></label>
        <label className="block text-xs font-medium text-muted">{t(locale, 'Customs duty rate (%)', 'نسبة الرسم الجمركي (%)')}<input inputMode="decimal" value={dutyRate} onChange={(event) => setDutyRate(event.target.value)} placeholder="10" className="mt-1.5 w-full rounded-lg border border-subtle bg-navy-950 px-3 py-2.5 text-sm text-white focus:border-accent focus:outline-none" /></label>
        <label className="block text-xs font-medium text-muted">{t(locale, 'Import GST rate (%)', 'نسبة ضريبة الاستيراد (%)')}<input inputMode="decimal" value={gstRate} onChange={(event) => setGstRate(event.target.value)} className="mt-1.5 w-full rounded-lg border border-subtle bg-navy-950 px-3 py-2.5 text-sm text-white focus:border-accent focus:outline-none" /></label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={calculate} disabled={effectiveDutyRate === null} className="rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-45">{t(locale, 'Calculate estimate', 'احسب التقدير')}</button>
        {selected ? <span className="text-[11px] text-muted">{selected.code} · {t(locale, 'tariff line selected', 'تم اختيار بند التعرفة')}</span> : null}
      </div>

      {estimate ? <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-live="polite">
        <div className="rounded-lg border border-subtle bg-navy-950/60 p-3"><p className="text-[10px] text-dim">{t(locale, 'Customs duty', 'الرسم الجمركي')}</p><p className="mt-1 font-mono text-sm text-white">{money(estimate.customsDuty)}</p></div>
        <div className="rounded-lg border border-subtle bg-navy-950/60 p-3"><p className="text-[10px] text-dim">{t(locale, 'GST base', 'وعاء الضريبة')}</p><p className="mt-1 font-mono text-sm text-white">{money(estimate.gstBase)}</p></div>
        <div className="rounded-lg border border-subtle bg-navy-950/60 p-3"><p className="text-[10px] text-dim">{t(locale, 'Import GST', 'ضريبة الاستيراد')}</p><p className="mt-1 font-mono text-sm text-white">{money(estimate.importGst)}</p></div>
        <div className="rounded-lg border border-accent/30 bg-accent/10 p-3"><p className="text-[10px] text-accent">{t(locale, 'Border taxes total', 'إجمالي ضرائب الحدود')}</p><p className="mt-1 font-mono text-sm font-semibold text-white">{money(estimate.totalBorderTaxes)}</p></div>
      </div> : null}

      <p className="mt-4 flex items-start gap-1.5 text-[10px] leading-relaxed text-dim"><Info size={12} className="mt-0.5 shrink-0" />{t(locale, 'Illustrative only. The official tariff, exemptions, valuation rules, origin treatment, permits, and the ASYCUDA assessment control the final amount. GST is calculated here on customs value plus duty, using 16% by default.', 'تقديري فقط. التعرفة الرسمية والإعفاءات وقواعد التقييم والمنشأ والتصاريح وتقدير الأسيكودا هي المرجع النهائي. تُحسب الضريبة هنا على القيمة الجمركية مضافاً إليها الرسم، وبنسبة افتراضية 16٪.')}</p>
    </section>
  );
}
