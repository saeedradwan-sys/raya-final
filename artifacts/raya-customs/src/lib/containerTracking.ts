/**
 * Agency container tracking derived from shipment mirror + ACT free time.
 * Not live ACT/carrier GPS — confirm on official portals.
 */
import type { PortalShipment, SelectivityLane } from '@/lib/types';
import { daysUntil } from '@/lib/dates';
import { allShipments } from '@/lib/recordStore';

export type TrackPhaseId =
  | 'discharged'
  | 'free_time'
  | 'declared'
  | 'selectivity'
  | 'inspection'
  | 'released'
  | 'delivered'
  | 'demurrage_risk';

export interface TrackEvent {
  id: TrackPhaseId | string;
  at?: string;
  done: boolean;
  active: boolean;
  titleEn: string;
  titleAr: string;
  detailEn?: string;
  detailAr?: string;
}

export interface ContainerTrackCard {
  shipmentId: string;
  containerNo: string;
  blNo?: string;
  declarationNo?: string;
  taxNumber: string;
  customerNameEn: string;
  customerNameAr: string;
  goodsEn: string;
  goodsAr: string;
  dischargeDate?: string;
  lastFreeDay?: string;
  freeDaysLeft: number | null;
  selectivityLane?: SelectivityLane;
  status: PortalShipment['status'];
  statusEn: string;
  statusAr: string;
  phase: TrackPhaseId;
  events: TrackEvent[];
  risk: 'ok' | 'watch' | 'urgent';
  agentNoteEn?: string;
  agentNoteAr?: string;
  pcaOpen?: boolean;
}

function phaseFromShipment(s: PortalShipment): TrackPhaseId {
  if (s.status === 'delivered') return 'delivered';
  if (s.status === 'released' || s.status === 'duties_paid') return 'released';
  if (s.selectivityLane === 'red' && s.status === 'under_inspection') return 'inspection';
  if (s.selectivityLane === 'yellow' && (s.status === 'doc_check' || s.status === 'under_inspection'))
    return 'selectivity';
  if (s.declarationNo) return 'selectivity';
  if (s.dischargeDate) return 'discharged';
  return 'discharged';
}

function buildEvents(s: PortalShipment, freeDaysLeft: number | null): TrackEvent[] {
  const discharged = Boolean(s.dischargeDate);
  const declared = Boolean(s.declarationNo);
  const inspecting = s.status === 'under_inspection' || s.inspectionOutcome === 'sample_pending';
  const released =
    s.status === 'released' || s.status === 'duties_paid' || s.status === 'delivered';
  const delivered = s.status === 'delivered';
  const demurrageRisk =
    freeDaysLeft !== null && freeDaysLeft <= 1 && !released;

  const lane = s.selectivityLane;
  const events: TrackEvent[] = [
    {
      id: 'discharged',
      at: s.dischargeDate,
      done: discharged,
      active: discharged && !declared && !released,
      titleEn: 'Discharged at ACT',
      titleAr: 'تفريغ في ACT',
      detailEn: s.dischargeDate ? `Discharge ${s.dischargeDate}` : 'Awaiting discharge date',
      detailAr: s.dischargeDate ? `التفريغ ${s.dischargeDate}` : 'بانتظار تاريخ التفريغ',
    },
    {
      id: 'free_time',
      at: s.lastFreeDay,
      done: freeDaysLeft !== null && freeDaysLeft < 0,
      active: freeDaysLeft !== null && freeDaysLeft >= 0 && !released,
      titleEn: 'ACT free time',
      titleAr: 'المدة المجانية ACT',
      detailEn: s.lastFreeDay
        ? `Last free day ${s.lastFreeDay}${freeDaysLeft !== null ? ` (${freeDaysLeft}d left)` : ''}`
        : 'Set discharge + rule on ACT planner',
      detailAr: s.lastFreeDay
        ? `آخر يوم مجاني ${s.lastFreeDay}${freeDaysLeft !== null ? ` (متبقي ${freeDaysLeft})` : ''}`
        : 'حدد التفريغ والقاعدة في مخطط ACT',
    },
    {
      id: 'declared',
      done: declared,
      active: declared && !released && !inspecting,
      titleEn: 'Declaration in agency / ASYCUDA',
      titleAr: 'البيان لدى الوكالة / الأسيكودا',
      detailEn: s.declarationNo || 'No declaration number yet',
      detailAr: s.declarationNo || 'لا رقم بيان بعد',
    },
    {
      id: 'selectivity',
      done: Boolean(lane) && (released || inspecting || Boolean(s.declarationNo)),
      active: Boolean(lane) && !released && lane !== 'green',
      titleEn: lane ? `Selectivity: ${lane}` : 'Selectivity',
      titleAr: lane
        ? `الانتقائية: ${lane === 'green' ? 'أخضر' : lane === 'yellow' ? 'أصفر' : lane === 'red' ? 'أحمر' : 'أزرق'}`
        : 'الانتقائية',
      detailEn: lane
        ? lane === 'green'
          ? 'Documentary / release path'
          : lane === 'yellow'
            ? 'Documentary check'
            : lane === 'red'
              ? 'Physical inspection path'
              : 'Blue / PCA path'
        : 'Lane not mirrored yet',
      detailAr: lane
        ? lane === 'green'
          ? 'مسار مستندي / إفراج'
          : lane === 'yellow'
            ? 'تدقيق مستندي'
            : lane === 'red'
              ? 'معاينة فعلية'
              : 'أزرق / تدقيق لاحق'
        : 'المسرب غير مُرآة بعد',
    },
    {
      id: 'inspection',
      done: Boolean(s.inspectionOutcome) || released,
      active: inspecting && !released,
      titleEn: 'Inspection / holds',
      titleAr: 'المعاينة / الحجز',
      detailEn: s.inspectionOutcome
        ? `Outcome: ${s.inspectionOutcome}`
        : lane === 'red' || lane === 'yellow'
          ? 'May require exam or docs'
          : 'Usually not required on pure green',
      detailAr: s.inspectionOutcome
        ? `النتيجة: ${s.inspectionOutcome}`
        : lane === 'red' || lane === 'yellow'
          ? 'قد تحتاج معاينة أو وثائق'
          : 'عادة غير لازمة على الأخضر الصافي',
    },
    {
      id: 'released',
      done: released,
      active: s.status === 'released' || s.status === 'duties_paid',
      titleEn: 'Customs release / gate-out',
      titleAr: 'الإفراج الجمركي / الخروج',
      detailEn: released ? 'Released in agency mirror' : 'Pending release',
      detailAr: released ? 'مفرج في مرآة الوكالة' : 'بانتظار الإفراج',
    },
    {
      id: 'delivered',
      done: delivered,
      active: delivered,
      titleEn: 'Delivered to client',
      titleAr: 'التسليم للعميل',
      detailEn: delivered ? 'Closed' : 'After gate-out logistics',
      detailAr: delivered ? 'مغلق' : 'بعد لوجستيات الخروج',
    },
  ];

  if (demurrageRisk) {
    events.push({
      id: 'demurrage_risk',
      done: false,
      active: true,
      titleEn: 'Demurrage risk',
      titleAr: 'خطر غرامة تأخير',
      detailEn: 'Last free day reached or passed — confirm ACT live charges',
      detailAr: 'آخر يوم مجاني وصل أو مضى — أكد رسوم ACT الحية',
    });
  }
  return events;
}

