import { useEffect, useMemo, useState } from 'react';
import { Clock3, RefreshCw, ShieldAlert, WifiOff } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { usePortalAuth } from '@/hooks/usePortalAuth';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { apiHealth } from '@/lib/api';
import { t } from '@/lib/i18n';

export default function PlatformStatusBanner() {
  const { locale } = useLocale();
  const portal = usePortalAuth();
  const staff = useStaffAuth();
  const [networkOnline, setNetworkOnline] = useState(() => navigator.onLine);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const handleOnline = () => setNetworkOnline(true);
    const handleOffline = () => setNetworkOnline(false);
    const handleUpdate = () => setUpdateReady(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('raya:sw-update', handleUpdate as EventListener);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('raya:sw-update', handleUpdate as EventListener);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const healthy = networkOnline ? await apiHealth() : false;
      if (!cancelled) setApiOnline(healthy);
    };
    void check();
    const timer = window.setInterval(() => void check(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [networkOnline]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const activeSession = staff.isAuthenticated && staff.session
    ? { expiresAt: staff.session.expiresAt, logout: staff.logout }
    : portal.isAuthenticated && portal.session
      ? { expiresAt: portal.session.expiresAt, logout: portal.logout }
      : null;
  const remainingMs = activeSession ? new Date(activeSession.expiresAt).getTime() - now : null;
  const sessionWarning = remainingMs !== null && remainingMs > 0 && remainingMs <= 5 * 60_000;
  const minutes = remainingMs === null ? 0 : Math.max(1, Math.ceil(remainingMs / 60_000));

  const banners = useMemo(() => ({
    network: !networkOnline,
    api: networkOnline && apiOnline === false,
    update: updateReady,
    session: sessionWarning,
  }), [apiOnline, networkOnline, sessionWarning, updateReady]);

  if (!banners.network && !banners.api && !banners.update && !banners.session) return null;

  const applyUpdate = async () => {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration?.waiting) {
      sessionStorage.setItem('raya-sw-refresh-on-controller', '1');
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      return;
    }
    window.location.reload();
  };

  return (
    <div className="border-b border-subtle bg-navy-950" aria-live="polite">
      <div className="mx-auto max-w-6xl space-y-2 px-4 py-2 lg:px-8">
        {banners.network && (
          <div className="flex items-center gap-2 text-xs text-red-200" role="status">
            <WifiOff size={14} />
            {t(locale, 'This device is offline. Live tracking, sign-in, and synchronization are unavailable.', 'هذا الجهاز دون اتصال. التتبع الحي وتسجيل الدخول والمزامنة غير متاحة.')}
          </div>
        )}
        {banners.api && (
          <div className="flex items-center gap-2 text-xs text-amber-200" role="status">
            <ShieldAlert size={14} />
            {t(locale, 'The secure Raya API is unavailable. Displayed records may be stale; writes are paused.', 'واجهة راية الآمنة غير متاحة. قد تكون السجلات المعروضة قديمة، وتم إيقاف عمليات الحفظ.')}
          </div>
        )}
        {banners.update && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-blue-100" role="status">
            <span className="inline-flex items-center gap-2"><RefreshCw size={14} />{t(locale, 'A new Raya version is ready.', 'إصدار جديد من راية جاهز.')}</span>
            <button type="button" onClick={() => void applyUpdate()} className="rounded-lg bg-accent px-3 py-1.5 font-medium text-white hover:bg-accent-hover">
              {t(locale, 'Update now', 'التحديث الآن')}
            </button>
          </div>
        )}
        {banners.session && activeSession && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-amber-100" role="status">
            <span className="inline-flex items-center gap-2"><Clock3 size={14} />{t(locale, `Your secure session expires in about ${minutes} minute(s).`, `تنتهي جلستك الآمنة خلال نحو ${minutes} دقيقة.`)}</span>
            <button type="button" onClick={activeSession.logout} className="text-amber-200 underline hover:text-white">
              {t(locale, 'Sign out safely', 'تسجيل خروج آمن')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}