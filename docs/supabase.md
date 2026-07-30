# Supabase setup

Project: **promptbench** · ref `iikfsmnjrghwhhwtrnnp` · org **promptbase**
(free plan) · AWS ca-central-1 · `https://iikfsmnjrghwhhwtrnnp.supabase.co`.
Created 2026-07-30 with the security posture below. Both migrations are
applied and the Security Advisor reports **0 errors / 0 warnings / 0 info**
as of creation day.

> ⚠️ **MCP scope warning:** the user-level Supabase MCP server in
> `~/.claude.json` is scoped to a *different* project ref
> (`psmblyrkxsrzpycyvexc`). Do not run schema changes through it. Either
> re-scope it to `iikfsmnjrghwhhwtrnnp` or keep applying migrations via the
> dashboard SQL editor / linked CLI. Companion decisions:
[design-direction.md](design-direction.md) §7 and the schema itself,
[supabase/migrations/20260730000001_init.sql](../supabase/migrations/20260730000001_init.sql),
whose comments are the source of truth for table-level rationale.

## Security posture (set at project creation)

| Setting | State | Why |
|---|---|---|
| Data API | **on** | supabase-js is the client path |
| Automatically expose new tables | **off** | Supabase's own recommendation; every grant is explicit in migrations — a new table is invisible to the API until a migration says otherwise |
| Automatic RLS (event trigger) | **on** | defense-in-depth: any future table gets RLS enabled even if a migration forgets |

Schema-level rules the migration enforces:

- **RLS on every table**, policies in the `(select auth.uid())` initplan-cached
  form, backed by a `user_id` index per table.
- **Grants to `authenticated` only.** `anon` has no grants — promptbench has
  no anonymous surface. `service_role` is never used client-side.
- **Mutations with invariants go through RPCs**, not raw table writes:
  `commit_prompt_version()` (per-page version numbering under an advisory
  lock) and `set_best_run()` (clear-then-set best-run ordering).
  `prompt_runs.page_id` is trigger-derived and cannot diverge.

## Keys and secrets

- **Publishable (anon) key + project URL** → `.env.local` (gitignored),
  as `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`, consumed
  through the validated T3 Env layer — see [environment.md](environment.md).
  Fine to expose in the client bundle; RLS is the boundary.
- **Database password**: generated at creation, never stored anywhere by
  us. If it's ever needed (direct psql), reset it in Dashboard → Settings
  → Database. Nothing in the workflow depends on it.
- **service_role key**: never leaves the dashboard. Not in env files, not
  in the app, not in CI.
- **Model-provider API keys are unrelated to Supabase** — they live in the
  macOS Keychain via the Rust `secret_set/get` commands (run-layer design)
  and never touch the database.

## Migration workflow

Migrations live in [supabase/migrations/](../supabase/migrations/), named
`YYYYMMDDNNNNNN_name.sql`, and are the only way schema changes happen —
no dashboard-driven schema edits (the SQL editor is for applying migration
files verbatim and for reads).

Apply order for a fresh environment: run each file in filename order in the
SQL editor (or `supabase db push` once the CLI is linked). After applying,
run the **advisors** check (Dashboard → Advisors, or the `get_advisors` MCP
tool) and treat security findings as bugs.

Content-blob migrations (the `schema_version` columns) are a separate,
TypeScript-side system — see design-direction §7.1. SQL migrations version
the *relational* shape; TS migrations version what's *inside* `content`.

## Client wiring

`src/lib/supabase.ts` creates the singleton client from the env vars above.
The tree/session stores keep their operation surface unchanged — Supabase
replaces localStorage behind the same op-store seam at M2, per
design-direction §7.4.

## Deliberately deferred

- Auth flow in-app (single user; magic-link at M2 — until then the client
  is constructed but unauthenticated sessions see nothing, by RLS).
- Realtime subscriptions (no multi-client story funded).
- `search_text` projection, `page_links`, `workspaces`, `release_labels`
  (see the migration's closing comment).
