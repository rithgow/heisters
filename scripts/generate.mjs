import { readFile, writeFile } from "node:fs/promises";
import {
  FILES,
  generatedFiles,
  validateData,
} from "../website/assets/content.js";
const root = new URL("../website/", import.meta.url);
const d = Object.fromEntries(
  await Promise.all(
    FILES.map(async (key) => [
      key,
      JSON.parse(await readFile(new URL(`data/${key}.json`, root), "utf8")),
    ]),
  ),
);
const errors = validateData(d);
if (errors.length) throw new Error(errors.join("\n"));
for (const [path, text] of Object.entries(generatedFiles(d)))
  await writeFile(new URL(path, root), text);
console.log("Generated static HTML metadata, sitemap and robots from JSON.");
