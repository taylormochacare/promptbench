import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Singleton Supabase client. RLS is the security boundary; the publishable
 * key is client-safe by design (docs/supabase.md). Nothing consumes this
 * until M2 swaps the stores' persistence from localStorage to Supabase
 * behind the same op-store seam (design-direction §7.4).
 */
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  client ??= createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
  return client;
}
