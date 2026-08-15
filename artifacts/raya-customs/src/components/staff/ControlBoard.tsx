import { useState } from 'react';
import { ClipboardCheck, FolderLock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';
import { daysUntil } from '@/lib/dates';
import { allShipments } from '@/lib/recordStore';
import { LANE_STYLE, LANE_LABEL, OUTCOME_LABEL } from '@/lib/selectivityStyles';
export default function ControlBoard() {
  const { locale } = useLocale();
  const [boardQuery, setBoardQuery] = useState('');
  const [queueFilter, setQueueFilter] = useState<'all' | 'red' | 'inspection' | 'free_time' | 'pca' | 'missing_declaration'>('all');
  const sourceRows = [...allShipments()]
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const queueMatches = (shipment: (typeof sourceRows)[number], queue: typeof queueFilter) => {
    if (queue === 'all') return true;
    if (queue === 'red') return shipment.selectivityLane === 'red';
    if (queue === 'inspection') return shipment.status === 'under_inspection' || shipment.inspectionOutcome === 'sample_pending' || shipment.inspectionOutcome === 'hold';
    if (queue === 'free_time') return Boolean(shipment.lastFreeDay && daysUntil(shipment.lastFreeDay) <= 2);
    if (queue === 'pca') return Boolean(shipment.pcaOpen || shipment.selectivityLane === 'blue');
    return !shipment.declarationNo;
  };
  const rows = sourceRows
    .filter((s) => {
      const q = boardQuery.trim().toLowerCase();
      if (!q) return true;
      const blob = [
        s.declarationNo,
        s.blNo,
        s.containerNo,
        s.taxNumber,
        s.customerNameEn,
        s.customerNameAr,
        s.goodsEn,
        s.hsCodeSuggested,
        s.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    })
    .filter((shipment) => queueMatches(shipment, queueFilter));
  const queueCounts = {
    all: sourceRows.length,
    red: sourceRows.filter((shipment) => queueMatches(shipment, 'red')).length,
    inspection: sourceRows.filter((shipment) => queueMatches(shipment, 'inspection')).length,
    free_time: sourceRows.filter((shipment) => queueMatches(shipment, 'free_time')).length,
    pca: sourceRows.filter((shipment) => queueMatches(shipment, 'pca')).length,
    missing_declaration: sourceRows.filter((shipment) => queueMatches(shipment, 'missing_declaration')).length,
  };

  return (
    <div className="mb-12">
      <div className="mb-3">
        <label className="sr-only" htmlFor="board-search-ctrl">
          {t(locale, 'Search cases', 'بحث الملفات')}
        </label>
        <input
          id="board-search-ctrl"
          value={boardQuery}
          onChange={(e) => setBoardQuery(e.target.value)}
          placeholder={t(
            locale,
            'Search declaration, B/L, container, tax, goods…',
            'بحث برقم البيان، البوليصة، الحاوية، الضريبي، البضاعة…',
          )}
          className="w-full max-w-md rounded-lg bg-navy-900 border border-subtle px-3 py-2 text-sm text-white placeholder:text-dim"
        />
        <div className="mt-3 flex flex-wrap gap-2" aria-label={t(locale, 'Saved case queues', 'طوابير الملفات المحفوظة')}>
          {([
            ['all', 'All', 'الكل'],
            ['red', 'Red lane', 'المسرب الأحمر'],
            ['inspection', 'Inspection', 'المعاينة'],
            ['free_time', 'Free-time risk', 'خطر المدة المجانية'],
            ['pca', 'PCA open', 'تدقيق لاحق'],
            ['missing_declaration', 'Missing declaration', 'بيان مفقود'],
          ] as const).map(([id, en, ar]) => (
            <button
              key={id}
              type="button"
              onClick={() => setQueueFilter(id)}
              className={`rounded-full border px-3 py-1.5 text-[11px] ${queueFilter === id ? 'border-accent bg-accent/15 text-accent' : 'border-subtle text-muted hover:text-white'}`}
            >
              {t(locale, en, ar)} · {queueCounts[id]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
            {t(locale, 'Selectivity & inspection board', 'لوحة الانتقائية والمعاينة')}
          </h2>
          <p className="text-xs text-dim mt-1">
            {t(locale, 'Current organization case mirror', 'مرآة ملفات المؤسسة الحالية')}
            {boardQuery.trim() ? ` · ${rows.length}` : ''}
          </p>
        </div>
        <Link to="/asycuda" className="text-xs text-accent hover:underline">
          {t(locale, 'ASYCUDA guide', 'دليل الأسيكودا')} →
        </Link>
      </div>
<div className="overflow-x-auto rounded-xl border border-subtle table-desktop-only">
        <table className="w-full text-sm min-w-[640px]" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
          <thead>
            <tr className={`bg-navy-800 text-dim text-[11px] ${locale === 'ar' ? '' : 'uppercase tracking-wider'}`}>
              <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'Case', 'الملف')}</th>
              <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'Client', 'العميل')}</th>
              <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'Lane', 'المسرب')}</th>
              <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'Inspection', 'المعاينة')}</th>
              <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'PCA', 'تدقيق لاحق')}</th>
              <th className="text-start px-3 py-2.5 font-medium">{t(locale, 'Status', 'الحالة')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const lane = s.selectivityLane;
              const outcome = s.inspectionOutcome;
              return (
                <tr key={s.id} className="border-t border-subtle hover:bg-navy-900/40">
                  <td className="px-3 py-3 align-top">
                    <p className="font-mono text-xs text-slate-300">{s.id}</p>
                    {s.declarationNo && (
                      <p className="text-[11px] text-dim font-mono mt-0.5">{s.declarationNo}</p>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top text-xs text-muted max-w-[140px]">
                    {t(locale, s.customerNameEn, s.customerNameAr)}
                  </td>
                  <td className="px-3 py-3 align-top">
                    {lane ? (
                      <span
                        className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border ${LANE_STYLE[lane]}`}
                      >
                        {t(locale, LANE_LABEL[lane].en, LANE_LABEL[lane].ar)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-dim">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top text-xs">
                    {outcome ? (
                      <span className="inline-flex items-center gap-1 text-orange-200">
                        <ClipboardCheck size={12} />
                        {t(locale, OUTCOME_LABEL[outcome].en, OUTCOME_LABEL[outcome].ar)}
                      </span>
                    ) : (
                      <span className="text-dim">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top text-xs">
                    {s.pcaOpen ? (
                      <span className="inline-flex items-center gap-1 text-sky-300">
                        <FolderLock size={12} />
                        {t(locale, 'Open', 'مفتوح')}
                      </span>
                    ) : (
                      <span className="text-dim">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top text-xs text-muted">
                    {t(locale, s.statusEn, s.statusAr)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="cards-mobile-only space-y-3">
        {rows.map((s) => {
          const lane = s.selectivityLane;
          const outcome = s.inspectionOutcome;
          return (
            <div key={s.id} className="rounded-xl bg-elevated border border-subtle p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-mono text-xs text-slate-300">{s.id}</p>
                  {s.declarationNo && (
                    <p className="text-[11px] text-dim font-mono">{s.declarationNo}</p>
                  )}
                </div>
                {lane ? (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${LANE_STYLE[lane]}`}>
                    {t(locale, LANE_LABEL[lane].en, LANE_LABEL[lane].ar)}
                  </span>
                ) : (
                  <span className="text-[11px] text-dim">—</span>
                )}
              </div>
              <p className="text-xs text-muted mb-2">{t(locale, s.customerNameEn, s.customerNameAr)}</p>
              <p className="text-xs text-slate-300 mb-1">{t(locale, s.statusEn, s.statusAr)}</p>
              <div className="flex flex-wrap gap-2 text-[11px] text-dim">
                {outcome && (
                  <span className="text-orange-200">
                    {t(locale, OUTCOME_LABEL[outcome].en, OUTCOME_LABEL[outcome].ar)}
                  </span>
                )}
                {s.pcaOpen && (
                  <span className="text-sky-300">{t(locale, 'PCA open', 'تدقيق لاحق مفتوح')}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-dim">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          {t(locale, 'Green', 'أخضر')}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          {t(locale, 'Yellow', 'أصفر')}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-400" />
          {t(locale, 'Red', 'أحمر')}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          {t(locale, 'Blue / PCA', 'أزرق / تدقيق لاحق')}
        </span>
      </div>
    </div>
  );
}
