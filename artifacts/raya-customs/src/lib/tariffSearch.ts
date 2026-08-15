import type { HSCodeItem, TariffSearchResult } from './types';

const CONCEPT_TERMS: Record<string, string[]> = {
  shirt: ['shirt', 'shirts', 'قميص', 'قمصان', 'بلوزات'],
  tshirt: ['t-shirt', 'tshirt', 'تي شيرت', 'تيشيرت'],
  knitted: ['knitted', 'knit', 'crocheted', 'منسوجة', 'كروشيه'],
  cotton: ['cotton', 'قطن'],
  synthetic: ['synthetic', 'man-made', 'polyester', 'تركيبية', 'صناعية'],
  apparel: ['apparel', 'clothing', 'garment', 'clothes', 'الألبسة', 'ملابس'],
  sportswear: ['sports', 'sport', 'tracksuit', 'training', 'رياضة', 'رياضية', 'اطقم'],
  wafer: ['wafer', 'wafers', 'waffle', 'ويفر', 'جوفريت'],
  chocolate: ['chocolate', 'cocoa', 'شوكولاتة', 'كاكاو'],
  confectionery: ['confectionery', 'candy', 'sweet', 'حلوى', 'حلويات'],
  food: ['food', 'edible', 'غذائي', 'صالحة للأكل'],
  machinery: ['machinery', 'machine', 'apparatus', 'parts', 'آلات', 'اجهزة'],
  electronics: ['electronic', 'electronics', 'circuit', 'الكترونية', 'دوائر'],
  chemical: ['chemical', 'chemicals', 'كيماوي', 'كيماويات'],
  plastic: ['plastic', 'plastics', 'بلاستيك', 'لدائن'],
  vehicle: ['vehicle', 'car', 'automobile', 'مركبة', 'سيارة'],
};

const CONCEPT_WEIGHTS: Record<string, number> = {
  shirt: 34, tshirt: 52, wafer: 42, sportswear: 20, apparel: 14,
  food: 12, confectionery: 12, chocolate: 10, cotton: 18, synthetic: 18,
  knitted: 18, machinery: 16, electronics: 16, chemical: 14, plastic: 12, vehicle: 15,
};

const CHAPTER_HINTS: Record<string, string[]> = {
  shirt: ['61', '62'], tshirt: ['61', '62'], apparel: ['42', '43', '61', '62'],
  sportswear: ['61', '62', '64'], wafer: ['19'], chocolate: ['18', '19'],
  confectionery: ['17', '19'], machinery: ['84'], electronics: ['85'],
  chemical: ['28', '29'], plastic: ['39'], vehicle: ['87'],
};

const BRAND_CONCEPTS: Record<string, string[]> = {
  nike: ['sportswear', 'apparel'], adidas: ['sportswear', 'apparel'],
  kitkat: ['wafer', 'chocolate', 'confectionery', 'food'],
};

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'for', 'of', 'with', 'brand', 'ماركة', 'من', 'و',
]);

function normalize(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[\u0623\u0625\u0622]/g, '\u0627')
    .replace(/[\u0629]/g, '\u0647')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ');
}

function conceptsForQuery(query: string) {
  const normalized = normalize(query);
  const tokens = new Set(
    normalized
      .split(/\s+/)
      .filter(Boolean)
      .filter((token) => !STOP_WORDS.has(token)),
  );
  const concepts = new Set<string>();

  for (const [concept, terms] of Object.entries(CONCEPT_TERMS)) {
    if (terms.some((term) => normalize(term).length > 2 && normalized.includes(normalize(term)))) {
      concepts.add(concept);
    }
  }
  for (const [brand, brandConcepts] of Object.entries(BRAND_CONCEPTS)) {
    if (tokens.has(brand)) brandConcepts.forEach((c) => concepts.add(c));
  }

  return { normalized, tokens, concepts };
}

export function searchJordanTariffs(
  query: string,
  items: HSCodeItem[],
  limit = 10,
): TariffSearchResult[] {
  const { normalized, tokens, concepts } = conceptsForQuery(query);
  if (!normalized.trim()) return [];

  const digits = normalized.replace(/\D/g, '');
  const isCodeQuery = /^[\d\s./-]+$/.test(query) && digits.length >= 2 && digits.length <= 11;
  if (isCodeQuery) {
    return items
      .filter((item) => item.code.startsWith(digits) || item.parentCode?.startsWith(digits))
      .sort((left, right) => {
        const leftExact = left.code === digits ? 0 : 1;
        const rightExact = right.code === digits ? 0 : 1;
        return leftExact - rightExact || left.code.localeCompare(right.code);
      })
      .slice(0, limit)
      .map((item) => {
        const exact = item.code === digits;
        const confidence = exact ? 1 : digits.length >= 8 ? 0.96 : digits.length >= 6 ? 0.92 : 0.88;
        return {
          item,
          score: exact ? 100 : 80 + digits.length,
          confidence,
          matchedConcepts: [exact ? 'Exact HS code' : `${digits.length}-digit code prefix`],
          needsReview: false,
          matchKind: exact ? 'exact_code' as const : 'code_prefix' as const,
        };
      });
  }
  const ranked = items.flatMap((item) => {
    const text = normalize(`${item.descriptionEn} ${item.descriptionAr}`);
    let score = 0;
    const matchedConcepts: string[] = [];
    const phraseMatch = normalized.length > 2 && text.includes(normalized);

    if (phraseMatch) score += 48;

    for (const concept of concepts) {
      if (!CONCEPT_TERMS[concept]?.some((term) => normalize(term).length > 2 && text.includes(normalize(term)))) {
        continue;
      }
      score += CONCEPT_WEIGHTS[concept] ?? 8;
      if (CHAPTER_HINTS[concept]?.some((ch) => item.code.startsWith(ch))) score += 8;
      matchedConcepts.push(concept);
    }

    let matchedTokenCount = 0;
    for (const token of tokens) {
      if (token.length > 1 && text.includes(token)) {
        score += Math.min(12, 3 + token.length);
        matchedTokenCount += 1;
      }
    }
    if (tokens.size > 1 && matchedTokenCount === tokens.size) score += 18;

    // Penalize industrial matches when query is clearly food/apparel
    const foodConcepts = ['wafer', 'chocolate', 'confectionery', 'food'];
    if (
      CONCEPT_TERMS.machinery.some((t) => text.includes(normalize(t))) &&
      [...concepts].some((c) => foodConcepts.includes(c))
    ) {
      score -= 35;
    }

    if (!item.dutyRateRaw?.trim()) score -= 1;

    return score > 0 ? [{ item, score, matchedConcepts, phraseMatch, matchedTokenCount }] : [];
  });

  const phraseMatches = ranked.filter((result) => result.phraseMatch);
  const allTokenMatches = ranked.filter((result) => tokens.size > 1 && result.matchedTokenCount === tokens.size);
  const candidates = phraseMatches.length ? phraseMatches : allTokenMatches.length ? allTokenMatches : ranked;
  candidates.sort((a, b) => b.score - a.score || a.item.code.localeCompare(b.item.code));
  const topScore = candidates[0]?.score ?? 0;

  return candidates.slice(0, limit).map(({ item, score, matchedConcepts }, index) => ({
    item,
    score,
    confidence: Math.min(
      0.95,
      Math.max(0.15, (score / (score + 20)) * (index > 0 && score < topScore * 0.75 ? 0.8 : 1)),
    ),
    matchedConcepts,
    needsReview: index > 0 || (candidates[1] ? candidates[0].score - candidates[1].score < 8 : false),
    matchKind: 'description',
  }));
}
