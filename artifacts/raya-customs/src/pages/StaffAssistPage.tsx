import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, CheckCircle2, Sparkles, FileDown, MessageSquare } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/i18n';
import { appendAudit } from '@/lib/auditLog';
import {
  AGENT_CATALOG,
  runAgent,
  type AgentId,
  type AgentRunResult,
  type AgentSuggestion,
} from '@/lib/agents';
import { parseSADXML, type HistoricalDeclaration } from '@/lib/agents/historicalImportAgent';
import { buildLookupPatch, type DeclarationLookupResult } from '@/lib/agents/declarationLookupAgent';
import { allShipments, applyHsApproval, applyCarrierTrackNote, importHistoricalDeclaration, updateUserShipment, pullRecordsFromServer } from '@/lib/recordStore';
import type { SelectivityLane } from '@/lib/types';
import {
  buildDeclarationDraft,
  declarationDraftToJson,
  declarationDraftToXml,
  draftFilename,
} from '@/lib/declarationDraft';
import { downloadTextFile } from '@/lib/exportCsv';
import { listIntegrationRoadmap } from '@/lib/asycudaAdapter';
import AssistChat from '@/components/AssistChat';
import { useStaffAuth } from '@/hooks/useStaffAuth';

const confColor = {
  high: 'text-emerald-300',
  medium: 'text-amber-300',
  low: 'text-slate-400',
};

