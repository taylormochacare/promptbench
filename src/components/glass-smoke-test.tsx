import { useEffect, useState } from "react";

/**
 * TEMP — build-step-1 glass smoke test (design-direction §1.3, §9.1).
 * ⌥⌘G toggles a panel using the palette glass recipe, positioned to span the
 * bench/sheet boundary. Verifies backdrop-filter renders correctly over text
 * on a transparent window (tauri-apps/tauri#12804) before the real palette
 * gets built. Delete once the command palette exists.
 */
export function GlassSmokeTest() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey && event.altKey && event.code === "KeyG") {
        event.preventDefault();
        setOpen((current) => !current);
      }
      if (event.code === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed top-24 left-40 z-50 w-[420px] rounded-2xl p-4"
      style={{
        background: "var(--glass-palette)",
        backdropFilter: "blur(28px) saturate(1.5)",
        WebkitBackdropFilter: "blur(28px) saturate(1.5)",
        boxShadow: "var(--specular), var(--shadow-palette)",
      }}
    >
      <p className="text-[15px] font-medium">Glass smoke test</p>
      <p className="mt-1 text-muted-foreground">
        Palette recipe over the bench/sheet boundary. Check: no misrendered
        text behind the panel, edge highlight visible, blur samples the sheet
        (not the desktop — that is expected and correct).
      </p>
      <div className="mt-3 space-y-1">
        {["Row one — 13px chrome type", "Row two — hover me later", "Row three — Esc closes"].map(
          (row) => (
            <div key={row} className="rounded-[5px] px-2 py-1.5 hover:bg-pill-hover">
              {row}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
