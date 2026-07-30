import { useEffect } from "react";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Window-state contracts (design-direction §1.1, §4.7):
 * - data-window-inactive  → chrome mutes, --accent-ui remaps; sheet content never dims
 * - data-fullscreen       → rail reclaims the traffic-light reservation
 * - data-reduce-transparency → opaque fallbacks (WebKit has no media query for it)
 *
 * Never call setTitle here: it resets the custom traffic-light position
 * (tauri-apps/tauri#13044). Config `title: ""` + `hiddenTitle` already handle it.
 */
export function useWindowChrome() {
  useEffect(() => {
    if (!isTauri()) return;

    const root = document.documentElement;
    const unlisteners: Array<() => void> = [];
    let disposed = false;

    void (async () => {
      const [{ getCurrentWindow }, { invoke }] = await Promise.all([
        import("@tauri-apps/api/window"),
        import("@tauri-apps/api/core"),
      ]);
      if (disposed) return;
      const win = getCurrentWindow();

      const syncReduceTransparency = async () => {
        try {
          const reduced = await invoke<boolean>("reduce_transparency");
          root.toggleAttribute("data-reduce-transparency", reduced);
        } catch (error) {
          console.warn("reduce_transparency check failed", error);
        }
      };

      const syncFullscreen = async () => {
        try {
          root.toggleAttribute("data-fullscreen", await win.isFullscreen());
        } catch (error) {
          console.warn("fullscreen check failed", error);
        }
      };

      await Promise.all([syncReduceTransparency(), syncFullscreen()]);

      // Unmount can land between any of these awaits: re-check `disposed`
      // after each registration and immediately unlisten if it did.
      const register = (unlisten: () => void) => {
        if (disposed) unlisten();
        else unlisteners.push(unlisten);
      };
      try {
        register(
          await win.onFocusChanged(({ payload: focused }) => {
            root.toggleAttribute("data-window-inactive", !focused);
            // Cheap poll point for the accessibility setting — no native
            // notification observer yet; re-check whenever focus returns.
            if (focused) void syncReduceTransparency();
          }),
        );
        register(await win.onResized(() => void syncFullscreen()));
      } catch (error) {
        console.warn("window listener registration failed", error);
      }
    })();

    return () => {
      disposed = true;
      unlisteners.forEach((fn) => fn());
    };
  }, []);
}
