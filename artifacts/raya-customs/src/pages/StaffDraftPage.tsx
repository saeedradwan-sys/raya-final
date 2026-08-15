import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileDown, Save, ScanText, Loader2 } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';
import { appendAudit } from '@/lib/auditLog';
import { allShipments, updateUserShipment, pullRecordsFromServer } from '@/lib/recordStore';
import {
  buildDeclarationDraft,
  declarationDraftToJson,
  declarationDraftToXml,
  draftFilename,
  type DeclarationDraft,
} from '@/lib/declarationDraft';
import { downloadTextFile } from '@/lib/exportCsv';
import { permitHintsForHs, permitHintsForGoodsText } from '@/lib/permitMatrix';
import {
  getAsycudaChannelStatus,
  submitAsycudaDraft,
  postAsycudaSync,
  type AsycudaChannelInfo,
} from '@/lib/asycudaAdapter';
import { useEffect } from 'react';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { llamaParseInvoice, type InvoiceParseResult } from '@/lib/api';

export default function StaffDraftPage() {
  const { locale } = useLocale();
  const { session } = useStaffAuth();
  const [params] = useSearchParams();
  const [tick, setTick] = useState(0);
  const ships = useMemo(() => allShipments(), [tick]);
  const initialId = params.get('id') || ships[0]?.id || '';
  const [shipId, setShipId] = useState(initialId);

  useEffect(() => {
    void pullRecordsFromServer().then(() => setTick((n) => n + 1));
  }, []);

  const ship = ships.find((s) => s.id === shipId) || ships[0];

  const [hsCode, setHsCode] = useState(ship?.hsCodeSuggested || '');
  const [goodsEn, setGoodsEn] = useState(ship?.goodsEn || '');
  const [goodsAr, setGoodsAr] = useState(ship?.goodsAr || '');
  const [packages, setPackages] = useState('');
  const [mass, setMass] = useState('');
  const [value, setValue] = useState('');
  const [office, setOffice] = useState('JOAQB');
  const [regime, setRegime] = useState('IM');
  const [channel, setChannel] = useState<AsycudaChannelInfo | null>(null);
  const [channelMsg, setChannelMsg] = useState('');
  const [busy, setBusy] = useState(false);

  // Invoice parse state
  const [showParsePanel, setShowParsePanel] = useState(false);
  const [invoiceText, setInvoiceText] = useState('');
  const [parseResult, setParseResult] = useState<InvoiceParseResult | null>(null);
  const [parseBusy, setParseBusy] = useState(false);
  const [parseError, setParseError] = useState('');

  useEffect(() => {
    void getAsycudaChannelStatus().then(setChannel);
  }, []);

  useEffect(() => {
    if (!ship) return;
    setHsCode(ship.hsCodeSuggested || '');
    setGoodsEn(ship.goodsEn || '');
    setGoodsAr(ship.goodsAr || '');
  }, [ship?.id, tick]);

  function build(): DeclarationDraft | null {
    if (!ship) return null;
    const draft = buildDeclarationDraft(
      {
        ...ship,
        goodsEn,
        goodsAr,
        hsCodeSuggested: hsCode || ship.hsCodeSuggested,
      },
      { forceHs: hsCode || undefined, goodsQuery: goodsEn },
    );
    draft.officeHint = office || draft.officeHint;
    draft.regimeHint = regime || draft.regimeHint;
    if (draft.items[0]) {
      draft.items[0].hsCode = hsCode || draft.items[0].hsCode;
      draft.items[0].descriptionEn = goodsEn || draft.items[0].descriptionEn;
      draft.items[0].descriptionAr = goodsAr || draft.items[0].descriptionAr;
      draft.items[0].packages = packages ? Number(packages) : null;
      draft.items[0].grossMassKg = mass ? Number(mass) : null;
      draft.items[0].invoiceValue = value ? Number(value) : null;
    }
    return draft;
  }

  function saveToCase() {
    if (!ship) return;
    updateUserShipment(ship.id, {
      hsCodeSuggested: hsCode || undefined,
      goodsEn,
      goodsAr,
      agentNoteEn: `Draft edited office=${office} regime=${regime}`,
      agentNoteAr: `عُدّلت المسودة المكتب=${office} النظام=${regime}`,
    });
    setTick((n) => n + 1);
    appendAudit(
      'staff',
      'asycuda.draft.save',
      `Saved draft fields on ${ship.declarationNo || ship.blNo}`,
      `حفظ حقول المسودة على ${ship.declarationNo || ship.blNo}`,
      { shipmentId: ship.id, hs: hsCode },
    );
  }

  async function submitToChannel() {
    const draft = build();
    if (!draft || !ship) return;
    setBusy(true);
    setChannelMsg('');
    const res = await submitAsycudaDraft({ draft, shipmentId: ship.id });
    setBusy(false);
    if ('error' in res) {
      setChannelMsg(res.error);
      return;
    }
    setChannelMsg(
      `${res.entry.status} · ${res.entry.channel} · ref ${res.entry.externalRef || res.entry.id}`,
    );
    appendAudit(
      'staff',
      'asycuda.draft.submit',
      `Channel submit ${res.entry.status}`,
      `إرسال للقناة ${res.entry.status}`,
      { id: res.entry.id, channel: res.entry.channel },
    );
  }

  async function syncStatus() {
    if (!ship) return;
    const ref = ship.declarationNo || ship.blNo || ship.id;
    setBusy(true);
    const res = await postAsycudaSync(ref, ship.id);
    setBusy(false);
    if (!res) {
      setChannelMsg('sync_failed');
      return;
    }
    setChannelMsg(`${res.status.status || res.status.reason} (${res.status.live ? 'live' : 'sim'})`);
    setTick((n) => n + 1);
  }

  async function parseInvoice() {
    if (!invoiceText.trim()) return;
    if (!session?.accessToken) {
      setParseError(t(locale, 'Staff session expired. Sign in again.', 'انتهت جلسة الموظف. سجل الدخول مرة أخرى.'));
      return;
    }
    setParseBusy(true);
    setParseError('');
    setParseResult(null);
    try {
      const res = await llamaParseInvoice(invoiceText, session.accessToken);
      if (!res) {
        setParseError(t(locale, 'AI parsing unavailable — fill fields manually.', 'التحليل الذكي غير متاح — أكمل الحقول يدوياً.'));
        return;
      }
      setParseResult(res);
    } catch {
      setParseError(t(locale, 'AI parsing request failed. Sign in again or fill fields manually.', 'فشل طلب التحليل الذكي. سجل الدخول مجدداً أو أكمل الحقول يدوياً.'));
    } finally {
      setParseBusy(false);
    }
  }

  function applyParseResult() {
    if (!parseResult) return;
    if (parseResult.hs_code_suggestion) setHsCode(parseResult.hs_code_suggestion);
    if (parseResult.goods_description_en) setGoodsEn(parseResult.goods_description_en);
    if (parseResult.goods_description_ar) setGoodsAr(parseResult.goods_description_ar);
    if (parseResult.quantity != null) setPackages(String(parseResult.quantity));
    if (parseResult.cif_value != null) setValue(String(parseResult.cif_value));
    setShowParsePanel(false);
    setInvoiceText('');
    setParseResult(null);
    appendAudit('staff', 'llama.draft.parse.apply', 'Applied invoice parse result', 'تم تطبيق نتيجة تحليل الفاتورة', { shipmentId: ship?.id || '' });
  }

  function exportFmt(fmt: 'json' | 'xml') {
    const draft = build();
    if (!draft) return;
    const body = fmt === 'json' ? declarationDraftToJson(draft) : declarationDraftToXml(draft);
    downloadTextFile(
      draftFilename(draft, fmt),
      body,
      fmt === 'json' ? 'application/json;charset=utf-8' : 'application/xml;charset=utf-8',
    );
    appendAudit(
      'staff',
      'asycuda.draft.export',
      `Exported editable draft ${fmt}`,
      `تصدير مسودة قابلة للتحرير ${fmt}`,
      { format: fmt, shipmentId: ship?.id || '' },
    );
  }

  const permits = useMemo(() => {
    if (hsCode) return permitHintsForHs(hsCode);
    return permitHintsForGoodsText(goodsEn || goodsAr || '');
  }, [hsCode, goodsEn, goodsAr]);

  const inputClass =
    'w-full rounded-lg bg-navy-900 border border-subtle px-3 py-2 text-sm text-white';

  return (
    <div className="mx-auto max-w-3xl px-4 lg:px-8 py-10">
      <Link to="/staff/assist" className="text-xs text-accent hover:underline">
        ← {t(locale, 'Assist agents', 'وكلاء المساعدة')}
      </Link>
      <h1 className="text-2xl font-semibold text-white mt-2" style={{ fontFamily: 'var(--font-heading)' }}>
        {t(locale, 'Editable declaration draft', 'مسودة بيان قابلة للتحرير')}
      </h1>
      <p className="text-sm text-muted mt-1 prose-ar">
        {t(
          locale,
          'Edit HS, goods, packages, value, office — then export JSON/XML for ASYCUDA handoff. Nothing is filed automatically.',
          'حرّر HS والبضاعة والطرود والقيمة والمكتب — ثم صدّر JSON/XML للتسليم للأسيكودا. لا يُرسل شيء تلقائياً.',
        )}
      </p>

      {/* Invoice parse panel */}
      <div className="mt-5">
        <button
          type="button"
          onClick={() => setShowParsePanel((p) => !p)}
          className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors"
        >
          <ScanText size={13} />
          {t(locale, 'Parse invoice text with AI', 'تحليل نص الفاتورة بالذكاء الاصطناعي')}
        </button>
        {showParsePanel && (
          <div className="mt-3 rounded-xl border border-subtle bg-elevated p-4 space-y-3">
            <p className="text-[11px] text-dim prose-ar">
              {t(
                locale,
                'Paste invoice lines and the AI will extract HS code, goods description, quantity, weight, and value. Review all fields before applying.',
                'الصق سطور الفاتورة وسيستخرج الذكاء الاصطناعي كود HS ووصف البضاعة والكمية والوزن والقيمة. راجع جميع الحقول قبل التطبيق.',
              )}
            </p>
            <textarea
              className="w-full rounded-lg bg-navy-900 border border-subtle px-3 py-2 text-xs text-white h-28 resize-y"
              placeholder={t(locale, 'Paste invoice text here…', 'الصق نص الفاتورة هنا…')}
              value={invoiceText}
              onChange={(e) => setInvoiceText(e.target.value)}
            />
            {parseError && <p className="text-xs text-red-400 prose-ar">{parseError}</p>}
            {parseResult && (
              <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-1.5 text-xs text-white">
                <p className="text-[11px] text-dim font-medium">{t(locale, 'AI extracted fields (review before applying):', 'الحقول المستخرجة بالذكاء الاصطناعي (راجعها قبل التطبيق):')}</p>
                {parseResult.hs_code_suggestion && <p><span className="text-dim">HS:</span> {parseResult.hs_code_suggestion} {parseResult.hs_confidence_pct ? <span className="text-accent/70">({parseResult.hs_confidence_pct}%)</span> : null}</p>}
                {parseResult.goods_description_en && <p><span className="text-dim">Goods EN:</span> {parseResult.goods_description_en}</p>}
                {parseResult.goods_description_ar && <p><span className="text-dim">Goods AR:</span> {parseResult.goods_description_ar}</p>}
                {parseResult.quantity != null && <p><span className="text-dim">{t(locale, 'Qty:', 'الكمية:')}</span> {parseResult.quantity} {parseResult.unit || ''}</p>}
                {parseResult.cif_value != null && <p><span className="text-dim">CIF:</span> {parseResult.cif_value} {parseResult.currency || 'USD'}</p>}
                {parseResult.country_of_origin && <p><span className="text-dim">{t(locale, 'Origin:', 'المنشأ:')}</span> {parseResult.country_of_origin}</p>}
                <button
                  type="button"
                  onClick={applyParseResult}
                  className="mt-2 px-3 py-1 rounded-md bg-accent/20 text-accent text-xs hover:bg-accent/30 transition-colors"
                >
                  {t(locale, 'Apply to form', 'تطبيق على النموذج')}
                </button>
              </div>
            )}
            <button
              type="button"
              disabled={parseBusy || !invoiceText.trim()}
              onClick={() => void parseInvoice()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/20 text-accent text-xs hover:bg-accent/30 transition-colors disabled:opacity-40"
            >
              {parseBusy ? <Loader2 size={12} className="animate-spin" /> : <ScanText size={12} />}
              {parseBusy ? t(locale, 'Parsing…', 'جارٍ التحليل…') : t(locale, 'Parse', 'تحليل')}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-4 rounded-xl border border-subtle bg-elevated p-6">
        <div>
          <label className="text-[11px] text-dim">{t(locale, 'Case', 'الملف')}</label>
          <select
            className={inputClass}
            value={ship?.id || ''}
            onChange={(e) => setShipId(e.target.value)}
          >
            {ships.map((s) => (
              <option key={s.id} value={s.id}>
                {s.declarationNo || s.blNo} · {s.taxNumber}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-dim">HS</label>
            <input className={inputClass} value={hsCode} onChange={(e) => setHsCode(e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] text-dim">{t(locale, 'Customs office', 'المكتب الجمركي')}</label>
            <input className={inputClass} value={office} onChange={(e) => setOffice(e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] text-dim">{t(locale, 'Regime', 'النظام')}</label>
            <input className={inputClass} value={regime} onChange={(e) => setRegime(e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] text-dim">{t(locale, 'Packages', 'الطرود')}</label>
            <input className={inputClass} value={packages} onChange={(e) => setPackages(e.target.value)} type="number" />
          </div>
          <div>
            <label className="text-[11px] text-dim">{t(locale, 'Gross mass kg', 'الوزن القائم كغ')}</label>
            <input className={inputClass} value={mass} onChange={(e) => setMass(e.target.value)} type="number" />
          </div>
          <div>
            <label className="text-[11px] text-dim">{t(locale, 'Invoice value', 'قيمة الفاتورة')}</label>
            <input className={inputClass} value={value} onChange={(e) => setValue(e.target.value)} type="number" />
          </div>
        </div>
        <div>
          <label className="text-[11px] text-dim">{t(locale, 'Goods (EN)', 'البضاعة (إنجليزي)')}</label>
          <textarea className={inputClass} rows={2} value={goodsEn} onChange={(e) => setGoodsEn(e.target.value)} />
        </div>
        <div>
          <label className="text-[11px] text-dim">{t(locale, 'Goods (AR)', 'البضاعة (عربي)')}</label>
          <textarea className={inputClass} rows={2} value={goodsAr} onChange={(e) => setGoodsAr(e.target.value)} dir="rtl" />
        </div>

        <div>
          <p className="text-xs text-muted mb-2">{t(locale, 'Permit hints (by HS / goods)', 'إشارات التصاريح (حسب HS / البضاعة)')}</p>
          <ul className="space-y-1 mb-2">
            {permits.map((p) => (
              <li key={p.authorityId + p.chapterFrom} className="text-xs text-slate-300 border border-subtle rounded-lg px-3 py-2">
                <span className="text-accent font-medium">
                  {p.authority ? t(locale, p.authority.titleEn, p.authority.titleAr) : p.authorityId}
                </span>
                <span className="text-dim ms-2">({p.likelihood})</span>
                <span className="block text-dim mt-0.5 prose-ar">{t(locale, p.reasonEn, p.reasonAr)}</span>
              </li>
            ))}
            {permits.length === 0 && (
              <li className="text-xs text-dim">{t(locale, 'Enter HS or goods description', 'أدخل HS أو وصف البضاعة')}</li>
            )}
          </ul>
          <Link to="/authorities" className="text-xs text-accent hover:underline">
            {t(locale, 'Full authorities guide', 'دليل الجهات الكامل')} →
          </Link>
        </div>

        {/* Document checklist */}
        {ship && (
          <div>
            <p className="text-xs text-muted mb-2">{t(locale, 'Document checklist', 'قائمة الوثائق')}</p>
            <ul className="space-y-1">
              {ship.documents.map((d) => (
                <li key={d.id} className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={d.available}
                    onChange={() => {
                      updateUserShipment(ship.id, {
                        documents: ship.documents.map((x) =>
                          x.id === d.id ? { ...x, available: !x.available } : x,
                        ),
                      });
                      setTick((n) => n + 1);
                    }}
                  />
                  <span className="prose-ar">{t(locale, d.nameEn, d.nameAr)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Manual handoff validation + instructions (live ASYHUB refused) */}
        <div className="rounded-xl border border-accent/30 bg-navy-900/50 p-4 space-y-3">
          <p className="text-xs font-semibold text-accent">
            {t(locale, 'Manual ASYCUDA / ASYHUB handoff checklist', 'قائمة تحقق التسليم اليدوي للأسيكودا / ASYHUB')}
          </p>
          <ul className="text-[11px] text-slate-300 space-y-1.5">
            <li className="flex gap-2">
              <span className={hsCode && hsCode.length >= 8 ? 'text-emerald-400' : 'text-amber-400'}>
                {hsCode && hsCode.length >= 8 ? '✓' : '○'}
              </span>
              {t(locale, 'HS code present and looks valid (8–11 digits)', 'رمز HS موجود ويبدو صالحاً (8–11 رقماً)')}
            </li>
            <li className="flex gap-2">
              <span className={goodsEn || goodsAr ? 'text-emerald-400' : 'text-amber-400'}>
                {goodsEn || goodsAr ? '✓' : '○'}
              </span>
              {t(locale, 'Goods description filled (EN and/or AR)', 'وصف البضاعة مملوء (إنجليزي و/أو عربي)')}
            </li>
            <li className="flex gap-2">
              <span className={packages && mass ? 'text-emerald-400' : 'text-amber-400'}>
                {packages && mass ? '✓' : '○'}
              </span>
              {t(locale, 'Packages + gross mass entered', 'عدد الطرود والوزن القائم مدخلان')}
            </li>
            <li className="flex gap-2">
              <span className={value ? 'text-emerald-400' : 'text-amber-400'}>
                {value ? '✓' : '○'}
              </span>
              {t(locale, 'Invoice value entered', 'قيمة الفاتورة مدخلة')}
            </li>
            <li className="flex gap-2">
              <span className={office && regime ? 'text-emerald-400' : 'text-amber-400'}>
                {office && regime ? '✓' : '○'}
              </span>
              {t(locale, 'Customs office + regime set', 'المكتب الجمركي والنظام محددان')}
            </li>
          </ul>
          <div className="text-[10px] text-dim border-t border-subtle/50 pt-2 space-y-1">
            <p className="font-medium text-muted">
              {t(locale, 'Handoff steps (live access refused by Customs):', 'خطوات التسليم (الوصول الحي مرفوض من الجمارك):')}
            </p>
            <ol className="list-decimal ps-4 space-y-0.5">
              <li>{t(locale, 'Export XML (preferred for ASYCUDA) or JSON', 'صدّر XML (مفضل للأسيكودا) أو JSON')}</li>
              <li>{t(locale, 'Open ASYCUDA World / local entry screen and import or re-key the values', 'افتح ASYCUDA World / شاشة الإدخال المحلية واستورد أو أعد إدخال القيم')}</li>
              <li>{t(locale, 'Attach supporting docs from the checklist above', 'أرفق الوثائق الداعمة من القائمة أعلاه')}</li>
              <li>{t(locale, 'After registration, copy the declaration number back into Raya', 'بعد التسجيل انسخ رقم البيان إلى راية')}</li>
            </ol>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={saveToCase}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm"
          >
            <Save size={16} />
            {t(locale, 'Save to case', 'حفظ على الملف')}
          </button>
          <button
            type="button"
            onClick={() => exportFmt('json')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-subtle text-sm text-muted hover:text-white"
          >
            <FileDown size={16} />
            JSON
          </button>
          <button
            type="button"
            onClick={() => exportFmt('xml')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-accent/50 text-accent text-sm hover:bg-accent/10"
          >
            <FileDown size={16} />
            {t(locale, 'XML (recommended)', 'XML (موصى به)')}
          </button>
          <button
            type="button"
            disabled={busy || !ship}
            onClick={() => void submitToChannel()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-subtle text-sm text-muted hover:text-white disabled:opacity-40"
            title={t(locale, 'Simulation only — live ASYHUB refused', 'محاكاة فقط — ASYHUB الحي مرفوض')}
          >
            {t(locale, 'Simulate channel', 'محاكاة القناة')}
          </button>
          <button
            type="button"
            disabled={busy || !ship}
            onClick={() => void syncStatus()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-subtle text-sm text-muted hover:text-white disabled:opacity-40"
          >
            {t(locale, 'Sync status (sim)', 'مزامنة الحالة (محاكاة)')}
          </button>
        </div>
        {channel && (
          <p className="text-[11px] text-dim mt-3 prose-ar">
            {t(locale, 'Channel', 'القناة')}: {channel.mode}
            {channel.live ? ' · LIVE' : ' · simulation (live access refused)'} — {channel.message}
          </p>
        )}
        {channelMsg && (
          <p className="text-xs text-emerald-300 mt-2 font-mono">{channelMsg}</p>
        )}
      </div>
    </div>
  );
}
