/**
 * Verifies Tauri drag-region behavior matches drag.js semantics (tauri 2.11.x).
 * Run: node scripts/verify-drag-region.mjs
 */

const CLICKABLE_TAGS = new Set([
  "A",
  "BUTTON",
  "INPUT",
  "SELECT",
  "TEXTAREA",
  "LABEL",
  "SUMMARY",
]);

const INTERACTIVE_ROLES = new Set([
  "button",
  "link",
  "menuitem",
  "tab",
  "checkbox",
  "radio",
  "switch",
  "option",
]);

function isClickableElement(el) {
  return (
    CLICKABLE_TAGS.has(el.tagName) ||
    (el.hasAttribute("contenteditable") &&
      el.getAttribute("contenteditable") !== "false") ||
    (el.hasAttribute("tabindex") && el.getAttribute("tabindex") !== "-1") ||
    INTERACTIVE_ROLES.has(el.getAttribute("role"))
  );
}

function isDragRegion(composedPath) {
  for (const el of composedPath) {
    if (!(el instanceof Object && "getAttribute" in el)) continue;

    const attr = el.getAttribute("data-tauri-drag-region");

    if (isClickableElement(el) && attr === null) return false;
    if (attr === null) continue;
    if (attr === "false") return false;
    if (attr === "deep") return true;
    if (attr === "" || attr === "true") return el === composedPath[0];
  }

  return false;
}

function makeElement(tag, attrs = {}) {
  return {
    tagName: tag.toUpperCase(),
    getAttribute(name) {
      return attrs[name] ?? null;
    },
    hasAttribute(name) {
      return name in attrs;
    },
  };
}

const header = makeElement("header", { "data-tauri-drag-region": "deep" });
const inner = makeElement("div");
const logo = makeElement("div");
const themeWrap = makeElement("div", { "data-tauri-drag-region": "false" });
const button = makeElement("button");

const cases = [
  {
    name: "header padding (direct hit on header)",
    path: [header],
    bare: true,
    deep: true,
  },
  {
    name: "logo area (child of deep header)",
    path: [logo, inner, header],
    bare: false,
    deep: true,
  },
  {
    name: "center titlebar empty space (inner div)",
    path: [inner, header],
    bare: false,
    deep: true,
  },
  {
    name: "theme switcher button (clickable, excluded by false wrapper)",
    path: [button, themeWrap, inner, header],
    bare: false,
    deep: false,
  },
];

let failed = 0;

for (const testCase of cases) {
  const result = isDragRegion(testCase.path);
  const expected = testCase.deep;
  const ok = result === expected;
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${testCase.name}: expected=${expected}, got=${result}`);
}

if (failed > 0) {
  console.error(`\n${failed} drag-region logic test(s) failed`);
  process.exit(1);
}

console.log("\nAll drag-region logic tests passed.");
