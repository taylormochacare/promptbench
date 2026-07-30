import { useEffect, useRef, useState } from "react";
import { treeStore, type PageRow } from "@/stores/tree-store";

/**
 * Debounced content field: local state while typing, flushed to the tree
 * store after 300ms idle and on unmount. Store persistence has its own
 * debounce behind this.
 */
function useDraftField(page: PageRow, key: string) {
  const [value, setValue] = useState<string>(
    typeof page.content[key] === "string" ? (page.content[key] as string) : "",
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(value);
  latest.current = value;

  // Re-seed when a different page mounts into this pane.
  const pageId = page.id;
  useEffect(() => {
    setValue(
      typeof treeStore
        .get()
        .find((r) => r.id === pageId)?.content[key] === "string"
        ? (treeStore.get().find((r) => r.id === pageId)!.content[key] as string)
        : "",
    );
  }, [pageId, key]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      treeStore.updateContent(pageId, { [key]: latest.current });
    };
  }, [pageId, key]);

  const onChange = (next: string) => {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => treeStore.updateContent(pageId, { [key]: next }),
      300,
    );
  };

  return [value, onChange] as const;
}

function DocPage({ page }: { page: PageRow }) {
  const [text, setText] = useDraftField(page, "text");
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[68ch] px-6 pt-10 pb-24">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Start writing…"
          spellCheck={false}
          className="min-h-[60vh] w-full resize-none select-text bg-transparent font-prose text-[16px] leading-[1.7] text-foreground outline-none placeholder:text-muted-foreground/50"
          style={{ cursor: "text" }}
        />
        <p className="mt-2 text-[11px] text-muted-foreground/40">
          Plain text for now — the real editor lands in M4.
        </p>
      </div>
    </div>
  );
}

function MermaidPage({ page }: { page: PageRow }) {
  const [source, setSource] = useDraftField(page, "source");
  return (
    <div className="flex h-full">
      <div className="w-[44%] shrink-0 border-r border-border-strong bg-surface-sunken">
        <textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder={"flowchart TD\n  a --> b"}
          spellCheck={false}
          className="h-full w-full resize-none select-text bg-transparent p-4 font-mono text-[13px] leading-5 text-foreground outline-none placeholder:text-muted-foreground/40"
          style={{ cursor: "text" }}
        />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground/50">Preview renders here — M5.</p>
      </div>
    </div>
  );
}

function CanvasPage() {
  return (
    <div
      className="flex h-full items-center justify-center"
      style={{
        backgroundImage:
          "radial-gradient(color-mix(in oklch, var(--foreground) 5%, transparent) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <p className="text-muted-foreground/50">Canvas engine lands in M6.</p>
    </div>
  );
}

function PromptPage({ page }: { page: PageRow }) {
  const [draft, setDraft] = useDraftField(page, "draft");
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="rounded-lg bg-surface-sunken">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write the prompt…"
          spellCheck={false}
          className="max-h-[40vh] min-h-24 w-full resize-y select-text bg-transparent p-4 font-mono text-[13px] leading-5 text-foreground outline-none placeholder:text-muted-foreground/40"
          style={{ cursor: "text" }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground/40">
        Draft persists. Model columns and the runner arrive with M2.
      </p>
    </div>
  );
}

export function PageBody({ page }: { page: PageRow }) {
  switch (page.type) {
    case "doc":
      return <DocPage page={page} />;
    case "mermaid":
      return <MermaidPage page={page} />;
    case "canvas":
      return <CanvasPage />;
    case "prompt":
      return <PromptPage page={page} />;
  }
}
