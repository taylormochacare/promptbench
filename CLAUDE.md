# promptbench (Claude Code)

Tauri 2 + React 19 + Vite macOS desktop app (**pnpm**). This file is the primary agent entrypoint; Cursor/Codex read [@AGENTS.md](./AGENTS.md).

@docs/design-direction.md
@docs/review-conventions.md
@docs/review-bots-setup.md

Product scope, milestone ladder, decision ledger: **[docs/prd.md](./docs/prd.md)** — read before proposing or planning work. Linked rather than `@`-imported on purpose: it grows every cycle and shouldn't tax every session's context.

## What this is

A single-user desktop workbench where the spec, the architecture diagram, the prompts that implement it, and the run results live in **one tree of typed pages** — doc · canvas · mermaid · prompt. The pillars are page *types*, not separate apps. The prompt workbench is the daily driver; the other three are co-equal, not supporting surfaces. Single-player: no workspaces, no sharing, no offline story funded.

**Current milestone: M1 — shell + stores.** Ladder and exit criteria in the PRD §5.

## How to work here

Taylor hand-writes the TypeScript and owns every architecture decision — this repo is deliberate hands-on learning, not delivery. Default to **advising, not implementing**: frame options with trade-offs, research, review. Implement only when asked.

The bar is boutique — Linear/Things/Raycast tier. Judge proposals on feel, not just function; prefer removing a surface to styling it. When a cheap path and a tasteful path diverge, name the trade-off instead of silently taking the cheap one.

## Commands

```bash
pnpm tauri dev      # the app (starts vite on :1420)
pnpm build          # tsc + vite build
```

No test runner and no CI workflows yet — verification is the review bots plus the ad-hoc scripts in `scripts/`. Don't claim a change is verified on a typecheck alone.

## Skills (canonical under `.claude/skills/`)

| Invoke | Skill | When |
|--------|--------|------|
| `/check-pr` | `.claude/skills/check-pr` | Triage Greptile/human PR comments + checks |
| `/greploop` | `.claude/skills/greploop` | Iterate until Greptile 5/5 + zero unresolved |
| `/promptbench-review` | `.claude/skills/promptbench-review` | Project-shaped review loop (preferred entry) |

Cursor and Codex discover the same skills via symlinks (`.cursor/skills/`, `.agents/skills/`). Do not duplicate skill bodies.

## Review loop

1. Open/update a PR → wait for `Greptile Review` (CodeRabbit also runs).
2. `/promptbench-review` (or `/check-pr` then `/greploop`).
3. Drive Greptile to **4–5/5 with zero unresolved actionable comments** — a sub-4 score is unfinished work, not a judgment call. Stacked PRs: loop the base first, then rebase the child.
4. Project standards: [`.greptile/`](./.greptile/) (+ nested `src-tauri/`, `supabase/`).

## MCP

Project Greptile MCP: [`.mcp.json`](./.mcp.json) (`servers` shape for Claude Code). Requires `GREPTILE_API_KEY` in the environment — never commit the key. Secondary: `.cursor/mcp.json`, `.codex/config.toml`.

## Hard constraints

- Never `setTitle` (resets traffic lights).
- Drag via `data-tauri-drag-region` only; `-webkit-app-region` is dead in WKWebView.
- CSS blur only on palette/menus; the sheet uses alpha over native material. Idle window = zero CSS blurs.
- Supabase RLS: `user_id` equality, grants to `authenticated` only. Session UI state and machine-local paths stay local — never synced.
- Every content blob carries `schema_version`; load is always `migrate(raw)`, never a raw read.
- Editor mutations flow through the per-pillar store as discrete operations — never direct React state mutation. This is the one condition that is expensive to retrofit.
- Not a Next.js app.

## Parallel sessions

Work runs concurrently across Claude Code and Cursor worktrees (`.claude/worktrees/`, `~/.cursor/worktrees/promptbench/`). Re-read `git log` / `git status` before assuming the tree you branched from is current, and prefer small PRs off `main` over long-lived branches.
