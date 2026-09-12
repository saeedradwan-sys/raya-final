import { useEffect, useMemo, useState } from 'react';
import { Bell, Check, LoaderCircle, MessageSquareText, Phone, Save, Smartphone } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';
import {
  fetchPortalNotifications,
  markPortalNotificationsRead,
  savePortalNotificationPreferences,
  type NotificationPreferences,
  type PortalNotification,
} from '@/lib/notifications';
import type { PortalSession } from '@/lib/types';

const DEFAULT_PREFERENCES: NotificationPreferences = {
  inAppEnabled: true,
  smsEnabled: false,
  whatsappEnabled: false,
  phone: '',
  whatsapp: '',
  smsOptIn: false,
  whatsappOptIn: false,
};

function formatNotificationDate(value: string, locale: 'en' | 'ar') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-JO' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Amman',
  }).format(date);
}

export default function PortalNotificationCenter({ session }: { session: PortalSession }) {
  const { locale } = useLocale();
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [expanded, setExpanded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState('');

  const unread = useMemo(() => notifications.filter((item) => !item.readAt), [notifications]);

  useEffect(() => {
    if (!session.accessToken) return;
    let active = true;
    void fetchPortalNotifications(session.accessToken).then((response) => {
      if (!active) return;
      setNotifications(response.notifications || []);
      setPreferences({ ...DEFAULT_PREFERENCES, ...(response.preferences || {}) });
    }).catch(() => undefined);
    return () => { active = false; };
  }, [session.accessToken]);

  async function markAllRead() {
    if (!session.accessToken || !unread.length || pending) return;
    setPending(true);
    try {
      await markPortalNotificationsRead(session.accessToken, unread.map((item) => item.id));
      setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
    } finally {
      setPending(false);
    }
  }

  async function savePreferences() {
    if (!session.accessToken || pending) return;
    setPending(true);
    setFeedback('');
    try {
      const next = await savePortalNotificationPreferences(session.accessToken, preferences);
      setPreferences(next);
      setFeedback(t(locale, 'Notification preferences saved.', 'تم حفظ تفضيلات التنبيهات.'));
    } catch {
      setFeedback(t(locale, 'Preferences could not be saved.', 'تعذر حفظ التفضيلات.'));
    } finally {
      setPending(false);
    }
  }

  const update = (patch: Partial<NotificationPreferences>) => setPreferences((current) => ({ ...current, ...patch }));

  return (
    <section className="mb-8 rounded-xl border border-accent/30 bg-navy-900/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-accent/15 p-2.5 text-accent"><Bell size={18} /></div>
          <div>
            <h2 className="text-sm font-semibold text-white">{t(locale, 'Notification center', 'مركز التنبيهات')}</h2>
            <p className="mt-1 text-[11px] text-dim">{t(locale, 'Milestone alerts are recorded here first. External messages require your explicit opt-in.', 'تُسجّل تنبيهات المراحل هنا أولاً. الرسائل الخارجية تتطلب موافقتك الصريحة.')}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setExpanded((value) => !value)} className="rounded-lg border border-subtle px-3 py-1.5 text-xs text-muted hover:border-accent/50 hover:text-white">
            {expanded ? t(locale, 'Hide alerts', 'إخفاء التنبيهات') : t(locale, `View alerts${unread.length ? ` (${unread.length})` : ''}`, `عرض التنبيهات${unread.length ? ` (${unread.length})` : ''}`)}
          </button>
          <button type="button" onClick={() => setSettingsOpen((value) => !value)} className="rounded-lg border border-subtle px-3 py-1.5 text-xs text-muted hover:border-accent/50 hover:text-white">
            {t(locale, 'Preferences', 'التفضيلات')}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 border-t border-subtle pt-4">
          {unread.length ? <button type="button" onClick={() => void markAllRead()} disabled={pending} className="mb-3 inline-flex items-center gap-1.5 text-[11px] text-accent hover:underline disabled:opacity-50"><Check size={12} />{t(locale, 'Mark all read', 'تحديد الكل كمقروء')}</button> : null}
          {notifications.length ? (
            <ul className="space-y-2">
              {notifications.slice(0, 8).map((item) => (
                <li key={item.id} className={`rounded-lg border px-3 py-2.5 ${item.readAt ? 'border-subtle bg-navy-950/40' : 'border-accent/35 bg-accent/5'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-white">{t(locale, item.titleEn, item.titleAr)}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{t(locale, item.bodyEn, item.bodyAr)}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-dim">{formatNotificationDate(item.createdAt, locale)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-dim">{t(locale, 'No milestone alerts yet.', 'لا توجد تنبيهات مراحل بعد.')}</p>}
        </div>
      )}

      {settingsOpen && (
        <div className="mt-4 border-t border-subtle pt-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-start gap-2 rounded-lg border border-subtle bg-navy-950/40 p-3 text-xs text-muted">
              <input type="checkbox" checked={preferences.inAppEnabled} onChange={(event) => update({ inAppEnabled: event.target.checked })} className="mt-0.5 accent-[var(--accent)]" />
              <span><span className="block font-medium text-white">{t(locale, 'In-app alerts', 'تنبيهات داخل البوابة')}</span>{t(locale, 'Keep carrier and customs milestones in this portal.', 'احتفظ بمراحل الناقل والجمارك داخل البوابة.')}</span>
            </label>
            <label className="flex items-start gap-2 rounded-lg border border-subtle bg-navy-950/40 p-3 text-xs text-muted">
              <input type="checkbox" checked={preferences.smsEnabled && preferences.smsOptIn} onChange={(event) => update({ smsEnabled: event.target.checked, smsOptIn: event.target.checked })} className="mt-0.5 accent-[var(--accent)]" />
              <span><span className="block font-medium text-white"><Phone size={12} className="me-1 inline" />{t(locale, 'SMS alerts', 'تنبيهات SMS')}</span>{t(locale, 'Enable only after confirming this mobile number.', 'فعّلها بعد تأكيد رقم الهاتف.')}</span>
            </label>
            <label className="flex items-start gap-2 rounded-lg border border-subtle bg-navy-950/40 p-3 text-xs text-muted">
              <input type="checkbox" checked={preferences.whatsappEnabled && preferences.whatsappOptIn} onChange={(event) => update({ whatsappEnabled: event.target.checked, whatsappOptIn: event.target.checked })} className="mt-0.5 accent-[var(--accent)]" />
              <span><span className="block font-medium text-white"><MessageSquareText size={12} className="me-1 inline" />{t(locale, 'WhatsApp alerts', 'تنبيهات واتساب')}</span>{t(locale, 'WhatsApp delivery requires an approved business sender and opt-in.', 'يتطلب واتساب مرسلاً تجارياً معتمداً وموافقة مسبقة.')}</span>
            </label>
            <div className="space-y-2 rounded-lg border border-subtle bg-navy-950/40 p-3">
              <label className="block text-[11px] text-dim">{t(locale, 'SMS / mobile number', 'رقم الهاتف / SMS')}</label>
              <div className="flex items-center gap-2"><Smartphone size={14} className="text-dim" /><input value={preferences.phone} onChange={(event) => update({ phone: event.target.value })} placeholder="+962…" dir="ltr" className="min-w-0 flex-1 rounded border border-subtle bg-navy-900 px-2 py-1.5 text-xs text-white" /></div>
              <label className="block text-[11px] text-dim">{t(locale, 'WhatsApp number', 'رقم واتساب')}</label>
              <div className="flex items-center gap-2"><MessageSquareText size={14} className="text-dim" /><input value={preferences.whatsapp} onChange={(event) => update({ whatsapp: event.target.value })} placeholder="+962…" dir="ltr" className="min-w-0 flex-1 rounded border border-subtle bg-navy-900 px-2 py-1.5 text-xs text-white" /></div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button type="button" onClick={() => void savePreferences()} disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-accent/90 disabled:opacity-50"><Save size={13} />{pending ? <LoaderCircle size={13} className="animate-spin" /> : t(locale, 'Save preferences', 'حفظ التفضيلات')}</button>
            {feedback ? <span className="text-[11px] text-muted">{feedback}</span> : null}
          </div>
        </div>
      )}
    </section>
  );
}
