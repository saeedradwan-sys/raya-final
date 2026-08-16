-- Invoice lifecycle + reconciliation resolution state for the accounting workspace.

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  disbursement_external_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'void')),
  currency TEXT NOT NULL DEFAULT 'JOD',
  pass_through NUMERIC(14, 2) NOT NULL DEFAULT 0,
  agency_fee NUMERIC(14, 2) NOT NULL DEFAULT 0,
  gst_rate NUMERIC(6, 4) NOT NULL DEFAULT 0.16,
  gst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  issued_at DATE,
  due_at DATE,
  source_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, invoice_number)
);
CREATE INDEX IF NOT EXISTS invoices_org_status_idx
  ON invoices (organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS invoices_org_case_idx
  ON invoices (organization_id, disbursement_external_id);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS recon_resolutions (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  disbursement_external_id TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  PRIMARY KEY (organization_id, disbursement_external_id)
);

ALTER TABLE recon_resolutions ENABLE ROW LEVEL SECURITY;
