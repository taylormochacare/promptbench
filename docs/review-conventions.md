# promptbench — Review Conventions

Short context for Greptile and humans. Authoritative design: [design-direction.md](./design-direction.md).

## Stack

| Layer | Choice |
|-------|--------|
| Package manager | **pnpm** |
| Frontend | React 19, TypeScript, Vite 8 |
| UI | Tailwind 4, shadcn (base-luma), Base UI |
| Desktop | Tauri 2 (macOS-first, transparent overlay titlebar) |
| Backend (planned) | Supabase (`supabase/migrations/`) |
| Session UI state | Local only — never sync machine paths to Supabase |

Not a Next.js app — do not suggest App Router / RSC patterns.

## Review priorities

1. Correctness / regressions (chrome, drag, theme, data)
2. Security (capabilities/CSP, RLS, no secrets)
3. Design-direction hard rules (glass budget, no `setTitle`)
4. Perf (idle = zero CSS blurs)
5. DX (ease of use over shell grammar)

## Skip as style nits

- Early scaffolding / placeholders
- `pnpm-lock.yaml` alone
- `src-tauri/icons/**` binaries

## Greptile

Config: [`.greptile/`](../.greptile/). Trigger: `@greptile review`. Address with `/check-pr` / `/greploop`.
