-- ─── Client code sequence ─────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS client_code_seq START 1;

-- ─── Clients table ────────────────────────────────────────────────────────────
CREATE TABLE public.clients (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_code               TEXT        UNIQUE DEFAULT ('CLT-' || LPAD(nextval('client_code_seq')::TEXT, 4, '0')),

  -- Basic info
  client_type               TEXT        NOT NULL DEFAULT 'Company',
  company_name              TEXT        NOT NULL DEFAULT '',
  contact_person_name       TEXT        NOT NULL DEFAULT '',
  designation               TEXT        NOT NULL DEFAULT '',
  industry                  TEXT        NOT NULL DEFAULT '',
  business_type             TEXT        NOT NULL DEFAULT '',
  company_size              TEXT        NOT NULL DEFAULT '',
  status                    TEXT        NOT NULL DEFAULT 'Lead',

  -- Contact
  primary_email             TEXT        NOT NULL DEFAULT '',
  secondary_email           TEXT        NOT NULL DEFAULT '',
  mobile                    TEXT        NOT NULL DEFAULT '',
  alternate_mobile          TEXT        NOT NULL DEFAULT '',
  phone                     TEXT        NOT NULL DEFAULT '',
  whatsapp                  TEXT        NOT NULL DEFAULT '',
  website                   TEXT        NOT NULL DEFAULT '',

  -- Addresses (stored as JSON objects)
  billing_address           JSONB       NOT NULL DEFAULT '{"line1":"","line2":"","city":"","state":"","country":"India","pincode":""}',
  same_shipping             BOOLEAN     NOT NULL DEFAULT false,
  shipping_address          JSONB       NOT NULL DEFAULT '{"line1":"","line2":"","city":"","state":"","country":"India","pincode":""}',

  -- GST & Tax
  gst_registered            BOOLEAN     NOT NULL DEFAULT false,
  gst_number                TEXT        NOT NULL DEFAULT '',
  pan_number                TEXT        NOT NULL DEFAULT '',
  tan_number                TEXT        NOT NULL DEFAULT '',
  msme_number               TEXT        NOT NULL DEFAULT '',

  -- Business info
  registration_number       TEXT        NOT NULL DEFAULT '',
  cin_number                TEXT        NOT NULL DEFAULT '',
  year_established          TEXT        NOT NULL DEFAULT '',
  number_of_employees       TEXT        NOT NULL DEFAULT '',
  annual_revenue            TEXT        NOT NULL DEFAULT '',

  -- Social media
  facebook                  TEXT        NOT NULL DEFAULT '',
  instagram                 TEXT        NOT NULL DEFAULT '',
  linkedin                  TEXT        NOT NULL DEFAULT '',
  twitter                   TEXT        NOT NULL DEFAULT '',
  youtube                   TEXT        NOT NULL DEFAULT '',
  google_business           TEXT        NOT NULL DEFAULT '',

  -- Account & financials
  account_manager           TEXT        NOT NULL DEFAULT '',
  account_manager_id        UUID,
  lead_source               TEXT        NOT NULL DEFAULT '',
  payment_terms             TEXT        NOT NULL DEFAULT '',
  credit_limit              TEXT        NOT NULL DEFAULT '',
  opening_balance           TEXT        NOT NULL DEFAULT '',
  outstanding_balance       TEXT        NOT NULL DEFAULT '',

  -- Bank details
  bank_details              JSONB       NOT NULL DEFAULT '{"bankName":"","accountHolder":"","accountNumber":"","ifscCode":"","branchName":"","upiId":""}',

  -- Contact persons & documents (JSON arrays)
  contacts                  JSONB       NOT NULL DEFAULT '[]',
  documents                 JSONB       NOT NULL DEFAULT '[]',

  -- Notes
  internal_notes            TEXT        NOT NULL DEFAULT '',
  special_instructions      TEXT        NOT NULL DEFAULT '',
  meeting_notes             TEXT        NOT NULL DEFAULT '',

  -- Tags & services
  tags                      TEXT[]      NOT NULL DEFAULT '{}',
  development_services      TEXT[]      NOT NULL DEFAULT '{}',
  digital_marketing_services TEXT[]     NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Auto-update updated_at ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER clients_set_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Service role key (used by server API routes) bypasses RLS automatically.
-- Add policies below if you also need anon/authenticated access from the client.
CREATE POLICY "authenticated_all" ON public.clients
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
