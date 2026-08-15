import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Archive, Plus, Trash2, Ship, Calculator, FileDown } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';
import { ui } from '@/content/uiLabels';
import { appendAudit } from '@/lib/auditLog';
import {
  addDisbursementRecord,
  addShipmentRecord,
  allDisbursements,
  allShipments,
  deleteUserDisbursement,
  deleteUserShipment,
  LANE_OPTIONS,
  listUserDisbursements,
  listUserShipments,
  pullRecordsFromServer,
  STATUS_OPTIONS,
} from '@/lib/recordStore';
import type { DisbursementMode, InspectionOutcome, SelectivityLane, ShipmentStatus } from '@/lib/types';
import { formatJod } from '@/lib/disbursementCalc';
import SectionNav from '@/components/SectionNav';
import {
  buildDeclarationDraft,
  declarationDraftToJson,
  declarationDraftToXml,
  draftFilename,
} from '@/lib/declarationDraft';
import { downloadTextFile } from '@/lib/exportCsv';

export default function StaffRecordsPage() {
  const { locale } = useLocale();
  const [tab, setTab] = useState<'shipment' | 'disbursement'>('shipment');
  const [msg, setMsg] = useState('');
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);
  useEffect(() => {
    void pullRecordsFromServer().then(() => refresh());
  }, []);

  const userShips = useMemo(() => listUserShipments(), [tick]);
  const userDisb = useMemo(() => listUserDisbursements(), [tick]);
  const shipTotal = useMemo(() => allShipments().length, [tick]);
  const disbTotal = useMemo(() => allDisbursements().length, [tick]);

  useEffect(() => {
    const targetId = decodeURIComponent(window.location.hash.slice(1));
    if (!targetId.startsWith('shipment-')) return;
    window.requestAnimationFrame(() => document.getElementById(targetId)?.scrollIntoView({ block: 'center' }));
  }, [tick]);

  // --- Shipment form state ---
  const [taxNumber, setTaxNumber] = useState('100123456');
  const [accessCode, setAccessCode] = useState('RAYA-HIST-01');
  const [customerNameEn, setCustomerNameEn] = useState('');
  const [customerNameAr, setCustomerNameAr] = useState('');
  const [declarationNo, setDeclarationNo] = useState('');
  const [blNo, setBlNo] = useState('');
  const [containerNo, setContainerNo] = useState('');
  const [status, setStatus] = useState<ShipmentStatus>('closed');
  const [lane, setLane] = useState<SelectivityLane | ''>('green');
  const [originEn, setOriginEn] = useState('');
  const [originAr, setOriginAr] = useState('');
  const [goodsEn, setGoodsEn] = useState('');
  const [goodsAr, setGoodsAr] = useState('');
  const [dischargeDate, setDischargeDate] = useState('');
  const [lastFreeDay, setLastFreeDay] = useState('');
  const [pcaOpen, setPcaOpen] = useState(false);

  // --- Disbursement form ---
  const [dDecl, setDDecl] = useState('');
  const [dClientEn, setDClientEn] = useState('');
  const [dClientAr, setDClientAr] = useState('');
  const [dMode, setDMode] = useState<DisbursementMode>('pay_first');
  const [dDuties, setDDuties] = useState(500);
  const [dPort, setDPort] = useState(100);
  const [dGov, setDGov] = useState(0);
  const [dFee, setDFee] = useState(80);
  const [dStatus, setDStatus] = useState<'open' | 'recovered' | 'closed'>('closed');
  const [dCreated, setDCreated] = useState('2026-01-15');
  const [dLast, setDLast] = useState('2026-01-20');
  const [dRecovered, setDRecovered] = useState(0);
  const [dPrepay, setDPrepay] = useState(0);
  const [dApplied, setDApplied] = useState(0);

  function exportShipmentDraft(shipmentId: string, fmt: 'json' | 'xml') {
    const ship = allShipments().find((s) => s.id === shipmentId);
    if (!ship) return;
    const draft = buildDeclarationDraft(ship);
    const body = fmt === 'json' ? declarationDraftToJson(draft) : declarationDraftToXml(draft);
    downloadTextFile(
      draftFilename(draft, fmt),
      body,
      fmt === 'json' ? 'application/json;charset=utf-8' : 'application/xml;charset=utf-8',
    );
    appendAudit(
      'staff',
      'asycuda.draft.export',
      `Exported SAD draft ${fmt} for ${ship.declarationNo || ship.blNo}`,
      `تصدير مسودة بيان ${fmt}`,
      { format: fmt, shipmentId: ship.id },
    );
  }

  function submitShipment(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    if (!taxNumber.trim() || !blNo.trim() || !customerNameEn.trim()) {
      setMsg(t(locale, 'Tax, B/L and client name (EN) are required.', 'الرقم الضريبي وبوليصة الشحن واسم العميل (إنجليزي) مطلوبة.'));
      return;
    }
    const st = STATUS_OPTIONS.find((s) => s.value === status);
    const row = addShipmentRecord({
      accessCode: accessCode.trim().toUpperCase() || 'RAYA-HIST-01',
      taxNumber: taxNumber.replace(/\s/g, ''),
      customerNameEn: customerNameEn.trim(),
      customerNameAr: customerNameAr.trim() || customerNameEn.trim(),
      declarationNo: declarationNo.trim() || undefined,
      blNo: blNo.trim(),
      containerNo: containerNo.trim() || undefined,
      status,
      statusEn: st?.en ?? status,
      statusAr: st?.ar ?? status,
      selectivityLane: lane || null,
      inspectionOutcome: null as InspectionOutcome | null,
      pcaOpen,
      originEn: originEn.trim() || '—',
      originAr: originAr.trim() || '—',
      goodsEn: goodsEn.trim() || '—',
      goodsAr: goodsAr.trim() || '—',
      dischargeDate: dischargeDate || undefined,
      lastFreeDay: lastFreeDay || undefined,
    });
    appendAudit(
      'staff',
      'add_shipment_record',
      `Added previous shipment ${row.declarationNo || row.blNo}`,
      `إضافة شحنة سابقة ${row.declarationNo || row.blNo}`,
    );
    setMsg(t(locale, `Saved shipment ${row.id}`, `تم حفظ الشحنة ${row.id}`));
    refresh();
  }

  function submitDisbursement(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    if (!dDecl.trim() || !dClientEn.trim()) {
      setMsg(t(locale, 'Declaration no. and client name are required.', 'رقم البيان واسم العميل مطلوبان.'));
      return;
    }
    const pt = Math.max(0, dDuties) + Math.max(0, dPort) + Math.max(0, dGov);
    const row = addDisbursementRecord({
      declarationNo: dDecl.trim(),
      clientNameEn: dClientEn.trim(),
      clientNameAr: dClientAr.trim() || dClientEn.trim(),
      mode: dMode,
      duties: Number(dDuties) || 0,
      portFees: Number(dPort) || 0,
      otherGovCharges: Number(dGov) || 0,
      agencyFee: Number(dFee) || 0,
      status: dStatus,
      statusEn:
        dStatus === 'open'
          ? 'Open (historical)'
          : dStatus === 'recovered'
            ? 'Recovered (historical)'
            : 'Closed (historical)',
      statusAr:
        dStatus === 'open' ? 'مفتوح (تاريخي)' : dStatus === 'recovered' ? 'مُسترد (تاريخي)' : 'مغلق (تاريخي)',
      createdAt: dCreated || '2026-01-01',
      lastMovementAt: dLast || dCreated || '2026-01-01',
      recoveredPassThrough:
        dMode === 'pay_first'
          ? dStatus === 'closed' || dStatus === 'recovered'
            ? Number(dRecovered) || pt
            : Number(dRecovered) || 0
          : undefined,
      prepayReceived: dMode === 'client_prepay' ? Number(dPrepay) || pt : undefined,
      appliedPassThrough:
        dMode === 'client_prepay'
          ? dStatus === 'closed' || dStatus === 'recovered'
            ? Number(dApplied) || pt
            : Number(dApplied) || 0
          : undefined,
    });
    appendAudit(
      'staff',
      'add_disbursement_record',
      `Added previous disbursement ${row.declarationNo}`,
      `إضافة ملف تسوية سابق ${row.declarationNo}`,
    );
    setMsg(t(locale, `Saved disbursement ${row.id}`, `تم حفظ التسوية ${row.id}`));
    refresh();
  }

  const inputClass =
    'w-full rounded-lg bg-navy-900 border border-subtle px-3 py-2 text-sm text-white placeholder:text-dim';
  const labelClass = 'block text-[11px] text-dim mb-1';

  return (
    <div className="mx-auto max-w-6xl px-4 lg:px-8 py-10">
      <div className="mb-6">
        <Link to="/staff" className="text-xs text-accent hover:underline">
          ← {t(locale, 'Staff workspace', 'مساحة الموظفين')}
        </Link>
        <h1
          className="text-2xl font-semibold text-white mt-2 flex items-center gap-2"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          <Archive size={22} className="text-accent" />
          {t(locale, 'Previous records', 'السجلات السابقة')}
        </h1>
        <p className="text-sm text-muted mt-1 max-w-2xl leading-relaxed prose-ar">
          {t(
            locale,
            'Add historical shipments and clearing files. Stored in this browser (localStorage) and merged with demo seed data for portal, board, and reconciliation.',
            'أضف شحنات وملفات تسوية تاريخية. تُحفظ في هذا المتصفح وتُدمج مع بيانات العرض في البوابة واللوحة والمطابقة.',
          )}
        </p>
        <p className="text-xs text-dim mt-2">
          {t(locale, 'Totals', 'الإجمالي')}: {shipTotal} {t(locale, 'shipments', 'شحنات')} · {disbTotal}{' '}
          {t(locale, 'disbursements', 'تسويات')} (
          {t(locale, 'user-added', 'أضافها المستخدم')}: {userShips.length} / {userDisb.length})
        </p>
      </div>

      <SectionNav
        items={[
          { id: 'sec-add', labelEn: 'Add record', labelAr: 'إضافة سجل' },
          { id: 'sec-user-list', labelEn: 'Your entries', labelAr: 'إدخالاتك' },
        ]}
      />

      {msg && (
        <div className="mb-4 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent">
          {msg}
        </div>
      )}

      <div id="sec-add" className="mb-10">
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setTab('shipment')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border ${
              tab === 'shipment'
                ? 'border-accent bg-accent/15 text-white'
                : 'border-subtle text-muted'
            }`}
          >
            <Ship size={14} />
            {t(locale, 'Previous shipment', 'شحنة سابقة')}
          </button>
          <button
            type="button"
            onClick={() => setTab('disbursement')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border ${
              tab === 'disbursement'
                ? 'border-accent bg-accent/15 text-white'
                : 'border-subtle text-muted'
            }`}
          >
            <Calculator size={14} />
            {t(locale, 'Previous disbursement', 'تسوية سابقة')}
          </button>
        </div>

        {tab === 'shipment' ? (
          <form
            onSubmit={submitShipment}
            className="rounded-xl bg-elevated border border-subtle p-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div>
              <label className={labelClass}>{t(locale, 'Tax number', 'الرقم الضريبي')}</label>
              <input className={inputClass} value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>{t(locale, 'Access code (optional portal)', 'رمز الدخول (اختياري)')}</label>
              <input className={inputClass} value={accessCode} onChange={(e) => setAccessCode(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>{t(locale, 'Client name (EN)', 'اسم العميل (إنجليزي)')}</label>
              <input className={inputClass} value={customerNameEn} onChange={(e) => setCustomerNameEn(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>{t(locale, 'Client name (AR)', 'اسم العميل (عربي)')}</label>
              <input className={inputClass} value={customerNameAr} onChange={(e) => setCustomerNameAr(e.target.value)} dir="rtl" />
            </div>
            <div>
              <label className={labelClass}>{t(locale, 'Declaration no.', 'رقم البيان')}</label>
              <input className={inputClass} value={declarationNo} onChange={(e) => setDeclarationNo(e.target.value)} placeholder={ui.exampleDecl(locale)} />
            </div>
            <div>
              <label className={labelClass}>{t(locale, 'B/L number', 'رقم بوليصة الشحن')}</label>
              <input className={inputClass} value={blNo} onChange={(e) => setBlNo(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>{t(locale, 'Container', 'الحاوية')}</label>
              <input className={inputClass} value={containerNo} onChange={(e) => setContainerNo(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>{t(locale, 'Status', 'الحالة')}</label>
              <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as ShipmentStatus)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {locale === 'ar' ? s.ar : s.en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>{t(locale, 'Selectivity lane', 'مسرب الانتقائية')}</label>
              <select className={inputClass} value={lane} onChange={(e) => setLane(e.target.value as SelectivityLane | '')}>
                {LANE_OPTIONS.map((s) => (
                  <option key={s.value || 'none'} value={s.value}>
                    {locale === 'ar' ? s.ar : s.en}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input id="pca" type="checkbox" checked={pcaOpen} onChange={(e) => setPcaOpen(e.target.checked)} />
              <label htmlFor="pca" className="text-xs text-muted">
                {t(locale, 'PCA open (blue)', 'تدقيق لاحق مفتوح')}
              </label>
            </div>
            <div>
              <label className={labelClass}>{t(locale, 'Origin (EN)', 'المنشأ (إنجليزي)')}</label>
              <input className={inputClass} value={originEn} onChange={(e) => setOriginEn(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>{t(locale, 'Origin (AR)', 'المنشأ (عربي)')}</label>
              <input className={inputClass} value={originAr} onChange={(e) => setOriginAr(e.target.value)} dir="rtl" />
            </div>
            <div>
              <label className={labelClass}>{t(locale, 'Goods (EN)', 'البضاعة (إنجليزي)')}</label>
              <input className={inputClass} value={goodsEn} onChange={(e) => setGoodsEn(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>{t(locale, 'Goods (AR)', 'البضاعة (عربي)')}</label>
              <input className={inputClass} value={goodsAr} onChange={(e) => setGoodsAr(e.target.value)} dir="rtl" />
            </div>
            <div>
              <label className={labelClass}>{t(locale, 'Discharge date', 'تاريخ التفريغ')}</label>
              <input type="date" className={inputClass} value={dischargeDate} onChange={(e) => setDischargeDate(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>{t(locale, 'Last free day', 'آخر يوم مجاني')}</label>
              <input type="date" className={inputClass} value={lastFreeDay} onChange={(e) => setLastFreeDay(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover"
              >
                <Plus size={16} />
                {t(locale, 'Save previous shipment', 'حفظ الشحنة السابقة')}
              </button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={submitDisbursement}
            className="rounded-xl bg-elevated border border-subtle p-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div>
              <label className={labelClass}>{t(locale, 'Declaration no.', 'رقم البيان')}</label>
              <input className={inputClass} value={dDecl} onChange={(e) => setDDecl(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>{t(locale, 'Mode', 'الأسلوب')}</label>
              <select className={inputClass} value={dMode} onChange={(e) => setDMode(e.target.value as DisbursementMode)}>
                <option value="pay_first">{t(locale, 'Pay-first (122100)', 'دفع أولاً (122100)')}</option>
                <option value="client_prepay">{t(locale, 'Client prepay (222100)', 'مقدم عميل (222100)')}</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>{t(locale, 'Client (EN)', 'العميل (إنجليزي)')}</label>
              <input className={inputClass} value={dClientEn} onChange={(e) => setDClientEn(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>{t(locale, 'Client (AR)', 'العميل (عربي)')}</label>
              <input className={inputClass} value={dClientAr} onChange={(e) => setDClientAr(e.target.value)} dir="rtl" />
            </div>
            <div>
              <label className={labelClass}>{t(locale, 'Duties', 'الرسوم الجمركية')}</label>
              <input type="number" min={0} step={0.01} className={inputClass} value={dDuties} onChange={(e) => setDDuties(Number(e.target.value))} />
            </div>
            <div>
              <label className={labelClass}>{t(locale, 'Port / ACT', 'ميناء / ACT')}</label>
              <input type="number" min={0} step={0.01} className={inputClass} value={dPort} onChange={(e) => setDPort(Number(e.target.value))} />
            </div>
            <div>
              <label className={labelClass}>{t(locale, 'Other gov', 'رسوم حكومية أخرى')}</label>
              <input type="number" min={0} step={0.01} className={inputClass} value={dGov} onChange={(e) => setDGov(Number(e.target.value))} />
            </div>
            <div>
              <label className={labelClass}>{t(locale, 'Agency fee', 'أتعاب التخليص')}</label>
              <input type="number" min={0} step={0.01} className={inputClass} value={dFee} onChange={(e) => setDFee(Number(e.target.value))} />
            </div>
            <div>
              <label className={labelClass}>{t(locale, 'Status', 'الحالة')}</label>
              <select className={inputClass} value={dStatus} onChange={(e) => setDStatus(e.target.value as 'open' | 'recovered' | 'closed')}>
                <option value="open">{t(locale, 'Open', 'مفتوح')}</option>
                <option value="recovered">{t(locale, 'Recovered', 'مُسترد')}</option>
                <option value="closed">{t(locale, 'Closed', 'مغلق')}</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>{t(locale, 'Created at', 'تاريخ الإنشاء')}</label>
              <input type="date" className={inputClass} value={dCreated} onChange={(e) => setDCreated(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>{t(locale, 'Last movement', 'آخر حركة')}</label>
              <input type="date" className={inputClass} value={dLast} onChange={(e) => setDLast(e.target.value)} />
            </div>
            {dMode === 'pay_first' && (
              <div>
                <label className={labelClass}>{t(locale, 'Recovered pass-through', 'الممرَّر المسترد')}</label>
                <input type="number" min={0} step={0.01} className={inputClass} value={dRecovered} onChange={(e) => setDRecovered(Number(e.target.value))} />
              </div>
            )}
            {dMode === 'client_prepay' && (
              <>
                <div>
                  <label className={labelClass}>{t(locale, 'Prepay received', 'المقدمة المستلمة')}</label>
                  <input type="number" min={0} step={0.01} className={inputClass} value={dPrepay} onChange={(e) => setDPrepay(Number(e.target.value))} />
                </div>
                <div>
                  <label className={labelClass}>{t(locale, 'Applied pass-through', 'الممرَّر المطبَّق')}</label>
                  <input type="number" min={0} step={0.01} className={inputClass} value={dApplied} onChange={(e) => setDApplied(Number(e.target.value))} />
                </div>
              </>
            )}
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover"
              >
                <Plus size={16} />
                {t(locale, 'Save previous disbursement', 'حفظ التسوية السابقة')}
              </button>
            </div>
          </form>
        )}
      </div>

      <div id="sec-user-list" className="mb-16">
        <h2 className="text-lg font-semibold text-white mb-4">
          {t(locale, 'Your previous entries', 'إدخالاتك السابقة')}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm text-muted mb-2">{t(locale, 'Shipments', 'الشحنات')}</h3>
            {userShips.length === 0 ? (
              <p className="text-xs text-dim">{t(locale, 'None yet', 'لا يوجد بعد')}</p>
            ) : (
              <ul className="space-y-2">
                {userShips.map((s) => (
                  <li
                    id={`shipment-${s.id}`}
                    key={s.id}
                    className="scroll-mt-24 rounded-lg border border-subtle bg-elevated px-3 py-2 text-xs flex justify-between gap-2 target:border-accent target:bg-accent/10"
                  >
                    <div>
                      <p className="font-mono text-slate-300">{s.declarationNo || s.blNo}</p>
                      <p className="text-dim">
                        {t(locale, s.customerNameEn, s.customerNameAr)} · {s.taxNumber}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        className="text-accent hover:text-white"
                        title="JSON"
                        onClick={() => exportShipmentDraft(s.id, 'json')}
                      >
                        <FileDown size={14} />
                      </button>
                      <button
                        type="button"
                        className="text-red-300 hover:text-red-200"
                        title={ui.delete(locale)}
                        aria-label={ui.delete(locale)}
                        onClick={() => {
                          deleteUserShipment(s.id);
                          refresh();
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="text-sm text-muted mb-2">{t(locale, 'Disbursements', 'التسويات')}</h3>
            {userDisb.length === 0 ? (
              <p className="text-xs text-dim">{t(locale, 'None yet', 'لا يوجد بعد')}</p>
            ) : (
              <ul className="space-y-2">
                {userDisb.map((d) => (
                  <li
                    key={d.id}
                    className="rounded-lg border border-subtle bg-elevated px-3 py-2 text-xs flex justify-between gap-2"
                  >
                    <div>
                      <p className="font-mono text-slate-300">{d.declarationNo}</p>
                      <p className="text-dim">
                        {t(locale, d.clientNameEn, d.clientNameAr)} · {d.mode} ·{' '}
                        {formatJod(d.duties + d.portFees + d.otherGovCharges, locale)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-red-300 hover:text-red-200"
                      onClick={() => {
                        deleteUserDisbursement(d.id);
                        refresh();
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
