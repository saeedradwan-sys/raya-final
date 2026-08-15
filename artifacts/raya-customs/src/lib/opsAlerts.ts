import type { PortalShipment } from '@/lib/types';
import { allShipments } from '@/lib/recordStore';

export interface OpsAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  titleEn: string;
  titleAr: string;
  detailEn: string;
  detailAr: string;
  href?: string;
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function buildOpsAlerts(shipments: PortalShipment[] = allShipments()): OpsAlert[] {
  const alerts: OpsAlert[] = [];
  for (const s of shipments) {
    const free = daysUntil(s.lastFreeDay);
    const label = s.declarationNo || s.blNo;
    if (free !== null && free < 0 && s.status !== 'delivered' && s.status !== 'closed') {
      alerts.push({
        id: `free-over-${s.id}`,
        severity: 'critical',
        titleEn: `Free time exceeded · ${label}`,
        titleAr: `انتهت الأيام المجانية · ${label}`,
        detailEn: `Last free day ${s.lastFreeDay}. Storage risk.`,
        detailAr: `آخر يوم مجاني ${s.lastFreeDay}. مخاطر تخزين.`,
        href: '/act',
      });
    } else if (free !== null && free <= 2 && free >= 0 && s.status !== 'delivered' && s.status !== 'closed') {
      alerts.push({
        id: `free-soon-${s.id}`,
        severity: 'warning',
        titleEn: `Free time ${free}d · ${label}`,
        titleAr: `مجاني خلال ${free}ي · ${label}`,
        detailEn: `Last free day ${s.lastFreeDay}`,
        detailAr: `آخر يوم مجاني ${s.lastFreeDay}`,
        href: '/act',
      });
    }
    if (s.selectivityLane === 'red' || s.status === 'under_inspection') {
      alerts.push({
        id: `red-${s.id}`,
        severity: 'warning',
        titleEn: `Red / inspection · ${label}`,
        titleAr: `أحمر / معاينة · ${label}`,
        detailEn: s.inspectionNoteEn || 'Physical exam path',
        detailAr: s.inspectionNoteAr || 'مسار معاينة فعلية',
        href: '/asycuda',
      });
    }
    if (s.pcaOpen || s.selectivityLane === 'blue') {
      alerts.push({
        id: `pca-${s.id}`,
        severity: 'info',
        titleEn: `PCA / blue lane · ${label}`,
        titleAr: `تدقيق لاحق / أزرق · ${label}`,
        detailEn: 'Keep invoice, CoO, permits, declaration print and payment receipts audit-ready. Release ≠ closed file.',
        detailAr: 'أبقِ الفاتورة وشهادة المنشأ والتصاريح وطباعة البيان وإيصالات الدفع جاهزة. الإفراج ≠ إغلاق الملف.',
        href: '/asycuda',
      });
    }
  }
  const order = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}
