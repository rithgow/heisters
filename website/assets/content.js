// Shared, buildless content model. No user text is interpreted as HTML.
export const FILES = [
  "site",
  "pages",
  "ui",
  "news",
  "roadmap",
  "team",
  "links",
  "media",
  "theme",
  "licenses",
  "future",
];
export const ROOT = new URL("../", import.meta.url);
export const ROUTES = [
  "home",
  "about",
  "news",
  "roadmap",
  "community",
  "team",
  "report",
  "credits",
  "future",
  "404",
];
export const FONT_NAMES = [
  "Anton",
  "Rubik",
  "Bebas Neue",
  "Oswald",
  "Russo One",
  "Bungee",
  "Chakra Petch",
  "Teko",
  "Barlow Condensed",
  "Archivo Black",
];
export const clone = (value) => JSON.parse(JSON.stringify(value));
export async function loadData() {
  return Object.fromEntries(
    await Promise.all(
      FILES.map(async (key) => {
        const response = await fetch(new URL(`data/${key}.json`, ROOT), {
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`Unable to load ${key}`);
        return [key, await response.json()];
      }),
    ),
  );
}
export function externalURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : "";
  } catch {
    return "";
  }
}
export function assetURL(value) {
  if (
    !/^assets\/(images|fonts)\/[a-zA-Z0-9_./\[\]-]+\.(webp|png|jpe?g|ttf|woff2?|txt)$/.test(
      value,
    ) ||
    value.includes("..")
  )
    return "";
  return new URL(value, ROOT).href;
}
export function routeURL(id) {
  return new URL(id === "home" ? "./" : `${id}/`, ROOT).href;
}
export function validateData(d) {
  const errors = [];
  if (!d.site?.title?.trim()) errors.push("Site title is required.");
  if (!d.site.navigation.some((n) => n.id === "home" && n.visible))
    errors.push("Home must remain visible.");
  const repo = d.site?.repository;
  if (
    !/^[\w.-]+$/.test(repo?.owner || "") ||
    !/^[\w.-]+$/.test(repo?.name || "") ||
    !/^[\w./-]+$/.test(repo?.branch || "") ||
    repo.branch.includes("..")
  )
    errors.push("Repository configuration is invalid.");
  if (repo?.sitePath !== "website")
    errors.push("Site path must be website for this package.");
  if (!externalURL(d.site?.seo?.baseUrl) || !d.site.seo.baseUrl.endsWith("/"))
    errors.push("SEO site URL must use HTTPS and end with /.");
  for (const key of ["displayFont", "bodyFont"])
    if (!FONT_NAMES.includes(d.theme?.[key]))
      errors.push("Choose an included, licensed font.");
  for (const mode of ["dark", "light"]) {
    for (const value of Object.values(d.theme?.[mode] || {}))
      if (!/^#[0-9a-f]{6}$/i.test(value))
        errors.push("Theme colors must be six-digit hex colors.");
    for (const [a, b] of [
      ["text", "background"],
      ["muted", "background"],
      ["text", "surface"],
      ["muted", "surface"],
      ["onAccent", "accent"],
    ])
      if (contrast(d.theme[mode][a], d.theme[mode][b]) < 4.5)
        errors.push(`${mode}: ${a} / ${b} needs 4.5:1 contrast.`);
  }
  for (const link of d.links?.items || [])
    if (link.url && !externalURL(link.url))
      errors.push(`Invalid HTTPS URL: ${link.label}`);
  for (const key of ["playUrl"])
    if (d.site[key] && !externalURL(d.site[key]))
      errors.push(`Invalid ${key}.`);
  const images = [
    { src: d.site.heroImage, alt: d.site.heroAlt },
    ...(d.media?.images || []),
    ...(d.news?.entries || []).map((n) => ({ src: n.image, alt: n.alt })),
    ...(d.team?.members || []).map((n) => ({ src: n.image, alt: n.alt })),
  ];
  for (const img of images)
    if (img.src && (!assetURL(img.src) || !img.alt?.trim()))
      errors.push("Images need a local asset path and alt text.");
  if (d.site.seo.image && !assetURL(d.site.seo.image))
    errors.push("SEO image must be a local asset path.");
  for (const item of d.news?.entries || []) {
    if (
      !item.title?.trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(item.date) ||
      Number.isNaN(Date.parse(item.date)) ||
      new Date(item.date).toISOString().slice(0, 10) !== item.date
    )
      errors.push("Every update needs a title and valid date.");
    if (!d.news.tags.includes(item.tag))
      errors.push("Choose an approved update tag.");
    if (item.source && !externalURL(item.source))
      errors.push("Update source must be HTTPS.");
  }
  for (const item of d.roadmap?.items || [])
    if (
      !item.title?.trim() ||
      !["planned", "progress", "done"].includes(item.status)
    )
      errors.push("Roadmap items need a title and valid status.");
  for (const item of d.team?.members || [])
    if (
      !item.name?.trim() ||
      !item.role?.trim() ||
      (item.url && !externalURL(item.url))
    )
      errors.push("Team members need a name, role and valid optional URL.");
  for (const item of d.site.navigation || [])
    if (!ROUTES.includes(item.id))
      errors.push("Navigation must use a known page.");
  if (
    new Set(d.site.navigation.map((x) => x.id)).size !==
    d.site.navigation.length
  )
    errors.push("Navigation page IDs must be unique.");
  for (const key of FILES)
    if (!d[key]) errors.push(`Missing ${key} configuration.`);
  return [...new Set(errors)];
}
export function contrast(a, b) {
  const lum = (color) => {
    const rgb = (color || "#000000")
      .slice(1)
      .match(/../g)
      .map((n) => parseInt(n, 16) / 255)
      .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const x = lum(a),
    y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
// Static metadata is regenerated with each admin save for crawlers without JS.
export function documentHTML(page, d) {
  const depth = page === "home" || page === "404" ? "./" : "../";
  const fallbackBase =
    page === "404"
      ? `<base href="${escape(new URL(d.site.seo.baseUrl).pathname)}">`
      : "";
  const title =
    page === "home" ? d.site.title : `${d.pages[page].title} · ${d.site.title}`;
  const description = d.site.seo.description,
    base = d.site.seo.baseUrl;
  const canonical = new URL(
    page === "home" ? "" : page === "404" ? "404.html" : `${page}/`,
    base,
  ).href;
  const img = d.site.seo.image ? new URL(d.site.seo.image, base).href : "";
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light">${fallbackBase}<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'"><title>${escape(title)}</title><meta name="description" content="${escape(description)}"><meta name="robots" content="${page === "404" || page === "future" ? "noindex" : "index,follow"}"><link rel="canonical" href="${escape(canonical)}"><meta property="og:type" content="website"><meta property="og:site_name" content="${escape(d.site.title)}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(canonical)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}">${img ? `<meta property="og:image" content="${escape(img)}"><meta name="twitter:image" content="${escape(img)}"><meta property="og:image:alt" content="${escape(d.site.seo.imageAlt || d.site.heroAlt)}">` : ""}<link rel="icon" href="${depth}assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="${depth}assets/style.css"><script type="module" src="${depth}assets/app.js"></script></head><body data-page="${page}"><a class="skip" href="#main"></a><header id="header"></header><main id="main" tabindex="-1"></main><footer id="footer"></footer><noscript>${escape(d.site.title)} · ${escape(d.site.status)}. ${escape(d.pages[page].description)} <a href="${escape(d.links.items.find((x) => x.label === "Discord")?.url || base)}">${escape(d.site.communityLabel)}</a></noscript></body></html>\n`;
}
export function generatedFiles(d) {
  const output = {};
  for (const page of ROUTES)
    output[
      page === "home"
        ? "index.html"
        : page === "404"
          ? "404.html"
          : `${page}/index.html`
    ] = documentHTML(page, d);
  const urls = d.site.navigation
    .filter((n) => n.visible && n.id !== "future" && n.id !== "404")
    .map(
      (n) =>
        new URL(n.id === "home" ? "" : `${n.id}/`, d.site.seo.baseUrl).href,
    );
  output["sitemap.xml"] =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${escape(url)}</loc></url>`).join("")}</urlset>\n`;
  output["robots.txt"] =
    `User-agent: *\nAllow: /\nDisallow: ${new URL("admin/", d.site.seo.baseUrl).pathname}\nSitemap: ${d.site.seo.baseUrl}sitemap.xml\n`;
  return output;
}
