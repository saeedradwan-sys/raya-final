import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Lock, FileText, Loader2 } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { usePortalAuth } from '@/hooks/usePortalAuth';
import { DEMO_CREDENTIALS } from '@/lib/portalAuth';
import { portalCopy } from '@/content/portalI18n';
import { t } from '@/lib/i18n';

export default function PortalPage() {
  const { locale } = useLocale();
  const { login, isAuthenticated, loading } = usePortalAuth();
  const [taxNumber, setTaxNumber] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32" aria-busy="true">
        <Loader2 className="animate-spin text-muted" size={24} />
        <span className="sr-only">{t(locale, 'Loading…', 'جاري التحميل…')}</span>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/portal/dashboard" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    window.setTimeout(async () => {
      const result = await login(taxNumber, accessCode);
      setSubmitting(false);
      if (!result.ok) {
        setError(
          result.error === 'required'
            ? portalCopy.errorRequired(locale)
            : result.error === 'network'
              ? t(locale, 'The client portal is temporarily unavailable.', 'بوابة العملاء غير متاحة مؤقتاً.')
              : result.error === 'rate_limited'
                ? t(locale, 'Too many login attempts. Wait before trying again.', 'محاولات دخول كثيرة. انتظر قبل المحاولة مرة أخرى.')
                : portalCopy.errorInvalid(locale),
        );
      }
    }, 350);
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14 lg:py-20" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {/* Page header */}
      <div className="text-center mb-8">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent ring-1 ring-accent/30 mb-4">
          <Lock size={24} />
        </div>
        <h1
          className="text-2xl font-bold text-white mb-2"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {portalCopy.title(locale)}
        </h1>
        <p className="text-sm text-muted leading-relaxed prose-ar">{portalCopy.subtitle(locale)}</p>
      </div>

      {/* Login card */}
      <div className="rounded-2xl border border-subtle bg-navy-900/80 p-6 shadow-xl shadow-black/20">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="portal-tax">
              {portalCopy.taxNumber(locale)}
            </label>
            <input
              id="portal-tax"
              type="text"
              inputMode="numeric"
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
              className="input-field"
              placeholder={portalCopy.taxPlaceholder(locale)}
              autoComplete="username"
              disabled={submitting}
              aria-required="true"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="portal-code">
              {portalCopy.accessCode(locale)}
            </label>
            <input
              id="portal-code"
              type="password"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="input-field"
              placeholder={portalCopy.codePlaceholder(locale)}
              autoComplete="current-password"
              disabled={submitting}
              aria-required="true"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-2.5 mt-1"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {portalCopy.signIn(locale)}
          </button>
        </form>

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 leading-relaxed"
          >
            <Lock size={13} className="shrink-0 mt-0.5 text-red-400" />
            <span className="prose-ar">{error}</span>
          </div>
        )}
      </div>

      {import.meta.env.DEV && (
        <div className="mt-5 p-4 rounded-xl bg-elevated border border-subtle">
          <p className="text-xs font-medium text-slate-400 mb-1">{portalCopy.demoTitle(locale)}</p>
          <p className="text-[11px] text-dim mb-3">{portalCopy.demoHint(locale)}</p>
          <ul className="space-y-2">
            {DEMO_CREDENTIALS.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => {
                    setTaxNumber(c.tax);
                    setAccessCode(c.code);
                    setError('');
                  }}
                  className="w-full text-start text-xs rounded-lg bg-navy-900/80 border border-subtle px-3 py-2.5 hover:border-accent/40 transition-colors"
                >
                  <span className="text-dim">{portalCopy.taxNumber(locale)}: </span>
                  <span className="text-slate-300 font-mono">{c.tax}</span>
                  <span className="text-dim"> · </span>
                  <span className="text-dim">{portalCopy.accessCode(locale)}: </span>
                  <span className="text-accent font-mono">{c.code}</span>
                  <span className="block text-dim mt-0.5">{t(locale, c.labelEn, c.labelAr)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 flex items-start gap-3 p-4 rounded-xl bg-navy-800/40 border border-subtle">
        <FileText size={15} className="text-slate-500 shrink-0 mt-0.5" />
        <p className="text-xs text-dim leading-relaxed prose-ar">{portalCopy.sessionNote(locale)}</p>
      </div>
    </div>
  );
}
