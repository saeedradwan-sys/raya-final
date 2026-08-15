import type { Locale } from '@/lib/i18n';
import { t } from '@/lib/i18n';

/** Central Arabic/English strings for the customer portal */
export const portalCopy = {
  title: (l: Locale) => t(l, 'Customer Portal', 'بوابة العملاء'),
  subtitle: (l: Locale) =>
    t(
      l,
      'Sign in with your tax number and the shipment-specific access code provided by your broker.',
      'سجّل الدخول باستخدام الرقم الضريبي ورمز الوصول الخاص بالشحنة الذي يزوّدك به المخلص الجمركي.',
    ),
  taxNumber: (l: Locale) => t(l, 'Tax number', 'الرقم الضريبي'),
  accessCode: (l: Locale) => t(l, 'Shipment access code', 'رمز وصول الشحنة'),
  taxPlaceholder: (l: Locale) => t(l, 'e.g. 100123456', 'مثال: 100123456'),
  codePlaceholder: (l: Locale) => t(l, 'Enter access code', 'أدخل رمز الوصول'),
  signIn: (l: Locale) => t(l, 'Sign in', 'تسجيل الدخول'),
  signOut: (l: Locale) => t(l, 'Sign out', 'تسجيل الخروج'),
  errorRequired: (l: Locale) => t(l, 'Both fields are required.', 'كلا الحقلين مطلوبان.'),
  errorInvalid: (l: Locale) =>
    t(
      l,
      'Invalid tax number or access code. Check the code from your broker and try again.',
      'الرقم الضريبي أو رمز الوصول غير صحيح. تحقق من الرمز الذي وصلك من المخلص ثم حاول مرة أخرى.',
    ),
  demoTitle: (l: Locale) => t(l, 'Demo credentials', 'بيانات الدخول التجريبية'),
  demoHint: (l: Locale) =>
    t(l, 'Click a row to fill the form', 'انقر على صف لتعبئة النموذج'),
  sessionNote: (l: Locale) =>
    t(
      l,
      'Sessions last 8 hours and are scoped to your tax number. Production signs tokens with a server secret.',
      'مدّة الجلسة 8 ساعات وهي مرتبطة برقمك الضريبي فقط. في بيئة الإنتاج تُوقَّع الرموز بسرّ على الخادم.',
    ),
  myShipments: (l: Locale) => t(l, 'Your shipments', 'شحناتك'),
  noShipments: (l: Locale) =>
    t(l, 'No shipments linked to this session.', 'لا توجد شحنات مرتبطة بهذه الجلسة.'),
  session: (l: Locale) => t(l, 'Session', 'الجلسة'),
  remaining: (l: Locale) => t(l, 'remaining', 'متبقية'),
  declaration: (l: Locale) => t(l, 'Declaration', 'رقم البيان'),
  bl: (l: Locale) => t(l, 'Bill of lading', 'بوليصة الشحن'),
  container: (l: Locale) => t(l, 'Container', 'الحاوية'),
  origin: (l: Locale) => t(l, 'Origin', 'المنشأ'),
  discharge: (l: Locale) => t(l, 'Discharge date', 'تاريخ التفريغ'),
  lastFreeDay: (l: Locale) => t(l, 'Last free day', 'آخر يوم مجاني'),
  documents: (l: Locale) => t(l, 'Documents', 'الوثائق'),
  download: (l: Locale) => t(l, 'Download', 'تنزيل'),
  pending: (l: Locale) => t(l, 'Pending', 'قيد الانتظار'),
  workflow: (l: Locale) => t(l, 'Workflow guide', 'دليل سير العمل'),
  footerNote: (l: Locale) =>
    t(
      l,
      'Documents and status are limited to your tax number. Sessions expire after 8 hours. Use the ACT tool for free-day planning and the workflow guide for clearance steps.',
      'الوثائق وحالة الشحنة مقتصرة على رقمك الضريبي. تنتهي الجلسة بعد 8 ساعات. استخدم أداة ACT لتخطيط الأيام المجانية ودليل سير العمل لخطوات التخليص.',
    ),
  downloadDemo: (l: Locale) =>
    t(
      l,
      'Demo only: in production the file downloads with your portal session token.',
      'للعرض فقط: في الإنتاج يُنزَّل الملف باستخدام رمز جلسة البوابة.',
    ),
  hours: (l: Locale) => t(l, 'h', 'ساعة'),
  minutes: (l: Locale) => t(l, 'm', 'دقيقة'),
  shipmentId: (l: Locale) => t(l, 'Shipment ID', 'معرّف الشحنة'),
  status: (l: Locale) => t(l, 'Status', 'الحالة'),
  selectivity: (l: Locale) => t(l, 'Selectivity', 'الانتقائية'),
  inspectionAct: (l: Locale) => t(l, 'Inspection Act', 'محضر المعاينة'),
  pca: (l: Locale) => t(l, 'Post-clearance audit', 'التدقيق اللاحق'),
  customsControl: (l: Locale) => t(l, 'Customs control', 'الرقابة الجمركية'),
  noSelectivityYet: (l: Locale) => t(l, 'No selectivity yet', 'لا انتقائية بعد'),
  duties: (l: Locale) => t(l, 'Customs duties', 'الرسوم الجمركية'),
  agencyFee: (l: Locale) => t(l, 'Agency fee', 'أتعاب التخليص'),
  freeTime: (l: Locale) => t(l, 'Free time', 'المدة المجانية'),
  demurrage: (l: Locale) => t(l, 'Demurrage', 'غرامات التأخير'),
};



export function formatSessionRemaining(ms: number, locale: Locale): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (locale === 'ar') {
    const hLabel = h === 1 ? 'ساعة' : h === 2 ? 'ساعتان' : 'ساعات';
    const mLabel = m === 1 ? 'دقيقة' : m === 2 ? 'دقيقتان' : 'دقائق';
    if (h === 0) return `${m} ${mLabel}`;
    if (m === 0) return `${h} ${hLabel}`;
    return `${h} ${hLabel} و ${m} ${mLabel}`;
  }
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
