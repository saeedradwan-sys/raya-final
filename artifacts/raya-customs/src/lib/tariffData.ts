import type { HSCodeItem } from './types';

export interface TariffDatasetMeta {
  sourceWorkbook: string;
  importedAt: string;
  authority: string;
  officialVerificationUrl: string;
  rows: number;
  uniqueCodes: number;
  duplicateCodes: number;
  blankArabicDescriptions: number;
  blankEnglishReferences: number;
  blankDutyRates: number;
  code2106Rows: number;
}

export interface TariffDataset {
  meta: TariffDatasetMeta;
  items: HSCodeItem[];
}

let tariffPromise: Promise<TariffDataset> | null = null;

function isTariffDataset(value: unknown): value is TariffDataset {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<TariffDataset>;
  return Boolean(
    candidate.meta
      && Number.isInteger(candidate.meta.rows)
      && Array.isArray(candidate.items)
      && candidate.items.length === candidate.meta.rows,
  );
}

export function loadJordanTariff(): Promise<TariffDataset> {
  if (!tariffPromise) {
    const url = `${import.meta.env.BASE_URL}data/jordan-tariff.json`;
    tariffPromise = fetch(url, { cache: 'force-cache' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Tariff data request failed (${response.status})`);
        const payload: unknown = await response.json();
        if (!isTariffDataset(payload)) throw new Error('Tariff data response is invalid');
        return payload;
      })
      .catch((error) => {
        tariffPromise = null;
        throw error;
      });
  }
  return tariffPromise;
}
