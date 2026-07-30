import { Settings } from "lucide-react";
import { useSession } from "@/stores/session-store";

/** Placeholder tree rows — rhythm preview only; the real tree is next. */
function GhostRows() {
  return (
    <div className="mt-2 space-y-px px-2">
      {["Getting started", "Architecture", "Prompt experiments"].map((label) => (
        <div
          key={label}
          className="flex h-7 items-center gap-2 rounded-[5px] px-2 text-sidebar-foreground/45"
        >
          <span className="size-1.5 rounded-full bg-current opacity-50" />
          <span className="truncate">{label}</span>
        </div>
      ))}
    </div>
  );
}

/** The bench — rail. Real vibrancy shows through the wash. */
export function Rail() {
  const { railCollapsed, railWidth } = useSession();
  if (railCollapsed) return null;

  return (
    <aside
      className="flex shrink-0 flex-col bg-bench-wash pt-12"
      style={{ width: railWidth }}
      data-tauri-drag-region="deep"
    >
      <GhostRows />
      <div
        className="mt-auto flex h-11 items-center px-4"
        data-tauri-drag-region="false"
      >
        <Settings className="size-4 text-sidebar-foreground/40" aria-hidden />
      </div>
    </aside>
  );
}
