import type { AgentRunInput, AgentRunResult, AgentSuggestion } from './types';

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function runNextActionAgent(input: AgentRunInput): AgentRunResult {
  const suggestions: AgentSuggestion[] = [];
  const lane = input.selectivityLane;
  const status = input.status || '';
  const free = daysUntil(input.lastFreeDay);

  if (free !== null) {
    if (free < 0) {
      suggestions.push({
        id: 'act-over',
        agentId: 'next_action',
        titleEn: 'Free time exceeded',
        titleAr: 'انتهت الأيام المجانية',
        bodyEn: `Last free day was ${input.lastFreeDay}. Expect storage/demurrage exposure — coordinate ACT payment or gate-out urgently.`,
        bodyAr: `آخر يوم مجاني كان ${input.lastFreeDay}. توقّع أجور تخزين/غرامات — نسّق دفع ACT أو الخروج فوراً.`,
        confidence: 'high',
        priority: 0,
        links: [{ href: '/act', labelEn: 'ACT planner', labelAr: 'مخطط ACT' }],
      });
    } else if (free <= 2) {
      suggestions.push({
        id: 'act-soon',
        agentId: 'next_action',
        titleEn: `Free time ends in ${free} day(s)`,
        titleAr: `الأيام المجانية تنتهي خلال ${free} يوم`,
        bodyEn: `Last free day ${input.lastFreeDay}. Prioritize duties, release, and trucking before storage accrues.`,
        bodyAr: `آخر يوم مجاني ${input.lastFreeDay}. أعطِ أولوية للرسوم والإفراج والنقل قبل تراكم التخزين.`,
        confidence: 'high',
        priority: 0,
        links: [{ href: '/act', labelEn: 'ACT planner', labelAr: 'مخطط ACT' }],
      });
    }
  }

  if (lane === 'red' || status === 'under_inspection') {
    suggestions.push({
      id: 'lane-red',
      agentId: 'next_action',
      titleEn: 'Red lane — physical exam',
      titleAr: 'مسرب أحمر — معاينة فعلية',
      bodyEn: 'Coordinate attendance, seals, and Inspection Act. Do not assume release until exam outcome is recorded.',
      bodyAr: 'نسّق الحضور والأختام ومحضر المعاينة. لا تفترض الإفراج قبل تسجيل نتيجة المعاينة.',
      confidence: 'high',
      priority: 1,
      links: [{ href: '/asycuda', labelEn: 'Inspection Act guide', labelAr: 'دليل محضر المعاينة' }],
    });
  } else if (lane === 'yellow' || status === 'doc_check') {
    suggestions.push({
      id: 'lane-yellow',
      agentId: 'next_action',
      titleEn: 'Yellow — documentary check',
      titleAr: 'أصفر — فحص وثائقي',
      bodyEn: 'Respond to Customs queries with complete, consistent documents. Fix description/value mismatches fast.',
      bodyAr: 'أجب على استفسارات الجمارك بوثائق كاملة ومتسقة. صحّح تعارض الوصف/القيمة بسرعة.',
      confidence: 'high',
      priority: 1,
      links: [{ href: '/asycuda', labelEn: 'Selectivity guide', labelAr: 'دليل الانتقائية' }],
    });
  } else if (lane === 'green' || status === 'released') {
    suggestions.push({
      id: 'lane-green',
      agentId: 'next_action',
      titleEn: 'Green / released path',
      titleAr: 'مسار أخضر / إفراج',
      bodyEn: 'Pay any remaining charges, arrange gate-out, and close client recovery. Keep archive complete.',
      bodyAr: 'ادفع أي رسوم متبقية، رتّب الخروج، وأغلق استرداد العميل. أبقِ الأرشيف مكتملاً.',
      confidence: 'medium',
      priority: 2,
    });
  } else if (lane === 'blue') {
    suggestions.push({
      id: 'lane-blue',
      agentId: 'next_action',
      titleEn: 'Blue — post-clearance audit risk',
      titleAr: 'أزرق — مخاطر التدقيق اللاحق',
      bodyEn: 'Goods may move but file stays audit-ready. Preserve valuation and permits for PCA.',
      bodyAr: 'قد تتحرك البضاعة لكن الملف يبقى جاهزاً للتدقيق. احفظ التقييم والتراخيص للتدقيق اللاحق.',
      confidence: 'high',
      priority: 1,
      links: [{ href: '/asycuda', labelEn: 'PCA section', labelAr: 'قسم التدقيق اللاحق' }],
    });
  } else if (status === 'pre_arrival' || !lane) {
    suggestions.push({
      id: 'pre',
      agentId: 'next_action',
      titleEn: 'Pre-arrival / not selected yet',
      titleAr: 'قبل الوصول / لم تُحدد الانتقائية',
      bodyEn: 'Finish HS, permits, and document pack before registration to reduce yellow/red friction.',
      bodyAr: 'أتمم HS والتراخيص وحزمة الوثائق قبل التسجيل لتقليل احتكاك الأصفر/الأحمر.',
      confidence: 'medium',
      priority: 2,
      links: [{ href: '/workflow', labelEn: 'Workflow', labelAr: 'سير العمل' }],
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: 'generic',
      agentId: 'next_action',
      titleEn: 'Follow standard clearance sequence',
      titleAr: 'اتبع تسلسل التخليص القياسي',
      bodyEn: 'Classify → documents → declare → selectivity → duties → release → archive/recovery.',
      bodyAr: 'تصنيف → وثائق → تصريح → انتقائية → رسوم → إفراج → أرشيف/استرداد.',
      confidence: 'medium',
      priority: 5,
      links: [{ href: '/workflow', labelEn: 'Full workflow', labelAr: 'سير العمل الكامل' }],
    });
  }

  return {
    agentId: 'next_action',
    ranAt: new Date().toISOString(),
    suggestions: suggestions.sort((a, b) => a.priority - b.priority),
    disclaimerEn: 'Operational coaching from case fields — confirm live ASYCUDA/ACT status.',
    disclaimerAr: 'إرشاد تشغيلي من حقول الملف — أكّد حالة الأسيكودا/ACT الحية.',
  };
}
