# promptbench — agent guide

Tauri 2 + React 19 + Vite macOS desktop app (pnpm). Design authority: `docs/design-direction.md`. Review conventions: `docs/review-conventions.md`.

## Review loop (Greptile)

1. Open / update a PR — wait for the `Greptile Review` check.
2. Address feedback with `/check-pr`, then `/greploop` if chasing 5/5 with zero unresolved comments.
3. Project standards live in `.greptile/` (cascading rules + `files.json` context).

## Skills

| Skill | Where |
|-------|--------|
| `/check-pr` | `.cursor/skills/check-pr`, `.claude/skills/check-pr` |
| `/greploop` | `.cursor/skills/greploop`, `.claude/skills/greploop` |

## MCP

Greptile HTTP MCP: `.cursor/mcp.json`, `.mcp.json`, `.codex/config.toml`. Requires `GREPTILE_API_KEY` in the environment (see `.env.example`). Never commit the key.

## Hard constraints (do not violate)

- Never `setTitle` (resets traffic lights).
- Drag via `data-tauri-drag-region` only.
- CSS blur only on palette/menus; sheet uses alpha over native material.
- Supabase RLS: `user_id` equality; session UI state stays local.
- Not a Next.js app.
