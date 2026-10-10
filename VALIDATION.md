# Validation and remaining checks

The automated suite passes **27 tests** using Node's built-in test runner and LinkeDOM. No real token was used and no GitHub write occurred.

Verified:

- Every Phase 1 route renders a semantic main heading and labeled navigation.
- Real image references and ten font/license pairs exist in the package.
- News is sorted newest-first and filters correctly.
- Empty community links disappear, Coming Soon is shown without a playable URL, and the funding link remains distinct.
- Disabled Phase 2 links are absent and direct feature URLs show 404; enabling a switch shows its placeholder page and live-preview option.
- Hidden ordinary pages do not render their public content.
- Form labels, image alt text, keyboard menu state/Escape handling, and key text contrast pairs are checked.
- Default theme text pairs meet WCAG AA 4.5:1; invalid contrasting themes are rejected on save.
- Report submission constructs a draft GitHub Issue URL for rithgow/heisters and does not submit it automatically.
- Admin forms add, edit and remove entries. Undo, redo, draft-only restore defaults, validated teammate-draft import, token clearing, and preview messaging work in DOM tests.
- Script-like content is rendered literally; unsafe link protocols, credentials in URLs, traversal and unsafe image paths are rejected.
- Metadata generation escapes attribute text and creates the sitemap and robots file from JSON.
- Public relative asset references exist; the 404 base path handles nested GitHub Pages fallback URLs.
- Mocked GitHub API tests confirm one atomic commit, preservation of existing files through base_tree, non-force reference updates, stale-head protection, final update conflicts, safe permission errors, and UTF-8 blob encoding.
- Credentials are absent from content exports/preview messages and request bodies. Authenticated requests use a fixed api.github.com origin and reject redirects.
- The original README remains unchanged.

Verification limits:

- CSS breakpoint rules for **360px, 768px and 1280px** were inspected and checked structurally. They have **not been rendered or visually measured in a real browser** here. The supported browser QA tool was unavailable in this managed environment.
- DOM tests do not prove screen-reader behavior, actual CSS layout, iframe sandbox behavior, image decoding/canvas upload conversion, focus visibility, or font rendering. Check these on your devices before launch.
- GitHub saving was tested against realistic mocked API responses, including concurrency failures. A **real PAT-backed save, protected-branch behavior and the live Pages workflow have not been exercised** here.
- Several supplied external sites blocked automated access. Their URL syntax matches the user brief, but invite validity, account availability and current destination content could not all be confirmed.
- Personal-repository collaborators cannot currently assume their individual fine-grained tokens can contribute to this repository. The guide documents owner saving and draft export/import, plus the organization-member option for future independent team saving.
- The site is **prepared for GitHub Pages, not published**. The package's guide contains the exact setup steps.

Before launch:

1. Open the deployed site at 360px, 768px and 1280px. Confirm no horizontal overflow or covered controls.
2. Tab through navigation, theme toggle, news filters and report form. Test Escape in the mobile menu.
3. Confirm light/dark appearance, images, readable text, and reduced-motion settings.
4. Use admin to make one small legitimate change, preview it, save with your fine-grained token, and wait for Pages deployment.
5. Test a real image upload and undo/restore behavior; check the deployed link preview metadata.
6. Open a nonexistent nested URL to confirm the 404 page loads styled and its Home link works.
7. Click each external link yourself and confirm the Discord invite/group/funding destination.

Run `npm ci && npm test` to repeat automated checks. The deployment itself has no Node/npm/build requirement.
