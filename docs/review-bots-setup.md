# Greptile setup

Repo config lives in [`.greptile/`](../.greptile/) (cascading `config.json` / `rules.md` / `files.json`). Nested stricter rules under `src-tauri/.greptile/` and `supabase/.greptile/`.

## Checklist

1. Confirm Greptile GitHub App is installed (already posting `Greptile Review` on PRs).
2. Keep org dashboard rules light — **repo `.greptile/` wins**.
3. Local MCP: export `GREPTILE_API_KEY`, restart Cursor/Claude/Codex so `.cursor/mcp.json` / `.mcp.json` / `.codex/config.toml` connect.
4. Optional: [apply for OSS](https://www.greptile.com/open-source) (public MIT/Apache projects).
5. Agent loop: PR → Greptile check → `/check-pr` → `/greploop`.
