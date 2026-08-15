import type { HSCodeItem } from '@/lib/types';
import { JORDAN_TARIFF } from './jordanTariff';

/**
 * Primary HS dataset = full Jordan 11-digit tariff (Arabic duty authoritative).
 * When src/data/tariff/*.json is present, JORDAN_TARIFF has ~8311 lines.
 */
export const HS_CODES: HSCodeItem[] = JORDAN_TARIFF;

/** Small offline sample if tariff chapters not yet copied */
export const SAMPLE_HS_CODES: HSCodeItem[] = [
  { code: '0805100010', descriptionEn: 'Oranges, fresh or dried', descriptionAr: 'برتقال، طازج أو مجفف', dutyRateRaw: '20%', chapter: '08' },
  { code: '0901210010', descriptionEn: 'Coffee, not roasted, not decaffeinated', descriptionAr: 'قهوة غير محمصة وغير منزوعة الكافيين', dutyRateRaw: '5%', chapter: '09' },
  { code: '84713000000', descriptionEn: 'Portable digital automatic data processing machines', descriptionAr: 'آلات معالجة معلومات محمولة', dutyRateRaw: '0%', chapter: '84' },
];

export const HS_CHAPTERS: { code: string; en: string; ar: string }[] = [
  { code: '08', en: 'Edible fruit & nuts', ar: 'فواكه وثمار صالحة للأكل' },
  { code: '09', en: 'Coffee, tea, spices', ar: 'بن وشاي وتوابل' },
  { code: '15', en: 'Animal/vegetable fats', ar: 'دهون وزيوت' },
  { code: '17', en: 'Sugars & confectionery', ar: 'سكر وحلويات' },
  { code: '18', en: 'Cocoa & chocolate', ar: 'كاكاو وشوكولاتة' },
  { code: '19', en: 'Cereal preparations', ar: 'مستحضرات حبوب' },
  { code: '22', en: 'Beverages', ar: 'مشروبات' },
  { code: '27', en: 'Mineral fuels', ar: 'وقود معدني' },
  { code: '30', en: 'Pharmaceuticals', ar: 'أدوية' },
  { code: '33', en: 'Cosmetics', ar: 'مستحضرات تجميل' },
  { code: '39', en: 'Plastics', ar: 'لدائن' },
  { code: '61', en: 'Knitted apparel', ar: 'ألبسة محبوكة' },
  { code: '62', en: 'Woven apparel', ar: 'ألبسة منسوجة' },
  { code: '84', en: 'Machinery', ar: 'آلات' },
  { code: '85', en: 'Electrical equipment', ar: 'معدات كهربائية' },
  { code: '87', en: 'Vehicles', ar: 'مركبات' },
  { code: '94', en: 'Furniture', ar: 'أثاث' },
];

export const CHAPTER_AUTHORITY_HINTS: Record<string, { en: string; ar: string }> = {
  '08': { en: 'May need MoA phytosanitary controls', ar: 'قد يحتاج ضوابط وزارة الزراعة (صحة نباتية)' },
  '09': { en: 'Food-related — check JFDA labelling if packed retail', ar: 'غذائي — راجع توسيم JFDA إن كان معبأ للتجزئة' },
  '30': { en: 'JFDA registration often required', ar: 'تسجيل JFDA غالباً مطلوب' },
  '33': { en: 'JFDA cosmetics rules may apply', ar: 'قواعد مستحضرات التجميل JFDA قد تنطبق' },
  '84': { en: 'JSMO conformity may apply for some equipment', ar: 'مطابقة JSMO قد تنطبق على بعض المعدات' },
  '85': { en: 'JSMO / telecom type-approval may apply', ar: 'مطابقة JSMO / اعتماد اتصالات قد ينطبق' },
  '87': { en: 'Special vehicle import rules — verify current policy', ar: 'قواعد خاصة لاستيراد المركبات — تحقق من السياسة الحالية' },
};
