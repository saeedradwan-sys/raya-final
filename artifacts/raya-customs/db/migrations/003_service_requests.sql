-- Durable client-to-staff work queue for the private portal.
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  external_id TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('payment', 'statement', 'documents', 'general')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'rejected')),
  assigned_to TEXT,
  due_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  message TEXT,
  source_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, external_id)
);

CREATE INDEX IF NOT EXISTS service_requests_organization_status_idx
  ON service_requests (organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS service_requests_client_idx
  ON service_requests (client_id, created_at DESC);

ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;