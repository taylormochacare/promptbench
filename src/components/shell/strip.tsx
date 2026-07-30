import { PanelLeft, Columns2 } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { sessionStore, useSession } from "@/stores/session-store";
import { cn } from "@/lib/utils";

/** The bench — strip. Mostly honest drag surface; global actions right. */
export function Strip() {
  const { railCollapsed, panePages, uiZoom } = useSession();
  const split = panePages.length > 1;
  const zoomLabel = `${Math.round(uiZoom * 100)}%`;

  return (
    <header
      className={cn(
        "flex h-12 shrink-0 items-center bg-bench-wash pr-3",
        // When the rail is collapsed the strip spans the window; leave room
        // for the traffic lights (reclaimed under data-fullscreen later).
        railCollapsed ? "pl-[84px]" : "pl-3",
      )}
      data-tauri-drag-region="deep"
    >
      <div className="flex items-center gap-1" data-tauri-drag-region="false">
        <button
          type="button"
          aria-label="Toggle sidebar"
          title="Toggle sidebar ⌘\"
          onClick={sessionStore.toggleRail}
          className="rounded-[5px] p-1.5 text-muted-foreground hover:bg-pill-hover active:bg-pill-selected"
        >
          <PanelLeft className="size-4" />
        </button>
        {!split && (
          <button
            type="button"
            aria-label="Split view"
            title="Split ⌘⌥\"
            onClick={sessionStore.split}
            className="rounded-[5px] p-1.5 text-muted-foreground hover:bg-pill-hover active:bg-pill-selected"
          >
            <Columns2 className="size-4" />
          </button>
        )}
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2" data-tauri-drag-region="false">
        {uiZoom !== 1 && (
          <button
            type="button"
            aria-label={`Reset zoom (${zoomLabel})`}
            title="Reset zoom ⌘0"
            onClick={sessionStore.resetZoom}
            className="rounded-[5px] px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-muted-foreground hover:bg-pill-hover active:bg-pill-selected"
          >
            {zoomLabel}
          </button>
        )}
        <ThemeSwitcher />
      </div>
    </header>
  );
}
