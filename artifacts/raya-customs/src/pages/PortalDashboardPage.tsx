import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LogOut,
  Package,
  FileText,
  Ship,
  Clock,
  CheckCircle2,
  AlertCircle,

  Shield,
  ClipboardCheck,
  FolderLock,
} from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { trackCardFromShipment } from '@/lib/containerTracking';
import { t } from '@/lib/i18n';
import { usePortalAuth } from '@/hooks/usePortalAuth';
import type { PortalShipment, ShipmentStatus } from '@/lib/types';
import { LANE_STYLE, LANE_LABEL, OUTCOME_LABEL } from '@/lib/selectivityStyles';
import EmptyState from '@/components/EmptyState';
import { sessionRemainingMs } from '@/lib/portalAuth';
import { buildOpsAlerts } from '@/lib/opsAlerts';
import { portalCopy, formatSessionRemaining } from '@/content/portalI18n';
import { formatDate, formatDateTime } from '@/lib/dates';
import {
  createPortalServiceRequest,
  fetchPortalServiceRequests,
  type ServiceRequest,
  type ServiceRequestType,
} from '@/lib/serviceRequests';
import PortalNotificationCenter from '@/components/portal/PortalNotificationCenter';

const STATUS_STYLE: Record<ShipmentStatus, string> = {
  pre_arrival: 'text-slate-300 bg-slate-500/15',
  at_terminal: 'text-amber-300 bg-amber-500/15',
  declared: 'text-blue-300 bg-blue-500/15',
  doc_check: 'text-amber-300 bg-amber-500/15',
  under_inspection: 'text-orange-300 bg-orange-500/15',
  duties_paid: 'text-cyan-300 bg-cyan-500/15',
  released: 'text-emerald-300 bg-emerald-500/15',
  delivered: 'text-green-300 bg-green-500/15',
  closed: 'text-slate-400 bg-slate-500/10',
};


