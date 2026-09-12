import { apiFetch } from '@/lib/api';

export interface PortalNotification {
  id: string;
  organizationId: string | null;
  taxNumber: string;
  shipmentId: string | null;
  kind: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPreferences {
  inAppEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  phone: string;
  whatsapp: string;
  smsOptIn: boolean;
  whatsappOptIn: boolean;
}

export async function fetchPortalNotifications(token: string): Promise<{ notifications: PortalNotification[]; preferences: NotificationPreferences }> {
  return apiFetch('/portal/notifications', { token });
}

export async function savePortalNotificationPreferences(token: string, preferences: Partial<NotificationPreferences>) {
  const response = await apiFetch<{ preferences: NotificationPreferences }>('/portal/notifications/preferences', {
    method: 'PATCH',
    token,
    body: JSON.stringify(preferences),
  });
  return response.preferences;
}

export async function markPortalNotificationsRead(token: string, ids: string[]) {
  return apiFetch<{ updated: number }>('/portal/notifications/read', {
    method: 'POST',
    token,
    body: JSON.stringify({ ids }),
  });
}
