-- API routes use the Supabase secret/service key. Service role bypasses RLS,
-- but still requires PostgreSQL privileges when they were not granted by the
-- table-creation environment.
GRANT USAGE ON SCHEMA public TO service_role, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.clients TO service_role, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.client_code_seq TO service_role, authenticated;

-- Browser clients must be authenticated; do not grant access to `anon`.
DROP POLICY IF EXISTS "authenticated_all" ON public.clients;
CREATE POLICY "authenticated_all"
  ON public.clients
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
