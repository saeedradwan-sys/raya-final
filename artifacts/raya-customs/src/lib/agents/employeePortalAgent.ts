import { allShipments } from '@/lib/recordStore';
import { buildOpsAlerts } from '@/lib/opsAlerts';
import type { AgentRunInput, AgentRunResult, AgentSuggestion } from './types';

function suggestion(
  id: string,
  titleEn: string,
  titleAr: string,
  bodyEn: string,
  bodyAr: string,
  priority: number,
  href: string,
  labelEn: string,
  labelAr: string,
): AgentSuggestion {
  return {
    id,
    agentId: 'employee_portal',
    titleEn,
    titleAr,
    bodyEn,
    bodyAr,
    confidence: 'high',
    priority,
    links: [{ href, labelEn, labelAr }],
  };
}

/** Suggests staff-workspace improvements using the records currently loaded in Raya. */
export function runEmployeePortalAgent(_input: AgentRunInput): AgentRunResult {
  const shipments = allShipments();
  const alerts = buildOpsAlerts(shipments);
  const activeCases = shipments.filter((shipment) => !['released', 'delivered', 'closed'].includes(shipment.status));
  const suggestions: AgentSuggestion[] = [
    suggestion(
      'employee-portal-role-home',
      'Create a role-based start-of-shift view',
      'إنشاء شاشة بداية حسب دور الموظف',
      `The workspace exposes ${activeCases.length} active case(s), but each role still lands on the same broad tool set. Add a "My priority actions" block that shows only the next actions and permitted tools for broker, operations, and accounting roles.`,
      `تعرض مساحة العمل ${activeCases.length} ملفاً نشطاً، لكن جميع الأدوار تبدأ تقريباً بمجموعة الأدوات نفسها. أضف كتلة «إجراءاتي ذات الأولوية» تعرض الخطوات التالية والأدوات المسموح بها فقط لدور المخلص والعمليات والمحاسبة.`,
      1,
      '/staff',
      'Open staff workspace',
      'فتح مساحة الموظفين',
    ),
    suggestion(
      'employee-portal-actionable-alerts',
      'Turn alerts into owned, actionable tasks',
      'تحويل التنبيهات إلى مهام قابلة للتنفيذ ومملوكة',
      `${alerts.length} operational alert(s) are visible. Add assignee, due time, acknowledgement, and a direct case link so staff can clear alerts without searching for the underlying record.`,
      `يوجد ${alerts.length} تنبيهاً تشغيلياً ظاهراً. أضف المسؤول ووقت الاستحقاق والتأكيد ورابطاً مباشراً للملف حتى يتمكن الموظف من معالجة التنبيه دون البحث عن السجل الأساسي.`,
      0,
      '/staff',
      'Open ops alerts',
      'فتح التنبيهات التشغيلية',
    ),
    suggestion(
      'employee-portal-case-board',
      'Add saved queue filters to the case board',
      'إضافة مرشحات طوابير محفوظة للوحة الملفات',
      'The board already searches cases and shows lane, inspection, PCA, and status. Add one-click saved queues for red lane, inspection pending, free-time risk, PCA open, and missing declaration to reduce repeated searches.',
      'تدعم اللوحة بالفعل البحث وتعرض المسرب والمعاينة والتدقيق اللاحق والحالة. أضف طوابير محفوظة بنقرة واحدة للمسرب الأحمر والمعاينة المعلقة وخطر المدة المجانية والتدقيق اللاحق المفتوح ورقم البيان المفقود لتقليل عمليات البحث المتكررة.',
      1,
      '/staff',
      'Open case board',
      'فتح لوحة الملفات',
    ),
    suggestion(
      'employee-portal-handoff',
      'Make handoffs visible and auditable',
      'جعل تسليم الملفات واضحاً وقابلاً للتدقيق',
      'Add an owner, last handoff, next required action, and short timeline to every case. Preserve the existing manual Customs handoff model while making accountability visible inside Raya.',
      'أضف مالك الملف وآخر عملية تسليم والإجراء المطلوب التالي وخطاً زمنياً قصيراً لكل ملف. حافظ على نموذج التسليم اليدوي الحالي للجمارك مع إظهار المسؤولية بوضوح داخل راية.',
      1,
      '/staff/records',
      'Open records',
      'فتح السجلات',
    ),
    suggestion(
      'employee-portal-session-safety',
      'Improve session safety without disrupting staff',
      'تحسين أمان الجلسة دون تعطيل الموظفين',
      'Keep the current role-based access and session expiry, then add a five-minute expiry warning, explicit re-authentication after inactivity, and a clear audit event for sensitive exports or approvals.',
      'احتفظ بالوصول حسب الدور وانتهاء الجلسة الحاليين، ثم أضف تنبيهاً قبل الانتهاء بخمس دقائق وإعادة مصادقة صريحة بعد الخمول وسجل تدقيق واضح لعمليات التصدير أو الاعتمادات الحساسة.',
      2,
      '/staff',
      'Review staff access',
      'مراجعة وصول الموظفين',
    ),
  ];

  return {
    agentId: 'employee_portal',
    ranAt: new Date().toISOString(),
    suggestions: suggestions.sort((a, b) => a.priority - b.priority),
    disclaimerEn: `Employee portal review based on ${shipments.length} loaded shipment record(s) and ${alerts.length} current operational alert(s). Recommendations are implementation priorities, not evidence of live Customs or terminal status.`,
    disclaimerAr: `مراجعة بوابة الموظفين مبنية على ${shipments.length} سجل شحنة محمّل و${alerts.length} تنبيه تشغيلي حالي. التوصيات أولويات تنفيذ وليست دليلاً على حالة حية لدى الجمارك أو المحطة.`,
  };
}