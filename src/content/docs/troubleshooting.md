---
title: Fixing common problems
description: Answers for packs that do not appear, crashes, black or white screens, odd visuals, mod conflicts and light in caves, plus how to report a bug.
section: using
order: 4
updated: 2026-11-08
loaders: [iris, optifine]
---

This page is for players whose shaders will not load, crash the game or look wrong. Each section
starts from a symptom and lists likely causes. The last section shows how to send a pack author a
bug report they can act on.

## First, narrow it down

A problem can come from the pack, another mod, a resource pack or the graphics driver. Two tests
help you tell which.

- **Try a second pack.** If every pack fails the same way, the cause is your setup, not the pack.
- **Remove everything else.** Keep only the loader, Iris and Sodium (or only OptiFine) and the
  default resource pack. If the problem goes away, add things back one at a time.

## The pack does not appear in the list

- **It is in the wrong folder.** Packs go in `shaderpacks`, not `resourcepacks` or `mods`. Use
  **Open Shader Pack Folder...** in Iris or **Shaders Folder** in OptiFine to open the folder the
  game reads. Launchers with instances give each instance its own folder.
- **It was unzipped one level too deep.** A pack folder must contain its `shaders` folder directly,
  so `my-pack/my-pack/shaders` does not work. Use the original `.zip` instead.
- **It is not a shaderpack.** A shaderpack always contains a `shaders` folder.
- **The list is out of date.** In Iris, click **Refresh**. In OptiFine, reopen the Shaders menu.

## The game crashes on load

- **Both loaders are installed.** Iris and OptiFine cannot run together. Remove one.
- **Sodium is missing or the wrong version.** Iris shows a screen that says so. Get the Sodium build
  that matches your Minecraft version and loader.
- **A mod conflicts.** Canvas and mods that move the game to Vulkan crash with Iris.
- **The pack does not support your version.** Check its page for supported versions and loaders.

The crash report often names the mod involved, so read it first.
[Reporting a bug](#reporting-a-bug-to-a-pack-author) shows where to find it.

## The screen is black or white

- **A resource pack uses core shaders.** These replace vanilla Minecraft's own shader files, and Iris
  cannot use them while a shaderpack is on. Disable resource packs and test again.
- **Your GPU or driver lacks a feature the pack needs.** Iris warns when a pack asks for something
  your GPU does not support. Update your graphics driver. On macOS, packs that need compute shaders
  or other features beyond OpenGL 4.1 cannot run.
- **The laptop is using its integrated GPU.** See
  [laptops with two GPUs](/docs/performance#laptops-with-two-gpus).
- **Part of the pack failed to load.** Search `latest.log` for errors that mention the pack.

## Things look wrong

- **Water and glass misbehave.** Many packs light translucent surfaces in a separate pass, so odd
  overlaps with beacon beams and similar effects are often pack limitations, not loader bugs.
- **Surfaces look shiny, bumpy or patchy.** Your resource pack's material textures may use a format
  the pack does not expect. Look for a PBR format option in the pack, and see [PBR materials](/docs/labpbr).
- **Colours look off in Iris.** Check **Color Space** in Sodium's video settings. Iris suggests sRGB
  if you are unsure.
- **OptiFine will not enable shaders.** Turn off Antialiasing, Anisotropic Filtering, Fast Render and
  Improved Transparency.

## A mod stops working with shaders

Most mods work with Iris. Known exceptions include:

- Nvidium turns itself off while shaders are on. You can leave it installed.
- Distant Horizons and Voxy need a pack that explicitly supports them.
- Mods that draw with their own custom shaders can clash with a shaderpack.

## Light leaks into caves

Most packs draw sun shadows with a **shadow map**: a depth image of the world rendered from the sun's
point of view. Each pixel checks the map to see whether something sits between it and the sun.

That map has limits, and caves expose all of them:

- **It covers a limited distance.** Terrain beyond the shadow distance casts no shadow at all.
- **It has limited resolution.** Each texel stands for a patch of the world, so thin walls and
  ceilings can slip through, especially at low shadow quality.
- **It needs a small offset.** Packs nudge depths slightly so surfaces do not shadow themselves. That
  offset can let light through at block edges.

To cover these gaps, many packs also darken places with low sky light, using Minecraft's own light
values.

To reduce leaks, raise the shadow distance or shadow quality. If the pack has a light-leak or cave
option, try that too.

## Reporting a bug to a pack author

If the problem only happens with one pack, report it to that pack's author. If every pack shows it,
the cause may be the loader or your driver instead.

Use the issue tracker or support link on the pack's official download page, and include:

- What you did, what you expected and what happened, with screenshots.
- Your Minecraft version, loader, and the exact file names of the pack, Iris and Sodium (or
  OptiFine).
- Your operating system, GPU model and driver version.
- The log file `.minecraft/logs/latest.log`, attached as a file.
- For crashes, the newest file in `.minecraft/crash-reports` too.

A launcher message such as "Exit code 0" is not a crash report.

> [!TIP] Get more detail from Iris
> On the Shader Packs screen, press `Ctrl` + `D` (`Cmd` + `D` on macOS) to turn on debug mode, then
> restart the game. Iris then shows shader compile errors on screen and logs more detail.

## Next steps

If everything runs but runs slowly, read [performance tips](/docs/performance).
