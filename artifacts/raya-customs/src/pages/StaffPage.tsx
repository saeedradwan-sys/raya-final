import { useState, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Container,
  Shield,
  Calculator,
  Archive,
  Search,
  Layers,
  AlertCircle,
  LogOut,
  Loader2,
  CheckCircle2,
  FolderLock,
  Bot,
  AlertTriangle,
} from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { DEMO_STAFF_TOKENS, staffSessionRemainingMs } from '@/lib/staffAuth';
import { formatDateTime } from '@/lib/dates';
import { formatSessionRemaining } from '@/content/portalI18n';
import { allShipments } from '@/lib/recordStore';
import { buildOpsAlerts } from '@/lib/opsAlerts';
import LoadingBlock from '@/components/LoadingBlock';
import { listAudit, listAuditMerged, auditToCsv, type AuditEvent } from '@/lib/auditLog';
import { downloadTextFile } from '@/lib/exportCsv';
import ServiceRequestQueue from '@/components/staff/ServiceRequestQueue';
import ControlBoard from '@/components/staff/ControlBoard';

const TOOLS = [
  {
    icon: Bot,
    titleEn: 'Assist agents',
    titleAr: 'وكلاء المساعدة',
    descEn: 'HS, documents, next action, and money-split coaches with human approve.',
    descAr: 'مدربو HS والوثائق والخطوة التالية وتقسيم المال مع اعتماد بشري.',
    href: '/staff/assist',
    roles: ['staff', 'agent', 'accounting'] as const,
  },
  {
    icon: Container,
    titleEn: 'Container tracking',
    titleAr: 'تتبع الحاويات',
    descEn: 'Discharge, free time, selectivity and release timeline per container.',
    descAr: 'خط زمني للتفريغ والمدة المجانية والانتقائية والإفراج لكل حاوية.',
    href: '/staff/tracking',
    roles: ['staff', 'agent', 'accounting'] as const,
  },
  {
    icon: FolderLock,
    titleEn: 'Declaration draft editor',
    titleAr: 'محرر مسودة البيان',
    descEn: 'Edit HS, values, documents checklist, export JSON/XML for ASYCUDA handoff.',
    descAr: 'تحرير HS والقيم وقائمة الوثائق وتصدير JSON/XML للتسليم للأسيكودا.',
    href: '/staff/draft',
    roles: ['staff', 'agent', 'accounting'] as const,
  },
  {
    icon: Search,
    titleEn: 'HS classification',
    titleAr: 'تصنيف HS',
    descEn: 'Search and assign Jordan HS codes to invoice lines with confidence scoring.',
    descAr: 'بحث وتعيين رموز النظام المنسق لأسطر الفاتورة مع تقييم الثقة.',
    href: '/hs-search',
    roles: ['staff', 'agent', 'accounting'] as const,
  },
  {
    icon: Layers,
    titleEn: 'Shipment case builder',
    titleAr: 'بناء ملف الشحنة',
    descEn: 'Create cases from B/L, classify lines, attach documents, track containers.',
    descAr: 'إنشاء ملفات من بوليصة الشحن، تصنيف البنود، إرفاق الوثائق، تتبع الحاويات.',
    href: '/workflow',
    roles: ['staff', 'agent'] as const,
  },
  {
    icon: Calculator,
    titleEn: 'Disbursement accounting',
    titleAr: 'محاسبة المدفوعات',
    descEn: 'Clearing 122100/222100, journal, reconciliation, CSV export.',
    descAr: 'تسوية 122100/222100، القيود، المطابقة، تصدير CSV.',
    href: '/staff/accounting',
    roles: ['staff', 'accounting'] as const,
  },
  {
    icon: Archive,
    titleEn: 'Previous records',
    titleAr: 'السجلات السابقة',
    descEn: 'Add and manage historical shipments and clearing files in the private records store.',
    descAr: 'إضافة وإدارة الشحنات وملفات التسوية التاريخية في مخزن السجلات الخاص.',
    href: '/staff/records',
    roles: ['staff', 'agent', 'accounting'] as const,
  },
];



