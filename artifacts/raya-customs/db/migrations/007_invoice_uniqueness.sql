-- One active (non-void) invoice per organization + disbursement case,
-- enforced at the database level so concurrent issue requests cannot
-- create duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS invoices_one_active_per_case
  ON invoices (organization_id, disbursement_external_id)
  WHERE status <> 'void';
