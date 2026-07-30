import { Settings } from "lucide-react";
import { GlassSmokeTest } from "@/components/glass-smoke-test";
import { Logo } from "@/components/logo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useWindowChrome } from "@/hooks/use-window-chrome";

/** Placeholder tree rows — rhythm preview only; the real tree is build step 3. */
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

export default function App() {
  useWindowChrome();

  return (
    <div className="flex h-svh w-full overflow-hidden">
      {/* The bench — rail. Real vibrancy shows through the wash. */}
      <aside
        className="flex w-60 shrink-0 flex-col bg-bench-wash pt-12"
        data-tauri-drag-region="deep"
      >
        <GhostRows />
        <div className="mt-auto flex h-11 items-center px-4" data-tauri-drag-region="false">
          <Settings className="size-4 text-sidebar-foreground/40" aria-hidden />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* The bench — strip. Mostly honest drag surface. */}
        <header
          className="flex h-12 shrink-0 items-center justify-end bg-bench-wash px-3"
          data-tauri-drag-region="deep"
        >
          <div data-tauri-drag-region="false">
            <ThemeSwitcher />
          </div>
        </header>

        {/* The sheet — flush right/bottom, seam + one 10px corner. */}
        <main
          className="min-h-0 flex-1 rounded-tl-lg bg-sheet"
          style={{ boxShadow: "var(--shadow-seam)" }}
        >
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <Logo />
            <p className="text-muted-foreground">The bench is ready.</p>
            <p className="text-[11px] text-muted-foreground/60">
              <kbd className="rounded-[5px] border border-border px-1.5 py-0.5 font-mono text-[10px]">
                ⌥⌘G
              </kbd>{" "}
              glass smoke test
            </p>
          </div>
        </main>
      </div>

      <GlassSmokeTest />
    </div>
  );
}
