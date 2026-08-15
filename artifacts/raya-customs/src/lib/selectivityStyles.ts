import type { InspectionOutcome, SelectivityLane } from '@/lib/types';

/** Single source of truth for lane colours across portal, staff, ASYCUDA */
export const LANE_STYLE: Record<SelectivityLane, string> = {
  green: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  yellow: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  red: 'bg-red-500/20 text-red-300 border-red-500/40',
  blue: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
};

export const LANE_DOT: Record<SelectivityLane, string> = {
  green: 'bg-emerald-400',
  yellow: 'bg-amber-400',
  red: 'bg-red-400',
  blue: 'bg-sky-400',
};

export const LANE_LABEL: Record<SelectivityLane, { en: string; ar: string }> = {
  green: { en: 'Green lane', ar: 'المسرب الأخضر' },
  yellow: { en: 'Yellow lane', ar: 'المسرب الأصفر' },
  red: { en: 'Red lane', ar: 'المسرب الأحمر' },
  blue: { en: 'Blue lane (PCA)', ar: 'المسرب الأزرق (تدقيق لاحق)' },
};

export const OUTCOME_LABEL: Record<InspectionOutcome, { en: string; ar: string }> = {
  conform: { en: 'Inspection: conform', ar: 'المعاينة: مطابق' },
  discrepancy: { en: 'Inspection: discrepancy', ar: 'المعاينة: فروقات' },
  sample_pending: { en: 'Inspection: sample pending', ar: 'المعاينة: عينة معلّقة' },
  hold: { en: 'Inspection: hold', ar: 'المعاينة: حجز' },
};
