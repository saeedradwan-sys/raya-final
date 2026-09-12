import { Search } from 'lucide-react';
import HsTariffSearch from '@/components/hs/HsTariffSearch';
import DutyEstimator from '@/components/hs/DutyEstimator';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';

export default function HsSearchPage() {
  const { locale } = useLocale();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="mb-10 max-w-3xl">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-navy-700 text-accent mb-4">
          <Search size={20} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent mb-2 prose-ar">
          {t(locale, 'Jordan Customs', 'الجمارك الأردنية')}
        </p>
        <h1
          className="mb-3 text-3xl font-bold text-white"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {t(locale, 'Jordan HS Tariff Search', 'بحث التعرفة الجمركية الأردنية')}
        </h1>
        <p className="text-sm leading-relaxed text-muted prose-ar">
          {t(
            locale,
            'Search by a 2-, 4-, 6-, 8-, or 11-digit code, or by an English or Arabic product description. Rates and classification must be verified in the official Jordan Customs tariff before declaration.',
            'ابحث برمز من 2 أو 4 أو 6 أو 8 أو 11 رقماً، أو بوصف المنتج بالعربية أو الإنجليزية. يجب التحقق من النسبة والتصنيف في تعرفة الجمارك الأردنية الرسمية قبل البيان.',
          )}
        </p>
      </div>

      <HsTariffSearch locale={locale} />
      <DutyEstimator locale={locale} />
    </div>
  );
}
