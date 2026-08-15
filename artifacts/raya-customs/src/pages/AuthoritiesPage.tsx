import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  Shield,
  Radio,
  Leaf,
  Briefcase,
  Globe,
  Receipt,
  Container,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';
import { AUTHORITIES } from '@/content/authorities';

const ICON_MAP: Record<string, LucideIcon> = {
  Building2,
  ShieldCheck,
  CheckCircle2,
  Shield,
  Radio,
  Leaf,
  Briefcase,
  Globe,
  Receipt,
  Container,
};

export default function AuthoritiesPage() {
  const { locale } = useLocale();

  return (
    <div className="mx-auto max-w-6xl px-4 lg:px-8 py-12">
      <div className="max-w-3xl mb-12">
        <h1 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
          {t(locale, 'Government departments & related bodies', 'الجهات الحكومية والهيئات ذات الصلة')}
        </h1>
        <p className="text-muted text-sm leading-relaxed">
          {t(
            locale,
            'Complete guide to the agencies that affect Jordan import and export clearance: Customs, JFDA, JSMO, Ministry of Industry & Trade, Agriculture, Telecom, security, ASEZA, tax, and ACT terminal.',
            'دليل شامل للجهات التي تؤثر على تخليص الاستيراد والتصدير في الأردن: الجمارك والغذاء والدواء والمواصفات ووزارة الصناعة والتجارة والزراعة والاتصالات والأمن ومنطقة العقبة والضريبة ومحطة ACT.',
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {AUTHORITIES.map((auth) => {
          const Icon = ICON_MAP[auth.icon] ?? Building2;
          return (
            <article
              key={auth.id}
              id={auth.id}
              className="rounded-xl bg-elevated border border-subtle p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-navy-700 text-accent">
                  <Icon size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="text-base font-semibold text-white">
                      {t(locale, auth.titleEn, auth.titleAr)}
                    </h2>
                    {auth.portalUrl && (
                      <a
                        href={auth.portalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                      >
                        {t(locale, 'Portal', 'البوابة')}
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-accent mb-2">
                    {t(locale, auth.roleEn, auth.roleAr)}
                  </p>
                  <p className="text-sm text-muted leading-relaxed mb-4">
                    {t(locale, auth.descriptionEn, auth.descriptionAr)}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-dim font-medium mb-1">
                        {t(locale, 'When required', 'متى تُطلب')}
                      </p>
                      <p className="text-slate-400">
                        {t(locale, auth.whenRequiredEn, auth.whenRequiredAr)}
                      </p>
                    </div>
                    <div>
                      <p className="text-dim font-medium mb-1">
                        {t(locale, 'Typical documents', 'وثائق نموذجية')}
                      </p>
                      <p className="text-slate-400">
                        {t(locale, auth.documentsEn, auth.documentsAr)}
                      </p>
                    </div>
                    <div>
                      <p className="text-dim font-medium mb-1">
                        {t(locale, 'Timeline', 'الجدول الزمني')}
                      </p>
                      <p className="text-slate-400">
                        {t(locale, auth.typicalTimelineEn, auth.typicalTimelineAr)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
