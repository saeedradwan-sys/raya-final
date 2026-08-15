/**
 * Declaration Lookup Agent (Manual ASYCUDA)
 *
 * Live ASYCUDA / ASYHUB login & search was refused by Jordan Customs.
 * This agent helps the broker perform the official search inside ASYCUDA World
 * and then records the found declaration details back into Raya.
 */

import type { AgentRunInput, AgentRunResult, AgentSuggestion } from './types';
import type { SelectivityLane } from '@/lib/types';

export interface DeclarationLookupResult {
  declarationNo?: string;
  selectivityLane?: SelectivityLane | null;
  statusEn?: string;
  statusAr?: string;
  dutiesJod?: number | null;
  notesEn?: string;
  notesAr?: string;
  foundAt?: string;
}

const LANE_HINTS: Record<string, { en: string; ar: string }> = {
  green: { en: 'Green — documentary release (no physical exam expected)', ar: 'أخضر — إفراج وثائقي (لا معاينة فعلية متوقعة)' },
  yellow: { en: 'Yellow — documentary check / possible limited exam', ar: 'أصفر — فحص وثائقي / معاينة محدودة محتملة' },
  red: { en: 'Red — physical inspection required', ar: 'أحمر — معاينة فعلية مطلوبة' },
  blue: { en: 'Blue — post-clearance audit (PCA) track', ar: 'أزرق — مسار التدقيق اللاحق (PCA)' },
};

export function runDeclarationLookupAgent(input: AgentRunInput): AgentRunResult {
  const query =
    (input.query || input.declarationNo || input.blNo || input.containerNo || input.taxNumber || '').trim();

  const suggestions: AgentSuggestion[] = [];

  // Main guidance card
  suggestions.push({
    id: 'lookup-steps',
    agentId: 'declaration_lookup',
    titleEn: 'How to search in ASYCUDA World (manual)',
    titleAr: 'كيف تبحث في ASYCUDA World (يدوياً)',
    bodyEn: [
      'Live login/search API was refused by Jordan Customs. Use the official ASYCUDA World client.',
      '',
      'Typical search path:',
      '1. Open ASYCUDA World and log in with your licensed agent credentials.',
      '2. Go to the declaration enquiry / Find Declaration screen.',
      '3. Search by one of: Declaration number, B/L, Container number, or Importer tax number.',
      '4. Note the selectivity lane (G/Y/R/B), current status, and any duties or holds.',
      '5. Return to Raya and use the “Record found declaration” form below to save the result on the case.',
      '',
      query
        ? `Search key suggested for this run: “${query}”`
        : 'Enter a declaration number, B/L, container or tax number when running the agent for a targeted hint.',
    ].join('\n'),
    bodyAr: [
      'تم رفض واجهة الدخول/البحث الحية من الجمارك الأردنية. استخدم عميل ASYCUDA World الرسمي.',
      '',
      'مسار البحث المعتاد:',
      '1. افتح ASYCUDA World وسجّل الدخول باعتمادات المخلص المرخص.',
      '2. اذهب إلى شاشة استعلام البيان / البحث عن بيان.',
      '3. ابحث بأحد: رقم البيان، البوليصة، رقم الحاوية، أو الرقم الضريبي للمستورد.',
      '4. سجّل مسار الانتقائية (أخضر/أصفر/أحمر/أزرق)، الحالة الحالية، وأي رسوم أو حجوزات.',
      '5. ارجع إلى راية واستخدم نموذج «تسجيل البيان الموجود» أدناه لحفظ النتيجة على الملف.',
      '',
      query
        ? `مفتاح البحث المقترح لهذه الجولة: «${query}»`
        : 'أدخل رقم بيان أو بوليصة أو حاوية أو رقم ضريبي عند تشغيل الوكيل لتلميح موجّه.',
    ].join('\n'),
    confidence: 'high',
    priority: 100,
    links: [
      { href: '/asycuda', labelEn: 'ASYCUDA guide in Raya', labelAr: 'دليل الأسيكودا في راية' },
      { href: '/staff/draft', labelEn: 'Draft editor (export for handoff)', labelAr: 'محرر المسودة (تصدير للتسليم)' },
    ],
  });

  // What to capture
  suggestions.push({
    id: 'lookup-capture',
    agentId: 'declaration_lookup',
    titleEn: 'Fields to capture from ASYCUDA',
    titleAr: 'الحقول التي يجب تسجيلها من الأسيكودا',
    bodyEn: [
      '• Declaration number (official)',
      '• Selectivity lane: Green / Yellow / Red / Blue',
      '• Current status (registered, under inspection, duties assessed, released…)',
      '• Duties / taxes amount if shown',
      '• Any hold or inspection note',
      '',
      'After you find the declaration, use the form in the Assist page to write these values back onto the Raya case. An audit entry is created automatically.',
    ].join('\n'),
    bodyAr: [
      '• رقم البيان الرسمي',
      '• مسار الانتقائية: أخضر / أصفر / أحمر / أزرق',
      '• الحالة الحالية (مسجّل، تحت المعاينة، رسوم مقدّرة، مفرج…)',
      '• مبلغ الرسوم/الضرائب إن ظهر',
      '• أي حجز أو ملاحظة معاينة',
      '',
      'بعد العثور على البيان استخدم النموذج في صفحة المساعدة لكتابة هذه القيم على ملف راية. يُنشأ قيد تدقيق تلقائياً.',
    ].join('\n'),
    confidence: 'high',
    priority: 90,
  });

  // Lane legend
  const laneBodyEn = Object.entries(LANE_HINTS)
    .map(([k, v]) => `• ${k.toUpperCase()}: ${v.en}`)
    .join('\n');
  const laneBodyAr = Object.entries(LANE_HINTS)
    .map(([k, v]) => `• ${k.toUpperCase()}: ${v.ar}`)
    .join('\n');

  suggestions.push({
    id: 'lookup-lanes',
    agentId: 'declaration_lookup',
    titleEn: 'Selectivity lane meanings',
    titleAr: 'معاني مسارات الانتقائية',
    bodyEn: laneBodyEn,
    bodyAr: laneBodyAr,
    confidence: 'high',
    priority: 70,
  });

  if (query) {
    suggestions.push({
      id: 'lookup-key',
      agentId: 'declaration_lookup',
      titleEn: `Search key: ${query}`,
      titleAr: `مفتاح البحث: ${query}`,
      bodyEn: `Use this exact value in the ASYCUDA enquiry screen. After you locate the declaration, record the official number and lane back into Raya.`,
      bodyAr: `استخدم هذه القيمة بالضبط في شاشة الاستعلام. بعد العثور على البيان سجّل الرقم الرسمي والمسار في راية.`,
      confidence: 'high',
      priority: 95,
      meta: { searchKey: query },
    });
  }

  return {
    agentId: 'declaration_lookup',
    ranAt: new Date().toISOString(),
    suggestions,
    disclaimerEn:
      'This agent does not log into ASYCUDA. Live API access was refused by Jordan Customs. All searches must be performed by a licensed agent inside the official ASYCUDA World client. Raya only stores the results you choose to record.',
    disclaimerAr:
      'هذا الوكيل لا يسجّل الدخول إلى الأسيكودا. تم رفض الوصول الحي من الجمارك الأردنية. يجب إجراء كل عمليات البحث بواسطة مخلص مرخص داخل عميل ASYCUDA World الرسمي. راية تخزّن فقط النتائج التي تختار تسجيلها.',
  };
}

