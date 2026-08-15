import { runDocsAgent } from './docsAgent';
import { runHsAgent } from './hsAgent';
import { runMoneyAgent } from './moneyAgent';
import { runNextActionAgent } from './nextActionAgent';
import { runCarrierTrackAgent } from './carrierTrackAgent';
import { runHistoricalImportAgent } from './historicalImportAgent';
import { runWorkflowReportAgent } from './workflowReportAgent';
import { runDeclarationLookupAgent } from './declarationLookupAgent';
import { runProjectAuditAgent } from './projectAuditAgent';
import { runLegalResearchAgent } from './legalResearchAgent';
import { runEmployeePortalAgent } from './employeePortalAgent';
import { runUiPolishAgent } from './uiPolishAgent';
import { runLogisticsBenchmarkAgent } from './logisticsBenchmarkAgent';
import type { AgentId, AgentRunInput, AgentRunResult } from './types';

export type { AgentId, AgentRunInput, AgentRunResult, AgentSuggestion, Confidence } from './types';

export const AGENT_CATALOG: {
  id: AgentId;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
}[] = [
  {
    id: 'hs',
    titleEn: 'HS classification',
    titleAr: 'تصنيف HS',
    descEn: 'Rank Jordan HS candidates from a product description.',
    descAr: 'ترتيب مرشحي النظام المنسق من وصف المنتج.',
  },
  {
    id: 'docs',
    titleEn: 'Document checklist',
    titleAr: 'قائمة الوثائق',
    descEn: 'Core pack + authority hints from goods keywords.',
    descAr: 'الحزمة الأساسية وإشارات الجهات من كلمات البضاعة.',
  },
  {
    id: 'next_action',
    titleEn: 'Next action coach',
    titleAr: 'مدرب الخطوة التالية',
    descEn: 'Lane, free days, and operational next steps.',
    descAr: 'المسرب والأيام المجانية والخطوة التشغيلية التالية.',
  },
  {
    id: 'money',
    titleEn: 'Disbursement / fee split',
    titleAr: 'تقسيم التسوية / الأتعاب',
    descEn: 'Pass-through clearing vs agency revenue.',
    descAr: 'تسوية الممرَّر مقابل إيراد الأتعاب.',
  },
  {
    id: 'carrier_track',
    titleEn: 'Carrier container track',
    titleAr: 'تتبع حاوية الخط الملاحي',
    descEn: 'Public line track links from container prefix — no password login.',
    descAr: 'روابط تتبع عامة من بادئة الحاوية — بدون تسجيل بكلمة مرور.',
  },
  {
    id: 'historical_import',
    titleEn: 'Historical declarations import',
    titleAr: 'استيراد البيانات التاريخية',
    descEn: 'Scan folder or files of previous ASYCUDA SAD XML + supporting docs. Extract & import into Raya records.',
    descAr: 'فحص مجلد أو ملفات بيانات ASYCUDA السابقة (XML SAD) والوثائق الداعمة. استخراج واستيراد إلى سجلات راية.',
  },
  {
    id: 'workflow_report',
    titleEn: 'Workflow Analysis & Enhancement Report',
    titleAr: 'تحليل سير العمل وتقرير التحسينات',
    descEn: 'Deep analysis of how well the platform covers the Jordan clearance workflow + prioritized enhancement recommendations.',
    descAr: 'تحليل عميق لمدى تغطية المنصة لسير عمل التخليص الأردني + توصيات تحسين مرتبة حسب الأولوية.',
  },
  {
    id: 'project_audit',
    titleEn: 'Project gap audit',
    titleAr: 'تدقيق فجوات المشروع',
    descEn: 'Scans loaded cases, documents, operational risks, recovery exposure, and integration gaps; returns a prioritized report.',
    descAr: 'يفحص الملفات المحملة والمستندات والمخاطر التشغيلية وأرصدة الاسترداد وفجوات التكامل؛ ويعرض تقريراً مرتباً حسب الأولوية.',
  },
  {
    id: 'legal_research',
    titleEn: 'Jordan customs legal research',
    titleAr: 'البحث القانوني للجمارك الأردنية',
    descEn: 'Search curated official Customs, tax, and trade sources with Raya legal guidance and direct source links.',
    descAr: 'ابحث في المصادر الرسمية المختارة للجمارك والضريبة والتجارة مع إرشادات راية وروابط مباشرة للمصادر.',
  },
  {
    id: 'employee_portal',
    titleEn: 'Employee portal improvement review',
    titleAr: 'مراجعة تحسين بوابة الموظفين',
    descEn: 'Audits the staff workspace and prioritizes role, alert, case-board, handoff, and access improvements.',
    descAr: 'يراجع مساحة الموظفين ويرتب أولويات تحسينات الأدوار والتنبيهات ولوحة الملفات والتسليم والوصول.',
  },
  {
    id: 'ui_polish',
    titleEn: 'UI polish review',
    titleAr: 'مراجعة تحسين الواجهة',
    descEn: 'Prioritized UI improvements for hierarchy, responsiveness, accessibility, and Arabic RTL quality.',
    descAr: 'تحسينات واجهة مرتبة حسب الأولوية للتسلسل الهرمي والاستجابة والإتاحة وجودة العربية واتجاه RTL.',
  },
  {
    id: 'logistics_benchmark',
    titleEn: 'Top logistics landing benchmark',
    titleAr: 'مقارنة صفحة الهبوط لأفضل شركات اللوجستيات',
    descEn: 'Applies Top-100 logistics patterns to Raya’s welcome page: tracking, intent-led paths, services, and private access.',
    descAr: 'يطبق أنماط أفضل 100 شركة لوجستية على صفحة ترحيب راية: التتبع والمسارات حسب النية والخدمات والوصول الخاص.',
  },
  {
    id: 'declaration_lookup',
    titleEn: 'Declaration lookup (ASYCUDA manual)',
    titleAr: 'استعلام البيان (أسيكودا يدوي)',
    descEn: 'Step-by-step guide to search a declaration inside official ASYCUDA World, then record the found number, lane and status back into Raya. No automated login (access refused).',
    descAr: 'دليل خطوة بخطوة للبحث عن بيان داخل ASYCUDA World الرسمي، ثم تسجيل الرقم والمسار والحالة في راية. لا دخول آلي (الوصول مرفوض).',
  },
];