export default function StaffAssistPage() {
  const { locale } = useLocale();
  const { session } = useStaffAuth();
  const [shipTick, setShipTick] = useState(0);
  const ships = useMemo(() => allShipments(), [shipTick]);
  useEffect(() => {
    void pullRecordsFromServer().then(() => setShipTick((n) => n + 1));
  }, []);
  const [activeTab, setActiveTab] = useState<'agents' | 'chat'>('agents');
  const [agentId, setAgentId] = useState<AgentId>('next_action');
  const [query, setQuery] = useState('cotton knitted t-shirt');
  const [shipId, setShipId] = useState(ships[0]?.id ?? '');
  const [duties, setDuties] = useState(1000);
  const [portFees, setPortFees] = useState(200);
  const [otherGov, setOtherGov] = useState(50);
  const [agencyFee, setAgencyFee] = useState(120);
  const [mode, setMode] = useState<'pay_first' | 'client_prepay'>('pay_first');
  const [result, setResult] = useState<AgentRunResult | null>(null);
  const [approved, setApproved] = useState<Record<string, boolean>>({});

  // Historical import specific state
  const [, setHistoricalFiles] = useState<File[]>([]);
  const [historicalDeclarations, setHistoricalDeclarations] = useState<HistoricalDeclaration[]>([]);
  const [historicalDocs, setHistoricalDocs] = useState<Array<{filename: string; type: string; size?: number}>>([]);
  const [, setIsScanning] = useState(false);

  // Declaration lookup (manual ASYCUDA) form state
  const [lookupDeclNo, setLookupDeclNo] = useState('');
  const [lookupLane, setLookupLane] = useState<SelectivityLane | ''>('');
  const [lookupStatusEn, setLookupStatusEn] = useState('');
  const [lookupStatusAr, setLookupStatusAr] = useState('');
  const [lookupDuties, setLookupDuties] = useState('');
  const [lookupNotes, setLookupNotes] = useState('');
  const [lookupMsg, setLookupMsg] = useState('');
  const [importNotice, setImportNotice] = useState('');

  async function processHistoricalFiles(files: File[]) {
    setIsScanning(true);
    const decls: HistoricalDeclaration[] = [];
    const docs: Array<{filename: string; type: string; size?: number}> = [];

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (['xml'].includes(ext)) {
        try {
          const text = await file.text();
          const parsed = parseSADXML(text, file.name);
          if (parsed) decls.push(parsed);
        } catch (e) {
          console.warn('Failed to parse XML', file.name);
        }
      } else if (['pdf', 'jpg', 'jpeg', 'png', 'tif', 'tiff'].includes(ext)) {
        docs.push({
          filename: file.name,
          type: classifyDoc ? classifyDoc(file.name) : 'supporting document', // fallback
          size: file.size,
        });
      } else {
        docs.push({ filename: file.name, type: 'other', size: file.size });
      }
    }

    setHistoricalDeclarations(decls);
    setHistoricalDocs(docs);
    setIsScanning(false);

    // Auto-run the agent for suggestions
    const res = runAgent('historical_import', { query: `${files.length} files processed` });
    setResult(res);
    setApproved({});
  }

  // Simple classify fallback (duplicated from agent for client)
  function classifyDoc(filename: string): string {
    const lower = filename.toLowerCase();
    if (lower.includes('invoice') || lower.includes('فاتورة')) return 'invoice';
    if (lower.includes('bol') || lower.includes('bill') || lower.includes('lading') || lower.includes('بوليصة')) return 'bol';
    if (lower.includes('origin') || lower.includes('certificate') || lower.includes('شهادة') || lower.includes('منشأ')) return 'certificate of origin';
    if (lower.includes('manifest') || lower.includes('بيان')) return 'manifest';
    if (lower.includes('packing') || lower.includes('list') || lower.includes('قائمة')) return 'packing list';
    if (lower.includes('permit') || lower.includes('تصريح')) return 'permit';
    return 'other supporting document';
  }

  const ship = ships.find((s) => s.id === shipId);

  // Seed query with container when carrier agent + case selected
  useEffect(() => {
    if (agentId !== 'carrier_track') return;
    const c = ships.find((s) => s.id === shipId)?.containerNo;
    if (c) setQuery(c);
  }, [agentId, shipId, ships]);

  function run() {
    const input = {
      query,
      containerNo: (agentId === 'carrier_track' && query.trim())
        ? query.trim()
        : ships.find((s) => s.id === shipId)?.containerNo || query.trim() || undefined,
      blNo: ships.find((s) => s.id === shipId)?.blNo,
      goodsEn: query || ship?.goodsEn,
      declarationNo: ship?.declarationNo,
      taxNumber: ship?.taxNumber,
      selectivityLane: ship?.selectivityLane,
      status: ship?.status,
      lastFreeDay: ship?.lastFreeDay,
      dischargeDate: ship?.dischargeDate,
      duties,
      portFees,
      otherGov,
      agencyFee,
      mode,
      originEn: ship?.originEn,
    };
    const res = runAgent(agentId, input);
    setResult(res);
    setApproved({});
    appendAudit(
      'staff',
      `agent.run.${agentId}`,
      `Ran ${agentId} agent (${res.suggestions.length} suggestions)`,
      `تشغيل وكيل ${agentId} (${res.suggestions.length} اقتراحات)`,
      { agentId },
    );
  }

  function approve(s: AgentSuggestion) {
    setApproved((prev) => ({ ...prev, [s.id]: true }));
    let applied = '';
    if (s.agentId === 'hs' && s.meta?.hs && shipId) {
      const conf = s.meta.confidence ? Number(s.meta.confidence) / 100 : undefined;
      const row = applyHsApproval(
        shipId,
        s.meta.hs,
        s.bodyEn.split('.')[0] || s.titleEn,
        s.bodyAr.split('.')[0] || s.titleAr,
        conf,
      );
      if (row) {
        applied = ` · applied HS ${s.meta.hs} to ${row.id}`;
        setShipTick((n) => n + 1);
      }
    }
    if (s.agentId === 'carrier_track' && shipId && (s.meta?.container || s.meta?.carrier)) {
      const label = s.meta.carrierName || s.meta.carrier || 'carrier';
      const row = applyCarrierTrackNote(
        shipId,
        `Carrier track note: ${label} / ${s.meta.container || ship?.containerNo || ''}`,
        `ملاحظة تتبع خط: ${label} / ${s.meta.container || ship?.containerNo || ''}`,
        s.meta.carrier,
      );
      if (row) {
        applied = ` · tracking note on ${row.id}`;
        setShipTick((n) => n + 1);
      }
    }
    appendAudit(
      'staff',
      'agent.approve',
      `Approved suggestion: ${s.titleEn}${applied}`,
      `اعتماد اقتراح: ${s.titleAr}${applied}`,
      { agentId: s.agentId, suggestionId: s.id, shipmentId: shipId, ...(s.meta || {}) },
    );
  }

  function exportDraft(fmt: 'json' | 'xml') {
    if (!ship) return;
    const draft = buildDeclarationDraft(ship, { goodsQuery: query || ship.goodsEn });
    const body = fmt === 'json' ? declarationDraftToJson(draft) : declarationDraftToXml(draft);
    const mime = fmt === 'json' ? 'application/json;charset=utf-8' : 'application/xml;charset=utf-8';
    downloadTextFile(draftFilename(draft, fmt), body, mime);
    appendAudit(
      'staff',
      'asycuda.draft.export',
      `Exported SAD draft ${fmt} for ${ship.declarationNo || ship.blNo}`,
      `تصدير مسودة بيان ${fmt} لـ ${ship.declarationNo || ship.blNo}`,
      { format: fmt, shipmentId: ship.id },
    );
  }

  const roadmap = listIntegrationRoadmap();

  const inputClass =
    'w-full rounded-lg bg-navy-900 border border-subtle px-3 py-2 text-sm text-white';

  return (
    <div className="mx-auto max-w-6xl px-4 lg:px-8 py-10">
      <Link to="/staff" className="text-xs text-accent hover:underline">
        ← {t(locale, 'Staff workspace', 'مساحة الموظفين')}
      </Link>
      <h1
        className="text-2xl font-semibold text-white mt-2 flex items-center gap-2"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        <Bot size={24} className="text-accent" />
        {t(locale, 'Assist agents', 'وكلاء المساعدة')}
      </h1>
      <p className="text-sm text-muted mt-1 max-w-2xl leading-relaxed prose-ar">
        {t(
          locale,
          'Rule- and tool-based coaches for HS, documents, next actions, and money split. Human must approve — nothing is filed to Customs automatically.',
          'مدربون مبنيون على قواعد وأدوات لـ HS والوثائق والخطوة التالية وتقسيم المال. يجب اعتماد بشري — لا يُرسل شيء للجمارك تلقائياً.',
        )}
      </p>

      {/* Tab switcher */}
      <div className="flex gap-1 mt-6 rounded-lg border border-subtle bg-elevated p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('agents')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'agents' ? 'bg-accent/20 text-white' : 'text-muted hover:text-white'
          }`}
        >
          <Sparkles size={13} />
          {t(locale, 'Agents', 'الوكلاء')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'chat' ? 'bg-accent/20 text-white' : 'text-muted hover:text-white'
          }`}
        >
          <MessageSquare size={13} />
          {t(locale, 'AI Chat', 'محادثة ذكية')}
        </button>
      </div>

      {activeTab === 'chat' && (
        <div className="mt-6">
          <AssistChat
            accessToken={session?.accessToken}
            caseContext={ship ? {
              declarationNo: ship.declarationNo,
              status: ship.status,
              selectivityLane: ship.selectivityLane,
              lastFreeDay: ship.lastFreeDay,
              goodsEn: ship.goodsEn,
              blNo: ship.blNo,
              containerNo: ship.containerNo,
              originEn: ship.originEn,
            } : {}}
            className="min-h-[520px]"
          />
        </div>
      )}

      {activeTab === 'agents' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl bg-elevated border border-subtle p-4 space-y-2">
            <p className="text-xs text-dim mb-2">{t(locale, 'Agent', 'الوكيل')}</p>
            {AGENT_CATALOG.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => { setAgentId(a.id); if (a.id === 'legal_research') setQuery('customs clearance'); }}
                className={`w-full text-start rounded-lg px-3 py-2 text-xs border transition-colors ${
                  agentId === a.id
                    ? 'border-accent bg-accent/10 text-white'
                    : 'border-subtle text-muted hover:text-white'
                }`}
              >
                <span className="font-medium block">{t(locale, a.titleEn, a.titleAr)}</span>
                <span className="text-dim">{t(locale, a.descEn, a.descAr)}</span>
              </button>
            ))}
          </div>

          <div className="rounded-xl bg-elevated border border-subtle p-4 space-y-3">
            <div>
              <label className="text-[11px] text-dim">{t(locale, 'Case (optional)', 'الملف (اختياري)')}</label>
              <select className={inputClass} value={shipId} onChange={(e) => setShipId(e.target.value)}>
                {ships.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.declarationNo || s.blNo} · {s.taxNumber}
                    {s.hsCodeSuggested ? ` · HS ${s.hsCodeSuggested}` : ''}
                  </option>
                ))}
              </select>
              {ship?.hsCodeSuggested && (
                <p className="text-[11px] text-emerald-300 mt-1">
                  HS {ship.hsCodeSuggested}
                  {ship.agentNoteEn ? ` — ${locale === 'ar' ? ship.agentNoteAr : ship.agentNoteEn}` : ''}
                </p>
              )}
            </div>
            {(agentId === 'carrier_track') && (
              <div className="rounded-lg border border-subtle bg-navy-900/50 px-3 py-2 text-xs text-muted">
                <p className="text-dim mb-1">{t(locale, 'Tracking uses public carrier links only — no password login.', 'التتبع عبر روابط الخط العامة فقط — بدون تسجيل بكلمة مرور.')}</p>
                <p className="font-mono text-slate-300">
                  {ship?.containerNo || t(locale, 'No container on case — type one in query', 'لا حاوية في الملف — اكتبها في الاستعلام')}
                  {ship?.blNo ? ` · B/L ${ship.blNo}` : ''}
                </p>
                <label className="block text-[11px] text-dim mt-2 mb-1">{t(locale, 'Container / query override', 'حاوية / تجاوز الاستعلام')}</label>
                <input
                  className={inputClass}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="MSCU1234567"
                />
              </div>
            )}
            {(agentId === 'hs' || agentId === 'docs' || agentId === 'legal_research') && (
              <div>
                <label className="text-[11px] text-dim">{t(locale, 'Goods / query', 'البضاعة / الاستعلام')}</label>
                <textarea
                  className={inputClass}
                  rows={3}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            )}
            {agentId === 'money' && (
              <div className="grid grid-cols-2 gap-2">
                <input type="number" className={inputClass} value={duties} onChange={(e) => setDuties(Number(e.target.value))} placeholder="Duties" />
                <input type="number" className={inputClass} value={portFees} onChange={(e) => setPortFees(Number(e.target.value))} placeholder="Port" />
                <input type="number" className={inputClass} value={otherGov} onChange={(e) => setOtherGov(Number(e.target.value))} placeholder="Gov" />
                <input type="number" className={inputClass} value={agencyFee} onChange={(e) => setAgencyFee(Number(e.target.value))} placeholder="Fee" />
                <select className={`${inputClass} col-span-2`} value={mode} onChange={(e) => setMode(e.target.value as 'pay_first' | 'client_prepay')}>
                  <option value="pay_first">{t(locale, 'Pay-first', 'دفع أولاً')}</option>
                  <option value="client_prepay">{t(locale, 'Prepay', 'مقدم')}</option>
                </select>
              </div>
            )}
            {agentId === 'historical_import' && (
              <div className="rounded-lg border border-subtle bg-navy-900/50 p-3 text-xs">
                <p className="text-dim mb-2">{t(locale, 'Select previous declarations folder or files (XML SAD exports + supporting PDFs/images). Browser processes locally.', 'اختر مجلد أو ملفات البيانات السابقة (تصديرات XML SAD + وثائق داعمة PDF/صور). المعالجة محلية في المتصفح.')}</p>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-accent/50 text-accent text-xs hover:bg-accent/10">
                    <input
                      type="file"
                      multiple
                      {...({ webkitdirectory: "" } as Record<string, string>)}
                      className="hidden"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        setHistoricalFiles(files);
                        await processHistoricalFiles(files);
                      }}
                    />
                    {t(locale, 'Select Folder or Files', 'اختر مجلد أو ملفات')}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setHistoricalFiles([]);
                      setHistoricalDeclarations([]);
                      setHistoricalDocs([]);
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg border border-subtle text-muted hover:text-white"
                  >
                    {t(locale, 'Clear', 'مسح')}
                  </button>
                </div>

                {(historicalDeclarations.length > 0 || historicalDocs.length > 0) && (
                  <div className="mt-2 text-[11px]">
                    <p className="text-emerald-300 mb-1">
                      {t(locale, `Found ${historicalDeclarations.length} declarations and ${historicalDocs.length} supporting documents.`, `تم العثور على ${historicalDeclarations.length} بيان و ${historicalDocs.length} وثيقة داعمة.`)}
                    </p>
                    {historicalDeclarations.length > 0 && (
                      <div className="max-h-32 overflow-auto border border-subtle rounded p-2 bg-navy-950 text-[10px] font-mono">
                        {historicalDeclarations.slice(0, 5).map((d, i) => (
                          <div key={i}>{d.declarationNo || 'Unknown'} — {d.date || ''} — {d.items[0]?.hsCode || ''} {d.importerName ? `(${d.importerName})` : ''}</div>
                        ))}
                        {historicalDeclarations.length > 5 && <div>... +{historicalDeclarations.length - 5} more</div>}
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={historicalDeclarations.length === 0}
                      onClick={() => {
                        let importedCount = 0;
                        historicalDeclarations.forEach((decl) => {
                          const row = importHistoricalDeclaration(decl);
                          if (row) importedCount++;
                        });
                        setShipTick((n) => n + 1);
                        setImportNotice(
                          t(
                            locale,
                            `Imported ${importedCount} historical declarations to Raya Records. Go to Staff → Records to view them.`,
                            `تم استيراد ${importedCount} بيان تاريخي إلى سجلات راية. اذهب إلى Staff → Records لعرضها.`
                          )
                        );
                      }}
                      className="mt-2 w-full text-xs px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 disabled:opacity-50"
                    >
                      {t(locale, 'Import All to Raya Records', 'استيراد الكل إلى سجلات راية')}
                    </button>
                    {importNotice && (
                      <p className="mt-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200" role="status" aria-live="polite">
                        {importNotice}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            {agentId === 'declaration_lookup' && (
              <div className="rounded-lg border border-accent/40 bg-navy-900/50 p-3 space-y-2">
                <p className="text-[11px] text-accent font-medium">
                  {t(locale, 'Record found declaration from ASYCUDA World', 'تسجيل البيان الموجود من ASYCUDA World')}
                </p>
                <p className="text-[10px] text-dim">
                  {t(
                    locale,
                    'Search inside the official ASYCUDA client first, then paste the results here. Live login is not available (refused by Customs).',
                    'ابحث داخل عميل الأسيكودا الرسمي أولاً، ثم الصق النتائج هنا. الدخول الحي غير متاح (مرفوض من الجمارك).',
                  )}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="rounded-lg bg-navy-950 border border-subtle px-2 py-1.5 text-xs text-white"
                    placeholder={t(locale, 'Declaration number', 'رقم البيان')}
                    value={lookupDeclNo}
                    onChange={(e) => setLookupDeclNo(e.target.value)}
                  />
                  <select
                    className="rounded-lg bg-navy-950 border border-subtle px-2 py-1.5 text-xs text-white"
                    value={lookupLane}
                    onChange={(e) => setLookupLane(e.target.value as SelectivityLane | '')}
                  >
                    <option value="">{t(locale, 'Selectivity lane', 'مسار الانتقائية')}</option>
                    <option value="green">Green / أخضر</option>
                    <option value="yellow">Yellow / أصفر</option>
                    <option value="red">Red / أحمر</option>
                    <option value="blue">Blue / أزرق</option>
                  </select>
                  <input
                    className="rounded-lg bg-navy-950 border border-subtle px-2 py-1.5 text-xs text-white"
                    placeholder={t(locale, 'Status (EN)', 'الحالة (إنجليزي)')}
                    value={lookupStatusEn}
                    onChange={(e) => setLookupStatusEn(e.target.value)}
                  />
                  <input
                    className="rounded-lg bg-navy-950 border border-subtle px-2 py-1.5 text-xs text-white"
                    placeholder={t(locale, 'Status (AR)', 'الحالة (عربي)')}
                    value={lookupStatusAr}
                    onChange={(e) => setLookupStatusAr(e.target.value)}
                    dir="rtl"
                  />
                  <input
                    className="rounded-lg bg-navy-950 border border-subtle px-2 py-1.5 text-xs text-white"
                    placeholder={t(locale, 'Duties JOD (optional)', 'الرسوم د.أ (اختياري)')}
                    value={lookupDuties}
                    onChange={(e) => setLookupDuties(e.target.value)}
                    type="number"
                  />
                  <input
                    className="rounded-lg bg-navy-950 border border-subtle px-2 py-1.5 text-xs text-white col-span-2"
                    placeholder={t(locale, 'Notes from ASYCUDA', 'ملاحظات من الأسيكودا')}
                    value={lookupNotes}
                    onChange={(e) => setLookupNotes(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  disabled={!shipId || (!lookupDeclNo && !lookupLane && !lookupStatusEn)}
                  onClick={() => {
                    if (!shipId) return;
                    const result: DeclarationLookupResult = {
                      declarationNo: lookupDeclNo || undefined,
                      selectivityLane: (lookupLane || undefined) as SelectivityLane | undefined,
                      statusEn: lookupStatusEn || undefined,
                      statusAr: lookupStatusAr || undefined,
                      dutiesJod: lookupDuties ? Number(lookupDuties) : null,
                      notesEn: lookupNotes || undefined,
                      notesAr: lookupNotes || undefined,
                      foundAt: new Date().toISOString().slice(0, 10),
                    };
                    const patch = buildLookupPatch(result);
                    // Append to existing agent notes if present
                    const ship = ships.find((s) => s.id === shipId);
                    if (ship?.agentNoteEn && patch.agentNoteEn) {
                      patch.agentNoteEn = `${ship.agentNoteEn}\n• ${patch.agentNoteEn}`;
                    }
                    if (ship?.agentNoteAr && patch.agentNoteAr) {
                      patch.agentNoteAr = `${ship.agentNoteAr}\n• ${patch.agentNoteAr}`;
                    }
                    const row = updateUserShipment(shipId, patch as any);
                    if (row) {
                      setShipTick((n) => n + 1);
                      setLookupMsg(
                        t(
                          locale,
                          `Saved to case ${shipId}: ${lookupDeclNo || '—'} / ${lookupLane || '—'}`,
                          `حُفظ على الملف ${shipId}: ${lookupDeclNo || '—'} / ${lookupLane || '—'}`,
                        ),
                      );
                      appendAudit(
                        'staff',
                        'asycuda.lookup.record',
                        `Recorded ASYCUDA lookup ${lookupDeclNo || ''} lane=${lookupLane}`,
                        `تسجيل استعلام أسيكودا ${lookupDeclNo || ''} مسار=${lookupLane}`,
                        { shipmentId: shipId, declarationNo: lookupDeclNo, lane: lookupLane },
                      );
                    }
                  }}
                  className="w-full text-xs px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-40"
                >
                  {t(locale, 'Save found declaration to case', 'حفظ البيان الموجود على الملف')}
                </button>
                {lookupMsg && <p className="text-[10px] text-emerald-300">{lookupMsg}</p>}
              </div>
            )}

            <button
              type="button"
              onClick={run}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover"
            >
              <Sparkles size={16} />
              {t(locale, 'Run agent', 'تشغيل الوكيل')}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
          {!result ? (
            <div className="rounded-xl border border-dashed border-subtle p-12 text-center text-sm text-dim">
              {t(locale, 'Run an agent to see suggestions.', 'شغّل وكيلاً لعرض الاقتراحات.')}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-dim prose-ar">
                {t(locale, result.disclaimerEn, result.disclaimerAr)}
              </p>
              {result.suggestions.map((s) => (
                <div key={s.id} className="rounded-xl bg-elevated border border-subtle p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-white prose-ar">
                      {t(locale, s.titleEn, s.titleAr)}
                    </h3>
                    <span className={`text-[11px] uppercase tracking-wide ${confColor[s.confidence]}`}>
                      {s.confidence}
                    </span>
                  </div>
                  <pre className="text-xs text-muted whitespace-pre-wrap font-sans leading-relaxed prose-ar mb-3">
                    {t(locale, s.bodyEn, s.bodyAr)}
                  </pre>
                  <div className="flex flex-wrap gap-2 items-center">
                    {s.links?.map((l) =>
                      /^https?:\/\//.test(l.href) ? (
                        <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">
                          {t(locale, l.labelEn, l.labelAr)} →
                        </a>
                      ) : (
                        <Link key={l.href} to={l.href} className="text-xs text-accent hover:underline">
                          {t(locale, l.labelEn, l.labelAr)} →
                        </Link>
                      ),
                    )}
                    {approved[s.id] ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-300 ms-auto">
                        <CheckCircle2 size={14} />
                        {t(locale, 'Approved (logged)', 'مُعتمد (مُسجَّل)')}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => approve(s)}
                        className="ms-auto text-xs px-3 py-1.5 rounded-lg border border-accent/50 text-accent hover:bg-accent/10"
                      >
                        {t(locale, 'Approve & log', 'اعتماد وتسجيل')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      )} {/* end activeTab === 'agents' */}

      {/* Declaration draft export — ASYCUDA handoff */}
      <div className="mt-10 rounded-xl border border-subtle bg-elevated p-6">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
          <FileDown size={16} className="text-accent" />
          {t(locale, 'ASYCUDA declaration draft', 'مسودة بيان الأسيكودا')}
        </h2>
        <p className="text-xs text-dim mb-4 max-w-2xl leading-relaxed prose-ar">
          {t(
            locale,
            'Build a structured JSON/XML draft from the selected case + HS assist query. Manual handoff only — not sent to Customs.',
            'أنشئ مسودة JSON/XML من الملف المختار واستعلام HS. تسليم يدوي فقط — لا تُرسل للجمارك.',
          )}
        </p>
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            disabled={!ship}
            onClick={() => exportDraft('json')}
            className="px-3 py-2 rounded-lg text-xs border border-accent/50 text-accent hover:bg-accent/10 disabled:opacity-40"
          >
            {t(locale, 'Download JSON draft', 'تحميل مسودة JSON')}
          </button>
          <button
            type="button"
            disabled={!ship}
            onClick={() => exportDraft('xml')}
            className="px-3 py-2 rounded-lg text-xs border border-subtle text-muted hover:text-white disabled:opacity-40"
          >
            {t(locale, 'Download XML draft', 'تحميل مسودة XML')}
          </button>
          <Link to="/asycuda" className="px-3 py-2 text-xs text-accent hover:underline self-center">
            {t(locale, 'ASYCUDA guide', 'دليل الأسيكودا')} →
          </Link>
          <Link
            to={ship ? `/staff/draft?id=${ship.id}` : '/staff/draft'}
            className="px-3 py-2 text-xs text-accent hover:underline self-center"
          >
            {t(locale, 'Editable draft form', 'نموذج مسودة قابل للتحرير')} →
          </Link>
        </div>
        <p className="text-[11px] text-dim mb-2">{t(locale, 'Integration roadmap', 'خارطة التكامل')}</p>
        <ul className="space-y-1">
          {roadmap.map((r) => (
            <li key={r.phase} className="text-xs text-muted flex gap-2">
              <span className="font-mono text-dim">P{r.phase}</span>
              <span className="prose-ar">{t(locale, r.titleEn, r.titleAr)}</span>
              <span
                className={
                  r.status === 'done'
                    ? 'text-emerald-400'
                    : r.status === 'next'
                      ? 'text-amber-300'
                      : 'text-slate-500'
                }
              >
                {r.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
