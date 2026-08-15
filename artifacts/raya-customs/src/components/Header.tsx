import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocale } from '@/hooks/useLocale';
import { usePortalAuth } from '@/hooks/usePortalAuth';
import { t } from '@/lib/i18n';
import { ui } from '@/content/uiLabels';
import type { NavItem } from '@/lib/types';
import { apiHealth } from '@/lib/api';

const NAV: NavItem[] = [
  { href: '/workflow', labelEn: 'Workflow', labelAr: 'سير التخليص' },
  { href: '/hs-search', labelEn: 'HS Search', labelAr: 'بحث النظام المنسق' },
  { href: '/laws', labelEn: 'Laws', labelAr: 'القوانين والأنظمة' },
  { href: '/authorities', labelEn: 'Departments', labelAr: 'الجهات الحكومية' },
  { href: '/asycuda', labelEn: 'ASYCUDA', labelAr: 'الأسيكودا' },
  { href: '/act', labelEn: 'ACT Free Day', labelAr: 'الأيام المجانية ACT' },
];

function pathActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

export default function Header() {
  const location = useLocation();
  const { locale, toggleLocale } = useLocale();
  const { isAuthenticated } = usePortalAuth();
  const [open, setOpen] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiHealth().then((ok) => {
      if (!cancelled) setApiOnline(ok);
    });
    const id = window.setInterval(() => {
      apiHealth().then((ok) => {
        if (!cancelled) setApiOnline(ok);
      });
    }, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);
  const portalHref = isAuthenticated ? '/portal/dashboard' : '/portal';
  const portalLabel = isAuthenticated
    ? t(locale, 'My shipments', 'شحناتي')
    : t(locale, 'Client portal', 'بوابة العملاء');

  // Close mobile menu on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Escape closes menu; lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 w-full bg-navy-900 border-b border-subtle">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <div className="flex min-h-16 h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 shrink-0" onClick={() => setOpen(false)}>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-md bg-navy-700 border border-strong text-white font-bold text-sm"
              style={{ fontFamily: 'var(--font-heading)', letterSpacing: '0.05em' }}
            >
              ر
            </div>
            <div className="hidden sm:flex flex-col leading-none gap-0.5">
              <span
                className="text-white font-semibold text-sm"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {ui.brandName(locale)}
              </span>
              <span className="text-dim text-[9px] tracking-wide prose-ar">
                {locale === 'ar' ? 'راية الأردن للتخليص ونقل البضائع' : ui.brandTagline(locale)}
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-4" aria-label={t(locale, 'Main', 'رئيسي')}>
            {NAV.map((item) => {
              const active = pathActive(location.pathname, item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`text-xs font-medium transition-colors whitespace-nowrap ${
                    active ? 'text-white' : 'text-muted hover:text-white'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {t(locale, item.labelEn, item.labelAr)}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {apiOnline !== null && (
              <span
                className={`hidden sm:inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border ${
                  apiOnline
                    ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
                    : 'border-slate-600 text-dim bg-navy-900'
                }`}
                title={apiOnline ? 'Raya API online' : 'Raya API unavailable'}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${apiOnline ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                {apiOnline ? t(locale, 'API', 'API') : t(locale, 'Offline', 'دون اتصال')}
              </span>
            )}
            <button
              type="button"
              onClick={toggleLocale}
              className="btn-ghost text-sm font-medium"
              aria-label={t(locale, 'Switch language', 'تبديل اللغة')}
            >
              {locale === 'en' ? 'العربية' : 'English'}
            </button>
            <Link
              to={portalHref}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              {portalLabel}
            </Link>
            <Link
              to="/staff"
              className="text-xs font-medium px-3 py-1.5 rounded bg-navy-700 text-white border border-strong hover:bg-navy-600 transition-colors"
            >
              {t(locale, 'Staff login', 'دخول الموظفين')}
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden p-2.5 -me-1 rounded-lg text-muted hover:text-white hover:bg-navy-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={
              open
                ? t(locale, 'Close menu', 'إغلاق القائمة')
                : t(locale, 'Open menu', 'فتح القائمة')
            }
            aria-expanded={open}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {open && (
          <div
            className="lg:hidden fixed inset-x-0 top-[calc(4rem+env(safe-area-inset-top))] bottom-0 z-40 bg-navy-950/95 backdrop-blur-sm border-t border-subtle overflow-y-auto overscroll-contain"
            role="dialog"
            aria-modal="true"
          >
            <nav className="flex flex-col gap-1 px-4 py-5 max-w-6xl mx-auto" aria-label={t(locale, 'Mobile', 'الجوال')}>
              {NAV.map((item) => {
                const active = pathActive(location.pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`text-base font-medium py-3.5 px-3 rounded-xl min-h-[48px] flex items-center ${
                      active ? 'text-white bg-navy-800 border border-subtle' : 'text-muted hover:text-white hover:bg-navy-900'
                    }`}
                    onClick={() => setOpen(false)}
                    aria-current={active ? 'page' : undefined}
                  >
                    {t(locale, item.labelEn, item.labelAr)}
                  </Link>
                );
              })}
              <div className="flex flex-col gap-2.5 mt-4 pt-4 border-t border-subtle">
                <button
                  type="button"
                  onClick={() => {
                    toggleLocale();
                    setOpen(false);
                  }}
                  className="text-sm font-medium px-4 py-3.5 rounded-xl border border-strong text-center text-muted min-h-[48px]"
                >
                  {locale === 'en' ? 'العربية' : 'English'}
                </button>
                <Link
                  to={portalHref}
                  className="text-sm font-medium px-4 py-3.5 rounded-xl border border-strong text-center text-slate-300 min-h-[48px] flex items-center justify-center"
                  onClick={() => setOpen(false)}
                >
                  {isAuthenticated
                    ? t(locale, 'My shipments', 'شحناتي')
                    : t(locale, 'Client portal', 'بوابة العميل')}
                </Link>
                <Link
                  to="/staff"
                  className="text-sm font-medium px-4 py-3.5 rounded-xl bg-accent text-white text-center min-h-[48px] flex items-center justify-center"
                  onClick={() => setOpen(false)}
                >
                  {t(locale, 'Staff workspace', 'مساحة الموظفين')}
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
