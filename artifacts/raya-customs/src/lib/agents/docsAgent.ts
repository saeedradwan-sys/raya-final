import type { AgentRunInput, AgentRunResult, AgentSuggestion } from './types';

/** Heuristic document checklist for Jordan import clearance */
export function runDocsAgent(input: AgentRunInput): AgentRunResult {
  const suggestions: AgentSuggestion[] = [];
  const goods = (input.goodsEn || input.query || '').toLowerCase();

  const base = [
    { en: 'Commercial invoice', ar: 'فاتورة تجارية', key: 'invoice' },
    { en: 'Bill of lading / AWB', ar: 'بوليصة شحن / AWB', key: 'bl' },
    { en: 'Packing list', ar: 'قائمة التعبئة', key: 'packing' },
    { en: 'Importer tax / registration', ar: 'الرقم الضريبي للمستورد', key: 'tax' },
  ];

  suggestions.push({
    id: 'docs-base',
    agentId: 'docs',
    titleEn: 'Core document pack',
    titleAr: 'حزمة الوثائق الأساسية',
    bodyEn: base.map((b) => `• ${b.en}`).join('\n'),
    bodyAr: base.map((b) => `• ${b.ar}`).join('\n'),
    confidence: 'high',
    priority: 1,
  });

  if (/food|chocolate|wafer|dairy|meat|حلب|غذا|شوكو|ويفر/.test(goods)) {
    suggestions.push({
      id: 'docs-jfda',
      agentId: 'docs',
      titleEn: 'Likely JFDA pathway',
      titleAr: 'مسار محتمل لمؤسسة الغذاء والدواء',
      bodyEn: 'Food / related goods often need JFDA clearance, labels, and sometimes lab. Align invoice description with labels.',
      bodyAr: 'الأغذية وما يرتبط بها غالباً تحتاج موافقة الغذاء والدواء وبطاقات بيان وأحياناً مختبر. طابق وصف الفاتورة مع البطاقة.',
      confidence: 'medium',
      priority: 2,
      links: [{ href: '/authorities', labelEn: 'Authorities guide', labelAr: 'دليل الجهات' }],
    });
  }
  if (/chemical|plastic|steel|machine|كيمي|بلاست|آلات/.test(goods)) {
    suggestions.push({
      id: 'docs-jsmo',
      agentId: 'docs',
      titleEn: 'Standards / conformity check',
      titleAr: 'فحص مواصفات / مطابقة',
      bodyEn: 'Industrial goods may need JSMO conformity or certificates. Keep technical data sheets with the file.',
      bodyAr: 'السلع الصناعية قد تحتاج مطابقة المواصفات أو شهادات. أبقِ النشرات الفنية مع الملف.',
      confidence: 'medium',
      priority: 2,
      links: [{ href: '/authorities', labelEn: 'JSMO / departments', labelAr: 'المواصفات / الجهات' }],
    });
  }
  if (!input.declarationNo) {
    suggestions.push({
      id: 'docs-pre',
      agentId: 'docs',
      titleEn: 'Pre-declaration',
      titleAr: 'قبل التصريح',
      bodyEn: 'No declaration number yet — finish classification and permits before ASYCUDA registration.',
      bodyAr: 'لا رقم بيان بعد — أنهِ التصنيف والتراخيص قبل تسجيل الأسيكودا.',
      confidence: 'high',
      priority: 3,
      links: [{ href: '/workflow', labelEn: 'Workflow', labelAr: 'سير العمل' }],
    });
  }

  suggestions.push({
    id: 'docs-archive',
    agentId: 'docs',
    titleEn: 'Archive discipline',
    titleAr: 'انضباط الأرشيف',
    bodyEn: 'Keep release, payments, and inspection act copies audit-ready for PCA / client disputes.',
    bodyAr: 'احتفظ بنسخ الإفراج والدفع ومحضر المعاينة جاهزة للتدقيق اللاحق أو نزاع العميل.',
    confidence: 'high',
    priority: 4,
    links: [{ href: '/asycuda', labelEn: 'ASYCUDA / PCA', labelAr: 'أسيكودا / تدقيق لاحق' }],
  });

  return {
    agentId: 'docs',
    ranAt: new Date().toISOString(),
    suggestions,
    disclaimerEn: 'Checklist is heuristic guidance, not a substitute for the competent authority list on that shipment.',
    disclaimerAr: 'القائمة إرشادية وليست بديلاً عن متطلبات الجهة المختصة لتلك الشحنة.',
  };
}
