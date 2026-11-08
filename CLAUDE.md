# CLAUDE.md

This `main` branch is deliberately tiny: it serves the vibelabsmc.org under-construction page from
`public/` (static HTML + CSS, no build) and deploys it with `.github/workflows/pages.yml`.

- Do not build site features here. All development happens on the `develop` branch, which has the
  full SvelteKit docs site and a detailed `CLAUDE.md`. Run `git switch develop`.
- Pushing to `main` deploys to the live domain immediately. Only push here when the team has
  agreed to change what the public sees.
- Launch = merge `develop` into `main` (a pull request from `develop`). It merges cleanly.
