import type { AgentRunInput, AgentRunResult, AgentSuggestion } from './types';

const BENCHMARKS = [
  {
    id: 'top-100',
    titleEn: 'Top 100 logistics-company reference cohort',
    titleAr: 'مجموعة مرجعية لأفضل 100 شركة لوجستية',
    bodyEn: 'Use the Transport Topics Top 100 as the broad reference cohort. The agent translates recurring home-page patterns into improvements for Raya; it does not claim to copy any company design.',
    bodyAr: 'استخدم قائمة Transport Topics لأفضل 100 شركة كمجموعة مرجعية واسعة. يحول الوكيل أنماط الصفحات الرئيسية المتكررة إلى تحسينات لراية ولا يدّعي نسخ تصميم أي شركة.',
    url: 'https://www.ttnews.com/index.php/logistics/rankings/2025',
  },
  {
    id: 'dhl',
    titleEn: 'Make tracking the first self-service action',
    titleAr: 'جعل التتبع أول إجراء للخدمة الذاتية',
    bodyEn: 'Leading logistics homepages foreground shipment tracking, then offer quoting and service discovery. Raya should keep “Track a shipment” as the primary client action and route users to authenticated status rather than displaying private shipment data publicly.',
    bodyAr: 'تُبرز الصفحات الرئيسية لشركات اللوجستيات الرائدة تتبع الشحنات أولاً ثم عرض الأسعار واكتشاف الخدمات. ينبغي لراية الحفاظ على «تتبّع شحنة» كإجراء العميل الأساسي وتوجيه المستخدمين إلى الحالة الموثقة بدلاً من عرض بيانات شحنات خاصة علناً.',
    url: 'https://www.dhl.com/us-en/home.html',
  },
  {
    id: 'maersk-kn',
    titleEn: 'Use task-first navigation, not feature-first navigation',
    titleAr: 'استخدم تنقلاً يبدأ بالمهمة لا بالميزات',
    bodyEn: 'Maersk and Kuehne+Nagel lead with tracking and service choices. For Raya, the welcome page should direct people by intent: track a shipment, manage company work, or prepare a clearance.',
    bodyAr: 'تقود Maersk وKuehne+Nagel بالتتبع وخيارات الخدمات. بالنسبة لراية، يجب أن توجه صفحة الترحيب الأشخاص حسب نيتهم: تتبع شحنة أو إدارة عمل الشركة أو التحضير للتخليص.',
    url: 'https://www.kuehne-nagel.com/?page=Home',
  },
  {
    id: 'private-trust',
    titleEn: 'Pair visibility with a privacy boundary',
    titleAr: 'ربط وضوح الحالة بحدود الخصوصية',
    bodyEn: 'Shipment visibility is valuable, but company and client information must remain behind authenticated access. State this boundary plainly near the staff and client entry points.',
    bodyAr: 'رؤية حالة الشحنة مهمة، لكن معلومات الشركة والعملاء يجب أن تبقى خلف وصول موثق. وضّح هذا الحد بوضوح قرب نقاط دخول الموظفين والعملاء.',
    url: 'https://www.maersk.com/',
  },
] as const;

export function runLogisticsBenchmarkAgent(_input: AgentRunInput): AgentRunResult {
  const suggestions: AgentSuggestion[] = BENCHMARKS.map((benchmark, index) => ({
    id: `logistics-benchmark-${benchmark.id}`,
    agentId: 'logistics_benchmark',
    titleEn: benchmark.titleEn,
    titleAr: benchmark.titleAr,
    bodyEn: benchmark.bodyEn,
    bodyAr: benchmark.bodyAr,
    confidence: 'high',
    priority: index + 1,
    links: [{ href: benchmark.url, labelEn: 'Open benchmark source', labelAr: 'فتح مصدر المقارنة' }],
    meta: { benchmark: 'logistics-homepage', scope: 'top-100-reference' },
  }));

  suggestions.push({
    id: 'logistics-benchmark-raya-implementation',
    agentId: 'logistics_benchmark',
    titleEn: 'Raya welcome-page implementation',
    titleAr: 'تنفيذ صفحة الترحيب لراية',
    bodyEn: 'Implemented: a tracking-led client entry, a separate private staff entry, and a clearance-planning entry. Next polish should test these paths with real clients and staff before adding public quote or booking flows.',
    bodyAr: 'تم التنفيذ: دخول للعملاء يقوده التتبع ودخول خاص منفصل للموظفين ودخول للتخطيط للتخليص. يجب أن يختبر التحسين التالي هذه المسارات مع عملاء وموظفين حقيقيين قبل إضافة تدفقات عامة لعرض الأسعار أو الحجز.',
    confidence: 'high',
    priority: 0,
    links: [{ href: '/', labelEn: 'Open welcome page', labelAr: 'فتح صفحة الترحيب' }],
  });

  return {
    agentId: 'logistics_benchmark',
    ranAt: new Date().toISOString(),
    suggestions: suggestions.sort((a, b) => a.priority - b.priority),
    disclaimerEn: 'Benchmark guidance based on a Top-100 reference cohort and selected official operator homepages checked on 2026-07-27. It identifies common interaction patterns, not a complete visual audit of every company.',
    disclaimerAr: 'إرشاد المقارنة مبني على مجموعة مرجعية لأفضل 100 وصفحات رئيسية رسمية مختارة لمشغلين تم التحقق منها في 2026-07-27. يحدد أنماط التفاعل الشائعة ولا يمثل تدقيقاً بصرياً كاملاً لكل شركة.',
  };
}