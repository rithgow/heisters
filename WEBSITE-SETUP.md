# Heisters website — setup and editing

## Folder structure

```text
heisters/
├── README.md                      Original repository file, unchanged
├── WEBSITE-SETUP.md                This guide
├── RESEARCH.md                     Verified sources and unknowns
├── VALIDATION.md                   Checks and remaining verification
├── THIRD-PARTY-NOTICES.md           Asset and development dependency notices
├── .github/workflows/website-pages.yml
├── website/
│   ├── index.html                 Home
│   ├── about/index.html
│   ├── news/index.html
│   ├── roadmap/index.html
│   ├── community/index.html
│   ├── team/index.html
│   ├── report/index.html
│   ├── credits/index.html
│   ├── future/index.html          Switched-off Phase 2 placeholders
│   ├── 404.html
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── .nojekyll
│   ├── admin/                     Forms, live preview and GitHub saving
│   ├── assets/
│   │   ├── app.js                 Safe DOM renderer
│   │   ├── content.js             JSON model, validation and metadata generation
│   │   ├── style.css
│   │   ├── favicon.svg            Hand-coded geometric H
│   │   ├── images/                Real supplied development screenshots
│   │   └── fonts/                 Ten approved font families and OFL licenses
│   └── data/                      All editable public content and theme settings
├── scripts/generate.mjs           Optional developer metadata helper
├── tests/                         DOM, admin and GitHub API contract tests
├── package.json
└── package-lock.json
```

## 1. Add the files to your existing repository

The existing repository is https://github.com/rithgow/heisters. It contained only `README.md` when inspected. That file has been kept unchanged. This package adds the website in `/website`.

1. Download and extract `Heisters-Website.zip`.
2. Open your existing local `heisters` repository, or clone it with GitHub Desktop.
3. Copy the package's contents into the repository, including `.github`, `.gitignore`, and `website`. If your computer hides dot folders, turn on hidden-file display. Keep your original `README.md`.
4. In GitHub Desktop, inspect the changes and commit with a message such as `Add Heisters development website`.
5. Click **Push origin**. You can also use the commands below from the repository folder.

```bash
git add website .github .gitignore WEBSITE-SETUP.md RESEARCH.md VALIDATION.md THIRD-PARTY-NOTICES.md scripts tests package.json package-lock.json
git commit -m "Add Heisters development website"
git push origin main
```

No token is bundled. The website is already committed to this repository and published at https://rithgow.github.io/heisters/. These setup steps are retained for future checkouts or redeployment.

## 2. Enable GitHub Pages

1. Open https://github.com/rithgow/heisters/settings/pages.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Open the repository's **Actions** tab. Run **Deploy Heisters website** if the initial push happened before you enabled Pages.
4. The included workflow uploads only `/website`; the public site requires no npm install, build step, server, or database.
5. After the workflow finishes, open https://rithgow.github.io/heisters/.
6. The editor will be at https://rithgow.github.io/heisters/admin/.

The workflow uses GitHub's Pages deployment environment. A new repository may show an environment approval if you have configured one. Change that in repository settings if appropriate for your team.

If you use another branch, change both the workflow's branch and **Site, hero & navigation → Repository → Branch**. If you use a custom domain, update **SEO → Published website URL** to the complete HTTPS URL ending in `/`. The editor also regenerates canonical links, Open Graph tags, Twitter tags, the sitemap, robots file, and the 404 base path when saving. GitHub Pages serves the 404 document at unknown nested URLs, so its generated base path points to the site's root; the regular pages use relative asset paths.

## 3. Create your fine-grained GitHub token

1. On GitHub, open your profile menu → **Settings → Developer settings → Personal access tokens → Fine-grained tokens**.
2. Choose **Generate new token**. Give it a recognizable name and an expiration date.
3. As the repository owner, choose **rithgow** as the resource owner. This owner-token flow works for this personal repository. Individual collaborator tokens have a GitHub limitation; see the team workflow below.
4. Select **Only select repositories**, then **heisters**.
5. Under repository permissions, set **Contents → Read and write**. GitHub includes Metadata access automatically. No Actions, Administration, Issues, or Workflows write permission is required for the editor.
6. Generate the token and copy it into the editor's token field. Do not put it in a JSON file, GitHub Issue, screenshot, chat message, or repository file.
7. Click **Connect and load GitHub**. This loads the newest site content from a single commit.
8. If your branch rules forbid direct commits, saving will be rejected; use an allowed editing branch and your normal pull-request process instead. The editor does not bypass branch protection.

