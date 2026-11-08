# Writing for the vibeLABS docs

Every page on [vibelabsmc.org](https://vibelabsmc.org) is a Markdown file in `src/content/docs/`.
Fix a mistake, add a trick, or write a new page, then open a pull request. The build checks your
page for you: a broken link, a missing heading anchor or a bad frontmatter field fails it with a
message that names the file.

## A page

The file name is the page address: `src/content/docs/shader-stages.md` becomes
`/docs/shader-stages`. Use lowercase words joined by hyphens.

```markdown
---
title: Shader stages
description: What the vertex, geometry, fragment and compute stages do inside one program.
section: developing
order: 4
updated: 2026-11-08
loaders: [iris, optifine]
---

Opening paragraph that says who the page is for and what they will be able to do afterwards.

## First topic
```

| Field         | Required | Meaning                                                                              |
| ------------- | -------- | ------------------------------------------------------------------------------------ |
| `title`       | yes      | Page title, sentence case, no full stop.                                             |
| `description` | yes      | One sentence, at most 200 characters. Shown under the title and in search.           |
| `section`     | yes      | `using`, `developing`, `reference` or `standards`.                                   |
| `order`       | yes      | Position in the section's sidebar, a whole number starting at 1. Unique per section. |
| `updated`     | yes      | Date of the last meaningful edit, `YYYY-MM-DD`.                                      |
| `tag`         | no       | Short code label for reference cards, such as `gbuffers_*`.                          |
| `loaders`     | no       | Which loaders the page applies to: any of `iris`, `optifine`.                        |

## Writing style

- Plain English, short sentences, active voice. Explain a term the first time you use it, or link
  to the [glossary](src/content/docs/glossary.md).
- Sentence case for headings. Start sections at `##`; the page title is the only `#`.
- Only write what you know is true for current Iris and OptiFine. If something differs between
  them, say which loader does what. Link to the official documentation for details you do not
  repeat.
- Write in your own words. Do not paste text from other wikis or documentation.

## Building blocks

**Links to other pages** use the page address, with an optional heading anchor:
`[shader stages](/docs/shader-stages)` or `[programs](/docs/programs#composite)`. A heading's anchor
is its text in lowercase with spaces turned into hyphens: `## Writing to render targets` becomes
`#writing-to-render-targets`.

**Callouts** start a quote with a type and an optional title:

```markdown
> [!NOTE] Iris and OptiFine share this order
> Iris also supports compute shaders.
```

Types: `NOTE` for context, `TIP` for a shortcut, `WARNING` for something that breaks or misleads.

**Code** uses fenced blocks with a language. Add a file name with `title="..."` and highlight lines
with `{...}`:

````markdown
```glsl title="shaders/composite.fsh" {6-7}
#version 330 compatibility
```
````

Languages: `glsl`, `properties`, `ini`, `json`, `bash`, `text`.

**The pipeline diagram** lists passes in order, one per line, using these names: `shadow`,
`shadowcomp`, `prepare`, `gbuffers-opaque`, `deferred`, `gbuffers-translucent`, `composite`,
`final`.

````markdown
```pipeline
shadow
gbuffers-opaque
deferred
composite
final
```
````

**Tables** use standard Markdown pipes. Keep them narrow enough to read on a phone.

## Running the site

```bash
npm install
npm run dev
```

Before you open a pull request, run `npm test`, `npm run check` and `npm run build`. The build
renders every page and fails on broken links.
