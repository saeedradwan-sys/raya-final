import { ExternalLink, Monitor, ListChecks, Shield, ClipboardCheck, FolderLock, BookMarked } from 'lucide-react';
import SectionNav from '@/components/SectionNav';
import { TERMS, TERM_CATEGORIES } from '@/content/terminology';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';
import {
  listIntegrationRoadmap,
  getAsycudaChannelStatus,
  listAsycudaDrafts,
  type AsycudaChannelInfo,
  type AsycudaQueueEntry,
} from '@/lib/asycudaAdapter';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ASYCUDA_OVERVIEW,
  ASYCUDA_STEPS,
  ASYCUDA_CHECKLIST_EN,
  ASYCUDA_CHECKLIST_AR,
  SELECTIVITY_LANES,
  INSPECTION_ACT,
  POST_CLEARANCE_AUDIT,
} from '@/content/asycuda';

export default function AsycudaPage() {
  const { locale } = useLocale();
  const [channel, setChannel] = useState<AsycudaChannelInfo | null>(null);
  const [queue, setQueue] = useState<AsycudaQueueEntry[]>([]);

  useEffect(() => {
    void getAsycudaChannelStatus().then(setChannel);
    void listAsycudaDrafts(10).then((res) => {
      if (res) setQueue(res.drafts);
    });
  }, []);
  const checklist = locale === 'ar' ? ASYCUDA_CHECKLIST_AR : ASYCUDA_CHECKLIST_EN;

  return (
    <div className="mx-auto max-w-6xl px-4 lg:px-8 py-12">
      <div className="max-w-3xl mb-10">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-navy-700 text-accent mb-4">
          <Monitor size={22} />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
          {t(locale, ASYCUDA_OVERVIEW.titleEn, ASYCUDA_OVERVIEW.titleAr)}
        </h1>
        <p className="text-muted text-sm leading-relaxed mb-3">
          {t(locale, ASYCUDA_OVERVIEW.whatEn, ASYCUDA_OVERVIEW.whatAr)}
        </p>
        <p className="text-sm text-slate-400 leading-relaxed mb-3">
          {t(locale, ASYCUDA_OVERVIEW.accessEn, ASYCUDA_OVERVIEW.accessAr)}
        </p>
        <p className="text-xs text-dim leading-relaxed">
          {t(locale, ASYCUDA_OVERVIEW.disclaimerEn, ASYCUDA_OVERVIEW.disclaimerAr)}
        </p>
      </div>

      <div className="mb-8 p-4 rounded-xl bg-elevated border border-subtle flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {t(
            locale,
            'Official portal is controlled by Jordan Customs. Use the credentials issued to your licensed broker office.',
            'البوابة الرسمية تحت سيطرة دائرة الجمارك. استخدم بيانات الدخول الصادرة لمكتب المخلص المرخص.',
          )}
        </p>
        <a
          href="https://www.customs.gov.jo"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-accent hover:underline shrink-0"
        >
          {t(locale, 'Customs website', 'موقع الجمارك')}
          <ExternalLink size={14} />
        </a>
      </div>

      {/* Steps */}
      <SectionNav
        items={[
          { id: 'sec-steps', labelEn: 'Steps', labelAr: 'الخطوات' },
          { id: 'sec-lanes', labelEn: 'Selectivity', labelAr: 'الانتقائية' },
          { id: 'sec-inspection', labelEn: 'Inspection', labelAr: 'المعاينة' },
          { id: 'sec-pca', labelEn: 'PCA', labelAr: 'التدقيق اللاحق' },
          { id: 'sec-checklist', labelEn: 'Checklist', labelAr: 'القائمة' },
          { id: 'sec-terms', labelEn: 'Terms', labelAr: 'المصطلحات' },
        ]}
      />

      <h2 id="sec-steps" className="text-lg font-semibold text-white mb-5" style={{ fontFamily: 'var(--font-heading)' }}>
        {t(locale, 'Manual connect — step by step', 'الربط اليدوي — خطوة بخطوة')}
      </h2>

      <div className="space-y-4 mb-14">
        {ASYCUDA_STEPS.map((step) => (
          <div key={step.number} className="rounded-xl bg-elevated border border-subtle p-5">
            <div className="flex items-start gap-4">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-700 text-accent text-sm font-bold"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {step.number}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1.5">
                  {t(locale, step.titleEn, step.titleAr)}
                </h3>
                <p className="text-sm text-muted leading-relaxed">
                  {t(locale, step.detailEn, step.detailAr)}
                </p>
                {step.notesEn && (
                  <p className="text-xs text-dim mt-2">
                    {t(locale, step.notesEn, step.notesAr ?? step.notesEn)}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Selectivity lanes */}
      <div className="mb-14">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={18} className="text-accent" />
          <h2 id="sec-lanes" className="text-lg font-semibold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
            {t(locale, 'Selectivity lanes', 'مسارب الانتقائية')}
          </h2>
        </div>
        <p className="text-sm text-muted mb-5 max-w-3xl">
          {t(
            locale,
            'After registration, the risk engine assigns a lane. Partner agencies may add a second control on top of Customs.',
            'بعد التسجيل يعيّن محرك المخاطر مسرباً. قد تضيف الجهات الشريكة رقابة ثانية فوق الجمارك.',
          )}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SELECTIVITY_LANES.map((lane) => (
            <div key={lane.id} className="rounded-xl bg-elevated border border-subtle p-5">
              <span
                className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full border mb-3 ${lane.badge}`}
              >
                {t(locale, lane.colourEn, lane.colourAr)}
              </span>
              <p className="text-sm font-medium text-white mb-2">
                {t(locale, lane.meaningEn, lane.meaningAr)}
              </p>
              <p className="text-xs text-muted leading-relaxed mb-3">
                {t(locale, lane.actionEn, lane.actionAr)}
              </p>
              <p className="text-xs text-dim leading-relaxed border-t border-subtle pt-3">
                <span className="text-slate-400 font-medium">
                  {t(locale, 'Broker: ', 'المخلص: ')}
                </span>
                {t(locale, lane.brokerEn, lane.brokerAr)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Inspection Act */}
      <div className="mb-14">
        <div className="flex items-center gap-2 mb-2">
          <ClipboardCheck size={18} className="text-accent" />
          <h2 id="sec-inspection" className="text-lg font-semibold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
            {t(locale, INSPECTION_ACT.titleEn, INSPECTION_ACT.titleAr)}
          </h2>
        </div>
        <p className="text-sm text-muted mb-6 max-w-3xl leading-relaxed">
          {t(locale, INSPECTION_ACT.whatEn, INSPECTION_ACT.whatAr)}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="rounded-xl bg-elevated border border-subtle p-5">
            <h3 className="text-sm font-semibold text-white mb-3">
              {t(locale, 'What the act typically records', 'ما يسجّله المحضر عادة')}
            </h3>
            <ul className="space-y-2">
              {(locale === 'ar' ? INSPECTION_ACT.recordsAr : INSPECTION_ACT.recordsEn).map((item) => (
                <li key={item} className="text-xs text-muted flex gap-2">
                  <span className="text-accent shrink-0">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl bg-elevated border border-subtle p-5">
            <h3 className="text-sm font-semibold text-white mb-3">
              {t(locale, 'Broker actions during exam', 'إجراءات المخلص أثناء المعاينة')}
            </h3>
            <ul className="space-y-2">
              {(locale === 'ar' ? INSPECTION_ACT.brokerAr : INSPECTION_ACT.brokerEn).map((item) => (
                <li key={item} className="text-xs text-muted flex gap-2">
                  <span className="text-warning shrink-0">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {INSPECTION_ACT.outcomes.map((o) => (
            <div key={o.code} className="rounded-lg bg-navy-900 border border-subtle p-4">
              <p className="text-xs font-semibold text-white mb-1">
                {t(locale, o.labelEn, o.labelAr)}
              </p>
              <p className="text-[11px] text-dim leading-relaxed">
                {t(locale, o.detailEn, o.detailAr)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Post-clearance audit */}
      <div className="mb-14">
        <div className="flex items-center gap-2 mb-2">
          <FolderLock size={18} className="text-accent" />
          <h2 id="sec-pca" className="text-lg font-semibold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
            {t(locale, POST_CLEARANCE_AUDIT.titleEn, POST_CLEARANCE_AUDIT.titleAr)}
          </h2>
        </div>
        <p className="text-sm text-muted mb-3 max-w-3xl leading-relaxed">
          {t(locale, POST_CLEARANCE_AUDIT.whatEn, POST_CLEARANCE_AUDIT.whatAr)}
        </p>
        <p className="text-xs text-dim mb-6 max-w-3xl leading-relaxed">
          {t(locale, POST_CLEARANCE_AUDIT.whyEn, POST_CLEARANCE_AUDIT.whyAr)}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl bg-elevated border border-subtle p-5">
            <h3 className="text-sm font-semibold text-white mb-3">
              {t(locale, 'What can trigger PCA', 'ما قد يطلق التدقيق اللاحق')}
            </h3>
            <ul className="space-y-2">
              {(locale === 'ar' ? POST_CLEARANCE_AUDIT.triggersAr : POST_CLEARANCE_AUDIT.triggersEn).map(
                (item) => (
                  <li key={item} className="text-xs text-muted flex gap-2">
                    <span className="text-sky-400 shrink-0">•</span>
                    {item}
                  </li>
                ),
              )}
            </ul>
          </div>
          <div className="rounded-xl bg-elevated border border-subtle p-5">
            <h3 className="text-sm font-semibold text-white mb-3">
              {t(locale, 'Keep in the case file', 'احتفظ به في ملف الشحنة')}
            </h3>
            <ul className="space-y-2">
              {(locale === 'ar' ? POST_CLEARANCE_AUDIT.keepAr : POST_CLEARANCE_AUDIT.keepEn).map((item) => (
                <li key={item} className="text-xs text-muted flex gap-2">
                  <span className="text-success shrink-0">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl bg-elevated border border-subtle p-5">
            <h3 className="text-sm font-semibold text-white mb-3">
              {t(locale, 'File discipline', 'انضباط الملف')}
            </h3>
            <ul className="space-y-2">
              {(locale === 'ar' ? POST_CLEARANCE_AUDIT.disciplineAr : POST_CLEARANCE_AUDIT.disciplineEn).map(
                (item) => (
                  <li key={item} className="text-xs text-muted flex gap-2">
                    <span className="text-accent shrink-0">•</span>
                    {item}
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-warning/30 bg-warning/5 p-5">
          <h3 className="text-sm font-semibold text-warning mb-2">
            {t(locale, 'Audit risk if the file is weak', 'مخاطر التدقيق إذا ضعف الملف')}
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(locale === 'ar' ? POST_CLEARANCE_AUDIT.risksAr : POST_CLEARANCE_AUDIT.risksEn).map((item) => (
              <li key={item} className="text-xs text-muted flex gap-2">
                <span className="text-warning shrink-0">!</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Checklist */}
      <div className="rounded-xl bg-elevated border border-subtle p-6">
        <div className="flex items-center gap-2 mb-4">
          <ListChecks size={18} className="text-accent" />
          <h2 id="sec-checklist" className="text-base font-semibold text-white">
            {t(locale, 'Pre-submit & close-out checklist', 'قائمة ما قبل الإرسال والإغلاق')}
          </h2>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {checklist.map((item) => (
            <li key={item} className="text-sm text-muted flex gap-2">
              <span className="text-success">✓</span>
              {item}
            </li>
          ))}
        </ul>

      {/* Terminology glossary */}
      <div id="sec-terms" className="mt-14">
        <div className="flex items-center gap-2 mb-2">
          <BookMarked size={18} className="text-accent" />
          <h2 className="text-lg font-semibold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
            {t(locale, 'Arabic terminology glossary', 'مسرد المصطلحات العربية')}
          </h2>
        </div>
        <p className="text-sm text-muted mb-6 max-w-3xl leading-relaxed prose-ar">
          {t(
            locale,
            'Standard English ↔ Arabic terms used in Jordan clearance, ASYCUDA, ACT, and broker accounting.',
            'مصطلحات قياسية إنجليزي ↔ عربي مستخدمة في التخليص الأردني والأسيكودا وACT ومحاسبة المخلص.',
          )}
        </p>
        <div className="space-y-8">
          {TERM_CATEGORIES.map((cat) => {
            const items = TERMS.filter((x) => x.category === cat.id);
            return (
              <div key={cat.id}>
                <h3 className="text-sm font-semibold text-slate-300 mb-3">
                  {t(locale, cat.en, cat.ar)}
                </h3>
                <div className="overflow-x-auto rounded-xl border border-subtle">
                  <table className="w-full text-sm" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                    <thead>
                      <tr className="bg-navy-800 text-dim text-[11px]">
                        <th className="text-start px-3 py-2.5 font-medium">
                          {t(locale, 'English', 'الإنجليزية')}
                        </th>
                        <th className="text-start px-3 py-2.5 font-medium">
                          {t(locale, 'Arabic', 'العربية')}
                        </th>
                        <th className="text-start px-3 py-2.5 font-medium">
                          {t(locale, 'Meaning', 'المعنى')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((term) => (
                        <tr key={term.id} className="border-t border-subtle">
                          <td className="px-3 py-2.5 text-slate-300 text-xs">{term.en}</td>
                          <td className="px-3 py-2.5 text-white text-xs font-medium">{term.ar}</td>
                          <td className="px-3 py-2.5 text-dim text-xs leading-relaxed prose-ar">
                            {t(locale, term.defEn, term.defAr)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      </div>

      <section className="mx-auto max-w-6xl px-4 lg:px-8 pb-16">
        <h2 className="text-lg font-semibold text-white mb-2">
          {t(locale, 'System integration (roadmap)', 'تكامل الأنظمة (خارطة طريق)')}
        </h2>
        {channel && (
          <div className={`mb-4 rounded-lg border px-3 py-2 text-xs ${channel.live ? 'border-emerald-500/40 text-emerald-200' : 'border-amber-500/40 text-amber-100'}`}>
            <strong>{t(locale, 'API channel', 'قناة API')}:</strong> {channel.mode}
            {!channel.live && (
              <span className="block mt-1 text-dim">
                {t(
                  locale,
                  'Simulation only. Live requires RAYA_ASYCUDA_MODE=live and Customs URL.',
                  'محاكاة فقط. الوضع الحي يتطلب RAYA_ASYCUDA_MODE=live ورابط الجمارك.',
                )}
              </span>
            )}
          </div>
        )}
        {queue.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted mb-2">{t(locale, 'Recent channel drafts', 'مسودات القناة الأخيرة')}</p>
            <ul className="text-xs text-dim space-y-1 font-mono">
              {queue.slice(0, 5).map((d) => (
                <li key={d.id}>
                  {d.id.slice(0, 12)}… · {d.status} · {d.channel} · {d.externalRef || '—'}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-sm text-muted mb-4 max-w-2xl prose-ar leading-relaxed">
          {t(
            locale,
            'Live ASYCUDA/NSW/ASYHUB access was requested but refused by Jordan Customs. Raya provides high-quality manual draft export (JSON/XML) and checklists for reliable handoff. The adapter remains ready if authorization is granted in the future.',
            'تم رفض طلب الوصول الحي إلى الأسيكودا/النافذة/ASYHUB من قبل الجمارك الأردنية. راية توفر تصدير مسودات عالية الجودة (JSON/XML) وقوائم تحقق لتسليم يدوي موثوق. المحوّل جاهز إذا تم منح التفويض مستقبلاً.',
          )}
        </p>
        <ul className="text-xs text-muted space-y-1 mb-4">
          {listIntegrationRoadmap().map((r) => (
            <li key={r.phase}>
              P{r.phase} · {t(locale, r.titleEn, r.titleAr)} ·{' '}
              <span className={r.status === 'done' ? 'text-emerald-400' : r.status === 'next' ? 'text-amber-300' : 'text-dim'}>
                {r.status}
              </span>
            </li>
          ))}
        </ul>
        <Link to="/staff/assist" className="text-sm text-accent hover:underline">
          {t(locale, 'Export drafts from Assist agents', 'تصدير المسودات من وكلاء المساعدة')} →
        </Link>
      </section>
    </div>
  );
}