A fine-grained token must be scoped to this repository. Anyone who has the token and repository permissions can edit its contents. The token persists only in this tab's `sessionStorage`; scripts do not put it in exports, repo files, URLs, or preview messages. API requests go only to `https://api.github.com`, and redirects are rejected. **Clear token** removes it from the editor; you can revoke it in GitHub settings at any time. The page itself is public and marked `noindex,nofollow`; saving is protected by GitHub permissions, not a client-side password.

### Team access on a personal repository

GitHub currently lists fine-grained-token contribution to outside/repository-collaborator repositories as unsupported. Consequently, teammates cannot assume their own fine-grained token can save directly to your personal `rithgow/heisters` repo, even with collaborator write access. This is a GitHub constraint, not a client-side password setting. See [GitHub token limitations](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#fine-grained-personal-access-tokens-limitations).

For the existing repository, teammates can edit without connecting, export a draft, and give that file to you. You connect and load current GitHub content, import the draft, review it, and save with your own repository-scoped token. Exported JSON has no token; new images must be committed separately or uploaded again by the saver. Whole-draft imports replace the draft, so compare with current content to preserve intervening changes.

For independent fine-grained team saving later, an organization-owned repository with the team as organization members can use individual scoped tokens, subject to organization policies and branch rules. If you choose that route, update the repository settings, published URL, and workflow yourself; this package does not transfer the repository. Do not distribute your personal token as a shared team credential or broaden it to a classic all-repositories token.

## 4. Edit the website

Connect **before** editing if you intend to save. Connecting replaces the current draft with GitHub's latest content, with an on-screen confirmation if there are unsaved edits.

- **Site, hero & navigation:** title, studio, tagline, development status, hero text, buttons, image paths, repository settings, SEO, page names, visibility, and ordering. Keep Home visible. Empty playable-game URLs show Coming Soon. The funding place is a separate link, never treated as the released game.
- **Page text / Buttons & interface text:** page headings, descriptions, labels, error messages, and empty states. Text is rendered as text, not HTML or Markdown.
- **Devlog / news:** Add entries, set real dates, choose Announcement / Added / Changed / Fixed, and add body text or a source. Entries appear newest first. Do not publish invented release notes.
- **Roadmap:** add approved items and choose planned, progress, or done.
- **Team & contributors:** add approved names, roles, biographies, profile links, and optional local images.
- **Community links:** change labels and HTTPS URLs. Empty links disappear. Keep the Discord label as `Discord` and the funding link label as `Funding / Development Place` if you want the automatic hero shortcuts to use them; the hero button captions can be edited separately.
- **Screenshot gallery:** add, remove or reorder real screenshots. Each image needs descriptive alt text. You can also leave image paths empty to display a labeled 16:9 box.
- **Colors & fonts:** select either included font for headings/body and change dark/light colors. All ten candidate families are bundled. Saving rejects key text combinations below 4.5:1 contrast. Visitor theme choices are remembered locally; the editor previews the draft's default mode.
- **Phase 2 switches:** all are initially off. An enabled item appears in navigation and opens its editable Coming soon page. Turning it off hides the navigation link and blocks its direct feature URL.
- **Credits & licenses:** editable notices, with the bundled font identities/license locations protected from accidental edits.

Use **Undo / Redo** to move through edits. **Restore defaults** resets the draft to this package's original content; it does not write to GitHub until you save. **Export draft** downloads JSON without credentials. **Import draft** loads an exported JSON file into the draft after validation and an on-screen confirmation; review it before saving. Pending image uploads are not in that JSON; keep their source files. A reload discards an unsaved in-memory draft. Closing a tab with unsaved changes prompts you when the browser supports it.

### Upload screenshots

1. Choose PNG, JPEG or WebP under 8 MB and at most 8192 pixels in either dimension.
2. Write a clear image description.
3. Choose **Hero + link preview** or **Screenshot gallery**, then click **Add image to draft**.
4. The editor decodes and re-encodes the image as WebP, downsizing to at most 2048 pixels. SVG and executable uploads are not accepted.
5. Use the live preview. It displays pending uploads before they are committed.
6. To use an uploaded gallery image in a news/team entry, copy its image path from the gallery field into that entry and add its alt text. No code editing is required.

### Save and collaborate

1. Review your changes using the live preview. Choose a page and 360px, 768px or 1280px width.
2. Enter a short commit message.
3. Click **Save to GitHub**.
4. One commit contains changed JSON, new images, and regenerated HTML metadata/sitemap/robots. Existing files outside these paths are preserved.
5. Wait for the Pages workflow to finish, then refresh the public page.

If another teammate has pushed a change since you connected, the editor refuses the save. Export your draft, reconnect, and reapply the intended changes to the newest content. GitHub can also refuse the final branch update if it changes during saving. The editor never force-pushes. Orphaned blobs from a refused save are not referenced by the branch and do not deploy.

Undo restores draft content only. To roll back a saved version, revert the website commit through GitHub or your normal Git workflow. Removed image references do not delete previously committed images automatically, preserving old revisions and avoiding accidental asset loss.

## 5. Placeholders to replace

| Location | Needed information |
| --- | --- |
| Site → Tagline | Your approved tagline |
| Site → Playable Roblox game URL | Actual playable-game URL when available; currently empty |
| About page description | Verified description of Heisters |
| News page description and empty entries | Approved summary and real dated development updates |
| Roadmap page description and items | Approved roadmap and genuine statuses |
| Community page description | Your approved short description |
| Team page description and members | Approved names, roles, contributions and links |
| Phase 2 content | Only when those sections are ready; all switches remain off |

Real screenshots are already included, so there are no mandatory image placeholders to replace. You may replace them with newer official screenshots. The supplied Discord, social, studio, developer, group, and funding URLs are configured. Their remote availability could not all be verified because several sources blocked automated access. No release date, vehicle stats, prices, lore, player counts, testimonials, or launch promises are seeded.

## 6. Add Phase 2 later

The switches and Coming soon views are scaffolding, not completed wiki/search/compare/calculator functionality.

| Feature family | Current switch IDs | Future developer extension |
| --- | --- | --- |
| Wiki | vehicles, heists, maps, items, roles, glossary | Add separate JSON collections and renderers |
| Search | search | Build an index from approved wiki JSON |
| Compare / calculators / tools | compare, calculator, tools | Read real numerical data from future collections |
| FAQ / media kit | faq, press | Add approved Q&A and actual media assets |
| Legal and site status | privacy, terms, official | Add approved legal text and status policy |
| Social / print / breadcrumbs | social, print, breadcrumbs | Add capability-specific rendering and any required privacy controls |

1. Add content schemas in `/website/data/`, with no invented entries.
2. Add their names to `FILES` in `assets/content.js`, their form templates/sections in `admin/editor.js`, and their original state in `data/defaults.json`.
3. Extend `assets/app.js` with semantic renderers and accessible interactions. Keep text in JSON, use `textContent`, validate URLs, and do not interpolate admin text into HTML.
4. If you add real routes, extend `ROUTES` and `generatedFiles()` so their HTML metadata is committed with every admin save. Add them to navigation or group them into wiki navigation.
5. Add meaningful tests for the new behavior.
6. Enable the relevant admin switch only when approved content or a deliberate Coming soon view is ready.

No wiki tables, vehicle statistics, payout formulas, social iframe integrations, or legal promises are included now.

## 7. Optional local preview and developer checks

The public site does not need Node or npm. To preview it on your own machine, open a terminal in the repository:

```bash
python -m http.server 8000 --directory website
```

Then visit http://localhost:8000/. Opening the HTML directly as `file://` will not work because it loads JSON with `fetch`.

Developer checks require Node.js and npm:

```bash
npm ci
npm test
npm run generate
```

`generate` updates static metadata from JSON without starting a server. The admin does the same generation in the browser when committing. If you edit JSON manually, run `generate` and commit its updated HTML, robots and sitemap files too. Node and LinkeDOM are test/development dependencies only; nothing is loaded from a CDN at runtime.

Before launch, visually inspect 360px, 768px and 1280px in your browser, keyboard navigation, light/dark themes, and the editor. Perform one admin token-backed save with a small legitimate change. The GitHub Pages workflow has been deployed successfully; visual layout checks and a real admin PAT save still require verification. See `VALIDATION.md`.

## Fonts, icons and libraries

Anton is the default display font; Rubik is the default body font. Included alternatives: Bebas Neue, Oswald, Russo One, Bungee, Chakra Petch, Teko, Barlow Condensed, Archivo Black. Every included font is licensed under **SIL Open Font License 1.1**, with the original `OFL.txt` beside its font file. See `/credits/` and `THIRD-PARTY-NOTICES.md`.

There is no external icon set or runtime JavaScript library. The favicon and geometric decorations are hand-coded; screenshots are supplied real development imagery. LinkeDOM is an optional development/test dependency, under ISC; transitive dependency notices are listed separately.
