# vibelabsmc-website

Source for **[vibelabsmc.org](https://vibelabsmc.org)**, the vibeLABS landing site: a community for
people who play with Minecraft shaders and people who write them.

The documentation lives in its own repo,
[vibelabsmc-docs](https://github.com/vibeLABS-MC/vibelabsmc-docs), at
[docs.vibelabsmc.org](https://docs.vibelabsmc.org). To fix or add a guide, go there.

## Branches

- **`develop`** (this branch): the landing site. Branch from it and open pull requests into it.
  CI runs every check here but never deploys.
- **`main`**: only the under-construction page, live on vibelabsmc.org. Launching means merging
  `develop` into `main`.

Using Claude Code? It reads [CLAUDE.md](CLAUDE.md) for the project rules.

## Stack

- **SvelteKit 3 + Svelte 5**, prerendered to static HTML with `@sveltejs/adapter-static`.
- **[bits-ui](https://bits-ui.com)** for the interactive parts: tabs, FAQ accordion, mobile menu,
  tooltips and the theme toggle.
- **[Bun](https://bun.sh)** to install packages and run scripts (Vite itself runs on Node 22.12+).
- Design tokens follow [Untitled UI React](https://github.com/untitleduico/react) (MIT).

## Commands

```bash
bun install
bun run dev          # local server with hot reload
bun run test         # unit tests (Vitest)
bun run check        # type-check Svelte and TypeScript
bun run lint         # Prettier check
bun run build        # prerender the site into build/
bun run test:site    # check the built page (CSP, metadata, links into the docs)
```

## How it is hosted

- **GitHub Pages** serves `build/`. `.github/workflows/pages.yml` runs formatting, type and unit
  checks, builds, checks the built site, then deploys, but only on pushes to `main`.
- **Cloudflare** sits in front for DNS, CDN caching, HTTPS, analytics and security headers.

| Domain                                 | Behaviour                                                            |
| -------------------------------------- | -------------------------------------------------------------------- |
| `vibelabsmc.org`                       | Serves this site                                                     |
| `docs.vibelabsmc.org`                  | The documentation (separate repo)                                    |
| `www.vibelabsmc.org`                   | 301 redirect to `https://vibelabsmc.org` (Cloudflare Redirect Rule)  |
| `vibelabsmc.com`, `www.vibelabsmc.com` | 301 redirect to `https://vibelabsmc.org`, keeping the path and query |

The Content Security Policy is written into every page by SvelteKit (see `csp` in
`vite.config.ts`), with hashes for the inline scripts it generates. Do not add a second CSP header
in Cloudflare: browsers enforce both, and the header cannot know the per-build script hashes.
