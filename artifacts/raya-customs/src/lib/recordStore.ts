/**
 * User-added previous records.
 * Local development: localStorage. Private production: PostgreSQL through the authenticated API.
 */
import type { DisbursementCase, PortalShipment, SelectivityLane, ShipmentStatus } from '@/lib/types';
import { PORTAL_SHIPMENTS } from '@/data/portalShipments';
import { DEMO_DISBURSEMENTS } from '@/content/accounting';
import { apiFetch, apiHealth } from '@/lib/api';

const SHIP_KEY = 'raya-user-shipments';
const DISB_KEY = 'raya-user-disbursements';

function readJson<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJson<T>(key: string, rows: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(rows));
  } catch {
    /* */
  }
}

function staffToken(): string | null {
  try {
    const raw = sessionStorage.getItem('raya-staff-session');
    if (!raw) return null;
    const s = JSON.parse(raw) as { accessToken?: string; serverValidated?: boolean };
    if (s.serverValidated && s.accessToken) return s.accessToken;
  } catch {
    /* */
  }
  return null;
}

export function listUserShipments(): PortalShipment[] {
  return readJson<PortalShipment>(SHIP_KEY);
}

export function listUserDisbursements(): DisbursementCase[] {
  return readJson<DisbursementCase>(DISB_KEY);
}

export function allShipments(): PortalShipment[] {
  const user = listUserShipments();
  const ids = new Set(user.map((s) => s.id));
  return import.meta.env.DEV
    ? [...user, ...PORTAL_SHIPMENTS.filter((s) => !ids.has(s.id))]
    : user;
}

export function allDisbursements(): DisbursementCase[] {
  const user = listUserDisbursements();
  const ids = new Set(user.map((d) => d.id));
  return import.meta.env.DEV
    ? [...user, ...DEMO_DISBURSEMENTS.filter((d) => !ids.has(d.id))]
    : user;
}

export function addShipmentRecord(
  input: Omit<PortalShipment, 'id' | 'documents' | 'updatedAt'> & {
    id?: string;
    documents?: PortalShipment['documents'];
  },
): PortalShipment {
  const id =
    input.id ||
    `shp-user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const row: PortalShipment = {
    ...input,
    id,
    documents: input.documents ?? [
      {
        id: `${id}-inv`,
        nameEn: 'Commercial invoice',
        nameAr: 'الفاتورة التجارية',
        type: 'invoice',
        available: true,
      },
      {
        id: `${id}-bl`,
        nameEn: 'Bill of lading',
        nameAr: 'بوليصة الشحن',
        type: 'bl',
        available: true,
      },
    ],
    updatedAt: new Date().toISOString(),
  };
  const rows = listUserShipments().filter((s) => s.id !== id);
  rows.unshift(row);
  writeJson(SHIP_KEY, rows);
  void syncShipmentToServer(row);
  return row;
}

export function addDisbursementRecord(
  input: Omit<DisbursementCase, 'id' | 'currency'> & { id?: string },
): DisbursementCase {
  const id =
    input.id ||
    `disb-user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const row: DisbursementCase = {
    ...input,
    id,
    currency: 'JOD',
  };
  const rows = listUserDisbursements().filter((d) => d.id !== id);
  rows.unshift(row);
  writeJson(DISB_KEY, rows);
  void syncDisbursementToServer(row);
  return row;
}

export function updateUserShipment(id: string, patch: Partial<PortalShipment>): PortalShipment | null {
  const rows = listUserShipments();
  const idx = rows.findIndex((s) => s.id === id);
  let row: PortalShipment;
  if (idx >= 0) {
    row = { ...rows[idx], ...patch, id, updatedAt: new Date().toISOString() };
    rows[idx] = row;
    writeJson(SHIP_KEY, rows);
  } else {
    // Allow patching a seed shipment by copying into user store
    const seed = PORTAL_SHIPMENTS.find((s) => s.id === id);
    if (!seed) return null;
    row = { ...seed, ...patch, id, updatedAt: new Date().toISOString() };
    rows.unshift(row);
    writeJson(SHIP_KEY, rows);
  }
  void syncShipmentToServer(row);
  return row;
}

