import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Container,
  FileCheck2,
  GitBranch,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';

const PATHS = [
  {
    icon: Container,
    titleEn: 'Track your shipment',
    titleAr: 'تتبّع شحنتك',
    bodyEn: 'Clients can follow shipment status, key documents, free-time milestones, and next steps in one private view.',
    bodyAr: 'يمكن للعملاء متابعة حالة الشحنة والمستندات الأساسية ومواعيد المدة المجانية والخطوات التالية في عرض خاص واحد.',
    href: '/portal',
    labelEn: 'Client portal',
    labelAr: 'بوابة العملاء',
    featured: true,
  },
  {
    icon: ShieldCheck,
    titleEn: 'Manage company operations',
    titleAr: 'إدارة عمليات الشركة',
    bodyEn: 'Staff access cases, documents, classification, accounting, operational alerts, and accountable handoffs.',
    bodyAr: 'يصل الموظفون إلى الملفات والمستندات والتصنيف والمحاسبة والتنبيهات التشغيلية وعمليات التسليم الواضحة.',
    href: '/staff',
    labelEn: 'Staff workspace',
    labelAr: 'مساحة الموظفين',
    featured: false,
  },
  {
    icon: GitBranch,
    titleEn: 'Plan a clearance',
    titleAr: 'التخطيط للتخليص',
    bodyEn: 'Explore the Jordan clearance workflow, HS search, requirements, authorities, and legal research before work begins.',
    bodyAr: 'استكشف سير التخليص الأردني وبحث HS والمتطلبات والجهات والبحث القانوني قبل بدء العمل.',
    href: '/workflow',
    labelEn: 'Open workflow',
    labelAr: 'فتح سير العمل',
    featured: false,
  },
];

const PROMISES = [
  {
    icon: LockKeyhole,
    titleEn: 'Private by design',
    titleAr: 'خصوصية من الأساس',
    bodyEn: 'Company workflows, records, and access are being rebuilt around protected private operations.',
    bodyAr: 'تُعاد بناء إجراءات الشركة وسجلاتها ووصولها حول عمليات خاصة ومحمية.',
  },
  {
    icon: FileCheck2,
    titleEn: 'Clear steps, accountable work',
    titleAr: 'خطوات واضحة وعمل مسؤول',
    bodyEn: 'Bring documents, classification, approvals, and handoffs together around each shipment file.',
    bodyAr: 'اجمع المستندات والتصنيف والاعتمادات والتسليمات حول كل ملف شحنة.',
  },
  {
    icon: Search,
    titleEn: 'Jordan clearance expertise',
    titleAr: 'خبرة التخليص الأردني',
    bodyEn: 'Practical guidance for customs, permits, ports, tax, HS classification, and ASYCUDA handoff.',
    bodyAr: 'إرشاد عملي للجمارك والتصاريح والموانئ والضريبة وتصنيف HS وتسليم الأسيكودا.',
  },
];

