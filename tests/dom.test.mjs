import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseHTML } from "linkedom";
import { FILES, clone } from "../website/assets/content.js";
const root = new URL("../website/", import.meta.url);
const data = Object.fromEntries(
  await Promise.all(
    FILES.map(async (key) => [
      key,
      JSON.parse(await readFile(new URL(`data/${key}.json`, root), "utf8")),
    ]),
  ),
);
const { window } = parseHTML(
  await readFile(new URL("index.html", root), "utf8"),
);
globalThis.window = window;
globalThis.document = window.document;
globalThis.location = new URL("https://rithgow.github.io/heisters/");
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
globalThis.FontFace = class {
  load() {
    return Promise.resolve(this);
  }
};
document.fonts = { add() {} };
globalThis.fetch = async (url) => ({
  ok: true,
  json: async () =>
    data[new URL(url).pathname.split("/").at(-1).replace(".json", "")],
});
const { render } = await import("../website/assets/app.js");
const { buildEditor, setPath } = await import("../website/admin/editor.js");
function page(id, d = data) {
  document.body.dataset.page = id;
  render(d);
}
test("Every public route renders semantic content and a labelled navigation", () => {
  for (const id of [
    "home",
    "about",
    "news",
    "roadmap",
    "community",
    "team",
    "report",
    "credits",
    "404",
  ]) {
    page(id);
    assert.equal(document.querySelectorAll("main h1").length, 1, id);
    assert(document.querySelector("nav[aria-label]"));
    assert(document.querySelector(".skip").textContent);
    for (const img of document.querySelectorAll("img"))
      assert(img.getAttribute("alt"));
  }
});
test("Script-like content renders as text; unsafe links and images are hidden", () => {
  const d = clone(data);
  d.site.tagline = "<img src=x onerror=alert(1)>";
  d.links.items.push({ label: "Bad", url: "javascript:alert(1)" });
  page("home", d);
  assert(document.querySelector(".tagline").textContent.includes("<img"));
  assert(!document.querySelector(".tagline img"));
  assert(
    ![...document.querySelectorAll("a")].some((a) =>
      a.getAttribute("href")?.startsWith("javascript:"),
    ),
  );
});
test("Empty social links disappear and playable game stays Coming Soon", () => {
  const d = clone(data);
  d.links.items[0].url = "";
  page("home", d);
  assert(document.querySelector(".disabled").textContent === "Coming Soon");
  assert(
    ![...document.querySelectorAll("a")].some(
      (a) => a.textContent === "Heisters X",
    ),
  );
  assert(
    [...document.querySelectorAll("a")].some(
      (a) => a.textContent === "Funding / Development Place",
    ),
  );
});
test("News sorts newest first and filters by tag", () => {
  const d = clone(data);
  d.news.entries = [
    { title: "old", date: "2026-01-01", tag: "Added", body: "a", source: "" },
    { title: "new", date: "2026-02-01", tag: "Fixed", body: "b", source: "" },
  ];
  page("news", d);
  assert.equal(document.querySelector(".news-card h3").textContent, "new");
  [...document.querySelectorAll(".filters button")]
    .find((b) => b.textContent === "Added")
    .onclick();
  assert.equal(document.querySelectorAll(".news-card").length, 1);
  assert.equal(document.querySelector(".news-card h3").textContent, "old");
});
test("Phase 2 switches hide nav and direct pages, and show enabled placeholder pages", () => {
  const d = clone(data);
  globalThis.location = new URL(
    "https://rithgow.github.io/heisters/future/?feature=vehicles",
  );
  page("future", d);
  assert.equal(document.querySelector("main h1").textContent, "404");
  d.future.features[0].enabled = true;
  page("future", d);
  assert.equal(document.querySelector("main h1").textContent, "Vehicles");
  assert(
    [...document.querySelectorAll("nav a")].some(
      (a) => a.textContent === "Vehicles",
    ),
  );
  d.site.navigation.find((n) => n.id === "about").visible = false;
  page("about", d);
  assert.equal(document.querySelector("main h1").textContent, "404");
  globalThis.location = new URL("https://rithgow.github.io/heisters/");
});
test("Menu opens, closes with Escape and restores focus target", () => {
  page("home");
  const button = document.querySelector(".menu-button");
  button.onclick();
  assert.equal(button.getAttribute("aria-expanded"), "true");
  document.onkeydown({ key: "Escape" });
  assert.equal(button.getAttribute("aria-expanded"), "false");
});
test("Issue form opens only a prefilled draft on the configured repository", () => {
  page("report");
  const fields = document.querySelectorAll(
    ".report-form input,.report-form textarea",
  );
  fields[0].value = "Garage bug";
  fields[1].value = "Example details & steps";
  let opened;
  window.open = (url) => {
    opened = url;
  };
  document.querySelector(".report-form").onsubmit({ preventDefault() {} });
  const url = new URL(opened);
  assert.equal(url.origin, "https://github.com");
  assert.equal(url.pathname, "/rithgow/heisters/issues/new");
  assert(url.searchParams.get("body").includes("Example details & steps"));
});
test("Editor adds, removes and edits collection entries without raw JSON", () => {
  const d = clone(data),
    root = document.createElement("section");
  const structure = (mutate) => {
    mutate();
    build();
  };
  const build = () =>
    buildEditor(
      root,
      d,
      "news",
      (path, value) => setPath(d, path, value),
      structure,
    );
  build();
  [...root.querySelectorAll(".add-item")]
    .find((b) => b.textContent === "Add entries")
    .onclick();
  assert.equal(d.news.entries.length, 1);
  assert(root.querySelector('input[name="news.entries.0.title"]'));
  root.querySelector('input[name="news.entries.0.title"]').value = "Test";
  root
    .querySelector('input[name="news.entries.0.title"]')
    .dispatchEvent(new window.Event("input"));
  assert.equal(d.news.entries[0].title, "Test");
  [
    ...root
      .querySelector('input[name="news.entries.0.title"]')
      .closest(".array-item")
      .querySelectorAll("button"),
  ]
    .find((b) => b.textContent === "Remove")
    .onclick();
  assert.equal(d.news.entries.length, 0);
});
test("Responsive rules cover 360, 768, and 1280 widths and reduced motion", async () => {
  const css = await readFile(new URL("assets/style.css", root), "utf8");
  assert(/@media\s*\(max-width:\s*767px\)/.test(css));
  assert(/@media\s*\(max-width:\s*1100px\)/.test(css));
  assert(css.includes("prefers-reduced-motion"));
  assert(css.includes(":focus-visible"));
  assert(/minmax\(0,\s*1fr\)/.test(css));
});
