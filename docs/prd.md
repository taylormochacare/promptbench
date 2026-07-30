# promptbench — PRD

| | |
|---|---|
| **Status** | Living · v1 in build |
| **Owner** | Taylor Allen (sole author, sole user) |
| **Cycle** | 1 — opened 2026-07-30 |
| **Current milestone** | M1 — shell + stores |
| **Companion docs** | [design-direction.md](./design-direction.md) (authoritative UI/architecture) · [review-conventions.md](./review-conventions.md) · `supabase.md` + `environment.md` (land with `feat/supabase-setup`) |

---

## 0. How this document grows

This PRD is written to be *appended to*, not rewritten. Three tiers, with different churn rates:

| Tier | Sections | Rule |
|---|---|---|
| **Spine** — rarely changes | §1 thesis · §2 the test · §3 principles · §4 scope | Changing one of these is a product pivot. Note the pivot in §10 and say what it invalidates. |
| **Ladder** — changes at milestone boundaries | §5 | Milestones may be resequenced or split; exit criteria are edited *before* a milestone starts, not after it ships. |
| **Log** — changes every cycle | §6 state · §7 decisions · §8 open questions · §10 cycle log | Append-only. Never delete a decision — supersede it with a dated row. |

**Cycle ritual** (start of each work cycle): refresh §6 from `git log` + open PRs, close or promote items in §8, append a §10 entry. Ten minutes, not an hour.

**What does not go here:** UI values, tokens, motion specs, geometry — those live in [design-direction.md](./design-direction.md), which is the design authority and stays that way. This document answers *what and why and in what order*; that one answers *what it looks like and how it's built*. If they ever disagree, the design doc wins on execution and this one wins on scope.

---

## 1. The thesis

promptbench is a single-user macOS desktop app where **the spec, the architecture diagram, the prompts that implement it, and the results of running them live together as facets of one piece of work** — in one tree, under one versioning story.

The differentiator is the linkage, not any one pillar. Nobody needs another standalone prompt tool, another Notion clone, or another canvas. The bet is that for someone whose entire development practice is AI-driven, the expensive thing is context-switching between the doc that describes the system, the diagram of it, and the prompt that builds it.

Corollary that shapes everything: **prompts that drive real work already live in git repos as files** (`.claude/skills/*/SKILL.md`, `CLAUDE.md`, agent definitions, workflow scripts). Any design that turns promptbench into a separate silo loses to just editing the files. Interoperability with repo files is a functional requirement, not a nice-to-have.

---

## 2. Who it's for, and the test

**User: Taylor, and only Taylor.** Single-player is a modeling decision, not a phase — it collapses tenancy to a `user_id` column and makes workspaces and per-page ACLs premature. (A `workspace_id` seam exists only because adding a tenancy column to every table later is expensive.)

**The success test is daily-driver, not demo:** promptbench has succeeded when Taylor reaches for it instead of the Anthropic Workbench, a scratch file, and Excalidraw — for real professional work, not for showing it off. That test first becomes answerable at **M2**.

Standing quality bar, equal in weight to the functional test: **boutique, with taste.** The tier is Linear / Things / Raycast — an app whose construction communicates care. "Works" is not the bar. A flow that works but reads as generic AI-tool slop (per-token fade-ins, shimmer skeletons, floating card soup, gradient buttons) is a failure, not a nit.

---

## 3. Principles, in order

1. **Ease of use.** When a shell feature adds grammar the user must learn, it loses. Defaults matter more than options; taste is not configurability.
2. **Dark-first.** Dark is the design target; light must hold, verified second. Both ship.
3. **Native, then glass.** The window is a real macOS citizen first. The glass feeling comes from real vibrancy and alpha, almost never from CSS blur.
4. **The work is sacred.** Chrome may be translucent, muted, dimmed. Content the user is reading never is.
5. **Honesty over comfort.** No fake offline state, no "feeds evals" promises for features that don't exist, no cost numbers recomputed after the fact. Where the model is a lie (the workbench tests prompt *text*, not the harness that consumes it), the app says so in plain type.
6. **Prefer removal to styling.** Fewer, better-considered surfaces.

