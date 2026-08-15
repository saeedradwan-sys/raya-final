-- Complete the private runtime persistence model.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS access_code_hash TEXT;

ALTER TABLE cases ADD COLUMN IF NOT EXISTS external_id TEXT;
UPDATE cases SET external_id = id::text WHERE external_id IS NULL;
ALTER TABLE cases ALTER COLUMN external_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cases_organization_external_idx ON cases (organization_id, external_id);

CREATE TABLE IF NOT EXISTS disbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  declaration_number TEXT,
  status TEXT,
  currency TEXT NOT NULL DEFAULT 'JOD',
  source_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, external_id)
);
CREATE INDEX IF NOT EXISTS disbursements_organization_updated_idx ON disbursements (organization_id, updated_at DESC);

ALTER TABLE disbursements ENABLE ROW LEVEL SECURITY;
