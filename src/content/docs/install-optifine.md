---
title: Installing OptiFine
description: Install OptiFine on its own or as a Forge mod, load a shaderpack from the Shaders menu, and decide when Iris is the better fit.
section: using
order: 2
updated: 2026-11-08
loaders: [optifine]
---

This page is for players who want to run shaderpacks with OptiFine, either on its own or inside a
Forge setup. By the end you will have OptiFine installed and a pack loaded, and you will know when
[Iris](/docs/install-iris) is the better choice.

## Before you start

- **Download only from [optifine.net](https://optifine.net/downloads).** Builds are grouped by
  Minecraft version, newest first. Preview builds sit behind a separate toggle. The **Mirror** link
  stays on optifine.net, while the main **Download** link passes through a third-party advertising
  page first.
- **Pick the build for your exact Minecraft version.** Each build also lists the Forge version it
  supports, if any, which matters if you plan to use Forge.
- **Do not mix it with Iris or Sodium.** OptiFine is incompatible with both, and the game crashes
  if Iris and OptiFine are installed together.

## Install OptiFine on its own

Use this when you want OptiFine and no other mods.

1. In the Minecraft Launcher, install and play the matching vanilla version at least once. The
   OptiFine installer fails if that version has never been launched.
2. Open the OptiFine `.jar` you downloaded. You need Java to run it.
3. Click **Install** in the window that appears.
4. Open the launcher, choose the new OptiFine profile and click **Play**.

## Install OptiFine with Forge

Use this when you play a Forge modpack and want shaders as well.

1. Install Forge for your Minecraft version with Forge's own installer.
2. On the OptiFine downloads page, choose a build whose listed Forge version matches your Forge
   install.
3. Skip the OptiFine installer for this route. Move the `.jar` into the `mods` folder of your game
   folder instead. Create the folder if it is missing, and name it in lowercase.
4. Start the game with the Forge profile.

OptiFine's downloads only list Forge compatibility. If you play on Fabric or NeoForge, use
[Iris](/docs/install-iris) instead.

## Load a shaderpack

1. Open **Options > Video Settings > Shaders...**.
2. Click **Shaders Folder**. This opens the `shaderpacks` folder in your game folder.
3. Copy the pack's `.zip` into that folder. Keep it zipped as you downloaded it.
4. Go back to the Shaders menu. The pack now appears in the list. Click it to load it.
5. Click **Shader Options...** to change the pack's own settings.

Choose **OFF** in the list to turn shaders off again.

```text
.minecraft/
├── mods/
│   └── OptiFine_<version>.jar
└── shaderpacks/
    └── my-pack.zip
```

The `mods` folder only matters for the Forge route. A standalone install adds OptiFine as its
own launcher profile instead.

The Shaders menu also holds **Render Quality** and **Shadow Quality**. These scale the size of the
image the pack renders and the size of its shadow map. Lower values are faster. See
[performance tips](/docs/performance) before you change them.

> [!WARNING] Some video settings block shaders
> Shaders do not work while **Antialiasing**, **Anisotropic Filtering**, **Fast Render** or
> **Improved Transparency** is on. OptiFine shows a message that names the setting to turn off.
> After you turn off Antialiasing, restart the game.

## OptiFine or Iris?

Most shaderpacks are written for OptiFine's shader format, and Iris is built to load that format
too, with a few gaps. For many players either loader works. The table covers the cases where one is
clearly better.

| Your situation                                   | Better choice |
| ------------------------------------------------ | ------------- |
| You play on Fabric or NeoForge                   | Iris          |
| You play a Forge modpack                         | OptiFine      |
| You want Sodium's performance alongside shaders  | Iris          |
| A resource pack relies on OptiFine-only features | OptiFine      |
| The pack's page lists only one loader            | That loader   |

Iris handles shaders only. Separate mods recreate many of OptiFine's other features, such as
connected textures and zoom, so moving from OptiFine to Iris usually means adding a few of those.

> [!NOTE] Packs can use loader-only features
> Some packs rely on features that only Iris provides, such as extra passes. Check the pack's
> download page for the loaders it supports before you choose.

## Next steps

Find a pack with [choosing a shaderpack](/docs/choosing-a-shaderpack). If a pack will not load, see
[fixing common problems](/docs/troubleshooting).