---

## 4. Scope

### 4.1 One tree, typed pages

Every node in the tree is a page with a type. The pillars are page *types*, not separate apps — one sidebar, one row shape, one versioning story, one page-type registry that a fifth type joins as a single entry.

| Type | Engine | Content storage |
|---|---|---|
| **doc** | TipTap (leaning; not final) | JSONB blob |
| **canvas** | Excalidraw (MIT; the hand-drawn feel is product identity) | JSONB blob — `elements[] + files` only, `appState` discarded at the persistence boundary |
| **mermaid** | mermaid, rendered from source | JSONB blob (source text) |
| **prompt** | in-house workbench | **relational** — `prompt_versions` (immutable) + `prompt_runs` |

Content storage is deliberately non-uniform. Three of four pillars aren't block-shaped, and storing prompts as a snapshot blob produces exactly what the category derides as a glorified Notion folder: no real versioning, no deployment separation.

### 4.2 The three load-bearing conditions

These make "plain JSON, not CRDT" a best practice rather than merely expedient, and they are cheap now and expensive later:

1. **Every content blob carries a schema version; load is always `migrate(raw)`.** Migration #1 ships the day the schema lands, even as a no-op. Two spellings, on purpose, at a layer boundary: the SQL columns are `schema_version` (Postgres convention) and the TypeScript envelope field is `content.schemaVersion` — they carry the same number and the mapping happens at the client boundary.
2. **Session state never enters the version envelope.** Camera, selection, pane layout, scroll — local only, never versioned.
3. **Mutations flow through a per-pillar store emitting discrete operations.** Storage adapters swap easily; mutation discipline does not. Skipping this means adopting Yjs later rewrites every editor.

### 4.3 The run layer

Provider logic lives in **TypeScript**; Rust is deliberately dumb transport — `http_stream`, `cli_run`, `secret_set/get`, and (at M3) a file watcher. Provider code is the highest-churn code in the product; churn belongs in the language Taylor writes fluently.

- **API keys are injected Rust-side by provider id.** Secrets never enter JS, never touch Supabase — macOS Keychain only.
- **The codex CLI is a provider, not a special case.** Usage-limit errors render as their own column state with a reset time, never as generic failure.
- **Cost is computed at write time** from the pricing table and stored on the run row; never recomputed, because prices drift and history must not.
- Runs write to the database **only on terminal state**. Streaming partials live in the session layer.

Side-by-side comparison across Taylor's real routing table (Fable 5 · Opus 4.8 · Sonnet 5 · GPT-5.x-codex) with honest cost and latency is what makes the workbench worth using.

### 4.4 Versioning

Two different shapes, on purpose:

- **doc / canvas / mermaid** → `page_versions`, prunable snapshots (all for 24h, hourly for a week, daily for a month, pins forever). Retention horizon is stated in the History panel, because pins are the only thing that survives the cull.
- **prompt** → `prompt_versions`, immutable and permanent, because runs reference them. Run-on-dirty auto-commits, so no run ever references a phantom state.

One History panel (⌘J) serves every page type.

### 4.5 File binding (M3)

Bound prompt pages are **file-is-truth, page-is-view**. Opening reads the file fresh; Commit writes the file and snapshots the version in one gesture. Binding is `(repo_id, rel_path)`, never an absolute path. Change detection is by content hash, never mtime. **Never auto-merge** — external change plus dirty draft raises a conflict banner. promptbench performs **no git operations**; it only records which code-state an experiment ran against.

---

## 5. The milestone ladder

The ladder is the spine of this document. Each milestone has **exit criteria that are checkable, not vibes** — you can look at the app and say yes or no. `design-direction.md` §9 build order is the execution sequence *inside* M0–M1.

