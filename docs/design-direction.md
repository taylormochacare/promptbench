# promptbench — Design Direction v2

Consolidated after multi-model review (Fable 5 draft → tech verification against Tauri/WebKit primary sources, independent taste critique, architecture-coherence audit). This is the authoritative version; the Fable draft is superseded. Every value here is buildable as written.

**Governing principles, in order:**

1. **Ease of use.** When a shell feature adds grammar to learn, it loses (Taylor's explicit rule).
2. **Dark-first.** Dark is the default theme and the design target; light must hold, verified second. Both ship.
3. **Native, then glass.** The window is a real macOS citizen first; the glass feeling comes from real vibrancy and alpha, almost never from CSS blur.
4. **The work is sacred.** Chrome may be translucent, muted, and dimmed; the content the user is reading never is.

---

## 0. The stance: bench and sheet, flush

- **The bench** — rail and top strip — is real macOS material (NSVisualEffectView through the transparent window). Calm, dim, never ambiently animated.
- **The sheet** — the work plane — sits **flush** to the window's right/bottom edges (the OS corner radius handles outer corners). It meets the bench at a hairline **seam**, with a single 10px rounded corner at the rail/strip junction. No gutters, no floating card, no shadow pool: the v1 inset-sheet construction is dead — its own shadow filled the gutter it paid for, and it cost the width the prompt page needs.
- **Glass = alpha over real material, plus blur only on transients.** The sheet itself runs ~0.96 alpha so the whole window breathes with the desktop (no `backdrop-filter`, no cost). CSS blur exists in exactly two places: the command palette and menus/popovers. Nothing else, ever.

Reference feel: Linear/Zed window construction, Things' calm, Raycast's palette.

---

## 1. Material system

### 1.1 Window configuration (`tauri.conf.json` deltas)

```jsonc
"windowEffects": {
  "effects": ["sidebar"],              // was ["underWindowBackground", "mica"]; mica is Windows-11-only dead config,
                                       // and first-supported-wins means only one macOS material ever applies
  "state": "followsWindowActiveState"  // keep — native flatten on deactivate, for free
},
"trafficLightPosition": { "x": 16, "y": 18 }   // was y:20 — centers in the 48px strip
```

Keep: `transparent: true`, `macOSPrivateApi: true`, `titleBarStyle: Overlay`, `decorations: true`, `acceptFirstMouse: true` (first click acts on controls, native-toolbar semantics — confirmed Tauri behavior). Add **`tauri-plugin-window-state`** (official, Tauri 2) so the window remembers size/position.

**Hard rules, verified against Tauri issues:**

- **Never call `setTitle`.** [#13044](https://github.com/tauri-apps/tauri/issues/13044): `setTitle` resets the custom traffic-light position. Config `title: ""` + `hiddenTitle: true` already does the job. → **Delete the `setTitle("")` call in `use-window-chrome.ts`** — it is currently redundant *and* harmful. Page identity lives in-app (pane headers), never in the window title.
- **Re-apply `trafficLightPosition` after fullscreen exit** ([#15451](https://github.com/tauri-apps/tauri/issues/15451): position can reset when exiting fullscreen from maximized).
- **Theme sync:** the theme provider must call `getCurrentWindow().setTheme(theme)` alongside toggling the `.dark` class (app-wide on macOS — fine, one window; `setTheme(null)` restores system-follow). Without it, dark app + light OS renders a light material behind dark UI. **Default theme: dark.** System-follow is an option, off by default.
- **Drag regions:** the `data-tauri-drag-region="deep"` attribute mechanism is the *only* working mechanism on macOS (Tauri 2.11's drag.js walks the subtree; `"false"` opts out; interactive tags auto-excluded; double-click = zoom toggle, implemented by Tauri). The `-webkit-app-region` CSS rules in `index.css` are **dead code in WKWebView** — delete lines 142–155. Entire bench (rail dead space + strip) carries the attribute.
- **Reduce Transparency bridge:** `@media (prefers-reduced-transparency)` **does not exist in WebKit** — the CSS-only fallback silently no-ops. Bridge natively: Rust reads `NSWorkspace.accessibilityDisplayShouldReduceTransparency` (listen to `accessibilityDisplayOptionsDidChangeNotification`), stamps `data-reduce-transparency` on `<html>`. NSVisualEffectView goes opaque on its own; the CSS side must match via that attribute: bench wash → opaque `--sidebar`, glass recipes → opaque `--surface-overlay`, sheet alpha → 1.
- **Fullscreen:** no dedicated event exists in Tauri 2 — `onResized` → `isFullscreen()` → `data-fullscreen` on `<html>`; traffic lights auto-hide natively, the attribute collapses their 48px reservation so the rail tree slides up.

### 1.2 Layer stack

| Layer | Surface | Material | Spec |
|---|---|---|---|
| L0 | Desktop | The real world | Visible through bench, and faintly through the sheet's alpha |
| L1 | NSVisualEffectView | `sidebar` material | Whole window; set once in config, never touched from CSS |
| L2 | **Bench wash** | Tint over L1 | Dark `oklch(0.11 0.008 60 / 0.50)` · Light `oklch(0.99 0.004 85 / 0.35)`. Rail + strip only |
| L3 | **The sheet** | `--sheet` (≈0.96 alpha) | Flush right/bottom; seam hairline against rail/strip; one 10px top-left corner. Content inside uses opaque tokens |
| L4 | In-sheet floats | **Opaque** | Selection toolbar, slash menu, canvas toolbars, sticky column headers, toasts: `--surface-overlay` + `--shadow-float`. Never blurred (they live in scroll/repaint contexts) |
| L5 | Transient overlays | CSS glass | Command palette, menus, popovers, context menus. Tooltips are **opaque** |
| L6 | Scrim | Dim, never blur | Dark `oklch(0 0 0 / 0.35)` · Light `oklch(0.2 0.02 55 / 0.25)`, fade only |

`html, body, #root` stay `background: transparent`; the root paints nothing. The old root-level `bg-background/40` wash is dead.

**Dark-mode layer order is law:** the sheet must render *lighter* than the bench over any plausible wallpaper (v1 had this inverted — the sheet read as a hole). The values above hold the order; the seam hairline carries separation if a near-white wallpaper ever flips it.

### 1.3 The law of glass in WKWebView (verified)

`backdrop-filter` composites **inside** the web view — it can never sample the desktop behind the transparent window ([#2827](https://github.com/tauri-apps/tauri/issues/2827), [#10064](https://github.com/tauri-apps/tauri/issues/10064)). Only L1 blurs the world. Consequences:

1. Every CSS-glass surface carries own-background alpha ≥ 0.80 so it stays legible over the bench (where its blur contributes nothing). This is also the workaround for open bug [#12804](https://github.com/tauri-apps/tauri/issues/12804) (backdrop-filter misrendering over text on transparent windows, macOS 15) — **smoke-test the palette over the bench in build step 1**, not when the palette gets built.
2. The glass *feeling* on the sheet comes from its 0.96 alpha over L1 — free, no filter, no budget.

### 1.4 Glass recipes (complete inventory: two)

| Token | Dark | Light | Filter |
|---|---|---|---|
| `--glass-popover` | `oklch(0.23 0.008 60 / 0.82)` | `oklch(0.99 0.003 85 / 0.80)` | `blur(20px) saturate(1.4)` · light `saturate(1.8)` |
| `--glass-palette` | `oklch(0.21 0.008 60 / 0.88)` | `oklch(0.985 0.004 85 / 0.85)` | `blur(28px) saturate(1.5)` · light `saturate(1.8)` |

**Specular edge on both** (the highest reads-as-Apple-glass-per-line lever): dark `inset 0 1px 0 oklch(1 0 0 / 0.09)`, light `inset 0 1px 0 oklch(1 0 0 / 0.70)`. The v1 doc-sticky-header glass is deleted; if a new surface wants glass and isn't palette or popover, the answer is opaque.

### 1.5 Blur budget

- **Steady state: zero CSS blurs.** An idle window has only L1 working.
- Hard cap 2 concurrent, never overlapping; banned inside scroll containers; banned over live repaint (canvas interaction, streaming columns).
- **Never transition `backdrop-filter`** (per-frame re-filter; WebKit's own guidance). Glass enters at full blur via opacity/transform.

### 1.6 Perf gate (build step 1, then standing)

Hold **120Hz during sheet scroll and canvas pan**, window over a busy wallpaper, both themes, measured in Safari Web Inspector timeline against the release build. Any surface that breaks the gate loses its effect (alpha → opaque, blur → none) — the fallback is always specified, never improvised.

---

## 2. Tokens (dark listed first everywhere)

### 2.1 Brand: one amber, both themes

Unified at **hue 50** (v1 shipped hue 42 light / 52 dark — a red-orange and an amber pretending to be one brand). Light value chosen in-gamut for sRGB (v1's clipped in screenshots/exports).

| Token | Dark | Light |
|---|---|---|
| `--primary` | `oklch(0.73 0.16 50)` | `oklch(0.56 0.145 50)` |
| `--primary-foreground` | `oklch(0.185 0.028 55)` *(espresso — 7.4:1; white would be 2.5:1)* | `oklch(0.985 0.012 75)` |
| `--ring` | `oklch(0.73 0.16 50)` | `oklch(0.56 0.145 50)` |
| `::selection` | `oklch(0.73 0.16 50 / 0.30)` | `oklch(0.56 0.145 50 / 0.22)` *(explicit alpha — WebKit forces translucency on opaque selection colors anyway)* |

**Amber is budgeted.** It marks **state** — running, current version, selected icon, focus — and the primary button. It does not also get: streaming underlines *and* canvas handles *and* every selected tree icon at full chroma. When in doubt, neutral.

### 2.2 Neutrals: warm-smoke family + surface ladder

One hue family (55–80, chroma ≤ 0.012). The v1 `--secondary` at hue 286 (cool violet) is dead. New tokens marked ●.

| Token | Dark | Light | Role |
|---|---|---|---|
| ● `--sheet` | `oklch(0.215 0.006 60 / 0.96)` | `oklch(0.988 0.003 80 / 0.97)` | The work plane (alpha over L1) |
| `--background` | `oklch(0.215 0.006 60)` | `oklch(0.988 0.003 80)` | Opaque equivalent — content surfaces |
| ● `--surface-sunken` | `oklch(0.185 0.005 60)` | `oklch(0.962 0.004 80)` | Wells: prompt editor, code, inputs |
| ● `--surface-raised` | `oklch(0.25 0.007 60)` | `oklch(1 0 0)` | Cards, hover surfaces (alias `--card`, `--muted`) |
| ● `--surface-overlay` | `oklch(0.275 0.008 60)` | `oklch(1 0 0)` | Opaque floats, tooltips, toasts, glass fallback (alias `--popover`) |
| `--foreground` | `oklch(0.93 0.007 75)` | `oklch(0.26 0.012 55)` | Espresso light, not near-black |
| `--muted-foreground` | `oklch(0.65 0.014 64)` | `oklch(0.51 0.014 60)` | |
| `--secondary` | `oklch(0.26 0.007 60)` | `oklch(0.955 0.005 80)` | |
| `--border` | `oklch(1 0 0 / 0.08)` | `oklch(0.26 0.02 55 / 0.10)` | Hairline |
| ● `--border-strong` | `oklch(1 0 0 / 0.14)` | `oklch(0.26 0.02 55 / 0.16)` | Seams, dividers (alias `--input`) |

Bench:

| Token | Dark | Light |
|---|---|---|
| ● `--bench-wash` | `oklch(0.11 0.008 60 / 0.50)` | `oklch(0.99 0.004 85 / 0.35)` |
| `--sidebar` (opaque fallback) | `oklch(0.205 0.006 60)` | `oklch(0.955 0.005 80)` |
| `--sidebar-foreground` | `oklch(0.94 0.006 75 / 0.96)` | `oklch(0.26 0.012 55 / 0.96)` |
| ● `--pill-hover` | `oklch(1 0 0 / 0.06)` | `oklch(0.25 0.02 55 / 0.05)` |
| ● `--pill-selected` | `oklch(1 0 0 / 0.10)` | `oklch(0.25 0.02 55 / 0.08)` |

Selection pills are **neutral** (Finder behavior); the accent lives only in the selected item's icon — and via `--accent-ui` indirection so window-inactive can mute it (§4.7).

Semantic (identity only — icons, chips, dots; never buttons):

| Token | Dark | Light |
|---|---|---|
| ● `--diff-add-bg` / `-fg` | `oklch(0.70 0.15 150 / 0.14)` / `oklch(0.80 0.14 150)` | `oklch(0.62 0.15 150 / 0.12)` / `oklch(0.44 0.12 150)` |
| ● `--diff-del-bg` / `-fg` | `oklch(0.66 0.19 25 / 0.14)` / `oklch(0.78 0.14 22)` | `oklch(0.60 0.20 25 / 0.10)` / `oklch(0.50 0.17 25)` |
| ● `--type-doc` | `oklch(0.66 0.055 250)` | `oklch(0.52 0.07 250)` |
| ● `--type-canvas` | `oklch(0.70 0.10 300)` | `oklch(0.55 0.12 300)` |
| ● `--type-mermaid` | `oklch(0.70 0.09 185)` | `oklch(0.52 0.10 185)` |
| ● `--type-prompt` | = `--primary` | = `--primary` |

Shadows — **seams, not pools** (the sheet gets a seam; only true overlays get depth). Dark needs the built-in hairline ring or shadows vanish:

```css
/* dark */
--shadow-seam:    0 0 0 1px oklch(1 0 0 / 0.09);                    /* sheet edges vs bench */
--shadow-float:   0 0 0 1px oklch(1 0 0 / 0.07), 0 4px 16px -4px oklch(0 0 0 / 0.40);
--shadow-overlay: 0 0 0 1px oklch(1 0 0 / 0.08), 0 12px 32px -8px oklch(0 0 0 / 0.55);
--shadow-palette: 0 0 0 1px oklch(1 0 0 / 0.10), 0 16px 48px -20px oklch(0 0 0 / 0.50);
/* light: same geometry; ring oklch(0.2 0.03 55 / 0.06); drops at 0.10 / 0.14 / 0.18 */
```

(The v1 64px palette pool is dead — a big dark pool under translucent glass shows through its own edges as mud. Palette elevation = ring + tight drop + specular inset.)

### 2.3 Type: SF chrome / Inter prose / SF Mono data

DM Sans is removed (dependency and all).

```css
--font-ui:    -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
--font-prose: 'Inter Variable', -apple-system, sans-serif;
--font-mono:  ui-monospace, 'SF Mono', 'Menlo', monospace;
--font-sans:  var(--font-ui);
--font-heading: var(--font-ui);   /* compat during migration */
```

Chrome runs at **13px** (native macOS body; 14px is the subtle web tell). Ramp: UI 11/14 caps (+0.05em), 12/16 meta, 13/18 default, 15/20 palette input & page titles. Prose 16/1.7 at 68ch; model outputs 14/1.6. Mono 12/18 chips, 13/20 editors. Doc headings in Inter: H1 28/650/−0.015em, H2 21/600, H3 17/600. `tabular-nums` on every metric.

### 2.4 Radius: explicit scale

The multiplier chain is dead (it produced 4.8/6.4/11.2 — nothing reads as intentional). Explicit:

```css
--radius-control: 5px;   /* buttons, inputs, chips, tree pills */
--radius-card:    8px;   /* cards, wells, toolbars */
--radius-sheet:  10px;   /* the one sheet corner */
--radius-popover:12px;
--radius-palette:16px;
```

Concentric rule where things nest: inner ≈ outer − gap; never a 4px corner flush inside a 16px one. (Legacy `--radius` maps to `--radius-card` for shadcn compat.)

---

## 3. Motion — buttery, defined

### 3.1 Two laws

**Same-frame law:** every input's visible state change lands next frame. Animation layers on top of a state change; it never delays one.
**Continuity law:** when something changes *place or size*, it moves there (FLIP, compositor-only) — it doesn't teleport-and-fade. Butter = instant response + continuous layout. (v1 banned layout animation outright and then spec'd two — the ban is replaced by this rule.)

### 3.2 Tokens

```css
--dur-1: 80ms;   /* micro: focus fade, tooltips, hover-out */
--dur-2: 140ms;  /* overlays in: palette, menus, chips */
--dur-3: 200ms;  /* FLIP layout moves, page crossfade */
--dur-4: 300ms;  /* panels — the ceiling; nothing exceeds it */
--ease-out:      cubic-bezier(0.25, 1, 0.5, 1);
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);   /* palette entrance */
--ease-in-out:   cubic-bezier(0.65, 0, 0.35, 1);  /* panel slides */
```

Exits: one tier faster than entrances, opacity-only.

### 3.3 The lists

**Allowed:** `transform`, `opacity`; small-area `background/border-color` tints; FLIP for layout (180–220ms `--ease-out`, content fades in after).

**Mandatory (v1 under-specified and it would have shipped dead):**
- `:active` **press states everywhere**: same-frame fill delta (dark: white overlay 0.06; light: black overlay 0.06), 0ms in / 120ms out. **No press-scale** — macOS buttons darken, they don't shrink.
- **Hover law:** in = 0ms, out = 120ms fade.
- **Tree expand/collapse animates**: `grid-template-rows: 0fr → 1fr` on the child wrapper, 160ms `--ease-out`, chevron 90° in 140ms; instant fallback above ~40 visible children. (The most-repeated interaction in the app earns the brief here.)

**Never animates:** caret/keystroke echo · ⌘K filtering (same-frame swaps, no stagger, no exit animations) · keyboard selection movement · focus-ring *position* (fades in 80ms, never slides) · divider drag (1:1) · scroll (no hijack) · streaming tokens (append raw; per-token fades are LLM-app slop) · anything via `width/height/top/left` tweens (use FLIP).

**Springs (complete list):** tree drag-reorder settle, panel-release snap. Presets `snappy {500, 40}`, `gentle {300, 32}`. Library: CSS + `tw-animate-css` now; add **`motion`** (motion.dev) only when drag-reorder gets built.

**Ambient budget: zero in steady-state chrome.** Two sanctioned non-steady exceptions: streaming-run status dot (opacity 0.4↔1, 1.1s) and rail sync activity — but auto-snapshot saves do **not** pulse the rail (they'd pulse all day; §7.4).

**Skeletons:** static `--surface-raised` blocks, 120ms fade-in, **no shimmer**. Page switches crossfade 140ms into *content or skeleton* (pages load async — never crossfade into blank).

### 3.4 Reduced motion

`prefers-reduced-motion`: transform movement off, fades clamp to 80ms, springs off, dots static. One media-query token remap, not per-component.

---

## 4. The shell

### 4.1 Geometry (flush construction)

```
┌────────────┬──────────────────────────────────────────┐
│ ●●●        │  strip 48px   (bench: wash over material)│
│            ╞═╡ seam ╞════════════════════╤════════════╡
│  rail      │ ┌ r10                       │            │
│  240px     │ │ pane A                    │  pane B    │
│  (bench)   │ │   28px pane header        │  (split)   │
│            │ │   content                 │            │
│  tree      │ │                           │            │
│            │ │        THE SHEET (0.96α)  │            │
│  ⚙ status  │ │                           │            │
└────────────┴─┴───────────────────────────┴────────────┘
```

- **Rail:** 240px default, resizable 200–340, on the bench. Top 48px reserves traffic lights (reclaimed via `data-fullscreen`). **⌘\\** collapses. Collapsed: strip spans full width; content starts at x = 84.
- **Strip:** 48px, bench, drag region. Left (after lights): rail toggle. Right cluster: sync status (§4.6), theme switcher (build-phase home; final home = Settings + palette action), overflow. The strip is mostly honest drag surface — page identity and actions live in pane headers.
- **Sheet:** flush right/bottom/top-under-strip; `--shadow-seam` on top and left edges; single `--radius-sheet` top-left corner; `--sheet` alpha fill.
- Logo: launch, empty states, About. Never in steady chrome.

### 4.2 Panes — single + split (Taylor's decision)

The sheet container is a **flex row of panes**, rendering n=1 (default) or n=2 (split). Ease of use governs; no tiling grammar — but the array shape means a hidden "lift the cap" palette action later costs nothing (the sanctioned easter egg).

- **Create:** ⌥-click a tree row (opens in split) · drag a page onto the sheet's right edge (drop-zone highlight, FLIP open) · **⌘⌥\\** (split + palette targeted at the new pane).
- **Divider:** 1px `--border-strong`, 8px grab zone, `col-resize`, 1:1 drag, double-click resets 50/50. Pane min 360px; the rail auto-collapses before a split refuses; below `minWidth` math, split commands disable with a tooltip.
- **Focus:** click, or **⌘1/⌘2**. Focused pane = full-opacity header; unfocused drops to muted. Strip/global actions and ⌘[/⌘] history apply to the focused pane. **⌘W** closes the focused pane when split; single-pane ⌘W stays native.
- **Pane header (28px):** breadcrumb left (12px, current page 13px medium); right: page actions (History toggle, type-specific), hover close when split.
- Split layout (page ids + ratio) is **window-level session state** (§7.3). Model-column focus moved to **⌃1–4** so ⌘-digits belong to panes.

### 4.3 The rail tree

Rows 28px, 13px SF, `--radius-control` pills, indent 16px/level (Finder), 16px type-tinted icons, chevrons on hover only. Neutral selection pill + accent icon. Drag-reorder with spring settle. Text fade-truncates. Bottom: settings gear + status dot.

### 4.4 Command palette — the front door

⌘K (⌘P alias). 620px, top 15vh, `--radius-palette`, `--glass-palette` + specular edge, `--shadow-palette`. Input 52px/15px; rows 40px (type icon · name · parent path 12px muted · kbd hint 11px mono); headers 11px caps. Same-frame filtering. Enter 140ms `--ease-out-expo` scale 0.98→1; exit 100ms fade. Scrim L6. Type-scoping prefixes `doc:` `canvas:` `mermaid:` `prompt:`; actions rank below pages. **v1 scope: names + types only** — the empty state says so ("Searches page names — content search coming"); content search needs the `search_text` projection (§7.5), explicitly deferred.

**Native menu bar** (Tauri Menu API), every shortcut mirrored — the thing Tauri apps always skip:

| | |
|---|---|
| ⌘K / ⌘P | Palette |
| ⌘N | New page · ⌘⇧N new from type picker |
| ⌘\\ / ⌘⌥\\ | Rail · Split |
| ⌘1 / ⌘2 · ⌃1–4 | Focus pane · Focus model column |
| ⌘W | Close focused pane (when split) |
| ⌘[ / ⌘] | History back/forward (focused pane) |
| ⌘J | History panel (all page types, §5) |
| ⌘↵ / ⌘⇧↵ | Run · Run all |
| ⌘⇧S | Commit prompt version |
| ⌘. / ⌘⇧. | Stop run · Stop all |
| ⌘⌥← / ⌘⌥→ | Prev/next prompt version |
| ⌘E | Expand/collapse the well |
| ⌘F | Find in page (per-type semantics; canvas/mermaid = find node by text, session = find in outputs) |

### 4.5 The four native tells + overlays

1. **`cursor: default` on all controls** (override shadcn's `cursor-pointer`); pointer only on true links.
2. **`user-select: none` on chrome**; selectable only in prose, code, outputs, inputs.
3. **`:focus-visible` only:** 3px `--ring`/45, offset 1px; fields: offset 0, border goes accent. Fades in 80ms, never slides.
4. **Don't style scrollbars.** Native overlay scrollbars are free by not writing CSS.

Menus/popovers: `--glass-popover` + specular, `--radius-popover`, 4px padding, items 28px/13px, enter 140ms scale 0.97→1 from trigger corner, exit 100ms. Safe-triangle ~300ms. **Intercept right-click globally** — the WKWebView default context menu never appears. Tooltips: opaque `--surface-overlay`, 12px, 400ms delay, instant re-show in group.

**Toasts:** bottom-right of the *window* (not per pane), opaque `--surface-overlay` + `--shadow-overlay`, max 3 stacked, FLIP restack. Success auto-dismiss 4s; errors persist with an action ("Sync failed — Retry"). This is where async failures live: sync errors, invalid API key, run cancelled (§4.6, §5.4).

**Buttons:** primary (amber, espresso text in dark) · secondary (`--surface-raised` + `--border`) · ghost (transparent, `--pill-hover`) · destructive. Heights 28px default, 24px dense. All get the mandatory press state.

### 4.6 Status, sync, offline honesty

One dot at the rail bottom + word on hover: idle (hidden) · syncing (pulse, sanctioned) · **disconnected** (`--destructive` tint, "N changes unsaved") · error (toast + persistent dot). No amber "offline is fine" state — **no offline story has been funded**; the honest contract is a visible unsaved count plus a **quit guard** (block close with pending writes, offer "wait / discard / quit anyway"). If local-first ever gets decided, the op-store seam (§7.2) is where the WAL hooks in. Canvas pages additionally get a local saving/saved indicator by the zoom pill — multi-MB snapshot writes are not a chrome-corner event.

### 4.7 Window-inactive contract

Bench flattens natively (free). In-app, `onFocusChanged` → `data-window-inactive`: chrome text/icons drop one tier; `--accent-ui` (normally = `--primary`; chrome references it, content never does) remaps to `--muted-foreground`; pulses pause. **Sheet content never dims.**

### 4.8 Empty states (all five, specified because the first one is built in week one)

| State | Treatment |
|---|---|
| No pages at all | Centered logo (animated — its home now) + "Create your first page" + type picker row + ⌘K hint |
| Empty doc | Ghost H1 placeholder + slash-menu hint line, cursor already focused |
| Empty canvas | Faint center dot-grid glyph + tool hint; toolbar visible |
| Session, no runs | The well, focused, with placeholder prompt + model chips preselected from last session; ghost columns hinting the grid |
| Palette, no results | "No pages match — ⏎ creates 'query' as a new doc" (+ the v1-scope search note) |

### 4.9 Narrow-window collapse order

At `minWidth: 960` everything still works: order is rail auto-collapse (≤ ~1100 with split) → pane min clamp → split commands disable. Model columns go 1-up scroll-snap below ~640px pane width.

---

## 5. History — one panel, every page type

**⌘J on any page** opens the same right panel (300px, opaque, hairline seam, 240ms `--ease-in-out` slide; a panel, not an overlay). Content by type:

- **Doc / canvas / mermaid:** snapshots grouped **Today / This week / This month / Pinned**, rows 36px (time · pin toggle · Restore). The retention horizon is *stated in the list* ("older than 30 days: daily snapshots only") — pins are the only thing that survives the cull, so pinning must be one visible click, not a buried menu. Selecting a snapshot shows it **read-only** in the pane with a banner ("Viewing May 12 · Restore · Back"); Restore = `migrate(load(row))` then a normal save — never a raw load.
- **Prompt session:** runs **grouped by version**, version group headers carry the commit message; rows = batch rows (§6.4). Context menu on a version: "Edit from this version", "Diff against current". (Release labels: **cut from v1** — deploy is a git commit via file binding; labels return only if a runtime consumer ever exists.) The v1 horizontal `v1…vN` scrubber is dead — identical dots carried no information and duplicated this panel.

Virtualize past ~100 rows. Panel open-state is session state, per page type.

---

## 6. The four page types

Frame never changes; interiors do. Glass inventory per type: **0, 0, 0, 0** (glass lives only in palette + popovers).

### 6.1 Doc

Prose 68ch centered, 16/1.7 Inter, top padding **40px** (v1's 56 + strip = 112px of nothing), H1 as title. No sticky mini-header — the pane breadcrumb already carries identity. Selection toolbar + slash menu: opaque `--surface-overlay` + `--shadow-float`, rise 4px/120ms. Code blocks `--surface-sunken` 13px mono. Drag handles fade in 80ms.

### 6.2 Canvas

Edge-to-edge **opaque** plane (`--background`, not `--sheet` — live repaint zone): 1px dot grid at 20px, dark `oklch(1 0 0 / 0.045)` / light `oklch(0.26 0.02 55 / 0.06)`. Toolbar (top-center 44px) + property panel (right 240px): opaque + `--shadow-float`. Zoom pill + save indicator bottom-left, 11px mono. Selection/handles `--primary`.

**Theme is never stored in the blob:** Excalidraw `viewBackgroundColor` stays `"transparent"`; the grid is presentation; persist `elements[] + files` **only** — `appState` (camera, selection, viewBackgroundColor) is discarded at the persistence boundary (it's session state and it's how theme leaks into snapshots). Exports render on `--background` *at export time*; the claim "export matches screen" is scoped to elements, not grid. Engine stays Excalidraw (MIT, and the hand-drawn feel is product identity); the canvas op-store diffs scenes to synthesize ops — accepted cost, revisit tldraw only if the differ turns ugly. Canvas builds last.

### 6.3 Mermaid

Split well: source left 44% (`--surface-sunken`, 13/20 mono) | preview right (`--background`, half-strength grid) — built on the **shared shell splitter** (§4.2's divider component, reused; not a third bespoke one). Re-render: 300ms debounce, 120ms crossfade, **never blank on error** — last good render stays, parse error in a `--destructive/10` strip under the editor. Theme via `mermaid.initialize` themeVariables mapped from tokens **at render time**; `%%{init}%%` directives are forbidden in stored source (theme-in-content dirties snapshots on every toggle). Exports opaque.

### 6.4 Prompt session — the daily driver

Optimized for the real loop: ~90% tweak-run-read on one model, ~10% compare-across. Outputs get the room.

- **The well** (`--surface-sunken`, `--radius-card`, 13/20 mono, min 96px/max 40vh, 1:1 resize): param row inside its bottom edge — model chips, temp, max-tokens, **Commit** (secondary, ⌘⇧S, inline one-line message field) and **Run** (primary, ⌘↵). **After Run the well collapses** to a 2-line summary of what ran (⌘E or click to reopen) — the outputs own the vertical.
- **Draft/version contract:** the well is the working draft. Amber dot = parked on a committed version; **hollow amber ring = dirty** (drifted from vN). **Run on a dirty draft auto-commits** v(N+1) (message optional, backfillable) — every run row references a real immutable version, no orphans. Browsing history (⌘⌥←/→ or the History panel) loads versions **read-only**; "Edit from this version" copies into the well. Browsing never destroys the draft.
- **Results grid:** one column per model, **flexing**: 1 = full width capped ~90ch · 2 = halves · 3+ = min 280, scroll-snap proximity (4 columns fit a default 1440 window — acceptance criterion). Columns are hairline-divided regions, not floating cards.
  - **Header** (36px, opaque, sticky): model name 12/600 · status dot · chips.
  - **Chips** (20px, `--surface-raised`, 11px mono tabular): latency `1.24s` with a 1px width-scaled bar underneath relative to the slowest column in this run (encoding, not color) · cost as `0.31¢` (dollars-with-4-decimals was unreadable; run totals live in the history row, session total in the History panel header) · tokens `812↑ 214↓`. Null values render `—`. Color only on failure (`--destructive`) / timeout (amber).
  - **Two run presentations, picked by data** (`prompt_runs.transport`): `http_stream` — tokens append raw, 1.5px amber underline slides in the header, dot pulses. `local_cli` (codex is a subprocess, possibly silent for minutes) — **elapsed timer counting up** in the header (mono, tabular), same underline, then the whole block arrives with a single 120ms fade. Never an empty column with a pulsing dot.
  - **Stop is mandatory:** hover stop button per column header + ⌘. (focused) / ⌘⇧. (all). Cancelled runs record status + partial output; toast confirms.
  - **Failures:** inline `--destructive/10` card + error + Retry; the column never blanks.
  - **Footer** (32px): copy · **Star** (`starred` — "pin" belongs to snapshots, one word one meaning) · **Best** (`is_best`, partial-unique per version, ⌃⇧1–4) — both real columns on `prompt_runs`, no "feeds evals" promises (evals are explicitly deferred).
- **Diff mode:** any two versions, word-level unified, `--diff-*` tokens, 13px mono, commit messages shown.
- **History panel** per §5 (batch rows: time · version · models · total cost · status — backed by `prompt_runs.batch_id`, one Run All = one batch).

---

## 7. Stores (the part v1's build order forgot)

The three load-bearing architecture conditions get named implementations *before* page frames exist:

1. **Page envelope:** every content blob carries `schema_version`; load = `migrate(raw)` always; migration #1 (no-op) ships with the schema.
2. **Per-pillar op stores:** all mutations flow through a store emitting discrete operations — no direct React state mutation in editors. (Keeps CRDT/Yjs open; the canvas store's scene-differ is the one sanctioned adapter, §6.2.)
3. **Session store (named, singular):** local-only (Tauri store/localStorage), keyed by page id + one window-level record. Contents: scroll positions, canvas cameras, rail width/collapsed, split layout + ratio, History-panel open, focused column, synced-scroll toggle, mermaid split ratio, well collapsed, scrubber parked-version. **Nothing in it is ever written to `pages.content` or any version row.** (Each pane owns its scroller; scroll captured on unmount — the 140ms crossfade mounts both pages briefly.)
4. **Tree index store:** `pages(id, parent_id, title, type, position)` loaded whole at launch, mutated through op-store discipline. The rail and the palette both read it; parent paths come from it (no per-keystroke queries).
5. **Page-type registry** (the widen-this-seam pattern): `{type, icon, token, palettePrefix, label, editor, historyKind, emptyState}` — rail, palette, panes, and History all derive from it; a fifth page type is one entry.
6. Schema additions this doc requires: `prompt_runs.batch_id uuid`, `prompt_runs.transport text`, `prompt_runs.starred bool`, `prompt_runs.is_best bool` (partial unique per version), nullable `cost/tokens`; `search_text` projection deferred but the per-type extractor lives beside the per-type migration module when it comes.

---

## 8. Delta ledger vs. current code

| # | Current | Change |
|---|---|---|
| 1 | `windowEffects: ["underWindowBackground", "mica"]` | `["sidebar"]` (§1.1) |
| 2 | `trafficLightPosition` (16, 20) | (16, 18); re-apply after fullscreen exit (§1.1) |
| 3 | `use-window-chrome.ts` calls `setTitle("")` | **Delete** — redundant + resets traffic lights (#13044). Hook's job becomes `onFocusChanged` + fullscreen attribute (§1.1, §4.7) |
| 4 | `index.css:142–155` `-webkit-app-region` rules | **Delete** — dead code in WKWebView; attribute mechanism is the real one (§1.1) |
| 5 | Theme provider toggles class only; no default stance | Add `setTheme()` sync; **default dark** (§1.1) |
| 6 | Root `bg-background/40`; header `backdrop-blur-md`; card `backdrop-blur-sm` | Transparent root; bench wash; zero steady-state blurs (§1.2, §1.5) |
| 7 | 56px header, logo inside, `max-w-6xl` centering, `pl-[72px]` | 48px strip + rail geometry + pane headers; logo → empty states (§4.1) |
| 8 | Dark `--primary` darker than light; hues 42/52 split | Unified hue 50, dark brightened, espresso button text (§2.1) |
| 9 | `--ring` gray | Accent (§2.1) |
| 10 | `--secondary` hue 286; pure-white light bg; near-black fg | Warm-smoke family + surface ladder + `--sheet` alpha token (§2.2) |
| 11 | DM Sans + Inter | SF chrome / Inter prose / SF Mono; drop `@fontsource-variable/dm-sans` (§2.3) |
| 12 | `--radius: 0.45rem` × multiplier chain | Explicit 5/8/10/12/16 scale (§2.4) |
| 13 | shadcn `cursor-pointer`, no press states | Four tells + mandatory `:active` fill (§3.3, §4.5) |
| 14 | Logo animation in header | Empty states/About only (§4.8) |

## 9. Build order

1. **Materials + config** — deltas #1–6, Reduce-Transparency bridge, **glass smoke test** (palette recipe over bench, checks #12804), **perf gate** (120Hz scroll/pan, busy wallpaper, both themes). Judge the bench/sheet over a bright wallpaper before continuing; wash alpha is the knob.
2. **Tokens** (§2) — mechanical.
3. **Shell** — rail, strip, tree, pane container (n=1 first, divider + n=2 same step), drag regions, fullscreen/inactive contracts, toasts, buttons, empty state #1.
4. **Stores** (§7) — envelope, session store, tree index, op-store skeletons, page-type registry. Before any page frame.
5. **Palette** (needs the tree index) + native menu bar.
6. **Motion pass** — tokens, press states, hover law, tree animation, PRM.
7. **Pages:** **prompt session → doc → mermaid → canvas** (session first: it's the daily driver and exercises the relational path; canvas last: engine boundary is the riskiest seam).

Each step ends green on the perf gate before the next begins.
