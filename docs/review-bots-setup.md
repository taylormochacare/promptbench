# Greptile setup (Claude Code → Cursor → Codex)

Repo config: [`.greptile/`](../.greptile/) (cascading `config.json` / `rules.md` / `files.json`). Nested stricter rules under `src-tauri/.greptile/` and `supabase/.greptile/`.

Skills are **Claude Code–canonical** under `.claude/skills/`. Cursor/Codex use symlinks — do not copy skill markdown into `.cursor/` or `.agents/`.

## Checklist

1. Confirm Greptile GitHub App is installed (`Greptile Review` on PRs).
2. Keep org dashboard rules light — **repo `.greptile/` wins**.
3. Export `GREPTILE_API_KEY` (see `.env.example`).
4. **Claude Code (primary):** open the repo so `.mcp.json` loads; optional `claude mcp list` should show greptile connected. Skills auto-load from `.claude/skills/`.
5. **Cursor:** restart after pull so `.cursor/mcp.json` + skill symlinks resolve. Prefer `/promptbench-review` or `/check-pr`.
6. **Codex:** restart so `.codex/config.toml` + `.agents/skills/` symlinks resolve.
7. Optional: [apply for OSS](https://www.greptile.com/open-source) (public MIT/Apache).
8. Agent loop: PR → Greptile check → `/promptbench-review` (or `/check-pr` → `/greploop`).

## Layout

```text
.claude/skills/          # canonical SKILL.md bodies
.cursor/skills/ → …      # symlinks for Cursor
.agents/skills/ → …      # symlinks for Codex
.mcp.json                # Claude Code MCP
.cursor/mcp.json         # Cursor MCP
.codex/config.toml       # Codex MCP
CLAUDE.md                # Claude Code entry
AGENTS.md                # Cursor / Codex entry
```
