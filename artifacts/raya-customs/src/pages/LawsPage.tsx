import { useMemo, useState } from 'react';
import { Scale, Search } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';
import { LAWS_REGULATIONS, LAW_CATEGORIES } from '@/content/laws';
import { OFFICIAL_LEGAL_SOURCES } from '@/lib/agents/legalResearchAgent';

export default function LawsPage() {
  const { locale } = useLocale();
  const [category, setCategory] = useState<string>('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    return LAWS_REGULATIONS.filter((law) => {
      if (category !== 'all' && law.category !== category) return false;
      if (!q.trim()) return true;
      const hay = [
        law.titleEn,
        law.titleAr,
        law.summaryEn,
        law.summaryAr,
        law.authorityEn,
        law.authorityAr,
        ...law.keyPointsEn,
        ...law.keyPointsAr,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q.trim().toLowerCase());
    });
  }, [category, q]);

  return (
    <div className="mx-auto max-w-6xl px-4 lg:px-8 py-12">
      <div className="max-w-3xl mb-10">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-navy-700 text-accent mb-4">
          <Scale size={22} />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
          {t(locale, 'Import & export laws and regulations', 'قوانين وأنظمة الاستيراد والتصدير')}
        </h1>
        <p className="text-muted text-sm leading-relaxed">
          {t(
            locale,
            'A practical map of the legal and regulatory layers that affect Jordan clearances: customs, tax, trade licences, JFDA, JSMO, agriculture, ASEZA, and port rules. Not legal advice — verify current official text.',
            'خريطة عملية للطبقات القانونية والتنظيمية التي تؤثر على التخليص في الأردن: الجمارك والضريبة وتراخيص التجارة والغذاء والدواء والمواصفات والزراعة ومنطقة العقبة وقواعد الميناء. ليست استشارة قانونية — تحقق من النص الرسمي الحالي.',
          )}
        </p>
      </div>

      <section className="rounded-xl border border-accent/25 bg-accent/5 p-5 mb-8">
        <h2 className="text-sm font-semibold text-white mb-1">
          {t(locale, 'Verified official legal sources', 'مصادر قانونية رسمية تم التحقق منها')}
        </h2>
        <p className="text-xs text-muted mb-4">
          {t(locale, 'Use these live official portals to confirm amendments, instructions, restricted goods, tax rules, and licensing requirements. The Arabic official text controls.', 'استخدم هذه البوابات الرسمية الحية للتحقق من التعديلات والتعليمات والسلع المقيدة وقواعد الضريبة ومتطلبات الترخيص. النص العربي الرسمي هو المعتمد.')}
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {OFFICIAL_LEGAL_SOURCES.map((source) => (
            <a
              key={source.id}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-subtle bg-navy-900/40 px-3 py-2 text-xs text-accent hover:bg-navy-800/70 hover:underline"
            >
              {t(locale, source.titleEn, source.titleAr)} ↗
            </a>
          ))}
        </div>
      </section>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-500" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t(locale, 'Search laws…', 'بحث في القوانين…')}
            className="w-full rounded-lg bg-elevated border border-subtle ps-9 pe-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {LAW_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                category === c.id
                  ? 'bg-accent border-accent text-white'
                  : 'bg-navy-800 border-subtle text-muted hover:text-white'
              }`}
            >
              {t(locale, c.labelEn, c.labelAr)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((law) => (
          <article key={law.id} className="rounded-xl bg-elevated border border-subtle p-6">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
              <h2 className="text-base font-semibold text-white">
                {t(locale, law.titleEn, law.titleAr)}
              </h2>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-navy-700 text-slate-400">
                {law.category}
              </span>
            </div>
            <p className="text-sm text-muted leading-relaxed mb-4">
              {t(locale, law.summaryEn, law.summaryAr)}
            </p>
            <ul className="space-y-1.5 mb-4">
              {(locale === 'ar' ? law.keyPointsAr : law.keyPointsEn).map((p) => (
                <li key={p} className="text-xs text-slate-400 flex gap-2">
                  <span className="text-accent">•</span>
                  {p}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-4 text-xs text-dim border-t border-subtle pt-3">
              <span>
                {t(locale, 'Authority:', 'الجهة:')}{' '}
                <span className="text-slate-300">{t(locale, law.authorityEn, law.authorityAr)}</span>
              </span>
              <span>
                {t(locale, 'Relevance:', 'الأهمية:')}{' '}
                <span className="text-slate-300">{t(locale, law.relevanceEn, law.relevanceAr)}</span>
              </span>
            </div>
          </article>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-dim text-center py-12">
            {t(locale, 'No matching topics.', 'لا مواضيع مطابقة.')}
          </p>
        )}
      </div>
    </div>
  );
}
