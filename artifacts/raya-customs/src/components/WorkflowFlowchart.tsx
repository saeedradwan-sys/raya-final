import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';
import { WORKFLOW_PHASES } from '@/content/workflow';
import { ChevronDown, ArrowRight } from 'lucide-react';

const PHASE_COLORS = [
  { border: 'border-blue-500/40', bg: 'bg-blue-500/10', text: 'text-blue-400', line: 'bg-blue-500/50' },
  { border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', text: 'text-emerald-400', line: 'bg-emerald-500/50' },
  { border: 'border-amber-500/40', bg: 'bg-amber-500/10', text: 'text-amber-400', line: 'bg-amber-500/50' },
  { border: 'border-violet-500/40', bg: 'bg-violet-500/10', text: 'text-violet-400', line: 'bg-violet-500/50' },
];

export default function WorkflowFlowchart() {
  const { locale } = useLocale();
  const isRtl = locale === 'ar';

  return (
    <div className="mb-14 rounded-2xl bg-elevated border border-subtle p-5 sm:p-8 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <h2
            className="text-lg font-semibold text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {t(locale, 'Clearance flowchart', 'مخطط سير التخليص')}
          </h2>
          <p className="text-xs text-dim mt-1">
            {t(
              locale,
              'Click a phase or step to jump to the detailed analysis below.',
              'انقر على مرحلة أو خطوة للانتقال إلى التحليل التفصيلي أدناه.',
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] uppercase tracking-wider text-dim">
          {WORKFLOW_PHASES.map((phase, i) => (
            <span key={phase.id} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${PHASE_COLORS[i]?.line ?? 'bg-slate-500'}`} />
              {t(locale, phase.titleEn, phase.titleAr)}
            </span>
          ))}
        </div>
      </div>

      {/* Desktop horizontal flow */}
      <div className="hidden lg:block">
        <div className="flex items-stretch gap-0">
          {WORKFLOW_PHASES.map((phase, pi) => {
            const color = PHASE_COLORS[pi] ?? PHASE_COLORS[0];
            const isLast = pi === WORKFLOW_PHASES.length - 1;
            return (
              <div key={phase.id} className="flex items-stretch flex-1 min-w-0">
                <div className="flex flex-col flex-1 min-w-0">
                  {/* Phase node */}
                  <a
                    href={`#phase-${phase.id}`}
                    className={`rounded-xl border ${color.border} ${color.bg} px-3 py-3 text-center hover:brightness-110 transition-all`}
                  >
                    <div
                      className={`text-xs font-bold ${color.text} mb-1`}
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {phase.number}
                    </div>
                    <div className="text-xs font-semibold text-white leading-snug">
                      {t(locale, phase.titleEn, phase.titleAr)}
                    </div>
                  </a>

                  {/* Vertical connector from phase to steps */}
                  <div className="flex justify-center py-2">
                    <div className={`w-px h-4 ${color.line}`} />
                  </div>

                  {/* Steps stack */}
                  <div className="flex flex-col gap-2 flex-1">
                    {phase.steps.map((step, si) => (
                      <a
                        key={step.id}
                        href={`#phase-${phase.id}`}
                        onClick={() => {
                          // allow native hash nav; detail expand handled on page
                        }}
                        className="group relative rounded-lg border border-subtle bg-navy-900/80 px-2.5 py-2 hover:border-strong hover:bg-navy-800 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <span className={`text-[10px] font-mono ${color.text} shrink-0 mt-0.5`}>
                            {step.number}
                          </span>
                          <span className="text-[11px] text-slate-300 leading-snug group-hover:text-white transition-colors">
                            {t(locale, step.titleEn, step.titleAr)}
                          </span>
                        </div>
                        {si < phase.steps.length - 1 && (
                          <div className="absolute start-1/2 -translate-x-1/2 -bottom-2 z-10">
                            <ChevronDown size={12} className="text-slate-600" />
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                </div>

                {/* Arrow between phases */}
                {!isLast && (
                  <div className="flex items-center px-1.5 shrink-0 self-start mt-5">
                    <div className={`h-0.5 w-4 ${color.line}`} />
                    <ArrowRight
                      size={16}
                      className={`${color.text} ${isRtl ? 'rotate-180' : ''}`}
                    />
                    <div className={`h-0.5 w-2 ${PHASE_COLORS[pi + 1]?.line ?? color.line}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile / tablet vertical flow */}
      <div className="lg:hidden space-y-0">
        {WORKFLOW_PHASES.map((phase, pi) => {
          const color = PHASE_COLORS[pi] ?? PHASE_COLORS[0];
          const isLast = pi === WORKFLOW_PHASES.length - 1;
          return (
            <div key={phase.id}>
              <a
                href={`#phase-${phase.id}`}
                className={`block rounded-xl border ${color.border} ${color.bg} px-4 py-3 hover:brightness-110 transition-all`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900/60 text-sm font-bold ${color.text}`}
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    {phase.number}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {t(locale, phase.titleEn, phase.titleAr)}
                    </p>
                    <p className="text-[11px] text-dim mt-0.5">
                      {phase.steps.length}{' '}
                      {t(locale, 'steps', 'خطوات')}
                    </p>
                  </div>
                </div>
              </a>

              {/* Step chips */}
              <div className="ms-5 border-s border-subtle ps-4 py-3 space-y-2">
                {phase.steps.map((step) => (
                  <a
                    key={step.id}
                    href={`#phase-${phase.id}`}
                    className="flex items-center gap-2 rounded-lg border border-subtle bg-navy-900/60 px-3 py-2 hover:border-strong transition-colors"
                  >
                    <span className={`text-[10px] font-mono ${color.text}`}>{step.number}</span>
                    <span className="text-xs text-slate-300">
                      {t(locale, step.titleEn, step.titleAr)}
                    </span>
                  </a>
                ))}
              </div>

              {!isLast && (
                <div className="flex justify-center py-1">
                  <ChevronDown size={18} className="text-slate-600" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lane legend */}
      <div className="mt-8 pt-5 border-t border-subtle flex flex-wrap gap-4 text-[11px] text-dim">
        <span>
          <span className="text-blue-400 font-medium">01</span>{' '}
          {t(locale, 'Docs & classification before arrival', 'الوثائق والتصنيف قبل الوصول')}
        </span>
        <span>
          <span className="text-emerald-400 font-medium">02</span>{' '}
          {t(locale, 'Terminal & free time clock', 'المحطة وساعة المدة المجانية')}
        </span>
        <span>
          <span className="text-amber-400 font-medium">03</span>{' '}
          {t(locale, 'ASYCUDA · selectivity · inspection', 'الأسيكودا · الانتقائية · المعاينة')}
        </span>
        <span>
          <span className="text-violet-400 font-medium">04</span>{' '}
          {t(locale, 'Pay · release · deliver · close', 'دفع · إفراج · تسليم · إغلاق')}
        </span>
      </div>
    </div>
  );
}
