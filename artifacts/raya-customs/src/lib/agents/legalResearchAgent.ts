import { LAWS_REGULATIONS } from '@/content/laws';
import type { AgentRunInput, AgentRunResult, AgentSuggestion } from './types';

export interface OfficialSource {
  id: string;
  titleEn: string;
  titleAr: string;
  summaryEn: string;
  summaryAr: string;
  url: string;
  keywords: string[];
}

/** Curated official portals and publications verified on 2026-07-27. */
export const OFFICIAL_LEGAL_SOURCES: OfficialSource[] = [
  {
    id: 'customs-law-ar',
    titleEn: 'Jordan Customs Law No. 20 of 1998, as amended',
    titleAr: 'قانون الجمارك الأردني رقم 20 لسنة 1998 وتعديلاته',
    summaryEn: 'Authoritative Arabic text and amendments published by Jordan Customs. Check the effective version and update date before relying on any article.',
    summaryAr: 'النص العربي المعتمد وتعديلاته المنشوران من دائرة الجمارك. تحقق من النسخة النافذة وتاريخ التحديث قبل الاعتماد على أي مادة.',
    url: 'https://customs.gov.jo/Ar/List/%D8%A7%D9%84%D9%82%D9%88%D8%A7%D9%86%D9%8A%D9%86',
    keywords: ['customs', 'clearance', 'declaration', 'valuation', 'tariff', 'duty', 'smuggling', 'broker', 'الجمارك', 'التخليص', 'البيان', 'التثمين', 'التعرفة', 'الرسوم', 'التهريب'],
  },
  {
    id: 'customs-regulations',
    titleEn: 'Jordan Customs regulations, restricted and prohibited goods lists',
    titleAr: 'أنظمة الجمارك وقوائم السلع المقيدة والممنوعة',
    summaryEn: 'Official Customs library for border measures, temporary admission, compliant-trader facilitation, import restrictions, and prohibited-goods lists.',
    summaryAr: 'مكتبة الجمارك الرسمية لتدابير الحدود والإدخال المؤقت وتسهيلات الجهات الملتزمة وقوائم السلع المقيدة والممنوعة.',
    url: 'https://www.customs.gov.jo/AR/List/%D8%A7%D9%84%D8%A3%D9%86%D8%B8%D9%85%D8%A9',
    keywords: ['regulation', 'restricted', 'prohibited', 'temporary admission', 'ip', 'border measures', 'golden list', 'الأنظمة', 'مقيدة', 'ممنوعة', 'إدخال مؤقت', 'ملكية فكرية', 'القائمة الذهبية'],
  },
  {
    id: 'customs-law-en',
    titleEn: 'Jordan Customs Law — English reference translation',
    titleAr: 'قانون الجمارك — مرجع باللغة الإنجليزية',
    summaryEn: 'English reference translation structured by law part. The Arabic text remains authoritative where translations differ.',
    summaryAr: 'ترجمة مرجعية إنجليزية مرتبة حسب أجزاء القانون. يبقى النص العربي هو المعتمد عند وجود اختلاف في الترجمة.',
    url: 'https://jobs.customs.gov.jo/jordan_customs_webpublished/CustomsLawsEn/Customs_Law.aspx',
    keywords: ['english', 'translation', 'customs law', 'reference', 'ترجمة', 'انجليزي', 'قانون الجمارك'],
  },
  {
    id: 'sales-tax-law',
    titleEn: 'General Sales Tax Law No. 6 of 1994 and amendments',
    titleAr: 'قانون الضريبة العامة على المبيعات رقم 6 لسنة 1994 وتعديلاته',
    summaryEn: 'Official Income and Sales Tax Department law search covering import GST, special tax, schedules, exemptions, and related regulations/instructions.',
    summaryAr: 'محرك قانون دائرة ضريبة الدخل والمبيعات، ويغطي ضريبة الاستيراد والضريبة الخاصة والجداول والإعفاءات والأنظمة والتعليمات ذات الصلة.',
    url: 'https://istd.gov.jo/AR/List/%D9%82%D8%A7%D9%86%D9%88%D9%86_%D8%B6%D8%B1%D9%8A%D8%A8%D8%A9_%D8%A7%D9%84%D9%85%D8%A8%D9%8A%D8%B9%D8%A7%D8%AA',
    keywords: ['sales tax', 'gst', 'special tax', 'excise', 'exemption', '16%', 'ضريبة المبيعات', 'الضريبة العامة', 'الضريبة الخاصة', 'إعفاء'],
  },
  {
    id: 'import-export-license',
    titleEn: 'Import and Export License and Card Regulation No. 114 of 2004',
    titleAr: 'نظام رخص وبطاقات الاستيراد والتصدير رقم 114 لسنة 2004',
    summaryEn: 'Official Ministry of Industry, Trade and Supply publication issued under the Import and Export Law No. 21 of 2001, with amendments.',
    summaryAr: 'منشور رسمي لوزارة الصناعة والتجارة والتموين صادر بموجب قانون الاستيراد والتصدير رقم 21 لسنة 2001 وتعديلاته.',
    url: 'https://www.mit.gov.jo/ebv4.0/root_storage/en/eb_list_page/import_and_export_license_and_card_regulation_no._114.pdf',
    keywords: ['import license', 'export license', 'import export law', 'trade card', 'licence', 'رخصة استيراد', 'رخصة تصدير', 'بطاقة مستورد', 'قانون الاستيراد والتصدير'],
  },
];

