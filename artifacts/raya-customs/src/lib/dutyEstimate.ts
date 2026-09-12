export const DEFAULT_IMPORT_GST_RATE = 0.16;

export interface ImportEstimateInput {
  customsValue: number;
  dutyRate: number;
  gstRate?: number;
}

export interface ImportEstimate {
  customsValue: number;
  dutyRate: number;
  gstRate: number;
  customsDuty: number;
  gstBase: number;
  importGst: number;
  totalBorderTaxes: number;
  landedBeforeFees: number;
}

export function roundJod(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

export function parseDutyRate(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
  const cleaned = String(value ?? '').trim().replace('%', '');
  if (!cleaned || !/^\d+(?:\.\d+)?$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function estimateImportCharges(input: ImportEstimateInput): ImportEstimate {
  const customsValue = Math.max(0, Number(input.customsValue) || 0);
  const dutyRate = Math.max(0, Number(input.dutyRate) || 0);
  const gstRate = Math.max(0, Number(input.gstRate ?? DEFAULT_IMPORT_GST_RATE) || 0);
  const customsDuty = roundJod(customsValue * (dutyRate / 100));
  const gstBase = roundJod(customsValue + customsDuty);
  const importGst = roundJod(gstBase * gstRate);
  const totalBorderTaxes = roundJod(customsDuty + importGst);
  return {
    customsValue: roundJod(customsValue),
    dutyRate,
    gstRate,
    customsDuty,
    gstBase,
    importGst,
    totalBorderTaxes,
    landedBeforeFees: roundJod(customsValue + totalBorderTaxes),
  };
}
