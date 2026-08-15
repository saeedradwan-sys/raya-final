import { allShipments } from '@/lib/recordStore';
import { buildRecoveryQueue } from '@/lib/recoveryQueue';
import { daysUntil } from '@/lib/dates';
import { listIntegrationRoadmap } from '@/lib/asycudaAdapter';
import type { PortalShipment } from '@/lib/types';
import type { AgentRunInput, AgentRunResult, AgentSuggestion, Confidence } from './types';

function shipmentRef(shipment: PortalShipment): string {
  return shipment.declarationNo || shipment.containerNo || shipment.blNo || shipment.id;
}

function addFinding(
  findings: AgentSuggestion[],
  options: {
    id: string;
    titleEn: string;
    titleAr: string;
    bodyEn: string;
    bodyAr: string;
    confidence?: Confidence;
    priority: number;
    href?: string;
    labelEn?: string;
    labelAr?: string;
    meta?: Record<string, string>;
  },
) {
  findings.push({
    id: options.id,
    agentId: 'project_audit',
    titleEn: options.titleEn,
    titleAr: options.titleAr,
    bodyEn: options.bodyEn,
    bodyAr: options.bodyAr,
    confidence: options.confidence ?? 'high',
    priority: options.priority,
    links: options.href
      ? [{ href: options.href, labelEn: options.labelEn ?? 'Open', labelAr: options.labelAr ?? 'فتح' }]
      : undefined,
    meta: options.meta,
  });
}

