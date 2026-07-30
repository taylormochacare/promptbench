# promptbench (Claude Code)

Tauri 2 + React 19 + Vite macOS desktop app (**pnpm**). This file is the primary agent entrypoint; Cursor/Codex read [@AGENTS.md](./AGENTS.md).

@docs/design-direction.md
@docs/review-conventions.md
@docs/review-bots-setup.md

## Skills (canonical under `.claude/skills/`)

| Invoke | Skill | When |
|--------|--------|------|
| `/check-pr` | `.claude/skills/check-pr` | Triage Greptile/human PR comments + checks |
| `/greploop` | `.claude/skills/greploop` | Iterate until Greptile 5/5 + zero unresolved |
| `/promptbench-review` | `.claude/skills/promptbench-review` | Project-shaped review loop (preferred entry) |

Cursor and Codex discover the same skills via symlinks (`.cursor/skills/`, `.agents/skills/`). Do not duplicate skill bodies.

## Review loop

1. Open/update a PR → wait for `Greptile Review`.
2. `/promptbench-review` (or `/check-pr` then `/greploop`).
3. Project standards: [`.greptile/`](./.greptile/) (+ nested `src-tauri/`, `supabase/`).

## MCP

Project Greptile MCP: [`.mcp.json`](./.mcp.json) (`servers` shape for Claude Code). Requires `GREPTILE_API_KEY` in the environment — never commit the key. Secondary: `.cursor/mcp.json`, `.codex/config.toml`.

## Hard constraints

- Never `setTitle` (resets traffic lights).
- Drag via `data-tauri-drag-region` only.
- CSS blur only on palette/menus; sheet uses alpha over native material.
- Supabase RLS: `user_id` equality; session UI state stays local.
- Not a Next.js app.
