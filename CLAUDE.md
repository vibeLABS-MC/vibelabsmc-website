# CLAUDE.md

Guidance for Claude Code (and humans) working on **vibelabsmc.org**: the vibeLABS landing page,
accounts (GitHub, Discord, email), the **marketplace** (shader packs, texture packs, mods, data
packs) and its moderation area. The documentation is a separate project: repo
`vibeLABS-MC/vibelabsmc-docs`, served at **docs.vibelabsmc.org**; its header shows who is signed in
here through `/api/session`.

## Branches and deployment

| Branch    | What it holds                                  | What happens on push                      |
| --------- | ---------------------------------------------- | ----------------------------------------- |
| `develop` | The whole app. **Work here.**                  | CI runs every check. Nothing is deployed. |
| `main`    | Only the under-construction page in `public/`. | Deploys to the live domain immediately.   |

- Branch from `develop` and open pull requests **into `develop`**.
- **Never push to `main`** unless the team has explicitly decided to launch.
- `develop.vibelabsmc.org` runs `develop` for real on the team's server (`deploy/preview.sh`). It
  is the live preview: real accounts, real uploads, real moderation, `noindex`.
- Launching = moving vibelabsmc.org from GitHub Pages to the server (DNS + nginx + `ORIGIN`) and
  merging `develop` into `main`. `.github/workflows/pages.yml` still deploys `main` to Pages: it
  must change at launch, because the app needs a server.

## Commands

Bun is the package manager (`bun install`, `bun add`, `bun run`; commit `bun.lock`). Vite,
SvelteKit and the tests run on Node 22.12+; production runs the built server under Bun.

```bash
cp .env.example .env   # then set APP_SECRET (the file explains how)
bun install
bun run dev            # http://localhost:5173, database in .data/pglite (no install needed)
bun run seed:demo      # optional: sample projects in the local database
bun run test           # unit tests (Vitest, project "unit"), each file gets a fresh database
bun run check          # svelte-check: Svelte + TypeScript types
bun run lint           # Prettier check (bun run format to fix)
bun run build          # the Node server in build/
bun run test:site      # end-to-end over HTTP against build/ (run after build)
bun run db:generate    # after changing src/lib/server/db/schema.ts: writes a migration
bun run coverage       # unit tests + coverage/lcov.info
```

