---
name: promptbench-review
description: >
  Runs the promptbench Greptile PR review loop: wait for Greptile, triage with
  check-pr, then greploop toward 5/5 with zero unresolved comments while
  respecting Tauri/glass/RLS hard constraints. Use when the user asks to
  address Greptile feedback, clean a PR for merge, run the review loop, or
  mentions check-pr / greploop / Greptile on this repo.
license: MIT
compatibility: Requires git and gh (GitHub CLI) authenticated. Greptile installed on the repo. GREPTILE_API_KEY optional for MCP tools.
metadata:
  author: promptbench
  version: "1.0"
allowed-tools: Bash(gh:*) Bash(git:*) Read
---

# promptbench review

Project wrapper around Greptile’s `/check-pr` and `/greploop` for this repo.

## Before anything

Read (if not already in context):

- `docs/review-conventions.md`
- `docs/design-direction.md` (hard constraints)
- `.greptile/rules.md`

Hard constraints — never violate:

- Never `setTitle`
- Drag only via `data-tauri-drag-region`
- CSS blur only on palette/menus
- Supabase RLS = `user_id` equality; session UI state stays local
- Not Next.js

## Workflow

1. Identify the PR for the current branch (`gh pr view --json number,url,statusCheckRollup`).
2. Wait for `Greptile Review` (and other required checks) to finish if still pending.
3. Load and follow `.claude/skills/check-pr/SKILL.md` for this PR — fix actionable items, resolve threads when done.
4. If the user wants a clean Greptile score (or Greptile still has unresolved comments / low confidence), load and follow `.claude/skills/greploop/SKILL.md` (max iterations as that skill defines).
5. In Cursor only: after Greptile is clean, optionally run the **babysit** skill for remaining human comments / CI.

## Output

Summarize: PR URL, Greptile confidence / unresolved count, what you fixed, what you skipped (and why).
