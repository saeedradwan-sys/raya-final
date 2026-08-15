/**
 * Heuristic HS-chapter → Jordan agency permit hints.
 * Not official rulings — confirm with each authority for the shipment.
 */
import { AUTHORITIES } from '@/content/authorities';
import type { Authority } from '@/lib/types';

export interface PermitHint {
  authorityId: string;
  chapterFrom: string;
  chapterTo: string;
  reasonEn: string;
  reasonAr: string;
  likelihood: 'likely' | 'possible';
}

/** Chapter ranges (2-digit HS) mapped to authority ids */
const RULES: PermitHint[] = [
  {
    authorityId: 'jfda',
    chapterFrom: '01',
    chapterTo: '24',
    reasonEn: 'Food, beverages, and related agricultural products often need JFDA.',
    reasonAr: 'الأغذية والمشروبات والمنتجات الزراعية ذات الصلة غالباً تحتاج الغذاء والدواء.',
    likelihood: 'likely',
  },
  {
    authorityId: 'jfda',
    chapterFrom: '30',
    chapterTo: '30',
    reasonEn: 'Pharmaceuticals — JFDA registration / control.',
    reasonAr: 'أدوية — تسجيل/رقابة الغذاء والدواء.',
    likelihood: 'likely',
  },
  {
    authorityId: 'jfda',
    chapterFrom: '33',
    chapterTo: '34',
    reasonEn: 'Cosmetics and soap products may need JFDA.',
    reasonAr: 'مستحضرات تجميل وصابون قد تحتاج الغذاء والدواء.',
    likelihood: 'possible',
  },
  {
    authorityId: 'agriculture',
    chapterFrom: '01',
    chapterTo: '14',
    reasonEn: 'Live animals, plants, seeds — Ministry of Agriculture controls.',
    reasonAr: 'حيوانات حية ونباتات وبذور — رقابة وزارة الزراعة.',
    likelihood: 'likely',
  },
  {
    authorityId: 'jsmo',
    chapterFrom: '39',
    chapterTo: '40',
    reasonEn: 'Plastics/rubber — possible JSMO conformity.',
    reasonAr: 'بلاستيك/مطاط — مطابقة مواصفات محتملة.',
    likelihood: 'possible',
  },
  {
    authorityId: 'jsmo',
    chapterFrom: '72',
    chapterTo: '83',
    reasonEn: 'Base metals and articles — standards / conformity common.',
    reasonAr: 'معادن أساسية ومصنوعاتها — مواصفات/مطابقة شائعة.',
    likelihood: 'possible',
  },
  {
    authorityId: 'jsmo',
    chapterFrom: '84',
    chapterTo: '85',
    reasonEn: 'Machinery and electrical equipment — JSMO / energy rules may apply.',
    reasonAr: 'آلات ومعدات كهربائية — قد تنطبق المواصفات/قواعد الطاقة.',
    likelihood: 'possible',
  },
  {
    authorityId: 'mit',
    chapterFrom: '87',
    chapterTo: '87',
    reasonEn: 'Vehicles — trade licensing and standards pathways.',
    reasonAr: 'مركبات — مسارات ترخيص تجاري ومواصفات.',
    likelihood: 'likely',
  },
  {
    authorityId: 'customs',
    chapterFrom: '01',
    chapterTo: '99',
    reasonEn: 'All commercial goods — Customs declaration and duties.',
    reasonAr: 'كل البضائع التجارية — بيان جمركي ورسوم.',
    likelihood: 'likely',
  },
];

function chapterOf(hs: string): string | null {
  const digits = hs.replace(/\D/g, '');
  if (digits.length < 2) return null;
  return digits.slice(0, 2);
}

function inRange(ch: string, from: string, to: string): boolean {
  return ch >= from && ch <= to;
}

export function permitHintsForHs(hsCode: string): (PermitHint & { authority?: Authority })[] {
  const ch = chapterOf(hsCode);
  if (!ch) return [];
  const authById = new Map(AUTHORITIES.map((a) => [a.id, a]));
  return RULES.filter((r) => inRange(ch, r.chapterFrom, r.chapterTo)).map((r) => ({
    ...r,
    authority: authById.get(r.authorityId),
  }));
}

export function permitHintsForGoodsText(text: string): (PermitHint & { authority?: Authority })[] {
  const lower = text.toLowerCase();
  const ids = new Set<string>(['customs']);
  if (/food|chocolate|wafer|dairy|meat|drink|cosmetic|pharma|medicine|غذا|شوكو|دواء|تجميل/.test(lower)) {
    ids.add('jfda');
  }
  if (/plant|seed|animal|live|زراعة|بذور|حيوان/.test(lower)) ids.add('agriculture');
  if (/steel|machine|electric|plastic|بلاست|آلات|حديد/.test(lower)) ids.add('jsmo');
  if (/vehicle|car|مركبة|سيارة/.test(lower)) ids.add('mit');

  const authById = new Map(AUTHORITIES.map((a) => [a.id, a]));
  const out: (PermitHint & { authority?: Authority })[] = [];
  for (const id of ids) {
    const a = authById.get(id);
    if (!a) continue;
    out.push({
      authorityId: id,
      chapterFrom: '??',
      chapterTo: '??',
      reasonEn: a.whenRequiredEn,
      reasonAr: a.whenRequiredAr,
      likelihood: id === 'customs' ? 'likely' : 'possible',
      authority: a,
    });
  }
  return out;
}