function normalized(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}%]+/gu, ' ').trim();
}

export function runLegalResearchAgent(input: AgentRunInput): AgentRunResult {
  const query = normalized(input.query || input.goodsEn || '');
  const terms = query.split(/\s+/).filter((term) => term.length > 1);
  const suggestions: AgentSuggestion[] = [];

  const sourceMatches = OFFICIAL_LEGAL_SOURCES
    .map((source) => {
      const corpus = normalized([source.titleEn, source.titleAr, source.summaryEn, source.summaryAr, ...source.keywords].join(' '));
      const score = terms.reduce((total, term) => total + (corpus.includes(term) ? 1 : 0), 0);
      return { source, score };
    })
    .filter(({ score }) => !terms.length || score > 0)
    .sort((a, b) => b.score - a.score || a.source.titleEn.localeCompare(b.source.titleEn));

  for (const { source, score } of sourceMatches) {
    suggestions.push({
      id: `legal-source-${source.id}`,
      agentId: 'legal_research',
      titleEn: source.titleEn,
      titleAr: source.titleAr,
      bodyEn: source.summaryEn,
      bodyAr: source.summaryAr,
      confidence: 'high',
      priority: score ? 1 : 3,
      links: [{ href: source.url, labelEn: 'Open official source', labelAr: 'فتح المصدر الرسمي' }],
      meta: { source: 'official', verifiedOn: '2026-07-27' },
    });
  }

  const topicMatches = LAWS_REGULATIONS.filter((law) => {
    if (!terms.length) return true;
    const corpus = normalized([law.titleEn, law.titleAr, law.summaryEn, law.summaryAr, law.authorityEn, law.authorityAr, ...law.keyPointsEn, ...law.keyPointsAr].join(' '));
    return terms.some((term) => corpus.includes(term));
  });

  for (const law of topicMatches.slice(0, 6)) {
    suggestions.push({
      id: `legal-topic-${law.id}`,
      agentId: 'legal_research',
      titleEn: `Raya guidance: ${law.titleEn}`,
      titleAr: `إرشادات راية: ${law.titleAr}`,
      bodyEn: `${law.summaryEn}\n\nAuthority: ${law.authorityEn}. ${law.relevanceEn}.`,
      bodyAr: `${law.summaryAr}\n\nالجهة: ${law.authorityAr}. ${law.relevanceAr}.`,
      confidence: 'medium',
      priority: 4,
      links: [{ href: '/laws', labelEn: 'Open laws library', labelAr: 'فتح مكتبة القوانين' }],
      meta: { source: 'raya-library', topic: law.id },
    });
  }

  if (!suggestions.length) {
    suggestions.push({
      id: 'legal-no-match',
      agentId: 'legal_research',
      titleEn: 'No narrow legal match found',
      titleAr: 'لم يتم العثور على تطابق قانوني محدد',
      bodyEn: 'Use a commodity, HS code, procedure, authority, or legal phrase. The official Customs and tax sources are included in the legal library for broader research.',
      bodyAr: 'استخدم اسم سلعة أو رمز HS أو إجراء أو جهة أو عبارة قانونية. المصادر الرسمية للجمارك والضريبة متاحة في مكتبة القوانين للبحث الأوسع.',
      confidence: 'medium',
      priority: 5,
      links: [{ href: '/laws', labelEn: 'Open laws library', labelAr: 'فتح مكتبة القوانين' }],
    });
  }

  return {
    agentId: 'legal_research',
    ranAt: new Date().toISOString(),
    suggestions,
    disclaimerEn: 'Research aid only. This agent indexes selected official portals and Raya guidance; it does not replace the Arabic official text, current Official Gazette notices, or advice from a licensed Jordanian lawyer/customs broker.',
    disclaimerAr: 'أداة بحث فقط. يفهرس هذا الوكيل بوابات رسمية مختارة وإرشادات راية؛ ولا يحل محل النص العربي الرسمي أو إعلانات الجريدة الرسمية النافذة أو مشورة محامٍ/مخلص جمركي مرخص في الأردن.',
  };
}