/** Reviews current operational records and known deployment integration gaps. */
export function runProjectAuditAgent(_input: AgentRunInput): AgentRunResult {
  const findings: AgentSuggestion[] = [];
  const shipments = allShipments();

  for (const shipment of shipments) {
    const ref = shipmentRef(shipment);
    const documents = new Set(shipment.documents.filter((document) => document.available).map((document) => document.type));
    const active = !['released', 'delivered', 'closed'].includes(shipment.status);

    if (active && !documents.has('invoice')) {
      addFinding(findings, {
        id: `audit-invoice-${shipment.id}`,
        titleEn: `Missing commercial invoice — ${ref}`,
        titleAr: `فاتورة تجارية مفقودة — ${ref}`,
        bodyEn: 'The case is active but no available commercial invoice is recorded. Attach or verify it before clearance progresses.',
        bodyAr: 'الملف نشط ولا توجد فاتورة تجارية متاحة مسجلة. أرفقها أو تحقق منها قبل متابعة التخليص.',
        priority: 1,
        href: '/staff/records',
        labelEn: 'Open records',
        labelAr: 'فتح السجلات',
        meta: { shipmentId: shipment.id, category: 'documents' },
      });
    }

    if (active && !documents.has('bl')) {
      addFinding(findings, {
        id: `audit-bl-${shipment.id}`,
        titleEn: `Missing bill of lading — ${ref}`,
        titleAr: `بوليصة شحن مفقودة — ${ref}`,
        bodyEn: 'The case is active but no available bill of lading is recorded. Confirm the shipping document before declaration or release.',
        bodyAr: 'الملف نشط ولا توجد بوليصة شحن متاحة مسجلة. أكد مستند الشحن قبل البيان أو الإفراج.',
        priority: 1,
        href: '/staff/records',
        labelEn: 'Open records',
        labelAr: 'فتح السجلات',
        meta: { shipmentId: shipment.id, category: 'documents' },
      });
    }

    if (shipment.status !== 'pre_arrival' && active && !shipment.declarationNo) {
      addFinding(findings, {
        id: `audit-declaration-${shipment.id}`,
        titleEn: `Declaration number missing — ${ref}`,
        titleAr: `رقم البيان مفقود — ${ref}`,
        bodyEn: 'The shipment has progressed beyond pre-arrival without a declaration number. Record the ASYCUDA result or create a draft for handoff.',
        bodyAr: 'تقدمت الشحنة بعد مرحلة ما قبل الوصول دون رقم بيان. سجل نتيجة الأسيكودا أو أنشئ مسودة للتسليم اليدوي.',
        priority: 0,
        href: '/staff/draft',
        labelEn: 'Open draft workspace',
        labelAr: 'فتح مساحة المسودة',
        meta: { shipmentId: shipment.id, category: 'declaration' },
      });
    }

    if (shipment.declarationNo && !shipment.selectivityLane && active) {
      addFinding(findings, {
        id: `audit-lane-${shipment.id}`,
        titleEn: `Selectivity lane not recorded — ${ref}`,
        titleAr: `مسرب الانتقائية غير مسجل — ${ref}`,
        bodyEn: 'A declaration exists but its green/yellow/red/blue lane has not been mirrored into Raya. Use the manual ASYCUDA lookup and update the case.',
        bodyAr: 'يوجد بيان لكن مسربه الأخضر/الأصفر/الأحمر/الأزرق لم ينعكس في راية. استخدم استعلام الأسيكودا اليدوي وحدّث الملف.',
        priority: 1,
        href: '/staff/assist',
        labelEn: 'Open Assist',
        labelAr: 'فتح المساعد',
        meta: { shipmentId: shipment.id, category: 'selectivity' },
      });
    }

    if (shipment.selectivityLane === 'red' && !shipment.inspectionOutcome) {
      addFinding(findings, {
        id: `audit-inspection-${shipment.id}`,
        titleEn: `Inspection outcome missing — ${ref}`,
        titleAr: `نتيجة المعاينة مفقودة — ${ref}`,
        bodyEn: 'This red-lane shipment has no recorded inspection outcome. Capture the Inspection Act result before treating the case as releasable.',
        bodyAr: 'هذه الشحنة في المسرب الأحمر ولا توجد نتيجة معاينة مسجلة. سجل نتيجة محضر المعاينة قبل اعتبار الملف قابلاً للإفراج.',
        priority: 0,
        href: '/asycuda',
        labelEn: 'Inspection guide',
        labelAr: 'دليل المعاينة',
        meta: { shipmentId: shipment.id, category: 'inspection' },
      });
    }

    if (shipment.pcaOpen && !shipment.agentNoteEn) {
      addFinding(findings, {
        id: `audit-pca-${shipment.id}`,
        titleEn: `PCA follow-up note missing — ${ref}`,
        titleAr: `ملاحظة متابعة التدقيق اللاحق مفقودة — ${ref}`,
        bodyEn: 'The case is open for post-clearance audit but has no owner or follow-up note. Assign responsibility and preserve the valuation and permit evidence.',
        bodyAr: 'الملف مفتوح للتدقيق اللاحق ولا توجد ملاحظة متابعة أو مسؤول. حدد المسؤول واحفظ أدلة التقييم والتراخيص.',
        priority: 1,
        href: '/staff/records',
        labelEn: 'Open records',
        labelAr: 'فتح السجلات',
        meta: { shipmentId: shipment.id, category: 'pca' },
      });
    }

    if (active && shipment.lastFreeDay) {
      const remaining = daysUntil(shipment.lastFreeDay);
      if (remaining <= 1) {
        addFinding(findings, {
          id: `audit-free-time-${shipment.id}`,
          titleEn: `Free time ${remaining < 0 ? 'expired' : 'ends within 1 day'} — ${ref}`,
          titleAr: `المدة المجانية ${remaining < 0 ? 'انتهت' : 'تنتهي خلال يوم واحد'} — ${ref}`,
          bodyEn: `ACT free time is tied to ${shipment.lastFreeDay}. Prioritize release, gate-out, and confirmation of live terminal charges.`,
          bodyAr: `المدة المجانية في ACT مرتبطة بتاريخ ${shipment.lastFreeDay}. أعط الأولوية للإفراج والخروج وتأكيد رسوم المحطة الحية.`,
          priority: 0,
          href: '/act',
          labelEn: 'ACT planner',
          labelAr: 'مخطط ACT',
          meta: { shipmentId: shipment.id, category: 'free-time' },
        });
      }
    }
  }

  for (const item of buildRecoveryQueue()) {
    if (item.priority !== 'high') continue;
    addFinding(findings, {
      id: `audit-recovery-${item.id}`,
      titleEn: `High-priority recovery exposure — ${item.declarationNo}`,
      titleAr: `رصيد استرداد عالي الأولوية — ${item.declarationNo}`,
      bodyEn: `${item.openAmount.toFixed(2)} JOD remains open in clearing account ${item.account}. ${item.noteEn}`,
      bodyAr: `لا يزال مبلغ ${item.openAmount.toFixed(2)} دينار مفتوحاً في حساب التسوية ${item.account}. ${item.noteAr}`,
      priority: 1,
      href: '/staff/accounting',
      labelEn: 'Open accounting',
      labelAr: 'فتح المحاسبة',
      meta: { caseId: item.id, category: 'recovery' },
    });
  }

  const blockedIntegrations = listIntegrationRoadmap().filter((item) => item.status === 'blocked');
  if (blockedIntegrations.length) {
    addFinding(findings, {
      id: 'audit-integrations',
      titleEn: `${blockedIntegrations.length} production integration gap(s) remain`,
      titleAr: `توجد ${blockedIntegrations.length} فجوة تكامل إنتاجية`,
      bodyEn: `Blocked: ${blockedIntegrations.map((item) => item.titleEn).join('; ')}. Keep the manual, audited handoff process in place until formal credentials are granted.`,
      bodyAr: `المعطل: ${blockedIntegrations.map((item) => item.titleAr).join('؛ ')}. حافظ على عملية التسليم اليدوي المدققة حتى منح الاعتمادات الرسمية.`,
      confidence: 'medium',
      priority: 3,
      href: '/asycuda',
      labelEn: 'Integration status',
      labelAr: 'حالة التكامل',
      meta: { category: 'integrations' },
    });
  }

  const summary = `${findings.length} finding(s) across ${shipments.length} shipment record(s)`;
  if (!findings.length) {
    addFinding(findings, {
      id: 'audit-clear',
      titleEn: 'No gaps found in the current project data',
      titleAr: 'لم يتم العثور على فجوات في بيانات المشروع الحالية',
      bodyEn: 'The audit did not find missing core documents, unrecorded selectivity, urgent free-time risk, or high recovery exposure in the records currently loaded.',
      bodyAr: 'لم يجد التدقيق مستندات أساسية مفقودة أو انتقائية غير مسجلة أو خطر مدة مجانية عاجل أو رصيد استرداد مرتفع في السجلات المحملة حالياً.',
      confidence: 'medium',
      priority: 5,
    });
  }

  return {
    agentId: 'project_audit',
    ranAt: new Date().toISOString(),
    suggestions: findings.sort((a, b) => a.priority - b.priority || a.titleEn.localeCompare(b.titleEn)),
    disclaimerEn: `Project gap audit: ${summary}. It reviews the records loaded in Raya and known integration roadmap items; verify live Customs, terminal, and accounting data before acting.`,
    disclaimerAr: `تدقيق فجوات المشروع: ${summary}. يراجع السجلات المحملة في راية وبنود خارطة التكامل المعروفة؛ تحقق من بيانات الجمارك والمحطة والمحاسبة الحية قبل اتخاذ إجراء.`,
  };
}