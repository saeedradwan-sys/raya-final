import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';

interface Props {
  titleEn: string;
  titleAr: string;
  detailEn?: string;
  detailAr?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export default function EmptyState({
  titleEn,
  titleAr,
  detailEn,
  detailAr,
  icon,
  action,
}: Props) {
  const { locale } = useLocale();
  return (
    <div className="card p-10 sm:p-12 text-center animate-fade-in">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-900 text-slate-500 ring-1 ring-white/5">
        {icon ?? <Inbox size={24} />}
      </div>
      <p className="text-sm font-semibold text-white mb-1.5">{t(locale, titleEn, titleAr)}</p>
      {(detailEn || detailAr) && (
        <p className="text-xs text-dim max-w-sm mx-auto leading-relaxed prose-ar">
          {t(locale, detailEn ?? '', detailAr ?? detailEn ?? '')}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
