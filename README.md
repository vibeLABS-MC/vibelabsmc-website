# vibelabsmc-website

Source for **[vibelabsmc.org](https://vibelabsmc.org)**, the website of vibeLABS: a home for shader
developers, graphics programmers, modders, artists and curious learners.

Right now this is a coming-soon page with a live WebGL shader background in the same style as the
vibeLABS Discord welcome cards.

## How it is hosted

Plain static files: no server, no build step.

- **GitHub Pages** serves the `public/` folder. Every push to `main` deploys automatically through
  `.github/workflows/pages.yml`.
- **Cloudflare** sits in front for DNS, CDN caching, HTTPS and security headers.

| Domain | Behaviour |
|---|---|
| `vibelabsmc.org` | Serves this site |
| `www.vibelabsmc.org` | 301 redirect to `https://vibelabsmc.org` (Cloudflare Redirect Rule) |
| `vibelabsmc.com`, `www.vibelabsmc.com` | 301 redirect to `https://vibelabsmc.org`, keeping the path and query (Cloudflare Redirect Rule) |

Security headers (Content-Security-Policy, HSTS, `nosniff`, referrer and permissions policies,
frame blocking) are added by a Cloudflare response-header Transform Rule on `vibelabsmc.org`,
because GitHub Pages cannot set custom headers. Keep scripts and styles in their own files (no
inline `<script>` or `style=""`) so the strict CSP keeps working.

## Layout

```
public/
  index.html    landing page
  404.html      not-found page (GitHub Pages serves it for unknown paths)
  styles.css    styles
  shader.js     WebGL background; falls back to a CSS gradient, honours reduced motion
  favicon.svg
  robots.txt
.github/workflows/pages.yml   deploys public/ to GitHub Pages on every push to main
```

## Local preview

```bash
python -m http.server 8080 --directory public
```

Then open http://localhost:8080.
