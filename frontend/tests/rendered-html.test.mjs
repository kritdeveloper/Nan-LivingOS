import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const routes = [
  ["Landing", "app/page.tsx"],
  ["Explorer", "app/explorer/page.tsx"],
  ["Knowledge Graph", "app/knowledge-graph/page.tsx"],
  ["AI Chat", "app/ai-chat/page.tsx"],
  ["Community Portal", "app/community/page.tsx"],
  ["Dashboard", "app/dashboard/page.tsx"],
  ["Map", "app/map/page.tsx"],
];

test("ships every Nan Living OS product route", async () => {
  for (const [name, path] of routes) {
    await assert.doesNotReject(access(new URL(path, root)), `${name} route is missing`);
    const source = await readFile(new URL(path, root), "utf8");
    assert.match(source, /export default function/, `${name} has no default page component`);
  }
});

test("uses finished product metadata and no starter preview", async () => {
  const [layout, page, packageJson] = await Promise.all([
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);

  assert.match(layout, /title:\s*"Nan Living OS"/);
  assert.match(layout, /Discover the living stories, people, and landscapes of Nan/);
  assert.match(page, /Living OS/);
  assert.match(packageJson, /"name":\s*"nan-living-os-web"/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview|SkeletonPreview/);
  assert.doesNotMatch(page, /Your site is taking shape|SkeletonPreview/);
  await assert.rejects(access(new URL("app/_sites-preview/SkeletonPreview.tsx", root)));
});

test("keeps shared responsive and accessibility foundations", async () => {
  const [css, shell] = await Promise.all([
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("app/components/AppShell.tsx", root), "utf8"),
  ]);

  assert.match(css, /@media\s*\(max-width:520px\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /focus-visible/);
  assert.match(shell, /aria-expanded=\{open\}/);
  assert.match(shell, /sidebar-backdrop/);
  assert.match(shell, /event\.key === "Escape"/);
});
