import { useCallback, useRef } from "react";
import { X } from "lucide-react";
import { Logo } from "@/components/logo";
import { PageBody } from "@/components/shell/pane-content";
import { pageDisplayTitle, pageTypeInfo } from "@/lib/page-types";
import { sessionStore, useSession } from "@/stores/session-store";
import { usePage, useTree } from "@/stores/tree-store";
import { cn } from "@/lib/utils";

const PANE_MIN = 360;

function EmptyPane() {
  const hasPages = useTree().length > 0;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <Logo />
      <p className="text-muted-foreground">
        {hasPages ? "Pick a page from the rail." : "Create your first page."}
      </p>
      <p className="text-[11px] text-muted-foreground/60">
        {hasPages ? "⌥-click a page to open it split" : "The + button in the rail, top left"}
      </p>
    </div>
  );
}

function Pane({ index, split }: { index: number; split: boolean }) {
  const { focusedPane, panePages } = useSession();
  const focused = focusedPane === index;
  const page = usePage(panePages[index] ?? null);
  const info = page ? pageTypeInfo(page.type) : null;
  const Icon = info?.icon;

  return (
    <section
      className="flex h-full min-w-0 flex-1 flex-col"
      onPointerDown={() => sessionStore.focusPane(index)}
    >
      {/* Pane header — 28px: breadcrumb + hover close when split */}
      <header className="group flex h-7 shrink-0 items-center justify-between px-3">
        <span
          className={cn(
            "flex min-w-0 items-center gap-1.5 truncate text-xs",
            focused ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {Icon && (
            <Icon
              className="size-3.5 shrink-0"
              style={focused && info ? { color: info.tint } : undefined}
              aria-hidden
            />
          )}
          <span className="truncate">
            {page ? pageDisplayTitle(page.title) : "—"}
          </span>
        </span>
        {split && (
          <button
            type="button"
            aria-label="Close pane"
            onClick={() => sessionStore.closePane(index)}
            className="rounded-[5px] p-0.5 text-muted-foreground opacity-0 transition-opacity duration-[80ms] group-hover:opacity-100 hover:bg-pill-hover active:bg-pill-selected"
          >
            <X className="size-3.5" />
          </button>
        )}
      </header>
      <div className="min-h-0 flex-1">
        {page ? <PageBody page={page} /> : <EmptyPane />}
      </div>
    </section>
  );
}

/**
 * The sheet: an array of panes rendering n=1 or n=2 (design-direction §4.2).
 * Divider: 1:1 drag, double-click resets 50/50, panes clamp at 360px.
 */
export function PaneContainer() {
  const { panePages, paneRatio, uiZoom } = useSession();
  const containerRef = useRef<HTMLDivElement>(null);
  const split = panePages.length > 1;

  const onDividerPointerDown = useCallback((event: React.PointerEvent) => {
    const container = containerRef.current;
    if (!container) return;
    event.preventDefault();
    const { left, width } = container.getBoundingClientRect();
    // Cap at 0.5 so narrow windows (< 2×PANE_MIN) degrade to a locked
    // 50/50 divider instead of a crossed clamp range that jams the drag.
    const minRatio = Math.min(0.5, Math.max(0.2, PANE_MIN / width));
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);

    const onMove = (move: PointerEvent) => {
      const ratio = (move.clientX - left) / width;
      sessionStore.setPaneRatio(
        Math.min(1 - minRatio, Math.max(minRatio, ratio)),
      );
    };
    const onUp = () => {
      target.releasePointerCapture(event.pointerId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, []);

  return (
    <main
      ref={containerRef}
      className="flex min-h-0 flex-1 origin-top-left rounded-tl-lg bg-sheet"
      style={{
        boxShadow: "var(--shadow-seam)",
        // WKWebView supports CSS zoom; scales sheet content only (bench stays native).
        zoom: uiZoom,
      }}
    >
      <div
        className="min-w-0"
        style={{ flexBasis: split ? `${paneRatio * 100}%` : "100%" }}
      >
        <Pane index={0} split={split} />
      </div>

      {split && (
        <>
          <div
            role="separator"
            aria-orientation="vertical"
            className="relative w-px shrink-0 cursor-col-resize bg-border-strong"
            onPointerDown={onDividerPointerDown}
            onDoubleClick={() => sessionStore.setPaneRatio(0.5)}
          >
            {/* 8px grab zone around the 1px line */}
            <div className="absolute inset-y-0 -left-1 -right-1" />
          </div>
          <div className="min-w-0 flex-1">
            <Pane index={1} split={split} />
          </div>
        </>
      )}
    </main>
  );
}