/** Apply HS agent approval onto a case (user or seed → user overlay). */
export function applyHsApproval(
  shipmentId: string,
  hsCode: string,
  descriptionEn: string,
  descriptionAr: string,
  confidence?: number,
): PortalShipment | null {
  return updateUserShipment(shipmentId, {
    hsCodeSuggested: hsCode,
    hsConfidence: confidence,
    goodsEn: descriptionEn || undefined,
    goodsAr: descriptionAr || undefined,
    agentNoteEn: `HS ${hsCode} approved via assist agent`,
    agentNoteAr: `تمت الموافقة على HS ${hsCode} عبر وكيل المساعدة`,
  } as Partial<PortalShipment>);
}

export function applyCarrierTrackNote(
  shipmentId: string,
  noteEn: string,
  noteAr: string,
  _carrier?: string,
): PortalShipment | null {
  return updateUserShipment(shipmentId, {
    agentNoteEn: noteEn,
    agentNoteAr: noteAr,
  } as Partial<PortalShipment>);
}

/** Import a parsed historical ASYCUDA declaration as a Raya shipment record */
export function importHistoricalDeclaration(decl: import('@/lib/agents/historicalImportAgent').HistoricalDeclaration): PortalShipment | null {
  const id = decl.id || `hist-${Date.now().toString(36)}`;
  const patch: Partial<PortalShipment> = {
    taxNumber: decl.importerTax || 'historical-import',
    customerNameEn: decl.importerName || 'Historical Import',
    customerNameAr: decl.importerName || 'استيراد تاريخي',
    declarationNo: decl.declarationNo,
    blNo: decl.blNo || '',
    containerNo: decl.containerNo,
    goodsEn: decl.items[0]?.description || 'Historical goods',
    goodsAr: decl.items[0]?.description || 'بضاعة تاريخية',
    hsCodeSuggested: decl.items[0]?.hsCode,
    originEn: decl.items[0]?.origin,
    dischargeDate: decl.date,
    status: 'closed' as any,
    agentNoteEn: `Imported from historical SAD XML ${decl.declarationNo || ''} via Historical Import Agent`,
    agentNoteAr: `مستورد من بيان SAD تاريخي XML ${decl.declarationNo || ''} عبر وكيل الاستيراد التاريخي`,
    updatedAt: new Date().toISOString(),
  };
  // Force create new record
  const rows = listUserShipments();
  const existingIdx = rows.findIndex((s) => s.id === id);
  let row: PortalShipment;
  if (existingIdx >= 0) {
    row = { ...rows[existingIdx], ...patch, id, updatedAt: new Date().toISOString() };
    rows[existingIdx] = row;
  } else {
    // Create fresh historical record (no seed copy needed)
    row = {
      id,
      accessCode: 'HISTORICAL',
      taxNumber: patch.taxNumber!,
      customerNameEn: patch.customerNameEn!,
      customerNameAr: patch.customerNameAr!,
      declarationNo: patch.declarationNo,
      blNo: patch.blNo || '',
      containerNo: patch.containerNo,
      goodsEn: patch.goodsEn!,
      goodsAr: patch.goodsAr!,
      hsCodeSuggested: patch.hsCodeSuggested,
      originEn: patch.originEn,
      dischargeDate: patch.dischargeDate,
      status: patch.status || 'closed',
      statusEn: 'Closed (historical import)',
      statusAr: 'مغلق (استيراد تاريخي)',
      agentNoteEn: patch.agentNoteEn,
      agentNoteAr: patch.agentNoteAr,
      updatedAt: new Date().toISOString(),
      // other optional fields default
    } as PortalShipment;
    rows.unshift(row);
  }
  writeJson(SHIP_KEY, rows);
  void syncShipmentToServer(row);
  return row;
}


export function deleteUserShipment(id: string): void {
  writeJson(
    SHIP_KEY,
    listUserShipments().filter((s) => s.id !== id),
  );
  const token = staffToken();
  if (token) {
    void apiHealth().then((ok) => {
      if (!ok) return;
      void apiFetch(`/records/shipments/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        token,
      }).catch(() => undefined);
    });
  }
}

export function deleteUserDisbursement(id: string): void {
  writeJson(
    DISB_KEY,
    listUserDisbursements().filter((d) => d.id !== id),
  );
  const token = staffToken();
  if (token) {
    void apiHealth().then((ok) => {
      if (!ok) return;
      void apiFetch(`/records/disbursements/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        token,
      }).catch(() => undefined);
    });
  }
}

