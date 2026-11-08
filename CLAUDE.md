# CLAUDE.md

Guidance for Claude Code (and humans) working on **vibelabsmc.org**, the vibeLABS community
documentation site for Minecraft shaders (Iris and OptiFine). Read this before changing anything.

## Branches and deployment

| Branch    | What it holds                                  | What happens on push                      |
| --------- | ---------------------------------------------- | ----------------------------------------- |
| `develop` | The full SvelteKit docs site. **Work here.**   | CI runs every check. Nothing is deployed. |
| `main`    | Only the under-construction page in `public/`. | Deploys to the live domain immediately.   |

- Branch from `develop` and open pull requests **into `develop`**.
- **Never push to `main`** unless the team has explicitly decided to change what the public sees.
  GitHub only allows the `github-pages` environment to deploy from `main`.
- Launch = a pull request from `develop` into `main`. `develop` already contains `main`'s
  under-construction commit and its revert, so the merge is clean and swaps the placeholder for
  this site and its full workflow.

## Commands

```bash
npm install
npm run dev          # http://localhost:5173 with hot reload
npm test             # unit tests (Vitest, project "unit")
npm run check        # svelte-check: Svelte + TypeScript types
npm run lint         # Prettier check (npm run format to fix)
npm run build        # prerender everything into build/
npm run test:site    # checks on build/ (run after build)
npm run coverage     # unit tests + coverage/lcov.info
npm run preview      # serve build/ locally
```

Before you push, run: `npm run lint && npm run check && npm test && npm run build && npm run test:site`.
CI (`.github/workflows/pages.yml`) runs exactly that.

## Stack (versions matter)

- **SvelteKit 3** with **Svelte 5 runes** and `@sveltejs/adapter-static`. Kit 3 differs from Kit 2:
  - Kit config lives in `vite.config.ts` inside `sveltekit({ ... })`. There is no `svelte.config.js`.
  - The `$lib` alias is replaced by Node subpath imports: `#lib/*` maps to `src/lib/*`. Import TS
    modules **with the extension**: `import { SITE } from '#lib/site.ts'`. Svelte files:
    `#lib/components/Toc.svelte`.
- Every route is prerendered (`export const prerender = true` in `src/routes/+layout.ts`).
- Markdown: **marked** with custom extensions; highlighting: **Shiki**. Both run only at build
  time on the server (`src/lib/server/`), never in the browser.
- Tests: **Vitest 4** (`unit` and `site` projects in `vite.config.ts`), **happy-dom** for DOM tests
  (`// @vitest-environment happy-dom` at the top of the file).
- Icons: `@lucide/svelte` (named imports) and `simple-icons` for brand marks (`BrandIcon.svelte`).
- Fonts: Inter and JetBrains Mono via `@fontsource-variable/*`, bundled as files.
- Formatting: Prettier with tabs, single quotes, width 100 (`prettier.config.js`).

## How the code is organised

````
src/content/docs/*.md      the pages; the file name is the URL (/docs/<file-name>)
src/lib/docs/              pure logic, unit-tested:
  sections.ts                the four sections and the loaders (single source of truth)
  page.ts                    parsePage: frontmatter validation at the boundary
  catalog.ts                 sidebar order, previous/next, recently updated
  markdown.ts                renderMarkdown: anchors, callouts, code fences, tables, reading time
  highlight.ts               Shiki with class-based token colours (no inline styles)
  pipeline.ts                the render passes for ```pipeline blocks and the home diagram
  search.ts                  ranking for the Ctrl+K search
  summary.ts, dates.ts       page summaries for the browser, date formatting
src/lib/server/content.ts  reads the Markdown files (import.meta.glob) and builds the catalog
src/lib/components/        Svelte UI: DocsHeader, Sidebar, Toc, SearchDialog, ThemeToggle, ...
src/lib/site.ts            site name, URL, repo, Discord invite (null hides Discord buttons)
src/routes/                /, /docs, /docs/[slug], /search.json, /sitemap.xml, +error.svelte
src/app.css                design tokens and global styles (Markdown output is styled here)
static/                    logo, icons, social image, theme.js, robots.txt
tests/site/                tests that read build/ (CSP, metadata, sitemap, search index)
````

Data flow: Markdown file → `parsePage` (validates, errors name the file) → `buildCatalog` →
`renderMarkdown` with Shiki → route `load` functions → Svelte pages, all at build time.

## Writing and editing content

Follow `CONTRIBUTING.md` (frontmatter fields, callouts, code fences, pipeline blocks). Rules:

- Facts must be right for current Iris and OptiFine. Check them against primary sources:
  [shaders.properties](https://shaders.properties), OptiFine's
  [shaders.txt](https://github.com/sp614x/optifine/blob/master/OptiFineDoc/doc/shaders.txt), the
  [Iris repo](https://github.com/IrisShaders/Iris) and the
  [LabPBR spec](https://shaderlabs.org/wiki/LabPBR_Material_Standard). When the loaders differ,
  say which does what. Leave out anything you cannot verify.
- Write in your own words. The shaderLABS wiki is CC BY-NC-SA; do not copy from it.
- GLSL examples must compile: `#version 330 compatibility`, `in`/`out`, `/* RENDERTARGETS: */`.
- Style: plain English, short sentences, sentence-case headings, British spelling, no emoji or
  exclamation marks, no "simply/just/easy".
- The build fails on a broken internal link, a missing `#anchor`, bad frontmatter or an unknown
  callout type, code language or pipeline pass. That is intended; fix the content, not the check.

