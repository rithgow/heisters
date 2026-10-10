import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import {
  FILES,
  clone,
  validateData,
  generatedFiles,
  externalURL,
  assetURL,
  contrast,
} from "../website/assets/content.js";
const root = new URL("../website/", import.meta.url);
const data = Object.fromEntries(
  await Promise.all(
    FILES.map(async (key) => [
      key,
      JSON.parse(await readFile(new URL(`data/${key}.json`, root), "utf8")),
    ]),
  ),
);
test("Defaults are valid, honest, and Phase 2 is disabled", () => {
  assert.deepEqual(validateData(data), []);
  assert.equal(data.site.playUrl, "");
  assert.equal(data.site.status, "In Development");
  assert.equal(data.news.entries.length, 0);
  assert.equal(data.roadmap.items.length, 0);
  assert.equal(data.team.members.length, 0);
  assert(data.future.features.every((f) => !f.enabled));
});
test("All fonts, licenses and configured images exist", async () => {
  for (const font of data.licenses.fonts) {
    await access(new URL(font.file, root));
    assert.match(
      await readFile(new URL(font.licenseFile, root), "utf8"),
      /SIL OPEN FONT LICENSE Version 1.1/i,
    );
  }
  for (const path of [
    data.site.heroImage,
    data.site.seo.image,
    ...data.media.images.map((i) => i.src),
  ])
    await access(new URL(path, root));
});
test("Untrusted URLs and paths cannot execute scripts or traverse folders", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,x",
    "http://example.com",
    "https://a:b@example.com",
  ])
    assert.equal(externalURL(value), "");
  for (const value of [
    "../secrets",
    "assets/images/../x.png",
    "assets/images/x.svg",
    "https://evil.example/x.png",
  ])
    assert.equal(assetURL(value), "");
});
test("Static metadata is escaped and regenerated from content", () => {
  const d = clone(data);
  d.site.title = '"><script>alert(1)</script>';
  const html = generatedFiles(d)["index.html"];
  assert(!html.includes("<script>alert(1)"));
  assert(html.includes("&lt;script&gt;"));
  assert(html.includes("og:image"));
  assert(html.includes("Content-Security-Policy"));
  assert(
    generatedFiles(data)["robots.txt"].includes("Disallow: /heisters/admin/"),
  );
});
test("Text contrast passes and unsafe theme values are rejected", () => {
  for (const mode of ["dark", "light"])
    for (const [a, b] of [
      ["text", "background"],
      ["muted", "surface"],
      ["onAccent", "accent"],
    ])
      assert(contrast(data.theme[mode][a], data.theme[mode][b]) >= 4.5);
  const d = clone(data);
  d.theme.dark.text = d.theme.dark.background;
  assert(validateData(d).some((x) => x.includes("contrast")));
});
test("Invalid dates, image descriptions and navigation are rejected", () => {
  const d = clone(data);
  d.news.entries = [
    {
      title: "x",
      date: "2026-02-31",
      tag: "Added",
      source: "",
      image: "assets/images/streets.webp",
      alt: "",
    },
  ];
  d.site.navigation.push(clone(d.site.navigation[0]));
  assert(validateData(d).some((x) => x.includes("date")));
  assert(validateData(d).some((x) => x.includes("alt")));
  assert(validateData(d).some((x) => x.includes("unique")));
});
test("Static route files match JSON and relative paths resolve", async () => {
  for (const [path, expected] of Object.entries(generatedFiles(data))) {
    assert.equal(await readFile(new URL(path, root), "utf8"), expected);
    if (path.endsWith(".html"))
      for (const match of expected.matchAll(/(?:src|href)="(\.\.?\/[^"#]+)"/g))
        await access(new URL(match[1], new URL(path, root)));
  }
});
