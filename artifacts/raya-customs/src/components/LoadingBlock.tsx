import { useLocale } from '@/hooks/useLocale';
import { ui } from '@/content/uiLabels';

interface Props {
  rows?: number;
  className?: string;
}

/** Simple skeleton block for loading states */
export default function LoadingBlock({ rows = 3, className = '' }: Props) {
  const { locale } = useLocale();
  return (
    <div
      className={`space-y-3 animate-pulse ${className}`}
      role="status"
      aria-label={ui.loading(locale)}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card p-5">
          <div className="h-3 w-1/3 rounded-md bg-navy-700 mb-3" />
          <div className="h-2.5 w-full rounded-md bg-navy-800 mb-2" />
          <div className="h-2.5 w-2/3 rounded-md bg-navy-800" />
        </div>
      ))}
    </div>
  );
}
