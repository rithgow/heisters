import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { FILES, clone } from "../website/assets/content.js";
import { GitHubSession, encode64, decode64 } from "../website/admin/github.js";
const root = new URL("../website/", import.meta.url);
const data = Object.fromEntries(
  await Promise.all(
    FILES.map(async (key) => [
      key,
      JSON.parse(await readFile(new URL(`data/${key}.json`, root), "utf8")),
    ]),
  ),
);
function mockAPI({ race = false, finalRace = false, fail = false } = {}) {
  const calls = [];
  let heads = 0;
  const request = async (url, options) => {
    const path = new URL(url).pathname,
      body = options.body ? JSON.parse(options.body) : null;
    calls.push({ url, options, body });
    let result;
    if (path.includes("/git/ref/")) {
      heads++;
      result = {
        object: { sha: race && heads > 1 ? "other-head" : "old-head" },
      };
    } else if (path.endsWith("/git/commits/old-head"))
      result = { tree: { sha: "base-tree" } };
    else if (path.endsWith("/git/trees/base-tree"))
      result = {
        tree: FILES.map((key) => ({
          path: `website/data/${key}.json`,
          type: "blob",
          sha: key,
        })),
        truncated: false,
      };
    else if (path.includes("/git/blobs/") && options.method === "GET") {
      const key = path.split("/").at(-1);
      result = {
        encoding: "base64",
        content: encode64(new TextEncoder().encode(JSON.stringify(data[key]))),
      };
    } else if (path.endsWith("/git/blobs")) result = { sha: "upload-blob" };
    else if (path.endsWith("/git/trees")) result = { sha: "new-tree" };
    else if (path.endsWith("/git/commits")) result = { sha: "new-commit" };
    else if (path.includes("/git/refs/")) {
      if (finalRace) return { ok: false, status: 422 };
      result = { object: { sha: "new-commit" } };
    } else throw new Error(`Unmocked URL ${path}`);
    return fail
      ? { ok: false, status: 403 }
      : { ok: true, status: 200, json: async () => result };
  };
  return { calls, request };
}
test("Save creates one atomic commit, preserves existing files, and pins requests to GitHub", async () => {
  const mock = mockAPI(),
    session = new GitHubSession(
      data.site.repository,
      "TEST_TOKEN",
      mock.request,
    );
  const d = await session.load();
  d.site.tagline = "[Updated tagline]";
  const url = await session.save(d, [
    {
      path: "assets/images/upload-test.webp",
      bytes: new Uint8Array([1, 2, 3]),
    },
  ]);
  assert(url.endsWith("/new-commit"));
  const trees = mock.calls.filter((c) => c.url.endsWith("/git/trees"));
  assert.equal(trees.length, 1);
  assert.equal(trees[0].body.base_tree, "base-tree");
  assert(trees[0].body.tree.some((x) => x.path === "website/data/site.json"));
  assert(trees[0].body.tree.some((x) => x.path === "website/index.html"));
  assert(trees[0].body.tree.some((x) => x.path === "website/sitemap.xml"));
  assert(!trees[0].body.tree.some((x) => x.path === "README.md"));
  assert.equal(
    mock.calls.filter(
      (c) => c.url.endsWith("/git/commits") && c.options.method === "POST",
    ).length,
    1,
  );
  const patch = mock.calls.find((c) => c.options.method === "PATCH");
  assert.equal(patch.body.force, false);
  for (const call of mock.calls) {
    assert.equal(new URL(call.url).origin, "https://api.github.com");
    assert.equal(call.options.redirect, "error");
    assert(!call.options.body?.includes("TEST_TOKEN"));
  }
});
test("Stale content is never overwritten", async () => {
  const mock = mockAPI({ race: true }),
    session = new GitHubSession(data.site.repository, "TEST", mock.request);
  const d = await session.load();
  d.site.tagline = "change";
  await assert.rejects(session.save(d), /branch changed/);
  assert(!mock.calls.some((c) => c.options.method === "POST"));
});
test("A branch race during saving fails the non-force update", async () => {
  const mock = mockAPI({ finalRace: true }),
    session = new GitHubSession(data.site.repository, "TEST", mock.request);
  const d = await session.load();
  d.site.tagline = "change";
  await assert.rejects(session.save(d), /refused/);
  assert.equal(session.base.sha, "old-head");
});
test("API failures report safe messages and never expose token", async () => {
  const mock = mockAPI({ fail: true }),
    session = new GitHubSession(
      data.site.repository,
      "PRIVATE_TEST_TOKEN",
      mock.request,
    );
  await assert.rejects(
    session.load(),
    (error) =>
      error.message.includes("Permission denied") &&
      !error.message.includes("PRIVATE_TEST_TOKEN"),
  );
});
test("UTF-8 content round-trips through blobs", () => {
  const text = "Heisters · Rifted Games — café";
  assert.equal(decode64(encode64(new TextEncoder().encode(text))), text);
});
