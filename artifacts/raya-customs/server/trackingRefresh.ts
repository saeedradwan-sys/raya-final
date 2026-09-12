// @ts-nocheck
import { allShipmentsMerged } from './raya-api/recordsStore.mjs';
import { getBestTerminalTracking } from './raya-api/terminalTracking.mjs';
import { appendTrackingEvents } from './raya-api/trackingEventStore.mjs';

export interface TrackingRefreshResult {
  ok: true;
  checkedAt: string;
  organizationId: string;
  scanned: number;
  refreshed: number;
  live: number;
  insertedEvents: number;
  failed: number;
  failures: { shipmentId: string; reference: string; error: string }[];
}

/**
 * Refresh each shipment with a container number, reconcile the provider result,
 * and append only new milestones. The event store deduplicates retries, so the
 * heartbeat callback is safe to retry.
 */
export async function refreshContainerMilestones(organizationId = 'local'): Promise<TrackingRefreshResult> {
  const checkedAt = new Date().toISOString();
  const shipments = await allShipmentsMerged(organizationId);
  const targets = shipments
    .filter((shipment) => shipment.containerNo)
    .slice(0, Math.max(1, Number(process.env.RAYA_TRACKING_REFRESH_MAX || 100)));
  const failures: TrackingRefreshResult['failures'] = [];
  let refreshed = 0;
  let live = 0;
  let insertedEvents = 0;
  const batchSize = Math.max(1, Math.min(8, Number(process.env.RAYA_TRACKING_REFRESH_CONCURRENCY || 4)));

  for (let index = 0; index < targets.length; index += batchSize) {
    const batch = targets.slice(index, index + batchSize);
    const results = await Promise.allSettled(batch.map(async (shipment) => {
      const reference = String(shipment.containerNo).trim().toUpperCase();
      const result = await getBestTerminalTracking(reference);
      if (!result.ok) throw new Error(result.error || 'tracking_unavailable');
      if (result.live && result.events?.length) {
        const stored = await appendTrackingEvents(reference, result.events, result.source || 'scheduled-refresh', organizationId);
        insertedEvents += stored.inserted;
        live += 1;
      }
      refreshed += 1;
      return result;
    }));
    results.forEach((result, offset) => {
      if (result.status === 'rejected') {
        const shipment = batch[offset];
        failures.push({
          shipmentId: shipment.id,
          reference: String(shipment.containerNo).trim().toUpperCase(),
          error: String(result.reason?.message || result.reason || 'refresh_failed'),
        });
      }
    });
  }

  return {
    ok: true,
    checkedAt,
    organizationId,
    scanned: targets.length,
    refreshed,
    live,
    insertedEvents,
    failed: failures.length,
    failures: failures.slice(0, 25),
  };
}
