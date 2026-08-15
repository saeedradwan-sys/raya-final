/**
 * Shared UI chrome labels (EN / AR). Prefer t(locale, en, ar) inline for one-offs;
 * use these for repeated controls.
 */
import type { Locale } from '@/lib/i18n';
import { t } from '@/lib/i18n';

export const ui = {
  save: (l: Locale) => t(l, 'Save', 'حفظ'),
  cancel: (l: Locale) => t(l, 'Cancel', 'إلغاء'),
  delete: (l: Locale) => t(l, 'Delete', 'حذف'),
  edit: (l: Locale) => t(l, 'Edit', 'تعديل'),
  add: (l: Locale) => t(l, 'Add', 'إضافة'),
  search: (l: Locale) => t(l, 'Search', 'بحث'),
  export: (l: Locale) => t(l, 'Export', 'تصدير'),
  print: (l: Locale) => t(l, 'Print', 'طباعة'),
  back: (l: Locale) => t(l, 'Back', 'رجوع'),
  close: (l: Locale) => t(l, 'Close', 'إغلاق'),
  submit: (l: Locale) => t(l, 'Submit', 'إرسال'),
  login: (l: Locale) => t(l, 'Sign in', 'تسجيل الدخول'),
  logout: (l: Locale) => t(l, 'Sign out', 'تسجيل الخروج'),
  loading: (l: Locale) => t(l, 'Loading…', 'جاري التحميل…'),
  required: (l: Locale) => t(l, 'Required', 'مطلوب'),
  optional: (l: Locale) => t(l, 'Optional', 'اختياري'),
  status: (l: Locale) => t(l, 'Status', 'الحالة'),
  actions: (l: Locale) => t(l, 'Actions', 'إجراءات'),
  client: (l: Locale) => t(l, 'Client', 'العميل'),
  declaration: (l: Locale) => t(l, 'Declaration', 'البيان'),
  account: (l: Locale) => t(l, 'Account', 'الحساب'),
  amount: (l: Locale) => t(l, 'Amount', 'المبلغ'),
  date: (l: Locale) => t(l, 'Date', 'التاريخ'),
  notes: (l: Locale) => t(l, 'Notes', 'ملاحظات'),
  asOf: (l: Locale) => t(l, 'As of', 'كما في'),
  noneYet: (l: Locale) => t(l, 'None yet', 'لا يوجد بعد'),
  viewAll: (l: Locale) => t(l, 'View all', 'عرض الكل'),
  open: (l: Locale) => t(l, 'Open', 'فتح'),
  details: (l: Locale) => t(l, 'Details', 'التفاصيل'),
  portal: (l: Locale) => t(l, 'Portal', 'البوابة'),
  dashboard: (l: Locale) => t(l, 'Dashboard', 'لوحة المتابعة'),
  staff: (l: Locale) => t(l, 'Staff', 'موظفين'),
  brandName: (l: Locale) => t(l, 'Jordan Raya', 'راية الأردن'),
  brandTagline: (l: Locale) =>
    t(l, 'Customs clearance & transport', 'للتخليص ونقل البضائع'),
  exampleDecl: (l: Locale) => t(l, 'e.g. 38000/1/2025', 'مثال: 38000/1/2025'),
  exampleHs: (l: Locale) =>
    t(l, 'e.g. cotton t-shirt, 6109100010, wafer…', 'مثال: قميص قطني، 6109100010، ويفر…'),
  days: (l: Locale, bucket: string) => t(l, `${bucket} days`, `${bucket} يوماً`),
  noExceptions: (l: Locale) => t(l, 'No exceptions', 'لا استثناءات'),
  yes: (l: Locale) => t(l, 'Yes', 'نعم'),
  no: (l: Locale) => t(l, 'No', 'لا'),
  errorGeneric: (l: Locale) => t(l, 'Something went wrong. Try again.', 'حدث خطأ. حاول مرة أخرى.'),
  networkError: (l: Locale) =>
    t(l, 'Cannot reach the server. Using offline mode if available.', 'تعذر الوصول للخادم. استخدام الوضع دون اتصال إن أمكن.'),
} as const;
