import { Link } from 'react-router-dom';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';

export default function NotFoundPage() {
  const { locale } = useLocale();

  return (
    <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
      <h1
        className="text-6xl font-bold text-white/80 mb-3"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        404
      </h1>
      <h2 className="text-xl font-semibold text-white mb-2">
        {t(locale, 'Page not found', 'الصفحة غير موجودة')}
      </h2>
      <p className="text-sm text-muted mb-8 max-w-sm">
        {t(
          locale,
          "The page you're looking for doesn't exist or has been moved.",
          'الصفحة التي تبحث عنها غير موجودة أو نُقلت.',
        )}
      </p>
      <Link
        to="/"
        className="btn-primary px-6 py-2.5"
      >
        {t(locale, 'Go home', 'العودة للرئيسية')}
      </Link>
    </div>
  );
}
