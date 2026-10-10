import {
  ROOT,
  clone,
  loadData,
  ROUTES,
  validateData,
} from "../assets/content.js";
import { GitHubSession, getToken, setToken } from "./github.js";
import { buildEditor, SECTIONS, setPath } from "./editor.js";
const $ = (id) => document.getElementById(id);
let draft,
  defaults,
  session,
  section = "site",
  uploads = [],
  history = [],
  redo = [],
  dirty = false,
  timer,
  busy = false;
function status(text, error = false) {
  $("status").textContent = text;
  $("status").classList.toggle("error", error);
}
function updateButtons() {
  $("undo").disabled = !history.length || busy;
  $("redo").disabled = !redo.length || busy;
  $("save").disabled = !session?.base || !dirty || busy;
}
function checkpoint() {
  history.push({ data: clone(draft), uploads: [...uploads] });
  if (history.length > 80) history.shift();
  redo = [];
}
function changed() {
  dirty = true;
  updateButtons();
  clearTimeout(timer);
  timer = setTimeout(preview, 160);
}
function redraw() {
  buildEditor(
    $("editor"),
    draft,
    section,
    (path, value) => {
      checkpoint();
      setPath(draft, path, value);
      changed();
    },
    (mutate) => {
      checkpoint();
      mutate();
      changed();
      redraw();
    },
  );
  updateButtons();
}
function preview() {
  const select = $("preview-page"),
    selected = select.value;
  select.replaceChildren();
  for (const key of ROUTES.filter((k) => !["404", "future"].includes(k))) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = draft.pages[key].title;
    select.append(option);
  }
  for (const feature of draft.future.features.filter((f) => f.enabled)) {
    const option = document.createElement("option");
    option.value = `future/?feature=${encodeURIComponent(feature.id)}`;
    option.textContent = feature.label;
    select.append(option);
  }
  if ([...select.options].some((o) => o.value === selected))
    select.value = selected;
  const frames = $("preview");
  const images = Object.fromEntries(uploads.map((u) => [u.path, u.preview]));
  frames.contentWindow?.postMessage(
    { type: "heisters-preview", content: clone(draft), images },
    location.origin,
  );
}
async function confirmAction(title, body) {
  const dialog = $("confirm-dialog");
  $("dialog-title").textContent = title;
  $("dialog-body").textContent = body;
  dialog.returnValue = "";
  dialog.showModal();
  return new Promise((resolve) =>
    dialog.addEventListener(
      "close",
      () => resolve(dialog.returnValue === "confirm"),
      { once: true },
    ),
  );
}
function selectSection(key) {
  section = key;
  for (const btn of $("editor-tabs").children)
    btn.setAttribute("aria-pressed", String(btn.dataset.section === key));
  redraw();
}
function exportDraft() {
  const blob = new Blob([JSON.stringify(draft, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "heisters-content-draft.json";
  a.click();
  URL.revokeObjectURL(url);
  status(
    "Draft exported. Pending image uploads are not included; keep the original image files.",
  );
}
async function run(action) {
  if (busy) return;
  busy = true;
  document.querySelector(".admin-main").inert = true;
  document.querySelector(".admin-header").inert = true;
  updateButtons();
  $("connect-form").querySelector("button[type=submit]").disabled = true;
  try {
    await action();
  } catch (error) {
    status(error.message, true);
  } finally {
    busy = false;
    document.querySelector(".admin-main").inert = false;
    document.querySelector(".admin-header").inert = false;
    updateButtons();
    $("connect-form").querySelector("button[type=submit]").disabled = false;
  }
}
$("connect-form").onsubmit = (event) => {
  event.preventDefault();
  run(async () => {
    if (
      dirty &&
      !(await confirmAction(
        "Load latest GitHub content?",
        "This replaces the current draft and pending images. Export the draft first if you want to keep it.",
      ))
    )
      return;
    setToken($("token").value);
    $("token").value = "";
    session = new GitHubSession(draft.site.repository, getToken());
    status("Connecting and loading the latest repository content…");
    const latest = await session.load();
    draft = latest;
    uploads = [];
    history = [];
    redo = [];
    dirty = false;
    redraw();
    preview();
    $("connection-state").textContent =
      `Connected to ${session.repo.owner}/${session.repo.name} · ${session.repo.branch}`;
    status("Latest GitHub content loaded. Saving uses one commit.");
  });
};
$("disconnect").onclick = () => {
  setToken("");
  $("token").value = "";
  session = null;
  $("connection-state").textContent = "Token cleared. Draft remains in memory.";
  updateButtons();
  status("Disconnected.");
};
$("save").onclick = () =>
  run(async () => {
    const errors = validateData(draft);
    if (errors.length) throw new Error(errors.join("\n"));
    status("Saving content, images and metadata to GitHub…");
    const url = await session.save(draft, uploads, $("commit-message").value);
    uploads = [];
    dirty = false;
    status(
      `Saved. GitHub Pages will update after the workflow finishes.\n${url}`,
    );
    preview();
  });
$("undo").onclick = () => {
  if (!history.length) return;
  redo.push({ data: clone(draft), uploads: [...uploads] });
  const previous = history.pop();
  draft = previous.data;
  uploads = previous.uploads;
  changed();
  redraw();
};
$("redo").onclick = () => {
  if (!redo.length) return;
  history.push({ data: clone(draft), uploads: [...uploads] });
  const next = redo.pop();
  draft = next.data;
  uploads = next.uploads;
  changed();
  redraw();
};
$("restore").onclick = async () => {
  if (!defaults) return;
  if (
    await confirmAction(
      "Restore original defaults?",
      "This restores the packaged content and settings in your draft. Review the preview, then save to commit the reset.",
    )
  ) {
    checkpoint();
    draft = clone(defaults);
    uploads = [];
    changed();
    redraw();
  }
};
$("export").onclick = exportDraft;
$("import").onclick = () => $("import-file").click();
$("import-file").onchange = () =>
  run(async () => {
    const file = $("import-file").files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024)
      throw new Error("Draft files must be under 2 MB.");
    const imported = JSON.parse(await file.text());
    const errors = validateData(imported);
    if (errors.length) throw new Error(errors.join("\n"));
    if (
      JSON.stringify(imported.site.repository) !==
      JSON.stringify(draft.site.repository)
    )
      throw new Error(
        "The draft targets a different repository. Check its origin before importing.",
      );
    if (
      !(await confirmAction(
        "Import this draft?",
        "This replaces the current draft. Review all changes in the preview before saving. Image uploads must already exist in the repository.",
      ))
    )
      return;
    checkpoint();
    draft = clone(imported);
    uploads = [];
    changed();
    redraw();
    status("Draft imported. Review it before saving to GitHub.");
    $("import-file").value = "";
  });

$("preview").addEventListener("load", preview);
$("preview-page").onchange = () => {
  $("preview").src = new URL(
    $("preview-page").value === "home"
      ? "?preview=1"
      : $("preview-page").value.startsWith("future/")
        ? `${$("preview-page").value}&preview=1`
        : `${$("preview-page").value}/?preview=1`,
    ROOT,
  ).href;
};
$("preview-width").onchange = () => {
  $("preview").style.width = $("preview-width").value;
};
window.addEventListener("beforeunload", (event) => {
  if (dirty) {
    event.preventDefault();
    event.returnValue = "";
  }
});
$("add-image").onclick = () =>
  run(async () => {
    const file = $("image-upload").files[0],
      alt = $("image-alt").value.trim();
    if (!file || !alt)
      throw new Error("Choose an image and write its description first.");
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 8 * 1024 * 1024
    )
      throw new Error("Use a PNG, JPEG or WebP under 8 MB.");
    // Decoding + canvas re-encoding strips uploaded markup and metadata.
    const bitmap = await createImageBitmap(file);
    if (bitmap.width > 8192 || bitmap.height > 8192) {
      bitmap.close();
      throw new Error("Image dimensions must be at most 8192px.");
    }
    const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas
      .getContext("2d")
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.88),
    );
    if (!blob || blob.type !== "image/webp")
      throw new Error(
        "This browser cannot export WebP. Use a recent Chrome, Edge, Firefox or Safari.",
      );
    const bytes = new Uint8Array(await blob.arrayBuffer()),
      path = `assets/images/upload-${crypto.randomUUID()}.webp`;
    const preview = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
    checkpoint();
    uploads.push({ path, bytes, preview });
    if ($("image-target").value === "hero") {
      draft.site.heroImage = path;
      draft.site.heroAlt = alt;
      draft.site.seo.image = path;
      draft.site.seo.imageAlt = alt;
    } else
      draft.media.images.push({ src: path, alt, caption: draft.site.status });
    changed();
    redraw();
    $("upload-state").textContent =
      "Image added to the draft. It will upload with Save to GitHub.";
    $("image-upload").value = "";
  });
loadData()
  .then(async (data) => {
    draft = data;
    try {
      const response = await fetch(new URL("data/defaults.json", ROOT));
      if (response.ok) defaults = await response.json();
    } catch {}
    for (const [key, label] of SECTIONS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.section = key;
      btn.textContent = label;
      btn.onclick = () => selectSection(key);
      $("editor-tabs").append(btn);
    }
    selectSection("site");
    preview();
    if (getToken())
      status(
        "A token is stored in this tab. Paste it again to reconnect, or clear it.",
      );
  })
  .catch((error) => status(`Editor could not load: ${error.message}`, true));
