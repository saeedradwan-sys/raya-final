import { describe, expect, it } from 'vitest';
import { estimateImportCharges, parseDutyRate } from '../../shared/dutyEstimate';

describe('estimateImportCharges', () => {
  it('calculates duty and 16% import GST on customs value plus duty', () => {
    const result = estimateImportCharges({ customsValue: 1000, dutyRate: 10 });
    expect(result.customsDuty).toBe(100);
    expect(result.gstBase).toBe(1100);
    expect(result.importGst).toBe(176);
    expect(result.totalBorderTaxes).toBe(276);
    expect(result.landedBeforeFees).toBe(1276);
  });

  it('accepts explicit rates and parses percentage strings', () => {
    expect(parseDutyRate('5.5%')).toBe(5.5);
    expect(parseDutyRate('not-a-rate')).toBeNull();
    expect(estimateImportCharges({ customsValue: 250, dutyRate: 5, gstRate: 0.1 }).importGst).toBe(26.25);
  });
});
