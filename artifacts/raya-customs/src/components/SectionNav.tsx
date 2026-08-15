import { useEffect, useState } from 'react';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';

export interface SectionNavItem {
  id: string;
  labelEn: string;
  labelAr: string;
}

interface Props {
  items: SectionNavItem[];
}

/**
 * Sticky in-page section nav for long guides (ASYCUDA, accounting).
 */
export default function SectionNav({ items }: Props) {
  const { locale } = useLocale();
  const [active, setActive] = useState(items[0]?.id ?? '');

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(item.id);
        },
        { rootMargin: '-20% 0px -60% 0px', threshold: 0 },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [items]);

  if (items.length < 2) return null;

  return (
    <nav
      aria-label={t(locale, 'On this page', 'في هذه الصفحة')}
      className="sticky top-16 z-20 -mx-1 mb-8 overflow-x-auto"
    >
      <ul className="flex gap-1.5 min-w-max rounded-xl bg-navy-900/95 border border-subtle p-1.5 backdrop-blur-sm">
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  setActive(item.id);
                }}
                className={`block text-xs px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-navy-700 text-white border border-strong'
                    : 'text-muted hover:text-white hover:bg-navy-800'
                }`}
              >
                {t(locale, item.labelEn, item.labelAr)}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
