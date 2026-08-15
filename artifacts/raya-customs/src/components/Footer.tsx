import { Link } from 'react-router-dom';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';
import { ui } from '@/content/uiLabels';

export default function Footer() {
  const { locale } = useLocale();

  return (
    <footer className="bg-navy-900 border-t border-subtle mt-auto">
      <div className="mx-auto max-w-6xl px-4 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-md bg-navy-700 border border-strong text-white font-bold text-sm"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                ر
              </div>
              <div className="flex flex-col leading-none gap-0.5">
                <span className="text-white font-semibold text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
                  {ui.brandName(locale)}
                </span>
                <span className="text-dim text-[9px] prose-ar">{ui.brandTagline(locale)}</span>
              </div>
            </div>
            <p className="text-sm text-dim mb-2">
              {t(locale, 'Jordan customs clearance & transport.', 'تخليص جمركي ونقل بضائع في الأردن.')}
            </p>
            <p className="text-xs text-slate-600">
              {t(
                locale,
                'Guidance only — always confirm the current official requirement.',
                'إرشاد فقط — تحقق دائماً من المتطلب الرسمي الحالي.',
              )}
            </p>
          </div>

          <div className="md:text-end">
            <p className="text-xs font-semibold tracking-widest uppercase mb-4 text-dim">
              {t(locale, 'Quick access', 'وصول سريع')}
            </p>
            <nav className="flex flex-col gap-2 md:items-end">
              <Link to="/workflow" className="text-sm text-muted hover:text-white transition-colors">
                {t(locale, 'Clearance workflow', 'سير عمل التخليص')}
              </Link>
              <Link to="/laws" className="text-sm text-muted hover:text-white transition-colors">
                {t(locale, 'Laws & regulations', 'القوانين والأنظمة')}
              </Link>
              <Link to="/act" className="text-sm text-muted hover:text-white transition-colors">
                {t(locale, 'ACT free days', 'الأيام المجانية ACT')}
              </Link>
              <Link to="/asycuda" className="text-sm text-muted hover:text-white transition-colors">
                {t(locale, 'ASYCUDA World', 'الأسيكودا العالمي')}
              </Link>
              <Link to="/portal" className="text-sm text-muted hover:text-white transition-colors">
                {t(locale, 'Customer portal', 'بوابة العملاء')}
              </Link>
              <Link to="/staff" className="text-sm text-muted hover:text-white transition-colors">
                {t(locale, 'Staff workspace', 'مساحة الموظفين')}
              </Link>
            </nav>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-subtle flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-xs text-slate-600">
            {t(
              locale,
              `© 2026 ${ui.brandName('en')} for Clearance & Transport.`,
              `© 2026 ${ui.brandName('ar')} للتخليص ونقل البضائع.`,
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}
