export interface JordanLocode {
  code: string;
  nameEn: string;
  nameAr: string;
  aliases: string[];
}

export const JORDAN_LOCODES: readonly JordanLocode[] = [
  { code: 'JOAQJ', nameEn: 'Aqaba', nameAr: 'العقبة', aliases: ['AQABA', 'ACT', 'AQABA CONTAINER TERMINAL', 'AQABA PORT'] },
  { code: 'JOAMM', nameEn: 'Amman', nameAr: 'عمان', aliases: ['AMMAN'] },
  { code: 'JOZAR', nameEn: 'Zarqa', nameAr: 'الزرقاء', aliases: ['ZARQA', 'AZ ZARQA'] },
  { code: 'JOQIR', nameEn: 'Queen Alia area', nameAr: 'منطقة الملكة علياء', aliases: ['QUEEN ALIA', 'QUEEN ALIA AIRPORT', 'QAIA'] },
] as const;

function canonicalText(value: string): string {
  return value.trim().toUpperCase().replace(/[\s._/-]+/g, ' ');
}

/** Return a Jordan UN/LOCODE when the input can be mapped without guessing. */
export function normalizeLocation(value?: string | null): string | null {
  if (!value) return null;
  const canonical = canonicalText(value);
  const compact = canonical.replace(/\s/g, '');
  const match = JORDAN_LOCODES.find((location) => {
    if (location.code === compact) return true;
    return location.aliases.some((alias) => canonicalText(alias) === canonical);
  });
  return match?.code || (/^[A-Z]{2}[A-Z0-9]{3}$/.test(compact) ? compact : null);
}

export function jordanLocode(value?: string | null): JordanLocode | null {
  const code = normalizeLocation(value);
  return code ? JORDAN_LOCODES.find((location) => location.code === code) || null : null;
}