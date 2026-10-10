import { ROOT, loadData, assetURL, externalURL, routeURL } from "./content.js";
let data,
  activeTag = "",
  previewImages = {},
  previewReceived = false;
const main = document.querySelector("main");
export function node(tag, text = "", className = "") {
  const el = document.createElement(tag);
  el.textContent = text;
  if (className) el.className = className;
  return el;
}
function link(text, url, className = "") {
  const el = node("a", text, className);
  el.href = url;
  if (url.startsWith("https:") && new URL(url).origin !== location.origin) {
    el.target = "_blank";
    el.rel = "noopener noreferrer";
  }
  return el;
}
function paragraph(text, className = "") {
  return node("p", text, className);
}
function externalLinks(container, items) {
  for (const item of items) {
    const url = externalURL(item.url);
    if (url) container.append(link(item.label, url, "link-row"));
  }
}
function imageBlock(src, alt, caption = "", hero = false) {
  const figure = node("figure", "", "media");
  const candidate = previewImages[src];
  const url =
    typeof candidate === "string" &&
    /^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(candidate)
      ? candidate
      : assetURL(src);
  if (url) {
    const img = node("img");
    img.src = url;
    img.alt = alt;
    img.loading = hero ? "eager" : "lazy";
    img.decoding = "async";
    if (hero) img.fetchPriority = "high";
    img.addEventListener(
      "error",
      () => {
        img.remove();
        figure.prepend(node("div", data.ui.imagePlaceholder, "placeholder"));
      },
      { once: true },
    );
    figure.append(img);
  } else figure.append(node("div", data.ui.imagePlaceholder, "placeholder"));
  if (caption) figure.append(node("figcaption", caption));
  return figure;
}
function titleBlock(page) {
  const section = node("section", "", "page-heading");
  section.append(
    paragraph(data.pages[page].eyebrow, "eyebrow"),
    node("h1", data.pages[page].title),
    paragraph(data.pages[page].description, "intro"),
  );
  main.append(section);
}
function newsCards(entries, container) {
  if (!entries.length) {
    container.append(paragraph(data.ui.newsEmpty, "empty-state"));
    return;
  }
  for (const entry of entries) {
    const article = node("article", "", "news-card");
    const date = node(
      "time",
      new Date(`${entry.date}T12:00:00Z`).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    );
    date.dateTime = entry.date;
    const meta = node("div", "", "meta");
    meta.append(date, node("span", entry.tag, "tag"));
    article.append(meta, node("h3", entry.title), paragraph(entry.body));
    const url = externalURL(entry.source);
    if (url) article.append(link(data.ui.source, url));
    if (entry.image) article.append(imageBlock(entry.image, entry.alt));
    container.append(article);
  }
}
function header() {
  const header = document.querySelector("#header");
  header.replaceChildren();
  const wrap = node("div", "", "nav-wrap");
  const brand = link(data.site.title, routeURL("home"), "brand");
  brand.append(node("span", data.site.studio, "brand-studio"));
  wrap.append(brand);
  const menu = node("button", data.ui.menu, "menu-button");
  menu.type = "button";
  menu.setAttribute("aria-expanded", "false");
  menu.setAttribute("aria-controls", "navigation");
  const nav = node("nav");
  nav.id = "navigation";
  nav.setAttribute("aria-label", data.ui.nav);
  for (const item of data.site.navigation.filter((n) => n.visible)) {
    const a = link(item.label, routeURL(item.id));
    if (document.body.dataset.page === item.id)
      a.setAttribute("aria-current", "page");
    nav.append(a);
  }
  for (const item of data.future.features.filter((f) => f.enabled))
    nav.append(
      link(
        item.label,
        `${routeURL("future")}?feature=${encodeURIComponent(item.id)}`,
      ),
    );
  menu.onclick = () => {
    const open = menu.getAttribute("aria-expanded") !== "true";
    menu.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("open", open);
  };
  document.onkeydown = (event) => {
    if (event.key === "Escape" && nav.classList.contains("open")) {
      nav.classList.remove("open");
      menu.setAttribute("aria-expanded", "false");
      menu.focus();
    }
  };
  const theme = node("button", data.ui.theme, "theme-button");
  theme.type = "button";
  theme.onclick = () => {
    const mode =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem("heisters-theme", mode);
    } catch {}
    applyTheme(mode);
  };
  wrap.append(menu, nav, theme);
  header.append(wrap);
  document.querySelector(".skip").textContent = data.ui.skip;
}
function applyTheme(mode) {
  const root = document.documentElement;
  root.dataset.theme = mode;
  for (const [key, value] of Object.entries(data.theme[mode]))
    if (/^#[0-9a-f]{6}$/i.test(value))
      root.style.setProperty(`--${key}`, value);
  for (const [key, name] of [
    ["display", "displayFont"],
    ["body", "bodyFont"],
  ]) {
    const font = data.licenses.fonts.find((f) => f.name === data.theme[name]);
    if (!font) continue;
    const url = assetURL(font.file);
    if (!url) continue;
    root.style.setProperty(`--${key}-font`, JSON.stringify(font.name));
    const face = new FontFace(font.name, `url(${JSON.stringify(url)})`, {
      weight: font.file.includes("[wght]") ? "300 900" : "400",
      display: "swap",
    });
    face
      .load()
      .then((loaded) => document.fonts.add(loaded))
      .catch(() => {});
  }
}
function footer() {
  const el = document.querySelector("#footer");
  el.replaceChildren();
  const wrap = node("div", "", "footer-wrap");
  wrap.append(
    paragraph(data.site.footer),
    node("span", data.site.status, "status"),
  );
  const credits = data.site.navigation.find((n) => n.id === "credits");
  if (credits?.visible) wrap.append(link(credits.label, routeURL("credits")));
  el.append(wrap);
}
function home() {
  const hero = node("section", "", "hero");
  hero.append(imageBlock(data.site.heroImage, data.site.heroAlt, "", true));
  const copy = node("div", "", "hero-copy");
  copy.append(
    paragraph(data.site.studio, "eyebrow"),
    node("span", data.site.status, "status"),
    node("h1", data.site.title),
    paragraph(data.site.tagline, "tagline"),
    paragraph(data.site.heroText, "hero-text"),
  );
  const actions = node("div", "", "actions");
  const play = externalURL(data.site.playUrl);
  actions.append(
    play
      ? link(data.site.playLabel, play, "button primary")
      : node("span", data.site.comingSoon, "button disabled"),
  );
  const discord = data.links.items.find((l) => l.label === "Discord");
  if (externalURL(discord?.url))
    actions.append(
      link(
        data.site.communityLabel,
        externalURL(discord.url),
        "button secondary",
      ),
    );
  copy.append(actions);
  hero.append(copy);
  main.append(hero);
  const funding = data.links.items.find(
    (l) => l.label === "Funding / Development Place",
  );
  if (externalURL(funding?.url)) {
    const strip = node("div", "", "funding-strip");
    strip.append(
      node("span", data.site.status),
      link(data.site.fundingLabel, externalURL(funding.url)),
    );
    main.append(strip);
  }
  if (data.site.navigation.find((n) => n.id === "news")?.visible) {
    const section = node("section", "", "section");
    const heading = node("div", "", "section-heading");
    heading.append(
      node("h2", data.ui.latest),
      link(data.ui.allUpdates, routeURL("news")),
    );
    const cards = node("div", "", "news-grid");
    newsCards(
      [...data.news.entries]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 3),
      cards,
    );
    section.append(heading, cards);
    main.append(section);
  }
  const gallery = node("section", "", "section");
  gallery.append(
    node("h2", data.ui.gallery),
    paragraph(data.ui.galleryNote, "muted"),
  );
  const grid = node("div", "", "gallery-grid");
  for (const img of data.media.images)
    grid.append(imageBlock(img.src, img.alt, img.caption));
  gallery.append(grid);
  main.append(gallery);
  if (data.site.navigation.find((n) => n.id === "community")?.visible) {
    const community = node("section", "", "section community-band");
    community.append(node("h2", data.pages.community.title));
    const links = node("div", "", "link-grid");
    externalLinks(links, data.links.items);
    community.append(links);
    main.append(community);
  }
}
function news() {
  titleBlock("news");
  const filters = node("div", "", "filters");
  filters.setAttribute("role", "group");
  filters.setAttribute("aria-label", data.pages.news.title);
  const grid = node("div", "", "news-grid");
  const redraw = () => {
    grid.replaceChildren();
    newsCards(
      [...data.news.entries]
        .filter((n) => !activeTag || n.tag === activeTag)
        .sort((a, b) => b.date.localeCompare(a.date)),
      grid,
    );
    for (const button of filters.children)
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.tag === activeTag),
      );
  };
  for (const tag of ["", ...data.news.tags]) {
    const btn = node("button", tag || data.ui.all);
    btn.type = "button";
    btn.dataset.tag = tag;
    btn.onclick = () => {
      activeTag = tag;
      redraw();
    };
    filters.append(btn);
  }
  const section = node("section", "", "section");
  section.append(filters, grid);
  main.append(section);
  redraw();
}
function roadmap() {
  titleBlock("roadmap");
  const board = node("section", "", "roadmap-board section");
  for (const status of ["planned", "progress", "done"]) {
    const column = node("section", "", "roadmap-column");
    column.append(node("h2", data.ui[status]));
    const items = data.roadmap.items.filter((i) => i.status === status);
    if (!items.length)
      column.append(paragraph(data.ui.roadmapEmpty, "empty-state"));
    for (const item of items) {
      const card = node("article", "", "roadmap-card");
      card.append(node("h3", item.title), paragraph(item.description));
      column.append(card);
    }
    board.append(column);
  }
  main.append(board);
}
function community() {
  titleBlock("community");
  const section = node("section", "", "section link-grid");
  externalLinks(section, data.links.items);
  if (!section.childElementCount) section.append(paragraph(data.ui.noLinks));
  main.append(section);
}
function team() {
  titleBlock("team");
  const grid = node("section", "", "section team-grid");
  if (!data.team.members.length)
    grid.append(paragraph(data.ui.teamEmpty, "empty-state"));
  for (const member of data.team.members) {
    const article = node("article", "", "team-card");
    if (member.image) article.append(imageBlock(member.image, member.alt));
    article.append(node("h2", member.name), paragraph(member.role, "role"));
    if (member.bio) article.append(paragraph(member.bio));
    if (externalURL(member.url))
      article.append(link(member.name, externalURL(member.url)));
    grid.append(article);
  }
  main.append(grid);
}
function report() {
  titleBlock("report");
  const section = node("section", "", "section report-layout");
  const form = node("form", "", "report-form");
  const fields = {};
  const add = (key, label, multiline = false, required = false) => {
    const wrap = node("label", label);
    const input = node(multiline ? "textarea" : "input");
    input.name = key;
    input.required = required;
    input.maxLength = multiline ? 1800 : 160;
    wrap.append(input);
    form.append(wrap);
    fields[key] = input;
  };
  const kindLabel = node("label", data.ui.issueType),
    select = node("select");
  for (const kind of ["bug", "suggestion"]) {
    const option = node("option", data.ui[kind]);
    option.value = kind;
    select.append(option);
  }
  kindLabel.append(select);
  form.append(kindLabel);
  add("title", data.ui.issueTitle, false, true);
  add("details", data.ui.issueDetails, true, true);
  add("steps", data.ui.issueSteps, true);
  add("expected", data.ui.issueExpected, true);
  add("actual", data.ui.issueActual, true);
  add("device", data.ui.issueDevice);
  const submit = node("button", data.ui.issueSubmit, "button primary");
  submit.type = "submit";
  form.append(submit);
  const status = paragraph("", "muted");
  status.setAttribute("role", "status");
  form.append(status);
  form.onsubmit = (event) => {
    event.preventDefault();
    const lines = [
      ["details", "issueDetails"],
      ["steps", "issueSteps"],
      ["expected", "issueExpected"],
      ["actual", "issueActual"],
      ["device", "issueDevice"],
    ]
      .filter(([key]) => fields[key].value.trim())
      .map(
        ([key, label]) => `## ${data.ui[label]}\n${fields[key].value.trim()}`,
      );
    const url = new URL(
      `https://github.com/${encodeURIComponent(data.site.repository.owner)}/${encodeURIComponent(data.site.repository.name)}/issues/new`,
    );
    url.searchParams.set(
      "title",
      `[${data.ui[select.value]}] ${fields.title.value.trim()}`,
    );
    url.searchParams.set("body", lines.join("\n\n"));
    if (url.href.length > 7500) {
      status.textContent = data.ui.issueTooLong;
      return;
    }
    window.open(url.href, "_blank", "noopener,noreferrer");
  };
  section.append(form, paragraph(data.ui.issueNotice, "report-note"));
  main.append(section);
}
function credits() {
  titleBlock("credits");
  const section = node("section", "", "section license-list");
  for (const font of data.licenses.fonts) {
    const article = node("article", "", "license-card");
    article.append(node("h2", font.name), paragraph(font.license));
    const license = assetURL(font.licenseFile);
    if (license) article.append(link(data.ui.license, license));
    const source = externalURL(font.source);
    if (source) article.append(link(data.ui.source, source));
    section.append(article);
  }
  for (const value of [
    data.licenses.icons,
    data.licenses.libraries,
    data.licenses.assets,
  ])
    section.append(paragraph(value));
  main.append(section);
}
function future() {
  const feature = data.future.features.find(
    (f) =>
      f.id === new URL(location.href).searchParams.get("feature") && f.enabled,
  );
  if (!feature) {
    notFound();
    return;
  }
  const section = node("section", "", "page-heading");
  section.append(
    paragraph(data.site.status, "eyebrow"),
    node("h1", feature.title),
    paragraph(feature.text),
  );
  main.append(section);
  document.title = `${feature.title} · ${data.site.title}`;
}
function notFound() {
  titleBlock("404");
  main.append(link(data.ui.back, routeURL("home"), "button primary back-home"));
}
export function render(d) {
  data = d;
  main.replaceChildren();
  header();
  footer();
  let mode = d.theme.defaultMode;
  try {
    if (!new URL(location.href).searchParams.has("preview"))
      mode = localStorage.getItem("heisters-theme") || mode;
  } catch {}
  applyTheme(mode === "light" ? "light" : "dark");
  const page = document.body.dataset.page || "home";
  document.title =
    page === "home"
      ? d.site.title
      : `${d.pages[page]?.title || "404"} · ${d.site.title}`;
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = d.site.seo.description;
  const hidden =
    page !== "home" &&
    page !== "future" &&
    page !== "404" &&
    !d.site.navigation.find((n) => n.id === page)?.visible;
  if (hidden) {
    notFound();
    return;
  }
  (
    ({
      home,
      news,
      roadmap,
      community,
      team,
      report,
      credits,
      future,
      404: notFound,
      about: () => titleBlock("about"),
    })[page] || notFound
  )();
}
window.addEventListener("message", (event) => {
  if (
    event.source !== window.parent ||
    event.origin !== location.origin ||
    event.data?.type !== "heisters-preview"
  )
    return;
  previewReceived = true;
  previewImages = event.data.images || {};
  render(event.data.content);
});
loadData()
  .then((d) => {
    if (!previewReceived) render(d);
  })
  .catch(() => {
    main.append(
      paragraph(
        "Content could not be loaded. Please refresh the page.",
        "empty-state",
      ),
    );
  });
