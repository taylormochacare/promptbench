import { useSyncExternalStore } from "react";

/**
 * The session store (design-direction §7.3): window-level, local-only UI
 * state. Nothing in here is ever written to page content or any version row.
 * Persisted to localStorage; safe to lose.
 */
export interface SessionState {
  railCollapsed: boolean;
  railWidth: number; // 200–340
  /** Pane layout: 1–2 entries; null = empty pane awaiting a page. */
  panePages: (string | null)[];
  paneRatio: number; // width share of pane 0, 0.2–0.8
  focusedPane: number;
}

const STORAGE_KEY = "promptbench:session:v1";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const DEFAULTS: SessionState = {
  railCollapsed: false,
  railWidth: 240,
  panePages: [null],
  paneRatio: 0.5,
  focusedPane: 0,
};

function load(): SessionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<SessionState>;
    // Persisted values are untrusted (manual edits, older schema): clamp
    // everything back into range, and cross-validate focusedPane.
    const panePages =
      Array.isArray(parsed.panePages) && parsed.panePages.length > 0
        ? parsed.panePages.slice(0, 2)
        : DEFAULTS.panePages;
    return {
      ...DEFAULTS,
      ...parsed,
      panePages,
      railWidth: clamp(
        typeof parsed.railWidth === "number" ? parsed.railWidth : DEFAULTS.railWidth,
        200,
        340,
      ),
      paneRatio: clamp(
        typeof parsed.paneRatio === "number" ? parsed.paneRatio : DEFAULTS.paneRatio,
        0.2,
        0.8,
      ),
      focusedPane: parsed.focusedPane === 1 && panePages.length > 1 ? 1 : 0,
    };
  } catch {
    return DEFAULTS;
  }
}

let state: SessionState = load();
const listeners = new Set<() => void>();
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function set(patch: Partial<SessionState>) {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* session state is safe to lose */
    }
  }, 250);
}

export const sessionStore = {
  get: () => state,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  toggleRail: () => set({ railCollapsed: !state.railCollapsed }),
  setRailWidth: (width: number) => set({ railWidth: clamp(width, 200, 340) }),

  /** Open the split; the new pane starts empty and takes focus. */
  split() {
    if (state.panePages.length > 1) return;
    set({ panePages: [state.panePages[0], null], paneRatio: 0.5, focusedPane: 1 });
  },
  closePane(index: number) {
    if (state.panePages.length < 2) return;
    const remaining = state.panePages.filter((_, i) => i !== index);
    set({ panePages: remaining, focusedPane: 0, paneRatio: 0.5 });
  },
  focusPane(index: number) {
    if (index < state.panePages.length) set({ focusedPane: index });
  },
  setPaneRatio: (ratio: number) => set({ paneRatio: clamp(ratio, 0.2, 0.8) }),
  setPanePage(index: number, pageId: string | null) {
    if (index < 0 || index >= state.panePages.length) return;
    const panePages = state.panePages.slice();
    panePages[index] = pageId;
    set({ panePages });
  },
};

export function useSession(): SessionState {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.get);
}