## Security rules (the CSP is strict on purpose)

The Content Security Policy is defined in `vite.config.ts` (`csp`, hash mode) and written into
every page as a `<meta>` tag. Cloudflare only adds `frame-ancestors 'none'` plus HSTS, nosniff,
referrer, permissions and frame headers.

- **No `style="..."` attributes and no inline scripts** in components or generated HTML. Use
  classes. Shiki output is converted to classes in `highlight.ts`; keep it that way.
- Svelte transitions and `style:` directives emit inline styles: do not use them.
- Fonts and images must stay files (`build.assetsInlineLimit: 0`); `data:` fonts are blocked.
- New third-party resources (scripts, images, fonts, APIs) need a CSP directive change in
  `vite.config.ts` and a matching update in `tests/site/csp.test.ts`.
- Raw HTML in Markdown is escaped on purpose. Do not turn that off.
- Never add a full CSP header in Cloudflare: browsers enforce both policies and the header cannot
  know the per-build script hashes.

## Design rules

- Tokens follow Untitled UI React (MIT): greys, indigo accent, shadows, type scale. They live in
  `src/app.css` and use `light-dark()`, so each colour is declared once and dark mode is automatic.
  Use the CSS variables (`--fg`, `--fg-3`, `--bg-subtle`, `--line`, `--accent`, ...); do not
  hard-code colours in components.
- The logo is drawn with a CSS mask (`.logo`), so it takes the surrounding text colour.
- Keep the look minimal and documentation-first: no invented stats, testimonials or fake features.
- Check layouts at 375px and 1440px; nothing may scroll sideways except code blocks and tables.

## Engineering practice (ub-mode)

The team builds this site following [ub-mode](https://github.com/unclebob/ub-mode). In short:

1. **Make it work.** Get the data shape right first. Write the failing test before the code, see
   it fail for the expected reason, then make the smallest change that passes. Check outside data
   once at the boundary (`parsePage`) and keep business logic in pure functions in `src/lib/docs/`.
   Keep Svelte components thin: the quality tools below only read `.ts` files.
2. **Make it right.** Test behaviour, not implementation. Keep every function under CRAP 10
   ([crapper](https://github.com/unclebob/crapper)), remove duplication scoring 0.8 or more
   ([dryer](https://github.com/unclebob/dryer)), and kill surviving mutants and delete dead code
   ([mutator](https://github.com/unclebob/mutator)). Current state: worst CRAP 7.0, no
   duplication, 100% of mutants killed.
3. **Practice.** Small ordered commits; each message says why, what changed and how it was proved.

Running the tools (they are Python projects; on Windows use the venv's `Scripts/python.exe`):

```bash
npm run coverage
python -m crapper --use-existing-coverage --threshold 10 src/lib/docs/*.ts src/lib/*.ts src/lib/server/*.ts
python -m dryer --threshold 0.8 src/lib src/routes tests
python -m mutator --use-existing-coverage --test-command "node node_modules/vitest/vitest.mjs run --project unit" src/lib/docs/search.ts
```

Pass files explicitly to crapper, or it also scans `build/` and `.svelte-kit/`. Mutator writes to
`.metrics/` and `target/` (both git-ignored).

## Gotchas

- Annotating a load function as `export const load: PageServerLoad = ...` widens its return type
  and the page loses types. Use `export const load = (async () => { ... }) satisfies PageServerLoad`.
- `vite preview` serves `.svelte-kit/output`; rebuilding while it runs can crash it. Restart it.
- SvelteKit's route announcer sets one inline style; its hash is allowed in `style-src`, and
  `tests/site/csp.test.ts` fails if a SvelteKit update changes it. Update the hash when that happens.
- `npm run test:site` needs a fresh `npm run build` first.

## Open items

- `SITE.discord` in `src/lib/site.ts` is `null`; set the public invite to show Discord buttons.
- No content licence is chosen yet (text is currently all rights reserved).
- The 15 pages need a review by an experienced shader developer before launch.
- "Recently updated" on the home page shows the newest `updated:` dates; keep them honest.
