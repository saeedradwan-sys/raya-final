import type { ActFreeDayRule } from '@/lib/types';

/**
 * ACT (Aqaba Container Terminal) free-time guidance.
 * Official free days and demurrage rates change — always confirm on ACT portal.
 */
export const ACT_OVERVIEW = {
  titleEn: 'ACT — Aqaba Container Terminal',
  titleAr: 'محطة حاويات العقبة (ACT)',
  whatEn:
    'ACT operates container terminal services at the Port of Aqaba. After discharge, containers have a limited free storage period. After the last free day, demurrage (terminal storage) charges apply per day per container. Shipping lines separately apply detention for late empty return.',
  whatAr:
    'تشغّل ACT خدمات محطة الحاويات في ميناء العقبة. بعد التفريغ للحاويات مدة تخزين مجانية محدودة. بعد آخر يوم مجاني تُفرض غرامات تأخير (تخزين المحطة) يومياً لكل حاوية. الخطوط الملاحية تفرض بشكل منفصل غرامات احتجاز لإعادة الفارغة المتأخرة.',
  portalNoteEn:
    'Use the official ACT customer portal for live container status, invoices, and the current tariff. This tool is an operational helper, not a substitute for the portal.',
  portalNoteAr:
    'استخدم بوابة عملاء ACT الرسمية لحالة الحاوية الحية والفواتير والتعرفة الحالية. هذه الأداة مساعدة تشغيلية وليست بديلاً عن البوابة.',
  portalUrl: 'https://www.act.com.jo',
  n4CapUrl: 'https://cap.act.com.jo/apex/cap.zul',
  n4CapNoteEn: 'For precise terminal events (discharge time, gate movements, EDO status) use the N4 Community Access Portal (guest login available).',
  n4CapNoteAr: 'للأحداث الدقيقة في المحطة (وقت التفريغ، حركات البوابة، حالة EDO) استخدم بوابة N4 Community Access Portal (دخول ضيف متاح).',
  /** Illustrative demurrage rate (JOD/day) — always confirm live ACT tariff */
  illustrativeDemurrageJodPerDay: 25,
  demurrageNoteEn:
    'Illustrative only. ACT publishes official storage/demurrage tariffs that change. Use N4 CAP / E-Ticketing for exact charges.',
  demurrageNoteAr:
    'توضيحي فقط. تنشر ACT تعرفة التخزين/التأخير الرسمية التي تتغير. استخدم N4 CAP / التذاكر الإلكترونية للرسوم الدقيقة.',
};

/** Estimate overdue demurrage cost (illustrative). Returns null if not overdue. */
export function estimateDemurrageJod(
  freeDaysLeft: number | null,
  ratePerDay = ACT_OVERVIEW.illustrativeDemurrageJodPerDay,
): number | null {
  if (freeDaysLeft === null || freeDaysLeft >= 0) return null;
  const overdueDays = Math.abs(freeDaysLeft);
  return overdueDays * ratePerDay;
}

/**
 * Illustrative free-day defaults for planning only.
 * Replace with live ACT tariff values in production integrations.
 */
export const ACT_FREE_DAY_RULES: ActFreeDayRule[] = [
  {
    cargoTypeEn: 'Standard dry container (import)',
    cargoTypeAr: 'حاوية جافة عادية (استيراد)',
    freeDays: 5,
    noteEn: 'Typical planning figure — confirm current ACT import free time.',
    noteAr: 'رقم تخطيطي نموذجي — أكد مدة الاستيراد المجانية الحالية لدى ACT.',
  },
  {
    cargoTypeEn: 'Reefer container (import)',
    cargoTypeAr: 'حاوية مبردة (استيراد)',
    freeDays: 3,
    noteEn: 'Reefers often have shorter free time; power charges may apply.',
    noteAr: 'المبردات غالباً مدة مجانية أقصر؛ قد تُفرض أجور طاقة.',
  },
  {
    cargoTypeEn: 'Dangerous goods / special',
    cargoTypeAr: 'بضائع خطرة / خاصة',
    freeDays: 2,
    noteEn: 'Special cargo may have reduced free time and extra handling rules.',
    noteAr: 'البضائع الخاصة قد تكون مدة مجانية أقل وقواعد مناولة إضافية.',
  },
];

export {
  addCalendarDays,
  formatDateISO,
  formatDate as formatDateDisplay,
} from '@/lib/dates';
