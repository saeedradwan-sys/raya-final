import { HS_CODES } from '@/data/hsCodes';
import { searchJordanTariffs } from '@/lib/tariffSearch';
import type { AgentRunInput, AgentRunResult, AgentSuggestion } from './types';

export function runHsAgent(input: AgentRunInput): AgentRunResult {
  const q = (input.query || input.goodsEn || '').trim();
  const suggestions: AgentSuggestion[] = [];

  if (!q) {
    suggestions.push({
      id: 'hs-need-query',
      agentId: 'hs',
      titleEn: 'Provide a product description',
      titleAr: 'أدخل وصف المنتج',
      bodyEn:
        'Paste an invoice line in English or Arabic (e.g. “cotton knitted t-shirt”). I will rank HS candidates with confidence.',
      bodyAr:
        'الصق بند فاتورة بالإنجليزية أو العربية (مثل «تي شيرت قطني محبوك»). سأرتّب مرشحي النظام المنسق مع درجة ثقة.',
      confidence: 'high',
      priority: 1,
      links: [{ href: '/hs-search', labelEn: 'Open HS search', labelAr: 'فتح بحث HS' }],
    });
  } else {
    const results = searchJordanTariffs(q, HS_CODES, 5);
    if (results.length === 0) {
      suggestions.push({
        id: 'hs-none',
        agentId: 'hs',
        titleEn: 'No strong HS match',
        titleAr: 'لا تطابق قوي لرمز HS',
        bodyEn: `No confident match for “${q}”. Refine materials, use, and form (knitted vs woven). Confirm on official tariff.`,
        bodyAr: `لا تطابق واثق لـ «${q}». وضّح المادة والاستخدام والشكل (محبوك/منسوج). أكّد على التعرفة الرسمية.`,
        confidence: 'low',
        priority: 2,
        links: [{ href: '/hs-search', labelEn: 'HS search', labelAr: 'بحث HS' }],
      });
    } else {
      results.forEach((r, i) => {
        const pct = Math.round((r.confidence <= 1 ? r.confidence * 100 : r.confidence));
        suggestions.push({
          id: `hs-${r.item.code}-${i}`,
          agentId: 'hs',
          titleEn: `HS ${r.item.code} · confidence ${pct}%`,
          titleAr: `HS ${r.item.code} · ثقة ${pct}٪`,
          bodyEn: `${r.item.descriptionEn}. Duty (sample): ${r.item.dutyRateRaw}. Matched: ${r.matchedConcepts.join(', ') || 'keywords'}. Broker must confirm before declaration.`,
          bodyAr: `${r.item.descriptionAr || r.item.descriptionEn}. الرسم (عينة): ${r.item.dutyRateRaw}. المطابق: ${r.matchedConcepts.join('، ') || 'كلمات'}. يجب تأكيد المخلص قبل التصريح.`,
          confidence: pct >= 70 ? 'high' : pct >= 45 ? 'medium' : 'low',
          priority: i + 1,
          meta: { hs: r.item.code, confidence: String(pct) },
          links: [{ href: '/hs-search', labelEn: 'Verify in HS search', labelAr: 'تحقق في بحث HS' }],
        });
      });
    }
  }

  return {
    agentId: 'hs',
    ranAt: new Date().toISOString(),
    suggestions,
    disclaimerEn:
      'Classification assist only — not an official ruling. Confirm duty and permits before ASYCUDA entry.',
    disclaimerAr:
      'مساعدة تصنيف فقط — ليست فتوى رسمية. أكّد الرسم والتراخيص قبل الإدخال في الأسيكودا.',
  };
}
