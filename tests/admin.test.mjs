import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseHTML } from "linkedom";
const root = new URL("../website/", import.meta.url);
const { window } = parseHTML(
  await readFile(new URL("admin/index.html", root), "utf8"),
);
globalThis.window = window;
globalThis.document = window.document;
globalThis.location = new URL("https://rithgow.github.io/heisters/admin/");
// LinkeDOM deliberately lacks native select setters; emulate that browser primitive.
Object.defineProperty(window.HTMLSelectElement.prototype, "value", {
  configurable: true,
  get() {
    return (
      [...this.options].find((o) => o.selected)?.value ||
      this.options[0]?.value ||
      ""
    );
  },
  set(value) {
    for (const option of this.options) option.selected = option.value === value;
  },
});
const tokens = new Map();
globalThis.sessionStorage = {
  getItem: (k) => tokens.get(k) || null,
  setItem: (k, v) => tokens.set(k, v),
  removeItem: (k) => tokens.delete(k),
};
const previews = [];
Object.defineProperty(document.getElementById("preview"), "contentWindow", {
  value: {
    postMessage: (message, origin) => previews.push({ message, origin }),
  },
});
globalThis.fetch = async (url) => {
  const name = new URL(url).pathname.split("/").at(-1);
  return {
    ok: true,
    json: async () =>
      JSON.parse(await readFile(new URL("data/" + name, root), "utf8")),
  };
};
await import("../website/admin/admin.js");
await new Promise((resolve) => setTimeout(resolve, 30));
const $ = (id) => document.getElementById(id);
function edit(selector, value) {
  const field = document.querySelector(selector);
  field.value = value;
  field.dispatchEvent(new window.Event("input"));
}
test("Editor boots with forms, pending save disabled, and a token-free live preview", () => {
  assert(document.querySelector('input[name="site.title"]'));
  assert.equal($("save").disabled, true);
  assert.equal($("editor-tabs").children.length, 11);
  assert(previews.length > 0);
  assert.equal(previews[0].origin, "https://rithgow.github.io");
  assert(!Object.hasOwn(previews[0].message, "token"));
  assert(!JSON.stringify(previews[0].message).includes("FAKE_PRIVATE_TOKEN"));
});
test("Editing, undo and redo update the form and live preview", async () => {
  edit('input[name="site.title"]', "Changed title");
  assert.equal($("undo").disabled, false);
  $("undo").onclick();
  assert.equal(
    document.querySelector('input[name="site.title"]').value,
    "Heisters",
  );
  $("redo").onclick();
  assert.equal(
    document.querySelector('input[name="site.title"]').value,
    "Changed title",
  );
  await new Promise((resolve) => setTimeout(resolve, 180));
  assert.equal(previews.at(-1).message.content.site.title, "Changed title");
});
test("Restoring defaults is draft-only and remains undoable", async () => {
  const dialog = $("confirm-dialog");
  dialog.showModal = () => {};
  const pending = $("restore").onclick();
  dialog.returnValue = "confirm";
  dialog.dispatchEvent(new window.Event("close"));
  await pending;
  assert.equal(
    document.querySelector('input[name="site.title"]').value,
    "Heisters",
  );
  assert.equal($("save").disabled, true);
  $("undo").onclick();
  assert.equal(
    document.querySelector('input[name="site.title"]').value,
    "Changed title",
  );
});
test("Phase 2 can be enabled with a form and becomes a preview option", async () => {
  [...$("editor-tabs").children]
    .find((b) => b.dataset.section === "future")
    .onclick();
  const field = document.querySelector(
    'input[name="future.features.0.enabled"]',
  );
  field.checked = true;
  field.dispatchEvent(new window.Event("input"));
  await new Promise((resolve) => setTimeout(resolve, 180));
  assert(
    [...$("preview-page").options].some(
      (o) => o.value === "future/?feature=vehicles",
    ),
  );
  assert.equal(
    previews.at(-1).message.content.future.features[0].enabled,
    true,
  );
});
test("Clearing a token removes it from sessionStorage without losing draft changes", () => {
  tokens.set("heisters-github-token", "FAKE_PRIVATE_TOKEN");
  $("disconnect").onclick();
  assert.equal(tokens.size, 0);
  assert($("connection-state").textContent.includes("cleared"));
  assert.equal($("save").disabled, true);
});
test('Imported teammate drafts are validated, previewable and require explicit review',async()=>{
 const imported=JSON.parse(JSON.stringify(previews.at(-1).message.content));
 imported.site.title='Imported team draft';
 Object.defineProperty($('import-file'),'files',{configurable:true,value:[{size:1000,text:async()=>JSON.stringify(imported)}]});
 const dialog=$('confirm-dialog');dialog.showModal=()=>{};
 const pending=$('import-file').onchange();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal($('dialog-title').textContent,'Import this draft?');
 dialog.returnValue='confirm';dialog.dispatchEvent(new window.Event('close'));
 await pending;
 [...$('editor-tabs').children].find(b=>b.dataset.section==='site').onclick();
 assert.equal(document.querySelector('input[name="site.title"]').value,'Imported team draft');
 assert.equal($('save').disabled,true);
 assert($('status').textContent.includes('Review'));
});
