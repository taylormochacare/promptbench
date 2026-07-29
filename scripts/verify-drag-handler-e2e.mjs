/**
 * Verifies live frontend source served by Vite includes correct drag-region markup.
 * Run with dev server: node scripts/verify-drag-handler-e2e.mjs
 */

const APP_URL = process.env.APP_URL ?? "http://localhost:1420";

const response = await fetch(`${APP_URL}/src/App.tsx`);
if (!response.ok) {
  console.error(`FAIL could not load ${APP_URL}/src/App.tsx: ${response.status}`);
  process.exit(1);
}

const source = await response.text();
let failed = 0;

function assert(name, condition) {
  if (!condition) {
    failed += 1;
    console.log(`FAIL ${name}`);
    return;
  }
  console.log(`PASS ${name}`);
}

assert('header uses data-tauri-drag-region="deep"', /data-tauri-drag-region": "deep"/.test(source));
assert(
  "theme switcher is excluded from drag",
  /data-tauri-drag-region": "false"/.test(source),
);

if (failed > 0) {
  console.error(`\n${failed} source verification test(s) failed`);
  process.exit(1);
}

console.log("\nAll source verification tests passed.");
