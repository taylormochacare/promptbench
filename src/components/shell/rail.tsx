import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { SettingsTrigger } from "@/components/shell/settings-panel";
import { PAGE_TYPES, pageDisplayTitle, pageTypeInfo } from "@/lib/page-types";
import { sessionStore, useSession } from "@/stores/session-store";
import { treeStore, useTree, type PageRow } from "@/stores/tree-store";
import { cn } from "@/lib/utils";

function TreeRow({ page }: { page: PageRow }) {
  const { panePages, focusedPane } = useSession();
  const selected = panePages.includes(page.id);
  const [editing, setEditing] = useState(page.title === "");
  const inputRef = useRef<HTMLInputElement>(null);
  const info = pageTypeInfo(page.type);
  const Icon = info.icon;

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const open = (event: React.MouseEvent) => {
    if (editing) return;
    if (event.altKey && panePages.length === 1) {
      sessionStore.split();
      sessionStore.setPanePage(1, page.id);
    } else {
      sessionStore.setPanePage(focusedPane, page.id);
    }
  };

  const commitRename = () => {
    const value = inputRef.current?.value ?? "";
    treeStore.renamePage(page.id, value.trim());
    setEditing(false);
  };

  return (
    <div
      className={cn(
        "group flex h-7 cursor-default items-center gap-2 rounded-[5px] px-2",
        selected ? "bg-pill-selected" : "hover:bg-pill-hover",
      )}
      onClick={open}
      onDoubleClick={() => setEditing(true)}
      data-tauri-drag-region="false"
    >
      <Icon
        className="size-4 shrink-0"
        style={{ color: selected ? info.tint : "var(--sidebar-foreground)" }}
        aria-hidden
      />
      {editing ? (
        <input
          ref={inputRef}
          defaultValue={page.title}
          placeholder="Untitled"
          className="min-w-0 flex-1 bg-transparent text-sidebar-foreground outline-none placeholder:text-sidebar-foreground/35"
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") setEditing(false);
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="min-w-0 flex-1 truncate text-sidebar-foreground/90">
          {pageDisplayTitle(page.title)}
        </span>
      )}
      {!editing && (
        <button
          type="button"
          aria-label={`Delete ${pageDisplayTitle(page.title)}`}
          className="rounded-[4px] p-0.5 text-sidebar-foreground/40 opacity-0 transition-opacity duration-[80ms] group-hover:opacity-100 hover:bg-pill-hover hover:text-destructive active:bg-pill-selected"
          onClick={(e) => {
            e.stopPropagation();
            treeStore.deletePage(page.id);
            sessionStore.get().panePages.forEach((pid, i) => {
              if (pid === page.id) sessionStore.setPanePage(i, null);
            });
          }}
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </div>
  );
}

function NewPageMenu({ onClose }: { onClose: () => void }) {
  const { focusedPane } = useSession();
  return (
    <div
      className="absolute left-2 top-9 z-20 w-40 rounded-xl border border-border p-1"
      style={{ background: "var(--surface-overlay)", boxShadow: "var(--shadow-overlay)" }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {PAGE_TYPES.map(({ type, label, icon: Icon, tint }) => (
        <button
          key={type}
          type="button"
          className="flex h-7 w-full items-center gap-2 rounded-[5px] px-2 text-foreground hover:bg-pill-hover active:bg-pill-selected"
          onClick={() => {
            const page = treeStore.createPage(type);
            sessionStore.setPanePage(focusedPane, page.id);
            onClose();
          }}
        >
          <Icon className="size-4" style={{ color: tint }} aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}

/** The bench — rail: the real tree. */
export function Rail() {
  const { railCollapsed, railWidth } = useSession();
  const pages = useTree();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menuOpen]);

  if (railCollapsed) return null;

  const roots = pages
    .filter((p) => p.parentId === null)
    .sort((a, b) => a.position - b.position);

  return (
    <aside
      className="relative flex shrink-0 flex-col bg-bench-wash pt-12"
      style={{ width: railWidth }}
      data-tauri-drag-region="deep"
    >
      <div
        className="flex items-center justify-between px-3 pb-1"
        data-tauri-drag-region="false"
      >
        <span className="text-[11px] font-medium uppercase tracking-wide text-sidebar-foreground/40">
          Pages
        </span>
        <button
          type="button"
          aria-label="New page"
          title="New page"
          onClick={() => setMenuOpen((v) => !v)}
          onPointerDown={(e) => e.stopPropagation()}
          className="rounded-[5px] p-1 text-sidebar-foreground/50 hover:bg-pill-hover active:bg-pill-selected"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
      {menuOpen && <NewPageMenu onClose={() => setMenuOpen(false)} />}

      <div className="min-h-0 flex-1 space-y-px overflow-y-auto px-2">
        {roots.length === 0 ? (
          <p className="px-2 pt-2 text-[12px] leading-5 text-sidebar-foreground/35">
            No pages yet.
          </p>
        ) : (
          roots.map((page) => <TreeRow key={page.id} page={page} />)
        )}
      </div>

      <div
        className="mt-auto flex h-11 shrink-0 items-center px-3"
        data-tauri-drag-region="false"
      >
        <SettingsTrigger tone="bench" />
      </div>
    </aside>
  );
}
