import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, User, FileText, Lightbulb } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';
import { WORKFLOW_PHASES } from '@/content/workflow';
import WorkflowFlowchart from '@/components/WorkflowFlowchart';

export default function WorkflowPage() {
  const { locale } = useLocale();
  const [openStep, setOpenStep] = useState<string | null>(WORKFLOW_PHASES[0]?.steps[0]?.id ?? null);

  return (
    <div className="mx-auto max-w-6xl px-4 lg:px-8 py-12">
      <div className="max-w-3xl mb-10">
        <h1 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
          {t(locale, 'Clearance workflow — every step', 'سير عمل التخليص — كل خطوة')}
        </h1>
        <p className="text-muted text-sm leading-relaxed">
          {t(
            locale,
            'Deep operational analysis of a typical Jordan import clearance: from pre-arrival documents through ASYCUDA, ACT free time, payment, release, and file close. Expand each step for actors, documents, risks, and tips.',
            'تحليل تشغيلي معمق لتخليص استيراد نموذجي في الأردن: من وثائق ما قبل الوصول عبر الأسيكودا ومدة ACT المجانية والدفع والإفراج وإغلاق الملف. وسّع كل خطوة للفاعلين والوثائق والمخاطر والنصائح.',
          )}
        </p>
      </div>

      <WorkflowFlowchart />

      <div className="space-y-16">
        {WORKFLOW_PHASES.map((phase) => (
          <section key={phase.id} id={`phase-${phase.id}`}>
            <div className="flex items-start gap-4 mb-6">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-700 text-accent font-bold text-lg"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {phase.number}
              </span>
              <div>
                <h2 className="text-xl font-semibold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                  {t(locale, phase.titleEn, phase.titleAr)}
                </h2>
                <p className="text-sm text-muted mt-1 max-w-2xl">
                  {t(locale, phase.summaryEn, phase.summaryAr)}
                </p>
              </div>
            </div>

            <div className="space-y-3 md:ms-16">
              {phase.steps.map((step) => {
                const isOpen = openStep === step.id;
                return (
                  <div
                    key={step.id}
                    className="rounded-xl bg-elevated border border-subtle overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenStep(isOpen ? null : step.id)}
                      className="w-full flex items-center justify-between gap-3 p-4 text-start hover:bg-navy-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono text-accent shrink-0">{step.number}</span>
                        <span className="text-sm font-semibold text-white truncate">
                          {t(locale, step.titleEn, step.titleAr)}
                        </span>
                      </div>
                      {isOpen ? (
                        <ChevronUp size={18} className="text-muted shrink-0" />
                      ) : (
                        <ChevronDown size={18} className="text-muted shrink-0" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-5 border-t border-subtle pt-4 space-y-4">
                        <p className="text-sm text-muted leading-relaxed">
                          {t(locale, step.detailEn, step.detailAr)}
                        </p>

                        <div className="flex items-center gap-2 text-xs text-dim">
                          <User size={14} />
                          <span>
                            {t(locale, 'Actor:', 'الفاعل:')}{' '}
                            <span className="text-slate-300">
                              {t(locale, step.actorEn, step.actorAr)}
                            </span>
                          </span>
                        </div>

                        {step.systemsEn && (
                          <p className="text-xs text-dim">
                            {t(locale, 'Systems:', 'الأنظمة:')}{' '}
                            <span className="text-slate-400">
                              {t(locale, step.systemsEn, step.systemsAr ?? step.systemsEn)}
                            </span>
                          </p>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                              <FileText size={12} />
                              {t(locale, 'Documents', 'الوثائق')}
                            </p>
                            <ul className="space-y-1">
                              {(locale === 'ar' ? step.documentsAr : step.documentsEn).map((d) => (
                                <li key={d} className="text-xs text-muted flex gap-1.5">
                                  <CheckCircle2 size={12} className="text-success shrink-0 mt-0.5" />
                                  {d}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                              <AlertTriangle size={12} />
                              {t(locale, 'Risks', 'المخاطر')}
                            </p>
                            <ul className="space-y-1">
                              {(locale === 'ar' ? step.risksAr : step.risksEn).map((r) => (
                                <li key={r} className="text-xs text-muted flex gap-1.5">
                                  <span className="text-warning shrink-0">•</span>
                                  {r}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                              <Lightbulb size={12} />
                              {t(locale, 'Tips', 'نصائح')}
                            </p>
                            <ul className="space-y-1">
                              {(locale === 'ar' ? step.tipsAr : step.tipsEn).map((tip) => (
                                <li key={tip} className="text-xs text-muted flex gap-1.5">
                                  <span className="text-accent shrink-0">•</span>
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-14 p-5 rounded-xl bg-navy-800/60 border border-subtle">
        <p className="text-xs text-dim leading-relaxed">
          {t(
            locale,
            'Operational guidance only. Selectivity, duty rates, free days, and authority rules change. Confirm against current Jordan Customs, ACT, JFDA, JSMO, and related official instructions before acting on any shipment.',
            'إرشاد تشغيلي فقط. الانتقائية ونسب الرسوم والأيام المجانية وقواعد الجهات تتغير. أكد مقابل تعليمات دائرة الجمارك وACT والغذاء والدواء والمواصفات والجهات ذات الصلة الحالية قبل التصرف في أي شحنة.',
          )}
        </p>
      </div>
    </div>
  );
}
