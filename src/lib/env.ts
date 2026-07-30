import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Typed, validated environment (docs/environment.md). Importing this module
 * validates eagerly and throws on missing/malformed vars — so it is imported
 * only where the vars are actually needed (the Supabase client), not in
 * main.tsx: the app runs fully local-first until M2 wires the DB in.
 */
export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_SUPABASE_URL: z.string().url(),
    VITE_SUPABASE_PUBLISHABLE_KEY: z.string().startsWith("sb_publishable_"),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});
