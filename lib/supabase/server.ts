import { createClient } from "@supabase/supabase-js";

export function createServerClient() {
  const url = process.env.SUPABASE_URL;
  // Service role key bypasses RLS — safe for server-only API routes
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url) throw new Error("Missing env: SUPABASE_URL");
  if (!key) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY");

  return createClient(url, key, { auth: { persistSession: false } });
}
