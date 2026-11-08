---
title: Choosing a shaderpack
description: How to judge a shaderpack by its style, performance cost, loader and version support and GPU notes, and where to download it safely.
section: using
order: 3
updated: 2026-11-08
loaders: [iris, optifine]
---

This page is for players who have [Iris](/docs/install-iris) or [OptiFine](/docs/install-optifine)
installed and want to pick a pack. It does not recommend particular packs. Instead it shows you what
to check on a pack's page, so you can choose one that looks the way you want, runs on your machine
and comes from a trustworthy source.

## Decide on a style

Most packs fall into one of three broad groups. Some mix them.

| Style        | What it aims for                                                                     |
| ------------ | ------------------------------------------------------------------------------------ |
| Realistic    | Physically based light, sharp shadows, reflections, fog with depth.                  |
| Stylised     | A deliberate artistic look: painterly colour, cartoon shading, fantasy moods.        |
| Vanilla-plus | Minecraft's own look with additions such as shadows, moving leaves and better water. |

[Modrinth](https://modrinth.com/shaders) lets you filter packs by category, including realistic,
semi-realistic, vanilla-like, cartoon and fantasy. [CurseForge](https://www.curseforge.com/minecraft/shaders)
has a smaller set of categories.

Judge a pack by screenshots of the places you spend time in: caves, night, rain, the Nether, under
water. A sunny landscape shot shows little about how a pack handles your base at midnight.

## Check the performance cost

A pack that looks great in a trailer may run poorly on your computer. Look for these signs before
you download.

- **The author's own rating.** Modrinth packs carry a performance impact tag: potato, low, medium,
  high or screenshot. The author sets it, so treat it as a rough guide. The screenshot tag points to a
  pack built for still images rather than everyday play.
- **Profiles.** Some packs include presets such as low, medium and high in their settings. A pack
  with good low profiles can suit a weaker machine.
- **Expensive features.** Shadows draw the world a second time from the sun's point of view.
  Reflections, volumetric fog and path tracing add more work on top.

Integrated graphics struggle with most packs. Start with a light, vanilla-plus pack and its lowest
profile, then work up. [Performance tips](/docs/performance) explains which settings to lower first.

## Check loader and version support

- **Loader.** Packs written for OptiFine's format mostly run on Iris too, but some use features only
  one loader has. Modrinth lets you filter by loader. On any site, read the supported loaders on the
  pack's page.
- **Minecraft version.** A pack's page lists the game versions it supports. An old pack may not
  know about blocks added in later versions, so those blocks can get the wrong material or effects.
- **Other mods.** Distant Horizons and Voxy only work with packs that explicitly support them. If
  you use one, check the pack's page first.
- **Resource packs.** Some packs read extra material textures from a PBR resource pack. If you want
  that, look for support for [LabPBR](/docs/labpbr) on the pack's page.

## Check GPU and platform notes

Pack authors test on the hardware they own. A pack built mainly on one GPU vendor can show bugs or
fail to load on another, because drivers from NVIDIA, AMD and Intel accept slightly different code.
Read the pack's known issues and recent comments for your GPU before you settle on it.

macOS caps OpenGL at version 4.1. Packs that need compute shaders or other newer features cannot run
there, and Iris warns that many packs have problems on macOS.

> [!WARNING] Bedrock Edition is different
> Iris and OptiFine are Java Edition mods, and Bedrock Edition cannot load them. The Iris team warns
> that phone apps claiming to add shaders to Bedrock, without using the game's built-in graphics
> features, are scams.

## Download from the source

Get packs from the author's official page. That means the project page on
[Modrinth](https://modrinth.com/shaders) or [CurseForge](https://www.curseforge.com/minecraft/shaders),
or the author's own site or repository when those pages link to it.

Avoid sites that reupload other people's packs. Their files are often out of date or modified, you
cannot tell what was changed, and the author loses the downloads and feedback that support the
project. Some of those sites also wrap downloads in adverts or installers.

A shaderpack is a `.zip` file with a `shaders` folder of text files inside. It never needs an
installer. If a download is an `.exe`, or asks you to run something to "install" a pack, delete it.

> [!TIP] Note the version you downloaded
> Keep the file name as the author published it. It often contains the pack's version, which you
> will need if you ever [report a bug](/docs/troubleshooting#reporting-a-bug-to-a-pack-author).

## Next steps

Load your pack with the steps for [Iris](/docs/install-iris) or [OptiFine](/docs/install-optifine),
then tune it with [performance tips](/docs/performance).
