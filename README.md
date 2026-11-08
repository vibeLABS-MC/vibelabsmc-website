# vibelabsmc-website

Source for **[vibelabsmc.org](https://vibelabsmc.org)**: community documentation for Minecraft
shader players and developers, covering Iris and OptiFine.

Want to fix or add a page? Read [CONTRIBUTING.md](CONTRIBUTING.md). Pages are Markdown files in
`src/content/docs/`.

## Stack

- **SvelteKit 3 + Svelte 5**, prerendered to static HTML with `@sveltejs/adapter-static`.
- **marked** for Markdown, **Shiki** for highlighting (classes, not inline styles), all at build
  time. The browser only downloads a small script for search, the theme switch and copy buttons.
- Design tokens follow [Untitled UI React](https://github.com/untitleduico/react) (MIT).
- Fonts: Inter and JetBrains Mono, self-hosted through Fontsource.

## Commands

```bash
npm install
npm run dev          # local server with hot reload
npm test             # unit tests (Vitest)
npm run check        # type-check Svelte and TypeScript
npm run build        # prerender the site into build/
npm run test:site    # check the built pages (CSP, metadata, sitemap, search index)
npm run coverage     # unit tests with coverage in coverage/lcov.info
```

`npm run build` fails on a broken internal link, a missing `#anchor`, invalid frontmatter or an
unknown callout, code language or pipeline pass, and the message names the file.

## Layout

```
src/content/docs/       the pages, one Markdown file each
src/lib/docs/           parsing, catalog, Markdown rendering, search (pure, unit-tested)
src/lib/server/         reads the content at build time
src/lib/components/     header, sidebar, outline, search dialog, theme switch
src/routes/             home, /docs, /docs/[slug], /search.json, /sitemap.xml
static/                 logo, icons, social image, theme bootstrap, robots.txt
tests/site/             checks against the built site in build/
```

## How it is hosted

- **GitHub Pages** serves `build/`. `.github/workflows/pages.yml` runs formatting, type and unit
  checks, builds, checks the built site, then deploys on every push to `main`. Pull requests run
  the same checks without deploying.
- **Cloudflare** sits in front for DNS, CDN caching, HTTPS, analytics and security headers.

| Domain                                 | Behaviour                                                            |
| -------------------------------------- | -------------------------------------------------------------------- |
| `vibelabsmc.org`                       | Serves this site                                                     |
| `www.vibelabsmc.org`                   | 301 redirect to `https://vibelabsmc.org` (Cloudflare Redirect Rule)  |
| `vibelabsmc.com`, `www.vibelabsmc.com` | 301 redirect to `https://vibelabsmc.org`, keeping the path and query |

The Content Security Policy is written into every page by SvelteKit (see `csp` in
`vite.config.ts`), with hashes for the inline scripts it generates. Cloudflare's response-header
Transform Rule adds HSTS, `nosniff`, referrer and permissions policies, and frame blocking.
Do not add a second CSP header in Cloudflare: browsers enforce both, and the header cannot know the
per-build script hashes.
