import type { Locale } from '@/lib/i18n';
import { t } from '@/lib/i18n';

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'] as const;

export type DateFormatStyle = 'short' | 'medium' | 'long' | 'full';

export type DateErrorCode =
  | 'empty'
  | 'invalid_format'
  | 'invalid_calendar'
  | 'out_of_range'
  | 'not_a_date';

export interface DateValidationResult {
  ok: boolean;
  date: Date | null;
  error: DateErrorCode | null;
}

export interface FormatDateOptions {
  style?: DateFormatStyle;
  easternNumerals?: boolean;
  time?: boolean;
  invalidFallback?: string;
}

const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

export function dateErrorMessage(code: DateErrorCode, locale: Locale): string {
  switch (code) {
    case 'empty':
      return t(locale, 'Please enter a date.', 'يرجى إدخال تاريخ.');
    case 'invalid_format':
      return t(
        locale,
        'Date format is invalid. Use YYYY-MM-DD.',
        'صيغة التاريخ غير صالحة. استخدم YYYY-MM-DD.',
      );
    case 'invalid_calendar':
      return t(
        locale,
        'That calendar date does not exist (check day and month).',
        'هذا التاريخ غير موجود في التقويم (تحقق من اليوم والشهر).',
      );
    case 'out_of_range':
      return t(
        locale,
        `Year must be between ${MIN_YEAR} and ${MAX_YEAR}.`,
        `يجب أن تكون السنة بين ${MIN_YEAR} و ${MAX_YEAR}.`,
      );
    case 'not_a_date':
    default:
      return t(locale, 'Invalid date.', 'تاريخ غير صالح.');
  }
}

export function validateDateInput(value: string | Date | null | undefined): DateValidationResult {
  if (value == null || value === '') {
    return { ok: false, date: null, error: 'empty' };
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return { ok: false, date: null, error: 'not_a_date' };
    }
    const y = value.getFullYear();
    if (y < MIN_YEAR || y > MAX_YEAR) {
      return { ok: false, date: null, error: 'out_of_range' };
    }
    return { ok: true, date: value, error: null };
  }

  const raw = String(value).trim();
  if (!raw) {
    return { ok: false, date: null, error: 'empty' };
  }

  const m = ISO_DATE_ONLY.exec(raw);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);

    if (year < MIN_YEAR || year > MAX_YEAR) {
      return { ok: false, date: null, error: 'out_of_range' };
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return { ok: false, date: null, error: 'invalid_calendar' };
    }

    const d = new Date(year, month - 1, day, 12, 0, 0, 0);
    if (
      d.getFullYear() !== year ||
      d.getMonth() !== month - 1 ||
      d.getDate() !== day
    ) {
      return { ok: false, date: null, error: 'invalid_calendar' };
    }
    return { ok: true, date: d, error: null };
  }

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    if (/^\d{4}-\d{2}-\d{2}/.test(raw) || /^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}$/.test(raw)) {
      return { ok: false, date: null, error: 'invalid_format' };
    }
    return { ok: false, date: null, error: 'not_a_date' };
  }

  const y = d.getFullYear();
  if (y < MIN_YEAR || y > MAX_YEAR) {
    return { ok: false, date: null, error: 'out_of_range' };
  }
  return { ok: true, date: d, error: null };
}

export function parseDateInput(value: string | Date | null | undefined): Date | null {
  return validateDateInput(value).date;
}

export function toEasternArabicNumerals(input: string): string {
  return input.replace(/\d/g, (digit) => ARABIC_DIGITS[Number(digit)] ?? digit);
}

function styleOptions(style: DateFormatStyle): Intl.DateTimeFormatOptions {
  switch (style) {
    case 'short':
      return { year: 'numeric', month: '2-digit', day: '2-digit' };
    case 'medium':
      return { year: 'numeric', month: 'short', day: 'numeric' };
    case 'long':
      return { year: 'numeric', month: 'long', day: 'numeric' };
    case 'full':
      return { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    default:
      return { year: 'numeric', month: 'short', day: 'numeric' };
  }
}

export function formatDate(
  value: string | Date | null | undefined,
  locale: Locale,
  options: FormatDateOptions = {},
): string {
  const {
    style = 'medium',
    easternNumerals = locale === 'ar',
    time = false,
    invalidFallback = '—',
  } = options;

  if (value == null || value === '') return invalidFallback;

  const { ok, date } = validateDateInput(value);
  if (!ok || !date) return invalidFallback;

  const intlLocale = locale === 'ar' ? 'ar-JO' : 'en-GB';
  const opts: Intl.DateTimeFormatOptions = {
    ...styleOptions(style),
    ...(time
      ? { hour: '2-digit', minute: '2-digit', hour12: locale === 'en' }
      : {}),
  };

  let formatted: string;
  try {
    formatted = new Intl.DateTimeFormat(intlLocale, opts).format(date);
  } catch {
    try {
      formatted = formatDateISO(date);
    } catch {
      return invalidFallback;
    }
  }

  if (locale === 'ar' && easternNumerals) {
    formatted = toEasternArabicNumerals(formatted);
  }

  return formatted;
}

export function formatDateTime(
  value: string | Date | null | undefined,
  locale: Locale,
  easternNumerals = locale === 'ar',
): string {
  return formatDate(value, locale, { style: 'medium', time: true, easternNumerals });
}

export function formatDateISO(d: Date): string {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) {
    throw new TypeError('formatDateISO requires a valid Date');
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return formatDateISO(new Date());
}

export function addCalendarDays(start: Date, days: number): Date {
  if (!(start instanceof Date) || Number.isNaN(start.getTime())) {
    throw new TypeError('addCalendarDays requires a valid Date');
  }
  if (!Number.isFinite(days)) {
    throw new TypeError('addCalendarDays requires a finite day count');
  }
  const d = new Date(start.getTime());
  d.setDate(d.getDate() + Math.trunc(days));
  return d;
}

/** Whole calendar days from today (local) to ISO date YYYY-MM-DD. Negative if past. */
export function daysUntil(isoDate: string): number {
  const target = parseDateInput(isoDate);
  if (!target) return 0;
  const today = parseDateInput(todayISO());
  if (!today) return 0;
  const ms = target.getTime() - today.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}
