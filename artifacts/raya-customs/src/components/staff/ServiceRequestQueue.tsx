import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Inbox, Loader2, RefreshCw, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocale } from '@/hooks/useLocale';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { t } from '@/lib/i18n';
import { formatDateTime } from '@/lib/dates';
import {
  fetchStaffServiceRequests,
  updateStaffServiceRequest,
  type ServiceRequest,
  type ServiceRequestStatus,
} from '@/lib/serviceRequests';

type QueueFilter = 'active' | 'all' | ServiceRequestStatus;

const STATUS_STYLE: Record<ServiceRequestStatus, string> = {
  open: 'bg-amber-500/15 text-amber-200',
  in_progress: 'bg-blue-500/15 text-blue-200',
  completed: 'bg-emerald-500/15 text-emerald-200',
  rejected: 'bg-red-500/15 text-red-200',
};

export default function ServiceRequestQueue() {
  const { locale } = useLocale();
  const { session } = useStaffAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [filter, setFilter] = useState<QueueFilter>('active');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');
  const [error, setError] = useState('');

  const canWrite = Boolean(session?.permissions?.includes('shipments:write'));

  const refresh = useCallback(async () => {
    if (!session?.accessToken) return;
    setError('');
    try {
      setRequests(await fetchStaffServiceRequests(session.accessToken));
    } catch {
      setError(t(locale, 'Client requests are temporarily unavailable.', 'طلبات العملاء غير متاحة مؤقتاً.'));
    } finally {
      setLoading(false);
    }
  }, [locale, session?.accessToken]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const visible = useMemo(() => requests.filter((request) => {
    if (filter === 'all') return true;
    if (filter === 'active') return request.status === 'open' || request.status === 'in_progress';
    return request.status === filter;
  }), [filter, requests]);

  const update = async (
    request: ServiceRequest,
    status: ServiceRequestStatus,
    claim = false,
  ) => {
    if (!session?.accessToken || !canWrite) return;
    setUpdatingId(request.id);
    setError('');
    try {
      const dueAt = claim && !request.dueAt
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : request.dueAt;
      const updated = await updateStaffServiceRequest(session.accessToken, request.id, {
        status,
        assignedTo: claim ? session.displayNameEn : request.assignedTo,
        dueAt,
        acknowledged: claim ? true : undefined,
      });
      setRequests((rows) => rows.map((row) => row.id === updated.id ? updated : row));
    } catch {
      setError(t(locale, 'The request update could not be saved.', 'تعذر حفظ تحديث الطلب.'));
    } finally {
      setUpdatingId('');
    }
  };

  const counts = {
    active: requests.filter((request) => ['open', 'in_progress'].includes(request.status)).length,
    open: requests.filter((request) => request.status === 'open').length,
    in_progress: requests.filter((request) => request.status === 'in_progress').length,
    completed: requests.filter((request) => request.status === 'completed').length,
    all: requests.length,
  };

  return (
    <section id="client-requests" className="mb-10 rounded-xl border border-subtle bg-elevated p-5" aria-labelledby="client-request-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="client-request-heading" className="flex items-center gap-2 text-sm font-semibold text-white">
            <Inbox size={16} className="text-accent" />
            {t(locale, 'Client request queue', 'طابور طلبات العملاء')}
          </h2>
          <p className="mt-1 text-xs text-dim">
            {t(locale, 'Owned portal requests with acknowledgement, due time, and audit history.', 'طلبات البوابة مع المسؤول والتأكيد ووقت الاستحقاق وسجل التدقيق.')}
          </p>
        </div>
        <button type="button" onClick={() => void refresh()} className="btn-ghost text-xs" disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {t(locale, 'Refresh', 'تحديث')}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" aria-label={t(locale, 'Request filters', 'مرشحات الطلبات')}>
        {(['active', 'open', 'in_progress', 'completed', 'all'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
              filter === item ? 'border-accent bg-accent/15 text-accent' : 'border-subtle text-muted hover:text-white'
            }`}
          >
            {item.replace('_', ' ')} · {counts[item]}
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-xs text-danger" role="alert">{error}</p>}
      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-xs text-dim"><Loader2 size={14} className="animate-spin" />{t(locale, 'Loading requests…', 'جارٍ تحميل الطلبات…')}</div>
      ) : visible.length === 0 ? (
        <p className="mt-4 text-xs text-dim">{t(locale, 'No requests in this queue.', 'لا توجد طلبات في هذا الطابور.')}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {visible.slice(0, 20).map((request) => (
            <li key={request.id} className="rounded-xl border border-subtle bg-navy-900/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-white">
                    {request.clientNameEn || request.taxNumber || t(locale, 'Portal client', 'عميل البوابة')}
                    <span className="ms-2 font-mono text-[10px] font-normal text-dim">{request.id}</span>
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    {request.requestType.replace('_', ' ')}
                    {request.shipmentId ? ` · ${request.shipmentId}` : ''}
                    {request.taxNumber ? ` · ${request.taxNumber}` : ''}
                  </p>
                  {request.message && <p className="mt-2 text-xs text-slate-300">{request.message}</p>}
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] ${STATUS_STYLE[request.status]}`}>
                  {request.status.replace('_', ' ')}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-dim">
                <span className="inline-flex items-center gap-1"><Clock3 size={11} />{formatDateTime(request.createdAt, locale)}</span>
                {request.assignedTo && <span className="inline-flex items-center gap-1"><UserCheck size={11} />{request.assignedTo}</span>}
                {request.dueAt && <span>{t(locale, 'Due', 'مستحق')}: {formatDateTime(request.dueAt, locale)}</span>}
                {request.acknowledgedAt && <span>{t(locale, 'Acknowledged', 'تم التأكيد')}</span>}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {request.shipmentId && (
                  <Link to={`/staff/records#shipment-${encodeURIComponent(request.shipmentId)}`} className="text-[11px] text-accent hover:underline">
                    {t(locale, 'Open case', 'فتح الملف')} →
                  </Link>
                )}
                {canWrite && request.status === 'open' && (
                  <button type="button" disabled={updatingId === request.id} onClick={() => void update(request, 'in_progress', true)} className="btn-secondary px-3 py-1.5 text-[11px]">
                    {t(locale, 'Acknowledge & claim', 'تأكيد واستلام')}
                  </button>
                )}
                {canWrite && request.status === 'in_progress' && (
                  <button type="button" disabled={updatingId === request.id} onClick={() => void update(request, 'completed')} className="btn-primary px-3 py-1.5 text-[11px]">
                    <CheckCircle2 size={13} />{t(locale, 'Complete', 'إكمال')}
                  </button>
                )}
                {canWrite && request.status === 'completed' && (
                  <button type="button" disabled={updatingId === request.id} onClick={() => void update(request, 'open')} className="btn-ghost px-3 py-1.5 text-[11px]">
                    {t(locale, 'Reopen', 'إعادة فتح')}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}