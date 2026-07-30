import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Minus, Plus, Settings } from "lucide-react";
import { useTheme, type Theme } from "@/components/theme-provider";
import {
  sessionStore,
  useSession,
  UI_ZOOM_MAX,
  UI_ZOOM_MIN,
} from "@/stores/session-store";
import { cn } from "@/lib/utils";

/**
 * Boutique settings — calm Apple/Cursor gear energy, promptbench tone:
 * glass popover only (design-direction L5), 13px chrome, amber for state,
 * no dashboard cards. Theme + zoom live here (strip theme switcher retires).
 */
export function SettingsTrigger({
  className,
  tone = "bench",
}: {
  className?: string;
  tone?: "bench" | "strip";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label="Settings"
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Settings"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "rounded-[5px] p-1.5 transition-colors duration-[80ms]",
          tone === "bench"
            ? "text-sidebar-foreground/50 hover:bg-pill-hover hover:text-sidebar-foreground/80 active:bg-pill-selected"
            : "text-muted-foreground hover:bg-pill-hover active:bg-pill-selected",
          open && (tone === "bench" ? "bg-pill-selected text-sidebar-foreground/80" : "bg-pill-selected"),
        )}
      >
        <Settings className="size-4" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-labelledby={titleId}
          className={cn(
            "absolute z-50 w-[272px] overflow-hidden rounded-xl p-1.5",
            tone === "bench" ? "bottom-10 left-0" : "top-10 right-0",
          )}
          style={{
            background: "var(--glass-popover)",
            boxShadow: "var(--shadow-overlay), var(--specular)",
            backdropFilter: "blur(20px) saturate(1.4)",
            WebkitBackdropFilter: "blur(20px) saturate(1.4)",
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="px-2.5 pb-1.5 pt-2">
            <h2
              id={titleId}
              className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground"
            >
              Settings
            </h2>
          </div>

          <Section label="Appearance">
            <ThemeSegment />
          </Section>

          <Section label="Display">
            <ZoomRow />
          </Section>

          <Section label="Window">
            <HintRow keys="⌘\\" label="Toggle rail" />
            <HintRow keys="⌥⌘\\" label="Split pane" />
            <HintRow keys="⌘+/⌘-" label="Zoom sheet" />
            <HintRow keys="⌘0" label="Reset zoom" />
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-1 rounded-[10px] bg-background/35 px-1 py-1 last:mb-0">
      <div className="px-2 pb-1 pt-1.5 text-[11px] font-medium text-muted-foreground">
        {label}
      </div>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

function ThemeSegment() {
  const { theme, setTheme } = useTheme();
  const options: { value: Theme; label: string }[] = [
    { value: "dark", label: "Dark" },
    { value: "light", label: "Light" },
  ];

  return (
    <div
      className="mx-1 mb-1 flex h-8 rounded-[7px] bg-surface-sunken p-0.5"
      role="radiogroup"
      aria-label="Theme"
    >
      {options.map((option) => {
        const selected = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(option.value)}
            className={cn(
              "flex-1 rounded-[5px] text-[12px] transition-colors duration-[80ms]",
              selected
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ZoomRow() {
  const { uiZoom } = useSession();
  const label = `${Math.round(uiZoom * 100)}%`;
  const atMin = uiZoom <= UI_ZOOM_MIN;
  const atMax = uiZoom >= UI_ZOOM_MAX;

  return (
    <div className="flex h-8 items-center gap-1 px-1.5">
      <button
        type="button"
        aria-label="Zoom out"
        disabled={atMin}
        onClick={sessionStore.zoomOut}
        className="rounded-[5px] p-1 text-muted-foreground hover:bg-pill-hover disabled:opacity-30"
      >
        <Minus className="size-3.5" />
      </button>
      <button
        type="button"
        aria-label={`Zoom ${label}. Click to reset`}
        title="Reset zoom ⌘0"
        onClick={sessionStore.resetZoom}
        className="min-w-[3.25rem] flex-1 rounded-[5px] py-1 text-center font-mono text-[12px] tabular-nums text-foreground hover:bg-pill-hover"
      >
        {label}
      </button>
      <button
        type="button"
        aria-label="Zoom in"
        disabled={atMax}
        onClick={sessionStore.zoomIn}
        className="rounded-[5px] p-1 text-muted-foreground hover:bg-pill-hover disabled:opacity-30"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

function HintRow({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex h-7 items-center justify-between gap-3 px-2 text-[12px]">
      <span className="text-foreground/85">{label}</span>
      <kbd className="rounded-[4px] border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
        {keys}
      </kbd>
    </div>
  );
}
