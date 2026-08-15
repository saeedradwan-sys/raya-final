import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Locale } from '@/lib/i18n';
import { isRtl } from '@/lib/i18n';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('raya-locale');
      if (stored === 'ar' || stored === 'en') return stored;
    }
    return 'en';
  });

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('raya-locale', l);
  };

  const toggleLocale = () => setLocale(locale === 'en' ? 'ar' : 'en');

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr';
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, toggleLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