Use `bun run test`, not `bun test` (that starts Bun's own runner). Before you push:
`bun run lint && bun run check && bun run test && bun run build && bun run test:site`. CI
(`.github/workflows/pages.yml`) runs exactly that.

## Stack

- **SvelteKit 3** (Svelte 5 runes) with `@sveltejs/adapter-node`. Kit config lives in
  `vite.config.ts` inside `sveltekit({ ... })`. SvelteKit 3 notes: hook types come from
  `@sveltejs/kit/hooks`, param matchers live in `src/params.ts` (`defineParams`, browser-safe),
  `redirect()` to another origin needs `{ external: [...] }`, `goto` keeps scroll by default.
- **Postgres** through **Drizzle ORM** (`casing: 'snake_case'`). Production: Postgres 16 over the
  Unix socket with peer authentication (no password). Development and site tests:
  `DATABASE_URL=pglite:...` runs PGlite (Postgres in WASM) inside the server process and migrates
  it on start. PGlite only loads `pg_trgm` under Node, and only with options as the first argument.
- **bits-ui** 2 for interactive parts (Dialog, Popover, DropdownMenu, Tabs, Tooltip, Toggle,
  RatingGroup). Untitled UI tokens in `src/app.css`; shared building blocks in
  `src/lib/styles/ui.css`. Icons: `@lucide/svelte` (no brand icons: use `BrandIcon`).
- Images: `sharp` re-encodes every upload to WebP. Files: streamed to disk, hashed, checked and
  virus-scanned (`src/lib/server/uploads/`). Mail: `nodemailer` over SMTP, or JSON files in
  `.data/outbox` in development.

## Code layout

```
src/hooks.server.ts            runtime start-up, sessions, access rules, security headers
src/lib/server/config.ts       every environment variable, validated in one place
src/lib/server/auth/           sessions, OAuth (PKCE), passwords (Argon2id + breach check),
                               TOTP + recovery codes, email tokens, users, access rules, guards
src/lib/server/marketplace/    projects, versions + files, search, gallery, markdown, catalog
src/lib/server/uploads/        streaming receive, zip inspection, ClamAV client, scan strategy
src/lib/server/community/      follows, reviews, collections, reports, notifications
src/lib/server/admin/          moderation decisions, file verdicts, users, audit reading
src/lib/marketplace/           browser-safe: taxonomy, search URLs, versions, setup, matrix
src/routes/(site)/             pages with the site header: landing, marketplace, dashboard,
                               settings, admin, profiles, collections, legal
src/routes/(auth)/             sign-in pages: login, signup, 2FA, confirm, onboarding, resets
src/routes/auth/[provider]/    OAuth start and callback
src/routes/api/                uploads, session (for the docs), markdown preview, v1 search
tests/site/                    end-to-end tests with fake GitHub, Discord, HIBP, Mojang, ClamAV
deploy/                        server set-up, deploy and secret scripts
```

## Security rules (read before changing anything in auth, uploads or headers)

- **CSP** is set per response by SvelteKit (`mode: 'auto'`, nonces). No `style="..."`
  attributes and no inline scripts: `tests/site/csp.test.ts` fails if one appears. Svelte
  transitions and `style:` directives emit inline styles; don't use them. bits-ui runtime styles
  are fine; server-rendered ones are not (see `Faq.svelte`).
- **Sessions**: only the SHA-256 of the cookie token is stored; cookie `__Host-vl_session`.
  Sensitive actions need `sudoFailure()` (re-confirmed in the last 10 minutes).
- **Access** to every area is decided in `src/lib/server/auth/access.ts` and enforced in the
  hook; route code calls `requireUser` / `requireStaff` / `requireAdmin` / `editableProject` too.
  Admin pages need staff role + two-factor passed in that session.
- **Never trust user Markdown**: render with `renderMarkdown()` (server-side, allowlist, gallery
  images only). Links in forms go through `linkProblem()`.
- **Uploads** go through `/api/projects/[id]/uploads` only: streamed, size-capped, layout-checked,
  ClamAV-scanned. Downloads go through `/download/...` (access check, counting, `sandbox` CSP,
  attachment). Images are always re-encoded.
- **Messages from query strings** are picked by code (`?error=cancelled`), never echoed.
- Rate limits are listed in `src/lib/server/security/rate-limit.ts`. Every staff action and
  security event goes to the append-only audit log (`audit()`).

## Design rules

- Use the CSS variables (`--fg`, `--fg-3`, `--bg-subtle`, `--line`, `--accent`, ...); don't
  hard-code colours in components. Each colour is declared once with `light-dark()`.
- bits-ui renders tooltips, menus, popovers and dialogs at the end of `<body>`: their styles live
  in `src/lib/styles/ui.css`.
- Check layouts at 375px and 1440px, in light and dark mode.

## Engineering practice (ub-mode)

Write the failing test first. Logic lives in `.ts` modules (the quality tools don't read
`.svelte`): keep every function under CRAP 10, remove duplication scoring 0.8 or more, kill
surviving mutants. Database code is tested against a real (PGlite) database in each test file
(`tests/helpers/db.ts`). Small commits whose messages say why, what and how it was proved.

```bash
bun run coverage
python -m crapper --use-existing-coverage --threshold 10 <src/lib .ts files>
python -m dryer --threshold 0.8 src/lib src/routes tests
```

## Gotchas

- `bun run test:site` needs a fresh `bun run build` first.
- The route announcer's inline style hash is allowed in `style-src`; update it if a SvelteKit
  upgrade changes it (the CSP test tells you).
- `adapter-node` reads `BODY_SIZE_LIMIT`: production sets 110M (uploads are 100 MB); the hook
  refuses bodies over 10 MB anywhere except the upload endpoint.
- Changing `schema.ts`: run `bun run db:generate` and commit the new file in `drizzle/`. Never edit
  an applied migration.

## Open items

- `SITE.discord` in `src/lib/site.ts` is `null`; set the public invite to show Discord links.
- The legal pages under `src/routes/(site)/legal/` are plain-English starting points; have them
  reviewed before launch.
