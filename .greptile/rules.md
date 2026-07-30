# promptbench Greptile rules

Read `docs/design-direction.md` and `docs/review-conventions.md` before commenting. Prefer bugs and regressions over style.

## Product stance

1. **Ease of use** beats shell grammar — if a feature adds concepts to learn, flag it.
2. **Dark-first** — dark is the design target; light must still hold.
3. **Native, then glass** — real macOS materials first; CSS blur only on transients.
4. **The work is sacred** — chrome may be translucent; content the user reads must stay opaque and legible.

## Shell geometry

- Bench (rail + strip) uses real NSVisualEffectView material; sheet sits **flush** to right/bottom edges with a hairline seam — no gutter, floating card, or shadow pool.
- Glass on the sheet comes from ~0.96 alpha over L1, **not** `backdrop-filter`.

## Tauri / WebKit hard constraints

- Never `setTitle` (resets traffic lights).
- Drag via `data-tauri-drag-region` only.
- `@media (prefers-reduced-transparency)` does not work in WebKit — reduced transparency must be bridged natively (`data-reduce-transparency`).
- `backdrop-filter` cannot sample the desktop behind a transparent window.

## Data model

- Pages tree + JSONB content blobs; `prompt_versions` are immutable; soft-delete via `deleted_at`.
- Single-player RLS on `user_id`; do not invent multi-tenant enforcement in v1.
