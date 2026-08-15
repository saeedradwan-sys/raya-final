import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';
import { PROCEDURE_PHASES } from '@/content/procedures';

export default function ProceduresPage() {
  const { locale } = useLocale();

  return (
    <div className="mx-auto max-w-6xl px-4 lg:px-8 py-12">
      <div className="max-w-2xl mb-12">
        <h1
          className="text-3xl font-bold text-white mb-3"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {t(locale, 'Clearance Procedures', 'إجراءات التخليص')}
        </h1>
        <p className="text-muted text-sm leading-relaxed">
          {t(
            locale,
            'A practical three-phase guide for import clearance in Jordan. Requirements vary by product, origin, and selectivity. Confirm current rules with the competent authority.',
            'دليل عملي من ثلاث مراحل للتخليص الاستيرادي في الأردن. المتطلبات تختلف حسب المنتج والمنشأ والانتقائية. أكد القواعد الحالية مع الجهة المختصة.',
          )}
        </p>
      </div>

      <div className="space-y-12">
        {PROCEDURE_PHASES.map((phase) => (
          <section key={phase.id}>
            <div className="flex items-center gap-4 mb-6">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-700 text-accent font-bold text-lg"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {phase.number}
              </span>
              <h2 className="text-xl font-semibold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                {t(locale, phase.titleEn, phase.titleAr)}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ms-0 md:ms-16">
              {phase.steps.map((step, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-elevated border border-subtle p-5"
                >
                  <h3 className="text-sm font-semibold text-white mb-2">
                    {t(locale, step.titleEn, step.titleAr)}
                  </h3>
                  <p className="text-xs text-muted leading-relaxed">
                    {t(locale, step.detailEn, step.detailAr)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-14 p-5 rounded-xl bg-navy-800/60 border border-subtle">
        <p className="text-xs text-dim leading-relaxed">
          {t(
            locale,
            'This is operational guidance, not legal advice. Selectivity lanes, duty rates, and authority requirements change. Always verify against the latest Jordan Customs, JFDA, JSMO, and related instructions before lodging a declaration.',
            'هذا إرشاد تشغيلي وليس استشارة قانونية. ممرات الانتقائية ونسب الرسوم ومتطلبات الجهات تتغير. تحقق دائماً من أحدث تعليمات دائرة الجمارك والمؤسسة العامة للغذاء والدواء ومؤسسة المواصفات والجهات ذات الصلة قبل تقديم البيان.',
          )}
        </p>
      </div>
    </div>
  );
}
