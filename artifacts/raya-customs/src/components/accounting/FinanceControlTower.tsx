import {
  ArrowUpRight,
  CircleCheck,
  CircleDollarSign,
  FileClock,
  Landmark,
  ReceiptText,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';
import { formatJod } from '@/lib/disbursementCalc';
import type { AccountingMetrics, FinanceControls } from '@/lib/accountingApi';
import type { ClearingReconciliation } from '@/lib/types';
import type { RecoveryItem } from '@/lib/recoveryQueue';

type TabId = 'workspace' | 'invoices' | 'gst' | 'recon' | 'reference';

interface Props {
  metrics: AccountingMetrics;
  controls: FinanceControls;
  recoveryQueue: RecoveryItem[];
  recon: ClearingReconciliation;
  onNavigate: (tab: TabId) => void;
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${
        ok
          ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
          : 'border-amber-400/25 bg-amber-400/10 text-amber-100'
      }`}
    >
      {ok ? <CircleCheck size={12} /> : <TriangleAlert size={12} />}
      {label}
    </span>
  );
}

export default function FinanceControlTower({ metrics, controls, recoveryQueue, recon, onNavigate }: Props) {
  const { locale } = useLocale();
  const recoveryTotal = recoveryQueue.reduce((sum, row) => sum + row.openAmount, 0);
  const controlItems = [
    {
      label: t(locale, 'Clearing tie-out', 'مطابقة التسوية'),
      detail: recon.tiedOut ? t(locale, 'Subledger agrees with GL', 'المساعد يطابق الأستاذ') : t(locale, 'Review reconciling items', 'راجع بنود المطابقة'),
      ok: recon.tiedOut,
      onClick: () => onNavigate('recon'),
    },
    {
      label: t(locale, 'Journal integrity', 'سلامة القيود'),
      detail: controls.unbalancedJournalCount === 0 ? t(locale, `${controls.postedJournalCount} posted entries balanced`, `${controls.postedJournalCount} قيد مرحّل متوازن`) : t(locale, `${controls.unbalancedJournalCount} entries need review`, `${controls.unbalancedJournalCount} قيود تحتاج مراجعة`),
      ok: controls.unbalancedJournalCount === 0,
      onClick: () => onNavigate('workspace'),
    },
    {
      label: t(locale, 'Invoice collection', 'تحصيل الفواتير'),
      detail: controls.overdueInvoiceCount === 0 ? t(locale, 'No overdue invoices', 'لا فواتير متأخرة') : t(locale, `${controls.overdueInvoiceCount} overdue · review now`, `${controls.overdueInvoiceCount} متأخرة · راجع الآن`),
      ok: controls.overdueInvoiceCount === 0,
      onClick: () => onNavigate('invoices'),
    },
  ];

  return (
    <section className="finance-tower mb-8" aria-labelledby="finance-tower-title">
      <div className="finance-tower__header">
        <div>
          <div className="finance-tower__eyebrow">
            <ShieldCheck size={14} /> {t(locale, 'Finance control tower', 'برج التحكم المالي')}
          </div>
          <h2 id="finance-tower-title">{t(locale, 'Close-ready visibility for every file.', 'رؤية جاهزة للإقفال لكل ملف.')}</h2>
          <p>{t(locale, 'A single operating view for cash exposure, client recovery, tax, and ledger controls.', 'رؤية تشغيلية واحدة للتعرض النقدي، استرداد العملاء، الضريبة وضوابط الأستاذ.')}</p>
        </div>
        <div className="finance-tower__period">
          <span>{t(locale, 'Control date', 'تاريخ الرقابة')}</span>
          <strong>{recon.asOf}</strong>
          <span>{t(locale, 'JOD · server source of truth', 'دينار · مصدر الخادم')}</span>
        </div>
      </div>

      <div className="finance-tower__metrics">
        <div className="finance-metric finance-metric--lime">
          <div className="finance-metric__icon"><CircleDollarSign size={16} /></div>
          <span>{t(locale, 'Open client exposure', 'التعرض المفتوح على العملاء')}</span>
          <strong>{formatJod(metrics.openReceivable + metrics.openPrepayLiability, locale)}</strong>
          <small>{t(locale, '122100 + 222100 clearing balances', 'أرصدة التسوية 122100 + 222100')}</small>
        </div>
        <div className="finance-metric">
          <div className="finance-metric__icon"><Landmark size={16} /></div>
          <span>{t(locale, 'Recognized service revenue', 'إيراد الخدمة المعترف به')}</span>
          <strong>{formatJod(metrics.recognizedRevenue, locale)}</strong>
          <small>{metrics.caseCount} {t(locale, 'files in portfolio', 'ملفات في المحفظة')}</small>
        </div>
        <div className="finance-metric finance-metric--amber">
          <div className="finance-metric__icon"><FileClock size={16} /></div>
          <span>{t(locale, 'Recovery queue', 'طابور الاسترداد')}</span>
          <strong>{formatJod(recoveryTotal, locale)}</strong>
          <small>{recoveryQueue.length} {t(locale, 'items requiring follow-up', 'بنود تتطلب متابعة')}</small>
        </div>
        <div className="finance-metric finance-metric--sky">
          <div className="finance-metric__icon"><ReceiptText size={16} /></div>
          <span>{t(locale, 'Overdue invoices', 'الفواتير المتأخرة')}</span>
          <strong>{formatJod(controls.overdueAmount, locale)}</strong>
          <small>{controls.overdueInvoiceCount} {t(locale, 'overdue ·', 'متأخرة ·')} {controls.openInvoiceCount} {t(locale, 'open total', 'مفتوحة إجمالاً')}</small>
        </div>
      </div>

      <div className="finance-tower__footer">
        <div className="finance-tower__checks">
          {controlItems.map((item) => (
            <button key={item.label} type="button" className="finance-check" onClick={item.onClick}>
              <StatusPill ok={item.ok} label={item.label} />
              <span>{item.detail}</span>
              <ArrowUpRight size={13} />
            </button>
          ))}
        </div>
        <button type="button" className="finance-tower__action" onClick={() => onNavigate('recon')}>
          {t(locale, 'Open close checklist', 'فتح قائمة الإقفال')} <ArrowUpRight size={14} />
        </button>
      </div>
    </section>
  );
}