export function trackCardFromShipment(s: PortalShipment): ContainerTrackCard | null {
  if (!s.containerNo) return null;
  const freeDaysLeft =
    s.lastFreeDay && s.status !== 'delivered' && s.status !== 'released'
      ? daysUntil(s.lastFreeDay)
      : s.lastFreeDay && (s.status === 'released' || s.status === 'delivered')
        ? null
        : s.lastFreeDay
          ? daysUntil(s.lastFreeDay)
          : null;

  let risk: ContainerTrackCard['risk'] = 'ok';
  if (freeDaysLeft !== null && freeDaysLeft <= 1 && s.status !== 'delivered' && s.status !== 'released')
    risk = 'urgent';
  else if (
    s.selectivityLane === 'red' ||
    s.pcaOpen ||
    (freeDaysLeft !== null && freeDaysLeft <= 3 && s.status !== 'delivered')
  )
    risk = 'watch';

  // refine free days for non-released
  const fd =
    s.lastFreeDay && s.status !== 'delivered'
      ? daysUntil(s.lastFreeDay)
      : null;

  return {
    shipmentId: s.id,
    containerNo: s.containerNo,
    blNo: s.blNo,
    declarationNo: s.declarationNo,
    taxNumber: s.taxNumber,
    customerNameEn: s.customerNameEn,
    customerNameAr: s.customerNameAr,
    goodsEn: s.goodsEn,
    goodsAr: s.goodsAr,
    dischargeDate: s.dischargeDate,
    lastFreeDay: s.lastFreeDay,
    freeDaysLeft: fd,
    selectivityLane: s.selectivityLane ?? undefined,
    status: s.status,
    statusEn: s.statusEn,
    statusAr: s.statusAr,
    phase: phaseFromShipment(s),
    events: buildEvents(s, fd),
    risk,
    agentNoteEn: s.agentNoteEn,
    agentNoteAr: s.agentNoteAr,
    pcaOpen: s.pcaOpen,
  };
}

export function listContainerTracks(query = ''): ContainerTrackCard[] {
  const q = query.trim().toLowerCase();
  const cards = allShipments()
    .map(trackCardFromShipment)
    .filter((c): c is ContainerTrackCard => Boolean(c));
  if (!q) return cards;
  return cards.filter((c) => {
    const blob = [
      c.containerNo,
      c.blNo,
      c.declarationNo,
      c.taxNumber,
      c.customerNameEn,
      c.customerNameAr,
      c.goodsEn,
      c.shipmentId,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return blob.includes(q);
  });
}

export function findContainerTrack(containerOrRef: string): ContainerTrackCard | null {
  const q = containerOrRef.trim().toLowerCase();
  if (!q) return null;
  return (
    listContainerTracks().find(
      (c) =>
        c.containerNo.toLowerCase() === q ||
        c.blNo?.toLowerCase() === q ||
        c.declarationNo?.toLowerCase() === q ||
        c.shipmentId.toLowerCase() === q,
    ) ||
    listContainerTracks(q)[0] ||
    null
  );
}

export const ACT_TRACK_PORTAL = 'https://www.act.com.jo';
export const ACT_N4_CAP_URL = 'https://cap.act.com.jo/apex/cap.zul';

export const TRACK_DISCLAIMER_EN =
  'Agency mirror only — live terminal moves, gate events, EDO status and exact timestamps are on the ACT N4 CAP portal.';
export const TRACK_DISCLAIMER_AR =
  'مرآة الوكالة فقط — حركة المحطة الفعلية، أحداث البوابة، حالة EDO والتوقيتات الدقيقة على بوابة ACT N4 CAP.';
