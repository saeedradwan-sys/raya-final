/**
 * Jordan Customs ASYCUDA codification tables (official exports).
 */
import unitsOfMeasure from './codification/unitsOfMeasure.json';
import carriers from './codification/carriers.json';
import clearingAgents from './codification/clearingAgents.json';
import taxDutyCodes from './codification/taxDutyCodes.json';
import additionalCodes from './codification/additionalCodes.json';

export interface CodificationEntry {
  code: string;
  descriptionAr: string;
  descriptionEn?: string;
  category: string;
}

export const UNITS_OF_MEASURE = unitsOfMeasure as CodificationEntry[];
export const CARRIERS = carriers as CodificationEntry[];
export const CLEARING_AGENTS = clearingAgents as CodificationEntry[];
export const TAX_DUTY_CODES = taxDutyCodes as CodificationEntry[];
export const ADDITIONAL_CODES = additionalCodes as CodificationEntry[];

export function searchCodification(
  list: CodificationEntry[],
  q: string,
  limit = 20,
): CodificationEntry[] {
  const n = q.trim().toLowerCase();
  if (!n) return list.slice(0, limit);
  const scored = list
    .map((row) => {
      const code = row.code.toLowerCase();
      const ar = (row.descriptionAr || '').toLowerCase();
      const en = (row.descriptionEn || '').toLowerCase();
      let score = 0;
      if (code === n) score = 100;
      else if (code.startsWith(n)) score = 80;
      else if (code.includes(n)) score = 60;
      else if (ar.includes(n) || en.includes(n)) score = 40;
      return { row, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.row);
}
