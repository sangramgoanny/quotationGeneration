-- ─── Documents table (client & lead attachments, stored in S3) ────────────────
-- Used by app/api/clients/[id]/documents and app/api/leads/[id]/documents.
-- Independent of the backend's own `clients` / `client_documents` tables,
-- which this Next.js app's service-role key has no grants on.
CREATE TABLE IF NOT EXISTS public.documents (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   TEXT        NOT NULL CHECK (entity_type IN ('CLIENT', 'LEAD')),
  entity_id     TEXT        NOT NULL,
  name          TEXT        NOT NULL,
  document_type TEXT        NOT NULL DEFAULT 'Other',
  file_type     TEXT        NOT NULL,
  file_size     BIGINT      NOT NULL,
  s3_key        TEXT        NOT NULL,
  s3_url        TEXT        NOT NULL,
  uploaded_by   TEXT,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documents_entity_idx ON public.documents (entity_type, entity_id);

-- ─── Grants ───────────────────────────────────────────────────────────────────
-- This project does not appear to grant table privileges to service_role by
-- default (the same gap exists on the pre-existing `clients` table), so grant
-- them explicitly rather than assuming service_role bypass is configured.
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.documents TO service_role;

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.documents
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
