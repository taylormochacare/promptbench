import { useEffect } from "react";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function useWindowChrome() {
  useEffect(() => {
    if (!isTauri()) return;

    void import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
      void getCurrentWindow().setTitle("");
    });
  }, []);
}
