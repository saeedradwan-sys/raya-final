import { apiFetch } from '@/lib/api';

export type ServiceRequestType = 'payment' | 'statement' | 'documents' | 'general';
export type ServiceRequestStatus = 'open' | 'in_progress' | 'completed' | 'rejected';

export interface ServiceRequest {
  id: string;
  requestType: ServiceRequestType;
  status: ServiceRequestStatus;
  shipmentId: string | null;
  message: string;
  taxNumber: string;
  clientNameEn: string;
  clientNameAr: string;
  assignedTo: string | null;
  dueAt: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function createPortalServiceRequest(
  token: string,
  input: { requestType: ServiceRequestType; shipmentId?: string; message?: string },
): Promise<ServiceRequest> {
  const response = await apiFetch<{ request: ServiceRequest }>('/portal/requests', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
  return response.request;
}

export async function fetchPortalServiceRequests(token: string): Promise<ServiceRequest[]> {
  const response = await apiFetch<{ requests: ServiceRequest[] }>('/portal/requests', { token });
  return response.requests;
}

export async function fetchStaffServiceRequests(token: string): Promise<ServiceRequest[]> {
  const response = await apiFetch<{ requests: ServiceRequest[] }>('/records/service-requests', { token });
  return response.requests;
}

export async function updateStaffServiceRequest(
  token: string,
  id: string,
  patch: {
    status?: ServiceRequestStatus;
    assignedTo?: string | null;
    dueAt?: string | null;
    acknowledged?: boolean;
  },
): Promise<ServiceRequest> {
  const response = await apiFetch<{ request: ServiceRequest }>(
    `/records/service-requests/${encodeURIComponent(id)}`,
    { method: 'PATCH', token, body: JSON.stringify(patch) },
  );
  return response.request;
}