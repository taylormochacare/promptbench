import { useEffect } from "react";
import { sessionStore } from "@/stores/session-store";

/**
 * Global shell shortcuts (design-direction §4.4). Every one of these must
 * also appear in the native menu bar when it lands (step 5).
 *   ⌘\   rail          ⌘⌥\  split
 *   ⌘1/2 focus pane    ⌘W   close focused pane (only when split)
 */
export function useShellShortcuts() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!event.metaKey) return;
      const { panePages, focusedPane } = sessionStore.get();

      if (event.code === "Backslash") {
        event.preventDefault();
        if (event.altKey) sessionStore.split();
        else sessionStore.toggleRail();
        return;
      }
      if (event.code === "Digit1" || event.code === "Digit2") {
        const index = event.code === "Digit1" ? 0 : 1;
        // Only claim the shortcut when the pane exists — a no-op ⌘2 in
        // single-pane mode shouldn't swallow the key.
        if (index < panePages.length) {
          event.preventDefault();
          sessionStore.focusPane(index);
        }
        return;
      }
      // ⌘W closes the focused pane when split; single-pane stays native.
      if (event.code === "KeyW" && panePages.length > 1) {
        event.preventDefault();
        sessionStore.closePane(focusedPane);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
