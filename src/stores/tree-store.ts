import { useSyncExternalStore } from "react";

/**
 * The tree index store (design-direction §7.4): every page's identity row,
 * loaded whole, mutated through discrete operations. Persistence is
 * localStorage today; the same operation surface moves to Supabase in M2 —
 * callers never touch storage directly.
 */
export type PageType = "doc" | "canvas" | "mermaid" | "prompt";

export interface PageRow {
  id: string;
  parentId: string | null;
  type: PageType;
  title: string;
  position: number;
  /** Content envelope (design-direction §7.1): versioned per type. */
  content: { schemaVersion: number; [key: string]: unknown };
  updatedAt: number;
}

const STORAGE_KEY = "promptbench:tree:v1";

function emptyContent(type: PageType): PageRow["content"] {
  switch (type) {
    case "doc":
      return { schemaVersion: 1, text: "" };
    case "mermaid":
      return { schemaVersion: 1, source: "" };
    case "canvas":
      return { schemaVersion: 1, elements: [], files: {} };
    case "prompt":
      return { schemaVersion: 1, draft: "", models: [] };
  }
}

function load(): PageRow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const rows = JSON.parse(raw) as PageRow[];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

let rows: PageRow[] = load();
const listeners = new Set<() => void>();
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function commit(next: PageRow[]) {
  rows = next;
  listeners.forEach((fn) => fn());
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    } catch (error) {
      console.warn("tree persist failed", error);
    }
  }, 300);
}

export const treeStore = {
  get: () => rows,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  createPage(type: PageType, parentId: string | null = null): PageRow {
    const siblings = rows.filter((r) => r.parentId === parentId);
    const position =
      siblings.length > 0 ? Math.max(...siblings.map((r) => r.position)) + 1 : 1;
    const page: PageRow = {
      id: crypto.randomUUID(),
      parentId,
      type,
      title: "",
      position,
      content: emptyContent(type),
      updatedAt: Date.now(),
    };
    commit([...rows, page]);
    return page;
  },

  renamePage(id: string, title: string) {
    commit(
      rows.map((r) => (r.id === id ? { ...r, title, updatedAt: Date.now() } : r)),
    );
  },

  /** Deletes the page and its whole subtree. */
  deletePage(id: string) {
    const doomed = new Set<string>([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const r of rows) {
        if (r.parentId && doomed.has(r.parentId) && !doomed.has(r.id)) {
          doomed.add(r.id);
          grew = true;
        }
      }
    }
    commit(rows.filter((r) => !doomed.has(r.id)));
  },

  updateContent(id: string, patch: Record<string, unknown>) {
    commit(
      rows.map((r) =>
        r.id === id
          ? { ...r, content: { ...r.content, ...patch }, updatedAt: Date.now() }
          : r,
      ),
    );
  },
};

export function useTree(): PageRow[] {
  return useSyncExternalStore(treeStore.subscribe, treeStore.get);
}

export function usePage(id: string | null): PageRow | null {
  const all = useTree();
  return id ? (all.find((r) => r.id === id) ?? null) : null;
}
