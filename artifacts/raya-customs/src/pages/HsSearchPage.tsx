import HsTariffSearch from '@/components/hs/HsTariffSearch';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';

export default function HsSearchPage() {
  const { locale } = useLocale();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
      <div className="mb-10 max-w-3xl">
        <h1
          className="mb-3 text-3xl font-bold text-white"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {t(locale, 'Jordan HS Tariff Search', 'بحث التعرفة الجمركية الأردنية')}
        </h1>
        <p className="text-sm leading-relaxed text-muted">
          {t(
            locale,
            'Search by a 2-, 4-, 6-, 8-, or 11-digit code, or by an English or Arabic product description. Rates and classification must be verified in the official Jordan Customs tariff before declaration.',
            'ابحث برمز من 2 أو 4 أو 6 أو 8 أو 11 رقماً، أو بوصف المنتج بالعربية أو الإنجليزية. يجب التحقق من النسبة والتصنيف في تعرفة الجمارك الأردنية الرسمية قبل البيان.',
          )}
        </p>
      </div>

      <HsTariffSearch locale={locale} />
    </div>
  );
}