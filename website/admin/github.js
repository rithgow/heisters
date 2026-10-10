import {
  FILES,
  clone,
  generatedFiles,
  validateData,
} from "../assets/content.js";
const API = "https://api.github.com";
const TOKEN_KEY = "heisters-github-token";
export const getToken = () => sessionStorage.getItem(TOKEN_KEY) || "";
export const setToken = (token) => {
  if (token) sessionStorage.setItem(TOKEN_KEY, token.trim());
  else sessionStorage.removeItem(TOKEN_KEY);
};
export function decode64(text) {
  return new TextDecoder().decode(
    Uint8Array.from(atob(text.replace(/\s/g, "")), (c) => c.charCodeAt(0)),
  );
}
export function encode64(bytes) {
  let text = "";
  for (let i = 0; i < bytes.length; i += 8192)
    text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text);
}
export class GitHubSession {
  constructor(repo, token = getToken(), request = fetch) {
    this.repo = clone(repo);
    this.token = token;
    this.request = request;
    this.base = null;
    if (
      !/^[\w.-]+$/.test(repo.owner) ||
      !/^[\w.-]+$/.test(repo.name) ||
      repo.sitePath !== "website" ||
      !/^[\w./-]+$/.test(repo.branch) ||
      repo.branch.includes("..")
    )
      throw new Error("Invalid repository configuration.");
    this.prefix = `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`;
  }
  async api(path, method = "GET", body) {
    // The token can only leave the browser in an Authorization header to GitHub.
    if (!path.startsWith(this.prefix + "/"))
      throw new Error("Invalid API route.");
    const response = await this.request(`${API}${path}`, {
      method,
      redirect: "error",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        Authorization: `Bearer ${this.token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) {
      const message =
        {
          401: "Token is invalid or expired.",
          403: "Permission denied. Check Contents read/write permission and branch rules.",
          404: "Repository, branch or site files were not found.",
          409: "The branch changed. Reload from GitHub before saving.",
          422: "GitHub refused the update. Check branch rules and reload before retrying.",
        }[response.status] || `GitHub request failed (${response.status}).`;
      throw new Error(message);
    }
    return response.json();
  }
  async head() {
    return (
      await this.api(
        `${this.prefix}/git/ref/heads/${encodeURIComponent(this.repo.branch)}`,
      )
    ).object.sha;
  }
  async load() {
    const sha = await this.head();
    const commit = await this.api(`${this.prefix}/git/commits/${sha}`);
    const tree = await this.api(
      `${this.prefix}/git/trees/${commit.tree.sha}?recursive=1`,
    );
    if (tree.truncated)
      throw new Error("Repository tree is too large to load safely.");
    const data = {};
    for (const key of FILES) {
      const file = tree.tree.find(
        (n) =>
          n.path === `${this.repo.sitePath}/data/${key}.json` &&
          n.type === "blob",
      );
      if (!file)
        throw new Error(
          `Missing data/${key}.json. Commit the website package first.`,
        );
      const blob = await this.api(`${this.prefix}/git/blobs/${file.sha}`);
      if (blob.encoding !== "base64")
        throw new Error("Unsupported file encoding.");
      data[key] = JSON.parse(decode64(blob.content));
    }
    const errors = validateData(data);
    if (errors.length) throw new Error(errors.join("\n"));
    this.base = { sha, tree: commit.tree.sha, data: clone(data) };
    return data;
  }
  async save(data, uploads = [], message = "Update Heisters website content") {
    if (!this.base)
      throw new Error("Connect and load the latest GitHub content first.");
    const errors = validateData(data);
    if (errors.length) throw new Error(errors.join("\n"));
    if (JSON.stringify(data.site.repository) !== JSON.stringify(this.repo))
      throw new Error("Repository settings changed. Reconnect before saving.");
    if ((await this.head()) !== this.base.sha)
      throw new Error(
        "The branch changed since you connected. Export your draft, then reload from GitHub to avoid overwriting another editor.",
      );
    const changes = [];
    for (const key of FILES)
      if (JSON.stringify(data[key]) !== JSON.stringify(this.base.data[key]))
        changes.push({
          path: `${this.repo.sitePath}/data/${key}.json`,
          mode: "100644",
          type: "blob",
          content: JSON.stringify(data[key], null, 2) + "\n",
        });
    if (!changes.length && !uploads.length)
      throw new Error("No changes to save.");
    for (const upload of uploads) {
      if (!/^assets\/images\/[a-zA-Z0-9_-]+\.webp$/.test(upload.path))
        throw new Error("Invalid upload path.");
      const blob = await this.api(`${this.prefix}/git/blobs`, "POST", {
        content: encode64(upload.bytes),
        encoding: "base64",
      });
      changes.push({
        path: `${this.repo.sitePath}/${upload.path}`,
        mode: "100644",
        type: "blob",
        sha: blob.sha,
      });
    }
    // Metadata, robots and sitemap travel with content in the same commit.
    for (const [path, content] of Object.entries(generatedFiles(data)))
      changes.push({
        path: `${this.repo.sitePath}/${path}`,
        mode: "100644",
        type: "blob",
        content,
      });
    const tree = await this.api(`${this.prefix}/git/trees`, "POST", {
      base_tree: this.base.tree,
      tree: changes,
    });
    const commit = await this.api(`${this.prefix}/git/commits`, "POST", {
      message: message.trim() || "Update Heisters website content",
      tree: tree.sha,
      parents: [this.base.sha],
    });
    // force:false also catches changes that happened during blob creation.
    await this.api(
      `${this.prefix}/git/refs/heads/${encodeURIComponent(this.repo.branch)}`,
      "PATCH",
      { sha: commit.sha, force: false },
    );
    this.base = { sha: commit.sha, tree: tree.sha, data: clone(data) };
    return `https://github.com/${this.repo.owner}/${this.repo.name}/commit/${commit.sha}`;
  }
}