| # | Milestone | Exit criteria | State |
|---|---|---|---|
| **M0** | Foundation | Design direction authored and reviewed · window materials + config deltas landed · token system in place · glass smoke test rendering over the bench · perf gate (120Hz sheet scroll, busy wallpaper, both themes) green | ⚠️ built, **not exited** — perf gate unmeasured (§8 #2) |
| **M1** | Shell + stores | Rail tree, strip, pane container (n=1/n=2 with divider), drag regions, fullscreen + window-inactive contracts, toasts, button set, empty state #1 · session store, tree index store, content envelope + migration #1, op-store skeletons, page-type registry · command palette (names + types) · native menu bar mirroring every shortcut · motion pass (press states, hover law, tree animation, reduced motion) | 🔨 in progress |
| **M2** | **The daily driver** | Prompt session page running against real Supabase with two providers (Anthropic HTTP stream + codex CLI) · single-user magic-link auth + first-run · well/commit/run contract · results grid with per-column status, stop, cost/latency/token chips · History panel with batch rows · stores persist to Supabase behind the unchanged op-store seam | ⬜ not started |
| **M3** | File binding | `repos` registry + machine-local root map · bind/unbind a prompt page · Rust fs watcher on content hash · conflict banner (Theirs / Mine / Diff), no auto-merge · commit stamps `bound_hash` + git HEAD + dirty flag · **commit recovery semantics decided and written down (§8 #6)** · honest-caveat footer on bound pages | ⬜ |
| **M4** | Docs | Real rich-text editor (TipTap leaning — decision open, §8) · slash menu + selection toolbar · snapshot history + restore via `migrate(load(row))` · content migration module proven by a real migration | ⬜ |
| **M5** | Mermaid | Split source/preview on the **shared** shell splitter · debounced re-render that never blanks on error · theme via `themeVariables` at render time, `%%{init}%%` forbidden in stored source · opaque export | ⬜ |
| **M6** | Canvas | Excalidraw embedded · scene-differ synthesizing ops into the canvas store · `elements[] + files` persisted, `appState` discarded · local save indicator · export on `--background` at export time | ⬜ |
| **M7** | AI assist | *Improve this draft* returning a diff (accept/reject, never auto-apply) · generate N variants as runnable drafts · draft test cases · mermaid-from-description · all of it as an internal consumer of the run layer, with `prompt_runs.source = 'assist'` · meta-prompts are themselves bound prompt pages | ⬜ |

**State legend.** ✅ exited (every criterion checked) · ⚠️ built but **not exited** — code has landed and an exit criterion is still open · 🔨 in progress · ⬜ not started. "Built" is never "done": a milestone exits on its criteria, not on how finished it feels.

**Why this order.** M2 before docs/canvas because it is the only milestone that answers §2's test, and because the relational path is the riskiest thing to discover late. Canvas last because the engine boundary is the riskiest seam. AI assist last because it consumes everything below it.

**Ladder discipline:** a milestone is done when its exit criteria are checked, not when it feels done. Work that isn't on the current milestone's criteria is either a deliberate detour (log it in §10) or scope creep.

---

## 6. Where we are — Cycle 1 (2026-07-30)

Repo opened 2026-07-29. Two days in; ~1,500 lines of TypeScript, Rust, and SQL.

### Landed on `main`

| PR | What |
|---|---|
| #1 | Tailwind 4, shadcn (base-luma), theme foundation |
| #2 | Overlay titlebar app shell with drag regions |
| #3 | Window drag verification scripts |
| #4 | Design direction v2, materials + tokens, glass icon, first Supabase migration |
| #6 | Tree CRUD + typed page bodies — first functional slice |
| #7 | Greptile review config, MCP, `/check-pr` skill |
| #8 | Shell: session store, split panes, rail collapse |

### In flight

| Where | What | Note |
|---|---|---|
| PR #9 | Claude Code–canonical Greptile skills | Green on both bots. **Rewrites `CLAUDE.md`** — this PRD's branch stacks on it. |
| PR #10 | ⌘+/− sheet zoom | Cursor worktree `zoom` |
| PR #11 | Boutique settings popover (theme, zoom, shortcuts) | Cursor worktree `settings`; stacks on #10 |
| `feat/supabase-setup` | Supabase project wiring — grants, advisor hardening, T3 Env | Committed `11495df`, no PR yet |

Three Cursor worktrees plus Claude Code sessions run concurrently. That is a real constraint on how work is sliced: **small PRs off `main`, short-lived branches**.

### M1 status against exit criteria

| Piece | State |
|---|---|
| Rail tree (rows, create, rename, delete, type icons) | ✅ |
| Strip (rail toggle, split, theme switcher) | ✅ |
| Pane container n=1/n=2, divider drag + double-click reset, 360px clamp | ✅ |
| Drag regions, fullscreen + window-inactive + reduce-transparency attributes | ✅ |
| Session store, tree index store, content envelope (`schemaVersion`), page-type registry | ✅ (localStorage) |
| Shortcuts ⌘\ ⌘⌥\ ⌘1/2 ⌘W | ✅ |
| Typed page bodies (plain-text placeholders per type) | ✅ |
| **Command palette (⌘K)** | ❌ **critical path** |
| **Native menu bar** | ❌ **critical path** |
| Toasts | ❌ |
| Op-store discipline (discrete ops, content-migration module) | ⚠️ partial — stores mutate through named methods, but no op emission and no `migrate()` on load yet |
| Motion pass (press states, hover law, tree expand/collapse, PRM) | ⚠️ partial |
| Tree nesting / drag-reorder | ❌ (`parent_id` exists; the rail renders flat) |

### Drift worth naming

Two of three open PRs (#10 zoom, #11 settings panel) are shell polish that appears nowhere in the build order, while the two M1 items the design doc calls the front door — **command palette and native menu bar** — are unstarted. The settings panel isn't wrong (the design doc names Settings as the theme switcher's final home), but it arrived before the thing that gets you to a page. Worth a deliberate call rather than drift.

Also unfunded and unowned: **no test framework, no CI workflow.** Verification today is two review bots and two hand-rolled scripts. The perf gate in the design doc is a standing requirement with no harness behind it.

---

## 7. Decision ledger

Settled. Append; never delete — supersede with a dated row.

| Date | Decision | One-line why |
|---|---|---|
| 2026-07-29 | One tree of typed pages; pillars are types, not apps | Unifies tree + version envelope without forcing uniform content storage |
| 2026-07-29 | Blob content for doc/canvas/mermaid; relational for prompt | Three of four pillars aren't block-shaped; blob-versioned prompts = glorified Notion folder |
| 2026-07-29 | Plain JSON snapshots, not Yjs/CRDT | A CRDT doesn't deliver the versioning pillar; a snapshot table is required either way. Three conditions (§4.2) keep the door open |
| 2026-07-29 | Single page + optional 2-pane split; no tabs, no tiling | Ease of use governs; pane container is an n-array so lifting the cap later is free |
| 2026-07-29 | Run layer in TypeScript; Rust is dumb transport | Provider code is the highest-churn code; churn belongs in the fluent language |
| 2026-07-29 | Keys in macOS Keychain, injected Rust-side | Secrets never enter JS, never touch Supabase |
| 2026-07-29 | File binding: file-is-truth, page-is-view; hash watch; no auto-merge | Import/export drifts silently; two-way sync against git is the graveyard |
| 2026-07-29 | AI pillar = workbench-meta assist, internal consumer of the run layer | Assistant-everywhere is the fastest route to generic-AI-tool feel; agent sidebar is a second product |
| 2026-07-29 | Boutique taste bar is a standing requirement | Craft is a requirement, not polish deferred |
| 2026-07-30 | `release_labels` cut from v1 | Deploy is a git commit via file binding; labels serve runtime fetchers, which don't exist here |
| 2026-07-30 | Supabase: auto-expose off, automatic-RLS on, grants to `authenticated` only, invariants via RPC | Explicit surface; `anon` has nothing because there's no anonymous surface |
| 2026-07-30 | Greptile drives to 4–5/5 with zero unresolved, unprompted | A sub-4 score is unfinished work |
| 2026-07-30 | Skills are Claude Code–canonical; Cursor/Codex symlink | One body per skill, no drift across harnesses |

---

## 8. Open questions

Ordered by when the answer is needed.

| # | Question | Needed by | Notes |
|---|---|---|---|
| 1 | Palette + menu bar before or after the settings/zoom work in flight? | now | §6 drift. The palette is the front door and the menu bar is the thing Tauri apps always skip |
| 2 | What is the verification story — any tests, any CI? | M2 | Two review bots and no harness is thin for a relational path with money in it. The perf gate has no owner |
| 3 | Rich-text engine: TipTap confirmed? | M4 | Leaning TipTap (ProseMirror underneath, JSON doc format slots into the envelope + op-store). Lexical younger, raw ProseMirror artisanal |
| 4 | Does the tree get nesting + drag-reorder in M1 or M2? | M1 exit | Schema and design support it; the rail renders flat today |
| 5 | When do the stores actually cut from localStorage to Supabase? | M2 | Client exists and is unconsumed by design; the op-store seam is the cut line |
| 6 | What are the recovery semantics of a bound Commit? | M3 | "One gesture" spans a filesystem write and a database insert and cannot be atomic. Needs an ordering, an idempotent retry, and a partial-failure story — file written but `prompt_versions` stale, or the reverse. Unowned; do not invent it at implementation time |
| 7 | Is `starred` / `is_best` enough, or does the workbench need evals? | post-M2 | Evals explicitly deferred; both columns ship with no "feeds evals" promise |

---

## 9. Out of scope for v1

Named so they stop coming back:

- **Multiplayer / collaboration / sharing.** Not deferred-but-planned — unfunded. The CRDT door is held open by §4.2, nothing more.
- **Workspaces, per-page ACLs, teams.** `workspace_id` is an unused seam.
- **Offline-first.** No offline story is funded. The honest contract is a visible unsaved count plus a quit guard.
- **Realtime subscriptions.** No multi-client story.
- **Content search in the palette.** Names and types only; the empty state says so. Needs the deferred `search_text` projection.
- **Backlinks / `page_links`.** Deferred at the schema level.
- **Release labels.** Cut — see the ledger.
- **Evals / scoring harness.** Deferred; `starred` and `is_best` are plain columns, not a promise.
- **Windows / Linux.** macOS-first, and the material system is macOS-specific by design.
- **An agent sidebar.** A second product's worth of scope.

---

## 10. Cycle log

Append one entry per cycle: what shipped, what changed in the ladder, what the next cycle is for.

### Cycle 1 — opened 2026-07-30

- **Shipped since repo open (2026-07-29):** M0 built but **not exited** — its perf gate is unmeasured; M1 roughly two-thirds through — shell, stores, tree CRUD, typed page bodies, split panes. Supabase project created and migration #1 written with RLS, grants, and two invariant RPCs.
- **Ladder:** first written down here. M1–M7 formalized from the working milestone sketch; the `M2`/`M4`/`M5`/`M6` markers already scattered through the code comments now resolve to real definitions.
- **Named this cycle:** the palette/menu-bar gap (§6 drift), and the absent verification story (§8 #2).
- **Next cycle is for:** closing M1 — palette, menu bar, toasts, op-store discipline, motion pass — and deciding question #2 before M2 puts real money through the run layer.
