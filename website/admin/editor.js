import { clone, FONT_NAMES, ROUTES } from "../assets/content.js";
// Array templates keep the editor form-based even when a collection is empty.
export const TEMPLATES = {
  "site.navigation": { id: "about", label: "About", visible: true },
  "news.entries": {
    title: "",
    date: new Date().toISOString().slice(0, 10),
    tag: "Announcement",
    body: "",
    source: "",
    image: "",
    alt: "",
  },
  "roadmap.items": { title: "", description: "", status: "planned" },
  "team.members": { name: "", role: "", bio: "", url: "", image: "", alt: "" },
  "links.items": { label: "", url: "" },
  "media.images": { src: "", alt: "", caption: "In Development" },
  "future.features": {
    id: "",
    label: "",
    enabled: false,
    title: "",
    text: "Coming soon",
  },
};
export const SECTIONS = [
  ["site", "Site, hero & navigation"],
  ["pages", "Page text"],
  ["ui", "Buttons & interface text"],
  ["news", "Devlog / news"],
  ["roadmap", "Roadmap"],
  ["team", "Team & contributors"],
  ["links", "Community links"],
  ["media", "Screenshot gallery"],
  ["theme", "Colors & fonts"],
  ["future", "Phase 2 switches"],
  ["licenses", "Credits & licenses"],
];
const LABELS = {
  playUrl: "Playable Roblox game URL (leave empty until playable)",
  heroImage: "Hero image path",
  heroAlt: "Hero image description",
  baseUrl: "Published website URL (HTTPS, ending in /)",
  sitePath: "Website folder (keep website)",
  src: "Image path",
  alt: "Image description",
  url: "HTTPS link (empty links are hidden)",
  visible: "Show page and navigation link",
  enabled: "Enable this Phase 2 feature",
  onAccent: "Text on accent buttons",
  progress: "In Progress",
};
const friendly = (key) =>
  LABELS[key] ||
  key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
export function setPath(data, path, value) {
  let target = data;
  for (const key of path.slice(0, -1)) target = target[key];
  target[path.at(-1)] = value;
}
export function getPath(data, path) {
  return path.reduce((obj, key) => obj[key], data);
}
export function buildEditor(root, data, section, onEdit, onStructure) {
  root.replaceChildren();
  const heading = document.createElement("h2");
  heading.textContent = SECTIONS.find((s) => s[0] === section)?.[1] || section;
  root.append(heading);
  function draw(value, path, container) {
    const key = path.at(-1),
      keyPath = path.filter((k) => typeof k !== "number").join(".");
    if (Array.isArray(value)) {
      const fieldset = document.createElement("fieldset");
      fieldset.className = "field-group";
      const legend = document.createElement("legend");
      legend.textContent = friendly(key);
      fieldset.append(legend);
      value.forEach((item, index) => {
        const article = document.createElement("div");
        article.className = "array-item";
        const name = document.createElement("h3");
        name.textContent =
          typeof item === "object"
            ? item.title ||
              item.name ||
              item.label ||
              item.caption ||
              `${friendly(key)} ${index + 1}`
            : `${friendly(key)} ${index + 1}`;
        article.append(name);
        draw(item, [...path, index], article);
        const actions = document.createElement("div");
        actions.className = "array-actions";
        const action = (label, callback, disabled = false) => {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = label;
          button.disabled = disabled;
          button.onclick = () => onStructure(() => callback());
          actions.append(button);
        };
        action(
          "Move up",
          () =>
            ([value[index - 1], value[index]] = [
              value[index],
              value[index - 1],
            ]),
          index === 0,
        );
        action(
          "Move down",
          () =>
            ([value[index + 1], value[index]] = [
              value[index],
              value[index + 1],
            ]),
          index === value.length - 1,
        );
        if (!["future.features", "licenses.fonts"].includes(keyPath))
          action("Remove", () => value.splice(index, 1));
        article.append(actions);
        fieldset.append(article);
      });
      if (!["future.features", "licenses.fonts"].includes(keyPath)) {
        const add = document.createElement("button");
        add.type = "button";
        add.className = "add-item";
        add.textContent = `Add ${friendly(key).toLowerCase()}`;
        add.onclick = () =>
          onStructure(() => value.push(clone(TEMPLATES[keyPath] ?? "")));
        fieldset.append(add);
      }
      container.append(fieldset);
      return;
    }
    if (value && typeof value === "object") {
      const group = document.createElement("fieldset");
      group.className = "field-group";
      const legend = document.createElement("legend");
      legend.textContent = typeof key === "number" ? "Details" : friendly(key);
      group.append(legend);
      for (const [sub, v] of Object.entries(value))
        draw(v, [...path, sub], group);
      container.append(group);
      return;
    }
    const field = document.createElement("div");
    field.className = "field";
    const label = document.createElement("label");
    label.textContent = typeof key === "number" ? "Label" : friendly(key);
    let input;
    const options =
      key === "displayFont" || key === "bodyFont"
        ? FONT_NAMES
        : key === "defaultMode"
          ? ["dark", "light"]
          : key === "status" && section === "roadmap"
            ? ["planned", "progress", "done"]
            : key === "tag"
              ? data.news.tags
              : key === "id" && section === "site"
                ? ROUTES.filter((id) => !["404", "future"].includes(id))
                : null;
    if (options) {
      input = document.createElement("select");
      for (const option of options) {
        const el = document.createElement("option");
        el.value = option;
        el.textContent = option;
        el.selected = option === value;
        input.append(el);
      }
    } else if (typeof value === "boolean") {
      input = document.createElement("input");
      input.type = "checkbox";
      input.checked = value;
      label.className = "checkbox-label";
    } else {
      input = document.createElement(
        [
          "description",
          "text",
          "body",
          "heroText",
          "bio",
          "issueNotice",
          "loadingError",
          "assets",
          "icons",
          "libraries",
        ].includes(key)
          ? "textarea"
          : "input",
      );
      if (input.tagName === "INPUT")
        input.type =
          section === "theme" && /^#[0-9a-f]{6}$/i.test(value)
            ? "color"
            : key === "date"
              ? "date"
              : "text";
      input.value = value ?? "";
      if (input.type !== "color") input.maxLength = 12000;
    }
    input.name = path.join(".");
    input.addEventListener("input", () =>
      onEdit(path, input.type === "checkbox" ? input.checked : input.value),
    );
    if (key === "id" && section === "future") input.readOnly = true;
    if (
      section === "licenses" &&
      ["file", "licenseFile", "source", "license", "name"].includes(key)
    )
      input.readOnly = true;
    label.append(input);
    field.append(label);
    container.append(field);
  }
  draw(data[section], [section], root);
}
