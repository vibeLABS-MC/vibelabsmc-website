# vibelabsmc.org

The vibeLABS website: the landing page, accounts, and the **marketplace** for Minecraft shader
packs, texture packs, mods and data packs, with its moderation area. The documentation lives in
[vibelabsmc-docs](https://github.com/vibeLABS-MC/vibelabsmc-docs) at docs.vibelabsmc.org.

- **Sign in** with GitHub, Discord, or email and password. Sessions are hashed server-side,
  passwords use Argon2id and are checked against known breaches, two-factor (authenticator app +
  recovery codes) is available to everyone and required for staff.
- **Publish** projects with versions, files, screenshots, a Markdown description, tags, licence
  and links. Every upload is streamed to disk, hashed, checked for its type and virus-scanned;
  every new project is approved by a moderator.
- **Find** projects with typo-tolerant search, filters with live counts, six sort orders, a
  compatibility matrix and a "my setup" picker that marks what works with your game.
- **Follow** projects (update feed + notifications), write **reviews**, save **collections**,
  **report** problems.
- **Moderate**: review queue, flagged files, reports, users (roles, suspensions), tags, Minecraft
  versions, and an append-only audit log.

## Run it

You need [Bun](https://bun.sh) 1.4+ and Node 22.12+. No database to install: development uses
PGlite (Postgres in WASM) inside the dev server.

```sh
cp .env.example .env     # set APP_SECRET as the file explains
bun install
bun run seed:demo        # optional sample projects
bun run dev              # http://localhost:5173
```

Sign-in with GitHub or Discord needs your own OAuth apps in `.env`; email sign-up works
locally (emails land in `.data/outbox`).

## Check it

```sh
bun run lint && bun run check && bun run test && bun run build && bun run test:site
```

`test` runs the unit tests (each file against a fresh database); `test:site` runs the built server
end to end with fake GitHub, Discord, breach-check, Mojang and ClamAV services.

Read [CLAUDE.md](./CLAUDE.md) for the layout, the security rules and how changes are made.
