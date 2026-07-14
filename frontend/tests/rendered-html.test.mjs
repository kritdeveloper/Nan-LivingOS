import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const routes = [
  ["Home", "app/page.tsx"],
  ["Stories", "app/stories/page.tsx"],
  ["Journey", "app/journey/page.tsx"],
  ["Community", "app/community/page.tsx"],
  ["Impact", "app/impact/page.tsx"],
  ["Dashboard", "app/dashboard/page.tsx"],
  ["Settings", "app/settings/page.tsx"],
];

test("ships every NAN FLOW product route", async () => {
  for (const [name, path] of routes) {
    await assert.doesNotReject(access(new URL(path, root)), `${name} route is missing`);
    const source = await readFile(new URL(path, root), "utf8");
    assert.match(source, /export default function/, `${name} has no default page component`);
  }
});

test("uses the NAN FLOW product identity and architecture", async () => {
  const [layout, page, packageJson] = await Promise.all([
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);

  assert.match(layout, /default:\s*"NAN FLOW"/);
  assert.match(layout, /AI Decision Intelligence Platform/);
  assert.match(page, /Living knowledge/);
  assert.match(page, /Stories before places/);
  assert.match(packageJson, /"motion"/);
  assert.match(packageJson, /"mapbox-gl"/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview|SkeletonPreview/);
  assert.doesNotMatch(page, /Your site is taking shape|SkeletonPreview/);
});

test("keeps responsive, accessible, dark-mode foundations", async () => {
  const [css, shell, map] = await Promise.all([
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("app/components/ProductShell.tsx", root), "utf8"),
    readFile(new URL("app/components/LivingMap.tsx", root), "utf8"),
  ]);

  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /prefers-reduced-transparency/);
  assert.match(css, /focus-visible/);
  assert.match(css, /\.dark/);
  assert.match(shell, /aria-expanded=\{open\}/);
  assert.match(shell, /aria-label/);
  assert.match(shell, /localStorage/);
  assert.match(map, /NEXT_PUBLIC_MAPBOX_TOKEN/);
  assert.match(map, /mapboxgl\.Map/);
});
