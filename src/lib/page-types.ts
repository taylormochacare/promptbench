import {
  FileText,
  PenTool,
  GitBranch,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import type { PageType } from "@/stores/tree-store";

/**
 * The page-type registry (design-direction §7.5) — the seam to widen when a
 * fifth type arrives. Rail, new-page menu, and panes all derive from this.
 */
export interface PageTypeInfo {
  type: PageType;
  label: string;
  icon: LucideIcon;
  /** CSS color for the type's identity tint (icons only, never buttons). */
  tint: string;
}

export const PAGE_TYPES: PageTypeInfo[] = [
  { type: "doc", label: "Doc", icon: FileText, tint: "var(--type-doc)" },
  { type: "canvas", label: "Canvas", icon: PenTool, tint: "var(--type-canvas)" },
  { type: "mermaid", label: "Diagram", icon: GitBranch, tint: "var(--type-mermaid)" },
  { type: "prompt", label: "Prompt", icon: Terminal, tint: "var(--type-prompt)" },
];

export const pageTypeInfo = (type: PageType): PageTypeInfo =>
  PAGE_TYPES.find((t) => t.type === type) ?? PAGE_TYPES[0];

export const pageDisplayTitle = (title: string): string =>
  title.trim() === "" ? "Untitled" : title;