export default function StaffPage() {
  const { locale } = useLocale();
  const { session, isAuthenticated, loading, login, logout } = useStaffAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      setAuditEvents([]);
      setAuditSource('local');
      setAuditTotal(null);
      return;
    }
    let cancelled = false;
    void listAuditMerged(50).then((res) => {
      if (cancelled) return;
      setAuditEvents(res.events);
      setAuditSource(res.source);
      setAuditTotal(res.stats?.totalLines ?? null);
    });
    const id = window.setInterval(() => {
      void listAuditMerged(50).then((res) => {
        if (cancelled) return;
        setAuditEvents(res.events);
        setAuditSource(res.source);
        setAuditTotal(res.stats?.totalLines ?? null);
      });
    }, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isAuthenticated, session?.accessToken]);
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [auditSource, setAuditSource] = useState<'server' | 'local' | 'merged'>('local');
  const [auditTotal, setAuditTotal] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    window.setTimeout(async () => {
      const demoToken = import.meta.env.DEV && token in DEMO_STAFF_TOKENS;
      const result = await login(demoToken ? token : `${email.trim()}|${token}`);
      setSubmitting(false);
      if (!result.ok) {
        setError(
          result.error === 'required'
            ? t(locale, 'Work email and activation code are required.', 'بريد العمل ورمز التفعيل مطلوبان.')
            : result.error === 'network'
              ? t(locale, 'The secure login service is unavailable. Try again shortly.', 'خدمة الدخول الآمن غير متاحة حالياً. حاول مرة أخرى بعد قليل.')
              : result.error === 'rate_limited'
                ? t(locale, 'Too many login attempts. Wait before trying again.', 'محاولات دخول كثيرة. انتظر قبل المحاولة مرة أخرى.')
                : t(locale, 'Invalid work email or activation code.', 'بريد العمل أو رمز التفعيل غير صالح.'),
        );
      } else {
        setToken('');
      }
    }, 280);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 lg:px-8 py-12">
        <LoadingBlock rows={4} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 lg:px-8 py-12" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-xl mb-10">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-navy-700 text-accent mb-4">
          <Shield size={20} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent mb-2 prose-ar">
          {t(locale, 'Internal access', 'وصول داخلي')}
        </p>
        <h1
          className="text-3xl font-bold text-white mb-3"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {t(locale, 'Staff Workspace', 'مساحة الموظفين')}
        </h1>
        <p className="text-muted text-sm leading-relaxed prose-ar">
          {t(
            locale,
            'Internal tools for brokers and operations: classification, case management, disbursement modeling, and archive.',
            'أدوات داخلية للمخلصين والعمليات: التصنيف، إدارة الملفات، نمذجة المدفوعات، والأرشيف.',
          )}
        </p>
      </div>

      {isAuthenticated && session ? (
        <>
          <div className="mb-8 p-5 rounded-xl bg-elevated border border-subtle flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-success mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">
                  {t(locale, session.displayNameEn, session.displayNameAr)}
                </p>
                <p className="text-xs text-dim mt-0.5">
                  {t(locale, 'Role', 'الدور')}:{' '}
                  <span className="text-slate-300 font-mono">{session.role}</span>
                  {' · '}
                  {t(locale, 'Session', 'الجلسة')}:{' '}
                  {formatSessionRemaining(staffSessionRemainingMs(session), locale)}
                  {' · '}
                  {t(locale, 'Expires', 'تنتهي')}: {formatDateTime(session.expiresAt, locale)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-strong text-muted hover:text-white transition-colors"
            >
              <LogOut size={16} />
              {t(locale, 'Sign out', 'خروج')}
            </button>
          </div>

          <ServiceRequestQueue />

          <div className="mb-8">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400" />
              {t(locale, 'Ops alerts', 'تنبيهات تشغيلية')}
            </h2>
            <ul className="space-y-2">
              {buildOpsAlerts(allShipments()).slice(0, 8).map((a) => (
                <li
                  key={a.id}
                  className={`rounded-lg border px-3 py-2 text-xs ${
                    a.severity === 'critical'
                      ? 'border-red-500/40 bg-red-500/10 text-red-100'
                      : a.severity === 'warning'
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-50'
                        : 'border-subtle bg-elevated text-muted'
                  }`}
                >
                  <span className="font-medium">{t(locale, a.titleEn, a.titleAr)}</span>
                  <span className="text-dim block mt-0.5">{t(locale, a.detailEn, a.detailAr)}</span>
                </li>
              ))}
              {buildOpsAlerts(allShipments()).length === 0 && (
                <li className="text-xs text-dim">{t(locale, 'No active alerts', 'لا تنبيهات نشطة')}</li>
              )}
            </ul>
          </div>

          <ControlBoard />
        </>
      ) : (
        <div className="max-w-sm mb-10">
          <div className="rounded-2xl border border-subtle bg-navy-900/80 p-5 shadow-xl shadow-black/20">
            <form onSubmit={handleSubmit} className="space-y-4" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="staff-email">
                  {t(locale, 'Work email', 'بريد العمل')}
                </label>
                <input
                  id="staff-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="name@company.com"
                  autoComplete="email"
                  disabled={submitting}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="staff-token">
                  {t(locale, 'Activation code', 'رمز التفعيل')}
                </label>
                <input
                  id="staff-token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="input-field"
                  placeholder="••••••••••••••••"
                  autoComplete="one-time-code"
                  disabled={submitting}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full py-2.5"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {t(locale, 'Unlock workspace', 'فتح المساحة')}
              </button>
            </form>
            {error && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 leading-relaxed"
              >
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                <span className="prose-ar">{error}</span>
              </div>
            )}
          </div>
          {import.meta.env.DEV && (
            <div className="mt-4 p-4 rounded-xl bg-elevated border border-subtle">
              <p className="text-[11px] text-dim mb-2.5">
                {t(locale, 'Demo tokens (click to fill)', 'رموز تجريبية (انقر للتعبئة)')}
              </p>
              <ul className="space-y-1.5">
                {Object.entries(DEMO_STAFF_TOKENS).map(([tok, meta]) => (
                  <li key={tok}>
                    <button
                      type="button"
                      onClick={() => {
                        setToken(tok);
                        setError('');
                      }}
                      className="w-full text-start text-xs rounded-lg bg-navy-900/80 border border-subtle px-3 py-2.5 hover:border-accent/40 transition-colors"
                    >
                      <span className="font-mono text-accent">{tok}</span>
                      <span className="block text-dim mt-0.5">
                        {t(locale, meta.nameEn, meta.nameAr)} · {meta.role}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <h2 className="text-lg font-semibold text-white mb-5" style={{ fontFamily: 'var(--font-heading)' }}>
        {t(locale, 'Available tools', 'الأدوات المتاحة')}
        {!isAuthenticated && (
          <span className="ms-2 text-xs font-normal text-dim">
            ({t(locale, 'sign in to unlock interactive tools', 'سجّل الدخول لتفعيل الأدوات')})
          </span>
        )}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TOOLS.filter((tool) => {
          if (!isAuthenticated || !session) return true;
          return (tool.roles as readonly string[]).includes(session.role);
        }).map((tool) => {
          const allowed =
            isAuthenticated &&
            session &&
            (tool.roles as readonly string[]).includes(session.role);
          const className = `rounded-xl bg-elevated border border-subtle p-5 transition-opacity ${
            isAuthenticated ? 'opacity-100' : 'opacity-70'
          } ${allowed ? 'hover:border-accent cursor-pointer' : ''}`;
          const inner = (
            <>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-700 text-accent mb-3">
                <tool.icon size={18} />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">
                {t(locale, tool.titleEn, tool.titleAr)}
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                {t(locale, tool.descEn, tool.descAr)}
              </p>
              {allowed && (
                <p className="mt-3 text-[11px] text-accent">
                  {t(locale, 'Open →', 'فتح ←')}
                </p>
              )}
            </>
          );
          if (allowed) {
            return (
              <Link key={tool.titleEn} to={tool.href} className={className}>
                {inner}
              </Link>
            );
          }
          return (
            <div key={tool.titleEn} className={className}>
              {inner}
            </div>
          );
        })}
      </div>


      {isAuthenticated && (
        <div className="mt-12 rounded-xl bg-elevated border border-subtle p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-semibold text-white">
              {t(locale, 'Session audit log', 'سجل تدقيق الجلسة')}
            </h3>
            <button
              type="button"
              className="text-xs px-3 py-1.5 rounded-lg border border-subtle text-muted hover:text-white"
              onClick={() => {
                const rows = auditEvents.length ? auditEvents : listAudit(100);
                downloadTextFile(`raya-audit-${Date.now()}.csv`, auditToCsv(rows));
              }}
            >
              {t(locale, 'Export CSV', 'تصدير CSV')}
            </button>
          </div>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {auditEvents.length === 0 ? (
              <li className="text-xs text-dim">{t(locale, 'No events yet', 'لا أحداث بعد')}</li>
            ) : (
              auditEvents.slice(0, 20).map((e) => (
                <li key={e.id} className="text-xs text-muted border-b border-subtle pb-2">
                  <span className="font-mono text-dim">{e.at.slice(11, 19)}</span>
                  <span className="mx-2 text-accent">{e.actor}</span>
                  <span className="text-slate-300">{e.action}</span>
                  {e.serverPersisted && (
                    <span className="ms-2 text-[10px] text-emerald-400">
                      {t(locale, 'server', 'خادم')}
                    </span>
                  )}
                  <span className="block text-dim mt-0.5 prose-ar">
                    {t(locale, e.detailEn, e.detailAr)}
                  </span>
                </li>
              ))
            )}
          </ul>
          <p className="text-[10px] text-dim mt-3">
            {t(
              locale,
              `Source: ${auditSource}` +
                (auditTotal != null ? ` · server lines: ${auditTotal}` : '') +
                '. Append-only on the API; unsynced device entries remain clearly identified.',
              `المصدر: ${auditSource}` +
                (auditTotal != null ? ` · سطور الخادم: ${auditTotal}` : '') +
                '. سجل إضافة فقط على الواجهة؛ وتبقى إدخالات الجهاز غير المتزامنة محددة بوضوح.',
            )}
          </p>
        </div>
      )}

      <div className="mt-12 p-6 rounded-xl bg-elevated border border-subtle">
        <h3 className="text-sm font-semibold text-white mb-2">
          {t(locale, 'Core accounting rule', 'قاعدة المحاسبة الأساسية')}
        </h3>
        <p className="text-xs text-muted leading-relaxed max-w-3xl">
          {t(
            locale,
            'Client disbursements (duties, port fees, government charges) post to clearing accounts 122100 (asset / pay-first) or 222100 (liability / prepay). Agency service revenue posts to 411100. Never book pass-through amounts as ordinary revenue and expense — it inflates turnover, distorts margins, and creates incorrect VAT exposure.',
            'مدفوعات العميل (الرسوم، أجور الميناء، الرسوم الحكومية) تُقيَّد في حسابات التسوية 122100 (أصل / دفع أولاً) أو 222100 (التزام / دفع مسبق). إيراد خدمة الوكالة يُقيَّد في 411100. لا تقيّد أبداً المبالغ الممرَّرة كإيراد ومصروف عاديين — ذلك يضخّم حجم الأعمال ويشوّه الهوامش ويخلق تعرضاً خاطئاً لضريبة المبيعات.',
          )}
        </p>
      </div>
    </div>
  );
}
