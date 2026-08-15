import { passThroughTotal, round2 } from '@/lib/disbursementCalc';
import type { AgentRunInput, AgentRunResult, AgentSuggestion } from './types';

export function runMoneyAgent(input: AgentRunInput): AgentRunResult {
  const duties = Number(input.duties) || 0;
  const port = Number(input.portFees) || 0;
  const gov = Number(input.otherGov) || 0;
  const fee = Number(input.agencyFee) || 0;
  const pt = passThroughTotal(duties, port, gov);
  const mode = input.mode || 'pay_first';
  const suggestions: AgentSuggestion[] = [];

  suggestions.push({
    id: 'money-split',
    agentId: 'money',
    titleEn: 'Pass-through vs revenue',
    titleAr: 'الممرَّر مقابل الإيراد',
    bodyEn: `Pass-through (duties+port+gov): JOD ${pt.toFixed(2)} → clearing 122100 or 222100.\nAgency fee: JOD ${fee.toFixed(2)} → revenue 411100 only.\nNever book ${pt.toFixed(2)} as sales.`,
    bodyAr: `الممرَّر (رسوم+ميناء+جهات): ${pt.toFixed(2)} د.أ → تسوية 122100 أو 222100.\nأتعاب التخليص: ${fee.toFixed(2)} د.أ → إيراد 411100 فقط.\nلا تقيّد ${pt.toFixed(2)} كمبيعات.`,
    confidence: 'high',
    priority: 1,
    links: [{ href: '/staff/accounting', labelEn: 'Accounting workspace', labelAr: 'مساحة المحاسبة' }],
  });

  if (mode === 'pay_first') {
    suggestions.push({
      id: 'money-pf',
      agentId: 'money',
      titleEn: 'Pay-first flow (122100)',
      titleAr: 'تدفق الدفع أولاً (122100)',
      bodyEn: `1) Pay Customs/ACT → Dr 122100 / Cr bank (${pt.toFixed(2)}).\n2) Client recovers → Dr bank / Cr 122100.\n3) Fee → Cr 411100 (${fee.toFixed(2)}).`,
      bodyAr: `1) ادفع للجمارك/ACT → مدين 122100 / دائن بنك (${pt.toFixed(2)}).\n2) استرداد العميل → مدين بنك / دائن 122100.\n3) الأتعاب → دائن 411100 (${fee.toFixed(2)}).`,
      confidence: 'high',
      priority: 2,
    });
  } else {
    suggestions.push({
      id: 'money-pp',
      agentId: 'money',
      titleEn: 'Client prepay flow (222100)',
      titleAr: 'تدفق مقدمة العميل (222100)',
      bodyEn: `Prepay liability 222100, apply to actual charges, true-up shortfall/refund, fee to 411100.`,
      bodyAr: `التزام المقدمة 222100، طبّق على الرسوم الفعلية، سوِّ العجز/الرد، والأتعاب إلى 411100.`,
      confidence: 'high',
      priority: 2,
    });
  }

  const inflated = round2(pt + fee);
  suggestions.push({
    id: 'money-anti',
    agentId: 'money',
    titleEn: 'Anti-pattern',
    titleAr: 'نمط خاطئ',
    bodyEn: `Booking JOD ${inflated.toFixed(2)} as revenue inflates turnover and confuses GST. Only the fee is service revenue.`,
    bodyAr: `تقييد ${inflated.toFixed(2)} د.أ كإيراد يضخّم الحجم ويشوّش ضريبة المبيعات. فقط الأتعاب إيراد خدمة.`,
    confidence: 'high',
    priority: 3,
  });

  return {
    agentId: 'money',
    ranAt: new Date().toISOString(),
    suggestions,
    disclaimerEn: 'Educational split only — enter official assessments from Customs/ACT; confirm GST with your advisor.',
    disclaimerAr: 'تقسيم تعليمي فقط — أدخل التقديرات الرسمية من الجمارك/ACT؛ أكّد ضريبة المبيعات مع مستشارك.',
  };
}
