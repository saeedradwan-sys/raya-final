/** Demo data mirrored from the frontend for API authorization checks */

export const STAFF_TOKENS = {
  'STAFF-DEMO-RAYA': {
    role: 'staff',
    nameEn: 'Ops broker (demo)',
    nameAr: 'مخلص عمليات (تجريبي)',
    permissions: [
      'shipments:read',
      'shipments:write',
      'clearing:read',
      'clearing:export',
      'audit:read',
    ],
  },
  'AGENT-DEMO-RAYA': {
    role: 'agent',
    nameEn: 'Field agent (demo)',
    nameAr: 'مندوب ميداني (تجريبي)',
    permissions: ['shipments:read', 'shipments:write'],
  },
  'ACCT-DEMO-RAYA': {
    role: 'accounting',
    nameEn: 'Accounting (demo)',
    nameAr: 'محاسبة (تجريبي)',
    permissions: [
      'shipments:read',
      'clearing:read',
      'clearing:export',
      'journals:post',
      'audit:read',
    ],
  },
};

export const PORTAL_CREDENTIALS = [
  { taxNumber: '100123456', accessCode: 'RAYA-DEMO-01', customerNameEn: 'Safari Est.', customerNameAr: 'مؤسسة سفاري' },
  { taxNumber: '100123456', accessCode: 'RAYA-DEMO-02', customerNameEn: 'Safari Est.', customerNameAr: 'مؤسسة سفاري' },
  { taxNumber: '100123456', accessCode: 'RAYA-DEMO-05', customerNameEn: 'Safari Est.', customerNameAr: 'مؤسسة سفاري' },
  { taxNumber: '200987654', accessCode: 'RAYA-DEMO-03', customerNameEn: 'Al-Nour Trading', customerNameAr: 'شركة النور' },
  { taxNumber: '200987654', accessCode: 'RAYA-DEMO-04', customerNameEn: 'Al-Nour Trading', customerNameAr: 'شركة النور' },
];

/** Shipment ids by tax — authorization scope */
export const SHIPMENTS_BY_TAX = {
  '100123456': ['shp-39568', 'shp-40102', 'shp-39110'],
  '200987654': ['shp-38801', 'shp-40220'],
};
