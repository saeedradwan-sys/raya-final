/**
 * Official Jordan Customs 11-digit HS tariff (Arabic duty authoritative).
 * Chapter JSON under ./tariff/ loaded via Vite import.meta.glob.
 */
import type { HSCodeItem } from '@/lib/types';

export interface JordanTariffRow {
  code: string;
  chapter: string;
  descriptionAr: string;
  descriptionEn: string;
  dutyRateRaw: string;
  parentHs8?: string;
}

const modules = import.meta.glob('./tariff/[0-9]*.json', { eager: true }) as Record<
  string,
  { default: JordanTariffRow[] } | JordanTariffRow[]
>;

function asRows(mod: { default: JordanTariffRow[] } | JordanTariffRow[]): JordanTariffRow[] {
  if (Array.isArray(mod)) return mod;
  if (mod && Array.isArray(mod.default)) return mod.default;
  return [];
}

const ROWS: JordanTariffRow[] = Object.keys(modules)
  .sort()
  .flatMap((key) => asRows(modules[key]));

/** Full national tariff (~8311 lines). */
export const JORDAN_TARIFF: HSCodeItem[] = ROWS.map((r) => ({
  code: r.code,
  descriptionEn: r.descriptionEn || r.descriptionAr,
  descriptionAr: r.descriptionAr,
  dutyRateRaw: r.dutyRateRaw,
  chapter: r.chapter,
}));

export const JORDAN_TARIFF_META = {
  count: JORDAN_TARIFF.length,
  source: 'Jordan Customs Arabic tariff (11-digit) — duty rates from Arabic authority',
  sourceAr: 'التعريفة الجمركية الأردنية (11 خانة) — الرسوم من المصدر العربي المعتمد',
  disclaimerEn:
    'Duty rates are from the aligned Arabic schedule. Confirm on customs.gov.jo before declaration.',
  disclaimerAr:
    'نسب الرسوم من التعريفة العربية المعتمدة. أكّد على customs.gov.jo قبل البيان.',
};

export const JORDAN_TARIFF_CHAPTERS = [
  ...new Set(JORDAN_TARIFF.map((r) => r.chapter).filter(Boolean)),
].sort();
