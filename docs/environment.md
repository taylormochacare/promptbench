# Environment variables

All env vars flow through **T3 Env** ([src/lib/env.ts](../src/lib/env.ts),
`@t3-oss/env-core` + zod). Nothing reads `import.meta.env` directly — the
`env` object is the only door, and it validates at import time: a missing or
malformed var is a thrown error with the variable's name, not `undefined`
propagating into a fetch call three layers later.

## The rules

1. **Add a var by adding a schema line** in `env.ts` — type, prefix, and
   validation in one place. Client-exposed vars must use the `VITE_` prefix
   (enforced by `clientPrefix`); anything without it never reaches the
   bundle.
2. **Real values live in `.env.local`** — gitignored (`.env.*` with an
   `!.env.example` exception). `.env.example` documents every var with a
   placeholder; keep it current in the same PR that adds a var.
3. **Validation is eager, import is deliberate.** `env.ts` throws on import,
   so it is imported only where its vars are consumed (today: the Supabase
   client). The app runs fully local-first without any env file until M2 —
   don't import `env` from `main.tsx` until the DB path is load-bearing.
4. **Empty string = undefined** (`emptyStringAsUndefined`), so a blank line
   in an env file fails validation instead of passing an empty URL around.

## Current variables

| Var | Used by | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | [src/lib/supabase.ts](../src/lib/supabase.ts) | Project API URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | [src/lib/supabase.ts](../src/lib/supabase.ts) | `sb_publishable_…`; client-safe by design, RLS is the boundary ([docs/supabase.md](supabase.md)) |

Shell-level keys for review tooling (`GREPTILE_API_KEY`, `CURSOR_API_KEY`)
are exported in the shell, not read by the app, and stay out of `env.ts`.

## What never goes in env files

- **Model-provider API keys** (Anthropic, OpenAI, …) — macOS Keychain via
  the Rust `secret_set/get` commands; injected Rust-side per the run-layer
  design so they never enter JS.
- **Supabase `sb_secret_…` / `service_role` / database password** — server
  contexts only; promptbench has none.
