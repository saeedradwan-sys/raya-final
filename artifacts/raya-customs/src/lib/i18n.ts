export type Locale = 'en' | 'ar';

export function t(locale: Locale, en: string, ar: string): string {
  return locale === 'ar' ? ar : en;
}

export function isRtl(locale: Locale): boolean {
  return locale === 'ar';
}
