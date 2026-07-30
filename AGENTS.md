# promptbench — agent guide

Shared guide for **Cursor** and **Codex**. Claude Code should prefer [CLAUDE.md](./CLAUDE.md).

Tauri 2 + React 19 + Vite macOS desktop app (pnpm). Design: `docs/design-direction.md`. Review: `docs/review-conventions.md`. Setup: `docs/review-bots-setup.md`.

## Skill discovery (single source of truth)

Canonical skill bodies live in **`.claude/skills/`** (Claude Code). Other harnesses resolve the same folders via symlinks:

| Harness | Path |
|---------|------|
| Claude Code | `.claude/skills/{check-pr,greploop,promptbench-review}/` |
| Cursor | `.cursor/skills/*` → `.claude/skills/*` (also scans `.claude/skills/` / `.agents/skills/`) |
| Codex | `.agents/skills/*` → `.claude/skills/*` |

Invoke `/promptbench-review`, `/check-pr`, or `/greploop` after Greptile posts on a PR.

## Complementary Cursor skills (not vendored here)

Use when relevant; they are Cursor built-ins / user skills:

- **babysit** — keep a PR merge-ready (comments + CI loop); pairs with `/check-pr`
- **create-skill** / **migrate-to-skills** — extend or migrate skills; keep bodies only under `.claude/skills/`
- **create-rule** — persistent rules / AGENTS.md; prefer skills for on-demand workflows
- **review-bugbot** — only if Bugbot is enabled (this repo’s review bot is Greptile)

## MCP

| Harness | Config |
|---------|--------|
| Claude Code | `.mcp.json` (`servers` + `transport`) |
| Cursor | `.cursor/mcp.json` (`mcpServers` + `type`) |
| Codex | `.codex/config.toml` (`bearer_token_env_var`) |

All use `GREPTILE_API_KEY` from the environment (see `.env.example`). Never commit the key.

## Hard constraints (do not violate)

- Never `setTitle` (resets traffic lights).
- Drag via `data-tauri-drag-region` only.
- CSS blur only on palette/menus; sheet uses alpha over native material.
- Supabase RLS: `user_id` equality; session UI state stays local.
- Not a Next.js app.
