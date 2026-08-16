-- One journal snapshot per organization + disbursement + stage.
-- Reposting supersedes the previous snapshot instead of double-booking.

DELETE FROM journal_entries je
USING journal_entries newer
WHERE je.organization_id = newer.organization_id
  AND je.disbursement_external_id = newer.disbursement_external_id
  AND je.stage = newer.stage
  AND (newer.created_at > je.created_at
       OR (newer.created_at = je.created_at AND newer.id > je.id));

CREATE UNIQUE INDEX IF NOT EXISTS journal_entries_org_case_stage_key
  ON journal_entries (organization_id, disbursement_external_id, stage);