function ShipmentCard({
  shipment,
  onRequest,
  requestPending,
}: {
  shipment: PortalShipment;
  onRequest: (requestType: ServiceRequestType, shipment: PortalShipment) => void;
  requestPending: boolean;
}) {
  const { locale } = useLocale();
  const style = STATUS_STYLE[shipment.status] ?? STATUS_STYLE.pre_arrival;
  const lane = shipment.selectivityLane ?? null;
  const outcome = shipment.inspectionOutcome ?? null;

  return (
    <article className="rounded-xl bg-elevated border border-subtle p-5 hover:border-strong transition-colors">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs text-dim mb-1">
            <span className="text-dim">{portalCopy.shipmentId(locale)}: </span>
            <span className="font-mono">{shipment.id}</span>
          </p>
          <h3 className="text-sm font-semibold text-white">
            {t(locale, shipment.goodsEn, shipment.goodsAr)}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${style}`}
            title={portalCopy.status(locale)}
          >
            {t(locale, shipment.statusEn, shipment.statusAr)}
          </span>
          {lane ? (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${LANE_STYLE[lane]}`}
            >
              {t(locale, LANE_LABEL[lane].en, LANE_LABEL[lane].ar)}
            </span>
          ) : (
            <span className="text-[10px] text-dim px-2 py-0.5">
              {portalCopy.noSelectivityYet(locale)}
            </span>
          )}
        </div>
      </div>

      {/* Selectivity / inspection / PCA block */}
      {(lane || outcome || shipment.pcaOpen || shipment.inspectionNoteEn) && (
        <div className="mb-4 rounded-lg bg-navy-900/70 border border-subtle p-3 space-y-2">
          <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
            <Shield size={12} className="text-accent" />
            {portalCopy.customsControl(locale)}
          </p>
          {lane && (
            <p className="text-xs text-muted">
              {t(
                locale,
                'Selectivity assigned after ASYCUDA registration.',
                'الانتقائية تُعيَّن بعد تسجيل البيان في الأسيكودا.',
              )}
            </p>
          )}
          {outcome && (
            <p className="text-xs text-slate-300 flex items-start gap-1.5">
              <ClipboardCheck size={12} className="shrink-0 mt-0.5 text-orange-300" />
              <span>
                <span className="font-medium">
                  {t(locale, OUTCOME_LABEL[outcome].en, OUTCOME_LABEL[outcome].ar)}
                </span>
                {(shipment.inspectionNoteEn || shipment.inspectionNoteAr) && (
                  <span className="block text-dim mt-0.5">
                    {t(
                      locale,
                      shipment.inspectionNoteEn ?? '',
                      shipment.inspectionNoteAr ?? shipment.inspectionNoteEn ?? '',
                    )}
                  </span>
                )}
              </span>
            </p>
          )}
          {!outcome && shipment.inspectionNoteEn && (
            <p className="text-xs text-dim flex items-start gap-1.5">
              <AlertCircle size={12} className="shrink-0 mt-0.5 text-amber-300" />
              {t(
                locale,
                shipment.inspectionNoteEn,
                shipment.inspectionNoteAr ?? shipment.inspectionNoteEn,
              )}
            </p>
          )}
          {(shipment.pcaOpen || shipment.selectivityLane === 'blue') && (
            <div className="mt-2 rounded-lg border border-sky-500/40 bg-sky-500/10 p-3 space-y-2">
              <p className="text-xs text-sky-200 font-medium flex items-start gap-1.5">
                <FolderLock size={12} className="shrink-0 mt-0.5" />
                {t(
                  locale,
                  'Post-clearance audit (PCA) — file is open / blue lane',
                  'التدقيق اللاحق (PCA) — الملف مفتوح / المسرب الأزرق',
                )}
              </p>
              <p className="text-[11px] text-sky-100/90">
                {t(
                  locale,
                  'Goods may already be released, but Customs can still verify classification, origin, value and permits. Keep a complete audit pack ready.',
                  'قد تكون البضاعة مفرجة، لكن الجمارك ما زالت قادرة على التحقق من التصنيف والمنشأ والقيمة والتصاريح. أبقِ حزمة تدقيق كاملة جاهزة.',
                )}
              </p>
              <ul className="text-[10px] text-sky-100/80 space-y-0.5 list-disc ps-4">
                <li>{t(locale, 'Commercial invoice + packing list (as declared)', 'الفاتورة التجارية + قائمة التعبئة (كما صُرّح)')}</li>
                <li>{t(locale, 'B/L or AWB + delivery order references', 'البوليصة + مراجع أمر التسليم')}</li>
                <li>{t(locale, 'Certificate of origin (if preference claimed)', 'شهادة المنشأ (إن وُجدت مطالبة تفضيلية)')}</li>
                <li>{t(locale, 'Authority permits & lab results', 'تصاريح الجهات ونتائج المختبر')}</li>
                <li>{t(locale, 'ASYCUDA declaration print + assessment + payment receipts', 'طباعة البيان + التقدير + إيصالات الدفع')}</li>
                <li>{t(locale, 'Broker authorization & any amendment approvals', 'تفويض المخلص وأي موافقات تعديل')}</li>
              </ul>
              <p className="text-[10px] text-dim">
                {t(
                  locale,
                  'If Customs issues an audit notice: freeze deletions, appoint one response owner, answer within the deadline.',
                  'إذا أصدرت الجمارك إشعار تدقيق: أوقف الحذف، عيّن مسؤولاً واحداً للرد، وأجب ضمن المهلة.',
                )}
              </p>
              <Link to="/asycuda" className="text-[10px] text-accent hover:underline inline-block">
                {t(locale, 'Full PCA guide →', 'دليل التدقيق اللاحق الكامل →')}
              </Link>
            </div>
          )}
          {!shipment.pcaOpen && shipment.selectivityLane !== 'blue' && (
            <p className="text-[10px] text-dim">
              <Link to="/asycuda" className="text-accent hover:underline">
                {t(locale, 'Learn about lanes & inspection', 'تعرّف على المسارب والمعاينة')}
              </Link>
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted mb-4">
        {shipment.declarationNo && (
          <p>
            <span className="text-dim">{portalCopy.declaration(locale)}: </span>
            <span className="font-mono">{shipment.declarationNo}</span>
          </p>
        )}
        <p>
          <span className="text-dim">{portalCopy.bl(locale)}: </span>
          <span className="font-mono">{shipment.blNo}</span>
        </p>
        {shipment.containerNo && (
          <p>
            <span className="text-dim">{portalCopy.container(locale)}: </span>
            <span className="font-mono">{shipment.containerNo}</span>
          </p>
        )}
        {(() => {
          const card = trackCardFromShipment(shipment);
          if (!card) return null;
          return (
            <div className="mt-1 text-[11px] text-dim space-y-0.5">
              {card.lastFreeDay && (
                <p>
                  {t(locale, 'Last free day', 'آخر يوم مجاني')}:{' '}
                  <span
                    className={`font-mono ${
                      card.freeDaysLeft !== null && card.freeDaysLeft <= 1
                        ? 'text-danger'
                        : 'text-slate-300'
                    }`}
                  >
                    {card.lastFreeDay}
                    {card.freeDaysLeft !== null ? ` (${card.freeDaysLeft}d)` : ''}
                  </span>
                </p>
              )}
              <p>
                {t(locale, 'Phase', 'المرحلة')}: {card.phase}
                {card.risk === 'urgent' ? ' · ⚠' : ''}
              </p>
            </div>
          );
        })()}
        <p>
          <span className="text-dim">{portalCopy.origin(locale)}: </span>
          {t(locale, shipment.originEn, shipment.originAr)}
        </p>
        {shipment.dischargeDate && (
          <p>
            <span className="text-dim">{portalCopy.discharge(locale)}: </span>
            {formatDate(shipment.dischargeDate, locale, { style: 'medium' })}
          </p>
        )}
        {shipment.lastFreeDay && (
          <p className="flex items-center gap-1 flex-wrap">
            <Clock size={12} className="text-warning shrink-0" />
            <span className="text-dim">{portalCopy.lastFreeDay(locale)}: </span>
            <span className="text-warning">
              {formatDate(shipment.lastFreeDay, locale, { style: 'full' })}
            </span>
          </p>
        )}
        <p className="sm:col-span-2 text-[11px] text-dim">
          {t(locale, 'Updated', 'آخر تحديث')}: {formatDateTime(shipment.updatedAt, locale)}
        </p>
      </div>

      {/* Per-shipment self-service */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          disabled={requestPending}
          onClick={() => onRequest('payment', shipment)}
          className="text-[10px] px-2.5 py-1 rounded border border-subtle text-muted hover:text-accent hover:border-accent/40 disabled:opacity-50"
        >
          {t(locale, 'Request payment', 'طلب دفع')}
        </button>
        <button
          type="button"
          disabled={requestPending}
          onClick={() => onRequest('documents', shipment)}
          className="text-[10px] px-2.5 py-1 rounded border border-subtle text-muted hover:text-accent hover:border-accent/40 disabled:opacity-50"
        >
          {t(locale, 'Request docs', 'طلب وثائق')}
        </button>
      </div>
      <div className="border-t border-subtle pt-3">
        <p className="text-xs font-medium text-dim mb-2 flex items-center gap-1.5">
          <FileText size={12} />
          {portalCopy.documents(locale)}
        </p>
        <ul className="space-y-1.5">
          {shipment.documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-2 text-xs rounded-lg bg-navy-900/60 px-3 py-2"
            >
              <span className="text-slate-300">{t(locale, doc.nameEn, doc.nameAr)}</span>
              {doc.available ? (
                <button
                  type="button"
                  disabled={requestPending}
                  className="inline-flex items-center gap-1 text-accent hover:underline shrink-0 disabled:opacity-50"
                  onClick={() => onRequest('documents', shipment)}
                >
                  <FileText size={12} />
                  {t(locale, 'Request secure copy', 'طلب نسخة آمنة')}
                </button>
              ) : (
                <span className="text-dim flex items-center gap-1 shrink-0">
                  <AlertCircle size={12} />
                  {portalCopy.pending(locale)}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default function PortalDashboardPage() {
  const { locale } = useLocale();
  const { session, shipments, logout } = usePortalAuth();
  const [feedback, setFeedback] = useState('');
  const [feedbackError, setFeedbackError] = useState(false);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [requestPending, setRequestPending] = useState(false);
  const notify = (message: string, isError = false) => {
    setFeedback(message);
    setFeedbackError(isError);
  };

  useEffect(() => {
    if (!session?.accessToken) return;
    let cancelled = false;
    void fetchPortalServiceRequests(session.accessToken)
      .then((requests) => {
        if (!cancelled) setServiceRequests(requests);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);

  const submitRequest = async (
    requestType: ServiceRequestType,
    shipment?: PortalShipment,
  ) => {
    if (!session?.accessToken || requestPending) {
      if (!session?.accessToken) {
        notify(t(locale, 'A secure server session is required to create a request.', 'يلزم اتصال آمن بالخادم لإنشاء الطلب.'), true);
      }
      return;
    }
    setRequestPending(true);
    setFeedback('');
    try {
      const request = await createPortalServiceRequest(session.accessToken, {
        requestType,
        shipmentId: shipment?.id,
        message: shipment
          ? `${requestType} request for ${shipment.declarationNo || shipment.blNo || shipment.id}`
          : `${requestType} request from client portal`,
      });
      setServiceRequests((current) => [request, ...current.filter((row) => row.id !== request.id)]);
      notify(t(locale, `Request ${request.id} was recorded for the brokerage team.`, `تم تسجيل الطلب ${request.id} لفريق التخليص.`));
    } catch {
      notify(t(locale, 'The request could not be recorded. Check the connection and try again.', 'تعذر تسجيل الطلب. تحقق من الاتصال وحاول مرة أخرى.'), true);
    } finally {
      setRequestPending(false);
    }
  };

  if (!session) return null;

  const remaining = sessionRemainingMs(session);

  return (
    <div
      className="mx-auto max-w-6xl px-4 lg:px-8 py-12"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 mb-10">
        <div>
          <p className="text-xs text-accent tracking-wide mb-1">{portalCopy.title(locale)}</p>
          <h1
            className="text-2xl font-bold text-white mb-1"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {t(locale, session.customerNameEn, session.customerNameAr)}
          </h1>
          <p className="text-sm text-muted">
            {portalCopy.taxNumber(locale)}:{' '}
            <span className="font-mono text-slate-300" dir="ltr">
              {session.taxNumber}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-dim flex flex-col sm:flex-row sm:items-center gap-1 px-3 py-1.5 rounded-lg bg-navy-800 border border-subtle">
            <span className="inline-flex items-center gap-1.5">
              <Clock size={12} />
              {portalCopy.session(locale)}: {formatSessionRemaining(remaining, locale)}{' '}
              {portalCopy.remaining(locale)}
            </span>
            <span className="text-[10px] opacity-80" dir="auto">
              {t(locale, 'Expires', 'تنتهي')}: {formatDateTime(session.expiresAt, locale)}
            </span>
          </span>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-strong text-muted hover:text-white transition-colors"
          >
            <LogOut size={16} />
            {portalCopy.signOut(locale)}
          </button>
        </div>
      </div>

      {feedback && (
        <div className={feedbackError ? 'mb-6 flex items-start justify-between gap-3 rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-100' : 'mb-6 flex items-start justify-between gap-3 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100'} role="status" aria-live="polite">
          <span className="flex items-start gap-2">
            {feedbackError ? <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-300" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-300" />}
            {feedback}
          </span>
          <button type="button" className={feedbackError ? 'text-xs text-red-200 hover:text-white' : 'text-xs text-emerald-200 hover:text-white'} onClick={() => setFeedback('')}>
            {t(locale, 'Dismiss', 'إغلاق')}
          </button>
        </div>
      )}
      <PortalNotificationCenter session={session} />
      {/* Client Portal v2 — Self-service actions */}
      <div className="mb-8 rounded-xl border border-accent/30 bg-navy-900/40 p-5">
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Shield size={16} className="text-accent" />
          {t(locale, 'Self-service actions', 'إجراءات الخدمة الذاتية')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            type="button"
            disabled={requestPending}
            onClick={() => void submitRequest('statement')}
            className="flex flex-col items-start gap-1 rounded-lg border border-subtle bg-elevated px-3 py-3 text-start hover:border-accent/50 transition-colors disabled:opacity-50"
          >
            <span className="text-xs font-medium text-accent">{t(locale, 'Request payment / SOA', 'طلب دفع / كشف حساب')}</span>
            <span className="text-[10px] text-dim">{t(locale, 'Duties, fees, or statement of account', 'رسوم أو أتعاب أو كشف حساب')}</span>
          </button>
          <button
            type="button"
            disabled={requestPending}
            onClick={() => void submitRequest('documents')}
            className="flex flex-col items-start gap-1 rounded-lg border border-subtle bg-elevated px-3 py-3 text-start hover:border-accent/50 transition-colors disabled:opacity-50"
          >
            <span className="text-xs font-medium text-accent">{t(locale, 'Request documents', 'طلب وثائق')}</span>
            <span className="text-[10px] text-dim">{t(locale, 'Release, invoice, permits, CoO…', 'إفراج، فاتورة، تصاريح، شهادة منشأ…')}</span>
          </button>
          <Link
            to="/act"
            className="flex flex-col items-start gap-1 rounded-lg border border-subtle bg-elevated px-3 py-3 text-start hover:border-accent/50 transition-colors"
          >
            <span className="text-xs font-medium text-accent">{t(locale, 'ACT free days', 'أيام ACT المجانية')}</span>
            <span className="text-[10px] text-dim">{t(locale, 'Check last free day & demurrage risk', 'تحقق من آخر يوم مجاني ومخاطر التأخير')}</span>
          </Link>
        </div>
        <p className="mt-3 text-[10px] text-dim">
          {t(
            locale,
            'Requests are logged for the brokerage team. For urgent matters contact your dedicated agent.',
            'تُسجَّل الطلبات لفريق التخليص. للأمور العاجلة تواصل مع وكيلك المختص.',
          )}
        </p>
        {serviceRequests.length > 0 && (
          <div className="mt-4 border-t border-subtle pt-3">
            <p className="mb-2 text-[11px] font-medium text-slate-300">
              {t(locale, 'Recent requests', 'الطلبات الأخيرة')}
            </p>
            <ul className="space-y-1.5">
              {serviceRequests.slice(0, 5).map((request) => (
                <li key={request.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-navy-950/60 px-3 py-2 text-[10px]">
                  <span className="text-slate-300">
                    <span className="font-mono text-dim">{request.id}</span>
                    {' · '}
                    {t(locale,
                      request.requestType === 'documents' ? 'Documents' : request.requestType === 'statement' ? 'Statement / payment' : request.requestType,
                      request.requestType === 'documents' ? 'وثائق' : request.requestType === 'statement' ? 'كشف حساب / دفع' : request.requestType,
                    )}
                    {request.shipmentId ? ` · ${request.shipmentId}` : ''}
                  </span>
                  <span className="rounded-full bg-navy-800 px-2 py-0.5 text-accent">
                    {request.status.replace('_', ' ')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {(() => {
        const alerts = buildOpsAlerts(shipments).slice(0, 6);
        if (!alerts.length) return null;
        return (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-white mb-2">
              {t(locale, 'Alerts on your shipments', 'تنبيهات على شحناتك')}
            </h2>
            <ul className="space-y-2">
              {alerts.map((a) => (
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
                  <span className="block text-dim mt-0.5">{t(locale, a.detailEn, a.detailAr)}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      <div className="flex items-center gap-2 mb-5">
        <Package size={18} className="text-accent" />
        <h2 className="text-lg font-semibold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
          {portalCopy.myShipments(locale)}
        </h2>
        <span className="text-xs text-dim">({shipments.length})</span>
      </div>

      {shipments.length === 0 ? (
        <EmptyState
          titleEn="No shipments in this session"
          titleAr="لا شحنات في هذه الجلسة"
          detailEn="Shipments linked to your tax number and access code will appear here."
          detailAr="الشحنات المرتبطة برقمك الضريبي ورمز الوصول تظهر هنا."
          icon={<Ship size={22} />}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {shipments.map((s) => (
            <ShipmentCard
              key={s.id}
              shipment={s}
              onRequest={(requestType, shipment) => void submitRequest(requestType, shipment)}
              requestPending={requestPending}
            />
          ))}
        </div>
      )}

      <div className="mt-10 p-4 rounded-xl bg-navy-800/50 border border-subtle flex items-start gap-3">
        <CheckCircle2 size={16} className="text-success shrink-0 mt-0.5" />
        <p className="text-xs text-dim leading-relaxed">
          {portalCopy.footerNote(locale)}{' '}
          <Link to="/act" className="text-accent hover:underline">
            ACT
          </Link>
          {' · '}
          <Link to="/asycuda" className="text-accent hover:underline">
            ASYCUDA
          </Link>
          {' · '}
          <Link to="/workflow" className="text-accent hover:underline">
            {portalCopy.workflow(locale)}
          </Link>
        </p>
      </div>
    </div>
  );
}