export function clearAllUserRecords(): void {
  try {
    localStorage.removeItem(SHIP_KEY);
    localStorage.removeItem(DISB_KEY);
  } catch {
    /* */
  }
}

async function syncShipmentToServer(row: PortalShipment): Promise<void> {
  const token = staffToken();
  if (!token) return;
  try {
    if (!(await apiHealth())) return;
    await apiFetch('/records/shipments', {
      method: 'POST',
      token,
      body: JSON.stringify(row),
    });
  } catch {
    /* */
  }
}

async function syncDisbursementToServer(row: DisbursementCase): Promise<void> {
  const token = staffToken();
  if (!token) return;
  try {
    if (!(await apiHealth())) return;
    await apiFetch('/records/disbursements', {
      method: 'POST',
      token,
      body: JSON.stringify(row),
    });
  } catch {
    /* */
  }
}

/** Pull server records into localStorage (merge by id, server wins). */
export async function pullRecordsFromServer(): Promise<{ ships: number; disb: number }> {
  const token = staffToken();
  if (!token) return { ships: 0, disb: 0 };
  try {
    if (!(await apiHealth())) return { ships: 0, disb: 0 };
    let ships = 0;
    let disb = 0;
    try {
      const res = await apiFetch<{ shipments: PortalShipment[] }>('/records/shipments', { token });
      if (Array.isArray(res.shipments)) {
        if (import.meta.env.PROD) {
          writeJson(SHIP_KEY, res.shipments);
        } else {
          const local = listUserShipments();
          const map = new Map(local.map((shipment) => [shipment.id, shipment]));
          for (const shipment of res.shipments) map.set(shipment.id, shipment);
          writeJson(SHIP_KEY, [...map.values()]);
        }
        ships = res.shipments.length;
      }
    } catch {
      /* no permission or empty */
    }
    try {
      const res = await apiFetch<{ disbursements: DisbursementCase[] }>('/records/disbursements', {
        token,
      });
      if (Array.isArray(res.disbursements)) {
        if (import.meta.env.PROD) {
          writeJson(DISB_KEY, res.disbursements);
        } else {
          const local = listUserDisbursements();
          const map = new Map(local.map((disbursement) => [disbursement.id, disbursement]));
          for (const disbursement of res.disbursements) map.set(disbursement.id, disbursement);
          writeJson(DISB_KEY, [...map.values()]);
        }
        disb = res.disbursements.length;
      }
    } catch {
      /* */
    }
    return { ships, disb };
  } catch {
    return { ships: 0, disb: 0 };
  }
}

export const STATUS_OPTIONS: { value: ShipmentStatus; en: string; ar: string }[] = [
  { value: 'pre_arrival', en: 'Pre-arrival', ar: 'قبل الوصول' },
  { value: 'at_terminal', en: 'At terminal', ar: 'في المحطة' },
  { value: 'declared', en: 'Declared', ar: 'مُصرَّح' },
  { value: 'doc_check', en: 'Documentary check', ar: 'فحص وثائقي' },
  { value: 'under_inspection', en: 'Under inspection', ar: 'قيد المعاينة' },
  { value: 'duties_paid', en: 'Duties paid', ar: 'رسوم مدفوعة' },
  { value: 'released', en: 'Released', ar: 'مُفرَج' },
  { value: 'delivered', en: 'Delivered', ar: 'مُسلَّم' },
  { value: 'closed', en: 'Closed', ar: 'مغلق' },
];

export const LANE_OPTIONS: { value: SelectivityLane | ''; en: string; ar: string }[] = [
  { value: '', en: 'None / not yet', ar: 'لا يوجد / لم يُحدَّد' },
  { value: 'green', en: 'Green', ar: 'أخضر' },
  { value: 'yellow', en: 'Yellow', ar: 'أصفر' },
  { value: 'red', en: 'Red', ar: 'أحمر' },
  { value: 'blue', en: 'Blue (PCA)', ar: 'أزرق (تدقيق لاحق)' },
];