/** Helper used by the Assist UI to apply found declaration data onto a shipment */
export function buildLookupPatch(result: DeclarationLookupResult): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (result.declarationNo) patch.declarationNo = result.declarationNo.trim();
  if (result.selectivityLane) {
    patch.selectivityLane = result.selectivityLane;
    // Blue lane implies PCA exposure remains open
    if (result.selectivityLane === 'blue') patch.pcaOpen = true;
  }
  if (result.statusEn) patch.statusEn = result.statusEn;
  if (result.statusAr) patch.statusAr = result.statusAr;
  if (result.statusEn || result.statusAr) {
    // map common statuses if possible
    const s = (result.statusEn || '').toLowerCase();
    if (s.includes('releas')) patch.status = 'released';
    else if (s.includes('inspect')) patch.status = 'under_inspection';
    else if (s.includes('duty') || s.includes('paid')) patch.status = 'duties_paid';
    else if (s.includes('declar') || s.includes('register')) patch.status = 'declared';
  }
  const noteEn = [
    result.foundAt ? `ASYCUDA lookup ${result.foundAt}` : 'ASYCUDA lookup',
    result.declarationNo ? `Decl ${result.declarationNo}` : null,
    result.selectivityLane ? `Lane ${result.selectivityLane}` : null,
    result.dutiesJod != null ? `Duties ~${result.dutiesJod} JOD` : null,
    result.notesEn || null,
  ]
    .filter(Boolean)
    .join(' · ');
  const noteAr = [
    result.foundAt ? `استعلام أسيكودا ${result.foundAt}` : 'استعلام أسيكودا',
    result.declarationNo ? `بيان ${result.declarationNo}` : null,
    result.selectivityLane ? `مسار ${result.selectivityLane}` : null,
    result.dutiesJod != null ? `رسوم ~${result.dutiesJod} د.أ` : null,
    result.notesAr || result.notesEn || null,
  ]
    .filter(Boolean)
    .join(' · ');
  if (noteEn) patch.agentNoteEn = noteEn;
  if (noteAr) patch.agentNoteAr = noteAr;
  return patch;
}
