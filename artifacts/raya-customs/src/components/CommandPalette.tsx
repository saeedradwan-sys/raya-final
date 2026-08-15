import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';

const ROUTES = [
  { href: '/', en: 'Home', ar: 'الرئيسية' },
  { href: '/workflow', en: 'Workflow', ar: 'سير التخليص' },
  { href: '/hs-search', en: 'HS search', ar: 'بحث HS' },
  { href: '/laws', en: 'Laws', ar: 'القوانين' },
  { href: '/authorities', en: 'Authorities', ar: 'الجهات' },
  { href: '/asycuda', en: 'ASYCUDA', ar: 'أسيكودا' },
  { href: '/act', en: 'ACT free days', ar: 'أيام ACT' },
  { href: '/portal', en: 'Client portal', ar: 'بوابة العملاء' },
  { href: '/staff', en: 'Staff', ar: 'الموظفين' },
  { href: '/staff/assist', en: 'Assist agents', ar: 'وكلاء المساعدة' },
  { href: '/staff/draft', en: 'Declaration draft', ar: 'مسودة البيان' },
  { href: '/staff/accounting', en: 'Accounting', ar: 'المحاسبة' },
  { href: '/staff/records', en: 'Previous records', ar: 'السجلات السابقة' },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const { locale } = useLocale();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return ROUTES;
    return ROUTES.filter(
      (r) =>
        r.en.toLowerCase().includes(s) ||
        r.ar.includes(s) ||
        r.href.includes(s),
    );
  }, [q]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-black/60"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-label={t(locale, 'Command palette', 'لوحة الأوامر')}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-navy-900 border border-strong shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t(locale, 'Go to… (Ctrl+K)', 'انتقل إلى… (Ctrl+K)')}
          className="w-full bg-transparent px-4 py-3 text-sm text-white border-b border-subtle outline-none"
        />
        <ul className="max-h-72 overflow-y-auto py-1">
          {filtered.map((r) => (
            <li key={r.href}>
              <button
                type="button"
                className="w-full text-start px-4 py-2.5 text-sm text-muted hover:bg-navy-800 hover:text-white"
                onClick={() => {
                  navigate(r.href);
                  setOpen(false);
                  setQ('');
                }}
              >
                {t(locale, r.en, r.ar)}
                <span className="text-dim text-xs ms-2 font-mono">{r.href}</span>
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-3 text-xs text-dim">{t(locale, 'No matches', 'لا نتائج')}</li>
          )}
        </ul>
      </div>
    </div>
  );
}
