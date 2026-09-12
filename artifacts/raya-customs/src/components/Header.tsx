import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, Menu, Radio, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocale } from '@/hooks/useLocale';
import { usePortalAuth } from '@/hooks/usePortalAuth';
import { t } from '@/lib/i18n';
import { ui } from '@/content/uiLabels';
import type { NavItem } from '@/lib/types';
import { apiHealth } from '@/lib/api';

const NAV: NavItem[] = [
  { href: '/workflow', labelEn: 'How it works', labelAr: 'كيف نعمل' },
  { href: '/hs-search', labelEn: 'HS desk', labelAr: 'مكتب HS' },
  { href: '/laws', labelEn: 'Field notes', labelAr: 'ملاحظات ميدانية' },
  { href: '/authorities', labelEn: 'Departments', labelAr: 'الجهات' },
];

function pathActive(pathname: string, href: string): boolean {
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

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const portalHref = isAuthenticated ? '/portal/dashboard' : '/portal';

  return (
    <header className="public-header">
      <div className="mx-auto flex min-h-[4.75rem] max-w-7xl items-center justify-between gap-5 px-4 lg:px-8">
        <Link to="/" className="public-brand" onClick={() => setOpen(false)}>
          <span className="public-brand__mark">ر</span>
          <span className="public-brand__name">
            <strong>{ui.brandName(locale)}</strong>
            <small>{t(locale, 'Customs / freight / Jordan', 'جمارك / شحن / الأردن')}</small>
          </span>
        </Link>

        <nav className="public-nav" aria-label={t(locale, 'Primary navigation', 'التنقل الرئيسي')}>
          {NAV.map((item) => {
            const active = pathActive(location.pathname, item.href);
            return <Link key={item.href} to={item.href} className={active ? 'public-nav__link public-nav__link--active' : 'public-nav__link'}>{t(locale, item.labelEn, item.labelAr)}</Link>;
          })}
        </nav>

        <div className="public-header__actions">
          {apiOnline !== null && <span className={apiOnline ? 'public-live' : 'public-live public-live--offline'}><span />{apiOnline ? t(locale, 'Desk online', 'المكتب متصل') : t(locale, 'Desk offline', 'المكتب غير متصل')}</span>}
          <button type="button" onClick={toggleLocale} className="public-lang" aria-label={t(locale, 'Switch language', 'تبديل اللغة')}>{locale === 'en' ? 'العربية' : 'English'}</button>
          <Link to={portalHref} className="public-header__portal">{t(locale, 'Client portal', 'بوابة العملاء')}<ArrowUpRight size={14} /></Link>
          <Link to="/staff" className="public-header__staff">{t(locale, 'Staff access', 'دخول الموظفين')}</Link>
        </div>

        <button type="button" className="public-menu-button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? t(locale, 'Close menu', 'إغلاق القائمة') : t(locale, 'Open menu', 'فتح القائمة')}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <>
          <div className="public-menu-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="public-mobile-menu" role="dialog" aria-modal="true">
            <div className="public-mobile-menu__label"><Radio size={14} />{t(locale, 'Raya field desk', 'مكتب راية الميداني')}</div>
            <nav aria-label={t(locale, 'Mobile navigation', 'التنقل على الجوال')}>
              {NAV.map((item) => <Link key={item.href} to={item.href} onClick={() => setOpen(false)}>{t(locale, item.labelEn, item.labelAr)}<ArrowUpRight size={15} /></Link>)}
            </nav>
            <div className="public-mobile-menu__actions">
              <button type="button" onClick={() => { toggleLocale(); setOpen(false); }}>{locale === 'en' ? 'العربية' : 'English'}</button>
              <Link to={portalHref} onClick={() => setOpen(false)}>{t(locale, 'Open client portal', 'افتح بوابة العملاء')}</Link>
              <Link to="/staff" onClick={() => setOpen(false)}>{t(locale, 'Staff access', 'دخول الموظفين')}</Link>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
