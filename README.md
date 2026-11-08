# vibelabsmc-website

Source for **[vibelabsmc.org](https://vibelabsmc.org)**, the website of vibeLABS: a home for shader
developers, graphics programmers, modders, artists and curious learners.

Right now this is a coming-soon page with a live WebGL shader background in the same style as the
vibeLABS Discord welcome cards.

## How it is hosted

The site is plain static files served by **Cloudflare Workers static assets**: no server, no build
step, no server memory, served from Cloudflare's edge.

| Domain | Behaviour |
|---|---|
| `vibelabsmc.org` | Serves this site |
| `www.vibelabsmc.org` | 301 redirect to `https://vibelabsmc.org` (Cloudflare Redirect Rule) |
| `vibelabsmc.com`, `www.vibelabsmc.com` | 301 redirect to `https://vibelabsmc.org` with the same path and query (Cloudflare Redirect Rule) |

Deploys run automatically from the `main` branch through Cloudflare's Git integration
(Workers Builds), using `wrangler.jsonc`.

## Layout

```
public/
  index.html    landing page
  404.html      not-found page (served for unknown paths)
  styles.css    styles (no inline styles, so the strict CSP stays intact)
  shader.js     WebGL background; falls back to a CSS gradient, honours reduced motion
  _headers      security headers (CSP, HSTS, nosniff, referrer and permissions policies)
  favicon.svg
  robots.txt
wrangler.jsonc  Cloudflare Worker config (assets directory and custom domains)
```

## Local preview

```bash
npx wrangler dev
```

Then open http://localhost:8787. Opening `public/index.html` directly in a browser also works.

## Deploy manually (optional)

```bash
npx wrangler deploy
```