export default function HomePage() {
  const { locale } = useLocale();

  return (
    <div>
      <section className="relative overflow-hidden border-b border-subtle">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-950 to-navy-900" />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              'radial-gradient(circle at 14% 18%, rgba(59,130,246,0.18), transparent 28%), radial-gradient(circle at 86% 12%, rgba(16,185,129,0.12), transparent 24%), linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: 'auto, auto, 38px 38px, 38px 38px',
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-16 lg:px-8 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium text-sky-200 mb-6 prose-ar">
              <Sparkles size={14} className="text-accent" />
              {t(locale, 'Jordan Raya · Clearance & transport', 'راية الأردن · التخليص ونقل البضائع')}
            </div>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl" style={{ fontFamily: 'var(--font-heading)' }}>
              {t(locale, 'Track. Clear. Move forward.', 'تتبّع. خلّص. تحرّك إلى الأمام.')}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg prose-ar">
              {t(
                locale,
                'Track a shipment, prepare a clearance, or manage company operations from one private Jordan logistics workspace — with every action owned by a person, not automated away.',
                'تتبّع شحنة أو حضّر للتخليص أو أدر عمليات الشركة من مساحة عمل لوجستية أردنية خاصة واحدة — مع بقاء كل إجراء تحت مسؤولية شخص لا أتمتة غير مراقبة.',
              )}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/portal" className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover">
                <Container size={17} />
                {t(locale, 'Track a shipment', 'تتبّع شحنة')}
              </Link>
              <Link to="/staff" className="inline-flex items-center gap-2 rounded-lg border border-strong bg-navy-900/60 px-5 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-accent/60 hover:text-white">
                <ShieldCheck size={17} />
                {t(locale, 'Staff sign in', 'دخول الموظفين')}
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400 prose-ar">
              {[t(locale, 'Bilingual EN / AR', 'ثنائية اللغة عربي / إنجليزي'), t(locale, 'Human-approved workflows', 'إجراءات باعتماد بشري'), t(locale, 'Private operations foundation', 'أساس للعمليات الخاصة')].map((line) => (
                <span key={line} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-success" />
                  {line}
                </span>
              ))}
            </div>
            </div>
            <aside className="rounded-2xl border border-white/10 bg-navy-900/75 p-5 shadow-2xl shadow-black/20 backdrop-blur" aria-label={t(locale, 'Clearance journey', 'رحلة التخليص')}>
              <div className="flex items-center justify-between border-b border-subtle pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">{t(locale, 'Your next move', 'خطوتك التالية')}</p>
                  <h2 className="mt-1 text-lg font-semibold text-white">{t(locale, 'A clear shipment journey', 'رحلة شحنة واضحة')}</h2>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent"><Container size={20} /></div>
              </div>
              <ol className="mt-5 space-y-4">
                {[
                  { step: '01', titleEn: 'Track', titleAr: 'تتبّع', bodyEn: 'See the current shipment status in the client portal.', bodyAr: 'اطلع على حالة الشحنة الحالية في بوابة العملاء.' },
                  { step: '02', titleEn: 'Clear', titleAr: 'خلّص', bodyEn: 'Prepare documents, classification, and approvals with the team.', bodyAr: 'حضّر المستندات والتصنيف والاعتمادات مع الفريق.' },
                  { step: '03', titleEn: 'Move', titleAr: 'تحرّك', bodyEn: 'Confirm release, handoff, and the next accountable action.', bodyAr: 'أكد الإفراج والتسليم والإجراء التالي المسؤول عنه.' },
                ].map((item) => (
                  <li key={item.step} className="flex gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent/35 bg-accent/10 text-[10px] font-bold text-sky-200">{item.step}</span>
                    <div>
                      <p className="text-sm font-semibold text-white prose-ar">{t(locale, item.titleEn, item.titleAr)}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted prose-ar">{t(locale, item.bodyEn, item.bodyAr)}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Link to="/portal" className="mt-6 flex items-center justify-between rounded-lg border border-accent/35 bg-accent/10 px-4 py-3 text-sm font-semibold text-sky-100 transition-colors hover:bg-accent/20">
                {t(locale, 'Open secure client tracking', 'فتح تتبع العملاء الآمن')}
                <ArrowRight size={16} />
              </Link>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 lg:px-8 lg:py-18">
        <div className="mb-7 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{t(locale, 'Start here', 'ابدأ من هنا')}</p>
          <h2 className="mt-2 text-2xl font-semibold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
            {t(locale, 'Choose what you need now.', 'اختر ما تحتاجه الآن.')}
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {PATHS.map((path) => (
            <Link
              key={path.href}
              to={path.href}
              className={`group rounded-2xl border p-6 transition-all ${
                path.featured
                  ? 'border-accent/45 bg-gradient-to-br from-accent/15 to-navy-800 hover:border-accent'
                  : 'border-subtle bg-elevated hover:border-strong hover:bg-navy-700/80'
              }`}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900/70 text-accent ring-1 ring-white/10">
                <path.icon size={21} />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-white prose-ar">{t(locale, path.titleEn, path.titleAr)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted prose-ar">{t(locale, path.bodyEn, path.bodyAr)}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-accent">
                {t(locale, path.labelEn, path.labelAr)}
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-subtle bg-navy-900/60">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 lg:grid-cols-[1fr_2fr] lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-success">{t(locale, 'Built for the work', 'مصمم للعمل')}</p>
            <h2 className="mt-3 text-2xl font-semibold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
              {t(locale, 'Practical tools. Clear responsibility.', 'أدوات عملية. مسؤولية واضحة.')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted prose-ar">
              {t(locale, 'The platform supports the work; it does not submit declarations or move money automatically.', 'تدعم المنصة العمل ولا تقدّم بيانات أو تنفّذ مدفوعات تلقائياً.')}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {PROMISES.map((promise) => (
              <div key={promise.titleEn} className="rounded-xl border border-subtle bg-elevated/70 p-5">
                <promise.icon size={19} className="text-accent" />
                <h3 className="mt-4 text-sm font-semibold text-white prose-ar">{t(locale, promise.titleEn, promise.titleAr)}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted prose-ar">{t(locale, promise.bodyEn, promise.bodyAr)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 lg:px-8">
        <div className="rounded-2xl border border-subtle bg-elevated p-7 sm:p-9">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-accent"><Building2 size={18} /><span className="text-xs font-semibold uppercase tracking-[0.16em]">{t(locale, 'Jordan Raya', 'راية الأردن')}</span></div>
              <h2 className="mt-3 text-2xl font-semibold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
                {t(locale, 'Need to prepare for a clearance?', 'هل تحتاج إلى التحضير للتخليص؟')}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted prose-ar">
                {t(locale, 'Review the workflow first, then use the right tools for classification, requirements, authorities, and timing.', 'راجع سير العمل أولاً، ثم استخدم الأدوات المناسبة للتصنيف والمتطلبات والجهات والتوقيت.')}
              </p>
            </div>
            <Link to="/workflow" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-strong px-5 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-accent hover:text-white">
              {t(locale, 'Explore clearance workflow', 'استكشف سير التخليص')}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}