export function runAgent(id: AgentId, input: AgentRunInput): AgentRunResult {
  switch (id) {
    case 'hs':
      return runHsAgent(input);
    case 'docs':
      return runDocsAgent(input);
    case 'next_action':
      return runNextActionAgent(input);
    case 'money':
      return runMoneyAgent(input);
    case 'carrier_track':
      return runCarrierTrackAgent(input);
    case 'historical_import':
      return runHistoricalImportAgent(input);
    case 'workflow_report':
      return runWorkflowReportAgent(input);
    case 'declaration_lookup':
      return runDeclarationLookupAgent(input);
    case 'project_audit':
      return runProjectAuditAgent(input);
    case 'legal_research':
      return runLegalResearchAgent(input);
    case 'employee_portal':
      return runEmployeePortalAgent(input);
    case 'ui_polish':
      return runUiPolishAgent(input);
    case 'logistics_benchmark':
      return runLogisticsBenchmarkAgent(input);
    default:
      return runHsAgent(input);
  }
}

export function runAllAgents(input: AgentRunInput): AgentRunResult[] {
  return (['hs', 'docs', 'next_action', 'money', 'carrier_track', 'historical_import', 'workflow_report', 'declaration_lookup', 'project_audit', 'legal_research', 'employee_portal', 'ui_polish', 'logistics_benchmark'] as AgentId[]).map((id) => runAgent(id, input));
}
