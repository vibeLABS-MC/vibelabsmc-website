# CLAUDE.md

Guidance for Claude Code (and humans) working on **vibelabsmc.org**, the vibeLABS landing site.
The documentation is a separate project: repo `vibeLABS-MC/vibelabsmc-docs`, served at
**docs.vibelabsmc.org**. This site introduces vibeLABS and sends readers there.

## Branches and deployment

| Branch    | What it holds                                  | What happens on push                      |
| --------- | ---------------------------------------------- | ----------------------------------------- |
| `develop` | The SvelteKit landing site. **Work here.**     | CI runs every check. Nothing is deployed. |
| `main`    | Only the under-construction page in `public/`. | Deploys to the live domain immediately.   |

- Branch from `develop` and open pull requests **into `develop`**.
- **Never push to `main`** unless the team has explicitly decided to change what the public sees.
  GitHub only allows the `github-pages` environment to deploy from `main`.
- Launch = a pull request from `develop` into `main`. `develop` already contains `main`'s
  under-construction commit and its revert, so the merge is clean.
- `develop.vibelabsmc.org` is a manual preview of `develop` on the team's server; it does not
  update on push.

## Commands

Bun is the package manager: use `bun install`, `bun add`, `bun run`, never npm, pnpm or yarn, and
commit `bun.lock`. Vite and SvelteKit run on Node 22.12+.

```bash
bun install
bun run dev          # http://localhost:5173 with hot reload
bun run test         # unit tests (Vitest, project "unit")
bun run check        # svelte-check: Svelte + TypeScript types
bun run lint         # Prettier check (bun run format to fix)
bun run build        # prerender everything into build/
bun run test:site    # checks on build/ (run after build)
bun run coverage     # unit tests + coverage/lcov.info
bun run preview      # serve build/ locally
```

Use `bun run test`, not `bun test`: plain `bun test` starts Bun's own runner, which does not read
the Vitest config. Before you push: `bun run lint && bun run check && bun run test && bun run build
&& bun run test:site`. CI (`.github/workflows/pages.yml`) runs exactly that.

## Stack

- **SvelteKit 3** with **Svelte 5 runes** and `@sveltejs/adapter-static`. Kit config lives in
  `vite.config.ts` inside `sveltekit({ ... })`; there is no `svelte.config.js`.
- Imports use package subpaths: `#lib/site.ts` maps to `src/lib/site.ts`. Keep the `.ts` extension.
- **[bits-ui](https://bits-ui.com) 2** for interactive components (headless, accessible):
  `Tabs` (the two paths), `Accordion` (FAQ), `Dialog` (mobile menu), `Tooltip` (icon buttons),
  `Toggle` (theme). Style them with classes: bits-ui sets `data-state` and similar attributes to
  target, for example `.segment[data-state='active']`.
- Design tokens follow [Untitled UI React](https://github.com/untitleduico/react) (MIT), in
  `src/app.css`, using `light-dark()`. Fonts: Inter via Fontsource. Icons: `@lucide/svelte`,
  brand icons from `simple-icons`.

## Code layout

```
src/lib/site.ts         site facts and docsUrl(), the only way to link into the docs
src/lib/landing.ts      the landing page's words: paths, frame passes, FAQ
src/lib/nav.ts          header and footer links
src/lib/theme.ts        theme choice logic (unit-tested)
src/lib/brand/logo.ts   the wordmark as one SVG path (the docs site draws the same path)
src/lib/components/     SiteHeader, MobileMenu, ThemeToggle, Hint, PathTabs, FrameStrip, Faq,
                        Footer, Logo, Seo, BrandIcon
src/routes/             the page, the error page and sitemap.xml
tests/site/             checks against the built site in build/
public/                 (main only) the under-construction page
```

## Content rules

- Words live in `src/lib/landing.ts`. Keep every claim in step with the docs, and link to the page
  that backs it up with `docsUrl('/section/page/')`. `docsUrl` throws on a relative path or a
  missing trailing slash, so a bad link fails the build.
- No invented stats, testimonials, team sizes or features. Plain English, British spelling,
  sentence-case headings, no emoji or exclamation marks.

## Security rules (the CSP is strict on purpose)

The Content Security Policy is defined in `vite.config.ts` (`csp`, hash mode) and written into
every page as a `<meta>` tag. Cloudflare only adds `frame-ancestors 'none'` plus HSTS, nosniff,
referrer, permissions and frame headers. Never add a full CSP header in Cloudflare.

- **No `style="..."` attributes and no inline scripts in the HTML.** `tests/site/csp.test.ts`
  fails if one appears.
- Styles that bits-ui sets **at runtime** (tooltip positions) are fine: Svelte writes them through
  `element.style`, which the CSP allows. Styles it renders **on the server** are not.
  `Accordion.Content` does this, so `Faq.svelte` renders the answer itself through the `child`
  snippet and drops `style`. Do the same if another bits-ui part puts `style=` into
  `build/index.html`.
- Svelte transitions and `style:` directives emit inline styles; do not use them.
- Fonts and images must stay files (`build.assetsInlineLimit: 0`).
- New third-party resources need a CSP directive change in `vite.config.ts` and a matching update
  in `tests/site/csp.test.ts`.

## Design rules

- Use the CSS variables (`--fg`, `--fg-3`, `--bg-subtle`, `--line`, `--accent`, ...); do not
  hard-code colours in components. Each colour is declared once with `light-dark()`.
- bits-ui renders tooltips and the dialog at the end of `<body>`, outside every component, so
  their styles (`.hint`, `.sheet`, `.sheet-overlay`) live in `src/app.css`.
- Minimal and education-first. Check layouts at 375px and 1440px, in light and dark mode.

## Engineering practice (ub-mode)

The team follows [ub-mode](https://github.com/unclebob/ub-mode): write the failing test first,
keep logic in pure `.ts` modules (the tools below do not read `.svelte`), keep every function under
CRAP 10, remove duplication scoring 0.8 or more, kill surviving mutants, and make small commits
whose messages say why, what and how it was proved. Current state: worst CRAP 4, no duplication,
100% of mutants killed.

```bash
bun run coverage
python -m crapper --use-existing-coverage --threshold 10 src/lib/*.ts
python -m dryer --threshold 0.8 src/lib src/routes tests
python -m mutator --use-existing-coverage --test-command "node node_modules/vitest/vitest.mjs run --project unit" src/lib/site.ts src/lib/theme.ts
```

## Gotchas

- `vite preview` serves `.svelte-kit/output`; rebuilding while it runs can crash it. Restart it.
- SvelteKit's route announcer sets one inline style; its hash is allowed in `style-src`, and
  `tests/site/csp.test.ts` fails if a SvelteKit update changes it. Update the hash when that happens.
- `bun run test:site` needs a fresh `bun run build` first.

## Open items

- `SITE.discord` in `src/lib/site.ts` is `null`; set the public invite to show Discord links.
- The docs are still in preview (noindex) until their pages have had an expert review.
