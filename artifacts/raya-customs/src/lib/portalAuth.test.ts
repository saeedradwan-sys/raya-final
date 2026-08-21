import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  apiHealth: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number;

    constructor(status: number) {
      super(`API error ${status}`);
      this.status = status;
    }
  },
  apiFetch: apiMocks.apiFetch,
  apiHealth: apiMocks.apiHealth,
  refreshAccessToken: vi.fn(),
  serverLogout: vi.fn(),
  validateAccessToken: vi.fn(),
}));

vi.mock('@/lib/auditLog', () => ({
  appendAudit: vi.fn(),
}));

vi.mock('@/lib/recordStore', () => ({
  allShipments: vi.fn(() => []),
}));

import { portalLogin } from './portalAuth';

describe('portalLogin', () => {
  beforeEach(() => {
    apiMocks.apiFetch.mockReset();
    apiMocks.apiHealth.mockReset();
    apiMocks.apiHealth.mockResolvedValue(true);
    apiMocks.apiFetch.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 900,
      taxNumber: '123456',
      customerNameEn: 'Test Client',
      customerNameAr: 'عميل اختبار',
      shipmentIds: [],
    });
  });

  it('preserves the case of a database-backed access code', async () => {
    const result = await portalLogin(' 123 456 ', ' Mixed-Case-Code-2026! ');

    expect(result.ok).toBe(true);
    expect(apiMocks.apiFetch).toHaveBeenCalledWith(
      '/auth/portal/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          taxNumber: '123456',
          accessCode: 'Mixed-Case-Code-2026!',
        }),
      }),
    );
  });
});