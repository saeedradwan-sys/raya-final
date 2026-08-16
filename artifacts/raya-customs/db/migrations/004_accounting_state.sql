-- Server-side accounting persistence: journal entry snapshots and
-- organization-level reconciliation state (GL adjustments).

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  disbursement_external_id TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'full' CHECK (stage IN ('payout', 'settle', 'full')),
  mode TEXT NOT NULL CHECK (mode IN ('pay_first', 'client_prepay')),
  pass_through NUMERIC(14, 2) NOT NULL DEFAULT 0,
  revenue NUMERIC(14, 2) NOT NULL DEFAULT 0,
  prepay NUMERIC(14, 2) NOT NULL DEFAULT 0,
  true_up NUMERIC(14, 2) NOT NULL DEFAULT 0,
  balanced BOOLEAN NOT NULL DEFAULT true,
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  posted_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS journal_entries_org_case_idx
  ON journal_entries (organization_id, disbursement_external_id, created_at DESC);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS accounting_recon_state (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  gl_adjust_122100 NUMERIC(14, 2) NOT NULL DEFAULT 0,
  gl_adjust_222100 NUMERIC(14, 2) NOT NULL DEFAULT 0,
  note TEXT,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE accounting_recon_state ENABLE ROW LEVEL SECURITY;
